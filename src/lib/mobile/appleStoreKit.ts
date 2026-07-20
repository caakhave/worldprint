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
  nativeReviewEntitlement?: {
    providerEnvironment: "sandbox";
    plan: "pro";
    status: "active";
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean | null;
    verifiedAt: string;
  } | null;
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
  | "timeout"
  | "network_error"
  | "storefront_unavailable"
  | "not_entitled"
  | "unsupported"
  | "system_error"
  | "unknown_error";

export type AppleStoreKitTimeoutPhase = "plugin_availability" | "product_request";

export type AppleStoreKitCatalogResult = {
  status: AppleStoreKitCatalogStatus;
  requestedProductCount: number;
  returnedProductCount: number;
  missingProductIds: AppleStoreKitProductId[];
  products: AppleStoreKitProductDetails[];
  storefrontCountryCode?: string;
  timeoutPhase?: AppleStoreKitTimeoutPhase;
};

type AppleStoreKitPlugin = {
  isAvailable: () => Promise<{ available: boolean; platform: string; reason?: string }>;
  loadProducts: (input: { productIds: AppleStoreKitProductId[] }) => Promise<{
    products: AppleStoreKitProductDetails[];
    missingProductIds: string[];
    requestedProductCount?: number;
    returnedProductCount?: number;
    storefrontCountryCode?: string;
    timeoutPhase?: AppleStoreKitTimeoutPhase;
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
const APPLE_STOREKIT_AVAILABILITY_TIMEOUT_MS = 5_000;
const APPLE_STOREKIT_PRODUCT_REQUEST_TIMEOUT_MS = 10_000;
const APPLE_STOREKIT_TRANSACTION_LISTENER_TIMEOUT_MS = 5_000;

let appleStoreKitPluginInstance: AppleStoreKitPlugin | null = null;
let appleStoreKitCatalogCache: AppleStoreKitCatalogResult | null = null;
let appleStoreKitCatalogInFlight: Promise<AppleStoreKitCatalogResult> | null = null;
let appleStoreKitCatalogAttemptVersion = 0;
let appleStoreKitNativeTransactionListenerHandle: PluginListenerHandle | null = null;
let appleStoreKitNativeTransactionListenerInFlight: Promise<void> | null = null;
let appleStoreKitNativeTransactionListenerAttemptVersion = 0;
let appleStoreKitTransactionListeners = new Set<(event: AppleStoreKitTransactionEvent) => void>();

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

function appleStoreKitPlugin(): AppleStoreKitPlugin {
  if (!appleStoreKitPluginInstance) {
    try {
      appleStoreKitPluginInstance =
        typeof registerPlugin === "function"
          ? registerPlugin<AppleStoreKitPlugin>("AppleStoreKit")
          : fallbackAppleStoreKitPlugin();
    } catch {
      appleStoreKitPluginInstance = fallbackAppleStoreKitPlugin();
    }
  }
  return appleStoreKitPluginInstance;
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

function emptyAppleStoreKitCatalog(status: AppleStoreKitCatalogStatus, timeoutPhase?: AppleStoreKitTimeoutPhase): AppleStoreKitCatalogResult {
  return {
    status,
    requestedProductCount: APPLE_STOREKIT_PRODUCT_IDS.length,
    returnedProductCount: 0,
    missingProductIds: [...APPLE_STOREKIT_PRODUCT_IDS],
    products: [],
    ...(timeoutPhase ? { timeoutPhase } : {})
  };
}

function normalizeAppleStoreKitCatalogStatus(value: unknown): AppleStoreKitCatalogStatus {
  switch (value) {
    case "loaded":
    case "zero_products":
    case "partial":
    case "plugin_unavailable":
    case "timeout":
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
  if (typeof value !== "string" || !/^[A-Z]{3}$/.test(value)) return undefined;
  return value;
}

function timeoutAppleStoreKitCatalog(timeoutPhase: AppleStoreKitTimeoutPhase): AppleStoreKitCatalogResult {
  return emptyAppleStoreKitCatalog("timeout", timeoutPhase);
}

function withAppleStoreKitTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutValue: T): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => resolve(timeoutValue), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
}

async function loadAppleStoreKitCatalogAttempt(): Promise<AppleStoreKitCatalogResult> {
  const plugin = appleStoreKitPlugin();
  let availability: Awaited<ReturnType<AppleStoreKitPlugin["isAvailable"]>>;
  try {
    availability = await withAppleStoreKitTimeout(
      plugin.isAvailable(),
      APPLE_STOREKIT_AVAILABILITY_TIMEOUT_MS,
      { available: false, platform: "ios", reason: "timeout" }
    );
  } catch {
    return emptyAppleStoreKitCatalog("plugin_unavailable");
  }
  if (availability.reason === "timeout") {
    return timeoutAppleStoreKitCatalog("plugin_availability");
  }
  if (!availability.available) {
    return emptyAppleStoreKitCatalog(statusForAvailability(availability.reason));
  }

  try {
    const timeoutResult = {
      status: "timeout" as const,
      requestedProductCount: APPLE_STOREKIT_PRODUCT_IDS.length,
      returnedProductCount: 0,
      missingProductIds: [...APPLE_STOREKIT_PRODUCT_IDS],
      products: [],
      timeoutPhase: "product_request" as const
    };
    const result = await withAppleStoreKitTimeout(
      plugin.loadProducts({ productIds: [...APPLE_STOREKIT_PRODUCT_IDS] }),
      APPLE_STOREKIT_PRODUCT_REQUEST_TIMEOUT_MS,
      timeoutResult
    );
    if (result.status === "timeout") {
      return timeoutAppleStoreKitCatalog(result.timeoutPhase ?? "product_request");
    }
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

export async function queryAppleStoreKitCatalog(options: { forceRefresh?: boolean } = {}): Promise<AppleStoreKitCatalogResult> {
  if (options.forceRefresh) {
    appleStoreKitCatalogCache = null;
    appleStoreKitCatalogInFlight = null;
    appleStoreKitCatalogAttemptVersion += 1;
  }
  if (appleStoreKitCatalogCache) return appleStoreKitCatalogCache;
  if (!appleStoreKitCatalogInFlight) {
    const attemptVersion = appleStoreKitCatalogAttemptVersion + 1;
    appleStoreKitCatalogAttemptVersion = attemptVersion;
    appleStoreKitCatalogInFlight = loadAppleStoreKitCatalogAttempt()
      .then((catalog) => {
        if (attemptVersion === appleStoreKitCatalogAttemptVersion) {
          appleStoreKitCatalogCache = catalog;
        }
        return catalog;
      })
      .finally(() => {
        if (attemptVersion === appleStoreKitCatalogAttemptVersion) {
          appleStoreKitCatalogInFlight = null;
        }
      });
  }
  return appleStoreKitCatalogInFlight;
}

export async function queryAppleStoreKitProducts(): Promise<AppleStoreKitProductDetails[]> {
  const result = await queryAppleStoreKitCatalog();
  return result.products;
}

export async function purchaseAppleStoreKitProduct(
  input: AppleStoreKitAuthenticatedInput & { productId: AppleStoreKitProductId }
): Promise<AppleStoreKitOperationResult> {
  const plugin = appleStoreKitPlugin();
  return plugin.purchase(input);
}

export async function restoreAppleStoreKitPurchases(input: AppleStoreKitAuthenticatedInput): Promise<AppleStoreKitOperationResult> {
  const plugin = appleStoreKitPlugin();
  return plugin.restorePurchases(input);
}

export async function syncUnfinishedAppleStoreKitTransactions(input: AppleStoreKitAuthenticatedInput): Promise<AppleStoreKitOperationResult> {
  const plugin = appleStoreKitPlugin();
  return plugin.syncUnfinished(input);
}

export async function finishVerifiedAppleStoreKitTransactions(): Promise<{ finishedCount: number }> {
  const plugin = appleStoreKitPlugin();
  return plugin.finishVerifiedTransactions();
}

export async function manageAppleStoreKitSubscription(): Promise<{ opened: boolean; status: "opened" | "unavailable" | "failed" }> {
  const plugin = appleStoreKitPlugin();
  return plugin.manageSubscription();
}

function dispatchAppleStoreKitTransactionEvent(event: AppleStoreKitTransactionEvent) {
  for (const registeredListener of appleStoreKitTransactionListeners) {
    registeredListener(event);
  }
}

function ensureAppleStoreKitNativeTransactionListener() {
  if (
    appleStoreKitNativeTransactionListenerHandle ||
    appleStoreKitNativeTransactionListenerInFlight ||
    appleStoreKitTransactionListeners.size === 0
  ) {
    return;
  }

  const attemptVersion = appleStoreKitNativeTransactionListenerAttemptVersion + 1;
  appleStoreKitNativeTransactionListenerAttemptVersion = attemptVersion;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  try {
    const nativeListenerPromise = appleStoreKitPlugin().addListener("transactionUpdated", dispatchAppleStoreKitTransactionEvent);

    const timeoutPromise = new Promise<void>((resolve) => {
      timeoutId = setTimeout(resolve, APPLE_STOREKIT_TRANSACTION_LISTENER_TIMEOUT_MS);
    });

    nativeListenerPromise
      .then((handle) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        if (
          attemptVersion !== appleStoreKitNativeTransactionListenerAttemptVersion ||
          appleStoreKitNativeTransactionListenerHandle ||
          appleStoreKitTransactionListeners.size === 0
        ) {
          void handle.remove();
          return;
        }
        appleStoreKitNativeTransactionListenerHandle = handle;
      })
      .catch(() => {
        if (attemptVersion === appleStoreKitNativeTransactionListenerAttemptVersion) {
          appleStoreKitNativeTransactionListenerAttemptVersion += 1;
        }
      })
      .finally(() => {
        if (attemptVersion === appleStoreKitNativeTransactionListenerAttemptVersion && timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
      });

    appleStoreKitNativeTransactionListenerInFlight = Promise.race([
      nativeListenerPromise.then(() => undefined, () => undefined),
      timeoutPromise
    ]).finally(() => {
      if (attemptVersion === appleStoreKitNativeTransactionListenerAttemptVersion) {
        appleStoreKitNativeTransactionListenerInFlight = null;
      }
    });
  } catch {
    appleStoreKitNativeTransactionListenerAttemptVersion += 1;
    appleStoreKitNativeTransactionListenerInFlight = null;
  }
}

export async function addAppleStoreKitTransactionUpdatedListener(
  listener: (event: AppleStoreKitTransactionEvent) => void
): Promise<PluginListenerHandle> {
  appleStoreKitTransactionListeners.add(listener);
  ensureAppleStoreKitNativeTransactionListener();
  let removed = false;
  return {
    remove: async () => {
      if (removed) return;
      removed = true;
      appleStoreKitTransactionListeners.delete(listener);
      if (appleStoreKitTransactionListeners.size === 0) {
        const handle = appleStoreKitNativeTransactionListenerHandle;
        appleStoreKitNativeTransactionListenerHandle = null;
        appleStoreKitNativeTransactionListenerInFlight = null;
        appleStoreKitNativeTransactionListenerAttemptVersion += 1;
        await handle?.remove();
      }
    }
  };
}

export function resetAppleStoreKitPluginForTests() {
  appleStoreKitPluginInstance = null;
  appleStoreKitCatalogCache = null;
  appleStoreKitCatalogInFlight = null;
  appleStoreKitCatalogAttemptVersion = 0;
  appleStoreKitNativeTransactionListenerHandle = null;
  appleStoreKitNativeTransactionListenerInFlight = null;
  appleStoreKitNativeTransactionListenerAttemptVersion = 0;
  appleStoreKitTransactionListeners = new Set();
}
