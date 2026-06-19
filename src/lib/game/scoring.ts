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
    minimumSolvedScore: number;
  };
};

export const TIER_CONFIGS: Record<Tier, TierConfig> = {
  explorer: {
    id: "explorer",
    label: "Explorer",
    shortLabel: "Explorer",
    description: "Easiest tier with broad answers and generous clues.",
    highlights: ["3 broad choices", "3 country investigations", "Country names on hover", "Unit clue available"],
    choiceCount: 3,
    maxInvestigations: 3,
    unitClue: true,
    scoring: {
      start: 1000,
      investigationPenalties: [60, 90, 120],
      unitCluePenalty: 120,
      wrongAnswerPenalty: 200,
      minimumSolvedScore: 100
    }
  },
  analyst: {
    id: "analyst",
    label: "Analyst",
    shortLabel: "Analyst",
    description: "Balanced serious play with plausible choices and enough evidence to reason it out.",
    badge: "Recommended",
    highlights: ["4 plausible choices", "3 country investigations", "Unit clue available", "Default serious play"],
    choiceCount: 4,
    maxInvestigations: 3,
    unitClue: true,
    scoring: {
      start: 1000,
      investigationPenalties: [100, 150, 200],
      unitCluePenalty: 200,
      wrongAnswerPenalty: 300,
      minimumSolvedScore: 100
    }
  },
  cartographer: {
    id: "cartographer",
    label: "Cartographer",
    shortLabel: "Cartographer",
    description: "Hard tier for strong geography and data players.",
    highlights: ["6 close choices", "1 country investigation", "No unit clue", "Closely related distractors"],
    choiceCount: 6,
    maxInvestigations: 1,
    unitClue: false,
    scoring: {
      start: 1000,
      investigationPenalties: [250],
      unitCluePenalty: 0,
      wrongAnswerPenalty: 300,
      minimumSolvedScore: 100
    }
  },
  atlasMaster: {
    id: "atlasMaster",
    label: "Atlas Master",
    shortLabel: "Master",
    description: "Brutal expert tier with no visible answer list.",
    highlights: ["No visible answer choices", "Search the approved catalog", "1 expensive investigation", "No unit clue"],
    choiceCount: null,
    maxInvestigations: 1,
    unitClue: false,
    scoring: {
      start: 1000,
      investigationPenalties: [300],
      unitCluePenalty: 0,
      wrongAnswerPenalty: 250,
      minimumSolvedScore: 100
    }
  }
};

export function deductScore(currentScore: number, penalty: number, tier: Tier): number {
  const minimum = TIER_CONFIGS[tier].scoring.minimumSolvedScore;
  return Math.max(minimum, currentScore - penalty);
}

export function nextInvestigationPenalty(tier: Tier, paidInvestigationCount: number): number | null {
  const penalties = TIER_CONFIGS[tier].scoring.investigationPenalties;
  return penalties[paidInvestigationCount] ?? null;
}
