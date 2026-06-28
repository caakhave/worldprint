import type { User } from "@supabase/supabase-js";
import type { RunMode, RunState } from "@/lib/game/state";
import { buildLocalPlayerStats, type LocalPlayerStats } from "@/lib/persistence/playerStats";
import type { CompletionHistory, PersistedState } from "@/lib/persistence/storage";
import type { CanYouGeoSupabaseClient } from "@/lib/supabase/client";
import type { Database, GameRunRow, UserStatsRow } from "@/lib/supabase/database";

export const SYNC_MARKER_PREFIX = "canyougeo:supabase-sync:v1";

export type AccountStatsSnapshot = {
  user_id: string;
  maps_played: number;
  daily_runs_completed: number;
  correct_answers: number;
  total_score: number;
  best_round_score: number;
  current_daily_streak: number;
  best_daily_streak: number;
  last_played_daily_date: string | null;
  updated_at: string;
};

export type AccountCloudStats = AccountStatsSnapshot & {
  games_completed: number;
  daily_games: number;
  atlas_games: number;
  practice_games: number;
  archive_games: number;
  challenge_games: number;
  recent_runs: Array<{
    client_run_key: string | null;
    mode: string;
    label: string;
    total_score: number;
    maps_played: number;
    completed_at: string | null;
  }>;
};

type SyncableHistory = Pick<CompletionHistory, "id" | "dateKey" | "mode" | "totalScore" | "bestScore" | "roundCount" | "lastPlayedAt">;

type GameRunInsert = Database["public"]["Tables"]["game_runs"]["Insert"];
type RoundResultInsert = Database["public"]["Tables"]["round_results"]["Insert"];

export type CloudRunPayload = {
  run: GameRunInsert;
  rounds: Array<Omit<RoundResultInsert, "run_id">>;
};

export type CloudSyncResult =
  | { status: "skipped"; reason: "signed-out" | "not-complete" }
  | { status: "saved"; runId: string; clientRunKey: string }
  | { status: "error"; error: string; clientRunKey: string | null };

export function displayNameForUser(user: User): string | null {
  const name = user.user_metadata?.name;
  if (typeof name === "string" && name.trim()) return name.trim();
  const email = user.email?.trim();
  if (!email) return null;
  return email.split("@")[0] ?? email;
}

export function statsSnapshotForUser(userId: string, stats: LocalPlayerStats, updatedAt = new Date().toISOString()): AccountStatsSnapshot {
  return {
    user_id: userId,
    maps_played: stats.mapsPlayed,
    daily_runs_completed: stats.dailyRunsCompleted,
    correct_answers: stats.correctAnswers,
    total_score: stats.totalScore,
    best_round_score: stats.bestRoundScore ?? 0,
    current_daily_streak: stats.currentDailyStreak,
    best_daily_streak: stats.bestDailyStreak,
    last_played_daily_date: stats.lastPlayedDailyDate,
    updated_at: updatedAt
  };
}

export function mergeStatsSnapshot(remote: UserStatsRow | null, local: AccountStatsSnapshot): AccountStatsSnapshot {
  if (!remote) return local;
  return {
    ...local,
    maps_played: Math.max(remote.maps_played, local.maps_played),
    daily_runs_completed: Math.max(remote.daily_runs_completed, local.daily_runs_completed),
    correct_answers: Math.max(remote.correct_answers, local.correct_answers),
    total_score: Math.max(remote.total_score, local.total_score),
    best_round_score: Math.max(remote.best_round_score, local.best_round_score),
    current_daily_streak: Math.max(remote.current_daily_streak, local.current_daily_streak),
    best_daily_streak: Math.max(remote.best_daily_streak, local.best_daily_streak),
    last_played_daily_date: maxDateKey(remote.last_played_daily_date, local.last_played_daily_date)
  };
}

export function syncMarkerKey(userId: string): string {
  return `${SYNC_MARKER_PREFIX}:${userId}`;
}

