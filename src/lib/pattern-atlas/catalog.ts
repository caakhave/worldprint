import rulesJson from "../../../content/pattern-atlas/rules.json";
import { PatternAtlasCatalogSchema, type PatternAtlasCatalog, type PatternAtlasFamily, type PatternAtlasRule } from "@/lib/pattern-atlas/schemas";

export const PATTERN_ATLAS_CATALOG: PatternAtlasCatalog = PatternAtlasCatalogSchema.parse(rulesJson);
export const PATTERN_ATLAS_RULES: PatternAtlasRule[] = PATTERN_ATLAS_CATALOG.rules;

export function getPatternAtlasRules(): PatternAtlasRule[] {
  return PATTERN_ATLAS_RULES;
}

export function getPatternAtlasRuleById(id: string): PatternAtlasRule | undefined {
  return PATTERN_ATLAS_RULES.find((rule) => rule.id === id);
}

export function getPatternAtlasRulesByFamily(family: PatternAtlasFamily): PatternAtlasRule[] {
  return PATTERN_ATLAS_RULES.filter((rule) => rule.family === family);
}
