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

  it("keeps the permanent app identity and version 2 metadata", () => {
    const appBuild = read("android/app/build.gradle");

    expect(appBuild).toContain(`namespace = "${PACKAGE_NAME}"`);
    expect(appBuild).toContain(`applicationId "${PACKAGE_NAME}"`);
    expect(appBuild).toContain("versionCode 2");
    expect(appBuild).toContain('versionName "1.0.1"');
  });

  it("adds only a BillingClient availability bootstrap and no purchase path", () => {
    const mainActivity = read("android/app/src/main/java/com/canyougeo/app/MainActivity.java");
    const bootstrap = read("android/app/src/main/java/com/canyougeo/app/PlayBillingBootstrap.java");

    expect(mainActivity).toContain("playBillingBootstrap.start(this);");
    expect(mainActivity).toContain("playBillingBootstrap.stop();");
    expect(bootstrap).toContain("BillingClient.newBuilder");
    expect(bootstrap).toContain("enableAutoServiceReconnection()");
    expect(bootstrap).toContain("startConnection");
    expect(bootstrap).toContain("endConnection");
    expect(bootstrap).toContain("isFeatureSupported(BillingClient.FeatureType.SUBSCRIPTIONS)");
    expect(bootstrap).not.toMatch(/queryProductDetailsAsync|launchBillingFlow|acknowledgePurchase|consumeAsync|getPurchaseToken|purchaseToken/);
    expect(bootstrap).not.toMatch(/entitlement|provider_subscriptions|grantPro|plan\s*=\s*"pro"/i);
  });

  it("keeps purchase UI and Stripe checkout disabled for native builds", () => {
    const actions = read("src/features/account/BillingActionsClient.tsx");
    const helper = read("src/features/account/billingActionHelpers.ts");
    const upgrade = read("src/features/account/UpgradeClient.tsx");

    expect(actions).toContain("if (nativeBuild) {");
    expect(actions).toContain("Mobile purchases unavailable");
    expect(helper).toContain("if (isNativeAppBuild()) {");
    expect(helper).toContain("nativeBillingUnavailableMessage(kind)");
    expect(upgrade).toContain("Mobile purchases are not available in this preview. Free play remains available.");
  });

  it("does not introduce token transmission, local Pro grants, or service-account credentials", () => {
    const source = ["android/app/src/main", "src/features/account", "src/lib/billing", "supabase/functions"]
      .flatMap(walkTextFiles)
      .map((path) => read(path))
      .join("\n");

    expect(source).not.toMatch(/launchBillingFlow|acknowledgePurchase|consumeAsync|getPurchaseToken|purchaseToken/);
    expect(source).not.toMatch(/google.*service.*account|service_account|private_key_id|-----BEGIN PRIVATE KEY-----/i);
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
