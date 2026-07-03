import { z } from "zod";

const SlugIdSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const Iso3Schema = z.string().regex(/^[A-Z]{3}$/);

export const OrderAtlasDifficultySchema = z.enum(["intro", "standard", "expert"]);
export type OrderAtlasDifficulty = z.infer<typeof OrderAtlasDifficultySchema>;

export const OrderAtlasEligibilitySchema = z.enum(["sample", "daily", "practice", "expert-only"]);
export type OrderAtlasEligibility = z.infer<typeof OrderAtlasEligibilitySchema>;

export const OrderAtlasOrderSchema = z.enum(["asc", "desc"]);
export type OrderAtlasOrder = z.infer<typeof OrderAtlasOrderSchema>;

export const OrderAtlasSourceModeSchema = z.literal("mystery-map-indicator");
export type OrderAtlasSourceMode = z.infer<typeof OrderAtlasSourceModeSchema>;

export const OrderAtlasRoundSchema = z
  .object({
    id: SlugIdSchema,
    indicatorId: SlugIdSchema,
    prompt: z.string().min(1),
    highlightText: z.string().min(1),
    countryIso3: z.array(Iso3Schema).min(4).max(6),
    order: OrderAtlasOrderSchema.default("desc"),
    difficulty: OrderAtlasDifficultySchema,
    eligibility: OrderAtlasEligibilitySchema,
    explanation: z.string().min(1),
    sourceMode: OrderAtlasSourceModeSchema,
    dateVintage: z.string().min(1).optional(),
    scopeNote: z.string().min(1).optional(),
    allowExactTies: z.boolean().default(false),
    allowNearTies: z.boolean().default(false)
  })
  .strict()
  .superRefine((round, context) => {
    const countries = new Set(round.countryIso3);
    if (countries.size !== round.countryIso3.length) {
      context.addIssue({ code: "custom", path: ["countryIso3"], message: "countryIso3 values must be unique" });
    }

    const highlightCount = countExactOccurrences(round.prompt, round.highlightText);
    if (highlightCount !== 1) {
      context.addIssue({
        code: "custom",
        path: ["highlightText"],
        message: "highlightText must appear exactly once in prompt"
      });
    }
  });
export type OrderAtlasRound = z.infer<typeof OrderAtlasRoundSchema>;

function countExactOccurrences(value: string, search: string): number {
  if (search.length === 0) return 0;

  let count = 0;
  let index = value.indexOf(search);
  while (index !== -1) {
    count += 1;
    index = value.indexOf(search, index + search.length);
  }
  return count;
}

export const OrderAtlasCatalogSchema = z
  .object({
    schemaVersion: z.string().min(1),
    game: z.literal("order-atlas"),
    contentVersion: z.string().min(1),
    rounds: z.array(OrderAtlasRoundSchema).min(1)
  })
  .strict()
  .superRefine((catalog, context) => {
    const roundIds = new Set<string>();
    for (const [index, round] of catalog.rounds.entries()) {
      if (roundIds.has(round.id)) {
        context.addIssue({ code: "custom", path: ["rounds", index, "id"], message: "round ids must be unique" });
      }
      roundIds.add(round.id);
    }
  });
export type OrderAtlasCatalog = z.infer<typeof OrderAtlasCatalogSchema>;
