"use client";

import { useState } from "react";
import { useSupabaseAccount } from "@/features/account/useSupabaseAccount";

const MIN_PASSWORD_LENGTH = 8;
const WRONG_CURRENT_PASSWORD_ERROR = "Current password did not match.";
const GENERIC_CHANGE_PASSWORD_ERROR = "We could not update your password. Try again in a moment.";

export function ChangePasswordClient() {
  const { client, configured, loading, user } = useSupabaseAccount();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!configured || loading || !user) {
    return null;
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("");
    setError("");

    if (!client) {
      setError("Password changes are not available in this preview.");
      return;
    }

    if (!user?.email) {
      setError("We could not verify this account email. Sign out and sign in again, then try again.");
      return;
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Fill out all password fields.");
      return;
    }

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError("Use at least 8 characters for your new password.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("The two new passwords do not match.");
      return;
    }

    if (newPassword === currentPassword) {
      setError("Choose a new password that is different from your current password.");
      return;
    }

    setSubmitting(true);
    const { error: signInError } = await client.auth.signInWithPassword({
      email: user.email,
      password: currentPassword
    });

    if (signInError) {
      setSubmitting(false);
      setError(WRONG_CURRENT_PASSWORD_ERROR);
      return;
    }

    const { error: updateError } = await client.auth.updateUser({ password: newPassword });
    setSubmitting(false);

    if (updateError) {
      setError(GENERIC_CHANGE_PASSWORD_ERROR);
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setStatus("Password updated.");
  }

  return (
    <article className="surface account-card account-primary-card" aria-labelledby="change-password-title">
      <p className="eyebrow">Security</p>
      <h2 id="change-password-title">Change password</h2>
      <p>Use your current password to choose a new one for this account.</p>
      <form className="account-form" noValidate onSubmit={(event) => void submit(event)}>
        <label htmlFor="account-current-password">
          Current password
          <input
            id="account-current-password"
            name="currentPassword"
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        <label htmlFor="account-new-password">
          New password
          <input
            id="account-new-password"
            name="newPassword"
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            placeholder="At least 8 characters"
            autoComplete="new-password"
            minLength={MIN_PASSWORD_LENGTH}
            required
          />
        </label>
        <label htmlFor="account-confirm-new-password">
          Confirm new password
          <input
            id="account-confirm-new-password"
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
