"use client";

import Link from "next/link";
import { accountInitial, compactPlanLabel } from "@/features/account/accountDisplay";
import { useEntitlement } from "@/features/account/useEntitlement";
import { useSupabaseAccount } from "@/features/account/useSupabaseAccount";

export function AuthNavStatus() {
  const { configured, loading, user } = useSupabaseAccount();
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
  return (
    <Link
      className="account-nav-control account-nav-control-signed-in"
      href="/account"
      aria-label={`Open account for ${user.email ?? "signed-in player"}`}
      title="Open account"
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
        Account
      </span>
    </Link>
  );
}
