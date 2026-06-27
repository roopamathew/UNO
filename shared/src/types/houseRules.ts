export interface HouseRulesConfig {
  stackDrawTwo: boolean;
  stackWildDrawFour: boolean;
  jumpIn: boolean;
  sevenO: boolean;
  forcePlay: boolean;
  drawUntilPlayable: boolean;
  customScoreLimit: number;
  winningScore: number;
  numberOfDecks: number;
  turnTimerSeconds: number;
  customRules: CustomRule[];
}

export interface CustomRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

export const DEFAULT_HOUSE_RULES: HouseRulesConfig = {
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
