import type { RoundDefinition } from "@/lib/content/schemas";
import { selectRoundIds } from "@/lib/game/daily";
import type { CompletionHistory } from "@/lib/persistence/storage";

export const SAMPLE_RUN_ROUND_COUNT = 5;
export const FREE_DAILY_ROUND_COUNT = 3;
export const PRO_ATLAS_ROUND_COUNT = 5;

export const SAMPLE_RUN_ROUND_IDS = [
  "worldprint-cereal-yield",
  "worldprint-rural-population-growth",
  "worldprint-measles-immunization",
  "worldprint-migrant-stock",
  "worldprint-pm25-exposure"
] as const;

export function sampleRunRoundIds(rounds: RoundDefinition[]): string[] {
  const available = new Set(rounds.map((round) => round.id));
  return SAMPLE_RUN_ROUND_IDS.filter((id) => available.has(id));
}

export function freeDailyRoundIds(dailyRoundIds: string[]): string[] {
  return dailyRoundIds.slice(0, FREE_DAILY_ROUND_COUNT);
}

export function atlasEligibleRounds(rounds: RoundDefinition[]): RoundDefinition[] {
  return rounds.filter((round) => {
    const playable = round.eligibility.daily || round.eligibility.practice || round.eligibility.challenge;
    return playable && round.editorialStatus !== "needs_review" && round.editorialStatus !== "retired";
  });
}

export function atlasSeenRoundIds(histories: CompletionHistory[]): Set<string> {
  return new Set(
    histories.flatMap((history) => history.roundDetails?.map((detail) => detail.roundId) ?? [])
  );
}

export function selectAtlasRoundIds(input: {
  rounds: RoundDefinition[];
  contentVersion: string;
  salt: string;
  seenRoundIds?: Set<string>;
}): { roundIds: string[]; reshuffled: boolean } {
  const eligible = atlasEligibleRounds(input.rounds);
  const seen = input.seenRoundIds ?? new Set<string>();
  const unseen = eligible.filter((round) => !seen.has(round.id));
  const pool = unseen.length >= Math.min(PRO_ATLAS_ROUND_COUNT, eligible.length) ? unseen : eligible;
  return {
    roundIds: selectRoundIds(pool, `atlas:${input.contentVersion}:${input.salt}`, PRO_ATLAS_ROUND_COUNT),
    reshuffled: pool === eligible && unseen.length < Math.min(PRO_ATLAS_ROUND_COUNT, eligible.length)
  };
}
