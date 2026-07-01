import type { IndicatorArtifact } from "@/lib/content/schemas";

type UnitClueIndicator = Pick<IndicatorArtifact, "formatting" | "shortTitle" | "title" | "unit"> &
  Partial<Pick<IndicatorArtifact, "unitClue" | "unitClueUseful">>;

export type UnitClueDecision = {
  eligible: boolean;
  text: string;
};

const ALREADY_SHOWN_TEXT = "Unit is already shown.";
const NOT_USEFUL_TEXT = "No useful unit clue for this map.";
const OBVIOUS_PLAIN_UNITS = new Set(["years", "people", "percent"]);
const STOP_WORDS = new Set([
  "and",
  "are",
  "for",
  "from",
  "international",
  "number",
  "of",
  "per",
  "share",
  "the",
  "total"
]);

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

function significantWords(value: string): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .replace(/%/g, " percent ")
      .replace(/[^a-z0-9]+/g, " ")
      .split(/\s+/)
      .map((word) => word.trim())
      .filter((word) => word.length >= 4 && !STOP_WORDS.has(word))
  );
}

export function isUnitClueUseful(indicator: UnitClueIndicator): boolean {
  if (indicator.unitClueUseful === false || indicator.unitClue === null) return false;
  if (indicator.unitClueUseful === true || (indicator.unitClue?.trim() ?? "")) return true;

  const unit = indicator.unit.trim();
  if (!unit) return false;

  const normalizedUnit = normalizeUnitText(unit);
  if (OBVIOUS_PLAIN_UNITS.has(normalizedUnit)) return false;

  const answerWords = significantWords(`${indicator.shortTitle} ${indicator.title}`);
  const unitWords = significantWords(unit);
  if (!unitWords.size || !answerWords.size) return true;

  const overlappingWords = [...unitWords].filter((word) => answerWords.has(word));
  if (overlappingWords.length === unitWords.size) return false;

  // Short unit phrases that share their main noun with the answer tend to reveal the answer, not the unit.
  if (unitWords.size <= 2 && overlappingWords.some((word) => word.length >= 5)) return false;

  return true;
}

export function unitClueForIndicator(indicator: UnitClueIndicator): UnitClueDecision {
  const marker = compactUnitMarker(indicator);
  const unit = indicator.unit.trim();
  if (!unit) return { eligible: false, text: ALREADY_SHOWN_TEXT };
  if (indicator.unitClueUseful === false || indicator.unitClue === null) return { eligible: false, text: NOT_USEFUL_TEXT };

  const normalizedUnit = normalizeUnitText(unit);
  if (!marker && OBVIOUS_PLAIN_UNITS.has(normalizedUnit)) return { eligible: false, text: ALREADY_SHOWN_TEXT };
  const explicitClue = indicator.unitClue?.trim();
  if (explicitClue) return { eligible: true, text: explicitClue };

  if (marker) {
    const normalizedMarker = normalizeUnitText(marker);
    if (normalizedMarker === normalizedUnit) {
      if (OBVIOUS_PLAIN_UNITS.has(normalizedUnit)) return { eligible: false, text: ALREADY_SHOWN_TEXT };
      return { eligible: true, text: marker };
    }
    return { eligible: true, text: `${marker} means ${unit}.` };
  }

  if (!isUnitClueUseful(indicator)) return { eligible: false, text: NOT_USEFUL_TEXT };
  if (OBVIOUS_PLAIN_UNITS.has(normalizedUnit)) return { eligible: false, text: ALREADY_SHOWN_TEXT };
  return { eligible: true, text: unit };
}
