import type { Metadata } from "next";
import Link from "next/link";
import { MembershipCardClient } from "@/features/account/MembershipCardClient";
import { AccountStatusClient } from "@/features/account/AccountStatusClient";
import { AccountStatsClient } from "@/features/account/AccountStatsClient";

export const metadata: Metadata = {
  title: "Account",
  description: "Save your Can You Geo? progress."
};

export default function AccountPage() {
  return (
    <section className="account-page account-page-shell page-shell" aria-labelledby="account-title">
      <div className="account-hero">
        <p className="eyebrow">Player account</p>
        <h1 id="account-title" className="page-title">
          Your atlas, saved.
        </h1>
        <p className="lead">Play without an account, or create a free account when you want your streak and stats to follow you.</p>
        <div className="button-row">
          <Link className="button" href="/play/worldprint">
            Play today&apos;s Mystery Map
          </Link>
          <Link className="button-secondary" href="/sign-in">
            Save your score and streak
          </Link>
        </div>
      </div>

      <div className="account-grid">
        <AccountStatusClient />

        <div className="account-stack">
          <MembershipCardClient />
          <article className="surface account-card">
            <p className="eyebrow">Open now</p>
            <h2>Play first.</h2>
            <p>Anyone can start a Mystery Map. Completed runs save locally in this browser.</p>
          </article>
          <article className="surface account-card">
            <p className="eyebrow">Free account</p>
            <h2>Keep your streak.</h2>
            <p>Email sign-in can save your score history and streak to your account. No password needed.</p>
          </article>
          <article className="surface account-card">
            <p className="eyebrow">Pro</p>
            <h2>Open the full atlas.</h2>
            <p>Unlock the full archive, unlimited practice, advanced stats, and Challenge history.</p>
          </article>
        </div>
      </div>

      <AccountStatsClient />
    </section>
  );
}
