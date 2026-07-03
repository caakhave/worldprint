import type { OrderAtlasIndicatorArtifact } from "@/lib/order-atlas/validation";
import type { OrderAtlasDifficulty, OrderAtlasRound } from "@/lib/order-atlas/schemas";

export const ORDER_ATLAS_ROUND_COUNT = 3;

export const SAMPLE_ORDER_ATLAS_ROUND_IDS = [
  "order-renewable-electricity-grid-mix",
  "order-fertility-rate",
  "order-internet-users"
] as const;

export type OrderAtlasRoundFilters = {
  difficulty?: OrderAtlasDifficulty;
  category?: string;
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

function shuffledRounds(rounds: OrderAtlasRound[], seedText: string): OrderAtlasRound[] {
  const random = mulberry32(hashString(seedText));
  const shuffled = [...rounds];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

export function sampleOrderAtlasRoundIds(rounds: OrderAtlasRound[]): string[] {
  const available = new Set(rounds.map((round) => round.id));
  return SAMPLE_ORDER_ATLAS_ROUND_IDS.filter((id) => available.has(id));
}

export function dailyEligibleOrderAtlasRounds(rounds: OrderAtlasRound[]): OrderAtlasRound[] {
  return rounds.filter((round) => round.eligibility === "daily");
}

export function practiceEligibleOrderAtlasRounds(
  rounds: OrderAtlasRound[],
  filters: OrderAtlasRoundFilters = {},
  indicators: OrderAtlasIndicatorArtifact[] = []
): OrderAtlasRound[] {
  const indicatorById = new Map(indicators.map((indicator) => [indicator.id, indicator]));
  return rounds.filter((round) => {
    const eligible =
      round.eligibility === "practice" ||
      round.eligibility === "daily" ||
      (round.eligibility === "expert-only" && filters.difficulty === "expert");
    if (!eligible) return false;
    if (filters.difficulty && round.difficulty !== filters.difficulty) return false;
    if (filters.category) {
      const indicator = indicatorById.get(round.indicatorId);
      if (indicator?.category !== filters.category) return false;
    }
    return true;
  });
}

export function selectOrderAtlasDailyRoundIds(rounds: OrderAtlasRound[], contentVersion: string, dateKey: string): string[] {
  const eligible = dailyEligibleOrderAtlasRounds(rounds);
  return shuffledRounds(eligible, `order-atlas:daily:${contentVersion}:${dateKey}`)
    .slice(0, Math.min(ORDER_ATLAS_ROUND_COUNT, eligible.length))
    .map((round) => round.id);
}

export function selectOrderAtlasPracticeRoundIds(
  rounds: OrderAtlasRound[],
  contentVersion: string,
  salt: string,
  filters: OrderAtlasRoundFilters = {},
  indicators: OrderAtlasIndicatorArtifact[] = []
): string[] {
  const eligible = practiceEligibleOrderAtlasRounds(rounds, filters, indicators);
  return shuffledRounds(
    eligible,
    `order-atlas:practice:${contentVersion}:${salt}:${filters.category ?? "all"}:${filters.difficulty ?? "all"}`
  )
    .slice(0, Math.min(ORDER_ATLAS_ROUND_COUNT, eligible.length))
    .map((round) => round.id);
}
