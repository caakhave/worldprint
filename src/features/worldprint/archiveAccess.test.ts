import { describe, expect, it } from "vitest";
import { archiveDateRange, publicArchiveEntries, visibleArchiveEntries } from "@/features/worldprint/archiveAccess";
import type { DailyIndexEntry } from "@/lib/content/schemas";
import { defaultPersistedState } from "@/lib/persistence/storage";

function entry(date: string): DailyIndexEntry {
  return {
    date,
    path: `/data/v1/dailies/${date}.json`,
    roundCount: 5,
    roundIds: [`round-${date}`],
    indicatorIds: [`indicator-${date}`],
    categoryMix: { demography: 1 },
    mapDifficultyMix: { standard: 1 }
  };
}

describe("archive access helpers", () => {
  it("clamps public archive entries to today and keeps newest first", () => {
    const entries = publicArchiveEntries([entry("2026-09-20"), entry("2026-06-25"), entry("2026-06-26")], "2026-06-26");

    expect(entries.map((item) => item.date)).toEqual(["2026-06-26", "2026-06-25"]);
    expect(archiveDateRange(entries)).toEqual({ start: "2026-06-25", end: "2026-06-26" });
  });

  it("limits guest/free cards to public recent dates plus completed local history", () => {
    const store = defaultPersistedState();
    store.archiveHistoryByDate["2026-06-20"] = {
      id: "archive-2026-06-20",
      dateKey: "2026-06-20",
      mode: "archive",
      tier: "analyst",
      totalScore: 100,
      bestScore: 100,
      roundScores: [100],
      roundCount: 1,
      completedAt: "2026-06-20T12:00:00.000Z",
      lastPlayedAt: "2026-06-20T12:00:00.000Z"
    };
    const entries = publicArchiveEntries(
      [entry("2026-06-26"), entry("2026-06-25"), entry("2026-06-24"), entry("2026-06-20"), entry("2026-09-20")],
      "2026-06-26"
    );

    expect(visibleArchiveEntries(entries, store, 2).map((item) => item.date)).toEqual(["2026-06-26", "2026-06-25", "2026-06-20"]);
  });

  it("shows no archive cards when access limit is zero", () => {
    const store = defaultPersistedState();
    const entries = publicArchiveEntries([entry("2026-06-26"), entry("2026-06-25")], "2026-06-26");

    expect(visibleArchiveEntries(entries, store, 0)).toEqual([]);
  });

  it("shows all public dates for Pro without future cards", () => {
    const store = defaultPersistedState();
    const entries = publicArchiveEntries([entry("2026-06-26"), entry("2026-05-23"), entry("2026-09-20")], "2026-06-26");

    expect(visibleArchiveEntries(entries, store, null).map((item) => item.date)).toEqual(["2026-06-26", "2026-05-23"]);
  });
});
