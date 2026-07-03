import type { Metadata } from "next";
import { UpgradeClient } from "@/features/account/UpgradeClient";
import { pageMetadata } from "@/lib/site/seo";

export const metadata: Metadata = pageMetadata({
  title: "Free and Pro - Can You Geo?",
  description:
    "Compare Free and Pro access for the Can You Geo game library: Mystery Map, Pattern Atlas, Rank Run planning, saved progress, custom runs, Past Games, and advanced stats.",
  path: "/upgrade/"
});

export default function UpgradePage() {
  return (
    <section className="account-page account-page-shell page-shell" aria-labelledby="upgrade-title">
      <UpgradeClient />
    </section>
  );
}
