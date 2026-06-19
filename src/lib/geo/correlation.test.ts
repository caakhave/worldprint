import { describe, expect, it } from "vitest";
import { pairedValues, pearsonCorrelation, rankValues, spearmanCorrelation } from "@/lib/geo/correlation";

describe("correlation utilities", () => {
  it("pairs values over shared countries only", () => {
    expect(pairedValues({ CAN: 2, MEX: 3, USA: 1 }, { MEX: 30, USA: 10 })).toEqual([
      [3, 30],
      [1, 10]
    ]);
  });

  it("computes Pearson correlation", () => {
    expect(pearsonCorrelation([
      [1, 2],
      [2, 4],
      [3, 6]
    ])).toBeCloseTo(1);
    expect(pearsonCorrelation([
      [1, 6],
      [2, 4],
      [3, 2]
    ])).toBeCloseTo(-1);
  });

  it("uses average ranks for Spearman ties", () => {
    expect(rankValues([10, 10, 20, 30])).toEqual([1.5, 1.5, 3, 4]);
  });

  it("computes Spearman rank correlation", () => {
    expect(spearmanCorrelation([
      [10, 100],
      [20, 90],
      [30, 80],
      [40, 70]
    ])).toBeCloseTo(-1);
  });
});
