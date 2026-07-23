import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "supabase/functions/google-play-purchase-verify/index.ts"), "utf8");
const config = readFileSync(join(process.cwd(), "supabase/config.toml"), "utf8");
const diagnosticsMigration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260723160000_google_play_purchase_verification_diagnostics.sql"),
  "utf8"
);

describe("google-play-purchase-verify Edge Function structure", () => {
  it("is JWT protected and verifies through Android Publisher before the private RPC", () => {
    expect(config).toContain("[functions.google-play-purchase-verify]");
    expect(config).toContain("verify_jwt = true");
    expect(source).toContain("getSignedInUser(request, config)");
    expect(source).toContain("fetchSubscriptionPurchaseV2");
    expect(source).toContain("verifiedPurchaseTransitionInput");
    expect(source).toContain("processGooglePlayPurchaseVerification");
    expect(source).toContain("acknowledgeSubscriptionPurchase");
    expect(source.indexOf("processGooglePlayPurchaseVerification")).toBeLessThan(
      source.indexOf("acknowledgeSubscriptionPurchase({")
    );
  });

  it("does not return tokens, Google API payloads, service credentials, or user ids", () => {
    expect(source).toContain('return json({ ok: true, status: row.already_processed ? "already_verified" : "verified" }');
    expect(source).not.toMatch(/json\([^)]*purchaseToken|json\([^)]*serviceAccountJson|json\([^)]*private_key|json\([^)]*user\.id/i);
    expect(source).not.toMatch(/console\.(?:log|warn|error)\([^)]*purchaseToken|console\.(?:log|warn|error)\([^)]*serviceAccountJson/i);
  });

  it("logs sanitized stage-aware diagnostics and returns stable client error codes", () => {
    expect(source).toContain("buildGooglePlayVerifyDiagnostic");
    expect(source).toContain("googlePlayVerifyClientError");
    expect(source).toContain("withGooglePlayVerifyStage");
    expect(source).toContain("logVerificationFailure(diagnostic)");
    expect(source).toContain("JSON.stringify(diagnostic)");
    expect(source).not.toContain("verification failed: ${safeResult}");
  });

  it("upgrades the private Google Play RPC catch-all result without schema changes", () => {
    expect(diagnosticsMigration).toContain("provider_subscription_persistence_failed");
    expect(diagnosticsMigration).toContain("entitlement_persistence_failed");
    expect(diagnosticsMigration).toContain("pg_get_functiondef");
    expect(diagnosticsMigration).not.toMatch(/alter table|create table|drop table/i);
  });
});
