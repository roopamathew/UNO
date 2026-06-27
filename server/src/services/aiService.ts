import OpenAI from 'openai';
import { env } from '../config/env';
import type { GameState, HouseRulesConfig } from '@uno/shared';
import { cardMatches } from '@uno/shared';

let openaiClient: OpenAI | null = null;

function getClient(): OpenAI | null {
  if (!env.OPENAI_API_KEY) return null;
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  }
  return openaiClient;
}

export interface AIMoveDecision {
  action: 'play' | 'draw' | 'call_uno' | 'choose_color';
  cardId?: string;
  chosenColor?: string;
  message?: string;
}

function buildFallbackMove(state: GameState, aiPlayerId: string): AIMoveDecision {
  const ai = state.players.find((p) => p.playerId === aiPlayerId);
  if (!ai?.hand) return { action: 'draw' };

  if (ai.hand.length === 1) {
    return { action: 'call_uno' };
  }

  if (state.phase === 'choosing_color') {
    const colors = ['red', 'blue', 'green', 'yellow'] as const;
    const hand = ai.hand ?? [];
    const counts = colors.map((c) => ({
      c,
      n: hand.filter((card) => card.color === c).length,
    }));
    counts.sort((a, b) => b.n - a.n);
    return { action: 'choose_color', chosenColor: counts[0]?.c ?? 'red' };
  }

  const defaultRules: HouseRulesConfig = {
    stackDrawTwo: false,
    stackWildDrawFour: false,
    jumpIn: false,
    sevenO: false,
    forcePlay: false,
    drawUntilPlayable: false,
    customScoreLimit: 0,
    winningScore: 500,
    numberOfDecks: 1,
    turnTimerSeconds: 30,
    customRules: [],
  };

  const playable = ai.hand.filter((c) =>
    cardMatches(c, state.discardTop, state.wildColor, state.pendingDraw, defaultRules),
  );

  if (playable.length === 0) return { action: 'draw' };

  const nonWild = playable.filter((c) => c.color !== 'wild');
  const card = nonWild[0] ?? playable[0];

  if (card.color === 'wild') {
    const colors = ['red', 'blue', 'green', 'yellow'] as const;
    const hand = ai.hand ?? [];
    const best = colors.reduce((a, b) =>
      hand.filter((c) => c.color === a).length >= hand.filter((c) => c.color === b).length ? a : b,
    );
    return { action: 'play', cardId: card.id, chosenColor: best };
  }

  return { action: 'play', cardId: card.id };
}

export async function getAIMove(
  state: GameState,
  aiPlayerId: string,
  rules: HouseRulesConfig,
  personality = 'strategic',
): Promise<AIMoveDecision> {
  const client = getClient();
  const ai = state.players.find((p) => p.playerId === aiPlayerId);

  if (!client || !ai?.hand) {
    return buildFallbackMove(state, aiPlayerId);
  }

  const sanitizedHand = ai.hand.map((c) => ({ id: c.id, color: c.color, value: c.value }));
  const opponents = state.players
    .filter((p) => p.playerId !== aiPlayerId)
    .map((p) => ({ username: p.username, handCount: p.handCount, calledUno: p.calledUno }));

  const prompt = `You are playing UNO with personality: ${personality}.
House rules: ${JSON.stringify(rules)}
Your hand: ${JSON.stringify(sanitizedHand)}
Top discard: ${JSON.stringify(state.discardTop)}
Wild color: ${state.wildColor}
Pending draw: ${state.pendingDraw}
Opponents: ${JSON.stringify(opponents)}
Phase: ${state.phase}

Respond with JSON only: {"action":"play"|"draw"|"call_uno"|"choose_color","cardId?":"string","chosenColor?":"red|blue|green|yellow","message?":"optional chat"}`;

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are an expert UNO player. Respond with valid JSON only.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 200,
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) return buildFallbackMove(state, aiPlayerId);

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return buildFallbackMove(state, aiPlayerId);

    return JSON.parse(jsonMatch[0]) as AIMoveDecision;
  } catch {
    return buildFallbackMove(state, aiPlayerId);
  }
}

export async function getAIChatMessage(context: string): Promise<string | null> {
  const client = getClient();
  if (!client) return null;

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a friendly UNO bot. Keep messages under 80 chars.' },
        { role: 'user', content: context },
      ],
      max_tokens: 60,
    });
    return response.choices[0]?.message?.content?.trim() ?? null;
  } catch {
    return null;
  }
}
