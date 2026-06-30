import { describe, expect, it } from "vitest";
import {
  buildAccountStatsFromCloudRuns,
  clientRunKeyFor,
  ensureProfile,
  fetchMarketingPreference,
  mergeStatsSnapshot,
  syncCompletedRunForAccount,
  syncLocalRunsToSupabase,
  statsSnapshotForUser,
  statsSyncSignature,
  updateMarketingPreference
} from "@/lib/account/sync";
import { createRun, reduceRun } from "@/lib/game/state";
import type { LocalPlayerStats } from "@/lib/persistence/playerStats";
import { defaultPersistedState, recordRunCompletion } from "@/lib/persistence/storage";
import type { CanYouGeoSupabaseClient } from "@/lib/supabase/client";
import type { GameRunRow, ProfileRow, RoundResultRow, UserStatsRow } from "@/lib/supabase/database";

const localStats: LocalPlayerStats = {
  mapsPlayed: 5,
  dailyRunsCompleted: 1,
  correctAnswers: 5,
  gamesCompleted: 1,
  dailyGames: 1,
  atlasGames: 0,
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

  it("uses stable cloud run keys for deduped saved runs", () => {
    expect(clientRunKeyFor("daily", "2026-06-24", "daily-run")).toBe("worldprint:daily:2026-06-24");
    expect(clientRunKeyFor("archive", "2026-06-24", "archive-run")).toBe("worldprint:archive:2026-06-24");
    expect(clientRunKeyFor("sample", "2026-06-24", "sample-run")).toBeNull();
    expect(clientRunKeyFor("atlas", "2026-06-24", "atlas-run")).toBe("worldprint:atlas:atlas-run");
    expect(clientRunKeyFor("challenge", "2026-06-24", "challenge-run")).toBe("worldprint:challenge:challenge-run");
    expect(clientRunKeyFor("practice", "2026-06-24", "practice-run")).toBe("worldprint:practice:practice-run");
  });

  it("defaults existing profiles to not opted in and preserves opted-out users on refresh", async () => {
    const mock = createMockProfileClient({
      id: "user-1",
      display_name: "reader",
      marketing_opt_in: false,
      marketing_opt_in_at: null,
      marketing_opt_in_source: null,
      marketing_opt_out_at: "2026-06-30T13:00:00.000Z",
      created_at: "2026-06-30T12:00:00.000Z",
      updated_at: "2026-06-30T13:00:00.000Z"
    });

    await expect(
      ensureProfile(mock.client, {
        id: "user-1",
        email: "reader@example.com",
        user_metadata: {
          marketing_opt_in: true,
          marketing_opt_in_source: "sign_up"
        }
      } as never)
    ).resolves.toEqual({ error: null });

    expect(mock.profile?.marketing_opt_in).toBe(false);
    await expect(fetchMarketingPreference(mock.client, "user-1")).resolves.toMatchObject({
      data: { marketing_opt_in: false },
      error: null
    });
  });

  it("creates a new profile with sign-up marketing consent only when explicitly opted in", async () => {
    const mock = createMockProfileClient(null);

    await expect(
      ensureProfile(
        mock.client,
        {
          id: "user-1",
          email: "reader@example.com",
          user_metadata: {}
        } as never,
        { marketingOptIn: true, marketingOptInSource: "sign_up" }
      )
    ).resolves.toEqual({ error: null });

    expect(mock.profile).toMatchObject({
      id: "user-1",
      marketing_opt_in: true,
      marketing_opt_in_source: "sign_up",
      marketing_opt_out_at: null
    });
    expect(mock.profile?.marketing_opt_in_at).toBeTruthy();
  });

  it("lets the current user update their own marketing preference through the profile layer", async () => {
    const mock = createMockProfileClient({
      id: "user-1",
      display_name: "reader",
      marketing_opt_in: true,
      marketing_opt_in_at: "2026-06-30T12:00:00.000Z",
      marketing_opt_in_source: "sign_up",
      marketing_opt_out_at: null,
      created_at: "2026-06-30T12:00:00.000Z",
      updated_at: "2026-06-30T12:00:00.000Z"
    });

    await expect(updateMarketingPreference(mock.client, "user-1", false)).resolves.toEqual({ error: null });

    expect(mock.profile).toMatchObject({
      marketing_opt_in: false,
      marketing_opt_in_source: null
    });
    expect(mock.profile?.marketing_opt_out_at).toBeTruthy();
  });

  it("skips cloud save when the player is signed out", async () => {
    let run = createRun({
      mode: "daily",
      dateKey: "2026-06-24",
      contentVersion: "test",
      tier: "analyst",
      roundIds: [{ roundId: "round-1", correctIndicatorId: "indicator-1" }]
    });
    run = reduceRun(run, { type: "submit", answerId: "indicator-1", label: "Indicator", correct: true });
    run = reduceRun(run, { type: "nextRound" });

    await expect(syncCompletedRunForAccount({ client: null, userId: null, run })).resolves.toEqual({
      status: "skipped",
      reason: "signed-out"
    });
  });

  it("saves a signed-in completed run and refreshes account stats", async () => {
    const mock = createMockSyncClient();
    let run = createRun({
      mode: "daily",
      dateKey: "2026-06-24",
      contentVersion: "test",
      tier: "analyst",
      roundIds: [{ roundId: "round-1", correctIndicatorId: "indicator-1" }]
    });
    run = reduceRun(run, { type: "submit", answerId: "indicator-1", label: "Indicator", correct: true });
    run = reduceRun(run, { type: "nextRound" });

    const result = await syncCompletedRunForAccount({ client: mock.client, userId: "user-1", run, completedAt: "2026-06-24T12:00:00.000Z" });

    expect(result.status).toBe("saved");
    expect(mock.gameRuns).toHaveLength(1);
    expect(mock.gameRuns[0]).toMatchObject({
      user_id: "user-1",
      client_run_key: "worldprint:daily:2026-06-24",
      maps_played: 1,
      correct_count: 1,
      best_round_score: 1000
    });
    expect(mock.roundResults).toHaveLength(1);
    expect(mock.roundResults[0]).toMatchObject({
      indicator_id: "indicator-1",
      score: 1000,
      correct: true
    });
    expect(mock.userStats?.maps_played).toBe(1);
  });

  it("returns a non-blocking error when cloud save fails", async () => {
    const mock = createMockSyncClient({ failGameRuns: true });
    const run = {
      ...createRun({
        mode: "daily",
        dateKey: "2026-06-24",
        contentVersion: "test",
        tier: "analyst",
        roundIds: [{ roundId: "round-1", correctIndicatorId: "indicator-1" }]
      }),
      status: "complete" as const
    };

    await expect(syncCompletedRunForAccount({ client: mock.client, userId: "user-1", run })).resolves.toMatchObject({
      status: "error",
      clientRunKey: "worldprint:daily:2026-06-24"
    });
  });

  it("dedupes local imports by stable client run key", async () => {
    const mock = createMockSyncClient();
    let run = createRun({
      mode: "archive",
      dateKey: "2026-06-20",
      contentVersion: "test",
      tier: "analyst",
      roundIds: [{ roundId: "round-1", correctIndicatorId: "indicator-1" }]
    });
    run = reduceRun(run, { type: "submit", answerId: "indicator-1", label: "Indicator", correct: true });
    run = reduceRun(run, { type: "nextRound" });
    const state = recordRunCompletion(defaultPersistedState(), run);

    await syncLocalRunsToSupabase(mock.client, "user-1", state);
    await syncLocalRunsToSupabase(mock.client, "user-1", state);

    expect(mock.gameRuns).toHaveLength(1);
    expect(buildAccountStatsFromCloudRuns("user-1", mock.gameRuns).games_completed).toBe(1);
  });

  it("syncs Atlas completions without counting them as Daily runs", async () => {
    const mock = createMockSyncClient();
    let run = createRun({
      mode: "atlas",
      dateKey: "2026-06-24",
      contentVersion: "test",
      tier: "analyst",
      roundIds: [{ roundId: "round-1", correctIndicatorId: "indicator-1" }],
      salt: "atlas"
    });
    run = reduceRun(run, { type: "submit", answerId: "indicator-1", label: "Indicator", correct: true });
    run = reduceRun(run, { type: "nextRound" });
    const state = recordRunCompletion(defaultPersistedState(), run);

    await syncLocalRunsToSupabase(mock.client, "user-1", state);

    expect(mock.gameRuns).toHaveLength(1);
    expect(mock.gameRuns[0]).toMatchObject({
      client_run_key: `worldprint:atlas:${run.id}`,
      mode: "atlas",
      daily_date: null
    });
    const stats = buildAccountStatsFromCloudRuns("user-1", mock.gameRuns);
    expect(stats.daily_games).toBe(0);
    expect(stats.atlas_games).toBe(1);
    expect(stats.games_completed).toBe(1);
  });
});

