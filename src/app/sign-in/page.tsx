import type { Metadata } from "next";
import Link from "next/link";
import { SignInClient } from "@/features/account/SignInClient";
import { BRAND_NAME } from "@/lib/brand";
import { CONTACT_LINKS } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Create Account or Sign In",
  description: "Create a free Can You Geo? account or sign in with a one-time email link."
};

export default function SignInPage() {
  return (
    <section className="account-page account-page-shell page-shell info-page-shell" aria-labelledby="sign-in-title">
      <div className="account-hero">
        <p className="eyebrow">Email sign-in</p>
        <h1 id="sign-in-title" className="page-title">
          Create a free account or sign in.
        </h1>
        <p className="lead">
          Enter your email once. New players get a free account automatically; returning players use the same email to get back to
          saved progress.
        </p>
      </div>

      <div className="account-grid">
        <SignInClient />

        <div className="surface account-card account-status-card" aria-label="Account readiness">
          <h2>One link, one account.</h2>
          <ul className="account-checklist">
            <li>
              <strong>Sample Run</strong>
              <span>Try 5 fixed sample maps before creating an account.</span>
            </li>
            <li>
              <strong>Free account</strong>
              <span>First-time sign-in creates one automatically: 3 fresh maps every day, saved results, streaks, and basic stats.</span>
            </li>
            <li>
              <strong>Returning players</strong>
              <span>Use the same email to sign back in and keep your atlas connected.</span>
            </li>
            <li>
              <strong>Pro</strong>
              <span>Checkout is coming soon; billing stays disabled until Pro is ready.</span>
            </li>
          </ul>
          <p className="account-env-note">No password to manage. Sign-in links can be requested about once per minute.</p>
        </div>
      </div>

      <div className="surface account-card account-next-card">
        <h2>Use the same email next time.</h2>
        <p>
          {BRAND_NAME} sends a secure link to create or reopen your account. Keep one email for your 3-map Free Daily progress,
          streaks, and basic stats.
        </p>
        <div className="button-row">
          <Link className="button-secondary" href="/play/mystery-map">
            Try Sample Run
          </Link>
          <a className="button-secondary" href={CONTACT_LINKS.accountHelp.href}>
            Get account help
          </a>
        </div>
      </div>
    </section>
  );
}
