import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import entityRegistryJson from "../../../public/data/v1/entity-registry.json";
import roundsJson from "../../../content/order-atlas/rounds.json";
import { EntityRegistrySchema, IndicatorArtifactSchema } from "@/lib/content/schemas";
import { ORDER_ATLAS_CATALOG, ORDER_ATLAS_ROUNDS, getOrderAtlasRoundById, getOrderAtlasRoundsByIndicatorId } from "@/lib/order-atlas/catalog";
import { OrderAtlasCatalogSchema, type OrderAtlasCatalog } from "@/lib/order-atlas/schemas";
import { validateOrderAtlasCatalog } from "@/lib/order-atlas/validation";

const entityRegistry = EntityRegistrySchema.parse(entityRegistryJson);

describe("Order Atlas catalog", () => {
  it("parses the catalog and keeps the inventory balanced", () => {
    const catalog = OrderAtlasCatalogSchema.parse(ORDER_ATLAS_CATALOG);

    expect(catalog.game).toBe("order-atlas");
    expect(catalog.rounds).toHaveLength(80);
    expect(countBy(catalog.rounds, "difficulty")).toMatchObject({
      intro: 18,
      standard: 45,
      expert: 17
    });
    expect(countBy(catalog.rounds, "eligibility")).toMatchObject({
      sample: 3,
      daily: 36,
      practice: 32,
      "expert-only": 9
    });

    expect(getOrderAtlasRoundById("order-renewable-electricity-grid-mix")?.indicatorId).toBe("renewable-electricity");
    expect(getOrderAtlasRoundsByIndicatorId("internet-users")).toHaveLength(1);
    expect(ORDER_ATLAS_ROUNDS.every((round) => round.sourceMode === "mystery-map-indicator")).toBe(true);
    expect(ORDER_ATLAS_ROUNDS.every((round) => round.prompt.includes(round.highlightText))).toBe(true);
  });

  it("does not manually store copied indicator values in Order Atlas content", () => {
    for (const round of roundsJson.rounds) {
      expect(round).not.toHaveProperty("values");
      expect(round).not.toHaveProperty("valuesByIso3");
      expect(round).not.toHaveProperty("trueOrderIso3");
    }

    const copiedValuesCatalog = structuredClone(roundsJson);
    (copiedValuesCatalog.rounds[0] as unknown as { values: Record<string, number> }).values = { NOR: 99.1 };

    expect(OrderAtlasCatalogSchema.safeParse(copiedValuesCatalog).success).toBe(false);
  });

  it("validates every starter round against current entity and indicator artifacts", () => {
    const indicators = loadCatalogIndicatorArtifacts(ORDER_ATLAS_CATALOG);
    const issues = validateOrderAtlasCatalog(ORDER_ATLAS_CATALOG, { entityRegistry, indicators });

    expect(issues).toEqual([]);
  });

  it("rejects duplicate round ids before catalog validation", () => {
    const duplicateCatalog = structuredClone(ORDER_ATLAS_CATALOG) as OrderAtlasCatalog;
    duplicateCatalog.rounds[1].id = duplicateCatalog.rounds[0].id;

    expect(OrderAtlasCatalogSchema.safeParse(duplicateCatalog).success).toBe(false);
  });

  it("requires the challenge highlight text to appear exactly once in the prompt", () => {
    const missingHighlightCatalog = structuredClone(ORDER_ATLAS_CATALOG) as OrderAtlasCatalog;
    missingHighlightCatalog.rounds[0].highlightText = "not in this prompt";

    expect(OrderAtlasCatalogSchema.safeParse(missingHighlightCatalog).success).toBe(false);

    const repeatedHighlightCatalog = structuredClone(ORDER_ATLAS_CATALOG) as OrderAtlasCatalog;
    repeatedHighlightCatalog.rounds[0].prompt = `${repeatedHighlightCatalog.rounds[0].prompt} ${repeatedHighlightCatalog.rounds[0].highlightText}`;

    expect(OrderAtlasCatalogSchema.safeParse(repeatedHighlightCatalog).success).toBe(false);
  });
});

function loadCatalogIndicatorArtifacts(catalog: OrderAtlasCatalog) {
  const indicatorIds = [...new Set(catalog.rounds.map((round) => round.indicatorId))];
  return indicatorIds.map((indicatorId) =>
    IndicatorArtifactSchema.parse(
      JSON.parse(fs.readFileSync(path.join(process.cwd(), "public/data/v1/indicators", `${indicatorId}.json`), "utf8"))
    )
  );
}

function countBy<T, K extends keyof T>(items: T[], key: K): Record<string, number> {
  return items.reduce<Record<string, number>>((counts, item) => {
    const value = String(item[key]);
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}
