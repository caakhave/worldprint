import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_LINKS, SUPPORT_EMAIL } from "@/lib/contact";
import { pageMetadata } from "@/lib/site/seo";

const EFFECTIVE_DATE = "July 9, 2026";

export const metadata: Metadata = pageMetadata({
  title: "Terms, Privacy & Accessibility - Can You Geo?",
  description: "Terms of use, privacy policy, cookies, local storage, accessibility, and support for Can You Geo.",
  path: "/legal/"
});

export function LegalContent() {
  return (
    <section className="legal-page page-shell info-page-shell" aria-labelledby="legal-title">
      <header className="legal-hero">
        <p className="eyebrow">Legal</p>
        <h1 id="legal-title" className="page-title">
          Terms &amp; Privacy
        </h1>
        <p className="lead">
          The practical rules for Can You Geo accounts, play, saved stats, paid Pro subscriptions, privacy, accessibility, and support.
        </p>
        <nav className="legal-quick-links" aria-label="Legal sections">
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/legal#accessibility-heading">Accessibility</Link>
          <Link href="/support">Support</Link>
        </nav>
      </header>

      <div className="legal-layout">
        <article className="legal-prose surface" aria-labelledby="terms-heading">
          <section>
            <p className="legal-updated">Effective date: {EFFECTIVE_DATE}</p>
            <h2 id="terms-heading">Terms of Use</h2>
            <p>Welcome to Can You Geo. By using the site, you agree to these Terms.</p>

            <h3>Service</h3>
            <p>
              Can You Geo provides geography and world-data games, including sample play, a Free account tier, account-saved stats,
              Mystery Map Past Games, supported custom/practice modes, and Pro membership features when available. The service is for
              personal, non-commercial entertainment and learning.
            </p>

            <h3>Accounts and Passwords</h3>
            <p>
              You may try sample play without an account. A Free account uses email and password sign-in through Supabase Auth and
              may require email confirmation. You are responsible for keeping access to your email account and password secure. Do not
              share your account or try to access another player&apos;s account.
            </p>

            <h3>Free and Pro Access</h3>
            <p>
              Free accounts include Daily play in supported games, saved progress, streaks, and basic stats where supported. Can You
              Geo? Pro is a paid subscription that unlocks supported advanced features such as Mystery Map Custom Atlas, Pattern Atlas
              Pattern Runs, repeatable Order Atlas Pro Play, the complete Mystery Map Past Games archive, and advanced stats.
            </p>

            <h3>Billing, Renewal, and Cancellation</h3>
            <p>
              Pro is offered as monthly or yearly auto-renewing subscription access. Pricing, renewal interval, and material purchase
              terms are shown before checkout. Payment processing, subscription renewal, and billing management are handled by Stripe.
              Can You Geo does not store full payment card numbers.
            </p>
            <p>
              You can manage or cancel a Stripe-backed Pro subscription from the account billing portal. If you cancel a renewing Pro
              membership at the end of the current paid period, Pro access generally remains active until that period ends. Refunds,
              credits, taxes, payment failures, and billing disputes may be handled through Stripe and support according to the
              checkout terms shown at purchase. If something looks wrong, contact support so we can review the account and billing
              state.
            </p>

            <h3>Fair Play and Acceptable Use</h3>
            <p>
              Do not abuse, disrupt, scrape, overload, reverse engineer, attack, or interfere with the service. Do not use bots,
              automated requests, payment fraud, credential attacks, vulnerability probing without permission, or other behavior that
              harms the service or other users.
            </p>

            <h3>Stats, Scores, and No Prize Guarantees</h3>
            <p>
              Saved runs, scores, streaks, and stats are provided for personal play history. They are not a public official
              leaderboard, competition, sweepstakes, or prize system. Client-submitted scores are not suitable for prizes or
              high-stakes rankings without additional verification.
            </p>

            <h3>Data and Map Content</h3>
            <p>
              We use public data and map sources to create puzzles, but map boundaries, source data, year selection, missing-data
              handling, labels, and generated game content may contain errors, omissions, or outdated information. Can You Geo is not
              professional, legal, financial, political, or academic advice.
            </p>

            <h3>Service Changes and Availability</h3>
            <p>
              We may change, pause, limit, or discontinue parts of the service, including Free or Pro features. We try to keep the game
              available, but we do not guarantee uninterrupted, secure, or error-free operation.
            </p>

            <h3>Intellectual Property</h3>
            <p>
              The Can You Geo name, design, game interface, copy, and original content belong to the service owner or its licensors.
              You may not copy or reuse them except as allowed by law or with permission.
            </p>

            <h3>No Warranty</h3>
            <p>
              The service is provided &quot;as is&quot; and &quot;as available.&quot; To the fullest extent allowed by law, we
              disclaim warranties of merchantability, fitness for a particular purpose, and non-infringement.
            </p>

            <h3>Limitation of Liability</h3>
            <p>
              To the fullest extent allowed by law, Can You Geo will not be liable for indirect, incidental, special, consequential,
              or punitive damages, or for lost profits, data, goodwill, or service interruption.
            </p>

            <h3>Changes</h3>
            <p>
              We may update these Terms from time to time. If changes are material, we will make reasonable efforts to notify users
              through the site, account email, or another appropriate channel.
            </p>

            <h3>Contact</h3>
            <p>
              Questions about these Terms can be sent to{" "}
              <a href={CONTACT_LINKS.privacyLegalRequest.href}>{SUPPORT_EMAIL}</a>.
            </p>
          </section>

          <section aria-labelledby="privacy-heading">
            <p className="legal-updated">Effective date: {EFFECTIVE_DATE}</p>
            <h2 id="privacy-heading">Privacy Policy</h2>
            <p>This Privacy Policy explains how Can You Geo collects, uses, and protects information when you use the site.</p>

            <h3>Information We Collect</h3>
            <ul>
              <li>Account information, such as email address, account ID, confirmation status, and profile settings.</li>
              <li>
                Password credentials are handled by Supabase Auth. Can You Geo does not store plaintext passwords in application
                tables.
              </li>
              <li>Marketing preference information, such as opt-in status, opt-in time, opt-in source, and opt-out time.</li>
              <li>Gameplay information, such as scores, streaks, guesses, completed runs, challenge activity, and saved stats.</li>
              <li>
                Billing and subscription state, such as Stripe customer ID, subscription ID, price ID, subscription status, renewal
                period, and cancellation-at-period-end status.
              </li>
              <li>
                Transactional email records and delivery metadata for Supabase Auth, Resend challenge emails, owner/admin billing
                notifications, and Google Workspace support email.
              </li>
              <li>
                Challenge email ledger entries, including hashed recipient emails, recipient domains, challenge-code hashes, delivery
                status, message length, and send timing for rate limiting and abuse prevention.
              </li>
              <li>Support emails and related information you send to the support inbox.</li>
              <li>
                Technical information, such as browser/device information, approximate location from IP address, logs, security
                events, and privacy-conscious analytics when enabled.
              </li>
              <li>
                Browser storage data, such as cookies, localStorage, or sessionStorage used for sign-in, gameplay state, preferences,
                Pro purchase intent, and saved progress.
              </li>
            </ul>

            <h3>How We Use Information</h3>
            <p>
              We use information to operate the game, authenticate accounts, confirm email addresses, reset passwords, save stats and
              streaks, prevent abuse, debug issues, improve the product, provide support, manage paid features, and send
              service-related account, security, support, and billing messages.
            </p>
            <p>
              Marketing updates, such as product updates or new game announcements, are optional and are sent only when you opt in.
              Transactional messages needed for the service can still be sent even if marketing updates are off.
            </p>

            <h3>Sharing and Legal Disclosures</h3>
            <p>
              We do not sell personal information. We may disclose information if required by law or to protect rights, safety, and
              security.
            </p>

            <h3>Owner and Admin Notifications</h3>
            <p>
              Can You Geo may send limited owner/admin notifications for billing-related events such as new Pro subscriptions,
              cancellations, payment failures, and recovered payments. These notifications are meant for support and operations, not
              marketing.
            </p>

            <h3>Cookies, Local Storage, and Session Storage</h3>
            <p>
              We use necessary cookies and browser storage for authentication, gameplay state, saved progress, account preferences,
              Pro intent during sign-in, and security. We may use production analytics to understand page visits and game events
              without sending account emails, user IDs, passwords, auth tokens, payment details, exact location, or answer spoilers.
              If advertising cookies or materially different tracking tools are added later, this policy and consent controls should
              be updated where required.
            </p>

            <h3>Data Retention and Deletion</h3>
            <p>
              We keep account, support, billing, and gameplay information as long as needed to provide the service, maintain records,
              resolve disputes, prevent abuse, or comply with legal obligations. You may request deletion or support with account data
              by contacting <a href={CONTACT_LINKS.privacyLegalRequest.href}>{SUPPORT_EMAIL}</a>.
            </p>

            <h3>Your Choices</h3>
            <p>
              You can play sample content without signing in, sign out at any time, turn marketing updates on or off from your
              account, and request access, correction, deletion, or support by contacting{" "}
              <a href={CONTACT_LINKS.privacyLegalRequest.href}>{SUPPORT_EMAIL}</a>.
            </p>

            <h3>Children</h3>
            <p>
              The service is not directed to children under 13, and children under 13 should not create accounts or submit personal
              information. If you believe a child under 13 provided personal information, contact us so we can delete it.
            </p>

            <h3>Security</h3>
            <p>
              We use reasonable technical and organizational measures to protect information, but no online service can guarantee
              complete security.
            </p>

            <h3>International Users</h3>
            <p>
              If you use the service from outside the United States, your information may be processed in the United States or other
              countries where our providers operate.
            </p>

            <h3>Changes</h3>
            <p>
              We may update this Privacy Policy from time to time. The updated version will be posted on this page with a new
              effective date.
            </p>

            <h3>Privacy Contact</h3>
            <p>
              Privacy questions or requests can be sent to{" "}
              <a href={CONTACT_LINKS.privacyLegalRequest.href}>{SUPPORT_EMAIL}</a>.
            </p>
          </section>

          <section aria-labelledby="accessibility-heading">
            <p className="legal-updated">Effective date: {EFFECTIVE_DATE}</p>
            <h2 id="accessibility-heading">Accessibility</h2>
            <p>
              Can You Geo aims to be usable by as many players as possible. We are working toward WCAG 2.2 AA as a practical
              accessibility baseline for the site&apos;s public pages, account features, and gameplay.
            </p>
            <p>
              Some geography gameplay is highly visual by nature, especially map-based interactions. Where possible, we provide or
              plan to provide keyboard-accessible and text-based alternatives so players are not required to use a mouse or rely only
              on color or visual map details.
            </p>
            <p>
              If you have trouble using the site or need an accessibility-related accommodation, contact us at{" "}
              <a href={CONTACT_LINKS.bugReport.href}>{SUPPORT_EMAIL}</a>. Please include the page, browser/device, assistive
              technology if relevant, and a short description of the problem.
            </p>
          </section>

          <section aria-labelledby="support-heading">
            <p className="legal-updated">Effective date: {EFFECTIVE_DATE}</p>
            <h2 id="support-heading">Support</h2>
            <p>
              Support, account help, privacy/legal requests, billing questions, bug reports, and data/source concerns can be sent to{" "}
              <a href={CONTACT_LINKS.accountHelp.href}>{SUPPORT_EMAIL}</a>. The <Link href="/support">support page</Link> explains
              what to include and when to use your Support ID.
            </p>
          </section>
        </article>
      </div>
    </section>
  );
}

export default function LegalPage() {
  return <LegalContent />;
}
