"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useEntitlement } from "@/features/account/useEntitlement";
import { publicBillingEnabled } from "@/lib/billing/publicBillingConfig";
import { defaultPersistedState, loadPersistedState } from "@/lib/persistence/storage";
import { trackAnalyticsEvent } from "@/lib/site/analytics";

function trackUpgradeNavigation(itemId: string) {
  trackAnalyticsEvent("cgy_select_content", {
    content_type: "upgrade_cta",
    item_id: itemId
  });
}

export function AccountPlanNotesClient() {
  const { entitlement, loading, signedIn } = useEntitlement();
  const isPro = entitlement.plan === "pro";
  const billingEnabled = publicBillingEnabled();
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

  const billingTitle = isPro ? "Manage billing" : billingEnabled ? (signedIn ? "Upgrade access" : "Compare plans") : "Billing setup";
  const billingCopy = isPro
    ? "Plan controls and receipts."
    : billingEnabled
      ? "Mystery Map Custom Atlas, Pattern Atlas Pattern Runs, Past Games archive, advanced stats."
      : "Pro checkout needs billing setup in this environment. Free play still works while setup is unavailable.";
  const billingAction = isPro ? "Manage billing" : billingEnabled ? (signedIn ? "Upgrade to Pro" : "View plans") : "View Pro plans";

  if (!signedIn) {
    return (
      <section className="account-actions-grid" aria-label="Account actions" role="region">
        <article className="surface account-card account-action-card">
          <p className="eyebrow">Can You Geo? Pro</p>
          <h2>Open the whole atlas.</h2>
          <p>Mystery Map Custom Atlas, Pattern Atlas Pattern Runs, complete Past Games archive, advanced stats, and future premium surfaces.</p>
          <Link className="button" href="/upgrade" onClick={() => trackUpgradeNavigation("account_notes_signed_out_start_pro")}>
            Start Pro
          </Link>
        </article>

        <article className="surface account-card account-action-card">
          <p className="eyebrow">Free account</p>
          <h2>Continue free.</h2>
          <p>Free needs no card and includes Daily games with saved progress, streaks, and basic stats where supported.</p>
          <span className="account-action-stat">
            {localRecordCount} browser record{localRecordCount === 1 ? "" : "s"}
          </span>
          <Link className="button-secondary" href="/play">
            Explore games
          </Link>
          <Link className="button-secondary" href="/sign-in">
            Sign in free
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
        <Link className="button-secondary" href="/account/stats#saved-stats">
          Open stats
        </Link>
      </article>

      <article className="surface account-card account-action-card">
        <p className="eyebrow">Past Games</p>
        <h2>Review results</h2>
        <p>Mystery Map Daily replays and saved runs.</p>
        <Link className="button-secondary" href="/past-games">
          Open Past Games
        </Link>
      </article>

      <article className="surface account-card account-action-card">
        <p className="eyebrow">Mystery Map practice</p>
        <h2>Train a topic</h2>
        <p>Custom Atlas sets by topic and difficulty.</p>
        <Link className="button-secondary" href="/play/mystery-map">
          Start Custom Atlas
        </Link>
      </article>

      <article className="surface account-card account-action-card">
        <p className="eyebrow">{billingTitle}</p>
        <h2>{isPro ? "Pro controls" : "Full atlas"}</h2>
        <p>{billingCopy}</p>
        <Link
          className={isPro ? "button-secondary" : "button"}
          href="/upgrade"
          onClick={() => {
            if (!isPro) trackUpgradeNavigation("account_notes_upgrade");
          }}
        >
          {billingAction}
        </Link>
      </article>
    </section>
  );
}
