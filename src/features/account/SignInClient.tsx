"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { siteOrigin } from "@/lib/supabase/env";
import { useSupabaseAccount } from "@/features/account/useSupabaseAccount";
import { authCallbackPathForReturn, storeSignInReturnPath } from "@/lib/account/signInRedirect";

const RESEND_COOLDOWN_MS = 60_000;
const RATE_LIMIT_MESSAGE = "A sign-in link was just sent. Check your email, or try again in about 60 seconds.";
const GENERIC_SIGN_IN_ERROR = "We could not send that sign-in link. Check the email address and try again.";

type SupabaseOtpError = {
  message: string;
  status?: number;
  code?: string;
};

export function supabaseOtpErrorDiagnostic(error: SupabaseOtpError) {
  return {
    message: error.message,
    status: error.status,
    code: error.code
  };
}

function warnAuthDetail(message: string, error: SupabaseOtpError) {
  if (process.env.NODE_ENV !== "production") {
    console.warn(`[auth] ${message}`, supabaseOtpErrorDiagnostic(error));
  }
}

export function isPasswordlessRateLimitError(error: SupabaseOtpError | null | undefined): boolean {
  if (!error) return false;
  const code = error.code?.toLowerCase() ?? "";
  const message = error.message.toLowerCase();
  return (
    error.status === 429 ||
    (code.includes("rate") && code.includes("limit")) ||
    code.includes("over_email_send_rate_limit") ||
    message.includes("rate limit") ||
    message.includes("email rate") ||
    message.includes("only request") ||
    message.includes("after 60 seconds") ||
    (message.includes("wait") && message.includes("seconds"))
  );
}

export function SignInClient() {
  const { client, configured, loading, user, profileError, signOut } = useSupabaseAccount();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  const [resendCooldownActive, setResendCooldownActive] = useState(false);

  useEffect(() => {
    if (!resendCooldownActive) return undefined;
    const timeout = window.setTimeout(() => setResendCooldownActive(false), RESEND_COOLDOWN_MS);
    return () => window.clearTimeout(timeout);
  }, [resendCooldownActive]);

  function startResendCooldown() {
    setResendCooldownActive(true);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (resendCooldownActive) return;
    if (!client) {
      setError("Email sign-in is not available in this preview. You can still try the Sample Run.");
      return;
    }
    setSubmitting(true);
    setError("");
    setStatus("");
    const nextPath = storeSignInReturnPath(new URLSearchParams(window.location.search).get("next"));
    const callbackPath = authCallbackPathForReturn(nextPath);
    const { error: signInError } = await client.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${siteOrigin()}${callbackPath}`
      }
    });
    setSubmitting(false);
    if (signInError) {
      warnAuthDetail("Could not send sign-in link.", signInError);
      if (isPasswordlessRateLimitError(signInError)) {
        startResendCooldown();
        setError(RATE_LIMIT_MESSAGE);
      } else {
        setError(GENERIC_SIGN_IN_ERROR);
      }
      return;
    }
    startResendCooldown();
    setStatus("Email sent. Open the link to continue.");
  }

  async function handleSignOut() {
    const result = await signOut();
    setSignOutError(result.error ? "We could not sign you out. Try again in a moment." : "");
  }

  if (!configured) {
    return (
      <article className="surface account-card account-primary-card">
        <p className="eyebrow">Email sign-in</p>
        <h2>Email sign-in is not available in this preview.</h2>
        <p>The 5-map Sample Run is still available in this browser. The 3-map Free Daily and saved progress start with a free account.</p>
        <div className="account-disabled-panel" role="status">
          Account saving is offline for this build.
        </div>
        <div className="button-row">
          <button className="button" type="button" disabled>
            Send sign-in link
          </button>
          <Link className="button-secondary" href="/play/mystery-map">
            Try Sample Run
          </Link>
        </div>
      </article>
    );
  }

  if (loading) {
    return (
      <article className="surface account-card account-primary-card">
        <p className="eyebrow">Email sign-in</p>
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
        <p>{user.email ? `You're signed in as ${user.email}.` : "You're signed in."}</p>
        <p className="account-env-note">Use this same email any time you need a fresh sign-in link.</p>
        {profileError ? <p className="account-error">We could not refresh your account details. You can keep playing.</p> : null}
        {signOutError ? (
          <p className="account-error" role="alert">
            {signOutError}
          </p>
        ) : null}
        <div className="button-row">
          <Link className="button" href="/account">
            Go to account
          </Link>
          <Link className="button-secondary" href="/play/mystery-map">
            Keep playing
          </Link>
          <button className="button-secondary" type="button" onClick={() => void handleSignOut()}>
            Sign out
          </button>
        </div>
      </article>
    );
  }

  return (
    <article className="surface account-card account-primary-card">
      <p className="eyebrow">Email sign-in</p>
      <h2>Enter your email to continue.</h2>
      <p>New players get a free account automatically. Returning players use the same email to sign back in.</p>
      <p>Want Can You Geo? Pro? Use this email first, then choose monthly or yearly. Free stays available with no card needed.</p>
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
        <button className="button" type="submit" disabled={submitting || resendCooldownActive}>
          {submitting ? "Sending..." : resendCooldownActive ? "Check your email" : "Send sign-in link"}
        </button>
      </form>
      <p className="account-env-note">We&apos;ll email a secure link. New players can continue Free or choose Pro after signing in.</p>
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
