import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

function nativeFlowText() {
  const flowRoot = join(root, "canyougeo-blackbox/native/maestro/flows");
  return ["android", "ios"]
    .flatMap((platform) => readdirSync(join(flowRoot, platform)).filter((file) => file.endsWith(".yaml")).map((file) => join(flowRoot, platform, file)))
    .map((file) => readFileSync(file, "utf8"))
    .join("\n");
}

describe("native billing black-box QA drift guard", () => {
  it("keeps Maestro billing coverage aligned with current native store purchase surfaces", () => {
    const flows = nativeFlowText();

    expect(flows).not.toContain("Mobile purchases unavailable");
    expect(flows).not.toMatch(/assertNotVisible:\s*"Join monthly"/u);
    expect(flows).not.toMatch(/assertNotVisible:\s*"Join yearly"/u);

    expect(flows).toContain("Google Play purchases");
    expect(flows).toContain("Google Play manages Android purchases. Stripe checkout is unavailable in this Android build.");
    expect(flows).toContain("Apple purchases");
    expect(flows).toContain("Apple manages iOS purchases. Stripe checkout is unavailable in this iOS build.");
    expect(flows).toContain("Join monthly");
    expect(flows).toContain("Join yearly");
    expect(flows).toContain("Restore purchases");
    expect(flows).toContain("Google Play purchase catalog ready.");
    expect(flows).toContain("Google Play purchases are not available right now.");
    expect(flows).toContain("Some Google Play plans are not available right now.");
    expect(flows).toContain("Apple purchases are not available right now.");
    expect(flows).toContain("Apple purchase catalog ready.");
    expect(flows).toContain("Some Apple purchases are not available right now.");
    expect(flows).toContain("checkout.stripe.com");
    expect(flows).toContain("billing.stripe.com");
  });

  it("keeps runner suite membership and package scripts in sync with release documentation", () => {
    const runner = read("canyougeo-blackbox/native/maestro/scripts/run-native-maestro.mjs");
    const runnerTests = read("canyougeo-blackbox/native/maestro/scripts/run-native-maestro.test.mjs");
    const packageJson = read("package.json");
    const nativeReadme = read("canyougeo-blackbox/native/README.md");
    const nativeDocs = read("docs/mobile/NATIVE_BLACKBOX_QA.md");

    for (const required of [
      "09_billing_discovery.yaml",
      "06_billing_discovery.yaml",
      "release-with-universal-link",
      "qa:native:android:billing",
      "qa:native:android:release",
      "qa:native:ios:billing",
      "qa:native:ios:release"
    ]) {
      expect(`${runner}\n${runnerTests}\n${packageJson}\n${nativeReadme}\n${nativeDocs}`).toContain(required);
    }

    expect(nativeReadme).toContain("Android complete release suite");
    expect(nativeDocs).toContain("Android complete release suite");
    expect(nativeReadme).toContain("iOS Universal Links remain separately gated");
    expect(nativeDocs).toContain("Native billing QA impact map");
  });

  it("records the native billing bridge files that require black-box coverage review", () => {
    const contract = read("canyougeo-blackbox/QA_COVERAGE_CONTRACT.md");
    const nativeDocs = read("docs/mobile/NATIVE_BLACKBOX_QA.md");
    const impactMap = `${contract}\n${nativeDocs}`;

    for (const bridgeFile of [
      "src/features/account/BillingActionsClient.tsx",
      "src/features/account/appleStoreKitActions.ts",
      "src/features/account/googlePlayPurchaseActions.ts",
      "src/lib/mobile/appleStoreKit.ts",
      "src/lib/mobile/googlePlayBilling.ts",
      "ios/App/App/AppleStoreKitPlugin.swift",
      "android/app/src/main/java/com/canyougeo/app/GooglePlayBillingPlugin.java"
    ]) {
      expect(impactMap).toContain(bridgeFile);
    }
  });
});
