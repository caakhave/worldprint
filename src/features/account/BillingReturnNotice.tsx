"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useEntitlement } from "@/features/account/useEntitlement";
import { CONTACT_LINKS } from "@/lib/contact";

type BillingReturnState = "success" | "cancelled" | null;

function readBillingReturnState(): BillingReturnState {
  if (typeof window === "undefined") return null;
  const value = new URLSearchParams(window.location.search).get("billing");
  if (value === "success") return "success";
  if (value === "cancelled" || value === "canceled" || value === "cancel") return "cancelled";
  return null;
}

export function BillingReturnNotice({ context }: { context: "account" | "upgrade" }) {
  const [billingState, setBillingState] = useState<BillingReturnState>(null);
  const { entitlement, loading } = useEntitlement();

  useEffect(() => {
    setBillingState(readBillingReturnState());
  }, []);

  if (!billingState) return null;

  if (billingState === "cancelled") {
    return (
      <aside className="surface billing-return-notice" role="status" aria-live="polite" data-status="cancelled">
        <div>
          <p className="eyebrow">Checkout cancelled</p>
          <h2>No charge was made.</h2>
          <p>
            You can keep playing for free, compare plans again, or come back when you are ready.{" "}
            <a href={CONTACT_LINKS.billingHelp.href}>Email support for billing help</a>.
          </p>
        </div>
        {context === "account" ? (
          <Link className="button-secondary" href="/upgrade">
            Compare plans
          </Link>
        ) : (
          <Link className="button-secondary" href="/play/mystery-map">
            Keep playing
          </Link>
        )}
      </aside>
    );
  }

  const proActive = entitlement.plan === "pro";
  return (
    <aside className="surface billing-return-notice" role="status" aria-live="polite" data-status={proActive ? "pro" : "pending"}>
      <div>
        <p className="eyebrow">Checkout complete</p>
        <h2>{loading ? "Checking Pro access." : proActive ? "Can You Geo? Pro" : "Pro access is being verified."}</h2>
        <p>
          {loading
            ? "Stripe is confirming your subscription. This usually takes a moment."
            : proActive
              ? "Mystery Map Custom Atlas, Pattern Atlas Pattern Runs, the complete Past Games archive, and advanced stats are unlocked on this account."
              : "Stripe finished checkout and the subscription update is still arriving. Refresh in a moment if your account does not switch to Pro."}
          {!proActive && !loading ? (
            <>
              {" "}
              <a href={CONTACT_LINKS.billingHelp.href}>Email support for billing help</a>.
            </>
          ) : null}
        </p>
      </div>
      <Link className="button-secondary" href={proActive ? "/play/mystery-map" : "/account"}>
        {proActive ? "Play Pro" : "Refresh account"}
      </Link>
    </aside>
  );
}
