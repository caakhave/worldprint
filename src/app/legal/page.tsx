import type { Metadata } from "next";
import { CONTACT_LINKS, SUPPORT_EMAIL } from "@/lib/contact";

const EFFECTIVE_DATE = "June 26, 2026";

export const metadata: Metadata = {
  title: "Terms & Privacy",
  description: "Terms of use, privacy policy, cookies, local storage, and accessibility for Can You Geo."
};

export default function LegalPage() {
  return (
    <section className="legal-page page-shell info-page-shell" aria-labelledby="legal-title">
      <header className="legal-hero">
        <p className="eyebrow">Legal</p>
        <h1 id="legal-title" className="page-title">
          Terms &amp; Privacy
        </h1>
        <p className="lead">
          Baseline launch terms for Can You Geo. This page explains the rules for using the game, what information the service uses,
          how browser storage supports play, and how to report accessibility issues.
        </p>
      </header>

      <div className="legal-layout">
        <article className="legal-prose surface" aria-labelledby="terms-heading">
          <section>
            <p className="legal-updated">Effective date: {EFFECTIVE_DATE}</p>
            <h2 id="terms-heading">Terms of Use</h2>
            <p>Welcome to Can You Geo. By using the site, you agree to these Terms.</p>

            <h3>Use of the Service</h3>
            <p>
              Can You Geo lets players play geography and demographic guessing games, save stats, view streaks, and use related
              account features. You may use the service for personal, non-commercial entertainment and learning.
            </p>

            <h3>Accounts</h3>
            <p>
              You can play some parts of the service without an account. If you create an account, you are responsible for keeping
              access to your email and password secure. Passwords are handled by Supabase Auth and are not stored in Can You Geo
              application tables.
            </p>

            <h3>Fair Play</h3>
            <p>
              Do not abuse, disrupt, scrape, reverse engineer, overload, or interfere with the service. Do not attempt to access
              another person&apos;s account, stats, saved games, or private data.
            </p>

            <h3>Paid Features</h3>
            <p>
              Some features may require a paid plan in the future. If paid plans are offered, pricing and renewal terms will be shown
              before purchase. Payment processing may be handled by Stripe or another payment provider. We do not store full payment
              card numbers.
            </p>

            <h3>Availability</h3>
            <p>
              We may change, pause, or discontinue parts of the service. We try to keep the game available, but we do not guarantee
              uninterrupted or error-free operation.
            </p>

            <h3>Intellectual Property</h3>
            <p>
              The Can You Geo? name, design, game interface, copy, and original content belong to the service owner or its licensors.
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
              through the site.
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
              <li>Account information, such as your email address and account ID when you sign in.</li>
              <li>Marketing email preference information, such as whether you opted in to occasional product updates.</li>
              <li>Gameplay information, such as scores, streaks, guesses, completed runs, challenge activity, and saved stats.</li>
              <li>Technical information, such as browser/device information, approximate location from IP address, logs, and security events.</li>
              <li>
                Local browser data, such as cookies, localStorage, or similar technologies used for sign-in, gameplay state,
                preferences, and saved progress.
              </li>
              <li>Payment information may be processed by Stripe if paid plans are enabled. We do not store full payment card numbers.</li>
            </ul>

            <h3>How We Use Information</h3>
            <p>
              We use information to operate the game, authenticate accounts, save stats and streaks, prevent abuse, debug issues,
              improve the product, provide support, send transactional account or billing messages, send optional marketing updates
              only when you opt in, and manage paid features if enabled.
            </p>

            <h3>How We Share Information</h3>
            <p>
              We do not sell personal information. We may share information with service providers that help operate the site,
              including hosting, authentication, database, email, analytics, support, or payment providers. Current or expected
              providers may include Cloudflare, Supabase, and Stripe. We may also disclose information if required by law or to
              protect rights, safety, and security.
            </p>

            <h3>Cookies and Local Storage</h3>
            <p>
              We use necessary cookies, localStorage, or similar browser technologies for authentication, gameplay state, saved
              progress, preferences, and security. If non-essential analytics or advertising cookies are added later, update this
              policy and add consent controls where required.
            </p>

            <h3>Data Retention</h3>
            <p>
              We keep account and gameplay information as long as needed to provide the service, maintain records, resolve disputes,
              prevent abuse, or comply with legal obligations. Users may request deletion.
            </p>

            <h3>Your Choices</h3>
            <p>
              You can play some parts of the game without signing in. You can sign out at any time. You may request access,
              correction, or deletion of your account information by contacting{" "}
              <a href={CONTACT_LINKS.privacyLegalRequest.href}>{SUPPORT_EMAIL}</a>.
            </p>
            <p>
              Marketing updates are optional and can be turned off from your account. Transactional emails such as account
              confirmation, password reset, billing, and security messages may still be sent when needed to provide the service.
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

            <h3>Contact</h3>
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
        </article>

      </div>
    </section>
  );
}
