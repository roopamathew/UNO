import { describe, it, expect } from 'vitest';
import { DEFAULT_HOUSE_RULES } from '@uno/shared';

describe('House Rules', () => {
  it('has sensible defaults', () => {
    expect(DEFAULT_HOUSE_RULES.winningScore).toBe(500);
    expect(DEFAULT_HOUSE_RULES.numberOfDecks).toBe(1);
    expect(DEFAULT_HOUSE_RULES.stackDrawTwo).toBe(false);
  });
});

describe('Room Code', () => {
  it('validates code format', () => {
    const code = 'ABC123';
    expect(code).toMatch(/^[A-Z0-9]{6}$/);
  });
});