function createMockSyncClient(options: { failGameRuns?: boolean } = {}) {
  const gameRuns: GameRunRow[] = [];
  const roundResults: RoundResultRow[] = [];
  let userStats: UserStatsRow | null = null;
  let nextId = 1;

  const client = {
    from(table: string) {
      if (table === "game_runs") {
        return {
          upsert(row: Partial<GameRunRow>) {
            return {
              select() {
                return {
                  async single() {
                    if (options.failGameRuns) return { data: null, error: { message: "game_runs failed" } };
                    const key = row.client_run_key ?? `missing-${nextId}`;
                    const existingIndex = gameRuns.findIndex((item) => item.user_id === row.user_id && item.client_run_key === key);
                    const nextRow: GameRunRow = {
                      id: existingIndex >= 0 ? gameRuns[existingIndex].id : `run-${nextId++}`,
                      user_id: row.user_id ?? null,
                      anonymous_id: row.anonymous_id ?? null,
                      client_run_key: key,
                      mode: row.mode ?? "daily",
                      game_key: row.game_key ?? "worldprint",
                      daily_date: row.daily_date ?? null,
                      challenge_code: row.challenge_code ?? null,
                      content_version: row.content_version ?? null,
                      tier: row.tier ?? null,
                      total_score: row.total_score ?? 0,
                      maps_played: row.maps_played ?? 0,
                      correct_count: row.correct_count ?? 0,
                      best_round_score: row.best_round_score ?? 0,
                      completed_at: row.completed_at ?? null,
                      created_at: row.created_at ?? "2026-06-24T12:00:00.000Z"
                    };
                    if (existingIndex >= 0) gameRuns[existingIndex] = nextRow;
                    else gameRuns.push(nextRow);
                    return { data: { id: nextRow.id, client_run_key: nextRow.client_run_key }, error: null };
                  }
                };
              }
            };
          },
          select() {
            return {
              eq() {
                return {
                  async order() {
                    return { data: gameRuns, error: null };
                  }
                };
              }
            };
          }
        };
      }
      if (table === "round_results") {
        return {
          async upsert(rows: Array<Partial<RoundResultRow>>) {
            for (const row of rows) {
              const existingIndex = roundResults.findIndex((item) => item.run_id === row.run_id && item.round_index === row.round_index);
              const nextRow: RoundResultRow = {
                id: existingIndex >= 0 ? roundResults[existingIndex].id : `round-result-${roundResults.length + 1}`,
                run_id: row.run_id ?? "run-unknown",
                round_index: row.round_index ?? 0,
                indicator_id: row.indicator_id ?? null,
                guessed_indicator_id: row.guessed_indicator_id ?? null,
                correct: row.correct ?? false,
                score: row.score ?? 0,
                investigations_used: row.investigations_used ?? 0,
                unit_clue_used: row.unit_clue_used ?? false,
                created_at: row.created_at ?? "2026-06-24T12:00:00.000Z"
              };
              if (existingIndex >= 0) roundResults[existingIndex] = nextRow;
              else roundResults.push(nextRow);
            }
            return { error: null };
          }
        };
      }
      if (table === "user_stats") {
        return {
          upsert(row: UserStatsRow) {
            return {
              select() {
                return {
                  async single() {
                    userStats = row;
                    return { data: row, error: null };
                  }
                };
              }
            };
          }
        };
      }
      throw new Error(`Unexpected table ${table}`);
    }
  } as unknown as CanYouGeoSupabaseClient;

  return {
    client,
    gameRuns,
    roundResults,
    get userStats() {
      return userStats;
    }
  };
}

