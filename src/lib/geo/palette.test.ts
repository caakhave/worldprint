import { describe, expect, it } from "vitest";
import {
  CATEGORY_PALETTES,
  MAP_PALETTES,
  MISSING_DATA_FILL,
  paletteForIndicator,
  paletteNameForIndicator,
  valueClassColor
} from "@/lib/geo/palette";

describe("topic choropleth palettes", () => {
  it("maps indicator categories to stable topic palettes", () => {
    expect(paletteNameForIndicator({ category: "demography" })).toBe("teal");
    expect(paletteNameForIndicator({ category: "health" })).toBe("rose");
    expect(paletteNameForIndicator({ category: "education" })).toBe("violet");
    expect(paletteNameForIndicator({ category: "agriculture" })).toBe("green");
    expect(paletteNameForIndicator({ category: "economy" })).toBe("gold");
    expect(paletteNameForIndicator({ category: "energy" })).toBe("orange");
    expect(paletteNameForIndicator({ category: "connectivity" })).toBe("electric");
    expect(Object.keys(CATEGORY_PALETTES)).toContain("labor");
  });

  it("uses a stable topic override for migration and tourism indicators", () => {
    expect(paletteNameForIndicator({ id: "tourism-arrivals", category: "economy" })).toBe("coral");
    expect(paletteNameForIndicator({ id: "migrant-stock", category: "demography" })).toBe("coral");
    expect(paletteForIndicator({ shortTitle: "Refugees hosted", category: "demography" }).label).toBe("Coral");
  });

  it("falls back to the default teal palette for unknown categories", () => {
    expect(paletteNameForIndicator({ category: "unknown" })).toBe("teal");
    expect(valueClassColor(6, { category: "unknown" })).toBe(MAP_PALETTES.teal.colors[6]);
  });

  it("keeps missing-data styling anchored to the existing hatch base", () => {
    expect(MISSING_DATA_FILL).toBe("#123f43");
  });
});
