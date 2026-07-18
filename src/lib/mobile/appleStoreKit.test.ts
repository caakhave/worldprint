import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  APPLE_STOREKIT_ANNUAL_PRODUCT_ID,
  APPLE_STOREKIT_MONTHLY_PRODUCT_ID,
  appleStoreKitIntervalForProductId,
  appleStoreKitProductIdForInterval,
  isAppleStoreKitProductId,
  isIOSAppleStoreKitRuntime,
  queryAppleStoreKitProducts,
  resetAppleStoreKitPluginForTests
} from "@/lib/mobile/appleStoreKit";

const capacitorMock = vi.hoisted(() => ({
  native: false,
  platform: "web",
  plugin: {
    loadProducts: vi.fn(),
    isAvailable: vi.fn(),
    purchase: vi.fn(),
    restorePurchases: vi.fn(),
    syncUnfinished: vi.fn(),
    finishVerifiedTransactions: vi.fn(),
    manageSubscription: vi.fn(),
    addListener: vi.fn()
  }
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: () => capacitorMock.native,
    getPlatform: () => capacitorMock.platform
  },
  registerPlugin: vi.fn(() => capacitorMock.plugin)
}));

describe("Apple StoreKit bridge adapter", () => {
  beforeEach(() => {
    capacitorMock.native = false;
    capacitorMock.platform = "web";
    capacitorMock.plugin.loadProducts.mockReset();
    capacitorMock.plugin.loadProducts.mockResolvedValue({
      status: "loaded",
      missingProductIds: [],
      products: [
        { productId: APPLE_STOREKIT_MONTHLY_PRODUCT_ID, interval: "monthly", displayPrice: "$3.99" },
        { productId: APPLE_STOREKIT_ANNUAL_PRODUCT_ID, interval: "yearly", displayPrice: "$29.99" },
        { productId: "com.example.other", interval: "monthly", displayPrice: "$99.99" }
      ]
    });
    resetAppleStoreKitPluginForTests();
  });

  afterEach(() => {
    resetAppleStoreKitPluginForTests();
  });

  it("uses only the approved Can You Geo StoreKit subscription product identifiers", () => {
    expect(appleStoreKitProductIdForInterval("monthly")).toBe("com.canyougeo.pro.monthly");
    expect(appleStoreKitProductIdForInterval("yearly")).toBe("com.canyougeo.pro.annual");
    expect(appleStoreKitIntervalForProductId(APPLE_STOREKIT_MONTHLY_PRODUCT_ID)).toBe("monthly");
    expect(appleStoreKitIntervalForProductId(APPLE_STOREKIT_ANNUAL_PRODUCT_ID)).toBe("yearly");
    expect(isAppleStoreKitProductId("com.canyougeo.pro.monthly")).toBe(true);
    expect(isAppleStoreKitProductId("com.canyougeo.pro.annual")).toBe(true);
    expect(isAppleStoreKitProductId("canyougeo_pro")).toBe(false);
  });

  it("detects StoreKit only in a native iOS runtime", () => {
    capacitorMock.native = true;
    capacitorMock.platform = "ios";
    expect(isIOSAppleStoreKitRuntime()).toBe(true);

    capacitorMock.platform = "android";
    expect(isIOSAppleStoreKitRuntime()).toBe(false);

    capacitorMock.native = false;
    capacitorMock.platform = "ios";
    expect(isIOSAppleStoreKitRuntime()).toBe(false);
  });

  it("loads and returns only approved product display metadata", async () => {
    const products = await queryAppleStoreKitProducts();

    expect(capacitorMock.plugin.loadProducts).toHaveBeenCalledWith({
      productIds: [APPLE_STOREKIT_MONTHLY_PRODUCT_ID, APPLE_STOREKIT_ANNUAL_PRODUCT_ID]
    });
    expect(products).toEqual([
      { productId: APPLE_STOREKIT_MONTHLY_PRODUCT_ID, interval: "monthly", displayPrice: "$3.99" },
      { productId: APPLE_STOREKIT_ANNUAL_PRODUCT_ID, interval: "yearly", displayPrice: "$29.99" }
    ]);
    expect(JSON.stringify(products)).not.toMatch(/signedTransaction|jws|transactionId|originalTransactionId|appAccountToken|accessToken/i);
  });
});
