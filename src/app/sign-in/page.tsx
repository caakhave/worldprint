import type { Metadata } from "next";
import Link from "next/link";
import { SignInClient } from "@/features/account/SignInClient";
import { BRAND_NAME } from "@/lib/brand";
import { ACCESS_PLAN_COPY } from "@/lib/account/accessCopy";

export const metadata: Metadata = {
  title: "Create a Free Account",
  description: "Create a free Can You Geo? account for fresh Daily play and saved progress."
};

export default function SignInPage() {
  return (
    <section className="account-page account-page-shell page-shell" aria-labelledby="sign-in-title">
      <div className="account-hero">
        <p className="eyebrow">Free account</p>
        <h1 id="sign-in-title" className="page-title">
          Create your free account.
        </h1>
        <p className="lead">{ACCESS_PLAN_COPY.guest.summary}</p>
      </div>

      <div className="account-grid">
        <SignInClient />

        <div className="surface account-card account-status-card" aria-label="Account readiness">
          <h2>Your atlas, saved.</h2>
          <ul className="account-checklist">
            <li>
              <strong>Sample play</strong>
              <span>Try a few maps instantly before creating an account.</span>
            </li>
            <li>
              <strong>Free account</strong>
              <span>Fresh Daily play, saved progress, streaks, and basic stats.</span>
            </li>
            <li>
              <strong>Pro</strong>
              <span>Full practice atlas, complete Past Games archive, and advanced stats.</span>
            </li>
          </ul>
          <p className="account-env-note">Fresh Daily play starts with a free account.</p>
        </div>
      </div>

      <div className="surface account-card account-next-card">
        <h2>Start with the free account</h2>
        <p>
          {BRAND_NAME} keeps sign-in simple: enter your email, open the secure link, and your Daily progress can follow you.
        </p>
        <Link className="button-secondary" href="/play/mystery-map">
          Try sample maps
        </Link>
      </div>
    </section>
  );
}
