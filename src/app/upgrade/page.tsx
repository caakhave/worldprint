import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { UpgradeClient } from "@/features/account/UpgradeClient";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/site/seo";

export const metadata: Metadata = pageMetadata({
  title: "Free and Pro - Can You Geo?",
  description:
    "Compare Free and Pro access for the Can You Geo game library: supported Daily play, Mystery Map Custom Atlas, Pattern Atlas Pattern Runs, Order Atlas Play, Past Games, and advanced stats.",
  path: "/upgrade/"
});

export default function UpgradePage() {
  return (
    <section className="account-page account-page-shell page-shell" aria-labelledby="upgrade-title">
      <JsonLd
        id="canyougeo-upgrade-breadcrumb-jsonld"
        data={breadcrumbJsonLd([
          { name: "Can You Geo?", path: "/" },
          { name: "Free and Pro", path: "/upgrade/" }
        ])}
      />
      <UpgradeClient />
    </section>
  );
}
