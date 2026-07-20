"use client";

import { fetchRemoteEntitlement, resolvePlayerEntitlement } from "@/lib/account/entitlements";
import {
  finishVerifiedAppleStoreKitTransactions,
  manageAppleStoreKitSubscription,
  purchaseAppleStoreKitProduct,
  restoreAppleStoreKitPurchases,
  syncUnfinishedAppleStoreKitTransactions,
  type AppleStoreKitAuthenticatedInput,
  type AppleStoreKitOperationResult,
  type AppleStoreKitProductId
} from "@/lib/mobile/appleStoreKit";
import type { CanYouGeoSupabaseClient } from "@/lib/supabase/client";
import { getSupabasePublicConfig } from "@/lib/supabase/env";

type AppleStoreKitSessionResult =
  | {
      ok: true;
      input: AppleStoreKitAuthenticatedInput;
    }
  | {
      ok: false;
      message: string;
    };

export type AppleStoreKitActionResult = {
  ok: boolean;
  status: AppleStoreKitOperationResult["status"] | "finished" | "entitlementPending";
  message: string | null;
  verifiedCount?: number;
};

export async function startAppleStoreKitPurchase(input: {
  client: CanYouGeoSupabaseClient | null;
  signedIn: boolean;
  productId: AppleStoreKitProductId;
}): Promise<AppleStoreKitActionResult> {
  const session = await appleStoreKitSession(input.client, input.signedIn);
  if (!session.ok) return { ok: false, status: "requiresSignIn", message: session.message };
  const result = await purchaseAppleStoreKitProduct({ ...session.input, productId: input.productId });
  return appleStoreKitActionResult(result);
}

export async function restoreAppleStoreKitEntitlements(input: {
  client: CanYouGeoSupabaseClient | null;
  signedIn: boolean;
}): Promise<AppleStoreKitActionResult> {
  const session = await appleStoreKitSession(input.client, input.signedIn);
  if (!session.ok) return { ok: false, status: "requiresSignIn", message: session.message };
  const result = await restoreAppleStoreKitPurchases(session.input);
  return appleStoreKitActionResult(result);
}

export async function syncUnfinishedAppleStoreKitEntitlements(input: {
  client: CanYouGeoSupabaseClient | null;
  signedIn: boolean;
}): Promise<AppleStoreKitActionResult> {
  const session = await appleStoreKitSession(input.client, input.signedIn);
  if (!session.ok) return { ok: false, status: "requiresSignIn", message: session.message };
  const result = await syncUnfinishedAppleStoreKitTransactions(session.input);
  return appleStoreKitActionResult(result);
}

export async function finishAppleStoreKitAfterEntitlement(input: {
  client: CanYouGeoSupabaseClient | null;
  userId: string | null | undefined;
}): Promise<{ ok: boolean; message: string | null; finishedCount: number }> {
  if (!input.client || !input.userId) {
    return { ok: false, message: "Sign in to restore purchase.", finishedCount: 0 };
  }
  const entitlement = await fetchRemoteEntitlement(input.client, input.userId);
  if (entitlement.error) {
    warnAppleStoreKitBillingDetail("Could not refresh Apple purchase entitlement.", entitlement.error);
    return { ok: false, message: "Apple purchase verified. Pro access is still refreshing.", finishedCount: 0 };
  }
  if (resolvePlayerEntitlement(entitlement.data, true).plan !== "pro") {
    return { ok: false, message: "Apple purchase verified. Pro access is still refreshing.", finishedCount: 0 };
  }
  const finished = await finishVerifiedAppleStoreKitTransactions();
  return { ok: true, message: "Apple purchase verified. Pro access is active.", finishedCount: finished.finishedCount };
}

export async function openAppleStoreKitSubscriptionManagement(): Promise<{ ok: boolean; message: string | null }> {
  const result = await manageAppleStoreKitSubscription();
  if (result.opened) return { ok: true, message: null };
  return { ok: false, message: "Apple subscription management could not open right now." };
}

async function appleStoreKitSession(
  client: CanYouGeoSupabaseClient | null,
  signedIn: boolean
): Promise<AppleStoreKitSessionResult> {
  if (!client || !signedIn) return { ok: false, message: "Sign in to continue with Pro." };
  const config = getSupabasePublicConfig();
  if (!config) return { ok: false, message: "Apple purchases are not ready yet." };
  const {
    data: { session },
    error
  } = await client.auth.getSession();
  if (error || !session?.access_token) {
    warnAppleStoreKitBillingDetail("Could not read Apple purchase session.", error);
    return { ok: false, message: "Sign in to continue with Pro." };
  }
  return {
    ok: true,
    input: {
      supabaseUrl: config.url,
      anonKey: config.anonKey,
      accessToken: session.access_token
    }
  };
}

function appleStoreKitActionResult(result: AppleStoreKitOperationResult): AppleStoreKitActionResult {
  if (result.status === "backendVerified") {
    return {
      ok: true,
      status: result.status,
      message: "Apple purchase verified. Pro access will refresh shortly.",
      verifiedCount: result.verifiedCount
    };
  }
  if (result.status === "none") {
    return { ok: true, status: result.status, message: "No active Apple purchases were found for this account.", verifiedCount: 0 };
  }
  if (result.status === "pending") {
    return { ok: true, status: result.status, message: "Apple reports this purchase is pending approval." };
  }
  if (result.status === "canceled") {
    return { ok: true, status: result.status, message: "Purchase cancelled. No charge was made." };
  }
  return {
    ok: false,
    status: result.status,
    message: appleStoreKitErrorMessage(result.status)
  };
}

function appleStoreKitErrorMessage(status: AppleStoreKitOperationResult["status"]) {
  if (status === "requiresSignIn") return "Sign in to restore purchase.";
  if (status === "productUnavailable") return "This Apple subscription plan is not available right now.";
  if (status === "accountConflict") return "This Apple subscription is linked to another Can You Geo account. Contact support.";
  if (status === "backendUnavailable") return "Apple purchase verification is unavailable. Try Restore purchases in a minute.";
  if (status === "backendRejected" || status === "unverified") return "Apple purchase could not be verified. Try Restore purchases in a minute.";
  if (status === "storeUnavailable") return "Apple purchases are not available right now.";
  return "Apple purchase could not be completed. Try again in a minute.";
}

export function warnAppleStoreKitBillingDetail(message: string, detail: unknown) {
  if (process.env.NODE_ENV !== "production") {
    void detail;
    console.warn(`[apple-storekit] ${message}`);
  }
}