function createMockProfileClient(initialProfile: ProfileRow | null) {
  let profile = initialProfile;
  const client = {
    from(table: string) {
      if (table !== "profiles") throw new Error(`Unexpected table ${table}`);
      return {
        select() {
          return {
            eq() {
              return {
                async maybeSingle() {
                  return { data: profile, error: null };
                }
              };
            }
          };
        },
        async upsert(row: Partial<ProfileRow>) {
          profile = {
            id: row.id ?? profile?.id ?? "user-1",
            display_name: row.display_name ?? profile?.display_name ?? null,
            marketing_opt_in: row.marketing_opt_in ?? profile?.marketing_opt_in ?? false,
            marketing_opt_in_at: row.marketing_opt_in_at ?? profile?.marketing_opt_in_at ?? null,
            marketing_opt_in_source: row.marketing_opt_in_source ?? profile?.marketing_opt_in_source ?? null,
            marketing_opt_out_at: row.marketing_opt_out_at ?? profile?.marketing_opt_out_at ?? null,
            created_at: profile?.created_at ?? "2026-06-30T12:00:00.000Z",
            updated_at: row.updated_at ?? profile?.updated_at ?? "2026-06-30T12:00:00.000Z"
          };
          return { error: null };
        },
        update(row: Partial<ProfileRow>) {
          return {
            async eq() {
              if (profile) profile = { ...profile, ...row };
              return { error: null };
            }
          };
        }
      };
    }
  } as unknown as CanYouGeoSupabaseClient;
  return {
    client,
    get profile() {
      return profile;
    }
  };
}
