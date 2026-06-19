"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { loadDailyIndex } from "@/lib/content/loaders";
import type { DailyIndex, DailyIndexEntry } from "@/lib/content/schemas";
import { challengeNumber, utcDateKey } from "@/lib/game/daily";
import { TIER_CONFIGS } from "@/lib/game/scoring";
import { defaultPersistedState, loadPersistedState, type CompletionHistory, type PersistedState } from "@/lib/persistence/storage";

function mixLabel(mix: Record<string, number>) {
  return Object.entries(mix)
    .map(([key, count]) => (count > 1 ? `${key} x${count}` : key))
    .join(", ");
}

function completionForDate(store: PersistedState, dateKey: string): CompletionHistory | null {
  return store.dailyHistoryByDate[dateKey] ?? store.archiveHistoryByDate[dateKey] ?? null;
}

function ArchiveCard({ entry, todayKey, completion }: { entry: DailyIndexEntry; todayKey: string; completion: CompletionHistory | null }) {
  const isToday = entry.date === todayKey;
  return (
    <article className="archive-card" data-today={isToday ? "true" : "false"} data-completed={completion ? "true" : "false"}>
      <div className="archive-card-heading">
        <div>
          <span>{isToday ? "Today" : `Daily #${challengeNumber(entry.date)}`}</span>
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
            {completion
              ? `${completion.bestScore.toLocaleString("en-US")} points · ${TIER_CONFIGS[completion.tier].shortLabel}`
              : "Unplayed on this browser"}
          </dd>
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
  const [error, setError] = useState("");
  const todayKey = utcDateKey(new Date());

  useEffect(() => {
    setStore(loadPersistedState());
    loadDailyIndex()
      .then(setIndex)
      .catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : "Could not load archive index"));
  }, []);

  const entries = useMemo(() => {
    if (!index) return [];
    return [...index.dates].sort((left, right) => right.date.localeCompare(left.date));
  }, [index]);

  if (error) {
    return (
      <section className="archive-page page-shell">
        <div className="empty-state surface">
          <p className="eyebrow">Archive unavailable</p>
          <h1>Daily index did not load.</h1>
          <p>{error}</p>
        </div>
      </section>
    );
  }

  if (!index) {
    return (
      <section className="archive-page page-shell">
        <div className="empty-state surface">
          <h1>Loading archive</h1>
          <p>Reading generated Daily manifests.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="archive-page page-shell">
      <div className="archive-hero">
        <p className="eyebrow">WORLDPRINT Archive</p>
        <h1 className="page-title">Recent Daily games, frozen at build time.</h1>
        <p className="lead">
          Browse generated Dailies from {index.range.start} to {index.range.end}. Results are local to this browser; there is no account
          sync or leaderboard in this slice.
        </p>
      </div>
      <div className="archive-note surface">
        <strong>Archive plays do not change today&apos;s streak.</strong>
        <span>Today&apos;s Daily still updates the live streak; past and future archive plays save only local history.</span>
      </div>
      <div className="archive-grid" aria-label="Worldprint Daily archive">
        {entries.map((entry) => (
          <ArchiveCard key={entry.date} entry={entry} todayKey={todayKey} completion={completionForDate(store, entry.date)} />
        ))}
      </div>
    </section>
  );
}
