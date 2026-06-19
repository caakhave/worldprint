import type { IndicatorDifficulty, RoundDefinition } from "@/lib/content/schemas";

const DAILY_ROUND_COUNT = 5;
export const PRACTICE_ROUND_COUNT = 3;

export type PracticeFilters = {
  category?: string;
  difficulty?: IndicatorDifficulty;
};

export function utcDateKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${date.getUTCDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function dateFromKey(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

export function challengeNumber(dateKey: string): number {
  const epoch = Date.UTC(2026, 0, 1);
  const target = dateFromKey(dateKey).getTime();
  return Math.floor((target - epoch) / 86_400_000) + 1;
}

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

function shuffledRounds(rounds: RoundDefinition[], seedText: string): RoundDefinition[] {
  const random = mulberry32(hashString(seedText));
  const shuffled = [...rounds];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

export function dailyEligibleRounds(rounds: RoundDefinition[]): RoundDefinition[] {
  return rounds.filter((round) => round.eligibility.daily && round.editorialStatus !== "needs_review" && round.editorialStatus !== "retired");
}

export function selectRoundIds(rounds: RoundDefinition[], seedText: string, count: number): string[] {
  return shuffledRounds(rounds, seedText)
    .slice(0, Math.min(count, rounds.length))
    .map((round) => round.id);
}

function hasCorrelationConflict(candidate: RoundDefinition, selected: RoundDefinition[]): boolean {
  return selected.some((round) => {
    return (
      candidate.avoidSameDayIndicatorIds.includes(round.correctIndicatorId) ||
      round.avoidSameDayIndicatorIds.includes(candidate.correctIndicatorId)
    );
  });
}

function categoryLimit(rounds: RoundDefinition[], count: number): number {
  const categoryCount = new Set(rounds.map((round) => round.category)).size;
  return categoryCount >= count ? 2 : count;
}

function canAddRound(
  candidate: RoundDefinition,
  selected: RoundDefinition[],
  rounds: RoundDefinition[],
  options: { enforceCategory: boolean; enforceDifficulty: boolean; enforceCorrelation: boolean }
): boolean {
  if (selected.some((round) => round.correctIndicatorId === candidate.correctIndicatorId)) return false;
  if (options.enforceCorrelation && hasCorrelationConflict(candidate, selected)) return false;
  if (options.enforceCategory) {
    const currentCategoryCount = selected.filter((round) => round.category === candidate.category).length;
    if (currentCategoryCount >= categoryLimit(rounds, DAILY_ROUND_COUNT)) return false;
  }
  if (options.enforceDifficulty) {
    const introCount = selected.filter((round) => round.difficulty === "intro").length;
    const expertCount = selected.filter((round) => round.difficulty === "expert").length;
    const enoughNonIntro = rounds.filter((round) => round.difficulty !== "intro").length >= 2;
    const enoughNonExpert = rounds.filter((round) => round.difficulty !== "expert").length >= 2;
    if (candidate.difficulty === "intro" && introCount >= 2 && enoughNonIntro) return false;
    if (candidate.difficulty === "expert" && expertCount >= 2 && enoughNonExpert) return false;
  }
  return true;
}

function addFirstValid(
  selected: RoundDefinition[],
  candidates: RoundDefinition[],
  rounds: RoundDefinition[],
  options: { enforceCategory: boolean; enforceDifficulty: boolean; enforceCorrelation: boolean }
): boolean {
  const next = candidates.find((candidate) => canAddRound(candidate, selected, rounds, options));
  if (!next) return false;
  selected.push(next);
  return true;
}

export function selectDailyRounds(rounds: RoundDefinition[], contentVersion: string, dateKey: string): RoundDefinition[] {
  const eligible = dailyEligibleRounds(rounds);
  const targetCount = Math.min(DAILY_ROUND_COUNT, rounds.length);
  const pool = eligible.length >= targetCount ? eligible : rounds;
  const shuffled = shuffledRounds(pool, `daily:${contentVersion}:${dateKey}`);
  const selected: RoundDefinition[] = [];
  const expertCandidates = shuffled.filter((round) => round.difficulty === "expert");
  if (expertCandidates.length > 0) {
    addFirstValid(selected, expertCandidates, shuffled, {
      enforceCategory: true,
      enforceDifficulty: false,
      enforceCorrelation: true
    });
  }
  const passes = [
    { enforceCategory: true, enforceDifficulty: true, enforceCorrelation: true },
    { enforceCategory: true, enforceDifficulty: false, enforceCorrelation: true },
    { enforceCategory: true, enforceDifficulty: false, enforceCorrelation: false },
    { enforceCategory: false, enforceDifficulty: false, enforceCorrelation: false }
  ];
  for (const options of passes) {
    while (selected.length < Math.min(DAILY_ROUND_COUNT, shuffled.length)) {
      if (!addFirstValid(selected, shuffled, shuffled, options)) break;
    }
    if (selected.length >= Math.min(DAILY_ROUND_COUNT, shuffled.length)) break;
  }
  return selected.slice(0, DAILY_ROUND_COUNT);
}

export function selectDailyRoundIds(rounds: RoundDefinition[], contentVersion: string, dateKey: string): string[] {
  return selectDailyRounds(rounds, contentVersion, dateKey).map((round) => round.id);
}

export function filterPracticeRounds(rounds: RoundDefinition[], filters: PracticeFilters = {}): RoundDefinition[] {
  return rounds.filter((round) => {
    if (!round.eligibility.practice || round.editorialStatus === "needs_review" || round.editorialStatus === "retired") return false;
    if (round.eligibility.expertOnly && filters.difficulty !== "expert") return false;
    const categoryMatches = !filters.category || round.category === filters.category;
    const difficultyMatches = !filters.difficulty || round.difficulty === filters.difficulty;
    return categoryMatches && difficultyMatches;
  });
}

export function selectPracticeRoundIds(
  rounds: RoundDefinition[],
  contentVersion: string,
  salt = "starter",
  filters: PracticeFilters = {},
  previousIds: string[] = []
): string[] {
  const filtered = filterPracticeRounds(rounds, filters);
  const previousKey = previousIds.join("|");
  const canReroll = filtered.length > PRACTICE_ROUND_COUNT && previousIds.length > 0;
  for (let attempt = 0; attempt < (canReroll ? 12 : 1); attempt += 1) {
    const attemptSalt = attempt === 0 ? salt : `${salt}:attempt-${attempt}`;
    const ids = selectRoundIds(
      filtered,
      `practice:${contentVersion}:${attemptSalt}:${filters.category ?? "all"}:${filters.difficulty ?? "all"}`,
      PRACTICE_ROUND_COUNT
    );
    if (!canReroll || ids.join("|") !== previousKey) return ids;
  }
  return selectRoundIds(filtered, `practice:${contentVersion}:${salt}:fallback`, PRACTICE_ROUND_COUNT);
}
