"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSupabaseAccount } from "@/features/account/useSupabaseAccount";
import { ensureProfile } from "@/lib/account/sync";
import {
  authCallbackPathForReturn,
  clearStoredSignInReturnPath,
  safeSignInReturnPath,
  signInPathForReturn,
  storeSignInReturnPath
} from "@/lib/account/signInRedirect";
import { siteOrigin } from "@/lib/supabase/env";

const MIN_PASSWORD_LENGTH = 8;
const GENERIC_SIGN_UP_ERROR = "We could not create that account. If you already have one, sign in instead.";

function nextSearchValue(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("next");
}

function signedInStatusForReturn(nextPath: string): string {
  return nextPath.startsWith("/upgrade") ? "Account created. Taking you back to Pro plans..." : "Account created. Taking you to your account...";
}

export function SignUpClient() {
  const router = useRouter();
  const { client, configured, loading, user, profileError, signOut } = useSupabaseAccount();
  const [nextValue, setNextValue] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [signOutError, setSignOutError] = useState("");

  useEffect(() => {
    setNextValue(nextSearchValue());
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!client) {
      setError("Account creation is not available in this preview. You can still try the Sample Run.");
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError("Use at least 8 characters for your password.");
      return;
    }
    if (password !== confirmPassword) {
      setError("The two passwords do not match.");
      return;
    }

    setSubmitting(true);
    setError("");
    setStatus("");

    const nextPath = storeSignInReturnPath(nextSearchValue());
    const callbackPath = authCallbackPathForReturn(nextPath);
    const { data, error: signUpError } = await client.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${siteOrigin()}${callbackPath}`
      }
    });

    if (signUpError) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[auth] Could not create password account.", {
          message: signUpError.message,
          status: signUpError.status,
          code: signUpError.code
        });
      }
      setSubmitting(false);
      setError(GENERIC_SIGN_UP_ERROR);
      return;
    }

    const activeUser = data.user ?? data.session?.user ?? null;
    if (data.session && activeUser) {
      const profile = await ensureProfile(client, activeUser);
      if (profile.error && process.env.NODE_ENV !== "production") {
        console.warn("[auth] Profile creation failed after password sign-up.", profile.error);
      }
      clearStoredSignInReturnPath();
      setStatus(signedInStatusForReturn(nextPath));
      setSubmitting(false);
      router.push(nextPath);
      return;
    }

    setSubmitting(false);
    setStatus("Check your email to confirm your account. Then sign in with your password to continue.");
  }

  async function handleSignOut() {
    const result = await signOut();
    setSignOutError(result.error ? "We could not sign you out. Try again in a moment." : "");
  }

  const returnPath = safeSignInReturnPath(nextValue);
  const signInHref = signInPathForReturn(returnPath);
  const signedInPrimaryHref = returnPath.startsWith("/upgrade") ? returnPath : "/account";

  if (!configured) {
    return (
      <article className="surface account-card account-primary-card">
        <p className="eyebrow">Create account</p>
        <h2>Account creation is not available in this preview.</h2>
        <p>The 5-map Sample Run is still available in this browser. The 3-map Free Daily and saved progress start with a free account.</p>
        <div className="account-disabled-panel" role="status">
          Account saving is offline for this build.
        </div>
        <Link className="button-secondary" href="/play/mystery-map">
          Try Sample Run
        </Link>
      </article>
    );
  }

  if (loading) {
    return (
      <article className="surface account-card account-primary-card">
        <p className="eyebrow">Create account</p>
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
          <button className="button-secondary" type="button" onClick={() => void handleSignOut()}>
            Sign out
          </button>
        </div>
      </article>
    );
  }

  return (
    <article className="surface account-card account-primary-card">
      <p className="eyebrow">Create account</p>
      <h2>Create your Can You Geo? account.</h2>
      <p>Free needs no card. If you picked Pro first, confirm this account and we will take you back to the selected plan.</p>
      <form className="account-form" noValidate onSubmit={(event) => void submit(event)}>
        <label htmlFor="sign-up-email">
          Email
          <input
            id="sign-up-email"
            name="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </label>
        <label htmlFor="sign-up-password">
          Password
          <input
            id="sign-up-password"
            name="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 8 characters"
            autoComplete="new-password"
            minLength={MIN_PASSWORD_LENGTH}
            required
          />
        </label>
        <label htmlFor="sign-up-password-confirm">
          Confirm password
          <input
            id="sign-up-password-confirm"
            name="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Repeat your password"
            autoComplete="new-password"
            minLength={MIN_PASSWORD_LENGTH}
            required
          />
        </label>
        <button className="button" type="submit" disabled={submitting}>
          {submitting ? "Creating account..." : "Create account"}
        </button>
      </form>
      <div className="account-inline-links" aria-label="Account links">
        <Link href={signInHref}>Already have an account?</Link>
        <Link href="/forgot-password">Forgot password?</Link>
      </div>
      <p className="account-env-note">Passwords are handled by Supabase Auth. Can You Geo does not store passwords in app tables.</p>
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
