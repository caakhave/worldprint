import type { Metadata } from "next";
import { ResetPasswordClient } from "@/features/account/ResetPasswordClient";
import { pageMetadata } from "@/lib/site/seo";

export const metadata: Metadata = pageMetadata({
  title: "New Password",
  description: "Choose a new Can You Geo? account password.",
  path: "/reset-password/",
  noIndex: true
});

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
          <h2>Passwords are securely stored.</h2>
          <p>Your password is handled securely and never stored in Can You Geo gameplay records.</p>
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
