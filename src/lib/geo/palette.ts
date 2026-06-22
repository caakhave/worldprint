export type ChoroplethPaletteName =
  | "teal"
  | "rose"
  | "violet"
  | "green"
  | "gold"
  | "orange"
  | "aqua"
  | "electric"
  | "steel"
  | "coral"
  | "indigo";

export type ChoroplethPalette = {
  name: ChoroplethPaletteName;
  label: string;
  colors: readonly [string, string, string, string, string, string, string];
};

export type PaletteIndicator = {
  id?: string;
  shortTitle?: string;
  category?: string;
};

export const MISSING_DATA_FILL = "#123f43";

export const MAP_PALETTES: Record<ChoroplethPaletteName, ChoroplethPalette> = {
  teal: {
    name: "teal",
    label: "Teal",
    colors: ["#d7eadf", "#afdbc9", "#86cab7", "#54c7b4", "#2c958d", "#17656b", "#0a3845"]
  },
  rose: {
    name: "rose",
    label: "Rose",
    colors: ["#fde0df", "#f7b2b7", "#ef7c91", "#d94d73", "#b42d5f", "#7f1d4e", "#4a1238"]
  },
  violet: {
    name: "violet",
    label: "Violet",
    colors: ["#eadffd", "#d0bef8", "#ac91ee", "#8466da", "#5d46b8", "#3f2f86", "#261c55"]
  },
  green: {
    name: "green",
    label: "Green",
    colors: ["#e5f2d2", "#c5e59e", "#9fd169", "#72b943", "#4a9632", "#2f6926", "#1b3f1d"]
  },
  gold: {
    name: "gold",
    label: "Gold",
    colors: ["#f8e6b6", "#efcd79", "#e0ad43", "#c98724", "#996018", "#664018", "#3c2812"]
  },
  orange: {
    name: "orange",
    label: "Orange",
    colors: ["#ffe1b8", "#ffc27a", "#f79a43", "#df6d28", "#ab471e", "#722f1c", "#412018"]
  },
  aqua: {
    name: "aqua",
    label: "Aqua",
    colors: ["#d5f4ee", "#a8e5dd", "#73d2ca", "#3abbbd", "#218a9a", "#155e73", "#0b3548"]
  },
  electric: {
    name: "electric",
    label: "Electric blue",
    colors: ["#ddebff", "#aecdff", "#78acff", "#4f81ff", "#5c57df", "#45329f", "#281d5e"]
  },
  steel: {
    name: "steel",
    label: "Steel",
    colors: ["#e0e9f0", "#b8cad9", "#8daabd", "#63889f", "#486d88", "#314e66", "#1d3246"]
  },
  coral: {
    name: "coral",
    label: "Coral",
    colors: ["#ffe0d2", "#ffb79e", "#ff8870", "#e95f59", "#b94351", "#7c3141", "#472231"]
  },
  indigo: {
    name: "indigo",
    label: "Indigo",
    colors: ["#e1e8ff", "#bdcaff", "#91a2f2", "#6977d8", "#4d55ad", "#373a79", "#222447"]
  }
};

export const CATEGORY_PALETTES: Record<string, ChoroplethPaletteName> = {
  demography: "teal",
  health: "rose",
  settlement: "aqua",
  connectivity: "electric",
  education: "violet",
  energy: "orange",
  environment: "aqua",
  land: "green",
  agriculture: "green",
  labor: "steel",
  economy: "gold",
  development: "indigo"
};

export const CHOROPLETH_COLORS = MAP_PALETTES.teal.colors;

const MIGRATION_TOURISM_PATTERN = /\b(migrant|migration|refugees?|tourism|tourist|travel|visitor)\b/i;

export function paletteNameForIndicator(indicator?: PaletteIndicator | null): ChoroplethPaletteName {
  const topicText = `${indicator?.id ?? ""} ${indicator?.shortTitle ?? ""}`;
  if (MIGRATION_TOURISM_PATTERN.test(topicText)) return "coral";
  const category = indicator?.category?.toLowerCase();
  return (category && CATEGORY_PALETTES[category]) || "teal";
}

export function paletteForIndicator(indicator?: PaletteIndicator | null): ChoroplethPalette {
  return MAP_PALETTES[paletteNameForIndicator(indicator)];
}

export function valueClassColor(index: number, indicator?: PaletteIndicator | null): string {
  const colors = paletteForIndicator(indicator).colors;
  return colors[index] ?? colors[0];
}
