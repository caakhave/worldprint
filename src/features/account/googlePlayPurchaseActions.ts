"use client";

import type { CanYouGeoSupabaseClient } from "@/lib/supabase/client";
import {
  GOOGLE_PLAY_PRODUCT_ID,
  type GooglePlayBasePlanId,
  type GooglePlayPurchase,
  validPurchaseTokenShape
} from "@/lib/mobile/googlePlayBilling";

type PurchaseContextResponse = {
  obfuscatedAccountId?: string;
  productId?: string;
  allowedBasePlanIds?: string[];
  error?: string;
};

type PurchaseVerifyResponse = {
  ok?: boolean;
  status?: string;
  error?: string;
};

export async function requestGooglePlayPurchaseContext(input: {
  client: CanYouGeoSupabaseClient | null;
  signedIn: boolean;
}): Promise<{ obfuscatedAccountId: string | null; message: string | null }> {
  const session = await signedInSession(input.client, input.signedIn);
  if (!session.accessToken) return { obfuscatedAccountId: null, message: session.message };
  const { data, error } = await input.client!.functions.invoke<PurchaseContextResponse>("google-play-purchase-context", {
    headers: { Authorization: `Bearer ${session.accessToken}` }
  });
  if (error || data?.error) {
    warnGooglePlayBillingDetail("Google Play purchase context failed.", data?.error ?? error);
    return { obfuscatedAccountId: null, message: "Google Play purchases could not start. Try again in a minute." };
  }
  if (!data?.obfuscatedAccountId || data.productId !== GOOGLE_PLAY_PRODUCT_ID || !Array.isArray(data.allowedBasePlanIds)) {
    return { obfuscatedAccountId: null, message: "Google Play purchases are not ready yet." };
  }
  return { obfuscatedAccountId: data.obfuscatedAccountId, message: null };
}

export async function verifyGooglePlayPurchase(input: {
  client: CanYouGeoSupabaseClient | null;
  signedIn: boolean;
  purchase: GooglePlayPurchase;
  basePlanId?: GooglePlayBasePlanId | null;
}): Promise<{ ok: boolean; message: string | null }> {
  const session = await signedInSession(input.client, input.signedIn);
  if (!session.accessToken) return { ok: false, message: session.message };
  if (input.purchase.productId !== GOOGLE_PLAY_PRODUCT_ID || !validPurchaseTokenShape(input.purchase.purchaseToken)) {
    return { ok: false, message: "Google Play purchase could not be verified." };
  }
  const { data, error } = await input.client!.functions.invoke<PurchaseVerifyResponse>("google-play-purchase-verify", {
    headers: { Authorization: `Bearer ${session.accessToken}` },
    body: {
      purchaseToken: input.purchase.purchaseToken,
      productId: GOOGLE_PLAY_PRODUCT_ID,
      ...(input.basePlanId ? { basePlanId: input.basePlanId } : {})
    }
  });
  if (error || data?.error || !data?.ok) {
    warnGooglePlayBillingDetail("Google Play purchase verification failed.", data?.error ?? error);
    return { ok: false, message: "Google Play purchase could not be verified. Try Restore purchases in a minute." };
  }
  return { ok: true, message: null };
}

export function warnGooglePlayBillingDetail(message: string, detail: unknown) {
  if (process.env.NODE_ENV !== "production") {
    void detail;
    console.warn(`[google-play-billing] ${message}`);
  }
}

async function signedInSession(
  client: CanYouGeoSupabaseClient | null,
  signedIn: boolean
): Promise<{ accessToken: string | null; message: string | null }> {
  if (!client || !signedIn) return { accessToken: null, message: "Sign in to continue with Pro." };
  const {
    data: { session },
    error
  } = await client.auth.getSession();
  if (error || !session?.access_token) {
    warnGooglePlayBillingDetail("Could not read Google Play billing session.", error);
    return { accessToken: null, message: "Sign in to continue with Pro." };
  }
  return { accessToken: session.access_token, message: null };
}
