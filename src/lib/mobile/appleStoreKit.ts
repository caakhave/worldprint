"use client";

import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";

export const APPLE_STOREKIT_MONTHLY_PRODUCT_ID = "com.canyougeo.pro.monthly";
export const APPLE_STOREKIT_ANNUAL_PRODUCT_ID = "com.canyougeo.pro.annual";

export type AppleStoreKitProductId = typeof APPLE_STOREKIT_MONTHLY_PRODUCT_ID | typeof APPLE_STOREKIT_ANNUAL_PRODUCT_ID;
export type AppleStoreKitPlanInterval = "monthly" | "yearly";

export type AppleStoreKitProductDetails = {
  productId: AppleStoreKitProductId;
  interval: AppleStoreKitPlanInterval;
  displayName?: string;
  description?: string;
  displayPrice?: string;
  currencyCode?: string;
  subscriptionPeriodUnit?: "day" | "week" | "month" | "year";
  subscriptionPeriodValue?: number;
};

export type AppleStoreKitOperationStatus =
  | "backendVerified"
  | "pending"
  | "canceled"
  | "unverified"
  | "productUnavailable"
  | "requiresSignIn"
  | "backendRejected"
  | "backendUnavailable"
  | "accountConflict"
  | "storeUnavailable"
  | "failed"
  | "none";

export type AppleStoreKitOperationResult = {
  status: AppleStoreKitOperationStatus;
  verifiedCount?: number;
  requiresEntitlementRefresh?: boolean;
  clientMayFinishTransaction?: boolean;
  message?: string;
};

export type AppleStoreKitTransactionEvent = {
  status: "requiresSignIn" | "pendingVerification" | "unverified";
  productId?: AppleStoreKitProductId;
};

type AppleStoreKitPlugin = {
  isAvailable: () => Promise<{ available: boolean; platform: string; reason?: string }>;
  loadProducts: (input: { productIds: AppleStoreKitProductId[] }) => Promise<{
    products: AppleStoreKitProductDetails[];
    missingProductIds: string[];
    status: "loaded" | "partial" | "unavailable" | "failed";
  }>;
  purchase: (input: AppleStoreKitAuthenticatedInput & { productId: AppleStoreKitProductId }) => Promise<AppleStoreKitOperationResult>;
  restorePurchases: (input: AppleStoreKitAuthenticatedInput) => Promise<AppleStoreKitOperationResult>;
  syncUnfinished: (input: AppleStoreKitAuthenticatedInput) => Promise<AppleStoreKitOperationResult>;
  finishVerifiedTransactions: () => Promise<{ finishedCount: number }>;
  manageSubscription: () => Promise<{ opened: boolean; status: "opened" | "unavailable" | "failed" }>;
  addListener: (
    eventName: "transactionUpdated",
    listenerFunc: (event: AppleStoreKitTransactionEvent) => void
  ) => Promise<PluginListenerHandle>;
};

export type AppleStoreKitAuthenticatedInput = {
  supabaseUrl: string;
  anonKey: string;
  accessToken: string;
};

const APPLE_STOREKIT_PRODUCT_IDS = [APPLE_STOREKIT_MONTHLY_PRODUCT_ID, APPLE_STOREKIT_ANNUAL_PRODUCT_ID] as const;

let appleStoreKitPromise: Promise<AppleStoreKitPlugin> | null = null;

function fallbackAppleStoreKitPlugin(): AppleStoreKitPlugin {
  return {
    isAvailable: async () => ({ available: false, platform: "web", reason: "native_plugin_missing" }),
    loadProducts: async () => ({ products: [], missingProductIds: [...APPLE_STOREKIT_PRODUCT_IDS], status: "unavailable" }),
    purchase: async () => ({ status: "storeUnavailable", message: "Apple purchases are not available right now." }),
    restorePurchases: async () => ({ status: "storeUnavailable", verifiedCount: 0, message: "Apple purchases are not available right now." }),
    syncUnfinished: async () => ({ status: "storeUnavailable", verifiedCount: 0 }),
    finishVerifiedTransactions: async () => ({ finishedCount: 0 }),
    manageSubscription: async () => ({ opened: false, status: "unavailable" }),
    addListener: async () => ({ remove: async () => undefined })
  };
}

async function appleStoreKitPlugin(): Promise<AppleStoreKitPlugin> {
  appleStoreKitPromise ??= Promise.resolve(
    typeof registerPlugin === "function"
      ? registerPlugin<AppleStoreKitPlugin>("AppleStoreKit")
      : fallbackAppleStoreKitPlugin()
  ).catch(() => fallbackAppleStoreKitPlugin());
  return appleStoreKitPromise;
}

export function isIOSAppleStoreKitRuntime(): boolean {
  try {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
  } catch {
    return false;
  }
}

export function isAppleStoreKitProductId(value: unknown): value is AppleStoreKitProductId {
  return value === APPLE_STOREKIT_MONTHLY_PRODUCT_ID || value === APPLE_STOREKIT_ANNUAL_PRODUCT_ID;
}

export function appleStoreKitProductIdForInterval(interval: AppleStoreKitPlanInterval): AppleStoreKitProductId {
  return interval === "yearly" ? APPLE_STOREKIT_ANNUAL_PRODUCT_ID : APPLE_STOREKIT_MONTHLY_PRODUCT_ID;
}

export function appleStoreKitIntervalForProductId(productId: AppleStoreKitProductId): AppleStoreKitPlanInterval {
  return productId === APPLE_STOREKIT_ANNUAL_PRODUCT_ID ? "yearly" : "monthly";
}

export async function queryAppleStoreKitProducts(): Promise<AppleStoreKitProductDetails[]> {
  const plugin = await appleStoreKitPlugin();
  const result = await plugin.loadProducts({ productIds: [...APPLE_STOREKIT_PRODUCT_IDS] });
  return result.products.filter((product) => isAppleStoreKitProductId(product.productId));
}

export async function purchaseAppleStoreKitProduct(
  input: AppleStoreKitAuthenticatedInput & { productId: AppleStoreKitProductId }
): Promise<AppleStoreKitOperationResult> {
  const plugin = await appleStoreKitPlugin();
  return plugin.purchase(input);
}

export async function restoreAppleStoreKitPurchases(input: AppleStoreKitAuthenticatedInput): Promise<AppleStoreKitOperationResult> {
  const plugin = await appleStoreKitPlugin();
  return plugin.restorePurchases(input);
}

export async function syncUnfinishedAppleStoreKitTransactions(input: AppleStoreKitAuthenticatedInput): Promise<AppleStoreKitOperationResult> {
  const plugin = await appleStoreKitPlugin();
  return plugin.syncUnfinished(input);
}

export async function finishVerifiedAppleStoreKitTransactions(): Promise<{ finishedCount: number }> {
  const plugin = await appleStoreKitPlugin();
  return plugin.finishVerifiedTransactions();
}

export async function manageAppleStoreKitSubscription(): Promise<{ opened: boolean; status: "opened" | "unavailable" | "failed" }> {
  const plugin = await appleStoreKitPlugin();
  return plugin.manageSubscription();
}

export async function addAppleStoreKitTransactionUpdatedListener(
  listener: (event: AppleStoreKitTransactionEvent) => void
): Promise<PluginListenerHandle> {
  const plugin = await appleStoreKitPlugin();
  return plugin.addListener("transactionUpdated", listener);
}

export function resetAppleStoreKitPluginForTests() {
  appleStoreKitPromise = null;
}
