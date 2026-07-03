import type { EntityRegistry, IndicatorArtifact } from "@/lib/content/schemas";
import type { OrderAtlasCatalog, OrderAtlasRound } from "@/lib/order-atlas/schemas";

export const ORDER_ATLAS_NEAR_TIE_MINIMUM_RANGE_RATIO = 0.01;

export type OrderAtlasIndicatorArtifact = Pick<
  IndicatorArtifact,
  "id" | "reviewStatus" | "year" | "unit" | "valuesByIso3" | "source" | "editorialReview" | "category" | "difficulty" | "title" | "shortTitle"
>;

export type OrderAtlasValidationContext = {
  entityRegistry: EntityRegistry;
  indicators: OrderAtlasIndicatorArtifact[];
  nearTieMinimumRangeRatio?: number;
};

export type OrderAtlasValidationIssue = {
  roundId?: string;
  path: string;
  message: string;
};

export type OrderAtlasCountryValue = {
  iso3: string;
  value: number;
};

export type OrderAtlasSourceMeta = {
  unit: string;
  year: number;
  sourceLabel: string;
  sourceUrl: string;
};

export function validateOrderAtlasCatalog(catalog: OrderAtlasCatalog, context: OrderAtlasValidationContext): OrderAtlasValidationIssue[] {
  const issues: OrderAtlasValidationIssue[] = [];
  const entityIso3 = iso3SetFromEntityRegistry(context.entityRegistry);
  const indicatorById = new Map(context.indicators.map((indicator) => [indicator.id, indicator]));
  const roundIds = new Set<string>();

  for (const round of catalog.rounds) {
    validateRound(round, {
      entityIso3,
      indicatorById,
      roundIds,
      nearTieMinimumRangeRatio: context.nearTieMinimumRangeRatio ?? ORDER_ATLAS_NEAR_TIE_MINIMUM_RANGE_RATIO,
      issues
    });
  }

  return issues;
}

export function deriveOrderAtlasCountryValues(round: OrderAtlasRound, indicator: OrderAtlasIndicatorArtifact): OrderAtlasCountryValue[] {
  return round.countryIso3.map((iso3) => ({ iso3, value: indicator.valuesByIso3[iso3] }));
}

export function deriveOrderAtlasTrueOrder(round: OrderAtlasRound, indicator: OrderAtlasIndicatorArtifact): string[] {
  return deriveOrderAtlasCountryValues(round, indicator)
    .filter((row) => Number.isFinite(row.value))
    .sort((left, right) => {
      const valueSort = round.order === "asc" ? left.value - right.value : right.value - left.value;
      return valueSort || left.iso3.localeCompare(right.iso3);
    })
    .map((row) => row.iso3);
}

export function deriveOrderAtlasSourceMeta(indicator: OrderAtlasIndicatorArtifact): OrderAtlasSourceMeta {
  const sourceLabel = indicator.source.attribution || [indicator.source.provider, indicator.source.dataset].filter(Boolean).join(" - ");
  return {
    unit: indicator.unit,
    year: indicator.year,
    sourceLabel,
    sourceUrl: indicator.source.valuesReference ?? indicator.source.sourceReference
  };
}

export function iso3SetFromEntityRegistry(entityRegistry: EntityRegistry): Set<string> {
  return new Set(entityRegistry.entities.map((entity) => entity.iso3).filter((iso3): iso3 is string => Boolean(iso3)));
}

function validateRound(
  round: OrderAtlasRound,
  context: {
    entityIso3: Set<string>;
    indicatorById: Map<string, OrderAtlasIndicatorArtifact>;
    roundIds: Set<string>;
    nearTieMinimumRangeRatio: number;
    issues: OrderAtlasValidationIssue[];
  }
) {
  if (context.roundIds.has(round.id)) {
    addIssue(context.issues, round.id, "id", "round ids must be unique");
  }
  context.roundIds.add(round.id);

  const countries = new Set(round.countryIso3);
  if (countries.size !== round.countryIso3.length) {
    addIssue(context.issues, round.id, "countryIso3", "countryIso3 values must be unique");
  }
  for (const iso3 of round.countryIso3) {
    if (!context.entityIso3.has(iso3)) {
      addIssue(context.issues, round.id, "countryIso3", `${iso3} is not in the entity registry`);
    }
  }

  const indicator = context.indicatorById.get(round.indicatorId);
  if (!indicator) {
    addIssue(context.issues, round.id, "indicatorId", `${round.indicatorId} is not available in provided indicator artifacts`);
    return;
  }

  validateIndicatorEligibility(round, indicator, context.issues);
  validateSourceMeta(round, indicator, context.issues);
  validateValues(round, indicator, context.nearTieMinimumRangeRatio, context.issues);
}

