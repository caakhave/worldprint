import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationFile = "supabase/migrations/20260718170000_google_play_purchase_verification.sql";
const source = readFileSync(join(process.cwd(), migrationFile), "utf8");
const compact = source.replace(/--.*$/gm, "").replace(/\s+/g, " ");

describe("Google Play purchase verification migration", () => {
  it("keeps raw purchase tokens in a service-role-only private table", () => {
    expect(source).toContain("create table if not exists billing.google_play_purchase_tokens");
    expect(source).toContain("purchase_token text not null");
    expect(source).toContain("purchase_token_fingerprint text not null");
    expect(source).toContain("alter table billing.google_play_purchase_tokens force row level security");
    expect(source).toContain("revoke all on table billing.google_play_purchase_tokens from anon");
    expect(source).toContain("revoke all on table billing.google_play_purchase_tokens from authenticated");
    expect(source).toContain("grant all privileges on table billing.google_play_purchase_tokens to service_role");
    expect(compact).not.toMatch(/grant\s+(select|insert|update|delete|all)[^;]+google_play_purchase_tokens\s+to\s+(anon|authenticated)/i);
  });

  it("binds only the approved package, product, and base plans", () => {
    expect(source).toContain("package_name = 'com.canyougeo.app'");
    expect(source).toContain("'com.canyougeo.app:canyougeo_pro:monthly'");
    expect(source).toContain("'com.canyougeo.app:canyougeo_pro:annual'");
    expect(source).toContain("v_token_ref !~ '^sha256_[a-f0-9]{64}$'");
    expect(source).toContain("v_purchase_token ~ '[[:space:]]'");
  });

  it("rejects cross-user and linked-token ownership conflicts before refreshing entitlements", () => {
    expect(source).toContain("ownership_conflict");
    expect(source).toContain("linked_token_ownership_conflict");
    expect(source.indexOf("linked_token_ownership_conflict")).toBeLessThan(
      source.indexOf("billing.refresh_effective_entitlement_summary")
    );
  });

  it("acknowledges through a separate fingerprint-only RPC after durable processing", () => {
    expect(source).toContain("create or replace function billing.record_google_play_purchase_acknowledgement");
    expect(source).toContain("p_purchase_token_fingerprint text");
    expect(source).toContain("purchase_token_fingerprint = v_token_ref");
    expect(source).toContain("record_google_play_purchase_acknowledgement(text, text, timestamptz)");
    expect(compact).not.toMatch(/record_google_play_purchase_acknowledgement\([^)]*purchase_token\s+text/i);
  });
});
