import { describe, expect, it } from "vitest";
import { mergeStatsSnapshot, statsSnapshotForUser, statsSyncSignature } from "@/lib/account/sync";
import type { LocalPlayerStats } from "@/lib/persistence/playerStats";
import { defaultPersistedState } from "@/lib/persistence/storage";
import type { UserStatsRow } from "@/lib/supabase/database";

const localStats: LocalPlayerStats = {
  mapsPlayed: 5,
  dailyRunsCompleted: 1,
  correctAnswers: 5,
  gamesCompleted: 1,
  dailyGames: 1,
  archiveGames: 0,
  challengeGames: 0,
  roundsPlayed: 5,
  totalScore: 4200,
  averageScorePerRound: 840,
  averageScorePerGame: 4200,
  averageDailyScore: 4200,
  bestDailyScore: 4200,
  bestRoundScore: 1000,
  currentDailyStreak: 1,
  bestDailyStreak: 3,
  lastPlayedDailyDate: "2026-06-24",
  currentStreak: 1,
  bestStreak: 3,
  recentGames: []
};

describe("account stats sync helpers", () => {
  it("maps local stats into a Supabase user_stats snapshot", () => {
    const snapshot = statsSnapshotForUser("user-1", localStats, "2026-06-24T12:00:00.000Z");
    expect(snapshot).toMatchObject({
      user_id: "user-1",
      maps_played: 5,
      daily_runs_completed: 1,
      correct_answers: 5,
      total_score: 4200,
      best_round_score: 1000,
      current_daily_streak: 1,
      best_daily_streak: 3,
      last_played_daily_date: "2026-06-24"
    });
  });

  it("merges local stats conservatively without double-counting remote totals", () => {
    const remote: UserStatsRow = {
      user_id: "user-1",
      maps_played: 8,
      daily_runs_completed: 2,
      correct_answers: 8,
      total_score: 5100,
      best_round_score: 900,
      current_daily_streak: 2,
      best_daily_streak: 2,
      last_played_daily_date: "2026-06-25",
      updated_at: "2026-06-25T12:00:00.000Z"
    };
    const local = statsSnapshotForUser("user-1", localStats, "2026-06-24T12:00:00.000Z");
    const merged = mergeStatsSnapshot(remote, local);
    expect(merged.maps_played).toBe(8);
    expect(merged.total_score).toBe(5100);
    expect(merged.best_round_score).toBe(1000);
    expect(merged.best_daily_streak).toBe(3);
    expect(merged.last_played_daily_date).toBe("2026-06-25");
  });

  it("creates deterministic sync signatures for local histories", () => {
    const state = {
      ...defaultPersistedState(),
      dailyHistoryByDate: {
        "2026-06-24": {
          id: "daily-1",
          dateKey: "2026-06-24",
          mode: "daily" as const,
          tier: "analyst" as const,
          totalScore: 1000,
          bestScore: 1000,
          roundScores: [1000],
          roundCount: 1,
          completedAt: "2026-06-24T12:00:00.000Z",
          lastPlayedAt: "2026-06-24T12:00:00.000Z"
        }
      }
    };
    expect(statsSyncSignature(state)).toBe(statsSyncSignature(state));
    expect(statsSyncSignature(state)).not.toBe(statsSyncSignature(defaultPersistedState()));
  });
});
