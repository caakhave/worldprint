"use client";

import Link from "next/link";
import { useState } from "react";
import { useSupabaseAccount } from "@/features/account/useSupabaseAccount";

const MIN_PASSWORD_LENGTH = 8;
const GENERIC_UPDATE_ERROR = "We could not update your password. Try the reset link again.";

export function ResetPasswordClient() {
  const { client, configured, loading, user } = useSupabaseAccount();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!client) {
      setError("Password reset is not available in this preview.");
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError("Use at least 8 characters for your new password.");
      return;
    }
    if (password !== confirmPassword) {
      setError("The two passwords do not match.");
      return;
    }

    setSubmitting(true);
    setError("");
    setStatus("");
    const { error: updateError } = await client.auth.updateUser({ password });
    setSubmitting(false);

    if (updateError) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[auth] Could not update password.", {
          message: updateError.message,
          status: updateError.status,
          code: updateError.code
        });
      }
      setError(GENERIC_UPDATE_ERROR);
      return;
    }

    setPassword("");
    setConfirmPassword("");
    setStatus("Password updated. You can sign in with the new password next time.");
  }

  if (!configured) {
    return (
      <article className="surface account-card account-primary-card">
        <p className="eyebrow">New password</p>
        <h2>Password reset is not available in this preview.</h2>
        <p>You can still try sample runs on this device.</p>
        <Link className="button-secondary" href="/play">
          Explore games
        </Link>
      </article>
    );
  }

  if (loading) {
    return (
      <article className="surface account-card account-primary-card">
        <p className="eyebrow">New password</p>
        <h2>Checking your reset link.</h2>
        <p>Looking for a verified password reset session.</p>
      </article>
    );
  }

  if (!user) {
    return (
      <article className="surface account-card account-primary-card">
        <p className="eyebrow">New password</p>
        <h2>Open your reset email first.</h2>
        <p>For security, the password form appears only after you open the reset link from your email.</p>
        <div className="button-row">
          <Link className="button" href="/forgot-password">
            Send reset email
          </Link>
          <Link className="button-secondary" href="/sign-in">
            Back to sign in
          </Link>
        </div>
      </article>
    );
  }

  return (
    <article className="surface account-card account-primary-card">
      <p className="eyebrow">New password</p>
      <h2>Choose a new password.</h2>
      <p>{user.email ? `Updating password for ${user.email}.` : "Updating the password for this account."}</p>
      <form className="account-form" noValidate onSubmit={(event) => void submit(event)}>
        <label htmlFor="reset-password">
          New password
          <input
            id="reset-password"
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
        <label htmlFor="reset-password-confirm">
          Confirm new password
          <input
            id="reset-password-confirm"
            name="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Repeat your new password"
            autoComplete="new-password"
            minLength={MIN_PASSWORD_LENGTH}
            required
          />
        </label>
        <button className="button" type="submit" disabled={submitting}>
          {submitting ? "Updating password..." : "Update password"}
        </button>
      </form>
      <div className="account-inline-links" aria-label="Account links">
        <Link href="/account">View account</Link>
        <Link href="/upgrade">View Free and Pro</Link>
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
