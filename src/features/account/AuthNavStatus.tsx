"use client";

import Link from "next/link";
import { accountInitial, compactPlanLabel } from "@/features/account/accountDisplay";
import { useEntitlement } from "@/features/account/useEntitlement";
import { useSupabaseAccount } from "@/features/account/useSupabaseAccount";

export function AuthNavStatus() {
  const { configured, loading, user, signOut } = useSupabaseAccount();
  const { entitlement, loading: entitlementLoading } = useEntitlement();
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
    return (
      <Link className="account-nav-control account-nav-control-signed-out" href="/upgrade">
        Start Pro
      </Link>
    );
  }

  const plan = entitlementLoading ? "Account" : compactPlanLabel(entitlement.plan);
  const isPro = !entitlementLoading && entitlement.plan === "pro";
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
        <Link className="account-nav-menu-item" role="menuitem" href="/account/stats">
          Saved stats
        </Link>
        <Link className="account-nav-menu-item" role="menuitem" href={isPro ? "/account#membership" : "/upgrade"}>
          {isPro ? "Manage billing" : "Manage plan"}
        </Link>
        <button className="account-nav-menu-item" role="menuitem" type="button" onClick={() => void signOut()}>
          Sign out
        </button>
      </div>
    </details>
  );
}
