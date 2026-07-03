import { z } from "zod";
import { PatternAtlasDifficultySchema, PatternAtlasFamilySchema } from "@/lib/pattern-atlas/schemas";

export const PATTERN_ATLAS_STORAGE_KEY = "pattern-atlas:v1";
const SCHEMA_VERSION = "1.0.0";

export const PATTERN_ATLAS_STARTING_SCORE = 1000;
export const PATTERN_ATLAS_WRONG_ANSWER_PENALTY = 300;
export const PATTERN_ATLAS_CLUE_PENALTY = 100;

const PatternAtlasClueStateSchema = z.object({
  family: z.boolean(),
  highlightedCountry: z.boolean(),
  counterexample: z.boolean()
});

export const PatternAtlasRoundStateSchema = z.object({
  score: z.number().int(),
  solved: z.boolean(),
  rejectedAnswerIds: z.array(z.string()),
  feedback: z.string(),
  clues: PatternAtlasClueStateSchema
});
export type PatternAtlasRoundState = z.infer<typeof PatternAtlasRoundStateSchema>;

export const PatternAtlasRunSetupSchema = z.object({
  kind: z.literal("pro-pattern-run"),
  family: PatternAtlasFamilySchema.optional(),
  difficulty: PatternAtlasDifficultySchema.optional()
});
export type PatternAtlasRunSetup = z.infer<typeof PatternAtlasRunSetupSchema>;

export const PatternAtlasRunStateSchema = z
  .object({
    id: z.string().min(1),
    mode: z.enum(["sample", "daily", "practice"]),
    dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    contentVersion: z.string().min(1),
    currentRoundIndex: z.number().int().min(0),
    status: z.enum(["active", "complete"]),
    ruleIds: z.array(z.string().min(1)).min(1),
    rounds: z.array(PatternAtlasRoundStateSchema).min(1),
    setup: PatternAtlasRunSetupSchema.optional()
  })
  .superRefine((run, context) => {
    if (run.ruleIds.length !== run.rounds.length) {
      context.addIssue({ code: "custom", path: ["rounds"], message: "rounds must align with ruleIds" });
    }
    if (run.currentRoundIndex >= run.rounds.length) {
      context.addIssue({ code: "custom", path: ["currentRoundIndex"], message: "currentRoundIndex must point at an existing round" });
    }
    if (run.mode !== "practice" && run.setup) {
      context.addIssue({ code: "custom", path: ["setup"], message: "only practice runs can include setup metadata" });
    }
  });
export type PatternAtlasRunState = z.infer<typeof PatternAtlasRunStateSchema>;
export type PatternAtlasRunMode = PatternAtlasRunState["mode"];

export const PatternAtlasPersistedStateSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  activeSampleRun: PatternAtlasRunStateSchema.nullable(),
  activeDailyRun: PatternAtlasRunStateSchema.nullable(),
  activePracticeRun: PatternAtlasRunStateSchema.nullable()
});
export type PatternAtlasPersistedState = z.infer<typeof PatternAtlasPersistedStateSchema>;

export function initialPatternAtlasRoundState(): PatternAtlasRoundState {
  return {
    score: PATTERN_ATLAS_STARTING_SCORE,
    solved: false,
    rejectedAnswerIds: [],
    feedback: "",
    clues: {
      family: false,
      highlightedCountry: false,
      counterexample: false
    }
  };
}

export function createPatternAtlasRun(input: {
  mode: PatternAtlasRunMode;
  dateKey: string;
  contentVersion: string;
  ruleIds: string[];
  salt: string;
  setup?: PatternAtlasRunSetup;
}): PatternAtlasRunState {
  return {
    id: `${input.mode}:${input.contentVersion}:${input.dateKey}:${input.salt}`,
    mode: input.mode,
    dateKey: input.dateKey,
    contentVersion: input.contentVersion,
    currentRoundIndex: 0,
    status: "active",
    ruleIds: input.ruleIds,
    rounds: input.ruleIds.map(() => initialPatternAtlasRoundState()),
    ...(input.setup ? { setup: input.setup } : {})
  };
}

export function defaultPatternAtlasPersistedState(): PatternAtlasPersistedState {
  return {
    schemaVersion: SCHEMA_VERSION,
    activeSampleRun: null,
    activeDailyRun: null,
    activePracticeRun: null
  };
}

export function loadPatternAtlasPersistedState(): PatternAtlasPersistedState {
  if (typeof window === "undefined") return defaultPatternAtlasPersistedState();
  const raw = window.localStorage.getItem(PATTERN_ATLAS_STORAGE_KEY);
  if (!raw) return defaultPatternAtlasPersistedState();
  try {
    const parsed = JSON.parse(raw) as unknown;
    const result = PatternAtlasPersistedStateSchema.safeParse(parsed);
    if (result.success) return result.data;
  } catch {
    // Fall through and clear only Pattern Atlas storage.
  }
  window.localStorage.removeItem(PATTERN_ATLAS_STORAGE_KEY);
  return defaultPatternAtlasPersistedState();
}

export function savePatternAtlasPersistedState(state: PatternAtlasPersistedState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PATTERN_ATLAS_STORAGE_KEY, JSON.stringify(state));
}

export function persistPatternAtlasRun(state: PatternAtlasPersistedState, run: PatternAtlasRunState): PatternAtlasPersistedState {
  if (run.mode === "sample") {
    return { ...state, activeSampleRun: run };
  }
  if (run.mode === "daily") {
    return { ...state, activeDailyRun: run };
  }
  return { ...state, activePracticeRun: run };
}
