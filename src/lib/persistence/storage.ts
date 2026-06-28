import { z } from "zod";
import { TierSchema } from "@/lib/content/schemas";
import { TIER_CONFIGS } from "@/lib/game/scoring";
import { updateStreak, emptyStreak } from "@/lib/game/streak";
import type { RunState } from "@/lib/game/state";

const STORAGE_KEY = "worldprint:v1";
const SCHEMA_VERSION = "1.1.0";
const LEGACY_SCHEMA_VERSION = "1.0.0";

const InvestigationSchema = z.object({
  iso3: z.string(),
  countryName: z.string(),
  value: z.number().nullable(),
  cost: z.number()
});

const RoundPlayStateSchema = z.object({
  roundId: z.string(),
  correctIndicatorId: z.string(),
  phase: z.enum(["active", "feedback", "solved"]),
  score: z.number(),
  investigations: z.array(InvestigationSchema),
  rejectedAnswers: z.array(z.object({ id: z.string(), label: z.string() })),
  unitClueUsed: z.boolean(),
  feedback: z.string().nullable()
});

const RunStateSchema: z.ZodType<RunState> = z.object({
  id: z.string(),
  mode: z.enum(["sample", "daily", "atlas", "practice", "archive", "challenge"]),
  dateKey: z.string(),
  contentVersion: z.string(),
  tier: TierSchema,
  currentRoundIndex: z.number().int(),
  status: z.enum(["active", "complete"]),
  rounds: z.array(RoundPlayStateSchema)
});

const CompletedResultSchema = z.object({
  challengeId: z.string(),
  dateKey: z.string(),
  tier: TierSchema,
  totalScore: z.number(),
  roundScores: z.array(z.number()),
  completedAt: z.string()
});

const CompletionRoundDetailSchema = z.object({
  roundNumber: z.number().int(),
  roundId: z.string(),
  correctIndicatorId: z.string(),
  result: z.enum(["correct", "recovered", "incomplete"]),
  score: z.number().int(),
  clueSpend: z.number().int(),
  investigationsUsed: z.number().int(),
  unitClueUsed: z.boolean(),
  misses: z.number().int(),
  rejectedAnswers: z.array(z.object({ id: z.string(), label: z.string() })),
  countryClues: z.array(InvestigationSchema)
});

const CompletionHistorySchema = z.object({
  id: z.string(),
  dateKey: z.string(),
  mode: z.enum(["sample", "daily", "atlas", "practice", "archive", "challenge"]),
  tier: TierSchema,
  totalScore: z.number().int(),
  bestScore: z.number().int(),
  roundScores: z.array(z.number().int()),
  roundCount: z.number().int(),
  completedAt: z.string(),
  lastPlayedAt: z.string(),
  roundDetails: z.array(CompletionRoundDetailSchema).optional()
});

const PersistedStateBaseSchema = z.object({
  onboardingComplete: z.boolean(),
  selectedTier: TierSchema,
  activeDailyRun: RunStateSchema.nullable(),
  activeAtlasRun: RunStateSchema.nullable().default(null),
  activePracticeRun: RunStateSchema.nullable(),
  completedDailyResults: z.record(z.string(), CompletedResultSchema),
  streak: z.object({
    current: z.number().int(),
    best: z.number().int(),
    lastCompletedDateKey: z.string().nullable()
  }),
  lifetime: z.object({
    dailyGames: z.number().int(),
    roundsSolved: z.number().int(),
    totalScore: z.number().int(),
    averageScore: z.number(),
    accuracy: z.number()
  }),
  practiceHistory: z.array(z.string())
});

export const PersistedStateSchema = PersistedStateBaseSchema.extend({
  schemaVersion: z.literal(SCHEMA_VERSION),
  activeArchiveRunsByDate: z.record(z.string(), RunStateSchema),
  atlasHistoryById: z.record(z.string(), CompletionHistorySchema).default({}),
  dailyHistoryByDate: z.record(z.string(), CompletionHistorySchema),
  archiveHistoryByDate: z.record(z.string(), CompletionHistorySchema),
  challengeHistoryById: z.record(z.string(), CompletionHistorySchema)
});
export type PersistedState = z.infer<typeof PersistedStateSchema>;
export type CompletionHistory = z.infer<typeof CompletionHistorySchema>;
export type CompletionRoundDetail = z.infer<typeof CompletionRoundDetailSchema>;

