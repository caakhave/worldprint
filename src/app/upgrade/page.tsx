import type { Metadata } from "next";
import { UpgradeClient } from "@/features/account/UpgradeClient";

export const metadata: Metadata = {
  title: "Upgrade",
  description: "Full atlas access for Can You Geo?."
};

export default function UpgradePage() {
  return (
    <section className="account-page account-page-shell page-shell" aria-labelledby="upgrade-title">
      <UpgradeClient />
    </section>
  );
}
