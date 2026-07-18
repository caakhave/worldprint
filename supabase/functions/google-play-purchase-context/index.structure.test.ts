import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "supabase/functions/google-play-purchase-context/index.ts"), "utf8");
const config = readFileSync(join(process.cwd(), "supabase/config.toml"), "utf8");

describe("google-play-purchase-context Edge Function structure", () => {
  it("is JWT protected and returns only the purchase context fields", () => {
    expect(config).toContain("[functions.google-play-purchase-context]");
    expect(config).toContain("verify_jwt = true");
    expect(source).toContain("getSignedInUser(request, config)");
    expect(source).toContain("googlePlayObfuscatedAccountId");
    expect(source).toContain("obfuscatedAccountId");
    expect(source).toContain("productId: config.subscriptionProductId");
    expect(source).toContain("allowedBasePlanIds: allowedBasePlanIds(config)");
    expect(source).not.toMatch(/purchaseToken|serviceAccountJson|supabaseServiceRoleKey|private_key/i);
  });
});
