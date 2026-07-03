import fs from "node:fs";
import path from "node:path";
import { Suspense } from "react";
import type { Metadata } from "next";
import entityRegistryJson from "../../../../public/data/v1/entity-registry.json";
import {
  InternalOrderAtlasReviewClient,
  type OrderAtlasReviewCountry,
  type OrderAtlasReviewRow
} from "@/features/order-atlas/InternalOrderAtlasReviewClient";
import { EntityRegistrySchema, IndicatorArtifactSchema, type IndicatorArtifact } from "@/lib/content/schemas";
import { ORDER_ATLAS_CATALOG, ORDER_ATLAS_ROUNDS } from "@/lib/order-atlas/catalog";
import { pointsPerOrderAtlasPlacement } from "@/lib/order-atlas/scoring";
import type { OrderAtlasRound } from "@/lib/order-atlas/schemas";
import {
  deriveOrderAtlasCountryValues,
  deriveOrderAtlasSourceMeta,
  deriveOrderAtlasTrueOrder,
  validateOrderAtlasCatalog,
  type OrderAtlasValidationIssue
} from "@/lib/order-atlas/validation";
import { pageMetadata } from "@/lib/site/seo";

export const metadata: Metadata = pageMetadata({
  title: "Internal Order Atlas Review",
  description: "Internal Can You Geo? Order Atlas catalog review tooling.",
  path: "/internal/order-atlas-review/",
  noIndex: true
});

const CLOSE_VALUE_WARNING_RATIO = 0.03;

export default function InternalOrderAtlasReviewPage() {
  const entityRegistry = EntityRegistrySchema.parse(entityRegistryJson);
  const countryNameByIso3 = new Map(
    entityRegistry.entities.filter((entity) => entity.iso3).map((entity) => [entity.iso3 as string, entity.name])
  );
  const indicatorArtifacts = loadOrderAtlasIndicatorArtifacts();
  const indicatorById = new Map(indicatorArtifacts.map((indicator) => [indicator.id, indicator]));
  const issues = validateOrderAtlasCatalog(ORDER_ATLAS_CATALOG, {
    entityRegistry,
    indicators: indicatorArtifacts
  });
  const issuesByRoundId = issues.reduce<Map<string, OrderAtlasValidationIssue[]>>((map, issue) => {
    if (!issue.roundId) return map;
    map.set(issue.roundId, [...(map.get(issue.roundId) ?? []), issue]);
    return map;
  }, new Map());

  const rows = ORDER_ATLAS_ROUNDS.map((round) => {
    const indicator = indicatorById.get(round.indicatorId);
    if (!indicator) {
      return fallbackReviewRow(round, issuesByRoundId.get(round.id) ?? [], countryNameByIso3);
    }
    return reviewRowForRound(round, indicator, issuesByRoundId.get(round.id) ?? [], countryNameByIso3);
  });

  return (
    <Suspense fallback={<section className="internal-review-page page-shell">Loading Order Atlas review...</section>}>
      <InternalOrderAtlasReviewClient rows={rows} contentVersion={ORDER_ATLAS_CATALOG.contentVersion} />
    </Suspense>
  );
}

function loadOrderAtlasIndicatorArtifacts(): IndicatorArtifact[] {
  const indicatorIds = [...new Set(ORDER_ATLAS_ROUNDS.map((round) => round.indicatorId))];
  return indicatorIds.map((indicatorId) =>
    IndicatorArtifactSchema.parse(
      JSON.parse(fs.readFileSync(path.join(process.cwd(), "public/data/v1/indicators", `${indicatorId}.json`), "utf8"))
    )
  );
}

