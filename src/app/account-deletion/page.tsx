import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_LINKS, SUPPORT_EMAIL } from "@/lib/contact";
import { pageMetadata } from "@/lib/site/seo";

export const metadata: Metadata = pageMetadata({
  title: "Account Deletion - Can You Geo?",
  description: "Request deletion of a Can You Geo account and associated personal data, with subscription and retention notes.",
  path: "/account-deletion/"
});

export default function AccountDeletionPage() {
  return (
    <section className="legal-page account-deletion-page page-shell info-page-shell" aria-labelledby="account-deletion-title">
      <header className="legal-hero">
        <p className="eyebrow">Account deletion</p>
        <h1 id="account-deletion-title" className="page-title">
          Request deletion of your Can You Geo account.
        </h1>
        <p className="lead">
          You can ask Can You Geo to delete your account and associated personal data without reinstalling the app. This page explains
          how to start the request, how identity verification works, and what to check before deletion is completed.
        </p>
        <nav className="legal-quick-links" aria-label="Account deletion resources">
          <a href={CONTACT_LINKS.accountDeletion.href}>Email deletion request</a>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/support">Support</Link>
        </nav>
      </header>

      <div className="legal-layout">
        <article className="legal-prose surface" aria-labelledby="request-heading">
          <section>
            <h2 id="request-heading">How To Submit A Request</h2>
            <p>
              Email <a href={CONTACT_LINKS.accountDeletion.href}>{SUPPORT_EMAIL}</a> and say that you want to delete your Can You
              Geo account and associated personal data. If possible, send the request from the email address on your account. If you
              cannot use that inbox, include enough safe context for support to verify account ownership.
            </p>
            <p>
              Do not send passwords, recovery codes, full payment card details, screenshots with private billing information, or
              authentication links. Support may ask follow-up questions before any destructive action is taken.
            </p>
            <div className="account-deletion-copy-box" aria-label="Copyable account deletion instructions">
              <p className="eyebrow">No mail app?</p>
              <p>
                Send a message to <strong>{SUPPORT_EMAIL}</strong> with the subject <strong>Can You Geo account deletion request</strong>.
                In the message, include the account email you want reviewed and state that you are requesting deletion.
              </p>
            </div>
          </section>

          <section aria-labelledby="confirmation-heading">
            <h2 id="confirmation-heading">Confirm Before You Request</h2>
            <p>
              Requesting deletion is different from signing out, canceling a subscription, or turning off email updates. After support
              verifies the request and completes deletion, account features such as saved Daily progress, streaks, stats, and Pro access
              for that account may no longer be available.
            </p>
            <details className="account-deletion-confirmation">
              <summary>Ready to start a deletion request?</summary>
              <p>
                Use this only if you want support to begin the account-deletion review. This does not delete your account immediately.
              </p>
              <a className="button" href={CONTACT_LINKS.accountDeletion.href}>
                Email deletion request
              </a>
            </details>
          </section>

          <section aria-labelledby="deleted-data-heading">
            <h2 id="deleted-data-heading">What Is Generally Removed</h2>
            <p>
              After verification, Can You Geo generally removes or disconnects account profile information, saved gameplay records,
              saved stats and streaks, account preferences, and app-managed access records associated with the account where deletion is
              supported and appropriate.
            </p>
            <p>
              Guest or sample play stored only on your device can also be removed by clearing Can You Geo site or app data on that
              device.
            </p>
          </section>

          <section aria-labelledby="retention-heading">
            <h2 id="retention-heading">What May Be Retained</h2>
            <p>
              We may retain limited records where required for legal, accounting, fraud-prevention, security, dispute-resolution, or
              backup purposes. Some support messages, billing records, payment-provider records, platform subscription records,
              security logs, abuse-prevention records, and provider backups may not be deleted immediately or may be controlled by a
              third-party platform.
            </p>
            <p>
              Support will review active account, billing, and platform-subscription state before completing deletion. We do not promise
              instant deletion or fully self-service deletion.
            </p>
          </section>

          <section aria-labelledby="subscriptions-heading">
            <h2 id="subscriptions-heading">Subscriptions Are Separate</h2>
            <p>
              Deleting a Can You Geo account does not necessarily cancel an active Apple App Store, Google Play, or Stripe subscription.
              If you have an active subscription, cancel it through the store account or billing portal that manages it before requesting
              deletion.
            </p>
            <ul>
              <li>Apple subscriptions are managed from your Apple ID subscription settings.</li>
              <li>Google Play subscriptions are managed from your Google Play subscriptions settings.</li>
              <li>Stripe web subscriptions can be managed from the Can You Geo account billing portal when available, or through support.</li>
            </ul>
            <p>
              If you delete your account before canceling a third-party subscription, you may lose app access while the subscription is
              still active with that platform.
            </p>
          </section>

          <section aria-labelledby="links-heading">
            <h2 id="links-heading">Related Pages</h2>
            <p>
              Read the <Link href="/privacy">Privacy Policy</Link>, <Link href="/terms">Terms of Use</Link>, or{" "}
              <Link href="/support">Support</Link> page for more account, billing, and privacy information.
            </p>
          </section>
        </article>
      </div>
    </section>
  );
}
