import type { Metadata } from "next";
import Link from "next/link";
import { SignUpClient } from "@/features/account/SignUpClient";
import { isNativeAppBuild } from "@/lib/site/buildTarget";
import { pageMetadata } from "@/lib/site/seo";

export const metadata: Metadata = pageMetadata({
  title: "Create Account",
  description: "Create a Can You Geo? account with email and password.",
  path: "/sign-up/",
  noIndex: true
});

export default function SignUpPage() {
  const nativeBuild = isNativeAppBuild();

  return (
    <section className="account-page account-page-shell page-shell info-page-shell" aria-labelledby="sign-up-title">
      <div className="account-hero">
        <p className="eyebrow">Create account</p>
        <h1 id="sign-up-title" className="page-title">
          Create Free, then choose Free or Pro.
        </h1>
        <p className="lead">
          {nativeBuild
            ? "New accounts start free with no card needed. Existing Pro access unlocks after sign-in where supported."
            : "New accounts start free with no card needed. If you chose Pro first, confirm your email and we will return you to the selected monthly or yearly plan."}
        </p>
      </div>

      <div className="account-grid">
        <SignUpClient />

        <div className="surface account-card account-status-card" aria-label="Account choices">
          <p className="eyebrow">What you get</p>
          <h2>One account, two paths.</h2>
          <p>
            {nativeBuild
              ? "Start with Free and compare Pro features. Android purchases use Google Play after sign-in."
              : "Start with Free or continue into secure Stripe checkout for Can You Geo? Pro after your account exists."}
          </p>
          <ul className="account-checklist">
            <li>
              <strong>Free</strong>
              <span>Daily games with saved progress, streaks, and basic stats where supported. No card needed.</span>
            </li>
            <li>
              <strong>Pro</strong>
              <span>Mystery Map Custom Atlas, Pattern Atlas Pattern Runs, complete Past Games archive, and advanced stats.</span>
            </li>
            <li>
              <strong>Email confirm</strong>
              <span>Open the confirmation email once, then sign in with your password.</span>
            </li>
          </ul>
          <div className="button-row">
            <Link className="button" href="/upgrade">
              View Pro plans
            </Link>
            <Link className="button-secondary" href="/sign-in">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
