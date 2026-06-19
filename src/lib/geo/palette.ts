export const CHOROPLETH_COLORS = ["#d7eadf", "#afdbc9", "#86cab7", "#54c7b4", "#2c958d", "#17656b", "#0a3845"] as const;

export function valueClassColor(index: number): string {
  return CHOROPLETH_COLORS[index] ?? CHOROPLETH_COLORS[0];
}
