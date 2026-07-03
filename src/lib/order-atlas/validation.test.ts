import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import entityRegistryJson from "../../../public/data/v1/entity-registry.json";
import { EntityRegistrySchema, IndicatorArtifactSchema } from "@/lib/content/schemas";
import { ORDER_ATLAS_CATALOG, getOrderAtlasRoundById } from "@/lib/order-atlas/catalog";
import type { OrderAtlasCatalog } from "@/lib/order-atlas/schemas";
import {
  deriveOrderAtlasSourceMeta,
  deriveOrderAtlasTrueOrder,
  validateOrderAtlasCatalog,
  type OrderAtlasIndicatorArtifact
} from "@/lib/order-atlas/validation";

const entityRegistry = EntityRegistrySchema.parse(entityRegistryJson);

describe("Order Atlas catalog validation", () => {
  it("derives deterministic true order for descending and ascending rounds", () => {
    const renewable = getOrderAtlasRoundById("order-renewable-electricity-grid-mix");
    const pm25 = getOrderAtlasRoundById("order-pm25-air-pollution");

    expect(renewable).toBeDefined();
    expect(pm25).toBeDefined();
    expect(deriveOrderAtlasTrueOrder(renewable!, loadIndicatorArtifact("renewable-electricity"))).toEqual(["NOR", "BRA", "CAN", "IND", "ZAF"]);
    expect(deriveOrderAtlasTrueOrder(pm25!, loadIndicatorArtifact("pm25-exposure"))).toEqual(["CAN", "BRA", "ZAF", "CHN", "IND"]);
  });

  it("derives renderable unit, year, source label, and source URL from Mystery Map indicator artifacts", () => {
    const meta = deriveOrderAtlasSourceMeta(loadIndicatorArtifact("renewable-electricity"));

    expect(meta.unit).toBe("percent of total electricity output");
    expect(meta.year).toBe(2021);
    expect(meta.sourceLabel).toContain("World Bank");
    expect(meta.sourceUrl).toMatch(/^https:\/\//);
  });

  it("reports invalid country ids and missing indicator value coverage", () => {
    const invalidCatalog = structuredClone(ORDER_ATLAS_CATALOG) as OrderAtlasCatalog;
    invalidCatalog.rounds[0].countryIso3 = ["NOR", "BRA", "CAN", "ZZZ"];

    const issues = validateOrderAtlasCatalog(invalidCatalog, {
      entityRegistry,
      indicators: loadCatalogIndicatorArtifacts(invalidCatalog)
    });

    expect(issues.some((issue) => issue.message.includes("ZZZ is not in the entity registry"))).toBe(true);
    expect(issues.some((issue) => issue.message.includes("ZZZ does not have numeric coverage"))).toBe(true);
  });

  it("rejects exact ties unless explicitly allowed", () => {
    const tiedCatalog = structuredClone(ORDER_ATLAS_CATALOG) as OrderAtlasCatalog;
    tiedCatalog.rounds[0] = {
      ...tiedCatalog.rounds[0],
      indicatorId: "electricity-access",
      countryIso3: ["CAN", "USA", "JPN", "BRA"],
      eligibility: "daily",
      allowExactTies: false
    };

    const tiedIssues = validateOrderAtlasCatalog(tiedCatalog, {
      entityRegistry,
      indicators: loadCatalogIndicatorArtifacts(tiedCatalog)
    });
    expect(tiedIssues.some((issue) => issue.message.includes("exactly tied"))).toBe(true);

    tiedCatalog.rounds[0].allowExactTies = true;
    const allowedIssues = validateOrderAtlasCatalog(tiedCatalog, {
      entityRegistry,
      indicators: loadCatalogIndicatorArtifacts(tiedCatalog)
    });
    expect(allowedIssues.some((issue) => issue.message.includes("exactly tied"))).toBe(false);
  });

  it("rejects unfair near-ties using the explicit range threshold", () => {
    const nearTieCatalog = structuredClone(ORDER_ATLAS_CATALOG) as OrderAtlasCatalog;
    nearTieCatalog.rounds[0] = {
      ...nearTieCatalog.rounds[0],
      indicatorId: "co2-per-capita",
      countryIso3: ["QAT", "USA", "CHN", "BRA", "IND"],
      eligibility: "practice",
      allowNearTies: false
    };

    const issues = validateOrderAtlasCatalog(nearTieCatalog, {
      entityRegistry,
      indicators: loadCatalogIndicatorArtifacts(nearTieCatalog)
    });

    expect(issues.some((issue) => issue.message.includes("too close"))).toBe(true);
    expect(issues.some((issue) => issue.message.includes("1.0% of the selected range"))).toBe(true);
  });
});

function loadCatalogIndicatorArtifacts(catalog: OrderAtlasCatalog): OrderAtlasIndicatorArtifact[] {
  const indicatorIds = [...new Set(catalog.rounds.map((round) => round.indicatorId))];
  return indicatorIds.map(loadIndicatorArtifact);
}

function loadIndicatorArtifact(indicatorId: string): OrderAtlasIndicatorArtifact {
  return IndicatorArtifactSchema.parse(
    JSON.parse(fs.readFileSync(path.join(process.cwd(), "public/data/v1/indicators", `${indicatorId}.json`), "utf8"))
  );
}
