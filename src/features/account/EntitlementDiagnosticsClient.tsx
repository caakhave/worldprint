"use client";

import { useEffect, useState } from "react";
import { useEntitlement } from "@/features/account/useEntitlement";
import { useSupabaseAccount } from "@/features/account/useSupabaseAccount";

function canShowDiagnostics(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  const localHostnames = new Set(["localhost", "127.0.0.1", "::1"]);
  return params.get("debug") === "entitlement" && localHostnames.has(window.location.hostname);
}

function present(value: string | null | undefined): string {
  return value ? "Present" : "Not present";
}

export function EntitlementDiagnosticsClient() {
  const [enabled, setEnabled] = useState(false);
  const [checkedAt, setCheckedAt] = useState("");
  const { user } = useSupabaseAccount();
  const { entitlement, loading, error } = useEntitlement();

  useEffect(() => {
    setEnabled(canShowDiagnostics());
    setCheckedAt(new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }));
  }, []);

  if (!enabled) return null;

  return (
    <section className="surface account-card entitlement-diagnostics" aria-label="Entitlement diagnostics">
      <div>
        <p className="eyebrow">Local diagnostics</p>
        <h2>Entitlement check</h2>
        <p>Visible only on localhost with the entitlement debug flag. No secrets or raw user IDs are shown.</p>
      </div>
      <dl className="account-status-list account-mini-status">
        <div>
          <dt>Email</dt>
          <dd>{user?.email ?? "Not signed in"}</dd>
        </div>
        <div>
          <dt>Tier</dt>
          <dd>{loading ? "Checking" : entitlement.plan}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{loading ? "Checking" : entitlement.status}</dd>
        </div>
        <div>
          <dt>Source</dt>
          <dd>{loading ? "Checking" : entitlement.source}</dd>
        </div>
        <div>
          <dt>Stripe customer</dt>
          <dd>{present(entitlement.row?.stripe_customer_id)}</dd>
        </div>
        <div>
          <dt>Stripe subscription</dt>
          <dd>{present(entitlement.row?.stripe_subscription_id)}</dd>
        </div>
        <div>
          <dt>Stripe status</dt>
          <dd>{entitlement.row?.stripe_status ?? "Not present"}</dd>
        </div>
        <div>
          <dt>Cancel at period end</dt>
          <dd>{entitlement.row?.cancel_at_period_end === true ? "Yes" : entitlement.row?.cancel_at_period_end === false ? "No" : "Not present"}</dd>
        </div>
        <div>
          <dt>Last checked</dt>
          <dd>{checkedAt || "Just now"}</dd>
        </div>
      </dl>
      {error ? (
        <p className="account-error" role="alert">
          Entitlement read failed. The app will keep the safe fallback access level.
        </p>
      ) : null}
    </section>
  );
}
