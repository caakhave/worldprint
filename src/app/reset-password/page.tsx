import type { Metadata } from "next";
import { ResetPasswordClient } from "@/features/account/ResetPasswordClient";

export const metadata: Metadata = {
  title: "New Password",
  description: "Choose a new Can You Geo? account password."
};

export default function ResetPasswordPage() {
  return (
    <section className="account-page account-page-shell page-shell info-page-shell" aria-labelledby="reset-password-title">
      <div className="account-hero">
        <p className="eyebrow">New password</p>
        <h1 id="reset-password-title" className="page-title">
          Choose a new password.
        </h1>
        <p className="lead">Use the verified reset link from your email, then save a new password for the account.</p>
      </div>

      <div className="account-grid">
        <ResetPasswordClient />

        <div className="surface account-card account-status-card" aria-label="Password security">
          <p className="eyebrow">Security</p>
          <h2>Passwords stay in Supabase Auth.</h2>
          <p>Can You Geo uses Supabase for password handling and keeps app tables focused on profile, stats, and membership data.</p>
          <ul className="account-checklist">
            <li>
              <strong>Account</strong>
              <span>Your email remains the account identity.</span>
            </li>
            <li>
              <strong>Membership</strong>
              <span>Free and Pro access stay tied to the same signed-in account.</span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