export function defaultPersistedState(): PersistedState {
  return {
    schemaVersion: SCHEMA_VERSION,
    onboardingComplete: false,
    selectedTier: "analyst",
    activeDailyRun: null,
    activeAtlasRun: null,
    activePracticeRun: null,
    completedDailyResults: {},
    activeArchiveRunsByDate: {},
    atlasHistoryById: {},
    dailyHistoryByDate: {},
    archiveHistoryByDate: {},
    challengeHistoryById: {},
    streak: emptyStreak,
    lifetime: {
      dailyGames: 0,
      roundsSolved: 0,
      totalScore: 0,
      averageScore: 0,
      accuracy: 0
    },
    practiceHistory: []
  };
}

const LegacyPersistedStateSchema = PersistedStateBaseSchema.extend({
  schemaVersion: z.literal(LEGACY_SCHEMA_VERSION)
});

function completionFromRun(run: RunState, completedAt = new Date().toISOString()): CompletionHistory {
  const totalScore = run.rounds.reduce((sum, round) => sum + round.score, 0);
  const roundScores = run.rounds.map((round) => round.score);
  const unitCluePenalty = TIER_CONFIGS[run.tier].scoring.unitCluePenalty;
  return {
    id: run.id,
    dateKey: run.dateKey,
    mode: run.mode,
    tier: run.tier,
    totalScore,
    bestScore: totalScore,
    roundScores,
    roundCount: run.rounds.length,
    completedAt,
    lastPlayedAt: completedAt,
    roundDetails: run.rounds.map((round, index) => {
      const investigationSpend = round.investigations.reduce((sum, investigation) => sum + investigation.cost, 0);
      const clueSpend = investigationSpend + (round.unitClueUsed ? unitCluePenalty : 0);
      return {
        roundNumber: index + 1,
        roundId: round.roundId,
        correctIndicatorId: round.correctIndicatorId,
        result: round.phase === "solved" ? (round.rejectedAnswers.length > 0 ? "recovered" : "correct") : "incomplete",
        score: round.score,
        clueSpend,
        investigationsUsed: round.investigations.filter((investigation) => investigation.cost > 0).length,
        unitClueUsed: round.unitClueUsed,
        misses: round.rejectedAnswers.length,
        rejectedAnswers: round.rejectedAnswers,
        countryClues: round.investigations
      };
    })
  };
}

function mergeBestCompletion(existing: CompletionHistory | undefined, next: CompletionHistory): CompletionHistory {
  if (!existing) return next;
  const bestScore = Math.max(existing.bestScore, next.totalScore);
  return {
    ...next,
    bestScore,
    totalScore: bestScore,
    roundScores: next.totalScore >= existing.bestScore ? next.roundScores : existing.roundScores,
    roundDetails: next.totalScore >= existing.bestScore ? next.roundDetails : existing.roundDetails,
    completedAt: existing.completedAt,
    lastPlayedAt: next.lastPlayedAt
  };
}

function migratePersistedState(parsed: unknown): PersistedState {
  const current = PersistedStateSchema.safeParse(parsed);
  if (current.success) return current.data;
  const legacy = LegacyPersistedStateSchema.safeParse(parsed);
  if (!legacy.success) return defaultPersistedState();
  const dailyHistoryByDate: Record<string, CompletionHistory> = {};
  for (const result of Object.values(legacy.data.completedDailyResults)) {
    dailyHistoryByDate[result.dateKey] = {
      id: result.challengeId,
      dateKey: result.dateKey,
      mode: "daily",
      tier: result.tier,
      totalScore: result.totalScore,
      bestScore: result.totalScore,
      roundScores: result.roundScores,
      roundCount: result.roundScores.length,
      completedAt: result.completedAt,
      lastPlayedAt: result.completedAt
    };
  }
  return PersistedStateSchema.parse({
    ...legacy.data,
    schemaVersion: SCHEMA_VERSION,
    activeArchiveRunsByDate: {},
    dailyHistoryByDate,
    archiveHistoryByDate: {},
    challengeHistoryById: {}
  });
}

