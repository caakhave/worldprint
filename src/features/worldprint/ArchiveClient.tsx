"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useEntitlement } from "@/features/account/useEntitlement";
import { useSupabaseAccount } from "@/features/account/useSupabaseAccount";
import { archiveDateRange, publicArchiveEntries, visibleArchiveEntries } from "@/features/worldprint/archiveAccess";
import { PlayerStatsPanel } from "@/features/worldprint/PlayerStatsPanel";
import { fetchRemoteRunSummaries } from "@/lib/account/sync";
import { loadDailyIndex } from "@/lib/content/loaders";
import type { DailyIndex, DailyIndexEntry } from "@/lib/content/schemas";
import { challengeNumber, utcDateKey } from "@/lib/game/daily";
import { TIER_CONFIGS } from "@/lib/game/scoring";
import { defaultPersistedState, loadPersistedState, type CompletionHistory, type PersistedState } from "@/lib/persistence/storage";
import type { GameRunRow } from "@/lib/supabase/database";

function mixLabel(mix: Record<string, number>) {
  return Object.entries(mix)
    .map(([key, count]) => (count > 1 ? `${key} x${count}` : key))
    .join(", ");
}

function completionForDate(store: PersistedState, dateKey: string): CompletionHistory | null {
  return store.dailyHistoryByDate[dateKey] ?? store.archiveHistoryByDate[dateKey] ?? null;
}

function ArchiveCard({
  entry,
  todayKey,
  completion,
  accountRun
}: {
  entry: DailyIndexEntry;
  todayKey: string;
  completion: CompletionHistory | null;
  accountRun: GameRunRow | null;
}) {
  const isToday = entry.date === todayKey;
  const status = completion
    ? `${completion.bestScore.toLocaleString("en-US")} points · ${TIER_CONFIGS[completion.tier].shortLabel}${accountRun ? " · account saved" : " · local"}`
    : accountRun
      ? `${accountRun.total_score.toLocaleString("en-US")} points · saved to account`
      : "Unplayed on this browser";
  return (
    <article className="archive-card" data-today={isToday ? "true" : "false"} data-completed={completion ? "true" : "false"}>
      <div className="archive-card-heading">
        <div>
          <span>{isToday ? "Today" : `Mystery Map Daily #${challengeNumber(entry.date)}`}</span>
          <h2>{entry.date}</h2>
        </div>
        <strong>{entry.roundCount} maps</strong>
      </div>
      <dl className="archive-meta">
        <div>
          <dt>Categories</dt>
          <dd>{mixLabel(entry.categoryMix)}</dd>
        </div>
        <div>
          <dt>Map difficulty</dt>
          <dd>{mixLabel(entry.mapDifficultyMix)}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{status}</dd>
        </div>
      </dl>
      <Link className={completion ? "button-secondary" : "button"} href={`/play/worldprint/${entry.date}`}>
        {completion ? "Review / Replay" : "Play"}
      </Link>
    </article>
  );
}

export function ArchiveClient() {
  const [index, setIndex] = useState<DailyIndex | null>(null);
  const [store, setStore] = useState<PersistedState>(() => defaultPersistedState());
  const [accountRuns, setAccountRuns] = useState<GameRunRow[]>([]);
  const [error, setError] = useState("");
  const todayKey = utcDateKey(new Date());
  const { entitlement, loading: entitlementLoading, signedIn } = useEntitlement();
  const account = useSupabaseAccount();

  useEffect(() => {
    setStore(loadPersistedState());
    loadDailyIndex()
      .then(setIndex)
      .catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : "Could not load past games"));
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadAccountRuns() {
      if (!account.client || !account.user) {
        setAccountRuns([]);
        return;
      }
      const result = await fetchRemoteRunSummaries(account.client, account.user.id);
      if (cancelled) return;
      setAccountRuns(result.error ? [] : result.data);
    }
    void loadAccountRuns();
    return () => {
      cancelled = true;
    };
  }, [account.client, account.user]);

  const entries = useMemo(() => {
    if (!index) return [];
    return publicArchiveEntries(index.dates, todayKey);
  }, [index, todayKey]);
  const visibleEntries = useMemo(
    () => visibleArchiveEntries(entries, store, entitlement.capabilities.archiveLimitDays),
    [entries, entitlement.capabilities.archiveLimitDays, store]
  );
  const publicRange = archiveDateRange(entries);
  const hiddenCount = Math.max(0, entries.length - visibleEntries.length);
  const accountRunByDate = useMemo(() => {
    const byDate = new Map<string, GameRunRow>();
    for (const run of accountRuns) {
      if ((run.mode === "daily" || run.mode === "archive") && run.daily_date && !byDate.has(run.daily_date)) {
        byDate.set(run.daily_date, run);
      }
    }
    return byDate;
  }, [accountRuns]);

  if (error) {
    return (
      <section className="archive-page page-shell">
        <div className="empty-state surface">
          <p className="eyebrow">Past games unavailable</p>
          <h1>Past games did not load.</h1>
          <p>{error}</p>
        </div>
      </section>
    );
  }

  if (!index) {
    return (
      <section className="archive-page page-shell">
        <div className="empty-state surface">
          <h1>Loading past games…</h1>
          <p>Finding recent Mystery Map Dailies.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="archive-page page-shell">
      <div className="archive-hero">
        <p className="eyebrow">Past Games</p>
        <h1 className="page-title">Replay recent Mystery Maps.</h1>
        <p className="lead">
          Missed a day? Replay recent Daily Mystery Maps
          {publicRange ? ` from ${publicRange.start} to ${publicRange.end}` : ""}. For now, completed days are saved in this browser only.
        </p>
      </div>
      <div className="archive-note surface">
        <strong>Past games do not change today&apos;s streak.</strong>
        <span>Today&apos;s Daily still updates the live streak; replayed days save only local history.</span>
      </div>
      {hiddenCount > 0 ? (
        <div className="archive-upgrade-panel surface" aria-label="Full archive access">
          <div>
            <p className="eyebrow">{entitlementLoading ? "Checking access" : "Full archive"}</p>
            <h2>
              {entitlement.plan === "pro"
                ? "Full archive access is active."
                : signedIn
                  ? "Your account can replay recent Past Games."
                  : "Create a free account to save your progress."}
            </h2>
            <p>
              {entitlement.plan === "pro"
                ? `Showing ${visibleEntries.length} Past Games from the atlas.`
                : `Showing ${visibleEntries.length} recent Past Games. Pro will unlock the complete archive with ${hiddenCount} more Mystery Map${
                    hiddenCount === 1 ? "" : "s"
                  }.`}
            </p>
          </div>
          <Link className="button-secondary" href={signedIn ? "/upgrade" : "/sign-in"}>
            {signedIn ? "See full atlas plan" : "Create a free account"}
          </Link>
        </div>
      ) : null}
      <PlayerStatsPanel store={store} compact />
      <div className="archive-grid" aria-label="Past Mystery Map Dailies">
        {visibleEntries.map((entry) => (
          <ArchiveCard
            key={entry.date}
            entry={entry}
            todayKey={todayKey}
            completion={completionForDate(store, entry.date)}
            accountRun={accountRunByDate.get(entry.date) ?? null}
          />
        ))}
      </div>
    </section>
  );
}
