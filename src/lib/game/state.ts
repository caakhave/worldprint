import type { Tier } from "@/lib/content/schemas";
import { deductScore, nextInvestigationPenalty, TIER_CONFIGS } from "@/lib/game/scoring";

export type RunMode = "daily" | "practice" | "archive" | "challenge";
export type RoundPhase = "active" | "feedback" | "solved";

export type Investigation = {
  iso3: string;
  countryName: string;
  value: number | null;
  cost: number;
};

export type RoundPlayState = {
  roundId: string;
  correctIndicatorId: string;
  phase: RoundPhase;
  score: number;
  investigations: Investigation[];
  rejectedAnswers: Array<{ id: string; label: string }>;
  unitClueUsed: boolean;
  feedback: string | null;
};

export type RunState = {
  id: string;
  mode: RunMode;
  dateKey: string;
  contentVersion: string;
  tier: Tier;
  currentRoundIndex: number;
  status: "active" | "complete";
  rounds: RoundPlayState[];
};

export type CreateRunInput = {
  mode: RunMode;
  dateKey: string;
  contentVersion: string;
  tier: Tier;
  roundIds: Array<{ roundId: string; correctIndicatorId: string }>;
  salt?: string;
};

export function createRun(input: CreateRunInput): RunState {
  return {
    id: `${input.mode}:${input.contentVersion}:${input.dateKey}:${input.tier}:${input.salt ?? "0"}`,
    mode: input.mode,
    dateKey: input.dateKey,
    contentVersion: input.contentVersion,
    tier: input.tier,
    currentRoundIndex: 0,
    status: "active",
    rounds: input.roundIds.map((round) => ({
      roundId: round.roundId,
      correctIndicatorId: round.correctIndicatorId,
      phase: "active",
      score: TIER_CONFIGS[input.tier].scoring.start,
      investigations: [],
      rejectedAnswers: [],
      unitClueUsed: false,
      feedback: null
    }))
  };
}

export type RunAction =
  | { type: "investigate"; iso3: string; countryName: string; value: number | null }
  | { type: "unitClue" }
  | { type: "submit"; answerId: string; label: string; correct: boolean }
  | { type: "nextRound" };

export function activeRound(run: RunState): RoundPlayState {
  return run.rounds[run.currentRoundIndex];
}

function updateCurrentRound(run: RunState, round: RoundPlayState): RunState {
  const rounds = [...run.rounds];
  rounds[run.currentRoundIndex] = round;
  return { ...run, rounds };
}

function paidInvestigationCount(round: RoundPlayState): number {
  return round.investigations.filter((investigation) => investigation.cost > 0).length;
}

export function reduceRun(run: RunState, action: RunAction): RunState {
  if (run.status === "complete") return run;
  const round = activeRound(run);
  if (!round || round.phase === "solved") {
    if (action.type === "nextRound") {
      const nextIndex = run.currentRoundIndex + 1;
      if (nextIndex >= run.rounds.length) {
        return { ...run, status: "complete" };
      }
      return { ...run, currentRoundIndex: nextIndex };
    }
    return run;
  }

  if (action.type === "investigate") {
    const existing = round.investigations.find((item) => item.iso3 === action.iso3);
    if (existing) {
      return updateCurrentRound(run, {
        ...round,
        feedback:
          existing.value === null
            ? `${existing.countryName}: No data for this country on this map.`
            : `${existing.countryName} already revealed. No points spent this time.`
      });
    }
    if (action.value === null) {
      return updateCurrentRound(run, {
        ...round,
        phase: "feedback",
        investigations: [...round.investigations, { ...action, cost: 0 }],
        feedback: `${action.countryName}: No data for this country on this map.`
      });
    }
    const paidCount = paidInvestigationCount(round);
    const penalty = nextInvestigationPenalty(run.tier, paidCount);
    if (penalty === null) {
      return updateCurrentRound(run, {
        ...round,
        phase: "feedback",
        feedback: "Country reveals used up for this round."
      });
    }
    return updateCurrentRound(run, {
      ...round,
      phase: "feedback",
      score: deductScore(round.score, penalty),
      investigations: [...round.investigations, { ...action, cost: penalty }],
      feedback: `${action.countryName} revealed for ${penalty} points`
    });
  }

  if (action.type === "unitClue") {
    const config = TIER_CONFIGS[run.tier];
    if (!config.unitClue || round.unitClueUsed) return run;
    return updateCurrentRound(run, {
      ...round,
      phase: "feedback",
      unitClueUsed: true,
      score: deductScore(round.score, config.scoring.unitCluePenalty),
      feedback: `Unit clue revealed for ${config.scoring.unitCluePenalty} points`
    });
  }

  if (action.type === "submit") {
    if (action.correct) {
      return updateCurrentRound(run, {
        ...round,
        phase: "solved",
        feedback: "Correct"
      });
    }
    if (round.rejectedAnswers.some((answer) => answer.id === action.answerId)) {
      return updateCurrentRound(run, {
        ...round,
        phase: "feedback",
        feedback: "That answer has already been rejected"
      });
    }
    const penalty = TIER_CONFIGS[run.tier].scoring.wrongAnswerPenalty;
    return updateCurrentRound(run, {
      ...round,
      phase: "feedback",
      score: deductScore(round.score, penalty),
      rejectedAnswers: [...round.rejectedAnswers, { id: action.answerId, label: action.label }],
      feedback: `Incorrect. ${penalty} points deducted.`
    });
  }

  if (action.type === "nextRound") {
    return run;
  }

  return run;
}

export function normalizeGuess(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function isAcceptedAtlasGuess(
  guess: string,
  acceptedAliases: string[],
  correctIndicator: { id: string; title: string; shortTitle: string; providerCode: string }
): boolean {
  const normalized = normalizeGuess(guess);
  const accepted = [correctIndicator.id, correctIndicator.title, correctIndicator.shortTitle, correctIndicator.providerCode, ...acceptedAliases].map(
    normalizeGuess
  );
  return accepted.includes(normalized);
}
