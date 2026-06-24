import { describe, expect, it } from "vitest";
import { unitClueForIndicator } from "@/lib/geo/unitClue";

function indicator(unit: string, formatting: { prefix?: string; suffix?: string } = {}) {
  return {
    unit,
    formatting: {
      maximumFractionDigits: 1,
      ...formatting
    }
  };
}

describe("unit clue eligibility", () => {
  it("keeps useful compact unit clues available", () => {
    expect(unitClueForIndicator(indicator("births per 1,000 people", { suffix: " per 1k" }))).toEqual({
      eligible: true,
      text: "per 1k means births per 1,000 people."
    });
    expect(unitClueForIndicator(indicator("cases per 100,000 people", { suffix: " per 100k" })).eligible).toBe(true);
    expect(unitClueForIndicator(indicator("constant 2015 US dollars per worker", { prefix: "$" })).eligible).toBe(true);
  });

  it("hides tautological compact unit clues", () => {
    expect(unitClueForIndicator(indicator("percent of GDP", { suffix: "% of GDP" }))).toEqual({
      eligible: false,
      text: "Unit is already shown."
    });
    expect(unitClueForIndicator(indicator("percent", { suffix: "%" })).eligible).toBe(false);
  });

  it("does not charge for obvious plain units", () => {
    expect(unitClueForIndicator(indicator("years"))).toEqual({
      eligible: false,
      text: "Unit is already shown."
    });
    expect(unitClueForIndicator(indicator("people")).eligible).toBe(false);
    expect(unitClueForIndicator(indicator("births per woman")).eligible).toBe(true);
  });
});
