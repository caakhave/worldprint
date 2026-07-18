import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "supabase/functions/google-play-purchase-verify/index.ts"), "utf8");
const config = readFileSync(join(process.cwd(), "supabase/config.toml"), "utf8");

describe("google-play-purchase-verify Edge Function structure", () => {
  it("is JWT protected and verifies through Android Publisher before the private RPC", () => {
    expect(config).toContain("[functions.google-play-purchase-verify]");
    expect(config).toContain("verify_jwt = true");
    expect(source).toContain("getSignedInUser(request, config)");
    expect(source).toContain("fetchSubscriptionPurchaseV2");
    expect(source).toContain("verifiedPurchaseTransitionInput");
    expect(source).toContain("processGooglePlayPurchaseVerification");
    expect(source).toContain("acknowledgeSubscriptionPurchase");
    expect(source.indexOf("const row = await processGooglePlayPurchaseVerification")).toBeLessThan(
      source.indexOf("await acknowledgeSubscriptionPurchase")
    );
  });

  it("does not return tokens, Google API payloads, service credentials, or user ids", () => {
    expect(source).toContain('return json({ ok: true, status: row.already_processed ? "already_verified" : "verified" }');
    expect(source).not.toMatch(/json\([^)]*purchaseToken|json\([^)]*serviceAccountJson|json\([^)]*private_key|json\([^)]*user\.id/i);
    expect(source).not.toMatch(/console\.(?:log|warn|error)\([^)]*purchaseToken|console\.(?:log|warn|error)\([^)]*serviceAccountJson/i);
  });
});
