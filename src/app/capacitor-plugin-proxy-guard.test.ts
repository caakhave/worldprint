import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const appleAdapter = readFileSync(join(root, "src/lib/mobile/appleStoreKit.ts"), "utf8");
const googleAdapter = readFileSync(join(root, "src/lib/mobile/googlePlayBilling.ts"), "utf8");
const adapters = `${appleAdapter}\n${googleAdapter}`;

describe("Capacitor plugin proxy registration guard", () => {
  it("keeps native plugin proxies out of Promise and async resolution paths", () => {
    expect(appleAdapter).toContain("let appleStoreKitPluginInstance: AppleStoreKitPlugin | null = null;");
    expect(appleAdapter).toContain("function appleStoreKitPlugin(): AppleStoreKitPlugin");
    expect(googleAdapter).toContain("let googlePlayBillingPluginInstance: GooglePlayBillingPlugin | null = null;");
    expect(googleAdapter).toContain("function googlePlayBillingPlugin(): GooglePlayBillingPlugin");

    expect(adapters).not.toContain("Promise.resolve(registerPlugin");
    expect(appleAdapter).not.toContain("Promise<AppleStoreKitPlugin>");
    expect(googleAdapter).not.toContain("Promise<GooglePlayBillingPlugin>");
    expect(adapters).not.toMatch(/async\s+function\s+(?:appleStoreKitPlugin|googlePlayBillingPlugin)\s*\(/u);
    expect(adapters).not.toMatch(/\.then\s*\([\s\S]{0,240}registerPlugin\s*</u);
    expect(googleAdapter).not.toMatch(/import\("@capacitor\/core"\)[\s\S]{0,240}registerPlugin/u);
  });
});
