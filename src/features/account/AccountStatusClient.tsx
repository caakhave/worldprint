"use client";

import Link from "next/link";
import { useState } from "react";
import { useSupabaseAccount } from "@/features/account/useSupabaseAccount";

export function AccountStatusClient() {
  const { configured, loading, user, profileError, signOut } = useSupabaseAccount();
  const [signOutError, setSignOutError] = useState<string | null>(null);

  async function handleSignOut() {
    const result = await signOut();
    setSignOutError(result.error ? "We could not sign you out. Try again in a moment." : null);
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

  return (
    <article className="surface account-card account-primary-card">
      <p className="eyebrow">Signed in</p>
      <h2>Your atlas is connected.</h2>
      <dl className="account-status-list account-mini-status">
        <div>
          <dt>Email</dt>
          <dd>{user.email ?? "Signed-in player"}</dd>
        </div>
        <div>
          <dt>User ID</dt>
          <dd>{user.id}</dd>
        </div>
      </dl>
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
