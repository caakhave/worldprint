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
          Create an account, then choose Free or Pro.
        </h1>
        <p className="lead">
          Enter your email once. New players get a free account automatically; returning players use the same email to get back to
          saved progress. Free needs no card, and Pro offers monthly or yearly checkout when billing is open.
        </p>
      </div>

      <div className="account-grid">
        <SignInClient />

        <div className="surface account-card account-status-card" aria-label="Account choices">
          <p className="eyebrow">After sign-in</p>
          <h2>Start Pro or continue free.</h2>
          <p>One email opens both paths. Pro unlocks the full atlas; Free needs no card.</p>
          <ul className="account-checklist">
            <li>
              <strong>Start Pro</strong>
              <span>After sign-in, choose monthly or yearly Pro checkout. Free remains available with no card needed.</span>
            </li>
            <li>
              <strong>Continue free</strong>
              <span>First-time sign-in creates one automatically: 3 fresh maps every day, saved results, streaks, and basic stats.</span>
            </li>
            <li>
              <strong>Returning players</strong>
              <span>Use the same email to sign back in and keep your atlas connected.</span>
            </li>
            <li>
              <strong>Sample Run</strong>
              <span>Try 5 fixed sample maps before creating an account.</span>
            </li>
          </ul>
          <div className="button-row">
            <Link className="button" href="/upgrade">
              Start Pro
            </Link>
            <a className="button-secondary" href="#account-email">
              Continue free
            </a>
          </div>
        </div>
      </div>

      <div className="surface account-card account-next-card">
        <h2>Use the same email next time.</h2>
        <p>
          {BRAND_NAME} sends a secure link to create or reopen your account. Keep one email for your 3-map Free Daily progress,
          streaks, and basic stats.
        </p>
        <div className="button-row">
          <Link className="button-secondary" href="/upgrade">
            View Free and Pro
          </Link>
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
