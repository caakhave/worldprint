import type { DailyIndexEntry } from "@/lib/content/schemas";
import type { PersistedState } from "@/lib/persistence/storage";

export type ArchiveDateRange = {
  start: string;
  end: string;
};

export function publicArchiveEntries(entries: DailyIndexEntry[], todayKey: string): DailyIndexEntry[] {
  return [...entries].filter((entry) => entry.date <= todayKey).sort((left, right) => right.date.localeCompare(left.date));
}

export function archiveDateRange(entries: DailyIndexEntry[]): ArchiveDateRange | null {
  if (!entries.length) return null;
  return {
    start: entries[entries.length - 1].date,
    end: entries[0].date
  };
}

export function visibleArchiveEntries(entries: DailyIndexEntry[], store: PersistedState, limit: number | null): DailyIndexEntry[] {
  if (limit === null) return entries;
  if (limit <= 0) return [];
  const recentEntries = entries.slice(0, limit);
  const visibleDates = new Set(recentEntries.map((entry) => entry.date));
  const completedDates = new Set([...Object.keys(store.dailyHistoryByDate), ...Object.keys(store.archiveHistoryByDate)]);
  const completedEntries = entries.filter((entry) => completedDates.has(entry.date) && !visibleDates.has(entry.date));
  return [...recentEntries, ...completedEntries].sort((left, right) => right.date.localeCompare(left.date));
}
