"use client";

import { PRO_ENTITLEMENT, type PlayerEntitlement } from "@/lib/account/entitlements";

export type NativeAppleReviewEntitlementPayload = {
  providerEnvironment: "sandbox";
  plan: "pro";
  status: "active";
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean | null;
  verifiedAt: string;
};

let activeNativeAppleReviewEntitlement: PlayerEntitlement | null = null;

export function activateNativeAppleReviewEntitlement(payload: NativeAppleReviewEntitlementPayload | null | undefined): boolean {
  if (!payload || payload.providerEnvironment !== "sandbox" || payload.plan !== "pro" || payload.status !== "active") {
    return false;
  }
  if (payload.currentPeriodEnd && Date.parse(payload.currentPeriodEnd) <= Date.now()) {
    activeNativeAppleReviewEntitlement = null;
    return false;
  }
  activeNativeAppleReviewEntitlement = {
    ...PRO_ENTITLEMENT,
    source: "native-apple-review",
    row: null
  };
  return true;
}

export function clearNativeAppleReviewEntitlement() {
  activeNativeAppleReviewEntitlement = null;
}

export function nativeAppleReviewEntitlement(): PlayerEntitlement | null {
  return activeNativeAppleReviewEntitlement;
}
