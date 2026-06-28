"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PlayerStatsPanel } from "@/features/worldprint/PlayerStatsPanel";
import {
  buildAccountStatsFromCloudRuns,
  fetchRemoteRunSummaries,
  syncLocalRunsToSupabase,
  syncMarkerKey,
  statsSyncSignature,
  type AccountCloudStats
} from "@/lib/account/sync";
import { buildLocalPlayerStats } from "@/lib/persistence/playerStats";
import { defaultPersistedState, loadPersistedState, type PersistedState } from "@/lib/persistence/storage";
import { useSupabaseAccount } from "@/features/account/useSupabaseAccount";
import { ACCESS_PLAN_COPY } from "@/lib/account/accessCopy";

function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return "None";
  return value.toLocaleString("en-US");
}

function AccountRemoteStatsPanel({ stats }: { stats: AccountCloudStats }) {
  return (
    <section className="stats-panel surface player-stats-panel account-remote-stats" aria-label="Your stats">
      <div className="player-stats-heading">
        <p className="eyebrow">Your stats</p>
        <h2>Saved to your account.</h2>
      </div>
      <dl className="summary-stats player-stats-grid">
        <div>
          <dt>Runs saved</dt>
          <dd>{formatNumber(stats.games_completed)}</dd>
        </div>
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
      {stats.recent_runs.length ? (
        <div className="player-stats-recent">
          <strong>Recent account saves</strong>
          <ul>
            {stats.recent_runs.map((run) => (
              <li key={run.client_run_key ?? `${run.mode}:${run.completed_at}`}>
                <span>{run.label}</span>
                <small>
                  {formatNumber(run.total_score)} points · {run.maps_played} maps
                </small>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <p className="player-stats-note">
        Account sync is active. Daily: {stats.daily_games}. Practice: {stats.practice_games}. Past Games: {stats.archive_games}.
        Challenges: {stats.challenge_games}.
      </p>
    </section>
  );
}

function AccountEmptyStatsPanel({ hasLocalHistory }: { hasLocalHistory: boolean }) {
  return (
    <section className="stats-panel surface player-stats-panel account-remote-stats" aria-label="Your stats">
      <div className="player-stats-heading">
        <p className="eyebrow">Account stats</p>
        <h2>No account-saved runs yet.</h2>
      </div>
      <p className="player-stats-empty">
        {hasLocalHistory
          ? "This browser has completed runs ready to import into your account."
          : "Complete a Daily, Practice run, Past Game, or Challenge while signed in and it will appear here."}
      </p>
      <p className="player-stats-note">Signed in. Account stats are private to you; no leaderboard or public profile.</p>
    </section>
  );
}

export function AccountStatsClient() {
  const [store, setStore] = useState<PersistedState>(() => defaultPersistedState());
  const [storeLoaded, setStoreLoaded] = useState(false);
  const [remoteStats, setRemoteStats] = useState<AccountCloudStats | null>(null);
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
      const result = await fetchRemoteRunSummaries(client, user.id);
      if (cancelled) return;
      if (result.error) {
        console.warn("[Can You Geo] Account stats load failed.", result.error);
        setSyncError("We could not load account-saved runs. Local stats are still safe on this device.");
      } else {
        setRemoteStats(result.data.length ? buildAccountStatsFromCloudRuns(user.id, result.data) : null);
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
      setSyncStatus("Local runs from this browser are already in your account.");
    }
  }, [hasLocalHistory, signature, storeLoaded, user]);

  async function syncStats() {
    if (!client || !user) {
      setSyncError("Sign in before saving stats to your account.");
      return;
    }
    if (!hasLocalHistory) {
      setSyncStatus("No completed local runs are ready to import from this browser.");
      return;
    }
    const markerKey = syncMarkerKey(user.id);
    if (window.localStorage.getItem(markerKey) === signature) {
      setSyncStatus("Local runs from this browser are already in your account.");
      return;
    }
    setSyncing(true);
    setSyncError("");
    setSyncStatus("");
    const result = await syncLocalRunsToSupabase(client, user.id, store);
    setSyncing(false);
    if (result.error || !result.data) {
      console.warn("[Can You Geo] Account stats sync failed.", result.error ?? "No synced data returned.");
      setSyncError("We could not import these runs yet. They are still saved locally in this browser.");
      return;
    }
    setRemoteStats(result.data);
    window.localStorage.setItem(markerKey, result.signature);
    setSyncStatus(`Imported ${result.syncedRuns} completed run${result.syncedRuns === 1 ? "" : "s"} into your account.`);
  }

  const alreadyImported = syncStatus.toLowerCase().includes("already in your account");
  const importButtonLabel = syncing
    ? "Importing..."
    : !hasLocalHistory
      ? "No local runs to import"
      : alreadyImported
        ? "Already imported"
        : "Import local runs";

  return (
    <div className="account-stats-stack">
      {user ? (
        remoteStats ? (
          <AccountRemoteStatsPanel stats={remoteStats} />
        ) : (
          <AccountEmptyStatsPanel hasLocalHistory={hasLocalHistory} />
        )
      ) : (
        <PlayerStatsPanel store={store} landmark={false} />
      )}

      <section className="surface account-card account-sync-card" aria-label="Account stats sync">
        <p className="eyebrow">Stats sync</p>
        {loading || remoteLoading ? (
          <>
            <h2>Checking account stats.</h2>
            <p>Looking for saved stats on this account.</p>
          </>
        ) : user ? (
          <>
            <h2>Import local runs</h2>
            <p>Move completed runs from this browser into your account. Existing account saves are deduped, and local play still works.</p>
            <button
              className={hasLocalHistory && !alreadyImported ? "button" : "button-secondary"}
              type="button"
              onClick={() => void syncStats()}
              disabled={syncing || !hasLocalHistory || alreadyImported}
            >
              {importButtonLabel}
            </button>
          </>
        ) : configured ? (
          <>
            <h2>Create a free account.</h2>
            <p>{ACCESS_PLAN_COPY.guest.summary} Local sample-play stats are still shown above.</p>
            <Link className="button" href="/sign-in">
              Create a free account
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
