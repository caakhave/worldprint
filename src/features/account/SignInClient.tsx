"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSupabaseAccount } from "@/features/account/useSupabaseAccount";
import { ensureProfile } from "@/lib/account/sync";
import {
  clearStoredSignInReturnPath,
  safeSignInReturnPath,
  signUpPathForReturn,
  storeSignInReturnPath
} from "@/lib/account/signInRedirect";
import { trackCanYouGeoEvent } from "@/lib/site/analytics";

const GENERIC_SIGN_IN_ERROR = "We could not sign you in. Check your email and password.";

type SupabaseAuthError = {
  message: string;
  status?: number;
  code?: string;
};

export function supabaseAuthErrorDiagnostic(error: SupabaseAuthError) {
  return {
    message: error.message,
    status: error.status,
    code: error.code
  };
}

function warnAuthDetail(message: string, error: SupabaseAuthError | unknown) {
  if (process.env.NODE_ENV !== "production") {
    console.warn(`[auth] ${message}`, error);
  }
}

function nextSearchValue(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("next");
}

function signedOutSearchValue(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("signedOut") === "1";
}

function signedInStatusForReturn(nextPath: string): string {
  return nextPath.startsWith("/upgrade") ? "Signed in. Taking you back to Pro plans..." : "Signed in. Taking you to your account...";
}

export function SignInClient() {
  const router = useRouter();
  const { client, configured, loading, user, profileError, signOut } = useSupabaseAccount();
  const [nextValue, setNextValue] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [signOutError, setSignOutError] = useState("");

  useEffect(() => {
    setNextValue(nextSearchValue());
    if (signedOutSearchValue()) {
      setStatus("You're signed out.");
    }
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!client) {
      setError("Email and password sign-in is not available in this preview. You can still try the Sample Run.");
      return;
    }

    setSubmitting(true);
    setError("");
    setStatus("");
    trackCanYouGeoEvent("cgy_sign_in_clicked", { source: "sign_in_form" });

    const nextPath = storeSignInReturnPath(nextSearchValue());
    const { data, error: signInError } = await client.auth.signInWithPassword({
      email,
      password
    });

    if (signInError) {
      warnAuthDetail("Could not sign in with password.", supabaseAuthErrorDiagnostic(signInError));
      setSubmitting(false);
      setError(GENERIC_SIGN_IN_ERROR);
      return;
    }

    const activeUser = data.user ?? data.session?.user ?? null;
    if (activeUser) {
      const profile = await ensureProfile(client, activeUser);
      if (profile.error) {
        warnAuthDetail("Profile creation failed after password sign-in.", profile.error);
      }
    }

    clearStoredSignInReturnPath();
    setStatus(signedInStatusForReturn(nextPath));
    setSubmitting(false);
    router.push(nextPath);
  }

  async function handleSignOut() {
    const result = await signOut();
    if (result.error) {
      setSignOutError("We could not sign you out. Try again in a moment.");
      return;
    }
    setSignOutError("");
    router.push("/sign-in?signedOut=1");
  }

  const returnPath = safeSignInReturnPath(nextValue);
  const signUpHref = signUpPathForReturn(returnPath);
  const signedInPrimaryHref = returnPath.startsWith("/upgrade") ? returnPath : "/account";

  if (!configured) {
    return (
      <article className="surface account-card account-primary-card">
        <p className="eyebrow">Account sign-in</p>
        <h2>Account sign-in is not available in this preview.</h2>
        <p>The 5-map Sample Run is still available in this browser. The 3-map Free Daily and saved progress start with a free account.</p>
        <div className="account-disabled-panel" role="status">
          Account saving is offline for this build.
        </div>
        <div className="button-row">
          <button className="button" type="button" disabled>
            Sign in
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
        <p className="eyebrow">Account sign-in</p>
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
        <p className="account-env-note">Use this same email and password next time.</p>
        {profileError ? <p className="account-error">We could not refresh your account details. You can keep playing.</p> : null}
        {signOutError ? (
          <p className="account-error" role="alert">
            {signOutError}
          </p>
        ) : null}
        <div className="button-row">
          <Link className="button" href={signedInPrimaryHref}>
            {signedInPrimaryHref.startsWith("/upgrade") ? "Continue to Pro plans" : "Go to account"}
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
      <p className="eyebrow">Sign in</p>
      <h2>Sign in with email and password.</h2>
      <p>Returning players use the email and password on their account. New players can create a free account first, then choose Free or Pro.</p>
      {status ? (
        <p className="status-live" role="status">
          {status}
        </p>
      ) : null}
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
        <label htmlFor="account-password">
          Password
          <input
            id="account-password"
            name="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Your password"
            autoComplete="current-password"
            required
          />
        </label>
        <button className="button" type="submit" disabled={submitting}>
          {submitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
      <div className="account-inline-links" aria-label="Account links">
        <Link href={signUpHref}>Create account</Link>
        <Link href="/forgot-password">Forgot password?</Link>
      </div>
      <p className="account-env-note">Free needs no card. Pro monthly or yearly checkout starts only after you are signed in.</p>
      {error ? (
        <p className="account-error" role="alert">
          {error}
        </p>
      ) : null}
    </article>
  );
}
