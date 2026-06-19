export function valueClass(value: number | null | undefined, breaks: number[]): number | null {
  if (value === null || value === undefined || !Number.isFinite(value) || breaks.length < 2) {
    return null;
  }
  for (let index = 0; index < breaks.length - 1; index += 1) {
    const lower = breaks[index];
    const upper = breaks[index + 1];
    if (value >= lower && value <= upper) {
      return index;
    }
  }
  return value >= breaks[breaks.length - 1] ? breaks.length - 2 : 0;
}

export function legendRanges(breaks: number[]): Array<{ min: number; max: number; index: number }> {
  return breaks.slice(0, -1).map((min, index) => ({ min, max: breaks[index + 1], index }));
}