export function loadPersistedState(): PersistedState {
  if (typeof window === "undefined") return defaultPersistedState();
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return defaultPersistedState();
  try {
    const parsed = JSON.parse(raw) as unknown;
    return migratePersistedState(parsed);
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return defaultPersistedState();
  }
}

export function savePersistedState(state: PersistedState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function persistRun(state: PersistedState, run: RunState): PersistedState {
  const next = { ...state, selectedTier: run.tier };
  if (run.mode === "daily") {
    next.activeDailyRun = run;
  } else if (run.mode === "atlas") {
    next.activeAtlasRun = run;
  } else if (run.mode === "practice") {
    next.activePracticeRun = run;
  } else if (run.mode === "archive") {
    next.activeArchiveRunsByDate = { ...state.activeArchiveRunsByDate, [run.dateKey]: run };
  }
  return next;
}

export function recordRunCompletion(state: PersistedState, run: RunState): PersistedState {
  if (run.status !== "complete") return state;
  if (run.mode === "sample") return state;
  const completion = completionFromRun(run);
  if (run.mode === "practice") {
    return {
      ...state,
      activePracticeRun: run
    };
  }
  if (run.mode === "archive") {
    return {
      ...state,
      activeArchiveRunsByDate: {
        ...state.activeArchiveRunsByDate,
        [run.dateKey]: run
      },
      archiveHistoryByDate: {
        ...state.archiveHistoryByDate,
        [run.dateKey]: mergeBestCompletion(state.archiveHistoryByDate[run.dateKey], completion)
      }
    };
  }
  if (run.mode === "atlas") {
    return {
      ...state,
      activeAtlasRun: run,
      atlasHistoryById: {
        ...state.atlasHistoryById,
        [run.id]: mergeBestCompletion(state.atlasHistoryById[run.id], completion)
      }
    };
  }
  if (run.mode === "challenge") {
    return {
      ...state,
      challengeHistoryById: {
        ...state.challengeHistoryById,
        [run.id]: mergeBestCompletion(state.challengeHistoryById[run.id], completion)
      }
    };
  }
  const challengeId = run.id;
  if (state.completedDailyResults[challengeId] && state.dailyHistoryByDate[run.dateKey]) return state;
  const totalScore = run.rounds.reduce((sum, round) => sum + round.score, 0);
  const roundScores = run.rounds.map((round) => round.score);
  const completed = {
    challengeId,
    dateKey: run.dateKey,
    tier: run.tier,
    totalScore,
    roundScores,
    completedAt: new Date().toISOString()
  };
  const dailyGames = state.lifetime.dailyGames + 1;
  const roundsSolved = state.lifetime.roundsSolved + run.rounds.length;
  const totalLifetimeScore = state.lifetime.totalScore + totalScore;
  return {
    ...state,
    activeDailyRun: run,
    completedDailyResults: {
      ...state.completedDailyResults,
      [challengeId]: completed
    },
    dailyHistoryByDate: {
      ...state.dailyHistoryByDate,
      [run.dateKey]: mergeBestCompletion(state.dailyHistoryByDate[run.dateKey], completion)
    },
    streak: updateStreak(state.streak, run.dateKey),
    lifetime: {
      dailyGames,
      roundsSolved,
      totalScore: totalLifetimeScore,
      averageScore: totalLifetimeScore / dailyGames,
      accuracy: 1
    }
  };
}

export function recordDailyCompletion(state: PersistedState, run: RunState): PersistedState {
  if (run.mode !== "daily") return state;
  return recordRunCompletion(state, run);
}

export function storageDescription(): string[] {
  return [
    "selected tier",
    "onboarding completion",
    "active Daily, Atlas, and Practice run state",
    "active archive Daily run state for generated archive dates",
    "completed Daily, Atlas, archive, and challenge results",
    "streak",
    "lifetime games, solved rounds, total score, average score, and accuracy",
    "practice history used to reduce immediate repetition"
  ];
}
