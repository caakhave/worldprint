"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PlayerStatsPanel } from "@/features/worldprint/PlayerStatsPanel";
import {
  fetchRemoteStats,
  syncLocalStatsToSupabase,
  syncMarkerKey,
  statsSyncSignature
} from "@/lib/account/sync";
import { buildLocalPlayerStats } from "@/lib/persistence/playerStats";
import { defaultPersistedState, loadPersistedState, type PersistedState } from "@/lib/persistence/storage";
import type { UserStatsRow } from "@/lib/supabase/database";
import { useSupabaseAccount } from "@/features/account/useSupabaseAccount";

function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return "None";
  return value.toLocaleString("en-US");
}

function AccountRemoteStatsPanel({ stats }: { stats: UserStatsRow }) {
  return (
    <section className="stats-panel surface player-stats-panel account-remote-stats" aria-label="Your stats">
      <div className="player-stats-heading">
        <p className="eyebrow">Your stats</p>
        <h2>Saved to your account.</h2>
      </div>
      <dl className="summary-stats player-stats-grid">
        <div>
          <dt>Maps played</dt>
          <dd>{formatNumber(stats.maps_played)}</dd>
        </div>
        <div>
          <dt>Daily runs</dt>
          <dd>{formatNumber(stats.daily_runs_completed)}</dd>
        </div>
        <div>
          <dt>Correct answers</dt>
          <dd>{formatNumber(stats.correct_answers)}</dd>
        </div>
        <div>
          <dt>Total points</dt>
          <dd>{formatNumber(stats.total_score)}</dd>
        </div>
        <div>
          <dt>Best round</dt>
          <dd>{formatNumber(stats.best_round_score)}</dd>
        </div>
        <div>
          <dt>Current streak</dt>
          <dd>{formatNumber(stats.current_daily_streak)}</dd>
        </div>
      </dl>
      <p className="player-stats-note">
        Account sync is active. Last Daily saved: {stats.last_played_daily_date ?? "None yet"}.
      </p>
    </section>
  );
}

export function AccountStatsClient() {
  const [store, setStore] = useState<PersistedState>(() => defaultPersistedState());
  const [storeLoaded, setStoreLoaded] = useState(false);
  const [remoteStats, setRemoteStats] = useState<UserStatsRow | null>(null);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string>("");
  const [syncError, setSyncError] = useState<string>("");
  const [syncing, setSyncing] = useState(false);
  const { client, configured, loading, user } = useSupabaseAccount();
  const localStats = useMemo(() => buildLocalPlayerStats(store), [store]);
  const signature = useMemo(() => statsSyncSignature(store), [store]);
  const hasLocalHistory = localStats.gamesCompleted > 0;

  useEffect(() => {
    setStore(loadPersistedState());
    setStoreLoaded(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadRemoteStats() {
      if (!client || !user) {
        setRemoteStats(null);
        return;
      }
      setRemoteLoading(true);
      const result = await fetchRemoteStats(client, user.id);
      if (cancelled) return;
      if (result.error) {
        setSyncError(result.error);
      } else {
        setRemoteStats(result.data);
      }
      setRemoteLoading(false);
    }
    void loadRemoteStats();
    return () => {
      cancelled = true;
    };
  }, [client, user]);

  useEffect(() => {
    if (!user || !storeLoaded) return;
    const existingMarker = window.localStorage.getItem(syncMarkerKey(user.id));
    if (existingMarker === signature && hasLocalHistory) {
      setSyncStatus("This device's current stats are already saved to your account.");
    }
  }, [hasLocalHistory, signature, storeLoaded, user]);

  async function syncStats() {
    if (!client || !user) {
      setSyncError("Sign in before saving stats to your account.");
      return;
    }
    if (!hasLocalHistory) {
      setSyncStatus("Finish a Daily, Past Game, or Challenge before syncing stats.");
      return;
    }
    const markerKey = syncMarkerKey(user.id);
    if (window.localStorage.getItem(markerKey) === signature) {
      setSyncStatus("This device's current stats are already saved to your account.");
      return;
    }
    setSyncing(true);
    setSyncError("");
    setSyncStatus("");
    const latestRemote = await fetchRemoteStats(client, user.id);
    if (latestRemote.error) {
      setSyncing(false);
      setSyncError(latestRemote.error);
      return;
    }
    const result = await syncLocalStatsToSupabase(client, user.id, store, latestRemote.data);
    setSyncing(false);
    if (result.error || !result.data) {
      setSyncError(result.error ?? "Could not save stats.");
      return;
    }
    setRemoteStats(result.data);
    window.localStorage.setItem(markerKey, result.signature);
    setSyncStatus("Saved this device's stats to your account.");
  }

  return (
    <div className="account-stats-stack">
      {user && remoteStats ? <AccountRemoteStatsPanel stats={remoteStats} /> : <PlayerStatsPanel store={store} landmark={false} />}

      <section className="surface account-card account-sync-card" aria-label="Account stats sync">
        <p className="eyebrow">Stats sync</p>
        {loading || remoteLoading ? (
          <>
            <h2>Checking account stats.</h2>
            <p>Looking for saved stats on this account.</p>
          </>
        ) : user ? (
          <>
            <h2>Save this device&apos;s stats to your account.</h2>
            <p>
              This copies this browser&apos;s completed Daily, Past Games, and Challenge stats into your account. It does not change scoring
              or require login to play.
            </p>
            <button className="button" type="button" onClick={() => void syncStats()} disabled={syncing || !hasLocalHistory}>
              {syncing ? "Saving..." : "Save this device's stats"}
            </button>
          </>
        ) : configured ? (
          <>
            <h2>Create a free account to save your streak.</h2>
            <p>Your local stats are still shown above. Sign in when you want to save them to an account.</p>
            <Link className="button" href="/sign-in">
              Save your score and streak
            </Link>
          </>
        ) : (
          <>
            <h2>Email sign-in is unavailable in this preview.</h2>
            <p>Local stats still work in this browser.</p>
          </>
        )}
        {syncStatus ? (
          <p className="status-live" role="status">
            {syncStatus}
          </p>
        ) : null}
        {syncError ? (
          <p className="account-error" role="alert">
            {syncError}
          </p>
        ) : null}
      </section>
    </div>
  );
}
