import type { Metadata } from "next";
import Link from "next/link";
import { AccountStatsClient } from "@/features/account/AccountStatsClient";
import { AdvancedStatsGateClient } from "@/features/account/MembershipCardClient";

export const metadata: Metadata = {
  title: "Saved Stats",
  description: "Can You Geo? local and account-saved stats."
};

export default function AccountStatsPage() {
  return (
    <section className="account-page account-page-shell page-shell" aria-labelledby="stats-title">
      <div className="account-hero">
        <p className="eyebrow">Saved record</p>
        <h1 id="stats-title" className="page-title">
          Your saved stats.
        </h1>
        <p className="lead">
          Signed-in players see account-saved runs first. Without an account, completed runs stay saved in this browser.
        </p>
      </div>

      <div className="account-grid account-stats-grid">
        <AccountStatsClient />
        <article className="surface account-card">
          <h2>What counts today</h2>
          <ul className="account-checklist">
            <li>
              <strong>Daily</strong>
              <span>Each date counts once toward the Daily record.</span>
            </li>
            <li>
              <strong>Past Games</strong>
              <span>Replayed days can be saved to your account without changing the live streak.</span>
            </li>
            <li>
              <strong>Challenges</strong>
              <span>Completed challenge links count by challenge ID.</span>
            </li>
          </ul>
          <p className="account-env-note">Practice warm-ups are kept out of the permanent local record for now.</p>
          <Link className="button-secondary" href="/account">
            Back to account
          </Link>
        </article>
        <AdvancedStatsGateClient />
      </div>
    </section>
  );
}
