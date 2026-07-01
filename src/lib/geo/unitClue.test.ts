import { describe, expect, it } from "vitest";
import { isUnitClueUseful, unitClueForIndicator } from "@/lib/geo/unitClue";

function indicator(
  unit: string,
  formatting: { prefix?: string; suffix?: string } = {},
  extra: { shortTitle?: string; title?: string; unitClue?: string | null; unitClueUseful?: boolean } = {}
) {
  return {
    shortTitle: extra.shortTitle ?? "Test indicator",
    title: extra.title ?? "Test indicator",
    unit,
    unitClue: extra.unitClue,
    unitClueUseful: extra.unitClueUseful,
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
    expect(unitClueForIndicator(indicator("kg/ha", { suffix: " kg/ha" }))).toEqual({
      eligible: true,
      text: "kg/ha"
    });
    expect(
      unitClueForIndicator(
        indicator("kilograms per hectare", { suffix: " kg/ha" }, { shortTitle: "Cereal yield", title: "Cereal yield (kg per hectare)" })
      )
    ).toEqual({
      eligible: true,
      text: "kg/ha means kilograms per hectare."
    });
    expect(unitClueForIndicator(indicator("cases per 100,000 people", { suffix: " per 100k" })).eligible).toBe(true);
    expect(unitClueForIndicator(indicator("constant 2015 US dollars per worker", { prefix: "$" })).eligible).toBe(true);
  });

  it("keeps compact formatter units available unless the unit is too obvious", () => {
    expect(unitClueForIndicator(indicator("percent of GDP", { suffix: "% of GDP" })).eligible).toBe(true);
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

  it("hides redundant unit clues that would restate the answer", () => {
    const tourism = indicator("international arrivals", {}, { shortTitle: "Tourism arrivals", title: "International tourism, number of arrivals" });

    expect(isUnitClueUseful(tourism)).toBe(false);
    expect(unitClueForIndicator(tourism)).toEqual({
      eligible: false,
      text: "No useful unit clue for this map."
    });
  });

  it("honors explicit unit clue metadata before fallback matching", () => {
    expect(
      unitClueForIndicator(
        indicator("international arrivals", {}, { shortTitle: "Tourism arrivals", unitClue: "Counts inbound visitor arrivals, not travelers." })
      )
    ).toEqual({
      eligible: true,
      text: "Counts inbound visitor arrivals, not travelers."
    });
    expect(unitClueForIndicator(indicator("births per woman", {}, { unitClueUseful: false })).eligible).toBe(false);
  });
});
