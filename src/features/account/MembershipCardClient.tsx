"use client";

import Link from "next/link";
import { BillingActionsClient } from "@/features/account/BillingActionsClient";
import { useEntitlement } from "@/features/account/useEntitlement";
import { planLabel, statusLabel } from "@/lib/account/entitlements";

export function MembershipCardClient() {
  const { entitlement, loading, error, signedIn } = useEntitlement();
  const { capabilities } = entitlement;
  const isPro = entitlement.plan === "pro";
  const heading = loading ? "Checking access." : signedIn ? planLabel(entitlement.plan) : "Playing without an account";

  return (
    <article className="surface account-card membership-card" aria-label="Membership plan">
      <div>
        <p className="eyebrow">Membership</p>
        <h2>{heading}</h2>
        <p>
          {isPro
            ? "Full atlas access is active on this account."
            : signedIn
              ? "Your free account can save stats and play the daily while the paid atlas takes shape."
              : "You can play today and keep local stats in this browser."}
        </p>
      </div>
      <dl className="account-status-list account-mini-status">
        <div>
          <dt>Status</dt>
          <dd>{loading ? "Checking" : statusLabel(entitlement.status)}</dd>
        </div>
        <div>
          <dt>Practice</dt>
          <dd>{capabilities.canUseFullPractice ? "Full atlas practice" : `${capabilities.practiceLimit ?? 3}-map warm-ups`}</dd>
        </div>
        <div>
          <dt>Past Games</dt>
          <dd>{capabilities.canUseFullArchive ? "Complete archive" : `${capabilities.archiveLimitDays ?? 14} recent days`}</dd>
        </div>
        <div>
          <dt>Stats</dt>
          <dd>{capabilities.canViewAdvancedStats ? "Advanced stats unlocked" : capabilities.canSaveStats ? "Saved stats" : "Local stats"}</dd>
        </div>
      </dl>
      <div className="membership-unlocks" aria-label="Unlocked today">
        <span>Daily Mystery Map</span>
        <span>{capabilities.canSaveStats ? "Saved stats" : "Local stats"}</span>
        <span>{capabilities.canCreateChallenges ? "Basic challenges" : "Challenge links later"}</span>
      </div>
      {error ? <p className="account-error">We could not refresh your membership details. You can keep playing.</p> : null}
      <BillingActionsClient entitlement={entitlement} context="account" />
    </article>
  );
}

export function AdvancedStatsGateClient() {
  const { entitlement, loading } = useEntitlement();
  const hasAdvancedStats = entitlement.capabilities.canViewAdvancedStats;

  return (
    <article className="surface account-card membership-card" aria-label="Advanced stats access">
      <p className="eyebrow">Advanced stats</p>
      <h2>{loading ? "Checking stats access." : hasAdvancedStats ? "Advanced stats unlocked." : "Deeper reads are coming."}</h2>
      <p>
        {hasAdvancedStats
          ? "Pro is active. Deeper trends and Challenge history can appear here as the atlas grows."
          : "Free stats keep your score and streak. Pro will add full history, richer trends, and Challenge comparisons later."}
      </p>
      <Link className={hasAdvancedStats ? "button-secondary" : "button"} href="/upgrade">
        {hasAdvancedStats ? "View plan" : "See full atlas plan"}
      </Link>
    </article>
  );
}
