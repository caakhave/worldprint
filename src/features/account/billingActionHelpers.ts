"use client";

import type { ProBillingInterval } from "@/lib/billing/proPricing";
import type { CanYouGeoSupabaseClient } from "@/lib/supabase/client";

type BillingActionResponse = {
  url?: string;
  error?: string;
};

export type BillingActionKind = "checkout" | "portal";
export type BillingFunctionName = "stripe-checkout" | "stripe-portal";
export type BillingPendingState = "checkout-monthly" | "checkout-yearly" | "portal";

export function warnBillingDetail(message: string, detail: unknown) {
  if (process.env.NODE_ENV !== "production") {
    console.warn(`[billing] ${message}`, detail);
  }
}

export function billingErrorCopy(kind: BillingActionKind, message?: string | null) {
  const normalized = message?.toLowerCase() ?? "";
  if (normalized.includes("configured") || normalized.includes("env") || normalized.includes("supabase")) {
    return kind === "portal" ? "Billing management could not open. Please try again." : "Checkout could not start. Please try again.";
  }
  if (normalized.includes("sign in")) {
    return "Sign in to continue with Pro.";
  }
  return kind === "portal" ? "We could not open billing management. Try again in a minute." : "We could not open checkout. Try again in a minute.";
}

export async function requestBillingActionUrl({
  client,
  signedIn,
  functionName,
  kind,
  interval
}: {
  client: CanYouGeoSupabaseClient | null;
  signedIn: boolean;
  functionName: BillingFunctionName;
  kind: BillingActionKind;
  interval?: ProBillingInterval;
}): Promise<{ url: string | null; message: string | null }> {
  if (!client || !signedIn) {
    return { url: null, message: "Sign in to continue with Pro." };
  }

  const {
    data: { session },
    error: sessionError
  } = await client.auth.getSession();
  if (sessionError || !session?.access_token) {
    warnBillingDetail("Could not read billing session.", sessionError);
    return { url: null, message: "Sign in to continue with Pro." };
  }

  const { data, error } = await client.functions.invoke<BillingActionResponse>(functionName, {
    headers: { Authorization: `Bearer ${session.access_token}` },
    body: interval ? { plan: interval } : undefined
  });
  if (error || data?.error) {
    warnBillingDetail("Billing action failed.", data?.error ?? error);
    return { url: null, message: billingErrorCopy(kind, data?.error ?? error?.message) };
  }
  if (!data?.url) {
    return {
      url: null,
      message: kind === "portal" ? "Billing management could not open. Please try again." : "Checkout could not start. Please try again."
    };
  }

  return { url: data.url, message: null };
}
