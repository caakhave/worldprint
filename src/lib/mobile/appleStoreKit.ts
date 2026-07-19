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

export type AppleStoreKitCatalogStatus =
  | "loaded"
  | "zero_products"
  | "partial"
  | "plugin_unavailable"
  | "network_error"
  | "storefront_unavailable"
  | "not_entitled"
  | "unsupported"
  | "system_error"
  | "unknown_error";

export type AppleStoreKitCatalogResult = {
  status: AppleStoreKitCatalogStatus;
  requestedProductCount: number;
  returnedProductCount: number;
  missingProductIds: AppleStoreKitProductId[];
  products: AppleStoreKitProductDetails[];
  storefrontCountryCode?: string;
};

type AppleStoreKitPlugin = {
  isAvailable: () => Promise<{ available: boolean; platform: string; reason?: string }>;
  loadProducts: (input: { productIds: AppleStoreKitProductId[] }) => Promise<{
    products: AppleStoreKitProductDetails[];
    missingProductIds: string[];
    requestedProductCount?: number;
    returnedProductCount?: number;
    storefrontCountryCode?: string;
    status: AppleStoreKitCatalogStatus | "unavailable" | "failed";
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
    loadProducts: async () => ({
      products: [],
      missingProductIds: [...APPLE_STOREKIT_PRODUCT_IDS],
      requestedProductCount: APPLE_STOREKIT_PRODUCT_IDS.length,
      returnedProductCount: 0,
      status: "plugin_unavailable"
    }),
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

function emptyAppleStoreKitCatalog(status: AppleStoreKitCatalogStatus): AppleStoreKitCatalogResult {
  return {
    status,
    requestedProductCount: APPLE_STOREKIT_PRODUCT_IDS.length,
    returnedProductCount: 0,
    missingProductIds: [...APPLE_STOREKIT_PRODUCT_IDS],
    products: []
  };
}

function normalizeAppleStoreKitCatalogStatus(value: unknown): AppleStoreKitCatalogStatus {
  switch (value) {
    case "loaded":
    case "zero_products":
    case "partial":
    case "plugin_unavailable":
    case "network_error":
    case "storefront_unavailable":
    case "not_entitled":
    case "unsupported":
    case "system_error":
    case "unknown_error":
      return value;
    case "unavailable":
      return "plugin_unavailable";
    default:
      return "unknown_error";
  }
}

function statusForAvailability(reason: string | undefined): AppleStoreKitCatalogStatus {
  if (reason === "storekit_unavailable") return "unsupported";
  return "plugin_unavailable";
}

function sanitizeMissingProductIds(value: unknown): AppleStoreKitProductId[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isAppleStoreKitProductId);
}

function sanitizeAppleStoreKitProducts(value: unknown): AppleStoreKitProductDetails[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || !("productId" in item) || !isAppleStoreKitProductId(item.productId)) {
      return [];
    }
    const rawProduct = item as Record<string, unknown>;
    const productId = item.productId;
    const product: AppleStoreKitProductDetails = {
      productId,
      interval: appleStoreKitIntervalForProductId(productId)
    };
    if (typeof rawProduct.displayName === "string") product.displayName = rawProduct.displayName;
    if (typeof rawProduct.description === "string") product.description = rawProduct.description;
    if (typeof rawProduct.displayPrice === "string") product.displayPrice = rawProduct.displayPrice;
    if (typeof rawProduct.currencyCode === "string") product.currencyCode = rawProduct.currencyCode;
    if (
      rawProduct.subscriptionPeriodUnit === "day" ||
      rawProduct.subscriptionPeriodUnit === "week" ||
      rawProduct.subscriptionPeriodUnit === "month" ||
      rawProduct.subscriptionPeriodUnit === "year"
    ) {
      product.subscriptionPeriodUnit = rawProduct.subscriptionPeriodUnit;
    }
    if (typeof rawProduct.subscriptionPeriodValue === "number" && Number.isFinite(rawProduct.subscriptionPeriodValue)) {
      product.subscriptionPeriodValue = rawProduct.subscriptionPeriodValue;
    }
    return [product];
  });
}

function statusForProducts(status: AppleStoreKitCatalogStatus, products: AppleStoreKitProductDetails[]): AppleStoreKitCatalogStatus {
  if (status !== "loaded" && status !== "partial" && status !== "zero_products") {
    return status;
  }
  const productIds = new Set(products.map((product) => product.productId));
  const hasMonthly = productIds.has(APPLE_STOREKIT_MONTHLY_PRODUCT_ID);
  const hasAnnual = productIds.has(APPLE_STOREKIT_ANNUAL_PRODUCT_ID);
  if (hasMonthly && hasAnnual) return "loaded";
  if (!hasMonthly && !hasAnnual) return "zero_products";
  return "partial";
}

function safeStorefrontCountryCode(value: unknown): string | undefined {
  if (typeof value !== "string" || !/^[A-Z]{2}$/.test(value)) return undefined;
  return value;
}

export async function queryAppleStoreKitCatalog(): Promise<AppleStoreKitCatalogResult> {
  const plugin = await appleStoreKitPlugin();
  let availability: Awaited<ReturnType<AppleStoreKitPlugin["isAvailable"]>>;
  try {
    availability = await plugin.isAvailable();
  } catch {
    return emptyAppleStoreKitCatalog("plugin_unavailable");
  }
  if (!availability.available) {
    return emptyAppleStoreKitCatalog(statusForAvailability(availability.reason));
  }

  try {
    const result = await plugin.loadProducts({ productIds: [...APPLE_STOREKIT_PRODUCT_IDS] });
    const products = sanitizeAppleStoreKitProducts(result.products);
    const status = statusForProducts(normalizeAppleStoreKitCatalogStatus(result.status), products);
    return {
      status,
      requestedProductCount:
        typeof result.requestedProductCount === "number" && Number.isFinite(result.requestedProductCount)
          ? result.requestedProductCount
          : APPLE_STOREKIT_PRODUCT_IDS.length,
      returnedProductCount:
        typeof result.returnedProductCount === "number" && Number.isFinite(result.returnedProductCount)
          ? result.returnedProductCount
          : products.length,
      missingProductIds: sanitizeMissingProductIds(result.missingProductIds),
      products,
      storefrontCountryCode: safeStorefrontCountryCode(result.storefrontCountryCode)
    };
  } catch {
    return emptyAppleStoreKitCatalog("unknown_error");
  }
}

export async function queryAppleStoreKitProducts(): Promise<AppleStoreKitProductDetails[]> {
  const result = await queryAppleStoreKitCatalog();
  return result.products;
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
