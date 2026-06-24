import type { Metadata } from "next";
import Link from "next/link";
import { UpgradeClient } from "@/features/account/UpgradeClient";

export const metadata: Metadata = {
  title: "Upgrade",
  description: "Full atlas access for Can You Geo?."
};

export default function UpgradePage() {
  return (
    <section className="account-page account-page-shell page-shell" aria-labelledby="upgrade-title">
      <div className="account-hero">
        <p className="eyebrow">Can You Geo? Pro</p>
        <h1 id="upgrade-title" className="page-title">
          Unlock the full atlas.
        </h1>
        <p className="lead">
          Free lets you play the Daily and save basic progress. Pro unlocks the full atlas, unlimited practice, advanced stats, and the complete Past Games archive.
        </p>
        <div className="button-row">
          <Link className="button" href="/play/worldprint">
            Play today
          </Link>
          <Link className="button-secondary" href="/account">
            View account
          </Link>
        </div>
      </div>
      <UpgradeClient />
    </section>
  );
}
