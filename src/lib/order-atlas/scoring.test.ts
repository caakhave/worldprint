import { describe, expect, it } from "vitest";
import { ORDER_ATLAS_MAX_SCORE, pointsPerOrderAtlasPlacement, scoreOrderAtlasOrder } from "@/lib/order-atlas/scoring";

describe("Order Atlas scoring", () => {
  it("scores a perfect exact-placement order as 1000", () => {
    const score = scoreOrderAtlasOrder({
      submittedIso3: ["NOR", "BRA", "CAN", "IND", "ZAF"],
      trueOrderIso3: ["NOR", "BRA", "CAN", "IND", "ZAF"]
    });

    expect(score.totalCountries).toBe(5);
    expect(score.correctPositions).toBe(5);
    expect(score.baseScore).toBe(ORDER_ATLAS_MAX_SCORE);
    expect(score.finalScore).toBe(ORDER_ATLAS_MAX_SCORE);
  });

  it("scores zero exact placements as 0", () => {
    const score = scoreOrderAtlasOrder({
      submittedIso3: ["BRA", "CAN", "IND", "ZAF", "NOR"],
      trueOrderIso3: ["NOR", "BRA", "CAN", "IND", "ZAF"]
    });

    expect(score.correctPositions).toBe(0);
    expect(score.finalScore).toBe(0);
  });

  it("gives 200 points per exact placement in a 5-card round", () => {
    const score = scoreOrderAtlasOrder({
      submittedIso3: ["NOR", "CAN", "BRA", "IND", "ZAF"],
      trueOrderIso3: ["NOR", "BRA", "CAN", "IND", "ZAF"]
    });

    expect(score.totalCountries).toBe(5);
    expect(score.correctPositions).toBe(3);
    expect(score.pointsPerCorrectPlacement).toBe(200);
    expect(score.baseScore).toBe(600);
    expect(score.finalScore).toBe(600);
  });

  it("applies clue penalties without dropping below zero", () => {
    const score = scoreOrderAtlasOrder({
      submittedIso3: ["NOR", "BRA", "CAN", "IND", "ZAF"],
      trueOrderIso3: ["NOR", "BRA", "CAN", "IND", "ZAF"],
      cluePenalty: 250
    });
    const inverted = scoreOrderAtlasOrder({
      submittedIso3: ["BRA", "CAN", "IND", "ZAF", "NOR"],
      trueOrderIso3: ["NOR", "BRA", "CAN", "IND", "ZAF"],
      cluePenalty: 250
    });

    expect(score.finalScore).toBe(750);
    expect(inverted.finalScore).toBe(0);
  });

  it("rejects orders with mismatched or duplicate country sets", () => {
    expect(() =>
      scoreOrderAtlasOrder({
        submittedIso3: ["NOR", "BRA", "CAN"],
        trueOrderIso3: ["NOR", "BRA", "CAN", "IND"]
      })
    ).toThrow("same country count");
    expect(() =>
      scoreOrderAtlasOrder({
        submittedIso3: ["NOR", "BRA", "BRA", "IND"],
        trueOrderIso3: ["NOR", "BRA", "CAN", "IND"]
      })
    ).toThrow("duplicate countries");
    expect(() => pointsPerOrderAtlasPlacement(1)).toThrow("at least two countries");
  });
});
