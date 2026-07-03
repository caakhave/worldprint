import { describe, expect, it } from "vitest";
import { PATTERN_ATLAS_CATALOG, PATTERN_ATLAS_RULES } from "@/lib/pattern-atlas/catalog";
import {
  PATTERN_ATLAS_RUN_RULE_COUNT,
  dailyEligiblePatternAtlasRules,
  practiceEligiblePatternAtlasRules,
  selectPatternAtlasDailyRuleIds,
  selectPatternAtlasPracticeRuleIds
} from "@/lib/pattern-atlas/selection";

describe("Pattern Atlas rule selection", () => {
  it("selects three deterministic Daily rules from daily-eligible content", () => {
    const first = selectPatternAtlasDailyRuleIds(PATTERN_ATLAS_RULES, PATTERN_ATLAS_CATALOG.contentVersion, "2026-07-03");
    const second = selectPatternAtlasDailyRuleIds(PATTERN_ATLAS_RULES, PATTERN_ATLAS_CATALOG.contentVersion, "2026-07-03");
    const dailyIds = new Set(dailyEligiblePatternAtlasRules(PATTERN_ATLAS_RULES).map((rule) => rule.id));

    expect(first).toEqual(second);
    expect(first).toHaveLength(PATTERN_ATLAS_RUN_RULE_COUNT);
    expect(new Set(first).size).toBe(first.length);
    expect(first.every((id) => dailyIds.has(id))).toBe(true);
  });

  it("changes Daily selection by date while staying stable for a date", () => {
    const today = selectPatternAtlasDailyRuleIds(PATTERN_ATLAS_RULES, PATTERN_ATLAS_CATALOG.contentVersion, "2026-07-03");
    const tomorrow = selectPatternAtlasDailyRuleIds(PATTERN_ATLAS_RULES, PATTERN_ATLAS_CATALOG.contentVersion, "2026-07-04");

    expect(tomorrow).toHaveLength(PATTERN_ATLAS_RUN_RULE_COUNT);
    expect(tomorrow).not.toEqual(today);
  });

  it("selects Pro practice rules with optional family and difficulty filters", () => {
    const ids = selectPatternAtlasPracticeRuleIds(PATTERN_ATLAS_RULES, PATTERN_ATLAS_CATALOG.contentVersion, "unit-test", {
      family: "organizations",
      difficulty: "standard"
    });
    const rules = ids.map((id) => PATTERN_ATLAS_RULES.find((rule) => rule.id === id));

    expect(ids).toHaveLength(PATTERN_ATLAS_RUN_RULE_COUNT);
    expect(rules.every((rule) => rule?.family === "organizations" && rule.difficulty === "standard")).toBe(true);
  });

  it("returns no Pro practice rules for impossible filters", () => {
    const ids = selectPatternAtlasPracticeRuleIds(PATTERN_ATLAS_RULES, PATTERN_ATLAS_CATALOG.contentVersion, "unit-test", {
      family: "language",
      difficulty: "intro"
    });

    expect(ids).toEqual([]);
  });

  it("keeps expert-only rules out of ordinary Pro practice unless Expert is selected", () => {
    const ordinary = practiceEligiblePatternAtlasRules(PATTERN_ATLAS_RULES, {});
    const expert = practiceEligiblePatternAtlasRules(PATTERN_ATLAS_RULES, { difficulty: "expert" });

    expect(ordinary.some((rule) => rule.eligibility === "expert-only")).toBe(false);
    expect(expert.some((rule) => rule.eligibility === "expert-only")).toBe(true);
  });
});
