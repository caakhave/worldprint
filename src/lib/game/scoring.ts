import type { Tier } from "@/lib/content/schemas";

export type TierConfig = {
  id: Tier;
  label: string;
  shortLabel: string;
  description: string;
  badge?: string;
  highlights: string[];
  choiceCount: number | null;
  maxInvestigations: number;
  unitClue: boolean;
  scoring: {
    start: number;
    investigationPenalties: number[];
    unitCluePenalty: number;
    wrongAnswerPenalty: number;
  };
};

export const COUNTRY_REVEAL_COST = 100;
export const UNIT_REVEAL_COST = 100;
export const WRONG_ANSWER_COST = 300;

export const TIER_CONFIGS: Record<Tier, TierConfig> = {
  explorer: {
    id: "explorer",
    label: "Explorer",
    shortLabel: "Explorer",
    description: "Easiest tier with broad answers and generous clues.",
    highlights: ["3 broad choices", "3 country reveals", "Country names on hover", "Useful unit clues"],
    choiceCount: 3,
    maxInvestigations: 3,
    unitClue: true,
    scoring: {
      start: 1000,
      investigationPenalties: [COUNTRY_REVEAL_COST, COUNTRY_REVEAL_COST, COUNTRY_REVEAL_COST],
      unitCluePenalty: UNIT_REVEAL_COST,
      wrongAnswerPenalty: WRONG_ANSWER_COST
    }
  },
  analyst: {
    id: "analyst",
    label: "Analyst",
    shortLabel: "Analyst",
    description: "Balanced serious play with plausible choices and enough evidence to reason it out.",
    badge: "Recommended",
    highlights: ["4 plausible choices", "3 country reveals", "Useful unit clues", "Default serious play"],
    choiceCount: 4,
    maxInvestigations: 3,
    unitClue: true,
    scoring: {
      start: 1000,
      investigationPenalties: [COUNTRY_REVEAL_COST, COUNTRY_REVEAL_COST, COUNTRY_REVEAL_COST],
      unitCluePenalty: UNIT_REVEAL_COST,
      wrongAnswerPenalty: WRONG_ANSWER_COST
    }
  },
  cartographer: {
    id: "cartographer",
    label: "Cartographer",
    shortLabel: "Cartographer",
    description: "Hard tier for strong geography and data players.",
    highlights: ["6 close choices", "1 country reveal", "Useful unit clues", "Closely related distractors"],
    choiceCount: 6,
    maxInvestigations: 1,
    unitClue: true,
    scoring: {
      start: 1000,
      investigationPenalties: [COUNTRY_REVEAL_COST],
      unitCluePenalty: UNIT_REVEAL_COST,
      wrongAnswerPenalty: WRONG_ANSWER_COST
    }
  },
  atlasMaster: {
    id: "atlasMaster",
    label: "Atlas Master",
    shortLabel: "Master",
    description: "Brutal expert tier with no visible answer list.",
    highlights: ["No visible answer choices", "Search the approved catalog", "1 country reveal", "Useful unit clues"],
    choiceCount: null,
    maxInvestigations: 1,
    unitClue: true,
    scoring: {
      start: 1000,
      investigationPenalties: [COUNTRY_REVEAL_COST],
      unitCluePenalty: UNIT_REVEAL_COST,
      wrongAnswerPenalty: WRONG_ANSWER_COST
    }
  }
};

export function deductScore(currentScore: number, penalty: number): number {
  return currentScore - penalty;
}

export function nextInvestigationPenalty(tier: Tier, paidInvestigationCount: number): number | null {
  const penalties = TIER_CONFIGS[tier].scoring.investigationPenalties;
  return penalties[paidInvestigationCount] ?? null;
}
