import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const PACKAGE_NAME = "com.canyougeo.app";
const BILLING_PERMISSION = "com.android.vending.BILLING";
const EXPECTED_MERGED_RELEASE_PERMISSIONS = [
  "android.permission.ACCESS_NETWORK_STATE",
  "android.permission.INTERNET",
  BILLING_PERMISSION,
  `${PACKAGE_NAME}.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION`
];
const MERGED_RELEASE_MANIFEST =
  "android/app/build/intermediates/merged_manifests/release/processReleaseManifest/AndroidManifest.xml";

function read(path: string) {
  return readFileSync(path, "utf8");
}

function walkTextFiles(root: string): string[] {
  const ignored = new Set([".git", ".gradle", ".next", "build", "coverage", "node_modules", "out", "playwright-report", "test-results"]);
  const textExtensions = new Set([".gradle", ".java", ".json", ".kt", ".mjs", ".toml", ".ts", ".tsx", ".xml"]);
  const files: string[] = [];
  const stack = [root];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    const name = current.split("/").pop() ?? "";
    if (ignored.has(name)) continue;
    const stat = statSync(current);
    if (stat.isDirectory()) {
      for (const child of readdirSync(current)) {
        stack.push(join(current, child));
      }
      continue;
    }
    if (/\.(test|structure\.test)\.(ts|tsx|mjs)$/.test(current)) {
      continue;
    }
    if ([...textExtensions].some((extension) => current.endsWith(extension))) {
      files.push(current);
    }
  }

  return files;
}

function permissionsFromManifest(source: string) {
  return Array.from(source.matchAll(/<uses-permission\b[^>]*android:name="([^"]+)"/g), (match) => match[1]);
}

describe("Android Play Billing bootstrap", () => {
  it("uses the official Play Billing dependency without a third-party billing SDK", () => {
    const variables = read("android/variables.gradle");
    const appBuild = read("android/app/build.gradle");
    const packageManifest = read("package.json");
    const lockfile = read("pnpm-lock.yaml");

    expect(variables).toContain("playBillingVersion = '9.1.0'");
    expect(appBuild).toContain('implementation "com.android.billingclient:billing:$playBillingVersion"');
    expect(appBuild).not.toContain("billing-ktx");

    const dependencySurface = `${appBuild}\n${packageManifest}\n${lockfile}`.toLowerCase();
    expect(dependencySurface).not.toMatch(/revenuecat|purchases-android|react-native-iap|stripe-android|braintree|paypal/);
  });

  it("keeps the permanent app identity and version 3 metadata", () => {
    const appBuild = read("android/app/build.gradle");

    expect(appBuild).toContain(`namespace = "${PACKAGE_NAME}"`);
    expect(appBuild).toContain(`applicationId "${PACKAGE_NAME}"`);
    expect(appBuild).toContain("versionCode 3");
    expect(appBuild).toContain('versionName "1.0.2"');
  });

  it("adds a first-party BillingClient bridge without local entitlement authority", () => {
    const mainActivity = read("android/app/src/main/java/com/canyougeo/app/MainActivity.java");
    const plugin = read("android/app/src/main/java/com/canyougeo/app/GooglePlayBillingPlugin.java");

    expect(mainActivity).toContain("registerPlugin(GooglePlayBillingPlugin.class);");
    expect(plugin).toContain("BillingClient.newBuilder");
    expect(plugin).toContain("enableAutoServiceReconnection()");
    expect(plugin).toContain("queryProductDetailsAsync");
    expect(plugin).toContain("launchBillingFlow");
    expect(plugin).toContain("queryPurchasesAsync");
    expect(plugin).toContain("setObfuscatedAccountId(obfuscatedAccountId)");
    expect(plugin).toContain("notifyListeners(\"purchaseUpdated\"");
    expect(plugin).not.toMatch(/acknowledgePurchase|consumeAsync|grantPro|plan\s*=\s*"pro"|provider_subscriptions|entitlements/i);
  });

  it("keeps Stripe checkout disabled for native builds while using Google Play functions", () => {
    const actions = read("src/features/account/BillingActionsClient.tsx");
    const helper = read("src/features/account/billingActionHelpers.ts");
    const upgrade = read("src/features/account/UpgradeClient.tsx");
    const googlePlayActions = read("src/features/account/googlePlayPurchaseActions.ts");

    expect(actions).toContain("if (nativeBuild) {");
    expect(actions).toContain("launchGooglePlayPurchase");
    expect(actions).toContain("restoreGooglePlayPurchases");
    expect(actions).toContain("nativeStoreBillingBoundaryCopy(nativePlatform)");
    expect(helper).toContain("if (isNativeAppBuild()) {");
    expect(helper).toContain("nativeBillingUnavailableMessage(kind)");
    expect(googlePlayActions).toContain("google-play-purchase-context");
    expect(googlePlayActions).toContain("google-play-purchase-verify");
    expect(upgrade).toContain("nativeStoreBillingBoundaryCopy(nativePlatform)");
    expect(read("src/lib/mobile/nativeStoreBillingPlatform.ts")).toContain(
      "Google Play manages Android purchases. Stripe checkout is unavailable in this Android build."
    );
  });

  it("does not introduce client-side Pro grants, token persistence, token logging, or bundled credentials", () => {
    const clientSource = ["android/app/src/main", "src/features/account", "src/lib/billing"]
      .flatMap(walkTextFiles)
      .map((path) => read(path))
      .join("\n");
    const repositorySource = ["android/app/src/main", "src", "supabase/functions"]
      .flatMap(walkTextFiles)
      .map((path) => read(path))
      .join("\n");

    expect(clientSource).not.toMatch(/acknowledgePurchase|consumeAsync|provider_subscriptions|grantPro|localStorage\.(?:setItem|getItem)\([^)]*pro/i);
    expect(repositorySource).not.toMatch(/console\.(?:log|warn|error)\([^)]*purchaseToken|getPurchaseToken\(\)[\s\S]{0,120}console\./i);
    expect(repositorySource).not.toMatch(/localStorage\.(?:setItem|getItem)\([^)]*purchaseToken|sessionStorage\.(?:setItem|getItem)\([^)]*purchaseToken/i);
    expect(repositorySource).not.toMatch(/-----BEGIN PRIVATE KEY-----(?:\\n|\r\n|\n|\s)+[A-Za-z0-9+/=]{40,}/i);
  });

  it("keeps the source manifest narrow and verifies merged release permissions when available", () => {
    const sourceManifest = read("android/app/src/main/AndroidManifest.xml");
    expect(permissionsFromManifest(sourceManifest)).toEqual(["android.permission.INTERNET"]);
    expect(sourceManifest).not.toContain(BILLING_PERMISSION);

    if (!existsSync(MERGED_RELEASE_MANIFEST)) {
      expect(MERGED_RELEASE_MANIFEST).toBe(
        "android/app/build/intermediates/merged_manifests/release/processReleaseManifest/AndroidManifest.xml"
      );
      return;
    }

    const mergedManifest = read(MERGED_RELEASE_MANIFEST);
    expect(permissionsFromManifest(mergedManifest).sort()).toEqual(EXPECTED_MERGED_RELEASE_PERMISSIONS.sort());
    expect(mergedManifest).toContain(`package="${PACKAGE_NAME}"`);
  });
});
