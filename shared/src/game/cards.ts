import type { HouseRulesConfig } from '../types/houseRules';

export type CardColor = 'red' | 'blue' | 'green' | 'yellow' | 'wild';
export type CardValue =
  | '0'
  | '1'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | 'skip'
  | 'reverse'
  | 'draw2'
  | 'wild'
  | 'wild4';

export interface Card {
  id: string;
  color: CardColor;
  value: CardValue;
}

const NUMBER_VALUES: CardValue[] = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
const ACTION_VALUES: CardValue[] = ['skip', 'reverse', 'draw2'];
const COLORS: Exclude<CardColor, 'wild'>[] = ['red', 'blue', 'green', 'yellow'];

let cardIdCounter = 0;

function createCard(color: CardColor, value: CardValue): Card {
  cardIdCounter += 1;
  return { id: `c-${cardIdCounter}`, color, value };
}

export function resetCardIdCounter(): void {
  cardIdCounter = 0;
}

export function createDeck(numberOfDecks: number): Card[] {
  const deck: Card[] = [];

  for (let d = 0; d < numberOfDecks; d++) {
    for (const color of COLORS) {
      deck.push(createCard(color, '0'));
      for (const value of NUMBER_VALUES.slice(1)) {
        deck.push(createCard(color, value), createCard(color, value));
      }
      for (const value of ACTION_VALUES) {
        deck.push(createCard(color, value), createCard(color, value));
      }
    }
    for (let i = 0; i < 4; i++) {
      deck.push(createCard('wild', 'wild'), createCard('wild', 'wild4'));
    }
  }

  return deck;
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function getEffectiveColor(card: Card, wildColor: CardColor | null): CardColor | null {
  if (card.color === 'wild') return wildColor;
  return card.color;
}

export function isActionCard(value: CardValue): boolean {
  return value === 'skip' || value === 'reverse' || value === 'draw2' || value === 'wild' || value === 'wild4';
}

export function getCardPoints(card: Card): number {
  if (card.value === 'wild' || card.value === 'wild4') return 50;
  if (card.value === 'skip' || card.value === 'reverse' || card.value === 'draw2') return 20;
  return parseInt(card.value, 10);
}

export function cardMatches(
  card: Card,
  top: Card,
  wildColor: CardColor | null,
  pendingDraw: number,
  rules: HouseRulesConfig,
): boolean {
  if (pendingDraw > 0) {
    if (rules.stackDrawTwo && top.value === 'draw2' && card.value === 'draw2') return true;
    if (rules.stackWildDrawFour && top.value === 'wild4' && card.value === 'wild4') return true;
    return false;
  }

  if (card.color === 'wild') return true;

  const topColor = getEffectiveColor(top, wildColor);
  if (!topColor) return false;

  return card.color === topColor || card.value === top.value;
}

export function getPlayableCards(
  hand: Card[],
  top: Card,
  wildColor: CardColor | null,
  pendingDraw: number,
  rules: HouseRulesConfig,
): Card[] {
  return hand.filter((card) => cardMatches(card, top, wildColor, pendingDraw, rules));
}
