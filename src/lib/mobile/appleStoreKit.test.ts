import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  APPLE_STOREKIT_ANNUAL_PRODUCT_ID,
  APPLE_STOREKIT_MONTHLY_PRODUCT_ID,
  addAppleStoreKitTransactionUpdatedListener,
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

let nativeTransactionListener: ((event: { status: string; productId?: string }) => void) | null = null;
let nativeTransactionListenerRemove: ReturnType<typeof vi.fn>;

describe("Apple StoreKit bridge adapter", () => {
  beforeEach(() => {
    nativeTransactionListener = null;
    nativeTransactionListenerRemove = vi.fn();
    capacitorMock.native = false;
    capacitorMock.platform = "web";
    capacitorMock.registeredPlugin = null;
    capacitorMock.plugin.loadProducts.mockReset();
    capacitorMock.plugin.isAvailable.mockReset();
    capacitorMock.plugin.isAvailable.mockResolvedValue({ available: true, platform: "ios" });
    capacitorMock.plugin.loadProducts.mockResolvedValue({
      status: "loaded",
      missingProductIds: [],
      requestedProductCount: 2,
      returnedProductCount: 2,
      storefrontCountryCode: "USA",
      products: [
        { productId: APPLE_STOREKIT_MONTHLY_PRODUCT_ID, interval: "monthly", displayPrice: "$3.99" },
        { productId: APPLE_STOREKIT_ANNUAL_PRODUCT_ID, interval: "yearly", displayPrice: "$29.99" },
        { productId: "com.example.other", interval: "monthly", displayPrice: "$99.99" }
      ]
    });
    capacitorMock.plugin.addListener.mockReset();
    capacitorMock.plugin.addListener.mockImplementation(async (_eventName, listener) => {
      nativeTransactionListener = listener;
      return { remove: nativeTransactionListenerRemove };
    });
    resetAppleStoreKitPluginForTests();
  });

  afterEach(() => {
    vi.useRealTimers();
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
      storefrontCountryCode: "USA"
    });
    expect(catalog.products).toEqual([
      { productId: APPLE_STOREKIT_MONTHLY_PRODUCT_ID, interval: "monthly", displayPrice: "$3.99" },
      { productId: APPLE_STOREKIT_ANNUAL_PRODUCT_ID, interval: "yearly", displayPrice: "$29.99" }
    ]);
    expect(JSON.stringify(catalog)).not.toMatch(/signedTransaction|jws|transactionId|originalTransactionId|appAccountToken|accessToken/i);
  });

  it("acquires the Capacitor StoreKit proxy synchronously without thenable assimilation", async () => {
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

    const catalog = await queryAppleStoreKitCatalog({ forceRefresh: true });

    expect(catalog.status).toBe("loaded");
    expect(thenAccessCount).toBe(0);
    expect(capacitorMock.plugin.isAvailable).toHaveBeenCalledTimes(1);
    expect(capacitorMock.plugin.loadProducts).toHaveBeenCalledTimes(1);
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
    await expect(queryAppleStoreKitCatalog({ forceRefresh: true })).resolves.toMatchObject({
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
    await expect(queryAppleStoreKitCatalog({ forceRefresh: true })).resolves.toMatchObject({
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
    const storefrontCatalog = await queryAppleStoreKitCatalog({ forceRefresh: true });
    expect(storefrontCatalog).toMatchObject({
      status: "storefront_unavailable",
      missingProductIds: [APPLE_STOREKIT_MONTHLY_PRODUCT_ID, APPLE_STOREKIT_ANNUAL_PRODUCT_ID],
      storefrontCountryCode: "USA"
    });

    capacitorMock.plugin.loadProducts.mockRejectedValueOnce(new Error("raw StoreKit failure"));
    const failedCatalog = await queryAppleStoreKitCatalog({ forceRefresh: true });
    expect(failedCatalog.status).toBe("unknown_error");
    expect(JSON.stringify(failedCatalog)).not.toMatch(/NSError|private|raw StoreKit|jws|transactionId|appAccountToken|accessToken/i);
  });

  it("rejects legacy two-letter storefront diagnostics while accepting Apple three-letter country codes", async () => {
    capacitorMock.plugin.loadProducts.mockResolvedValueOnce({
      status: "loaded",
      missingProductIds: [],
      requestedProductCount: 2,
      returnedProductCount: 2,
      storefrontCountryCode: "US",
      products: [
        { productId: APPLE_STOREKIT_MONTHLY_PRODUCT_ID, interval: "monthly", displayPrice: "$3.99" },
        { productId: APPLE_STOREKIT_ANNUAL_PRODUCT_ID, interval: "yearly", displayPrice: "$29.99" }
      ]
    });

    const catalog = await queryAppleStoreKitCatalog({ forceRefresh: true });
    expect(catalog.status).toBe("loaded");
    expect(catalog.storefrontCountryCode).toBeUndefined();
  });

  it("times out native plugin availability without starting product discovery", async () => {
    vi.useFakeTimers();
    capacitorMock.plugin.isAvailable.mockReturnValueOnce(new Promise(() => undefined));

    const catalogPromise = queryAppleStoreKitCatalog({ forceRefresh: true });
    expect(capacitorMock.plugin.isAvailable).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(4_999);
    expect(capacitorMock.plugin.loadProducts).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);

    await expect(catalogPromise).resolves.toEqual({
      status: "timeout",
      timeoutPhase: "plugin_availability",
      requestedProductCount: 2,
      returnedProductCount: 0,
      missingProductIds: [APPLE_STOREKIT_MONTHLY_PRODUCT_ID, APPLE_STOREKIT_ANNUAL_PRODUCT_ID],
      products: []
    });
    expect(capacitorMock.plugin.loadProducts).not.toHaveBeenCalled();
  });

  it("times out native product discovery without caching a permanently pending request", async () => {
    vi.useFakeTimers();
    capacitorMock.plugin.loadProducts.mockReturnValueOnce(new Promise(() => undefined));

    const catalogPromise = queryAppleStoreKitCatalog({ forceRefresh: true });
    await vi.advanceTimersByTimeAsync(10_000);

    await expect(catalogPromise).resolves.toEqual({
      status: "timeout",
      timeoutPhase: "product_request",
      requestedProductCount: 2,
      returnedProductCount: 0,
      missingProductIds: [APPLE_STOREKIT_MONTHLY_PRODUCT_ID, APPLE_STOREKIT_ANNUAL_PRODUCT_ID],
      products: []
    });
    expect(capacitorMock.plugin.loadProducts).toHaveBeenCalledTimes(1);

    capacitorMock.plugin.loadProducts.mockResolvedValueOnce({
      status: "loaded",
      missingProductIds: [],
      requestedProductCount: 2,
      returnedProductCount: 2,
      products: [
        { productId: APPLE_STOREKIT_MONTHLY_PRODUCT_ID, interval: "monthly", displayPrice: "$3.99" },
        { productId: APPLE_STOREKIT_ANNUAL_PRODUCT_ID, interval: "yearly", displayPrice: "$29.99" }
      ]
    });
    await expect(queryAppleStoreKitCatalog({ forceRefresh: true })).resolves.toMatchObject({
      status: "loaded",
      returnedProductCount: 2
    });
    expect(capacitorMock.plugin.loadProducts).toHaveBeenCalledTimes(2);
  });

  it("deduplicates simultaneous catalog callers and force-refreshes exactly one new request", async () => {
    const firstCatalog = await Promise.all([queryAppleStoreKitCatalog(), queryAppleStoreKitCatalog(), queryAppleStoreKitProducts()]);

    expect(capacitorMock.plugin.isAvailable).toHaveBeenCalledTimes(1);
    expect(capacitorMock.plugin.loadProducts).toHaveBeenCalledTimes(1);
    expect(firstCatalog[0].status).toBe("loaded");
    expect(firstCatalog[1]).toEqual(firstCatalog[0]);
    expect(firstCatalog[2]).toHaveLength(2);

    await queryAppleStoreKitCatalog({ forceRefresh: true });
    expect(capacitorMock.plugin.isAvailable).toHaveBeenCalledTimes(2);
    expect(capacitorMock.plugin.loadProducts).toHaveBeenCalledTimes(2);
    expect(capacitorMock.plugin.purchase).not.toHaveBeenCalled();
    expect(capacitorMock.plugin.restorePurchases).not.toHaveBeenCalled();
    expect(capacitorMock.plugin.finishVerifiedTransactions).not.toHaveBeenCalled();
  });

  it("shares one native StoreKit transaction listener across multiple JavaScript listeners", async () => {
    const firstListener = vi.fn();
    const secondListener = vi.fn();

    const [firstHandle, secondHandle] = await Promise.all([
      addAppleStoreKitTransactionUpdatedListener(firstListener),
      addAppleStoreKitTransactionUpdatedListener(secondListener)
    ]);

    expect(capacitorMock.plugin.addListener).toHaveBeenCalledTimes(1);
    expect(nativeTransactionListener).toBeTypeOf("function");
    nativeTransactionListener?.({ status: "pendingVerification", productId: APPLE_STOREKIT_MONTHLY_PRODUCT_ID });
    expect(firstListener).toHaveBeenCalledTimes(1);
    expect(secondListener).toHaveBeenCalledTimes(1);

    await firstHandle.remove();
    expect(nativeTransactionListenerRemove).not.toHaveBeenCalled();
    nativeTransactionListener?.({ status: "pendingVerification", productId: APPLE_STOREKIT_ANNUAL_PRODUCT_ID });
    expect(firstListener).toHaveBeenCalledTimes(1);
    expect(secondListener).toHaveBeenCalledTimes(2);

    await secondHandle.remove();
    expect(nativeTransactionListenerRemove).toHaveBeenCalledTimes(1);
  });

  it("returns JavaScript listener handles when native listener registration never resolves", async () => {
    vi.useFakeTimers();
    const firstListener = vi.fn();
    const secondListener = vi.fn();
    capacitorMock.plugin.addListener.mockReturnValue(new Promise(() => undefined));

    const [firstHandle, secondHandle] = await Promise.all([
      addAppleStoreKitTransactionUpdatedListener(firstListener),
      addAppleStoreKitTransactionUpdatedListener(secondListener)
    ]);

    expect(capacitorMock.plugin.addListener).toHaveBeenCalledTimes(1);
    expect(capacitorMock.plugin.purchase).not.toHaveBeenCalled();
    expect(capacitorMock.plugin.restorePurchases).not.toHaveBeenCalled();
    expect(capacitorMock.plugin.finishVerifiedTransactions).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(5_000);
    const thirdHandle = await addAppleStoreKitTransactionUpdatedListener(vi.fn());
    expect(capacitorMock.plugin.addListener).toHaveBeenCalledTimes(2);

    await firstHandle.remove();
    await secondHandle.remove();
    await thirdHandle.remove();
    expect(nativeTransactionListenerRemove).not.toHaveBeenCalled();
  });
});
