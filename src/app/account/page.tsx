import type { Metadata } from "next";
import { AccountHeroClient } from "@/features/account/AccountHeroClient";
import { AccountPlanNotesClient } from "@/features/account/AccountPlanNotesClient";
import { BillingReturnNotice } from "@/features/account/BillingReturnNotice";
import { ChangePasswordClient } from "@/features/account/ChangePasswordClient";
import { EntitlementDiagnosticsClient } from "@/features/account/EntitlementDiagnosticsClient";
import { MembershipCardClient } from "@/features/account/MembershipCardClient";
import { AccountStatusClient } from "@/features/account/AccountStatusClient";
import { AccountStatsClient } from "@/features/account/AccountStatsClient";
import { pageMetadata } from "@/lib/site/seo";

export const metadata: Metadata = pageMetadata({
  title: "Account",
  description: "Save your Can You Geo? progress.",
  path: "/account/",
  noIndex: true
});

export default function AccountPage() {
  return (
    <section className="account-page account-page-shell page-shell" aria-labelledby="account-title">
      <AccountHeroClient />
      <BillingReturnNotice context="account" />

      <div className="account-grid">
        <AccountStatusClient />

        <div className="account-stack">
          <MembershipCardClient />
          <ChangePasswordClient />
          <AccountPlanNotesClient />
        </div>
      </div>

      <AccountStatsClient />
      <EntitlementDiagnosticsClient />
    </section>
  );
}
