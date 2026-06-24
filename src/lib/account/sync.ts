import type { User } from "@supabase/supabase-js";
import { buildLocalPlayerStats, type LocalPlayerStats } from "@/lib/persistence/playerStats";
import type { CompletionHistory, PersistedState } from "@/lib/persistence/storage";
import type { CanYouGeoSupabaseClient } from "@/lib/supabase/client";
import type { UserStatsRow } from "@/lib/supabase/database";

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

type SyncableHistory = Pick<CompletionHistory, "id" | "dateKey" | "mode" | "totalScore" | "bestScore" | "roundCount" | "lastPlayedAt">;

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

export async function syncLocalStatsToSupabase(
  client: CanYouGeoSupabaseClient,
  userId: string,
  store: PersistedState,
  remote: UserStatsRow | null
): Promise<{ data: AccountStatsSnapshot | null; error: string | null; signature: string }> {
  const signature = statsSyncSignature(store);
  const localSnapshot = localStatsSnapshotForUser(userId, store);
  const merged = mergeStatsSnapshot(remote, localSnapshot);
  const { data, error } = await client.from("user_stats").upsert(merged, { onConflict: "user_id" }).select("*").single();
  return { data: data ?? null, error: error?.message ?? null, signature };
}

function maxDateKey(left: string | null, right: string | null): string | null {
  if (!left) return right;
  if (!right) return left;
  return left > right ? left : right;
}
