import type { DailyIndex, DailyManifest, RoundDefinition } from "@/lib/content/schemas";
import { selectDailyRoundIds } from "@/lib/game/daily";

export type DailySelectionSource = "manifest" | "fallback";

export type DailySelection = {
  roundIds: string[];
  source: DailySelectionSource;
  issue?: string;
};

export function selectDailyRoundIdsFromManifest(
  rounds: RoundDefinition[],
  contentVersion: string,
  dateKey: string,
  manifest: DailyManifest | null
): DailySelection {
  const fallback = () => ({
    roundIds: selectDailyRoundIds(rounds, contentVersion, dateKey),
    source: "fallback" as const
  });
  if (!manifest) return fallback();
  if (manifest.date !== dateKey) {
    return { ...fallback(), issue: `Daily manifest date ${manifest.date} does not match requested date ${dateKey}.` };
  }
  if (manifest.contentVersion !== contentVersion) {
    return { ...fallback(), issue: `Daily manifest content version ${manifest.contentVersion} does not match ${contentVersion}.` };
  }
  const knownRoundIds = new Set(rounds.map((round) => round.id));
  const missingRoundIds = manifest.roundIds.filter((roundId) => !knownRoundIds.has(roundId));
  if (missingRoundIds.length > 0) {
    return { ...fallback(), issue: `Daily manifest references missing rounds: ${missingRoundIds.join(", ")}.` };
  }
  return {
    roundIds: manifest.roundIds,
    source: "manifest"
  };
}

export function findDailyIndexEntry(index: DailyIndex, dateKey: string) {
  return index.dates.find((entry) => entry.date === dateKey) ?? null;
}
