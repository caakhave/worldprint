import { describe, expect, it } from "vitest";
import agriculturalWaterWithdrawalsJson from "../../../public/data/v1/indicators/agricultural-water-withdrawals.json";
import childrenShareJson from "../../../public/data/v1/indicators/children-share.json";
import coalElectricityShareJson from "../../../public/data/v1/indicators/coal-electricity-share.json";
import entityRegistryJson from "../../../public/data/v1/entity-registry.json";
import fertilityRateJson from "../../../public/data/v1/indicators/fertility-rate.json";
import forestAreaJson from "../../../public/data/v1/indicators/forest-area.json";
import freshwaterPerCapitaJson from "../../../public/data/v1/indicators/freshwater-per-capita.json";
import hydroElectricityShareJson from "../../../public/data/v1/indicators/hydro-electricity-share.json";
import internetUsersJson from "../../../public/data/v1/indicators/internet-users.json";
import lowElevationLandShareJson from "../../../public/data/v1/indicators/low-elevation-land-share.json";
import manifestJson from "../../../public/data/v1/manifest.json";
import olderAdultsShareJson from "../../../public/data/v1/indicators/older-adults-share.json";
import pm25ExposureJson from "../../../public/data/v1/indicators/pm25-exposure.json";
import renewableElectricityJson from "../../../public/data/v1/indicators/renewable-electricity.json";
import remittancesJson from "../../../public/data/v1/indicators/remittances.json";
import tourismReceiptsShareJson from "../../../public/data/v1/indicators/tourism-receipts-share.json";
import urbanPopulationJson from "../../../public/data/v1/indicators/urban-population.json";
import waterStressJson from "../../../public/data/v1/indicators/water-stress.json";
import { EntityRegistrySchema, IndicatorArtifactSchema, ManifestSchema } from "@/lib/content/schemas";
import { PATTERN_ATLAS_CATALOG, getPatternAtlasRuleById, getPatternAtlasRulesByFamily } from "@/lib/pattern-atlas/catalog";
import { PatternAtlasCatalogSchema, type PatternAtlasCatalog } from "@/lib/pattern-atlas/schemas";
import { deriveIndicatorIso3Set, validatePatternAtlasCatalog } from "@/lib/pattern-atlas/validation";

const entityRegistry = EntityRegistrySchema.parse(entityRegistryJson);
const manifest = ManifestSchema.parse(manifestJson);
const indicatorArtifacts = [
  IndicatorArtifactSchema.parse(renewableElectricityJson),
  IndicatorArtifactSchema.parse(forestAreaJson),
  IndicatorArtifactSchema.parse(pm25ExposureJson),
  IndicatorArtifactSchema.parse(internetUsersJson),
  IndicatorArtifactSchema.parse(waterStressJson),
  IndicatorArtifactSchema.parse(tourismReceiptsShareJson),
  IndicatorArtifactSchema.parse(urbanPopulationJson),
  IndicatorArtifactSchema.parse(fertilityRateJson),
  IndicatorArtifactSchema.parse(childrenShareJson),
  IndicatorArtifactSchema.parse(olderAdultsShareJson),
  IndicatorArtifactSchema.parse(remittancesJson),
  IndicatorArtifactSchema.parse(hydroElectricityShareJson),
  IndicatorArtifactSchema.parse(coalElectricityShareJson),
  IndicatorArtifactSchema.parse(freshwaterPerCapitaJson),
  IndicatorArtifactSchema.parse(lowElevationLandShareJson),
  IndicatorArtifactSchema.parse(agriculturalWaterWithdrawalsJson)
];

