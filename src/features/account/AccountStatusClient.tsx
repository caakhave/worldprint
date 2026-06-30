"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { accountInitial, compactPlanLabel } from "@/features/account/accountDisplay";
import { membershipDisplay } from "@/features/account/subscriptionDisplay";
import { useEntitlement } from "@/features/account/useEntitlement";
import { useSupabaseAccount } from "@/features/account/useSupabaseAccount";
import { planLabel } from "@/lib/account/entitlements";
import { CONTACT_LINKS } from "@/lib/contact";

export function AccountStatusClient() {
  const router = useRouter();
  const { configured, loading, user, profileError, signOut } = useSupabaseAccount();
  const { entitlement, loading: entitlementLoading } = useEntitlement();
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [supportIdVisible, setSupportIdVisible] = useState(false);
  const [supportIdStatus, setSupportIdStatus] = useState("");

  async function handleSignOut() {
    const result = await signOut();
    if (result.error) {
      setSignOutError("We could not sign you out. Try again in a moment.");
      return;
    }
    setSignOutError(null);
    router.push("/sign-in?signedOut=1");
  }

  async function copySupportId() {
    if (!user) return;
    try {
      await navigator.clipboard?.writeText(user.id);
      setSupportIdStatus("Support ID copied.");
    } catch {
      setSupportIdStatus("Copy did not work. You can select the ID instead.");
    }
  }

  if (!configured) {
    return (
      <article className="surface account-card account-primary-card">
        <p className="eyebrow">Account status</p>
        <h2>Account sign-in is unavailable in this preview.</h2>
        <p>The 5-map Sample Run is available in this browser. The 3-map Free Daily and saved progress start with a free account.</p>
        <Link className="button-secondary" href="/play/mystery-map">
          Try Sample Run
        </Link>
      </article>
    );
  }

  if (loading) {
    return (
      <article className="surface account-card account-primary-card">
        <p className="eyebrow">Account status</p>
        <h2>Checking whether you&apos;re signed in.</h2>
        <p>Looking for a saved account on this device.</p>
      </article>
    );
  }

  if (!user) {
    return (
      <article className="surface account-card account-primary-card">
        <p className="eyebrow">Signed out</p>
        <h2>Start Pro or continue free.</h2>
        <p>Pro unlocks the full atlas. Free needs no card and still saves your 3-map Daily progress and basic stats.</p>
        <div className="button-row">
          <Link className="button" href="/upgrade">
            Start Pro
          </Link>
          <Link className="button-secondary" href="/sign-in">
            Continue free
          </Link>
        </div>
      </article>
    );
  }

  const membershipLabel = entitlementLoading ? "Checking" : planLabel(entitlement.plan);
  const compactMembershipLabel = entitlementLoading ? "Account" : compactPlanLabel(entitlement.plan);
  const membership = membershipDisplay(entitlement, entitlementLoading);
  const syncLabel = entitlementLoading ? "Checking sync" : entitlement.capabilities.canSaveStats ? "Account sync ready" : "Local stats only";
  const planActionLabel = entitlement.plan === "pro" ? "Manage plan" : "Compare plans";

  return (
    <article className="surface account-card account-primary-card account-summary-card">
      <div className="account-identity">
        <span className="account-avatar account-avatar-large" aria-hidden="true">
          {accountInitial(user.email)}
        </span>
        <div className="account-identity-copy">
          <p className="eyebrow">Player profile</p>
          <h2 className="account-identity-email">{user.email ?? "Signed-in player"}</h2>
          <div className="account-identity-badges" aria-label="Account status">
            <span className="account-plan-badge" data-plan={entitlementLoading ? "loading" : entitlement.plan}>
              {compactMembershipLabel}
            </span>
            <span>{membership.heading}</span>
          </div>
        </div>
      </div>
      <div className="account-summary-head">
        <p>Profile connected. Your scores, saved runs, and plan controls are ready.</p>
      </div>
      <dl className="account-status-list account-mini-status account-summary-list">
        <div>
          <dt>Membership</dt>
          <dd>
            {membershipLabel}
            <span>{membership.detail}</span>
          </dd>
        </div>
        <div>
          <dt>Stats sync</dt>
          <dd>
            {syncLabel}
            <span>Import local runs from your stats page.</span>
          </dd>
        </div>
      </dl>
      <div className="account-support-tools">
        <a className="button-subtle" href={CONTACT_LINKS.accountHelp.href}>
          Email support
        </a>
        <button className="button-subtle" type="button" onClick={() => setSupportIdVisible((visible) => !visible)}>
          {supportIdVisible ? "Hide support ID" : "Show support ID"}
        </button>
        {supportIdVisible ? (
          <div className="account-support-id" role="group" aria-label="Support ID">
            <code>{user.id}</code>
            <button className="button-subtle" type="button" onClick={() => void copySupportId()}>
              Copy support ID
            </button>
          </div>
        ) : null}
        {supportIdStatus ? (
          <p className="status-live" role="status">
            {supportIdStatus}
          </p>
        ) : null}
      </div>
      {profileError ? <p className="account-error">We could not refresh your account details. You can keep playing.</p> : null}
      {signOutError ? (
        <p className="account-error" role="alert">
          {signOutError}
        </p>
      ) : null}
      <div className="button-row">
        <Link className="button" href="/account/stats">
          View saved stats
        </Link>
        <Link className="button-secondary" href="/upgrade">
          {planActionLabel}
        </Link>
        <button className="button-secondary" type="button" onClick={() => void handleSignOut()}>
          Sign out
        </button>
      </div>
    </article>
  );
}
