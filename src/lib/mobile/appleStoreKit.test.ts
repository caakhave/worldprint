import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  APPLE_STOREKIT_ANNUAL_PRODUCT_ID,
  APPLE_STOREKIT_MONTHLY_PRODUCT_ID,
  appleStoreKitIntervalForProductId,
  appleStoreKitProductIdForInterval,
  isAppleStoreKitProductId,
  isIOSAppleStoreKitRuntime,
  queryAppleStoreKitCatalog,
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
    capacitorMock.plugin.isAvailable.mockReset();
    capacitorMock.plugin.isAvailable.mockResolvedValue({ available: true, platform: "ios" });
    capacitorMock.plugin.loadProducts.mockResolvedValue({
      status: "loaded",
      missingProductIds: [],
      requestedProductCount: 2,
      returnedProductCount: 2,
      storefrontCountryCode: "US",
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

  it("loads and returns a sanitized ready catalog with only approved product display metadata", async () => {
    const catalog = await queryAppleStoreKitCatalog();

    expect(capacitorMock.plugin.isAvailable).toHaveBeenCalledTimes(1);
    expect(capacitorMock.plugin.loadProducts).toHaveBeenCalledWith({
      productIds: [APPLE_STOREKIT_MONTHLY_PRODUCT_ID, APPLE_STOREKIT_ANNUAL_PRODUCT_ID]
    });
    expect(catalog).toMatchObject({
      status: "loaded",
      requestedProductCount: 2,
      returnedProductCount: 2,
      missingProductIds: [],
      storefrontCountryCode: "US"
    });
    expect(catalog.products).toEqual([
      { productId: APPLE_STOREKIT_MONTHLY_PRODUCT_ID, interval: "monthly", displayPrice: "$3.99" },
      { productId: APPLE_STOREKIT_ANNUAL_PRODUCT_ID, interval: "yearly", displayPrice: "$29.99" }
    ]);
    expect(JSON.stringify(catalog)).not.toMatch(/signedTransaction|jws|transactionId|originalTransactionId|appAccountToken|accessToken/i);
  });

  it("keeps the legacy product helper as sanitized products only", async () => {
    await expect(queryAppleStoreKitProducts()).resolves.toEqual([
      { productId: APPLE_STOREKIT_MONTHLY_PRODUCT_ID, interval: "monthly", displayPrice: "$3.99" },
      { productId: APPLE_STOREKIT_ANNUAL_PRODUCT_ID, interval: "yearly", displayPrice: "$29.99" }
    ]);
  });

  it("preserves a plugin-unavailable state when the native bridge cannot answer availability", async () => {
    capacitorMock.plugin.isAvailable.mockRejectedValueOnce(new Error("not implemented"));

    await expect(queryAppleStoreKitCatalog()).resolves.toEqual({
      status: "plugin_unavailable",
      requestedProductCount: 2,
      returnedProductCount: 0,
      missingProductIds: [APPLE_STOREKIT_MONTHLY_PRODUCT_ID, APPLE_STOREKIT_ANNUAL_PRODUCT_ID],
      products: []
    });
    expect(capacitorMock.plugin.loadProducts).not.toHaveBeenCalled();
  });

  it("preserves zero-products, partial, and storefront/network statuses without raw errors", async () => {
    capacitorMock.plugin.loadProducts.mockResolvedValueOnce({
      status: "zero_products",
      missingProductIds: [APPLE_STOREKIT_MONTHLY_PRODUCT_ID, APPLE_STOREKIT_ANNUAL_PRODUCT_ID],
      requestedProductCount: 2,
      returnedProductCount: 0,
      products: [],
      debug: "NSError Domain=StoreKit path=/private/tmp"
    });
    await expect(queryAppleStoreKitCatalog()).resolves.toMatchObject({
      status: "zero_products",
      returnedProductCount: 0,
      products: []
    });

    capacitorMock.plugin.loadProducts.mockResolvedValueOnce({
      status: "partial",
      missingProductIds: [APPLE_STOREKIT_MONTHLY_PRODUCT_ID, "com.example.other"],
      requestedProductCount: 2,
      returnedProductCount: 1,
      products: [{ productId: APPLE_STOREKIT_ANNUAL_PRODUCT_ID, interval: "yearly", displayPrice: "$29.99", signedTransactionInfo: "jws" }]
    });
    await expect(queryAppleStoreKitCatalog()).resolves.toMatchObject({
      status: "partial",
      missingProductIds: [APPLE_STOREKIT_MONTHLY_PRODUCT_ID],
      products: [{ productId: APPLE_STOREKIT_ANNUAL_PRODUCT_ID, interval: "yearly", displayPrice: "$29.99" }]
    });

    capacitorMock.plugin.loadProducts.mockResolvedValueOnce({
      status: "storefront_unavailable",
      missingProductIds: [APPLE_STOREKIT_MONTHLY_PRODUCT_ID, APPLE_STOREKIT_ANNUAL_PRODUCT_ID],
      requestedProductCount: 2,
      returnedProductCount: 0,
      storefrontCountryCode: "USA",
      products: []
    });
    const storefrontCatalog = await queryAppleStoreKitCatalog();
    expect(storefrontCatalog).toMatchObject({
      status: "storefront_unavailable",
      missingProductIds: [APPLE_STOREKIT_MONTHLY_PRODUCT_ID, APPLE_STOREKIT_ANNUAL_PRODUCT_ID]
    });
    expect(storefrontCatalog.storefrontCountryCode).toBeUndefined();

    capacitorMock.plugin.loadProducts.mockRejectedValueOnce(new Error("raw StoreKit failure"));
    const failedCatalog = await queryAppleStoreKitCatalog();
    expect(failedCatalog.status).toBe("unknown_error");
    expect(JSON.stringify(failedCatalog)).not.toMatch(/NSError|private|raw StoreKit|jws|transactionId|appAccountToken|accessToken/i);
  });
});
