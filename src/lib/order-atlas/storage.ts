import { z } from "zod";
import type { OrderAtlasScoreBreakdown } from "@/lib/order-atlas/scoring";

export const ORDER_ATLAS_STORAGE_KEY = "order-atlas:v1";
const SCHEMA_VERSION = "1.0.0";

export const OrderAtlasRoundStateSchema = z.object({
  cardOrderIso3: z.array(z.string().regex(/^[A-Z]{3}$/)).min(1),
  submittedIso3: z.array(z.string().regex(/^[A-Z]{3}$/)).min(1).optional(),
  score: z
    .object({
      totalCountries: z.number().int().min(1),
      correctPositions: z.number().int().min(0),
      positionAccuracy: z.number().min(0).max(1),
      pointsPerCorrectPlacement: z.number().min(0),
      baseScore: z.number().int().min(0),
      cluePenalty: z.number().int().min(0),
      finalScore: z.number().int().min(0)
    })
    .optional()
});
export type OrderAtlasRoundState = z.infer<typeof OrderAtlasRoundStateSchema>;

export const OrderAtlasRunStateSchema = z
  .object({
    id: z.string().min(1),
    mode: z.enum(["sample", "daily", "practice"]),
    dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    contentVersion: z.string().min(1),
    currentRoundIndex: z.number().int().min(0),
    status: z.enum(["active", "complete"]),
    roundIds: z.array(z.string().min(1)).min(1),
    rounds: z.array(OrderAtlasRoundStateSchema).min(1)
  })
  .superRefine((run, context) => {
    if (run.roundIds.length !== run.rounds.length) {
      context.addIssue({ code: "custom", path: ["rounds"], message: "rounds must align with roundIds" });
    }
    if (run.currentRoundIndex >= run.rounds.length) {
      context.addIssue({ code: "custom", path: ["currentRoundIndex"], message: "currentRoundIndex must point at an existing round" });
    }
    for (const [index, round] of run.rounds.entries()) {
      if (round.submittedIso3 && !round.score) {
        context.addIssue({ code: "custom", path: ["rounds", index, "score"], message: "submitted rounds must include a score" });
      }
      if (round.score && !round.submittedIso3) {
        context.addIssue({ code: "custom", path: ["rounds", index, "submittedIso3"], message: "scored rounds must include submitted order" });
      }
    }
  });
export type OrderAtlasRunState = z.infer<typeof OrderAtlasRunStateSchema>;
export type OrderAtlasRunMode = OrderAtlasRunState["mode"];

export const OrderAtlasPersistedStateSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  lastRunMode: z.enum(["sample", "daily", "practice"]).nullable().default(null),
  activeSampleRun: OrderAtlasRunStateSchema.nullable(),
  activeDailyRun: OrderAtlasRunStateSchema.nullable(),
  activePracticeRun: OrderAtlasRunStateSchema.nullable()
});
export type OrderAtlasPersistedState = z.infer<typeof OrderAtlasPersistedStateSchema>;

export function createOrderAtlasRun(input: {
  mode: OrderAtlasRunMode;
  dateKey: string;
  contentVersion: string;
  roundIds: string[];
  initialCardOrders: string[][];
  salt: string;
}): OrderAtlasRunState {
  return {
    id: `${input.mode}:${input.contentVersion}:${input.dateKey}:${input.salt}`,
    mode: input.mode,
    dateKey: input.dateKey,
    contentVersion: input.contentVersion,
    currentRoundIndex: 0,
    status: "active",
    roundIds: input.roundIds,
    rounds: input.roundIds.map((_, index) => ({
      cardOrderIso3: input.initialCardOrders[index] ?? []
    }))
  };
}

export function defaultOrderAtlasPersistedState(): OrderAtlasPersistedState {
  return {
    schemaVersion: SCHEMA_VERSION,
    lastRunMode: null,
    activeSampleRun: null,
    activeDailyRun: null,
    activePracticeRun: null
  };
}

export function loadOrderAtlasPersistedState(): OrderAtlasPersistedState {
  if (typeof window === "undefined") return defaultOrderAtlasPersistedState();
  const raw = window.localStorage.getItem(ORDER_ATLAS_STORAGE_KEY);
  if (!raw) return defaultOrderAtlasPersistedState();
  try {
    const parsed = JSON.parse(raw) as unknown;
    const result = OrderAtlasPersistedStateSchema.safeParse(parsed);
    if (result.success) return result.data;
  } catch {
    // Fall through and clear only Order Atlas storage.
  }
  window.localStorage.removeItem(ORDER_ATLAS_STORAGE_KEY);
  return defaultOrderAtlasPersistedState();
}

export function saveOrderAtlasPersistedState(state: OrderAtlasPersistedState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ORDER_ATLAS_STORAGE_KEY, JSON.stringify(state));
}

export function persistOrderAtlasRun(state: OrderAtlasPersistedState, run: OrderAtlasRunState): OrderAtlasPersistedState {
  if (run.mode === "sample") {
    return { ...state, lastRunMode: run.mode, activeSampleRun: run };
  }
  if (run.mode === "daily") {
    return { ...state, lastRunMode: run.mode, activeDailyRun: run };
  }
  return { ...state, lastRunMode: run.mode, activePracticeRun: run };
}

export function scoreFromOrderAtlasRoundState(round: OrderAtlasRoundState): OrderAtlasScoreBreakdown | null {
  return round.score ?? null;
}
