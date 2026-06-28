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
import { challengeNumber } from "@/lib/game/daily";
import { localDateKey } from "@/lib/game/retention";
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

function formatReplayDate(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(date);
}

function recordRankTitle(score: number | null, roundCount: number): string {
  if (score === null) return "Mission open";
  const ratio = score / Math.max(1, roundCount * 1000);
  if (ratio >= 0.92) return "Atlas Master";
  if (ratio >= 0.76) return "Pattern Hunter";
  if (ratio >= 0.52) return "Atlas Reader";
  return "Signal Seeker";
}

export function ArchiveCard({
  entry,
  todayKey,
  completion,
  accountRun,
  signedIn = true
}: {
  entry: DailyIndexEntry;
  todayKey: string;
  completion: CompletionHistory | null;
  accountRun: GameRunRow | null;
  signedIn?: boolean;
}) {
  const isToday = entry.date === todayKey;
  const hasCompletion = Boolean(completion || accountRun);
  const bestScore = accountRun?.total_score ?? completion?.bestScore ?? null;
  const savedTier = accountRun?.tier ?? completion?.tier ?? null;
  const tierLabel = isTierKey(savedTier) ? TIER_CONFIGS[savedTier].shortLabel : hasCompletion ? "Unknown tier" : "Choose on setup";
  const savedDate = formatSavedDate(accountRun?.completed_at ?? completion?.completedAt);
  const status = accountRun ? "Saved to account" : completion ? "Saved on this browser" : signedIn ? "Unplayed" : "Sign in to save";
  const actionLabel = hasCompletion ? "View result" : signedIn ? "Start dated replay" : "Create free account";
  const dailyNumber = challengeNumber(entry.date);
  const replayTitle = `Mystery Map Daily #${dailyNumber}`;
  const recordTitle = hasCompletion ? recordRankTitle(bestScore, entry.roundCount) : replayTitle;
  const replayDate = formatReplayDate(entry.date);
  const roundScores = completion?.roundScores ?? null;
  const cleanRoundCount = roundScores ? roundScores.filter((score) => score >= 1000).length : null;
  const savedLabel = savedDate ?? (signedIn ? "Not saved yet" : "Sign in to save");
  return (
    <article className="archive-card" data-today={isToday ? "true" : "false"} data-completed={hasCompletion ? "true" : "false"}>
      <div className="archive-card-signal" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
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
            <span className="archive-status-pill" data-status={hasCompletion ? "saved" : signedIn ? "unplayed" : "account"}>
              {status}
            </span>
          </dd>
        </div>
      </dl>
      <div className="archive-record-stamp" data-state={hasCompletion ? "saved" : "mission"}>
        <span>{hasCompletion ? "Saved result" : "Dated replay"}</span>
        <strong>{recordTitle}</strong>
        <p>{hasCompletion ? "Review your saved result or replay for practice." : `Replay the fixed ${entry.roundCount}-map set from ${replayDate}.`}</p>
      </div>
      <dl className="archive-record-meta" aria-label="Record details">
        <div>
          <dt>Best score</dt>
          <dd>{bestScore === null ? (signedIn ? "No record yet" : "Sign in to save") : `${bestScore.toLocaleString("en-US")} points`}</dd>
        </div>
        <div>
          <dt>Tier</dt>
          <dd>{tierLabel}</dd>
        </div>
        <div>
          <dt>{cleanRoundCount === null ? "Replay set" : "Clean maps"}</dt>
          <dd>{cleanRoundCount === null ? `${entry.roundCount} maps` : `${cleanRoundCount}/${entry.roundCount} clean`}</dd>
        </div>
        <div>
          <dt>Saved</dt>
          <dd>{savedLabel}</dd>
        </div>
      </dl>
      <div className="archive-card-action" data-state={hasCompletion ? "saved" : signedIn ? "open" : "guest"}>
        <Link className="button" href={hasCompletion ? `/play/mystery-map/${entry.date}?review=1` : signedIn ? `/play/mystery-map/${entry.date}` : "/sign-in"}>
          {actionLabel}
        </Link>
        {hasCompletion ? (
          <Link className="button-secondary" href={`/play/mystery-map/${entry.date}`}>
            Replay for practice
          </Link>
        ) : null}
        <p>
          {hasCompletion
            ? "Replay for practice. Today's Daily score will not change."
            : signedIn
              ? "Dated replay. Separate from today's Daily and streak."
              : "Create a free account to replay dated sets and save results."}
        </p>
      </div>
    </article>
  );
}

export function ArchiveClient() {
  const [index, setIndex] = useState<DailyIndex | null>(null);
  const [store, setStore] = useState<PersistedState>(() => defaultPersistedState());
  const [accountRuns, setAccountRuns] = useState<GameRunRow[]>([]);
  const [error, setError] = useState("");
  const todayKey = localDateKey(new Date());
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
    () => visibleArchiveEntries(entries, store, signedIn ? entitlement.capabilities.archiveLimitDays : 0),
    [entries, entitlement.capabilities.archiveLimitDays, signedIn, store]
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
      <section className="archive-page page-shell info-page-shell">
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
      <section className="archive-page page-shell info-page-shell">
        <div className="empty-state surface">
          <h1>Loading past games…</h1>
          <p>Finding recent Mystery Map Dailies.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="archive-page page-shell info-page-shell">
      <div className="archive-hero">
        <p className="eyebrow">Past Games</p>
        <h1 className="page-title">Review Past Mystery Maps.</h1>
        <p className="lead">
          Each past date is a fixed 5-map set{publicRange ? ` from ${publicRange.start} to ${publicRange.end}` : ""}. Review your result, replay for
          practice, or chase a personal best. Replays never change today&apos;s Daily score or streak.
        </p>
      </div>
      <div className="archive-note surface map-texture-panel">
        <strong>Past Games are separate from today&apos;s Daily.</strong>
        <span>
          {signedIn
            ? "Today's Free Daily updates the Daily score and streak; replayed dates save as Past Games for your account."
            : "Logged-out players can try the fixed 5-map Sample Run. Create a free account to replay dated sets and save Past Games history."}
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
                  : "Create a free account for saved Past Games."}
            </h2>
            <p>
              {entitlement.plan === "pro"
                ? `Showing ${visibleEntries.length} Past Games from the atlas.`
                : !signedIn
                  ? `Past Games require a free account. Pro unlocks the complete archive with ${hiddenCount} Mystery Map${hiddenCount === 1 ? "" : "s"}.`
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
      {signedIn ? (
        <PlayerStatsPanel store={store} compact note="Account-saved Past Games are marked on each card. This browser record stays available here too." />
      ) : (
        <div className="archive-account-panel surface map-texture-panel">
          <div>
            <p className="eyebrow">Free account</p>
            <h2>Sign in to keep Past Games history.</h2>
            <p>Free accounts can replay recent dated sets and save results. Sample Run remains the only guest play mode.</p>
          </div>
          <Link className="button" href="/sign-in">
            Create a free account
          </Link>
        </div>
      )}
      <div className="archive-grid" aria-label="Past Mystery Map Dailies">
        {visibleEntries.map((entry) => (
          <ArchiveCard
            key={entry.date}
            entry={entry}
            todayKey={todayKey}
            completion={completionForDate(store, entry.date)}
            accountRun={accountRunByDate.get(entry.date) ?? null}
            signedIn={signedIn}
          />
        ))}
      </div>
    </section>
  );
}
