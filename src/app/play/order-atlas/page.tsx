import fs from "node:fs";
import path from "node:path";
import { Suspense } from "react";
import type { Metadata } from "next";
import entityRegistryJson from "../../../../public/data/v1/entity-registry.json";
import { OrderAtlasClient, type OrderAtlasPlayableCountry, type OrderAtlasPlayableRound } from "@/features/order-atlas/OrderAtlasClient";
import { EntityRegistrySchema, IndicatorArtifactSchema, type IndicatorArtifact } from "@/lib/content/schemas";
import { ORDER_ATLAS_CATALOG, ORDER_ATLAS_ROUNDS } from "@/lib/order-atlas/catalog";
import { sampleOrderAtlasRoundIds } from "@/lib/order-atlas/selection";
import type { OrderAtlasRound } from "@/lib/order-atlas/schemas";
import {
  deriveOrderAtlasCountryValues,
  deriveOrderAtlasSourceMeta,
  deriveOrderAtlasTrueOrder,
  validateOrderAtlasCatalog
} from "@/lib/order-atlas/validation";
import { pageMetadata } from "@/lib/site/seo";

export const metadata: Metadata = pageMetadata({
  title: "Play Order Atlas - Geography Ordering Game",
  description: "Play the Order Atlas intro sample, a Can You Geo? geography game where you arrange countries by a known data signal.",
  path: "/play/order-atlas/"
});

export default function PlayOrderAtlasPage() {
  const rounds = getOrderAtlasSampleRounds();
  return (
    <Suspense
      fallback={
        <section className="order-atlas-page game-shell page-shell">
          <div className="empty-state surface">
            <h1>Loading Order Atlas</h1>
            <p>Preparing the sample ordering run.</p>
          </div>
        </section>
      }
    >
      <OrderAtlasClient rounds={rounds} />
    </Suspense>
  );
}

function getOrderAtlasSampleRounds(): OrderAtlasPlayableRound[] {
  const entityRegistry = EntityRegistrySchema.parse(entityRegistryJson);
  const countryNameByIso3 = new Map(
    entityRegistry.entities.filter((entity) => entity.iso3).map((entity) => [entity.iso3 as string, entity.name])
  );
  const indicators = loadOrderAtlasIndicatorArtifacts();
  const issues = validateOrderAtlasCatalog(ORDER_ATLAS_CATALOG, { entityRegistry, indicators });
  if (issues.length > 0) {
    throw new Error(`Order Atlas catalog validation failed: ${issues[0].roundId ?? "catalog"} ${issues[0].path} ${issues[0].message}`);
  }

  const indicatorById = new Map(indicators.map((indicator) => [indicator.id, indicator]));
  const roundById = new Map(ORDER_ATLAS_ROUNDS.map((round) => [round.id, round]));
  return sampleOrderAtlasRoundIds(ORDER_ATLAS_ROUNDS).map((roundId) => {
    const round = roundById.get(roundId);
    if (!round) throw new Error(`Missing Order Atlas sample round ${roundId}`);
    const indicator = indicatorById.get(round.indicatorId);
    if (!indicator) throw new Error(`Missing Order Atlas indicator artifact ${round.indicatorId}`);
    return playableRoundForRound(round, indicator, countryNameByIso3);
  });
}

function loadOrderAtlasIndicatorArtifacts(): IndicatorArtifact[] {
  const indicatorIds = [...new Set(ORDER_ATLAS_ROUNDS.map((round) => round.indicatorId))];
  return indicatorIds.map((indicatorId) =>
    IndicatorArtifactSchema.parse(
      JSON.parse(fs.readFileSync(path.join(process.cwd(), "public/data/v1/indicators", `${indicatorId}.json`), "utf8"))
    )
  );
}

function playableRoundForRound(
  round: OrderAtlasRound,
  indicator: IndicatorArtifact,
  countryNameByIso3: Map<string, string>
): OrderAtlasPlayableRound {
  const source = deriveOrderAtlasSourceMeta(indicator);
  const countryValues = deriveOrderAtlasCountryValues(round, indicator);
  const countryByIso3 = new Map(countryValues.map((row) => [row.iso3, row.value]));
  const selectedCountries = round.countryIso3.map((iso3) => playableCountry(iso3, countryByIso3.get(iso3), indicator, countryNameByIso3));
  const trueOrder = deriveOrderAtlasTrueOrder(round, indicator).map((iso3) =>
    playableCountry(iso3, countryByIso3.get(iso3), indicator, countryNameByIso3)
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
    scopeNote: round.scopeNote
  };
}

function playableCountry(
  iso3: string,
  value: number | undefined,
  indicator: IndicatorArtifact,
  countryNameByIso3: Map<string, string>
): OrderAtlasPlayableCountry {
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
