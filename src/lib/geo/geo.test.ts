import { describe, expect, it } from "vitest";
import { valueClass, legendRanges } from "@/lib/geo/bins";
import { countryNameByIso3 } from "@/lib/geo/format";

describe("map bins", () => {
  it("classifies values and preserves missing values", () => {
    const breaks = [0, 10, 20, 30, 40, 50, 60, 70];
    expect(valueClass(0, breaks)).toBe(0);
    expect(valueClass(35, breaks)).toBe(3);
    expect(valueClass(70, breaks)).toBe(6);
    expect(valueClass(null, breaks)).toBeNull();
    expect(valueClass(Number.NaN, breaks)).toBeNull();
  });

  it("creates legend ranges from breaks", () => {
    expect(legendRanges([0, 10, 20])).toEqual([
      { min: 0, max: 10, index: 0 },
      { min: 10, max: 20, index: 1 }
    ]);
  });
});

describe("country registry helpers", () => {
  it("normalizes country names by ISO3", () => {
    const names = countryNameByIso3([
      { iso3: "MEX", name: "Mexico" },
      { iso3: null, name: "No match" }
    ]);
    expect(names.get("MEX")).toBe("Mexico");
    expect(names.has("No match")).toBe(false);
  });
});

