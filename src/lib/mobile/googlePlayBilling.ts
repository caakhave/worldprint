"use client";

import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";

export const GOOGLE_PLAY_PRODUCT_ID = "canyougeo_pro";
export const GOOGLE_PLAY_MONTHLY_BASE_PLAN_ID = "monthly";
export const GOOGLE_PLAY_ANNUAL_BASE_PLAN_ID = "annual";

export type GooglePlayBasePlanId = typeof GOOGLE_PLAY_MONTHLY_BASE_PLAN_ID | typeof GOOGLE_PLAY_ANNUAL_BASE_PLAN_ID;

export type GooglePlayPlanDetails = {
  productId: string;
  basePlanId: GooglePlayBasePlanId;
  title?: string;
  localizedPrice?: string;
  currencyCode?: string;
  priceAmountMicros?: number;
  billingPeriod?: string;
};

export type GooglePlayPurchase = {
  productId: string;
  purchaseToken: string;
  purchaseState: number;
  acknowledged?: boolean;
  obfuscatedAccountId?: string;
};

type GooglePlayBillingPlugin = {
  isAvailable: () => Promise<{ available: boolean; responseCode: number }>;
  queryProducts: (input: { productId: string }) => Promise<{ productId: string; plans: GooglePlayPlanDetails[] }>;
  launchPurchase: (input: { productId: string; basePlanId: GooglePlayBasePlanId; obfuscatedAccountId: string }) => Promise<{ status: string }>;
  restorePurchases: () => Promise<{ purchases: GooglePlayPurchase[] }>;
  addListener: (eventName: "purchaseUpdated", listenerFunc: (event: { responseCode: number; purchases: GooglePlayPurchase[] }) => void) => Promise<PluginListenerHandle>;
};

let googlePlayBillingPluginInstance: GooglePlayBillingPlugin | null = null;

function fallbackGooglePlayBillingPlugin(): GooglePlayBillingPlugin {
  return {
    isAvailable: async () => ({ available: false, responseCode: -1 }),
    queryProducts: async () => ({ productId: GOOGLE_PLAY_PRODUCT_ID, plans: [] }),
    launchPurchase: async () => {
      throw new Error("Google Play Billing is unavailable.");
    },
    restorePurchases: async () => ({ purchases: [] }),
    addListener: async () => ({ remove: async () => undefined })
  };
}

function googlePlayBillingPlugin(): GooglePlayBillingPlugin {
  if (!googlePlayBillingPluginInstance) {
    try {
      googlePlayBillingPluginInstance =
        typeof registerPlugin === "function"
          ? registerPlugin<GooglePlayBillingPlugin>("GooglePlayBilling")
          : fallbackGooglePlayBillingPlugin();
    } catch {
      googlePlayBillingPluginInstance = fallbackGooglePlayBillingPlugin();
    }
  }
  return googlePlayBillingPluginInstance;
}

export function isAndroidGooglePlayBillingRuntime(): boolean {
  try {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
  } catch {
    return false;
  }
}

export function isGooglePlayBasePlanId(value: unknown): value is GooglePlayBasePlanId {
  return value === GOOGLE_PLAY_MONTHLY_BASE_PLAN_ID || value === GOOGLE_PLAY_ANNUAL_BASE_PLAN_ID;
}

export async function queryGooglePlayPlans(): Promise<GooglePlayPlanDetails[]> {
  const plugin = googlePlayBillingPlugin();
  const result = await plugin.queryProducts({ productId: GOOGLE_PLAY_PRODUCT_ID });
  return result.plans.filter((plan) => plan.productId === GOOGLE_PLAY_PRODUCT_ID && isGooglePlayBasePlanId(plan.basePlanId));
}

export async function launchGooglePlayPurchase(input: {
  basePlanId: GooglePlayBasePlanId;
  obfuscatedAccountId: string;
}): Promise<void> {
  const plugin = googlePlayBillingPlugin();
  await plugin.launchPurchase({
    productId: GOOGLE_PLAY_PRODUCT_ID,
    basePlanId: input.basePlanId,
    obfuscatedAccountId: input.obfuscatedAccountId
  });
}

export async function restoreGooglePlayPurchases(): Promise<GooglePlayPurchase[]> {
  const plugin = googlePlayBillingPlugin();
  const result = await plugin.restorePurchases();
  return filterSupportedPurchases(result.purchases);
}

export async function addGooglePlayPurchaseUpdatedListener(listener: (purchases: GooglePlayPurchase[]) => void): Promise<PluginListenerHandle> {
  const plugin = googlePlayBillingPlugin();
  return plugin.addListener("purchaseUpdated", (event) => {
    listener(filterSupportedPurchases(event.purchases));
  });
}

export function filterSupportedPurchases(purchases: GooglePlayPurchase[]): GooglePlayPurchase[] {
  return purchases.filter((purchase) => purchase.productId === GOOGLE_PLAY_PRODUCT_ID && validPurchaseTokenShape(purchase.purchaseToken));
}

export function validPurchaseTokenShape(purchaseToken: string): boolean {
  return purchaseToken.length >= 10 && purchaseToken.length <= 4096 && !/\s/.test(purchaseToken);
}

export function resetGooglePlayBillingPluginForTests() {
  googlePlayBillingPluginInstance = null;
}
