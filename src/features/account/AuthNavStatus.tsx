"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { accountInitial, compactPlanLabel } from "@/features/account/accountDisplay";
import { requestBillingActionUrl } from "@/features/account/billingActionHelpers";
import { isNativeAppBuild } from "@/lib/site/buildTarget";
import { useEntitlement } from "@/features/account/useEntitlement";
import { useSupabaseAccount } from "@/features/account/useSupabaseAccount";
import { publicBillingEnabled } from "@/lib/billing/publicBillingConfig";
import { trackAnalyticsEvent } from "@/lib/site/analytics";

export function AuthNavStatus() {
  const router = useRouter();
  const { client, configured, loading, user, signOut } = useSupabaseAccount();
  const { entitlement, loading: entitlementLoading } = useEntitlement();
  const [billingPending, setBillingPending] = useState(false);
  const [billingMessage, setBillingMessage] = useState("");
  const nativeBuild = isNativeAppBuild();

  if (!configured) {
    return (
      <Link className="account-nav-control account-nav-control-signed-out" href="/account">
        Account
      </Link>
    );
  }
  if (loading) {
    return (
      <Link className="account-nav-control account-nav-control-loading" href="/account" aria-label="Checking account">
        Account
      </Link>
    );
  }
  if (!user) {
    const plansLabel = nativeBuild ? "View plans" : "Start Pro";
    return (
      <div className="account-nav-signed-out-actions">
        <Link
          className="account-nav-control account-nav-control-signed-out account-nav-control-primary"
          href="/upgrade"
          onClick={() =>
            trackAnalyticsEvent("cgy_select_content", {
              content_type: "upgrade_cta",
              item_id: nativeBuild ? "header_view_plans_native_preview" : "header_start_pro"
            })
          }
        >
          {plansLabel}
        </Link>
        <Link
          className="account-nav-control account-nav-control-signed-out"
          href="/sign-in"
          onClick={() =>
            trackAnalyticsEvent("cgy_select_content", {
              content_type: "auth_link",
              item_id: "header_sign_in"
            })
          }
        >
          Sign in
        </Link>
      </div>
    );
  }

  async function handleSignOut() {
    const result = await signOut();
    if (!result.error) {
      router.push("/sign-in?signedOut=1");
    } else if (process.env.NODE_ENV !== "production") {
      console.warn("[auth] Could not sign out from header menu.", result.error);
    }
  }

  async function handleManageBilling() {
    if (nativeBuild) {
      setBillingMessage("Subscription management is not available in this preview.");
      return;
    }

    setBillingPending(true);
    setBillingMessage("");
    const result = await requestBillingActionUrl({
      client,
      signedIn: Boolean(user),
      functionName: "stripe-portal",
      kind: "portal"
    });
    setBillingPending(false);
    if (result.message || !result.url) {
      setBillingMessage(result.message ?? "Billing management could not open. Please try again.");
      return;
    }
    window.location.assign(result.url);
  }

  const plan = entitlementLoading ? "Account" : compactPlanLabel(entitlement.plan);
  const isPro = !entitlementLoading && entitlement.plan === "pro";
  const canManageBilling = isPro && Boolean(entitlement.row?.stripe_customer_id) && publicBillingEnabled() && !nativeBuild;
  return (
    <details className="account-nav-menu">
      <summary
        className="account-nav-control account-nav-control-signed-in"
        aria-label={`Account menu for ${user.email ?? "signed-in player"}`}
        title="Open account menu"
      >
        <span className="account-avatar" aria-hidden="true">
          {accountInitial(user.email)}
        </span>
        <span className="account-nav-email" title={user.email ?? "Account"}>
          {user.email ?? "Account"}
        </span>
        <span className="account-plan-badge" data-plan={entitlementLoading ? "loading" : entitlement.plan}>
          {plan}
        </span>
        <span className="account-nav-action" aria-hidden="true">
          Menu
        </span>
      </summary>
      <div className="account-nav-popover" role="menu" aria-label="Account menu">
        <Link className="account-nav-menu-item" role="menuitem" href="/account">
          View account
        </Link>
        <Link className="account-nav-menu-item" role="menuitem" href="/account/stats#saved-stats">
          Saved stats
        </Link>
        {canManageBilling ? (
          <button
            className="account-nav-menu-item"
            role="menuitem"
            type="button"
            onClick={() => void handleManageBilling()}
            disabled={billingPending}
          >
            {billingPending ? "Opening billing..." : "Manage billing"}
          </button>
        ) : (
          <Link
            className="account-nav-menu-item"
            role="menuitem"
            href={isPro ? "/account#membership" : "/upgrade"}
            onClick={() => {
              if (!isPro) {
                trackAnalyticsEvent("cgy_select_content", {
                  content_type: "upgrade_cta",
                  item_id: "header_compare_plans"
                });
              }
            }}
          >
            {isPro ? "View membership" : "Compare plans"}
          </Link>
        )}
        {nativeBuild && isPro && Boolean(entitlement.row?.stripe_customer_id) ? (
          <p className="account-nav-menu-error" role="note">
            Subscription management is not available in this preview.
          </p>
        ) : null}
        {billingMessage ? (
          <p className="account-nav-menu-error" role="alert">
            {billingMessage}
          </p>
        ) : null}
        <button className="account-nav-menu-item" role="menuitem" type="button" onClick={() => void handleSignOut()}>
          Sign out
        </button>
      </div>
    </details>
  );
}
