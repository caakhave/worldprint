import { z } from "zod";

export const TierSchema = z.enum(["explorer", "analyst", "cartographer", "atlasMaster"]);
export type Tier = z.infer<typeof TierSchema>;

export const IndicatorDifficultySchema = z.enum(["intro", "standard", "expert"]);
export type IndicatorDifficulty = z.infer<typeof IndicatorDifficultySchema>;

export const EditorialStatusSchema = z.enum(["daily_eligible", "practice_eligible", "expert_only", "needs_review", "retired"]);
export type EditorialStatus = z.infer<typeof EditorialStatusSchema>;

export const AmbiguityRiskSchema = z.enum(["low", "medium", "high"]);
export type AmbiguityRisk = z.infer<typeof AmbiguityRiskSchema>;

export const EditorialReviewSchema = z.object({
  status: EditorialStatusSchema,
  reviewedAt: z.string().optional(),
  reviewedBy: z.string().optional(),
  qualityScore: z.number().int().min(1).max(5).optional(),
  funScore: z.number().int().min(1).max(5).optional(),
  fairnessScore: z.number().int().min(1).max(5).optional(),
  ambiguityRisk: AmbiguityRiskSchema,
  dailyEligible: z.boolean(),
  practiceEligible: z.boolean(),
  challengeEligible: z.boolean(),
  expertOnly: z.boolean(),
  reviewNotes: z.array(z.string().min(1)),
  acceptableCloseDistractorIds: z.array(z.string()).optional()
});
export type EditorialReview = z.infer<typeof EditorialReviewSchema>;

export const IndicatorEditorialSchema = z.object({
  shortHook: z.string().min(1),
  patternNote: z.string().min(1),
  whyItMatters: z.string().min(1),
  bestProbeCountries: z
    .array(
      z.object({
        iso3: z.string().length(3),
        reason: z.string().min(1)
      })
    )
    .min(2),
  commonConfusions: z
    .array(
      z.object({
        confusedWithIndicatorCode: z.string().min(1),
        reason: z.string().min(1)
      })
    )
    .min(2),
  difficultyReason: z.string().min(1),
  dataCaveat: z.string().min(1).optional(),
  regionalSignals: z.array(z.string().min(1)).min(2)
});
export type IndicatorEditorial = z.infer<typeof IndicatorEditorialSchema>;

export const IndicatorSummarySchema = z.object({
  id: z.string(),
  providerCode: z.string(),
  title: z.string(),
  shortTitle: z.string(),
  category: z.string(),
  difficulty: IndicatorDifficultySchema,
  year: z.number().int(),
  coverage: z.number().int(),
  path: z.string(),
  reviewStatus: z.enum(["draft", "approved"]),
  shortHook: z.string().min(1).optional(),
  editorialReview: EditorialReviewSchema
});

export const ManifestSchema = z.object({
  schemaVersion: z.string(),
  contentVersion: z.string(),
  generatedAt: z.string(),
  map: z.object({
    path: z.string(),
    checksum: z.string()
  }),
  entityRegistry: z.object({
    path: z.string()
  }),
  sources: z.object({
    path: z.string()
  }),
  dailies: z
    .object({
      path: z.string(),
      start: z.string(),
      end: z.string(),
      count: z.number().int(),
      generatorVersion: z.string()
    })
    .optional(),
  indicators: z.array(IndicatorSummarySchema),
  rounds: z.array(
    z.object({
      id: z.string(),
      correctIndicatorId: z.string(),
      category: z.string(),
      difficulty: IndicatorDifficultySchema
    })
  )
});
export type Manifest = z.infer<typeof ManifestSchema>;
export type IndicatorSummary = z.infer<typeof IndicatorSummarySchema>;

const DailyMixSchema = z.record(z.string(), z.number().int().nonnegative());

export const DailyManifestSchema = z.object({
  schemaVersion: z.string(),
  game: z.literal("worldprint"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  contentVersion: z.string(),
  roundIds: z.array(z.string()).min(1),
  indicatorIds: z.array(z.string()).min(1),
  categoryMix: DailyMixSchema,
  mapDifficultyMix: DailyMixSchema,
  generatedAt: z.string(),
  generatorVersion: z.string(),
  varietyNotes: z.array(z.string()).min(1)
});
export type DailyManifest = z.infer<typeof DailyManifestSchema>;

export const DailyIndexEntrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  path: z.string(),
  roundCount: z.number().int().positive(),
  roundIds: z.array(z.string()).min(1),
  indicatorIds: z.array(z.string()).min(1),
  categoryMix: DailyMixSchema,
  mapDifficultyMix: DailyMixSchema
});

