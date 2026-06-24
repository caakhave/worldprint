"use client";

import Link from "next/link";
import { useState } from "react";
import { siteOrigin } from "@/lib/supabase/env";
import { useSupabaseAccount } from "@/features/account/useSupabaseAccount";

function warnAuthDetail(message: string, detail: unknown) {
  if (process.env.NODE_ENV !== "production") {
    console.warn(`[auth] ${message}`, detail);
  }
}

export function SignInClient() {
  const { client, configured, loading, user, profileError } = useSupabaseAccount();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!client) {
      setError("Email sign-in is not available in this preview. You can still play without an account.");
      return;
    }
    setSubmitting(true);
    setError("");
    setStatus("");
    const { error: signInError } = await client.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${siteOrigin()}/auth/callback`
      }
    });
    setSubmitting(false);
    if (signInError) {
      warnAuthDetail("Could not send sign-in link.", signInError);
      setError("We could not send that sign-in link. Check the email address and try again.");
      return;
    }
    setStatus("Check your email. Open the link we sent to finish signing in.");
  }

  if (!configured) {
    return (
      <article className="surface account-card account-primary-card">
        <p className="eyebrow">Create a free account</p>
        <h2>Email sign-in is not available in this preview.</h2>
        <p>You can still play today&apos;s Mystery Map and keep local stats in this browser.</p>
        <div className="account-disabled-panel" role="status">
          Account saving is offline for this build.
        </div>
        <div className="button-row">
          <button className="button" type="button" disabled>
            Create a free account
          </button>
          <Link className="button-secondary" href="/play/worldprint">
            Keep playing
          </Link>
        </div>
      </article>
    );
  }

  if (loading) {
    return (
      <article className="surface account-card account-primary-card">
        <p className="eyebrow">Create a free account</p>
        <h2>Checking your account.</h2>
        <p>Looking for an existing session on this device.</p>
      </article>
    );
  }

  if (user) {
    return (
      <article className="surface account-card account-primary-card">
        <p className="eyebrow">Signed in</p>
        <h2>Your atlas is connected.</h2>
        <p>{user.email ? `Signed in as ${user.email}.` : "You are signed in."}</p>
        {profileError ? <p className="account-error">We could not refresh your account details. You can keep playing.</p> : null}
        <div className="button-row">
          <Link className="button" href="/account">
            Go to account
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
      <p className="eyebrow">Create a free account</p>
      <h2>Send a secure sign-in link.</h2>
      <p>Enter your email and we&apos;ll send a link. No password needed.</p>
      <form className="account-form" onSubmit={(event) => void submit(event)}>
        <label htmlFor="account-email">
          Email
          <input
            id="account-email"
            name="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </label>
        <button className="button" type="submit" disabled={submitting}>
          {submitting ? "Sending..." : "Send sign-in link"}
        </button>
      </form>
      {status ? (
        <p className="status-live" role="status">
          {status}
        </p>
      ) : null}
      {error ? (
        <p className="account-error" role="alert">
          {error}
        </p>
      ) : null}
    </article>
  );
}
