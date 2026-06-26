"use client";

import Link from "next/link";
import { useState } from "react";
import { useEntitlement } from "@/features/account/useEntitlement";
import { useSupabaseAccount } from "@/features/account/useSupabaseAccount";
import { planLabel, statusLabel } from "@/lib/account/entitlements";

export function AccountStatusClient() {
  const { configured, loading, user, profileError, signOut } = useSupabaseAccount();
  const { entitlement, loading: entitlementLoading } = useEntitlement();
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [supportIdVisible, setSupportIdVisible] = useState(false);
  const [supportIdStatus, setSupportIdStatus] = useState("");

  async function handleSignOut() {
    const result = await signOut();
    setSignOutError(result.error ? "We could not sign you out. Try again in a moment." : null);
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
        <h2>Email sign-in is unavailable in this preview.</h2>
        <p>You can still play today&apos;s Mystery Map and keep local stats in this browser.</p>
        <Link className="button-secondary" href="/play/worldprint">
          Play without signing in
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
        <h2>Create a free account to save your streak.</h2>
        <p>You can keep playing without an account. Sign in when you want to save this browser&apos;s stats to your account.</p>
        <div className="button-row">
          <Link className="button" href="/sign-in">
            Save your score and streak
          </Link>
          <Link className="button-secondary" href="/play/worldprint">
            Keep playing
          </Link>
        </div>
      </article>
    );
  }

  const membershipLabel = entitlementLoading ? "Checking" : planLabel(entitlement.plan);
  const membershipStatus = entitlementLoading ? "Checking access" : entitlement.status === "free" ? "Ready" : statusLabel(entitlement.status);
  const syncLabel = entitlementLoading ? "Checking sync" : entitlement.capabilities.canSaveStats ? "Account sync ready" : "Local stats only";

  return (
    <article className="surface account-card account-primary-card account-summary-card">
      <div className="account-summary-head">
        <p className="eyebrow">Signed in</p>
        <h2>Your atlas is connected.</h2>
        <p>Your account is ready. Keep playing, save this device&apos;s stats, or check your atlas access.</p>
      </div>
      <dl className="account-status-list account-mini-status account-summary-list">
        <div>
          <dt>Email</dt>
          <dd>{user.email ?? "Signed-in player"}</dd>
        </div>
        <div>
          <dt>Membership</dt>
          <dd>
            {membershipLabel}
            <span>{membershipStatus}</span>
          </dd>
        </div>
        <div>
          <dt>Stats sync</dt>
          <dd>
            {syncLabel}
            <span>Save this browser&apos;s stats from your stats page.</span>
          </dd>
        </div>
      </dl>
      <div className="account-support-tools">
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
        <button className="button-secondary" type="button" onClick={() => void handleSignOut()}>
          Sign out
        </button>
      </div>
    </article>
  );
}