function validateIndicatorEligibility(round: OrderAtlasRound, indicator: OrderAtlasIndicatorArtifact, issues: OrderAtlasValidationIssue[]) {
  if (indicator.reviewStatus !== "approved") {
    addIssue(issues, round.id, "indicatorId", `${indicator.id} is not an approved Mystery Map indicator`);
  }

  const review = indicator.editorialReview;
  if (review.status === "needs_review" || review.status === "retired") {
    addIssue(issues, round.id, "indicatorId", `${indicator.id} is not playable for Order Atlas`);
  }
  if (!review.dailyEligible && !review.practiceEligible && !review.expertOnly) {
    addIssue(issues, round.id, "indicatorId", `${indicator.id} is not Daily, Practice, or Expert eligible`);
  }

  if (round.eligibility === "daily" && !review.dailyEligible) {
    addIssue(issues, round.id, "eligibility", `${indicator.id} is not Daily eligible`);
  }
  if (round.eligibility === "practice" && !review.practiceEligible) {
    addIssue(issues, round.id, "eligibility", `${indicator.id} is not Practice eligible`);
  }
  if (round.eligibility === "expert-only" && !review.expertOnly) {
    addIssue(issues, round.id, "eligibility", `${indicator.id} is not Expert-only eligible`);
  }
}

function validateSourceMeta(round: OrderAtlasRound, indicator: OrderAtlasIndicatorArtifact, issues: OrderAtlasValidationIssue[]) {
  const meta = deriveOrderAtlasSourceMeta(indicator);
  if (!meta.unit.trim()) {
    addIssue(issues, round.id, "indicatorId", `${indicator.id} does not have a renderable unit`);
  }
  if (!Number.isInteger(meta.year)) {
    addIssue(issues, round.id, "indicatorId", `${indicator.id} does not have a renderable year`);
  }
  if (!meta.sourceLabel.trim()) {
    addIssue(issues, round.id, "indicatorId", `${indicator.id} does not have a renderable source label`);
  }
  try {
    new URL(meta.sourceUrl);
  } catch {
    addIssue(issues, round.id, "indicatorId", `${indicator.id} does not have a renderable source URL`);
  }
}

function validateValues(
  round: OrderAtlasRound,
  indicator: OrderAtlasIndicatorArtifact,
  nearTieMinimumRangeRatio: number,
  issues: OrderAtlasValidationIssue[]
) {
  const rows = deriveOrderAtlasCountryValues(round, indicator);
  for (const row of rows) {
    if (!Number.isFinite(row.value)) {
      addIssue(issues, round.id, "countryIso3", `${row.iso3} does not have numeric coverage for ${indicator.id}`);
    }
  }
  if (rows.some((row) => !Number.isFinite(row.value))) return;

  const sortedByValue = [...rows].sort((left, right) => left.value - right.value || left.iso3.localeCompare(right.iso3));
  const range = sortedByValue[sortedByValue.length - 1].value - sortedByValue[0].value;
  for (let index = 1; index < sortedByValue.length; index += 1) {
    const previous = sortedByValue[index - 1];
    const current = sortedByValue[index];
    const gap = current.value - previous.value;

    if (gap === 0) {
      if (!round.allowExactTies) {
        addIssue(issues, round.id, "countryIso3", `${previous.iso3} and ${current.iso3} are exactly tied for ${indicator.id}`);
      }
      continue;
    }

    const minimumGap = range * nearTieMinimumRangeRatio;
    if (range > 0 && gap < minimumGap && !round.allowNearTies) {
      addIssue(
        issues,
        round.id,
        "countryIso3",
        `${previous.iso3} and ${current.iso3} are too close for ${indicator.id}; gap ${gap} is below ${(nearTieMinimumRangeRatio * 100).toFixed(1)}% of the selected range`
      );
    }
  }
}

function addIssue(issues: OrderAtlasValidationIssue[], roundId: string | undefined, path: string, message: string) {
  issues.push({ roundId, path, message });
}
