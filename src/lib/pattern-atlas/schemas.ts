import { z } from "zod";

const SlugIdSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const Iso3Schema = z.string().regex(/^[A-Z]{3}$/);

export const PatternAtlasFamilySchema = z.enum(["language", "borders", "physical_geography", "organizations", "economy", "indicators"]);
export type PatternAtlasFamily = z.infer<typeof PatternAtlasFamilySchema>;

export const PatternAtlasDifficultySchema = z.enum(["intro", "standard", "expert"]);
export type PatternAtlasDifficulty = z.infer<typeof PatternAtlasDifficultySchema>;

export const PatternAtlasEligibilitySchema = z.enum(["sample", "daily", "practice", "expert-only"]);
export type PatternAtlasEligibility = z.infer<typeof PatternAtlasEligibilitySchema>;

export const PatternAtlasIndicatorSelectionSchema = z.enum(["top_quartile", "bottom_quartile"]);
export type PatternAtlasIndicatorSelection = z.infer<typeof PatternAtlasIndicatorSelectionSchema>;

export const PatternAtlasSourceSchema = z.object({
  id: SlugIdSchema,
  provider: z.string().min(1),
  dataset: z.string().min(1),
  attribution: z.string().min(1).optional(),
  sourceReference: z.string().url(),
  license: z.string().min(1),
  licenseReference: z.string().url().optional(),
  retrievedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().min(1).optional()
});
export type PatternAtlasSource = z.infer<typeof PatternAtlasSourceSchema>;

export const PatternAtlasDecoySchema = z.object({
  displayAnswer: z.string().min(1),
  whyPlausible: z.string().min(1),
  whyWrong: z.string().min(1)
});
export type PatternAtlasDecoy = z.infer<typeof PatternAtlasDecoySchema>;

export const PatternAtlasIndicatorRefSchema = z.object({
  indicatorId: SlugIdSchema,
  selection: PatternAtlasIndicatorSelectionSchema,
  year: z.number().int().optional()
});
export type PatternAtlasIndicatorRef = z.infer<typeof PatternAtlasIndicatorRefSchema>;

export const PatternAtlasRuleSchema = z
  .object({
    id: SlugIdSchema,
    displayAnswer: z.string().min(1),
    family: PatternAtlasFamilySchema,
    includedIso3: z.array(Iso3Schema).min(1),
    counterexampleIso3: z.array(Iso3Schema).default([]),
    difficulty: PatternAtlasDifficultySchema,
    eligibility: PatternAtlasEligibilitySchema,
    sources: z.array(SlugIdSchema).min(1),
    explanation: z.string().min(1),
    decoys: z.array(PatternAtlasDecoySchema).min(3),
    dateVintage: z.string().min(1).optional(),
    indicatorRef: PatternAtlasIndicatorRefSchema.optional(),
    allowSmallHighlightSet: z.boolean().default(false),
    allowLargeHighlightSet: z.boolean().default(false),
    scopeNote: z.string().min(1).optional()
  })
  .superRefine((rule, context) => {
    const included = new Set(rule.includedIso3);
    if (included.size !== rule.includedIso3.length) {
      context.addIssue({ code: "custom", path: ["includedIso3"], message: "includedIso3 values must be unique" });
    }

    const counterexamples = new Set(rule.counterexampleIso3);
    if (counterexamples.size !== rule.counterexampleIso3.length) {
      context.addIssue({ code: "custom", path: ["counterexampleIso3"], message: "counterexampleIso3 values must be unique" });
    }
    for (const iso3 of counterexamples) {
      if (included.has(iso3)) {
        context.addIssue({ code: "custom", path: ["counterexampleIso3"], message: `${iso3} cannot be both included and a counterexample` });
      }
    }

    const normalizedAnswer = normalizeAnswer(rule.displayAnswer);
    const decoys = new Set<string>();
    for (const [index, decoy] of rule.decoys.entries()) {
      const normalizedDecoy = normalizeAnswer(decoy.displayAnswer);
      if (normalizedDecoy === normalizedAnswer) {
        context.addIssue({ code: "custom", path: ["decoys", index, "displayAnswer"], message: "decoy cannot duplicate the correct answer" });
      }
      if (decoys.has(normalizedDecoy)) {
        context.addIssue({ code: "custom", path: ["decoys", index, "displayAnswer"], message: "decoy display answers must be unique" });
      }
      decoys.add(normalizedDecoy);
    }

    if (rule.family === "indicators" && !rule.indicatorRef) {
      context.addIssue({ code: "custom", path: ["indicatorRef"], message: "indicator family rules must declare indicatorRef" });
    }
    if (rule.family !== "indicators" && rule.indicatorRef) {
      context.addIssue({ code: "custom", path: ["indicatorRef"], message: "only indicator family rules can declare indicatorRef" });
    }
  });
export type PatternAtlasRule = z.infer<typeof PatternAtlasRuleSchema>;

export const PatternAtlasCatalogSchema = z
  .object({
    schemaVersion: z.string().min(1),
    game: z.literal("pattern-atlas"),
    contentVersion: z.string().min(1),
    sourceRegistry: z.array(PatternAtlasSourceSchema).min(1),
    rules: z.array(PatternAtlasRuleSchema).min(1)
  })
  .superRefine((catalog, context) => {
    const sourceIds = new Set<string>();
    for (const [index, source] of catalog.sourceRegistry.entries()) {
      if (sourceIds.has(source.id)) {
        context.addIssue({ code: "custom", path: ["sourceRegistry", index, "id"], message: "source ids must be unique" });
      }
      sourceIds.add(source.id);
    }

    const ruleIds = new Set<string>();
    const displayAnswers = new Set<string>();
    for (const [index, rule] of catalog.rules.entries()) {
      if (ruleIds.has(rule.id)) {
        context.addIssue({ code: "custom", path: ["rules", index, "id"], message: "rule ids must be unique" });
      }
      ruleIds.add(rule.id);

      const normalizedAnswer = normalizeAnswer(rule.displayAnswer);
      if (displayAnswers.has(normalizedAnswer)) {
        context.addIssue({ code: "custom", path: ["rules", index, "displayAnswer"], message: "display answers must be unique" });
      }
      displayAnswers.add(normalizedAnswer);

      for (const sourceId of rule.sources) {
        if (!sourceIds.has(sourceId)) {
          context.addIssue({ code: "custom", path: ["rules", index, "sources"], message: `unknown source id ${sourceId}` });
        }
      }
    }
  });
export type PatternAtlasCatalog = z.infer<typeof PatternAtlasCatalogSchema>;

export function normalizeAnswer(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}
