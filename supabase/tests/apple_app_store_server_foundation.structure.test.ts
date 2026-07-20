import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationFile = "supabase/migrations/20260718210000_apple_app_store_server_foundation.sql";
const source = readFileSync(join(process.cwd(), migrationFile), "utf8");
const compact = source.replace(/--.*$/gm, "").replace(/\s+/g, " ");

describe("Apple App Store server foundation migration", () => {
  it("keeps raw Apple identifiers in a private service-role-only table", () => {
    expect(source).toContain("create table if not exists billing.apple_transaction_chains");
    expect(source).toContain("original_transaction_id text not null");
    expect(source).toContain("original_transaction_id_fingerprint text not null");
    expect(source).toContain("alter table billing.apple_transaction_chains force row level security");
    expect(source).toContain("revoke all on table billing.apple_transaction_chains from anon");
    expect(source).toContain("revoke all on table billing.apple_transaction_chains from authenticated");
    expect(source).toContain("grant all privileges on table billing.apple_transaction_chains to service_role");
    expect(compact).not.toMatch(/grant\s+(select|insert|update|delete|all)[^;]+apple_transaction_chains\s+to\s+(anon|authenticated)/i);
  });

  it("allowlists only the approved app, products, and Apple environments", () => {
    expect(source).toContain("bundle_id = 'com.canyougeo.app'");
    expect(source).toContain("app_apple_id = '6791248782'");
    expect(source).toContain("'com.canyougeo.pro.monthly'");
    expect(source).toContain("'com.canyougeo.pro.annual'");
    expect(source).toContain("provider_environment in ('sandbox', 'production')");
  });

  it("binds original transaction chains to exactly one account and prevents deleted-account reclaim", () => {
    expect(source).toContain("ownership_conflict");
    expect(source).toContain("deleted_account_original_transaction_conflict");
    expect(source).toContain("user_ref_fingerprint");
    expect(source.indexOf("ownership_conflict")).toBeLessThan(source.indexOf("billing.refresh_effective_entitlement_summary"));
    expect(source.indexOf("deleted_account_original_transaction_conflict")).toBeLessThan(
      source.indexOf("billing.refresh_effective_entitlement_summary")
    );
  });

  it("records TEST notifications without mutating provider subscriptions or entitlements", () => {
    expect(source).toContain("if v_event_type = 'TEST' then");
    expect(source).toContain("select 'test_processed'");
    const testBranchIndex = source.indexOf("if v_event_type = 'TEST' then");
    expect(testBranchIndex).toBeLessThan(source.indexOf("update billing.provider_subscriptions", testBranchIndex));
  });

  it("exposes only service-role RPC bridges and read-only reconciliation candidates", () => {
    expect(source).toContain("create or replace function public.process_apple_purchase_verification");
    expect(source).toContain("create or replace function public.process_apple_server_notification_event");
    expect(source).toContain("create or replace function billing.apple_subscription_reconciliation_candidates");
    expect(source).toContain("Read-only service-role Apple reconciliation foundation");
    expect(compact).not.toMatch(/grant\s+execute[^;]+process_apple_(purchase_verification|server_notification_event)[^;]+to\s+(anon|authenticated)/i);
  });
});
