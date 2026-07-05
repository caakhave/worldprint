import { getPatternAtlasRuleById } from "@/lib/pattern-atlas/catalog";
import type { PatternAtlasRule } from "@/lib/pattern-atlas/schemas";

export const PATTERN_ATLAS_SAMPLE_RULE_IDS = [
  "landlocked-south-america",
  "mapped-asean-members",
  "central-asia-countries"
] as const;

export function getPatternAtlasSampleRules(): PatternAtlasRule[] {
  return PATTERN_ATLAS_SAMPLE_RULE_IDS.map((id) => {
    const rule = getPatternAtlasRuleById(id);
    if (!rule) throw new Error(`Missing Pattern Atlas sample rule: ${id}`);
    return rule;
  });
}
