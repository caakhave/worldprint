import type { PatternAtlasDifficulty, PatternAtlasFamily, PatternAtlasRule } from "@/lib/pattern-atlas/schemas";

export const PATTERN_ATLAS_RUN_RULE_COUNT = 3;

export type PatternAtlasRuleFilters = {
  family?: PatternAtlasFamily;
  difficulty?: PatternAtlasDifficulty;
};

function hashString(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  return () => {
    seed += 0x6d2b79f5;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffledRules(rules: PatternAtlasRule[], seedText: string): PatternAtlasRule[] {
  const random = mulberry32(hashString(seedText));
  const shuffled = [...rules];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

export function dailyEligiblePatternAtlasRules(rules: PatternAtlasRule[]): PatternAtlasRule[] {
  return rules.filter((rule) => rule.eligibility === "daily");
}

export function practiceEligiblePatternAtlasRules(rules: PatternAtlasRule[], filters: PatternAtlasRuleFilters = {}): PatternAtlasRule[] {
  return rules.filter((rule) => {
    const eligible =
      rule.eligibility === "practice" ||
      rule.eligibility === "daily" ||
      (rule.eligibility === "expert-only" && filters.difficulty === "expert");
    if (!eligible) return false;
    if (filters.family && rule.family !== filters.family) return false;
    if (filters.difficulty && rule.difficulty !== filters.difficulty) return false;
    return true;
  });
}

export function selectPatternAtlasDailyRuleIds(rules: PatternAtlasRule[], contentVersion: string, dateKey: string): string[] {
  const eligible = dailyEligiblePatternAtlasRules(rules);
  return shuffledRules(eligible, `pattern-atlas:daily:${contentVersion}:${dateKey}`)
    .slice(0, Math.min(PATTERN_ATLAS_RUN_RULE_COUNT, eligible.length))
    .map((rule) => rule.id);
}

export function selectPatternAtlasPracticeRuleIds(
  rules: PatternAtlasRule[],
  contentVersion: string,
  salt: string,
  filters: PatternAtlasRuleFilters = {}
): string[] {
  const eligible = practiceEligiblePatternAtlasRules(rules, filters);
  return shuffledRules(
    eligible,
    `pattern-atlas:practice:${contentVersion}:${salt}:${filters.family ?? "all"}:${filters.difficulty ?? "all"}`
  )
    .slice(0, Math.min(PATTERN_ATLAS_RUN_RULE_COUNT, eligible.length))
    .map((rule) => rule.id);
}
