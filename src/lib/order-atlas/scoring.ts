export const ORDER_ATLAS_MAX_SCORE = 1000;

export type OrderAtlasScoreInput = {
  submittedIso3: string[];
  trueOrderIso3: string[];
  cluePenalty?: number;
};

export type OrderAtlasScoreBreakdown = {
  totalCountries: number;
  correctPositions: number;
  positionAccuracy: number;
  pointsPerCorrectPlacement: number;
  baseScore: number;
  cluePenalty: number;
  finalScore: number;
};

export function pointsPerOrderAtlasPlacement(countryCount: number): number {
  if (!Number.isInteger(countryCount) || countryCount < 2) {
    throw new Error("Order Atlas scoring requires at least two countries");
  }
  return ORDER_ATLAS_MAX_SCORE / countryCount;
}

export function scoreOrderAtlasOrder(input: OrderAtlasScoreInput): OrderAtlasScoreBreakdown {
  validateComparableOrders(input.submittedIso3, input.trueOrderIso3);

  const totalCountries = input.trueOrderIso3.length;
  let correctPositions = 0;

  for (let index = 0; index < input.submittedIso3.length; index += 1) {
    if (input.submittedIso3[index] === input.trueOrderIso3[index]) {
      correctPositions += 1;
    }
  }

  const positionAccuracy = correctPositions / totalCountries;
  const baseScore = Math.round(ORDER_ATLAS_MAX_SCORE * positionAccuracy);
  const cluePenalty = Math.max(0, Math.trunc(input.cluePenalty ?? 0));
  const finalScore = Math.max(0, Math.min(ORDER_ATLAS_MAX_SCORE, baseScore - cluePenalty));

  return {
    totalCountries,
    correctPositions,
    positionAccuracy,
    pointsPerCorrectPlacement: pointsPerOrderAtlasPlacement(totalCountries),
    baseScore,
    cluePenalty,
    finalScore
  };
}

function validateComparableOrders(submittedIso3: string[], trueOrderIso3: string[]) {
  if (submittedIso3.length !== trueOrderIso3.length) {
    throw new Error("Submitted order must have the same country count as the true order");
  }
  if (new Set(submittedIso3).size !== submittedIso3.length) {
    throw new Error("Submitted order cannot contain duplicate countries");
  }
  if (new Set(trueOrderIso3).size !== trueOrderIso3.length) {
    throw new Error("True order cannot contain duplicate countries");
  }

  const submitted = new Set(submittedIso3);
  for (const iso3 of trueOrderIso3) {
    if (!submitted.has(iso3)) {
      throw new Error("Submitted order must contain the same countries as the true order");
    }
  }
}
