import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_LINKS, HELLO_EMAIL, SUPPORT_EMAIL } from "@/lib/contact";
import { pageMetadata } from "@/lib/site/seo";

export const metadata: Metadata = pageMetadata({
  title: "Support - Can You Geo?",
  description: "Get Can You Geo? account, billing, bug, data source, privacy, and accessibility support.",
  path: "/support/"
});

export default function SupportPage() {
  return (
    <section className="support-page page-shell info-page-shell" aria-labelledby="support-title">
      <header className="legal-hero">
        <p className="eyebrow">Support</p>
        <h1 id="support-title" className="page-title">
          How can we help?
        </h1>
        <p className="lead">
          Email <a href={CONTACT_LINKS.accountHelp.href}>{SUPPORT_EMAIL}</a> for account, billing, privacy, accessibility, bug, and
          data/source help. General feedback can go to <a href={CONTACT_LINKS.generalFeedback.href}>{HELLO_EMAIL}</a>.
        </p>
      </header>

      <div className="about-grid">
        <article className="about-card map-texture-panel">
          <p className="eyebrow">Account and sign-in</p>
          <h2>Account help.</h2>
          <p>
            Include the email address on the account, the page where you got stuck, and whether the issue is sign-up, confirmation,
            sign-in, password reset, saved stats, or account preferences.
          </p>
          <a className="button-secondary" href={CONTACT_LINKS.accountHelp.href}>
            Email account help
          </a>
        </article>

        <article className="about-card map-texture-panel">
          <p className="eyebrow">Billing</p>
          <h2>Plan and payment help.</h2>
          <p>
            When billing is enabled, use Account &gt; Manage billing to update payment details or cancel through Stripe. If a
            membership is canceled at period end, Pro access should remain until that paid period ends.
          </p>
          <a className="button-secondary" href={CONTACT_LINKS.billingHelp.href}>
            Email billing help
          </a>
        </article>

        <article className="about-card map-texture-panel">
          <p className="eyebrow">Bugs and accessibility</p>
          <h2>Something broke?</h2>
          <p>
            Send the page URL, browser and device, what you expected, what happened, and a screenshot if helpful. For accessibility
            issues, include assistive technology details if relevant.
          </p>
          <a className="button-secondary" href={CONTACT_LINKS.bugReport.href}>
            Report a bug
          </a>
        </article>

        <article className="about-card map-texture-panel">
          <p className="eyebrow">Data and sources</p>
          <h2>Report a map issue.</h2>
          <p>
            Include the game, date or round when available, country, rule, or indicator, the source you checked, and the correction
            you expect. Can You Geo treats map boundaries and missing data as gameplay/source choices, not sovereignty judgments.
          </p>
          <a className="button-secondary" href={CONTACT_LINKS.dataSourceIssue.href}>
            Data/source issue
          </a>
        </article>
      </div>

      <div className="about-cta surface map-texture-panel" aria-label="Support ID guidance">
        <div>
          <p className="eyebrow">Support ID</p>
          <h2>Use it only if support asks.</h2>
          <p>
            Your account page can show a Support ID for account-specific troubleshooting. Do not send passwords, full card details, or
            private Stripe card information by email.
          </p>
        </div>
        <div className="button-row">
          <Link className="button-secondary" href="/account">
            Open account
          </Link>
          <Link className="button-secondary" href="/legal">
            Terms &amp; Privacy
          </Link>
        </div>
      </div>
    </section>
  );
}
