import type { Metadata } from "next";
import { AccountHeroClient } from "@/features/account/AccountHeroClient";
import { AccountPlanNotesClient } from "@/features/account/AccountPlanNotesClient";
import { BillingReturnNotice } from "@/features/account/BillingReturnNotice";
import { EntitlementDiagnosticsClient } from "@/features/account/EntitlementDiagnosticsClient";
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
      <AccountHeroClient />
      <BillingReturnNotice context="account" />

      <div className="account-grid">
        <AccountStatusClient />

        <div className="account-stack">
          <MembershipCardClient />
          <AccountPlanNotesClient />
        </div>
      </div>

      <AccountStatsClient />
      <EntitlementDiagnosticsClient />
    </section>
  );
}
