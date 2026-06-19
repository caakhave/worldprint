import type { IndicatorArtifact } from "@/lib/content/schemas";

export function formatValue(value: number, indicator: IndicatorArtifact): string {
  const formatter = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: indicator.formatting.maximumFractionDigits,
    minimumFractionDigits: 0
  });
  return `${indicator.formatting.prefix ?? ""}${formatter.format(value)}${indicator.formatting.suffix ?? ""}`;
}

export function countryNameByIso3(entities: Array<{ iso3: string | null; name: string }>): Map<string, string> {
  return new Map(entities.filter((entity) => entity.iso3).map((entity) => [entity.iso3 as string, entity.name]));
}

