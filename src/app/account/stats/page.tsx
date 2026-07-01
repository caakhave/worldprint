import type { Metadata } from "next";
import Link from "next/link";
import { AccountStatsClient } from "@/features/account/AccountStatsClient";

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

      <div className="account-stats-layout">
        <AccountStatsClient />
        <article className="surface account-card account-stats-secondary-card account-stats-counts-card" aria-label="What counts today">
          <h2>What counts today</h2>
          <ul className="account-checklist">
            <li>
              <strong>Daily</strong>
              <span>Each date counts once toward your Daily record.</span>
            </li>
            <li>
              <strong>Past Games</strong>
              <span>Dated replays can be saved without changing today&apos;s streak.</span>
            </li>
            <li>
              <strong>Challenges</strong>
              <span>Friend challenge results stay separate from Daily scoring.</span>
            </li>
          </ul>
          <p className="account-env-note">Practice warm-ups are for learning and do not affect your Daily record.</p>
          <Link className="button-secondary" href="/account">
            Back to account
          </Link>
        </article>
      </div>
    </section>
  );
}
