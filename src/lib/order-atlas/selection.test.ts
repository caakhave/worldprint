import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { IndicatorArtifactSchema } from "@/lib/content/schemas";
import { ORDER_ATLAS_CATALOG, ORDER_ATLAS_ROUNDS } from "@/lib/order-atlas/catalog";
import {
  ORDER_ATLAS_ROUND_COUNT,
  SAMPLE_ORDER_ATLAS_ROUND_IDS,
  dailyEligibleOrderAtlasRounds,
  practiceEligibleOrderAtlasRounds,
  sampleOrderAtlasRoundIds,
  selectOrderAtlasDailyRoundIds,
  selectOrderAtlasPracticeRoundIds
} from "@/lib/order-atlas/selection";
import type { OrderAtlasIndicatorArtifact } from "@/lib/order-atlas/validation";

describe("Order Atlas selection", () => {
  it("returns the fixed sample run when those rounds are available", () => {
    expect(sampleOrderAtlasRoundIds(ORDER_ATLAS_ROUNDS)).toEqual([...SAMPLE_ORDER_ATLAS_ROUND_IDS]);
  });

  it("selects three deterministic Daily rounds from Daily-eligible content", () => {
    const first = selectOrderAtlasDailyRoundIds(ORDER_ATLAS_ROUNDS, ORDER_ATLAS_CATALOG.contentVersion, "2026-07-03");
    const second = selectOrderAtlasDailyRoundIds(ORDER_ATLAS_ROUNDS, ORDER_ATLAS_CATALOG.contentVersion, "2026-07-03");
    const dailyIds = new Set(dailyEligibleOrderAtlasRounds(ORDER_ATLAS_ROUNDS).map((round) => round.id));

    expect(first).toEqual(second);
    expect(first).toHaveLength(ORDER_ATLAS_ROUND_COUNT);
    expect(new Set(first).size).toBe(first.length);
    expect(first.every((id) => dailyIds.has(id))).toBe(true);
  });

  it("changes Daily selection by date while staying stable for a date", () => {
    const today = selectOrderAtlasDailyRoundIds(ORDER_ATLAS_ROUNDS, ORDER_ATLAS_CATALOG.contentVersion, "2026-07-03");
    const tomorrow = selectOrderAtlasDailyRoundIds(ORDER_ATLAS_ROUNDS, ORDER_ATLAS_CATALOG.contentVersion, "2026-07-04");

    expect(tomorrow).toHaveLength(ORDER_ATLAS_ROUND_COUNT);
    expect(tomorrow).not.toEqual(today);
  });

  it("selects practice rounds with optional difficulty and indicator category filters", () => {
    const indicators = loadCatalogIndicatorArtifacts();
    const ids = selectOrderAtlasPracticeRoundIds(ORDER_ATLAS_ROUNDS, ORDER_ATLAS_CATALOG.contentVersion, "unit-test", {
      category: "environment",
      difficulty: "standard"
    }, indicators);
    const rounds = ids.map((id) => ORDER_ATLAS_ROUNDS.find((round) => round.id === id));
    const indicatorById = new Map(indicators.map((indicator) => [indicator.id, indicator]));

    expect(ids).toHaveLength(ORDER_ATLAS_ROUND_COUNT);
    expect(new Set(ids).size).toBe(ids.length);
    expect(rounds.every((round) => round?.difficulty === "standard" && indicatorById.get(round.indicatorId)?.category === "environment")).toBe(true);
  });

  it("returns no practice rules for impossible filters", () => {
    const ids = selectOrderAtlasPracticeRoundIds(ORDER_ATLAS_ROUNDS, ORDER_ATLAS_CATALOG.contentVersion, "unit-test", {
      category: "education",
      difficulty: "expert"
    }, loadCatalogIndicatorArtifacts());

    expect(ids).toEqual([]);
  });

  it("keeps expert-only rounds out of ordinary practice unless Expert is selected", () => {
    const ordinary = practiceEligibleOrderAtlasRounds(ORDER_ATLAS_ROUNDS, {});
    const expert = practiceEligibleOrderAtlasRounds(ORDER_ATLAS_ROUNDS, { difficulty: "expert" });

    expect(ordinary.some((round) => round.eligibility === "expert-only")).toBe(false);
    expect(expert.some((round) => round.eligibility === "expert-only")).toBe(true);
  });
});

function loadCatalogIndicatorArtifacts(): OrderAtlasIndicatorArtifact[] {
  const indicatorIds = [...new Set(ORDER_ATLAS_ROUNDS.map((round) => round.indicatorId))];
  return indicatorIds.map((indicatorId) =>
    IndicatorArtifactSchema.parse(
      JSON.parse(fs.readFileSync(path.join(process.cwd(), "public/data/v1/indicators", `${indicatorId}.json`), "utf8"))
    )
  );
}