export function statsSyncSignature(store: PersistedState): string {
  const histories: SyncableHistory[] = [
    ...Object.values(store.dailyHistoryByDate),
    ...Object.values(store.atlasHistoryById),
    ...Object.values(store.archiveHistoryByDate),
    ...Object.values(store.challengeHistoryById)
  ]
    .map((item) => ({
      id: item.id,
      dateKey: item.dateKey,
      mode: item.mode,
      totalScore: item.totalScore,
      bestScore: item.bestScore,
      roundCount: item.roundCount,
      lastPlayedAt: item.lastPlayedAt
    }))
    .sort((left, right) => `${left.mode}:${left.id}`.localeCompare(`${right.mode}:${right.id}`));

  let hash = 2166136261;
  const payload = JSON.stringify(histories);
  for (let index = 0; index < payload.length; index += 1) {
    hash ^= payload.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function syncableCompletionHistories(store: PersistedState): CompletionHistory[] {
  return [
    ...Object.values(store.dailyHistoryByDate),
    ...Object.values(store.atlasHistoryById),
    ...Object.values(store.archiveHistoryByDate),
    ...Object.values(store.challengeHistoryById)
  ];
}

export function clientRunKeyFor(mode: RunMode, dateKey: string, id: string): string | null {
  if (mode === "sample") return null;
  if (mode === "daily" || mode === "archive") return `worldprint:${mode}:${dateKey}`;
  return `worldprint:${mode}:${id}`;
}

export function clientRunKeyForRun(run: RunState): string | null {
  return clientRunKeyFor(run.mode, run.dateKey, run.id);
}

export function cloudRunPayloadFromHistory(userId: string, history: CompletionHistory): CloudRunPayload | null {
  const clientRunKey = clientRunKeyFor(history.mode, history.dateKey, history.id);
  if (!clientRunKey) return null;
  return {
    run: {
      user_id: userId,
      client_run_key: clientRunKey,
      mode: history.mode,
      game_key: "worldprint",
      daily_date: history.mode === "daily" || history.mode === "archive" ? history.dateKey : null,
      challenge_code: history.mode === "challenge" ? history.id : null,
      tier: history.tier,
      total_score: history.totalScore,
      maps_played: history.roundCount,
      correct_count: history.roundCount,
      best_round_score: history.roundScores.length ? Math.max(...history.roundScores) : 0,
      completed_at: history.completedAt
    },
    rounds: history.roundScores.map((score, index) => {
      const detail = history.roundDetails?.[index];
      return {
        round_index: index,
        indicator_id: detail?.correctIndicatorId ?? null,
        guessed_indicator_id: detail?.result === "incomplete" ? null : (detail?.correctIndicatorId ?? null),
        correct: detail ? detail.result !== "incomplete" : true,
        score,
        investigations_used: detail?.investigationsUsed ?? 0,
        unit_clue_used: detail?.unitClueUsed ?? false
      };
    })
  };
}

export function cloudRunPayloadFromRun(userId: string, run: RunState, completedAt = new Date().toISOString()): CloudRunPayload | null {
  if (run.status !== "complete") return null;
  const clientRunKey = clientRunKeyForRun(run);
  if (!clientRunKey) return null;
  const solvedRounds = run.rounds.filter((round) => round.phase === "solved");
  return {
    run: {
      user_id: userId,
      client_run_key: clientRunKey,
      mode: run.mode,
      game_key: "worldprint",
      daily_date: run.mode === "daily" || run.mode === "archive" ? run.dateKey : null,
      challenge_code: run.mode === "challenge" ? run.id : null,
      content_version: run.contentVersion,
      tier: run.tier,
      total_score: run.rounds.reduce((sum, round) => sum + round.score, 0),
      maps_played: run.rounds.length,
      correct_count: solvedRounds.length,
      best_round_score: run.rounds.length ? Math.max(...run.rounds.map((round) => round.score)) : 0,
      completed_at: completedAt
    },
    rounds: run.rounds.map((round, index) => ({
      round_index: index,
      indicator_id: round.correctIndicatorId,
      guessed_indicator_id: round.phase === "solved" ? round.correctIndicatorId : null,
      correct: round.phase === "solved",
      score: round.score,
      investigations_used: round.investigations.filter((investigation) => investigation.cost > 0).length,
      unit_clue_used: round.unitClueUsed
    }))
  };
}

export function localStatsSnapshotForUser(userId: string, store: PersistedState): AccountStatsSnapshot {
  return statsSnapshotForUser(userId, buildLocalPlayerStats(store));
}

export async function ensureProfile(client: CanYouGeoSupabaseClient, user: User): Promise<{ error: string | null }> {
  const { error } = await client.from("profiles").upsert(
    {
      id: user.id,
      display_name: displayNameForUser(user),
      updated_at: new Date().toISOString()
    },
    { onConflict: "id" }
  );
  return { error: error?.message ?? null };
}

export async function fetchRemoteStats(client: CanYouGeoSupabaseClient, userId: string): Promise<{ data: UserStatsRow | null; error: string | null }> {
  const { data, error } = await client.from("user_stats").select("*").eq("user_id", userId).maybeSingle();
  return { data: data ?? null, error: error?.message ?? null };
}

export async function fetchRemoteRunSummaries(
  client: CanYouGeoSupabaseClient,
  userId: string
): Promise<{ data: GameRunRow[]; error: string | null }> {
  const { data, error } = await client
    .from("game_runs")
    .select("*")
    .eq("user_id", userId)
    .order("completed_at", { ascending: false, nullsFirst: false });
  return { data: data ?? [], error: error?.message ?? null };
}

export function buildAccountStatsFromCloudRuns(
  userId: string,
  runs: GameRunRow[],
  updatedAt = new Date().toISOString()
): AccountCloudStats {
  const completedRuns = dedupeCloudRuns(runs).filter((run) => run.completed_at);
  const dailyRuns = completedRuns.filter((run) => run.mode === "daily");
  const atlasRuns = completedRuns.filter((run) => run.mode === "atlas");
  const practiceRuns = completedRuns.filter((run) => run.mode === "practice");
  const archiveRuns = completedRuns.filter((run) => run.mode === "archive");
  const challengeRuns = completedRuns.filter((run) => run.mode === "challenge");
  const mapsPlayed = completedRuns.reduce((sum, run) => sum + run.maps_played, 0);
  const totalScore = completedRuns.reduce((sum, run) => sum + run.total_score, 0);
  const bestRoundScore = completedRuns.length ? Math.max(...completedRuns.map((run) => run.best_round_score)) : 0;
  const dailyDates = dailyRuns.flatMap((run) => (run.daily_date ? [run.daily_date] : []));
  const streaks = dailyStreakStats(dailyDates);
  const lastDailyDate = dailyDates.sort().at(-1) ?? null;

  return {
    user_id: userId,
    maps_played: mapsPlayed,
    daily_runs_completed: dailyRuns.length,
    correct_answers: completedRuns.reduce((sum, run) => sum + run.correct_count, 0),
    total_score: totalScore,
    best_round_score: bestRoundScore,
    current_daily_streak: streaks.current,
    best_daily_streak: streaks.best,
    last_played_daily_date: lastDailyDate,
    updated_at: updatedAt,
    games_completed: completedRuns.length,
    daily_games: dailyRuns.length,
    atlas_games: atlasRuns.length,
    practice_games: practiceRuns.length,
    archive_games: archiveRuns.length,
    challenge_games: challengeRuns.length,
    recent_runs: completedRuns.slice(0, 3).map((run) => ({
      client_run_key: run.client_run_key,
      mode: run.mode,
      label: run.mode === "archive" && run.daily_date ? `Past game ${run.daily_date}` : modeLabel(run.mode),
      total_score: run.total_score,
      maps_played: run.maps_played,
      completed_at: run.completed_at
    }))
  };
}

export async function upsertCloudRun(
  client: CanYouGeoSupabaseClient,
  payload: CloudRunPayload
): Promise<{ data: { id: string; client_run_key: string | null } | null; error: string | null }> {
  const { data, error } = await client
    .from("game_runs")
    .upsert(payload.run, { onConflict: "user_id,client_run_key" })
    .select("id,client_run_key")
    .single();
  if (error || !data) return { data: null, error: error?.message ?? "Could not save this run." };

  if (payload.rounds.length) {
    const rows = payload.rounds.map((round) => ({ ...round, run_id: data.id }));
    const roundResult = await client.from("round_results").upsert(rows, { onConflict: "run_id,round_index" });
    if (roundResult.error) return { data, error: roundResult.error.message };
  }

  return { data, error: null };
}

export async function refreshCloudStats(
  client: CanYouGeoSupabaseClient,
  userId: string
): Promise<{ data: AccountCloudStats | null; error: string | null }> {
  const runs = await fetchRemoteRunSummaries(client, userId);
  if (runs.error) return { data: null, error: runs.error };
  const stats = buildAccountStatsFromCloudRuns(userId, runs.data);
  const { data, error } = await client.from("user_stats").upsert(statsSnapshotForUpsert(stats), { onConflict: "user_id" }).select("*").single();
  if (error) return { data: null, error: error.message };
  return {
    data: {
      ...stats,
      updated_at: data?.updated_at ?? stats.updated_at
    },
    error: null
  };
}

export async function syncCompletedRunForAccount(input: {
  client: CanYouGeoSupabaseClient | null;
  userId: string | null;
  run: RunState;
  completedAt?: string;
}): Promise<CloudSyncResult> {
  if (!input.client || !input.userId) return { status: "skipped", reason: "signed-out" };
  if (input.run.status !== "complete") return { status: "skipped", reason: "not-complete" };
  const payload = cloudRunPayloadFromRun(input.userId, input.run, input.completedAt);
  if (!payload) return { status: "skipped", reason: "not-complete" };
  const result = await upsertCloudRun(input.client, payload);
  if (result.error || !result.data) return { status: "error", error: result.error ?? "Could not save this run.", clientRunKey: payload.run.client_run_key ?? null };
  await refreshCloudStats(input.client, input.userId);
  return { status: "saved", runId: result.data.id, clientRunKey: result.data.client_run_key ?? payload.run.client_run_key ?? "" };
}

export async function syncLocalRunsToSupabase(
  client: CanYouGeoSupabaseClient,
  userId: string,
  store: PersistedState
): Promise<{ data: AccountCloudStats | null; error: string | null; syncedRuns: number; signature: string }> {
  const signature = statsSyncSignature(store);
  const payloads = syncableCompletionHistories(store)
    .map((history) => cloudRunPayloadFromHistory(userId, history))
    .filter((payload): payload is CloudRunPayload => Boolean(payload));
  let syncedRuns = 0;

  for (const payload of payloads) {
    const result = await upsertCloudRun(client, payload);
    if (result.error) {
      return { data: null, error: result.error, syncedRuns, signature };
    }
    syncedRuns += 1;
  }

  const refreshed = await refreshCloudStats(client, userId);
  return { data: refreshed.data, error: refreshed.error, syncedRuns, signature };
}

export async function syncLocalStatsToSupabase(
  client: CanYouGeoSupabaseClient,
  userId: string,
  store: PersistedState,
  remote: UserStatsRow | null
): Promise<{ data: AccountStatsSnapshot | null; error: string | null; signature: string }> {
  const signature = statsSyncSignature(store);
  const runSync = await syncLocalRunsToSupabase(client, userId, store);
  if (runSync.error) return { data: null, error: runSync.error, signature };
  const localSnapshot = localStatsSnapshotForUser(userId, store);
  const merged = mergeStatsSnapshot(remote, localSnapshot);
  const { data, error } = await client.from("user_stats").upsert(merged, { onConflict: "user_id" }).select("*").single();
  return { data: data ?? null, error: error?.message ?? null, signature };
}

function statsSnapshotForUpsert(stats: AccountCloudStats): AccountStatsSnapshot {
  return {
    user_id: stats.user_id,
    maps_played: stats.maps_played,
    daily_runs_completed: stats.daily_runs_completed,
    correct_answers: stats.correct_answers,
    total_score: stats.total_score,
    best_round_score: stats.best_round_score,
    current_daily_streak: stats.current_daily_streak,
    best_daily_streak: stats.best_daily_streak,
    last_played_daily_date: stats.last_played_daily_date,
    updated_at: stats.updated_at
  };
}

function dedupeCloudRuns(runs: GameRunRow[]): GameRunRow[] {
  const byKey = new Map<string, GameRunRow>();
  for (const run of [...runs].sort((left, right) => (right.completed_at ?? "").localeCompare(left.completed_at ?? ""))) {
    const key = run.client_run_key ?? run.id;
    if (!byKey.has(key)) byKey.set(key, run);
  }
  return [...byKey.values()];
}

function modeLabel(mode: string): string {
  if (mode === "sample") return "Sample";
  if (mode === "daily") return "Daily";
  if (mode === "atlas") return "Atlas";
  if (mode === "archive") return "Past game";
  if (mode === "challenge") return "Challenge";
  return "Practice";
}

function dailyStreakStats(dateKeys: string[]): { current: number; best: number } {
  const unique = [...new Set(dateKeys)].sort();
  if (!unique.length) return { current: 0, best: 0 };
  let best = 1;
  let currentRun = 1;
  for (let index = 1; index < unique.length; index += 1) {
    if (previousDateKey(unique[index]) === unique[index - 1]) {
      currentRun += 1;
    } else {
      currentRun = 1;
    }
    best = Math.max(best, currentRun);
  }
  return { current: currentRun, best };
}

function previousDateKey(dateKey: string): string {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

function maxDateKey(left: string | null, right: string | null): string | null {
  if (!left) return right;
  if (!right) return left;
  return left > right ? left : right;
}
