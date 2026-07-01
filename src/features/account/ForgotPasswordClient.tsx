"use client";

import Link from "next/link";
import { useState } from "react";
import { useSupabaseAccount } from "@/features/account/useSupabaseAccount";
import { authCallbackPathForReturn } from "@/lib/account/signInRedirect";
import { CONTACT_LINKS } from "@/lib/contact";
import { siteOrigin } from "@/lib/supabase/env";

const GENERIC_RESET_ERROR = "We could not send a password reset email. Check the address and try again.";

export function ForgotPasswordClient() {
  const { client, configured, loading } = useSupabaseAccount();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!client) {
      setError("Password reset is not available in this preview.");
      return;
    }

    setSubmitting(true);
    setError("");
    setStatus("");

    const { error: resetError } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteOrigin()}${authCallbackPathForReturn("/account")}`
    });

    setSubmitting(false);
    if (resetError) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[auth] Could not send password reset email.", {
          message: resetError.message,
          status: resetError.status,
          code: resetError.code
        });
      }
      setError(GENERIC_RESET_ERROR);
      return;
    }

    setStatus("Password reset email sent. Open the link to choose a new password.");
  }

  if (!configured) {
    return (
      <article className="surface account-card account-primary-card">
        <p className="eyebrow">Password reset</p>
        <h2>Password reset is not available in this preview.</h2>
        <p>You can still try the Sample Run on this device.</p>
        <Link className="button-secondary" href="/play/mystery-map">
          Try Sample Run
        </Link>
      </article>
    );
  }

  if (loading) {
    return (
      <article className="surface account-card account-primary-card">
        <p className="eyebrow">Password reset</p>
        <h2>Checking your account.</h2>
        <p>Looking for an existing session on this device.</p>
      </article>
    );
  }

  return (
    <article className="surface account-card account-primary-card">
      <p className="eyebrow">Password reset</p>
      <h2>Reset your password.</h2>
      <p>Enter the email on your account. We will send a secure link so you can choose a new password.</p>
      <form className="account-form" onSubmit={(event) => void submit(event)}>
        <label htmlFor="forgot-password-email">
          Email
          <input
            id="forgot-password-email"
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
          {submitting ? "Sending reset email..." : "Send reset email"}
        </button>
      </form>
      <div className="account-inline-links" aria-label="Account links">
        <Link href="/sign-in">Back to sign in</Link>
        <Link href="/sign-up">Create account</Link>
        <a href={CONTACT_LINKS.accountHelp.href}>Get account help</a>
      </div>
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
