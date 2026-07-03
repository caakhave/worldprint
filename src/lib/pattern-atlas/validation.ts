import type { EntityRegistry, IndicatorArtifact } from "@/lib/content/schemas";
import type { PatternAtlasCatalog, PatternAtlasIndicatorSelection, PatternAtlasRule } from "@/lib/pattern-atlas/schemas";
import { normalizeAnswer } from "@/lib/pattern-atlas/schemas";

const MIN_HIGHLIGHTED_COUNTRIES = 4;
const MAX_HIGHLIGHTED_COUNTRIES = 45;

export type PatternAtlasIndicatorArtifact = Pick<IndicatorArtifact, "id" | "reviewStatus" | "year" | "valuesByIso3">;

export type PatternAtlasValidationContext = {
  entityRegistry: EntityRegistry;
  indicators?: PatternAtlasIndicatorArtifact[];
};

export type PatternAtlasValidationIssue = {
  ruleId?: string;
  path: string;
  message: string;
};

export function validatePatternAtlasCatalog(catalog: PatternAtlasCatalog, context: PatternAtlasValidationContext): PatternAtlasValidationIssue[] {
  const issues: PatternAtlasValidationIssue[] = [];
  const entityIso3 = iso3SetFromEntityRegistry(context.entityRegistry);
  const indicatorById = new Map((context.indicators ?? []).map((indicator) => [indicator.id, indicator]));
  const sourceIds = new Set(catalog.sourceRegistry.map((source) => source.id));
  const ruleIds = new Set<string>();
  const displayAnswers = new Set<string>();

  for (const rule of catalog.rules) {
    validateRule(rule, { entityRegistry: context.entityRegistry, entityIso3, indicatorById, sourceIds, ruleIds, displayAnswers, issues });
  }

  return issues;
}

export function deriveIndicatorIso3Set(
  indicator: PatternAtlasIndicatorArtifact,
  entityRegistry: EntityRegistry,
  selection: PatternAtlasIndicatorSelection
): string[] {
  const entityIso3 = iso3SetFromEntityRegistry(entityRegistry);
  const values = Object.entries(indicator.valuesByIso3)
    .filter((entry): entry is [string, number] => entityIso3.has(entry[0]) && Number.isFinite(entry[1]))
    .map(([iso3, value]) => ({ iso3, value }));

  const selectedCount = Math.ceil(values.length * 0.25);
  const sorted = values.sort((left, right) => {
    const valueSort = selection === "top_quartile" ? right.value - left.value : left.value - right.value;
    return valueSort || left.iso3.localeCompare(right.iso3);
  });

  return sorted.slice(0, selectedCount).map((row) => row.iso3);
}

export function iso3SetFromEntityRegistry(entityRegistry: EntityRegistry): Set<string> {
  return new Set(entityRegistry.entities.map((entity) => entity.iso3).filter((iso3): iso3 is string => Boolean(iso3)));
}

