export type PairedValue = readonly [number, number];

export function pairedValues(left: Record<string, number>, right: Record<string, number>): PairedValue[] {
  return Object.keys(left)
    .filter((iso3) => Number.isFinite(left[iso3]) && Number.isFinite(right[iso3]))
    .sort()
    .map((iso3) => [left[iso3], right[iso3]] as const);
}

export function pearsonCorrelation(pairs: PairedValue[]): number | null {
  if (pairs.length < 3) return null;
  const xs = pairs.map((pair) => pair[0]);
  const ys = pairs.map((pair) => pair[1]);
  const xMean = mean(xs);
  const yMean = mean(ys);
  const numerator = pairs.reduce((sum, [x, y]) => sum + (x - xMean) * (y - yMean), 0);
  const xDenominator = Math.sqrt(xs.reduce((sum, x) => sum + (x - xMean) ** 2, 0));
  const yDenominator = Math.sqrt(ys.reduce((sum, y) => sum + (y - yMean) ** 2, 0));
  if (xDenominator === 0 || yDenominator === 0) return null;
  return numerator / (xDenominator * yDenominator);
}

export function rankValues(values: number[]): number[] {
  const ordered = values
    .map((value, index) => ({ value, index }))
    .sort((left, right) => left.value - right.value);
  const ranks = Array.from({ length: values.length }, () => 0);
  let cursor = 0;
  while (cursor < ordered.length) {
    let end = cursor;
    while (end + 1 < ordered.length && ordered[end + 1].value === ordered[cursor].value) {
      end += 1;
    }
    const averageRank = (cursor + end) / 2 + 1;
    for (let index = cursor; index <= end; index += 1) {
      ranks[ordered[index].index] = averageRank;
    }
    cursor = end + 1;
  }
  return ranks;
}

export function spearmanCorrelation(pairs: PairedValue[]): number | null {
  if (pairs.length < 3) return null;
  const xRanks = rankValues(pairs.map((pair) => pair[0]));
  const yRanks = rankValues(pairs.map((pair) => pair[1]));
  return pearsonCorrelation(xRanks.map((rank, index) => [rank, yRanks[index]] as const));
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
