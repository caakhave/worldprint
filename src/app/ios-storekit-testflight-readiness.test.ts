import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const readinessDoc = readFileSync(join(process.cwd(), "docs/mobile/IOS_STOREKIT_TESTFLIGHT_READINESS.md"), "utf8");

describe("iOS StoreKit and TestFlight readiness document", () => {
  it("marks the early readiness worksheet as historical and links the current audit", () => {
    expect(readinessDoc).toContain("Status note, 2026-07-22");
    expect(readinessDoc).toContain("Deployment Runtime Parity Audit 2026-07-22");
    expect(readinessDoc).toContain("selected App Review build `1.0.0 (9)`");
    expect(readinessDoc).toContain("do not read the historical \"current\" fields below as the latest production state");
  });

  it("records the audited protected staging state and iOS identity", () => {
    expect(readinessDoc).toContain("996223100d61627884d0aac3db1b3993ff034931");
    expect(readinessDoc).toContain("843faad836adf11e41c68d181337fa4c1f661a96");
    expect(readinessDoc).toContain("com.canyougeo.app");
    expect(readinessDoc).toContain("G5N5U6QFS8");
    expect(readinessDoc).toContain("6791248782");
    expect(readinessDoc).toContain("1.0.0 (1)");
  });

  it("records the approved StoreKit product and server-policy decisions while keeping client/App Store work gated", () => {
    expect(readinessDoc).toContain("Historical audit state at this checkpoint: staging had no StoreKit 2 runtime implementation.");
    expect(readinessDoc).toContain("com.canyougeo.pro.monthly");
    expect(readinessDoc).toContain("com.canyougeo.pro.annual");
    expect(readinessDoc).toContain("subscription group name `Can You Geo Pro`");
    expect(readinessDoc).toContain("Supabase-UUID `appAccountToken` policy");
    expect(readinessDoc).toContain("Apple server foundation PR must be merged");
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
    expect(readinessDoc).not.toMatch(/BEGIN [A-Z ]*PRIVATE KEY|access_token=|refresh_token=|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|\b200000\d{10,}\b/iu);
  });
});
