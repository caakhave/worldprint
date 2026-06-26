"use client";

import Link from "next/link";
import { useEntitlement } from "@/features/account/useEntitlement";

export function AccountPlanNotesClient() {
  const { entitlement, loading, signedIn } = useEntitlement();
  const isPro = entitlement.plan === "pro";

  if (loading) {
    return (
      <article className="surface account-card">
        <p className="eyebrow">Account</p>
        <h2>Checking your atlas.</h2>
        <p>Looking for the latest membership state on this account.</p>
      </article>
    );
  }

  if (isPro) {
    return (
      <>
        <article className="surface account-card">
          <p className="eyebrow">Pro access</p>
          <h2>The full atlas is open.</h2>
          <p>Unlimited practice, the complete public Past Games archive, advanced stats, and Challenge history are available here.</p>
        </article>
        <article className="surface account-card">
          <p className="eyebrow">Billing</p>
          <h2>Manage whenever.</h2>
          <p>Use Manage billing to update payment, renew, or cancel. If renewal is canceled, Pro stays active through the paid period.</p>
          <Link className="button-secondary" href="/upgrade">
            View plan
          </Link>
        </article>
        <article className="surface account-card">
          <p className="eyebrow">Progress</p>
          <h2>Keep playing.</h2>
          <p>Completed runs still save locally in this browser, with account stats syncing where supported.</p>
        </article>
      </>
    );
  }

  return (
    <>
      <article className="surface account-card">
        <p className="eyebrow">Open now</p>
        <h2>Play first.</h2>
        <p>Anyone can start a Mystery Map. Completed runs save locally in this browser.</p>
      </article>
      <article className="surface account-card">
        <p className="eyebrow">Free account</p>
        <h2>{signedIn ? "Keep your streak." : "Save when ready."}</h2>
        <p>Email sign-in can save your score history and streak to your account. Returning later? Use the same email and request a fresh link.</p>
      </article>
      <article className="surface account-card">
        <p className="eyebrow">Pro</p>
        <h2>Open the full atlas.</h2>
        <p>Unlock the full archive, unlimited practice, advanced stats, and Challenge history.</p>
      </article>
    </>
  );
}
