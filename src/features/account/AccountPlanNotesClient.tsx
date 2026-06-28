"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useEntitlement } from "@/features/account/useEntitlement";
import { ACCESS_PLAN_COPY } from "@/lib/account/accessCopy";
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
  const billingCopy = isPro ? "Plan controls and receipts." : "Full Practice Atlas, complete Past Games archive, advanced stats.";
  const billingAction = isPro ? "Manage billing" : signedIn ? "Upgrade to Pro" : "View plans";

  if (!signedIn) {
    return (
      <section className="account-actions-grid" aria-label="Account actions" role="region">
        <article className="surface account-card account-action-card">
          <p className="eyebrow">Free account</p>
          <h2>Official 5-map Daily</h2>
          <p>{ACCESS_PLAN_COPY.guest.summary}</p>
          <Link className="button" href="/sign-in">
            Create a free account
          </Link>
        </article>

        <article className="surface account-card account-action-card">
          <p className="eyebrow">Sample play</p>
          <h2>Try sample play</h2>
          <p>Sample maps let you feel the game before creating an account.</p>
          <span className="account-action-stat">
            {localRecordCount} browser record{localRecordCount === 1 ? "" : "s"}
          </span>
          <Link className="button-secondary" href="/play/mystery-map">
            Try sample play
          </Link>
        </article>
      </section>
    );
  }

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
        <p>Dated Daily replays and saved runs.</p>
        <Link className="button-secondary" href="/past-games">
          Open Past Games
        </Link>
      </article>

      <article className="surface account-card account-action-card">
        <p className="eyebrow">Practice Atlas</p>
        <h2>Train a topic</h2>
        <p>3-map training sets by topic and difficulty.</p>
        <Link className="button-secondary" href="/play/mystery-map">
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
