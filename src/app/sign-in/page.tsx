import type { Metadata } from "next";
import Link from "next/link";
import { SignInClient } from "@/features/account/SignInClient";
import { isNativeAppBuild } from "@/lib/site/buildTarget";
import { pageMetadata } from "@/lib/site/seo";

export const metadata: Metadata = pageMetadata({
  title: "Create Account or Sign In",
  description: "Sign in to Can You Geo? with email and password, or create a new account.",
  path: "/sign-in/",
  noIndex: true
});

export default function SignInPage() {
  const nativeBuild = isNativeAppBuild();

  return (
    <section className="account-page account-page-shell page-shell info-page-shell" aria-labelledby="sign-in-title">
      <div className="account-hero">
        <p className="eyebrow">Account sign-in</p>
        <h1 id="sign-in-title" className="page-title">
          Sign in, or create an account.
        </h1>
        <p className="lead">
          {nativeBuild
            ? "Returning players sign in with email and password. New players can create a free account with no card needed. Existing Pro access unlocks after sign-in where supported."
            : "Returning players sign in with email and password. New players can create a free account with no card needed, then choose Free or continue into monthly or yearly Pro."}
        </p>
      </div>

      <div className="account-grid">
        <SignInClient />

        <div className="surface account-card account-status-card" aria-label="Account choices">
          <p className="eyebrow">After sign-in</p>
          <h2>{nativeBuild ? "Compare plans or continue free." : "Start Pro or continue free."}</h2>
          <p>
            {nativeBuild
              ? "Your account identity comes first. Mobile purchases are not available in this preview."
              : "Your account identity comes first. Checkout only starts after you are signed in."}
          </p>
          <ul className="account-checklist">
            <li>
              <strong>{nativeBuild ? "Existing Pro" : "Start Pro"}</strong>
              <span>
                {nativeBuild
                  ? "Already entitled accounts unlock supported Pro atlas features after sign-in where supported."
                  : "Choose monthly or yearly Pro, then complete secure Stripe checkout after signing in."}
              </span>
            </li>
            <li>
              <strong>Continue free</strong>
              <span>Create a free account for daily geography challenges and, where supported, saved progress, streaks, and basic stats.</span>
            </li>
            <li>
              <strong>Returning players</strong>
              <span>Use the same email and password to keep your atlas connected.</span>
            </li>
            <li>
              <strong>Sample Run</strong>
              <span>Try 5 fixed sample maps before creating an account.</span>
            </li>
          </ul>
          <div className="button-row">
            <Link className="button" href="/upgrade">
              {nativeBuild ? "View plans" : "Start Pro"}
            </Link>
            <Link className="button-secondary" href="/sign-up">
              Continue free
            </Link>
          </div>
        </div>
      </div>

    </section>
  );
}
