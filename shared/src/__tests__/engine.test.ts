import { describe, it, expect } from 'vitest';
import { createDeck, cardMatches } from '../game/cards';
import { createGame, applyMove, toPublicState, isTurnExpired, applyTurnTimeout } from '../game/engine';
import { DEFAULT_HOUSE_RULES } from '../types/houseRules';

describe('UNO Deck', () => {
  it('creates 108 cards for one deck', () => {
    expect(createDeck(1)).toHaveLength(108);
  });

  it('creates multiple decks', () => {
    expect(createDeck(2)).toHaveLength(216);
  });
});

describe('UNO Engine', () => {
  const players = [
    { playerId: 'p1', userId: 'u1', username: 'Alice', avatarColor: '#EF4444', isConnected: true },
    { playerId: 'p2', userId: 'u2', username: 'Bob', avatarColor: '#3B82F6', isConnected: true },
  ];

  it('deals 7 cards to each player', () => {
    const game = createGame('g1', 'r1', players, DEFAULT_HOUSE_RULES);
    expect(game.players[0].hand).toHaveLength(7);
    expect(game.players[1].hand).toHaveLength(7);
  });

  it('rejects play when not your turn', () => {
    const game = createGame('g1', 'r1', players, DEFAULT_HOUSE_RULES);
    const notCurrent = game.players[1];
    const card = notCurrent.hand[0];
    const result = applyMove(game, notCurrent.playerId, { type: 'play', cardId: card.id });
    expect(result.error).toBe('Not your turn');
  });

  it('allows drawing on your turn', () => {
    const game = createGame('g1', 'r1', players, DEFAULT_HOUSE_RULES);
    const current = game.players[game.currentPlayerIndex];
    const handBefore = current.hand.length;
    const result = applyMove(game, current.playerId, { type: 'draw' });
    expect(result.error).toBeUndefined();
    expect(current.hand.length).toBeGreaterThanOrEqual(handBefore);
  });

  it('produces valid public state', () => {
    const game = createGame('g1', 'r1', players, DEFAULT_HOUSE_RULES);
    const view = toPublicState(game, 'p1');
    expect(view.players[0].hand).toHaveLength(7);
    expect(view.players[1].hand).toBeUndefined();
    expect(view.discardTop).toBeDefined();
  });
});

describe('Card matching', () => {
  it('matches by color', () => {
    const top = { id: '1', color: 'red' as const, value: '5' as const };
    const card = { id: '2', color: 'red' as const, value: '7' as const };
    expect(cardMatches(card, top, 'red', 0, DEFAULT_HOUSE_RULES)).toBe(true);
  });

  it('matches wild cards', () => {
    const top = { id: '1', color: 'red' as const, value: '5' as const };
    const wild = { id: '2', color: 'wild' as const, value: 'wild' as const };
    expect(cardMatches(wild, top, null, 0, DEFAULT_HOUSE_RULES)).toBe(true);
  });
});

describe('Turn timer', () => {
  const players = [
    { playerId: 'p1', userId: 'u1', username: 'Alice', avatarColor: '#EF4444', isConnected: true },
    { playerId: 'p2', userId: 'u2', username: 'Bob', avatarColor: '#3B82F6', isConnected: true },
  ];

  it('detects expired turns', () => {
    const rules = { ...DEFAULT_HOUSE_RULES, turnTimerSeconds: 1 };
    const game = createGame('g1', 'r1', players, rules);
    game.turnStartedAt = new Date(Date.now() - 5000).toISOString();
    expect(isTurnExpired(game)).toBe(true);
  });

  it('auto-draws on timeout', () => {
    const rules = { ...DEFAULT_HOUSE_RULES, turnTimerSeconds: 1 };
    const game = createGame('g1', 'r1', players, rules);
    game.turnStartedAt = new Date(Date.now() - 5000).toISOString();
    const current = game.players[game.currentPlayerIndex];
    const handBefore = current.hand.length;
    const result = applyTurnTimeout(game);
    expect(result.error).toBeUndefined();
    expect(current.hand.length).toBeGreaterThanOrEqual(handBefore);
  });

  it('includes house rules in public state', () => {
    const rules = { ...DEFAULT_HOUSE_RULES, stackDrawTwo: true };
    const game = createGame('g1', 'r1', players, rules);
    const view = toPublicState(game, 'p1');
    expect(view.houseRules.stackDrawTwo).toBe(true);
  });
});
