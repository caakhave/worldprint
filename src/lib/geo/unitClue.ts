import type { IndicatorArtifact } from "@/lib/content/schemas";

type UnitClueIndicator = Pick<IndicatorArtifact, "formatting" | "unit">;

export type UnitClueDecision = {
  eligible: boolean;
  text: string;
};

const ALREADY_SHOWN_TEXT = "Unit is already shown.";
const OBVIOUS_PLAIN_UNITS = new Set(["years", "people", "percent"]);

function normalizeUnitText(value: string): string {
  return value
    .toLowerCase()
    .replace(/%/g, "percent")
    .replace(/us\$/g, "us dollars")
    .replace(/u\.s\./g, "us")
    .replace(/100k/g, "100000")
    .replace(/1k/g, "1000")
    .replace(/1m/g, "1000000")
    .replace(/[^a-z0-9]+/g, "");
}

function compactUnitMarker(indicator: UnitClueIndicator): string {
  return [indicator.formatting.prefix, indicator.formatting.suffix].map((part) => part?.trim()).filter(Boolean).join(" ");
}

export function unitClueForIndicator(indicator: UnitClueIndicator): UnitClueDecision {
  const marker = compactUnitMarker(indicator);
  const unit = indicator.unit.trim();
  if (!unit) return { eligible: false, text: ALREADY_SHOWN_TEXT };

  const normalizedUnit = normalizeUnitText(unit);
  if (marker) {
    const normalizedMarker = normalizeUnitText(marker);
    if (normalizedMarker === normalizedUnit) return { eligible: false, text: ALREADY_SHOWN_TEXT };
    return { eligible: true, text: `${marker} means ${unit}.` };
  }

  if (OBVIOUS_PLAIN_UNITS.has(normalizedUnit)) return { eligible: false, text: ALREADY_SHOWN_TEXT };
  return { eligible: true, text: unit };
}
