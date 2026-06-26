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

type TierKey = keyof typeof TIER_CONFIGS;

function isTierKey(value: string | null | undefined): value is TierKey {
  return Boolean(value && value in TIER_CONFIGS);
}

function formatSavedDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

export function ArchiveCard({
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
  const hasCompletion = Boolean(completion || accountRun);
  const bestScore = accountRun?.total_score ?? completion?.bestScore ?? null;
  const savedTier = accountRun?.tier ?? completion?.tier ?? null;
  const tierLabel = isTierKey(savedTier) ? TIER_CONFIGS[savedTier].shortLabel : hasCompletion ? "Unknown tier" : "Choose on setup";
  const savedDate = formatSavedDate(accountRun?.completed_at ?? completion?.completedAt);
  const status = accountRun ? "Saved to account" : completion ? "Saved on this browser" : "Unplayed";
  const actionLabel = hasCompletion ? "View record" : "Play past map";
  return (
    <article className="archive-card" data-today={isToday ? "true" : "false"} data-completed={hasCompletion ? "true" : "false"}>
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
          <dd>
            <span className="archive-status-pill" data-status={hasCompletion ? "saved" : "unplayed"}>
              {status}
            </span>
          </dd>
        </div>
      </dl>
      <dl className="archive-record-meta" aria-label="Record details">
        <div>
          <dt>Best score</dt>
          <dd>{bestScore === null ? "No record yet" : `${bestScore.toLocaleString("en-US")} points`}</dd>
        </div>
        <div>
          <dt>Tier</dt>
          <dd>{tierLabel}</dd>
        </div>
        <div>
          <dt>Date saved</dt>
          <dd>{savedDate ?? "Not saved yet"}</dd>
        </div>
      </dl>
      <div className="archive-card-action">
        <Link className="button" href={`/play/worldprint/${entry.date}`}>
          {actionLabel}
        </Link>
        <p>{hasCompletion ? "Replay for better score." : "Fixed 5-map set. Fill this record slot."}</p>
      </div>
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
      if (result.error) {
        console.warn("[Can You Geo] Archive account-run load failed.", result.error);
        setAccountRuns([]);
        return;
      }
      setAccountRuns(result.data);
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
        <p className="eyebrow">Past Games · Replay Library</p>
        <h1 className="page-title">Build your Mystery Map record book.</h1>
        <p className="lead">
          Each past date is a fixed 5-map set
          {publicRange ? ` from ${publicRange.start} to ${publicRange.end}` : ""}. Replay one to fill the record, chase a better personal best, or review a
          map you missed. It never changes today&apos;s streak.
        </p>
      </div>
      <div className="archive-note surface">
        <strong>Past Games are replays, not today&apos;s live Daily.</strong>
        <span>
          Today&apos;s Mystery Map updates the live streak; replayed dates save as fixed Past Game records
          {signedIn ? " for this account when sync is available." : " in this browser."}
        </span>
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
      <PlayerStatsPanel
        store={store}
        compact
        note={
          signedIn
            ? "Account-saved Past Games are marked on each card. This browser record stays available here too."
            : "Local on this device. Sign in to save completed Past Games to your account."
        }
      />
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