export const DailyIndexSchema = z.object({
  schemaVersion: z.string(),
  game: z.literal("worldprint"),
  contentVersion: z.string(),
  generatedAt: z.string(),
  generatorVersion: z.string(),
  buildDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  range: z.object({
    start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    pastDays: z.number().int().nonnegative(),
    futureDays: z.number().int().nonnegative()
  }),
  dates: z.array(DailyIndexEntrySchema)
});
export type DailyIndexEntry = z.infer<typeof DailyIndexEntrySchema>;
export type DailyIndex = z.infer<typeof DailyIndexSchema>;

export const IndicatorArtifactSchema = z.object({
  schemaVersion: z.string(),
  id: z.string(),
  providerCode: z.string(),
  title: z.string(),
  shortTitle: z.string(),
  category: z.string(),
  difficulty: IndicatorDifficultySchema,
  definition: z.string(),
  unit: z.string(),
  unitClue: z.string().nullable().optional(),
  unitClueUseful: z.boolean().optional(),
  year: z.number().int(),
  valuesByIso3: z.record(z.string(), z.number().finite()),
  stats: z.object({
    coverage: z.number().int(),
    min: z.number().finite(),
    max: z.number().finite(),
    median: z.number().finite(),
    quantileBreaks: z.array(z.number().finite()).min(2)
  }),
  formatting: z.object({
    maximumFractionDigits: z.number().int().min(0).max(6),
    prefix: z.string().optional(),
    suffix: z.string().optional()
  }),
  source: z.object({
    provider: z.string(),
    dataset: z.string(),
    attribution: z.string(),
    sourceReference: z.string(),
    valuesReference: z.string().optional(),
    license: z.string(),
    licenseReference: z.string().optional(),
    retrievedAt: z.string(),
    checksum: z.string().optional(),
    sourceOrganization: z.string().nullable().optional()
  }),
  reviewStatus: z.enum(["draft", "approved"]),
  editorial: IndicatorEditorialSchema,
  editorialReview: EditorialReviewSchema,
  contentVersion: z.string()
});
export type IndicatorArtifact = z.infer<typeof IndicatorArtifactSchema>;

export const ChoiceSchema = z.object({
  indicatorId: z.string(),
  label: z.string()
});
export type Choice = z.infer<typeof ChoiceSchema>;

export const RoundDefinitionSchema = z.object({
  id: z.string(),
  correctIndicatorId: z.string(),
  category: z.string(),
  difficulty: IndicatorDifficultySchema,
  choices: z.object({
    explorer: z.array(ChoiceSchema).length(3),
    analyst: z.array(ChoiceSchema).length(4),
    cartographer: z.array(ChoiceSchema).length(6)
  }),
  acceptedAliases: z.array(z.string()).min(1),
  patternNotes: z.array(z.string()),
  avoidSameDayIndicatorIds: z.array(z.string()).default([]),
  editorialStatus: EditorialStatusSchema,
  ambiguityRisk: AmbiguityRiskSchema,
  eligibility: z.object({
    daily: z.boolean(),
    practice: z.boolean(),
    challenge: z.boolean(),
    expertOnly: z.boolean()
  }),
  reviewStatus: z.literal("approved")
});
export type RoundDefinition = z.infer<typeof RoundDefinitionSchema>;

export const RoundsArtifactSchema = z.object({
  schemaVersion: z.string(),
  contentVersion: z.string(),
  rounds: z.array(RoundDefinitionSchema)
});
export type RoundsArtifact = z.infer<typeof RoundsArtifactSchema>;

export const EntitySchema = z.object({
  mapId: z.string(),
  iso3: z.string().nullable(),
  name: z.string(),
  admin: z.string(),
  naturalEarth: z.object({
    adm0A3: z.string().nullable().optional(),
    isoA3: z.string().nullable().optional(),
    wbA3: z.string().nullable().optional(),
    sovereignt: z.string().nullable().optional(),
    type: z.string().nullable().optional()
  }),
  reviewStatus: z.string(),
  reviewReason: z.string()
});
export type Entity = z.infer<typeof EntitySchema>;

export const EntityRegistrySchema = z.object({
  schemaVersion: z.string(),
  contentVersion: z.string(),
  entities: z.array(EntitySchema)
});
export type EntityRegistry = z.infer<typeof EntityRegistrySchema>;

export const SourceRegistrySchema = z.object({
  schemaVersion: z.string(),
  contentVersion: z.string(),
  generatedAt: z.string(),
  sources: z.array(z.record(z.string(), z.unknown()))
});
export type SourceRegistry = z.infer<typeof SourceRegistrySchema>;

export type MapFeature = {
  type: "Feature";
  properties: {
    mapId: string;
    iso3: string | null;
    name: string;
    hasWorldBankCountry: boolean;
  };
  geometry: unknown;
};

export type MapFeatureCollection = {
  type: "FeatureCollection";
  properties: Record<string, unknown>;
  features: MapFeature[];
};
