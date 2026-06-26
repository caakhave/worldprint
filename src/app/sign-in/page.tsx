import type { Metadata } from "next";
import Link from "next/link";
import { SignInClient } from "@/features/account/SignInClient";
import { BRAND_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Create a Free Account",
  description: "Create a free Can You Geo? account to save your score and streak."
};

export default function SignInPage() {
  return (
    <section className="account-page account-page-shell page-shell" aria-labelledby="sign-in-title">
      <div className="account-hero">
        <p className="eyebrow">Free account</p>
        <h1 id="sign-in-title" className="page-title">
          Save your score and streak.
        </h1>
        <p className="lead">No password needed. Enter your email and we&apos;ll send a secure one-time sign-in link.</p>
      </div>

      <div className="account-grid">
        <SignInClient />

        <div className="surface account-card account-status-card" aria-label="Account readiness">
          <h2>Your atlas, saved.</h2>
          <ul className="account-checklist">
            <li>
              <strong>Now</strong>
              <span>Anonymous local stats are saved in this browser.</span>
            </li>
            <li>
              <strong>Free account</strong>
              <span>Save your score history and streak to your account.</span>
            </li>
            <li>
              <strong>Pro</strong>
              <span>Unlock the full atlas, full archive, unlimited practice, and advanced stats.</span>
            </li>
          </ul>
          <p className="account-env-note">Gameplay still works without signing in.</p>
        </div>
      </div>

      <div className="surface account-card account-next-card">
        <h2>Why this comes after play</h2>
        <p>
          {BRAND_NAME} should feel like a daily geography challenge, not a signup wall. You can play first; account prompts only appear
          when saving progress would actually help.
        </p>
        <Link className="button-secondary" href="/account">
          Go to account
        </Link>
      </div>
    </section>
  );
}
