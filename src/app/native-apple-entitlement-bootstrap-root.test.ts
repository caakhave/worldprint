import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const layout = readFileSync(join(process.cwd(), "src/app/layout.tsx"), "utf8");

describe("root native Apple entitlement bootstrap", () => {
  it("mounts the StoreKit entitlement rehydration bridge with the native app bridges", () => {
    expect(layout).toContain('import { NativeAppleEntitlementBootstrap } from "@/features/account/NativeAppleEntitlementBootstrap";');
    expect(layout).toContain("<NativeAppleEntitlementBootstrap />");
    expect(layout.indexOf("<NativeExternalNavigationGuard />")).toBeLessThan(layout.indexOf("<NativeAppleEntitlementBootstrap />"));
    expect(layout.indexOf("<NativeAppleEntitlementBootstrap />")).toBeLessThan(layout.indexOf('<a className="skip-link"'));
  });
});
