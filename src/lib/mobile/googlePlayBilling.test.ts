import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  GOOGLE_PLAY_ANNUAL_BASE_PLAN_ID,
  GOOGLE_PLAY_MONTHLY_BASE_PLAN_ID,
  GOOGLE_PLAY_PRODUCT_ID,
  filterSupportedPurchases,
  isAndroidGooglePlayBillingRuntime,
  isGooglePlayBasePlanId,
  queryGooglePlayPlans,
  resetGooglePlayBillingPluginForTests,
  restoreGooglePlayPurchases,
  validPurchaseTokenShape
} from "@/lib/mobile/googlePlayBilling";

const capacitorMock = vi.hoisted(() => ({
  native: false,
  platform: "web",
  plugin: {
    queryProducts: vi.fn(),
    restorePurchases: vi.fn(),
    launchPurchase: vi.fn(),
    isAvailable: vi.fn(),
    addListener: vi.fn()
  },
  registeredPlugin: null as Record<string, unknown> | null
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: () => capacitorMock.native,
    getPlatform: () => capacitorMock.platform
  },
  registerPlugin: vi.fn(() => capacitorMock.registeredPlugin ?? capacitorMock.plugin)
}));

describe("Google Play Billing bridge adapter", () => {
  beforeEach(() => {
    capacitorMock.native = false;
    capacitorMock.platform = "web";
    capacitorMock.registeredPlugin = null;
    resetGooglePlayBillingPluginForTests();
    capacitorMock.plugin.queryProducts.mockReset();
    capacitorMock.plugin.queryProducts.mockResolvedValue({
      productId: GOOGLE_PLAY_PRODUCT_ID,
      plans: [
        { productId: GOOGLE_PLAY_PRODUCT_ID, basePlanId: GOOGLE_PLAY_MONTHLY_BASE_PLAN_ID, localizedPrice: "$3.99" },
        { productId: GOOGLE_PLAY_PRODUCT_ID, basePlanId: GOOGLE_PLAY_ANNUAL_BASE_PLAN_ID, localizedPrice: "$29.99" },
        { productId: GOOGLE_PLAY_PRODUCT_ID, basePlanId: "weekly", localizedPrice: "$0.99" },
        { productId: "other_product", basePlanId: GOOGLE_PLAY_MONTHLY_BASE_PLAN_ID, localizedPrice: "$99.99" }
      ]
    });
    capacitorMock.plugin.restorePurchases.mockReset();
    capacitorMock.plugin.restorePurchases.mockResolvedValue({
      purchases: [
        { productId: GOOGLE_PLAY_PRODUCT_ID, purchaseToken: "valid-token-1", purchaseState: 1 },
        { productId: "other_product", purchaseToken: "valid-token-2", purchaseState: 1 },
        { productId: GOOGLE_PLAY_PRODUCT_ID, purchaseToken: "bad token", purchaseState: 1 }
      ]
    });
  });

  afterEach(() => {
    resetGooglePlayBillingPluginForTests();
  });

  it("detects Google Play Billing only in a native Android runtime", () => {
    capacitorMock.native = true;
    capacitorMock.platform = "android";
    expect(isAndroidGooglePlayBillingRuntime()).toBe(true);

    capacitorMock.platform = "ios";
    expect(isAndroidGooglePlayBillingRuntime()).toBe(false);

    capacitorMock.native = false;
    capacitorMock.platform = "android";
    expect(isAndroidGooglePlayBillingRuntime()).toBe(false);
  });

  it("accepts only the approved Can You Geo subscription base plans", async () => {
    expect(isGooglePlayBasePlanId("monthly")).toBe(true);
    expect(isGooglePlayBasePlanId("annual")).toBe(true);
    expect(isGooglePlayBasePlanId("yearly")).toBe(false);

    const plans = await queryGooglePlayPlans();

    expect(capacitorMock.plugin.queryProducts).toHaveBeenCalledWith({ productId: GOOGLE_PLAY_PRODUCT_ID });
    expect(plans).toEqual([
      { productId: GOOGLE_PLAY_PRODUCT_ID, basePlanId: GOOGLE_PLAY_MONTHLY_BASE_PLAN_ID, localizedPrice: "$3.99" },
      { productId: GOOGLE_PLAY_PRODUCT_ID, basePlanId: GOOGLE_PLAY_ANNUAL_BASE_PLAN_ID, localizedPrice: "$29.99" }
    ]);
    expect(JSON.stringify(plans)).not.toMatch(/purchaseToken|obfuscatedAccountId|acknowledged/i);
  });

  it("acquires the Capacitor Google Play proxy synchronously without thenable assimilation", async () => {
    let thenAccessCount = 0;
    capacitorMock.registeredPlugin = new Proxy(capacitorMock.plugin, {
      get(target, property, receiver) {
        if (property === "then") {
          thenAccessCount += 1;
          throw new Error("Capacitor proxy then trap was accessed");
        }
        return Reflect.get(target, property, receiver);
      }
    });

    const plans = await queryGooglePlayPlans();

    expect(plans).toHaveLength(2);
    expect(thenAccessCount).toBe(0);
    expect(capacitorMock.plugin.queryProducts).toHaveBeenCalledWith({ productId: GOOGLE_PLAY_PRODUCT_ID });
    expect(capacitorMock.plugin.launchPurchase).not.toHaveBeenCalled();
  });

  it("restores only supported purchases with valid token shape without logging or acknowledging", async () => {
    expect(validPurchaseTokenShape("valid-token-1")).toBe(true);
    expect(validPurchaseTokenShape("bad token")).toBe(false);

    const restored = await restoreGooglePlayPurchases();

    expect(restored).toEqual([{ productId: GOOGLE_PLAY_PRODUCT_ID, purchaseToken: "valid-token-1", purchaseState: 1 }]);
    expect(filterSupportedPurchases([{ productId: GOOGLE_PLAY_PRODUCT_ID, purchaseToken: "short", purchaseState: 1 }])).toEqual([]);
    expect(capacitorMock.plugin.launchPurchase).not.toHaveBeenCalled();
  });
});