function reviewRowForRound(
  round: OrderAtlasRound,
  indicator: IndicatorArtifact,
  validationIssues: OrderAtlasValidationIssue[],
  countryNameByIso3: Map<string, string>
): OrderAtlasReviewRow {
  const source = deriveOrderAtlasSourceMeta(indicator);
  const countryValues = deriveOrderAtlasCountryValues(round, indicator);
  const countryByIso3 = new Map(countryValues.map((row) => [row.iso3, row]));
  const selectedCountries = round.countryIso3.map((iso3) => reviewCountry(iso3, countryByIso3.get(iso3)?.value, indicator, countryNameByIso3));
  const trueOrder = deriveOrderAtlasTrueOrder(round, indicator).map((iso3) =>
    reviewCountry(iso3, countryByIso3.get(iso3)?.value, indicator, countryNameByIso3)
  );

  return {
    id: round.id,
    indicatorId: round.indicatorId,
    category: indicator.category,
    difficulty: round.difficulty,
    eligibility: round.eligibility,
    prompt: round.prompt,
    highlightText: round.highlightText,
    explanation: round.explanation,
    selectedCountries,
    trueOrder,
    order: round.order,
    unit: source.unit,
    year: source.year,
    dateVintage: round.dateVintage ?? String(source.year),
    sourceLabel: source.sourceLabel,
    sourceUrl: source.sourceUrl,
    scopeNote: round.scopeNote,
    validationIssues: validationIssues.map(({ path: issuePath, message }) => ({ path: issuePath, message })),
    warnings: closeValueWarnings(round, indicator, countryNameByIso3),
    placementPoints: pointsPerOrderAtlasPlacement(round.countryIso3.length)
  };
}

function fallbackReviewRow(
  round: OrderAtlasRound,
  validationIssues: OrderAtlasValidationIssue[],
  countryNameByIso3: Map<string, string>
): OrderAtlasReviewRow {
  const selectedCountries = round.countryIso3.map((iso3) => ({
    iso3,
    name: countryNameByIso3.get(iso3) ?? iso3,
    value: Number.NaN,
    formattedValue: "missing"
  }));
  return {
    id: round.id,
    indicatorId: round.indicatorId,
    category: "unknown",
    difficulty: round.difficulty,
    eligibility: round.eligibility,
    prompt: round.prompt,
    highlightText: round.highlightText,
    explanation: round.explanation,
    selectedCountries,
    trueOrder: selectedCountries,
    order: round.order,
    unit: "unknown",
    year: 0,
    dateVintage: round.dateVintage ?? "unknown",
    sourceLabel: "unknown",
    sourceUrl: "#",
    scopeNote: round.scopeNote,
    validationIssues: validationIssues.map(({ path: issuePath, message }) => ({ path: issuePath, message })),
    warnings: ["Indicator artifact could not be loaded for this round."],
    placementPoints: pointsPerOrderAtlasPlacement(round.countryIso3.length)
  };
}

function reviewCountry(
  iso3: string,
  value: number | undefined,
  indicator: IndicatorArtifact,
  countryNameByIso3: Map<string, string>
): OrderAtlasReviewCountry {
  const hasValue = typeof value === "number" && Number.isFinite(value);
  return {
    iso3,
    name: countryNameByIso3.get(iso3) ?? iso3,
    value: value ?? Number.NaN,
    formattedValue: hasValue ? formatIndicatorValue(indicator, value) : "missing"
  };
}

function formatIndicatorValue(indicator: IndicatorArtifact, value: number): string {
  const formatted = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: indicator.formatting.maximumFractionDigits
  }).format(value);
  return `${indicator.formatting.prefix ?? ""}${formatted}${indicator.formatting.suffix ?? ""}`;
}

function closeValueWarnings(round: OrderAtlasRound, indicator: IndicatorArtifact, countryNameByIso3: Map<string, string>): string[] {
  const values = deriveOrderAtlasCountryValues(round, indicator).filter((row) => Number.isFinite(row.value));
  const sorted = [...values].sort((left, right) => left.value - right.value || left.iso3.localeCompare(right.iso3));
  if (sorted.length < 2) return [];

  const range = sorted[sorted.length - 1].value - sorted[0].value;
  if (range <= 0) return [];

  const warnings: string[] = [];
  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1];
    const current = sorted[index];
    const gap = current.value - previous.value;
    const ratio = gap / range;
    if (ratio < CLOSE_VALUE_WARNING_RATIO) {
      const previousName = countryNameByIso3.get(previous.iso3) ?? previous.iso3;
      const currentName = countryNameByIso3.get(current.iso3) ?? current.iso3;
      warnings.push(
        `${previousName} and ${currentName} are close: ${formatIndicatorValue(indicator, gap)} apart, ${(ratio * 100).toFixed(1)}% of this round's value range.`
      );
    }
  }
  return warnings;
}
