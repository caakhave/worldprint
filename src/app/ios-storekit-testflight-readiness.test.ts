import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const readinessDoc = readFileSync(join(process.cwd(), "docs/mobile/IOS_STOREKIT_TESTFLIGHT_READINESS.md"), "utf8");

describe("iOS StoreKit and TestFlight readiness document", () => {
  it("records the audited protected staging state and iOS identity", () => {
    expect(readinessDoc).toContain("996223100d61627884d0aac3db1b3993ff034931");
    expect(readinessDoc).toContain("com.canyougeo.app");
    expect(readinessDoc).toContain("G5N5U6QFS8");
    expect(readinessDoc).toContain("6791248782");
    expect(readinessDoc).toContain("1.0.0 (1)");
  });

  it("keeps StoreKit implementation gated until product and backend decisions are approved", () => {
    expect(readinessDoc).toContain("Current staging has no StoreKit 2 runtime implementation.");
    expect(readinessDoc).toContain("recommended, not final-approved");
    expect(readinessDoc).toContain("Final iOS product IDs are not approved.");
    expect(readinessDoc).toContain("Apple purchase verification endpoint is missing.");
    expect(readinessDoc).toContain("StoreKit 2 Capacitor plugin is missing.");
  });

  it("documents Universal Links readiness without mixing staging and production domains", () => {
    expect(readinessDoc).toContain("HTTP status: `200`.");
    expect(readinessDoc).toContain("Content type: `application/json`.");
    expect(readinessDoc).toContain("G5N5U6QFS8.com.canyougeo.app");
    expect(readinessDoc).toContain("do not include `test.canyougeo.com`");
    expect(readinessDoc).toContain("`ios/App/App/App.entitlements` contains only `applinks:canyougeo.com`");
  });

  it("keeps the checkpoint explicitly non-mutating", () => {
    expect(readinessDoc).toContain(
      "No App Store Connect product, purchase, TestFlight upload, production Supabase mutation, Stripe mutation, credential creation, or App Store submission occurs"
    );
    expect(readinessDoc).not.toMatch(/BEGIN [A-Z ]*PRIVATE KEY|access_token=|refresh_token=|signedPayload|purchaseToken|transactionId|originalTransactionId/iu);
  });
});
