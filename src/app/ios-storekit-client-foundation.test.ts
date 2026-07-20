import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const swiftPlugin = readFileSync(join(root, "ios/App/App/AppleStoreKitPlugin.swift"), "utf8");
const viewController = readFileSync(join(root, "ios/App/App/ViewController.swift"), "utf8");
const storyboard = readFileSync(join(root, "ios/App/App/Base.lproj/Main.storyboard"), "utf8");
const xcodeProject = readFileSync(join(root, "ios/App/App.xcodeproj/project.pbxproj"), "utf8");
const storeKitConfig = JSON.parse(readFileSync(join(root, "ios/App/App/CanYouGeo.storekit"), "utf8")) as {
  subscriptionGroups: Array<{
    referenceName: string;
    subscriptions: Array<{
      id: string;
      duration: string;
      price: string;
      familyShareable: boolean;
      introductoryOffers: unknown[];
      promotionalOffers: unknown[];
    }>;
  }>;
};
const appleAdapter = readFileSync(join(root, "src/lib/mobile/appleStoreKit.ts"), "utf8");
const appleActions = readFileSync(join(root, "src/features/account/appleStoreKitActions.ts"), "utf8");

describe("iOS StoreKit client foundation", () => {
  it("registers a first-party Capacitor StoreKit plugin in the app bridge", () => {
    expect(viewController).toContain("class ViewController: CAPBridgeViewController");
    expect(viewController).toContain("registerPluginInstance(AppleStoreKitPlugin())");
    expect(storyboard).toContain('customClass="ViewController"');
    expect(xcodeProject).toContain("AppleStoreKitPlugin.swift in Sources");
    expect(xcodeProject).toContain("ViewController.swift in Sources");
    expect(swiftPlugin).toContain('public let jsName = "AppleStoreKit"');
    expect(swiftPlugin).toContain('CAPPluginMethod(name: "isAvailable"');
    expect(swiftPlugin).toContain('CAPPluginMethod(name: "purchase"');
    expect(swiftPlugin).toContain('CAPPluginMethod(name: "restorePurchases"');
    expect(swiftPlugin).toContain('CAPPluginMethod(name: "syncUnfinished"');
    expect(swiftPlugin).toContain('CAPPluginMethod(name: "finishVerifiedTransactions"');
    expect(swiftPlugin).toContain('CAPPluginMethod(name: "manageSubscription"');
  });

  it("uses StoreKit 2 and the staging Apple endpoints without exposing raw transaction material to JavaScript", () => {
    expect(swiftPlugin).toContain("Product.products(for:");
    expect(swiftPlugin).not.toContain("Storefront.current");
    expect(swiftPlugin).toContain("baseAppleProductCatalogDictionary(products: normalized");
    expect(swiftPlugin).toContain("baseAppleProductCatalogDictionary(products: []");
    expect(swiftPlugin).toContain("product.purchase(options: [.appAccountToken(appAccountToken)])");
    expect(swiftPlugin).toContain("Transaction.updates");
    expect(swiftPlugin).toContain("Transaction.unfinished");
    expect(swiftPlugin).toContain("Transaction.currentEntitlements");
    expect(swiftPlugin).toContain("verificationResult.jwsRepresentation");
    expect(swiftPlugin).toContain('"apple-purchase-context"');
    expect(swiftPlugin).toContain('"apple-purchase-verify"');
    expect(swiftPlugin).toContain("finishAll()");
    expect(swiftPlugin).toContain("AppStore.showManageSubscriptions");
    expect(appleAdapter).not.toMatch(/signedTransaction|signedRenewal|jwsRepresentation|transactionId|originalTransactionId|appAccountToken/u);
    expect(appleActions).not.toMatch(/signedTransaction|signedRenewal|jwsRepresentation|transactionId|originalTransactionId|appAccountToken/u);
  });

  it("preserves sanitized StoreKit discovery diagnostics without exposing raw errors", () => {
    for (const status of [
      "loaded",
      "zero_products",
      "partial",
      "plugin_unavailable",
      "timeout",
      "network_error",
      "storefront_unavailable",
      "not_entitled",
      "unsupported",
      "system_error",
      "unknown_error"
    ]) {
      expect(`${swiftPlugin}\n${appleAdapter}`).toContain(status);
    }
    expect(swiftPlugin).toContain("requestedProductCount");
    expect(swiftPlugin).toContain("returnedProductCount");
    expect(swiftPlugin).toContain("missingProductIds");
    expect(swiftPlugin).toContain("case .networkError");
    expect(swiftPlugin).toContain("case .notAvailableInStorefront");
    expect(swiftPlugin).toContain("case .notEntitled");
    expect(swiftPlugin).toContain("case .unsupported");
    expect(swiftPlugin).toContain("case .systemError");
    expect(appleAdapter).toContain("queryAppleStoreKitCatalog");
    expect(appleAdapter).toContain("plugin.isAvailable()");
    expect(appleAdapter).toContain("APPLE_STOREKIT_AVAILABILITY_TIMEOUT_MS = 5_000");
    expect(appleAdapter).toContain("APPLE_STOREKIT_PRODUCT_REQUEST_TIMEOUT_MS = 10_000");
    expect(appleAdapter).toContain("plugin_availability");
    expect(appleAdapter).toContain("product_request");
    expect(appleAdapter).toContain("appleStoreKitCatalogInFlight");
    expect(appleAdapter).toContain("APPLE_STOREKIT_TRANSACTION_LISTENER_TIMEOUT_MS = 5_000");
    expect(appleAdapter).toContain("appleStoreKitNativeTransactionListenerInFlight");
    expect(appleAdapter).not.toMatch(/NSError|localizedDescription|debugDescription|underlyingError|file:\/\/|\/private\/tmp/u);
  });

  it("keeps the iOS identity fixed while bumping only the build number to 7", () => {
    expect(xcodeProject).toContain("PRODUCT_BUNDLE_IDENTIFIER = com.canyougeo.app;");
    expect(xcodeProject).toContain("DEVELOPMENT_TEAM = G5N5U6QFS8;");
    expect(xcodeProject).toContain("MARKETING_VERSION = 1.0.0;");
    expect(xcodeProject).toContain("CURRENT_PROJECT_VERSION = 7;");
    expect(xcodeProject).not.toContain("CURRENT_PROJECT_VERSION = 8;");
  });

  it("defines only the approved local StoreKit subscription products", () => {
    expect(storeKitConfig.subscriptionGroups).toHaveLength(1);
    expect(storeKitConfig.subscriptionGroups[0].referenceName).toBe("Can You Geo Pro");
    expect(storeKitConfig.subscriptionGroups[0].subscriptions).toEqual([
      expect.objectContaining({
        id: "com.canyougeo.pro.monthly",
        duration: "P1M",
        price: "3.99",
        familyShareable: false,
        introductoryOffers: [],
        promotionalOffers: []
      }),
      expect.objectContaining({
        id: "com.canyougeo.pro.annual",
        duration: "P1Y",
        price: "29.99",
        familyShareable: false,
        introductoryOffers: [],
        promotionalOffers: []
      })
    ]);
    expect(JSON.stringify(storeKitConfig)).not.toMatch(/trial|offerCode|familySharingEnabled|canyougeo_pro/u);
  });
});
