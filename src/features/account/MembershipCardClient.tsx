"use client";

import Link from "next/link";
import { BillingActionsClient } from "@/features/account/BillingActionsClient";
import { membershipDisplay } from "@/features/account/subscriptionDisplay";
import { useEntitlement } from "@/features/account/useEntitlement";
import { archiveAccessLabel, practiceAccessLabel, statsAccessLabel } from "@/lib/account/accessCopy";

export function MembershipCardClient() {
  const { entitlement, loading, error, signedIn } = useEntitlement();
  const { capabilities } = entitlement;
  const membership = membershipDisplay(entitlement, loading);
  const heading = signedIn || loading ? membership.heading : "Sample Run";

  return (
    <article className="surface account-card membership-card" id="membership" aria-label="Membership plan">
      <div>
        <p className="eyebrow">Membership</p>
        <h2>{heading}</h2>
        <p>{membership.body}</p>
      </div>
      <dl className="account-status-list account-mini-status">
        <div>
          <dt>Status</dt>
          <dd>{loading ? "Checking" : membership.detail}</dd>
        </div>
        <div>
          <dt>Practice</dt>
          <dd>{practiceAccessLabel(entitlement)}</dd>
        </div>
        <div>
          <dt>Past Games</dt>
          <dd>{archiveAccessLabel(entitlement)}</dd>
        </div>
        <div>
          <dt>Stats</dt>
          <dd>{statsAccessLabel(entitlement)}</dd>
        </div>
      </dl>
      <div className="membership-unlocks" aria-label="Unlocked today">
        <span>{signedIn ? "Daily games where supported" : "Sample runs"}</span>
        <span>{capabilities.canSaveStats ? "Saved progress" : "Browser-only progress"}</span>
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
          ? "Can You Geo? Pro membership is enabled. Deeper trends and Challenge history can appear here as the atlas grows."
          : "Free stats keep supported Daily scores and streaks. Pro adds full history, richer trends, and Challenge comparisons later."}
      </p>
      <Link className={hasAdvancedStats ? "button-secondary" : "button"} href="/upgrade">
        {hasAdvancedStats ? "Manage plan" : "See full atlas plan"}
      </Link>
    </article>
  );
}
