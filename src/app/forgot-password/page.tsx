import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordClient } from "@/features/account/ForgotPasswordClient";
import { CONTACT_LINKS } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Request a Can You Geo? password reset email."
};

export default function ForgotPasswordPage() {
  return (
    <section className="account-page account-page-shell page-shell info-page-shell" aria-labelledby="forgot-password-title">
      <div className="account-hero">
        <p className="eyebrow">Password help</p>
        <h1 id="forgot-password-title" className="page-title">
          Reset your password.
        </h1>
        <p className="lead">We will send a secure reset link to the email on your account.</p>
      </div>

      <div className="account-grid">
        <ForgotPasswordClient />

        <div className="surface account-card account-status-card" aria-label="Password reset help">
          <p className="eyebrow">Account help</p>
          <h2>Use the same email.</h2>
          <p>Your account, saved progress, and Pro membership stay attached to the email you used when signing up.</p>
          <div className="button-row">
            <Link className="button-secondary" href="/sign-in">
              Back to sign in
            </Link>
            <a className="button-secondary" href={CONTACT_LINKS.accountHelp.href}>
              Get account help
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