describe("Pattern Atlas catalog", () => {
  it("parses the catalog and keeps a balanced inventory", () => {
    const catalog = PatternAtlasCatalogSchema.parse(PATTERN_ATLAS_CATALOG);
    expect(catalog.game).toBe("pattern-atlas");
    expect(catalog.rules).toHaveLength(93);
    expect(catalog.sourceRegistry.length).toBeGreaterThanOrEqual(21);

    expect(countBy(catalog.rules, "family")).toMatchObject({
      language: 10,
      borders: 26,
      physical_geography: 20,
      organizations: 14,
      economy: 7,
      indicators: 16
    });
    expect(countBy(catalog.rules, "difficulty")).toMatchObject({
      intro: 17,
      standard: 51,
      expert: 25
    });
    expect(countBy(catalog.rules, "eligibility")).toMatchObject({
      sample: 5,
      daily: 36,
      practice: 50,
      "expert-only": 2
    });

    expect(getPatternAtlasRulesByFamily("indicators")).toHaveLength(16);
    expect(getPatternAtlasRuleById("countries-bordering-germany")?.includedIso3).toContain("POL");
    expect(getPatternAtlasRuleById("countries-bordering-turkey")?.includedIso3).toEqual([
      "ARM",
      "AZE",
      "BGR",
      "GEO",
      "GRC",
      "IRN",
      "IRQ",
      "SYR"
    ]);
  });

  it("validates rules against the current entity registry and approved indicator artifacts", () => {
    const issues = validatePatternAtlasCatalog(PATTERN_ATLAS_CATALOG, {
      entityRegistry,
      indicators: indicatorArtifacts
    });
    expect(issues).toEqual([]);
  });

  it("keeps indicator-derived rules tied to existing approved Mystery Map data", () => {
    const manifestIndicatorIds = new Set(manifest.indicators.map((indicator) => indicator.id));
    const indicatorById = new Map(indicatorArtifacts.map((indicator) => [indicator.id, indicator]));

    for (const rule of PATTERN_ATLAS_CATALOG.rules.filter((item) => item.indicatorRef)) {
      const indicator = indicatorById.get(rule.indicatorRef!.indicatorId);
      expect(indicator).toBeDefined();
      expect(manifestIndicatorIds.has(rule.indicatorRef!.indicatorId)).toBe(true);
      expect(indicator?.reviewStatus).toBe("approved");
      expect(rule.dateVintage).toBe(String(indicator?.year));
      expect(rule.includedIso3).toEqual(deriveIndicatorIso3Set(indicator!, entityRegistry, rule.indicatorRef!.selection));
    }
  });

  it("rejects duplicate answers before validation", () => {
    const duplicateAnswerCatalog = structuredClone(PATTERN_ATLAS_CATALOG);
    duplicateAnswerCatalog.rules[1].displayAnswer = duplicateAnswerCatalog.rules[0].displayAnswer;
    expect(PatternAtlasCatalogSchema.safeParse(duplicateAnswerCatalog).success).toBe(false);
  });

  it("reports invalid ISO3 values, unapproved small sets, and stale indicator-derived sets", () => {
    const invalidCatalog = structuredClone(PATTERN_ATLAS_CATALOG) as PatternAtlasCatalog;
    invalidCatalog.rules[0].includedIso3 = [...invalidCatalog.rules[0].includedIso3, "ZZZ"];
    invalidCatalog.rules[0].displayAnswer = "Countries where Portuguese is an official language";
    invalidCatalog.rules.find((rule) => rule.id === "landlocked-south-america")!.allowSmallHighlightSet = false;
    const renewableRule = invalidCatalog.rules.find((rule) => rule.id === "top-quartile-renewable-electricity-share")!;
    renewableRule.displayAnswer = "Top quartile for renewable electricity share";
    renewableRule.includedIso3 = ["BRA", "CAN", "USA", "ZAF"];

    const issues = validatePatternAtlasCatalog(invalidCatalog, {
      entityRegistry,
      indicators: indicatorArtifacts
    });

    expect(issues.some((issue) => issue.message.includes("ZZZ"))).toBe(true);
    expect(issues.some((issue) => issue.ruleId === "landlocked-south-america" && issue.message.includes("at least 4"))).toBe(true);
    expect(issues.some((issue) => issue.ruleId === "mapped-portuguese-official-language" && issue.message.includes("mapped-country universe"))).toBe(true);
    expect(issues.some((issue) => issue.ruleId === "top-quartile-renewable-electricity-share" && issue.message.includes("mapped-country universe"))).toBe(true);
    expect(issues.some((issue) => issue.ruleId === "top-quartile-renewable-electricity-share" && issue.message.includes("derived"))).toBe(true);
  });
});

function countBy<T, K extends keyof T>(items: T[], key: K): Record<string, number> {
  return items.reduce<Record<string, number>>((counts, item) => {
    const value = String(item[key]);
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}