function validateRule(
  rule: PatternAtlasRule,
  context: {
    entityIso3: Set<string>;
    entityRegistry: EntityRegistry;
    indicatorById: Map<string, PatternAtlasIndicatorArtifact>;
    sourceIds: Set<string>;
    ruleIds: Set<string>;
    displayAnswers: Set<string>;
    issues: PatternAtlasValidationIssue[];
  }
) {
  if (context.ruleIds.has(rule.id)) {
    addIssue(context.issues, rule.id, "id", "rule ids must be unique");
  }
  context.ruleIds.add(rule.id);

  const normalizedAnswer = normalizeAnswer(rule.displayAnswer);
  if (context.displayAnswers.has(normalizedAnswer)) {
    addIssue(context.issues, rule.id, "displayAnswer", "display answers must be unique");
  }
  context.displayAnswers.add(normalizedAnswer);

  const included = new Set(rule.includedIso3);
  if (included.size !== rule.includedIso3.length) {
    addIssue(context.issues, rule.id, "includedIso3", "includedIso3 values must be unique");
  }
  for (const iso3 of rule.includedIso3) {
    if (!context.entityIso3.has(iso3)) {
      addIssue(context.issues, rule.id, "includedIso3", `${iso3} is not in the entity registry`);
    }
  }

  if (rule.includedIso3.length < MIN_HIGHLIGHTED_COUNTRIES && !rule.allowSmallHighlightSet) {
    addIssue(context.issues, rule.id, "includedIso3", `highlighted country count should be at least ${MIN_HIGHLIGHTED_COUNTRIES} unless allowed`);
  }
  if (rule.includedIso3.length > MAX_HIGHLIGHTED_COUNTRIES && !rule.allowLargeHighlightSet) {
    addIssue(context.issues, rule.id, "includedIso3", `highlighted country count should be at most ${MAX_HIGHLIGHTED_COUNTRIES} unless allowed`);
  }

  const counterexamples = new Set(rule.counterexampleIso3);
  if (counterexamples.size !== rule.counterexampleIso3.length) {
    addIssue(context.issues, rule.id, "counterexampleIso3", "counterexampleIso3 values must be unique");
  }
  for (const iso3 of rule.counterexampleIso3) {
    if (!context.entityIso3.has(iso3)) {
      addIssue(context.issues, rule.id, "counterexampleIso3", `${iso3} is not in the entity registry`);
    }
    if (included.has(iso3)) {
      addIssue(context.issues, rule.id, "counterexampleIso3", `${iso3} cannot be both included and a counterexample`);
    }
  }

  const decoys = new Set<string>();
  for (const decoy of rule.decoys) {
    const normalizedDecoy = normalizeAnswer(decoy.displayAnswer);
    if (normalizedDecoy === normalizedAnswer) {
      addIssue(context.issues, rule.id, "decoys", "decoys must not duplicate the correct answer");
    }
    if (decoys.has(normalizedDecoy)) {
      addIssue(context.issues, rule.id, "decoys", "decoy display answers must be unique");
    }
    decoys.add(normalizedDecoy);
  }

  for (const sourceId of rule.sources) {
    if (!context.sourceIds.has(sourceId)) {
      addIssue(context.issues, rule.id, "sources", `${sourceId} is not in the source registry`);
    }
  }

  if (rule.scopeNote && describesMappedUniverseConstraint(rule.scopeNote) && !identifiesMappedUniverse(rule.displayAnswer)) {
    addIssue(context.issues, rule.id, "displayAnswer", "scope-sensitive rules must identify the mapped-country universe");
  }

  if (rule.family === "indicators") {
    validateIndicatorRule(rule, context);
  } else if (rule.indicatorRef) {
    addIssue(context.issues, rule.id, "indicatorRef", "non-indicator rules should not reference indicator data");
  }
}

function validateIndicatorRule(
  rule: PatternAtlasRule,
  context: {
    indicatorById: Map<string, PatternAtlasIndicatorArtifact>;
    entityRegistry: EntityRegistry;
    issues: PatternAtlasValidationIssue[];
  }
) {
  if (!rule.indicatorRef) {
    addIssue(context.issues, rule.id, "indicatorRef", "indicator rules must reference an approved Mystery Map indicator");
    return;
  }

  const indicator = context.indicatorById.get(rule.indicatorRef.indicatorId);
  if (!indicator) {
    addIssue(context.issues, rule.id, "indicatorRef", `${rule.indicatorRef.indicatorId} is not available in provided indicator artifacts`);
    return;
  }
  if (indicator.reviewStatus !== "approved") {
    addIssue(context.issues, rule.id, "indicatorRef", `${indicator.id} is not an approved Mystery Map indicator`);
  }
  if (rule.indicatorRef.year !== undefined && rule.indicatorRef.year !== indicator.year) {
    addIssue(context.issues, rule.id, "indicatorRef", `${indicator.id} year ${indicator.year} does not match rule vintage ${rule.indicatorRef.year}`);
  }
  if (!identifiesMappedUniverse(rule.displayAnswer)) {
    addIssue(context.issues, rule.id, "displayAnswer", "indicator-derived display answers must identify the mapped-country universe");
  }

  const derived = deriveIndicatorIso3Set(indicator, context.entityRegistry, rule.indicatorRef.selection);
  if (!sameOrderedValues(rule.includedIso3, derived)) {
    addIssue(context.issues, rule.id, "includedIso3", `${rule.id} does not match the ${rule.indicatorRef.selection} derived from ${indicator.id}`);
  }
}

function sameOrderedValues(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function describesMappedUniverseConstraint(value: string): boolean {
  const normalized = normalizeAnswer(value);
  return normalized.includes("not present") || normalized.includes("omitted") || normalized.includes("entity registry");
}

function identifiesMappedUniverse(value: string): boolean {
  const normalized = normalizeAnswer(value);
  return normalized.includes("mapped") || normalized.includes("current entity registry");
}

function addIssue(issues: PatternAtlasValidationIssue[], ruleId: string | undefined, path: string, message: string) {
  issues.push({ ruleId, path, message });
}
