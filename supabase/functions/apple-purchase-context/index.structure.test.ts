import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "supabase/functions/apple-purchase-context/index.ts"), "utf8");
const config = readFileSync(join(process.cwd(), "supabase/config.toml"), "utf8");

describe("apple-purchase-context Edge Function structure", () => {
  it("is JWT protected and returns only the signed-in user's StoreKit account context", () => {
    expect(config).toContain("[functions.apple-purchase-context]");
    expect(config).toContain("verify_jwt = true");
    expect(source).toContain("getSignedInUser(request, config)");
    expect(source).toContain("appleAppAccountTokenForUser(user.id)");
    expect(source).toContain("allowedProductIds: appleProductIds()");
  });

  it("does not create provider subscriptions, grant entitlements, or expose credentials", () => {
    expect(source).not.toMatch(/provider_subscriptions|entitlements|upsert|insert|serviceRole|SUPABASE_SERVICE_ROLE_KEY/);
    expect(source).not.toMatch(/APPLE_APP_STORE_PRIVATE_KEY|APPLE_APP_STORE_KEY_ID|APPLE_APP_STORE_ISSUER_ID/);
  });
});
