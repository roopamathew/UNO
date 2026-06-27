import { Router } from 'express';
import { authenticate, type AuthRequest } from '../middleware/auth';
import { createGame, applyMove, toPublicState, type InternalGameState } from '@uno/shared';
import { DEFAULT_HOUSE_RULES } from '@uno/shared';
import { getAIMove } from '../services/aiService';
import type { GameMovePayload } from '@uno/shared';
import { nanoid } from 'nanoid';

const router = Router();
const aiSessions = new Map<string, InternalGameState>();

router.post('/start', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.authUser!.userId;
    const username = req.authUser!.username;
    const sessionId = nanoid();

    const humanPlayer = {
      playerId: 'human',
      userId,
      username,
      avatarColor: '#3B82F6',
      isConnected: true,
    };

    const aiPlayer = {
      playerId: 'ai',
      userId: null,
      username: 'UNO Bot',
      avatarColor: '#8B5CF6',
      isConnected: true,
    };

    const game = createGame(sessionId, 'ai-solo', [humanPlayer, aiPlayer], DEFAULT_HOUSE_RULES);
    aiSessions.set(sessionId, game);

    res.json({
      sessionId,
      state: toPublicState(game, 'human'),
    });
  } catch (err) {
    next(err);
  }
});

function paramId(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

router.post('/:sessionId/move', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const sessionId = paramId(req.params.sessionId);
    const move = req.body as GameMovePayload;
    const game = aiSessions.get(sessionId);

    if (!game) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    const result = applyMove(game, 'human', move);
    if (result.error) {
      res.status(400).json({ error: result.error });
      return;
    }

    if (game.phase === 'playing' || game.phase === 'choosing_color') {
      const current = game.players[game.currentPlayerIndex];
      if (current.playerId === 'ai') {
        await runAITurn(game);
      }
    }

    res.json({ state: toPublicState(game, 'human') });
  } catch (err) {
    next(err);
  }
});

router.get('/:sessionId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const game = aiSessions.get(paramId(req.params.sessionId));
    if (!game) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    res.json({ state: toPublicState(game, 'human') });
  } catch (err) {
    next(err);
  }
});

async function runAITurn(game: InternalGameState): Promise<void> {
  const publicState = toPublicState(game, 'ai');
  const decision = await getAIMove(publicState, 'ai', game.rules);

  if (decision.action === 'call_uno') {
    applyMove(game, 'ai', { type: 'call_uno' });
    return;
  }

  if (decision.action === 'choose_color' && decision.chosenColor) {
    applyMove(game, 'ai', {
      type: 'choose_color',
      chosenColor: decision.chosenColor as GameMovePayload['chosenColor'],
    });
    return;
  }

  if (decision.action === 'play' && decision.cardId) {
    applyMove(game, 'ai', {
      type: 'play',
      cardId: decision.cardId,
      chosenColor: decision.chosenColor as GameMovePayload['chosenColor'],
    });
    return;
  }

  applyMove(game, 'ai', { type: 'draw' });

  if (game.players[game.currentPlayerIndex].playerId === 'ai') {
    await runAITurn(game);
  }
}

export default router;
