"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useEntitlement } from "@/features/account/useEntitlement";
import { defaultPersistedState, loadPersistedState } from "@/lib/persistence/storage";

export function AccountPlanNotesClient() {
  const { entitlement, loading, signedIn } = useEntitlement();
  const isPro = entitlement.plan === "pro";
  const [localRecordCount, setLocalRecordCount] = useState(0);

  useEffect(() => {
    const persisted = loadPersistedState() ?? defaultPersistedState();
    const dates = new Set([...Object.keys(persisted.dailyHistoryByDate), ...Object.keys(persisted.archiveHistoryByDate)]);
    setLocalRecordCount(dates.size);
  }, []);

  if (loading) {
    return (
      <article className="surface account-card account-action-card">
        <p className="eyebrow">Account</p>
        <h2>Checking your atlas.</h2>
        <p>Refreshing your membership and saved-run tools.</p>
      </article>
    );
  }

  const billingTitle = isPro ? "Manage billing" : signedIn ? "Upgrade access" : "Compare plans";
  const billingCopy = isPro ? "Plan controls and receipts." : "Full archive, full practice, advanced stats.";
  const billingAction = isPro ? "Manage billing" : signedIn ? "Upgrade to Pro" : "View plans";

  return (
    <section className="account-actions-grid" aria-label="Account actions" role="region">
      <article className="surface account-card account-action-card">
        <p className="eyebrow">Saved stats</p>
        <h2>{signedIn ? "Saved runs" : "Local record"}</h2>
        <p>{signedIn ? "Scores, streaks, imports." : "Browser-saved scores."}</p>
        <span className="account-action-stat">
          {localRecordCount} local record{localRecordCount === 1 ? "" : "s"}
        </span>
        <Link className="button-secondary" href="/account/stats">
          Open stats
        </Link>
      </article>

      <article className="surface account-card account-action-card">
        <p className="eyebrow">Past Games</p>
        <h2>Review results</h2>
        <p>Past Mystery Maps and saved runs.</p>
        <Link className="button-secondary" href="/archive/worldprint">
          Open Past Games
        </Link>
      </article>

      <article className="surface account-card account-action-card">
        <p className="eyebrow">Practice Atlas</p>
        <h2>Train a topic</h2>
        <p>Warm up by topic and difficulty.</p>
        <Link className="button-secondary" href="/play/worldprint">
          Start practice
        </Link>
      </article>

      <article className="surface account-card account-action-card">
        <p className="eyebrow">{billingTitle}</p>
        <h2>{isPro ? "Pro controls" : "Full atlas"}</h2>
        <p>{billingCopy}</p>
        <Link className={isPro ? "button-secondary" : "button"} href="/upgrade">
          {billingAction}
        </Link>
      </article>
    </section>
  );
}
