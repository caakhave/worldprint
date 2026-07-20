import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationFile = "supabase/migrations/20260720160000_apple_dual_environment_entitlement_isolation.sql";
const source = readFileSync(join(process.cwd(), migrationFile), "utf8");
const fixture = readFileSync(join(process.cwd(), "supabase/tests/apple_dual_environment_entitlement_isolation.sql"), "utf8");
const compact = source.replace(/--.*$/gm, "").replace(/\s+/g, " ");

describe("Apple dual-environment entitlement isolation migration", () => {
  it("adds a private Apple sandbox review entitlement projection", () => {
    expect(source).toContain("create table if not exists billing.apple_native_sandbox_entitlements");
    expect(source).toContain("user_id uuid primary key references public.profiles(id) on delete cascade");
    expect(source).toContain("alter table billing.apple_native_sandbox_entitlements force row level security");
    expect(source).toContain("revoke all on table billing.apple_native_sandbox_entitlements from authenticated");
    expect(source).toContain("grant all privileges on table billing.apple_native_sandbox_entitlements to service_role");
    expect(compact).not.toMatch(/grant\s+(select|insert|update|delete|all)[^;]+apple_native_sandbox_entitlements\s+to\s+(anon|authenticated)/i);
  });

  it("does not expose the private Apple sandbox review projection to browser roles", () => {
    expect(source).not.toContain("create or replace function public.resolve_native_apple_sandbox_entitlement");
    expect(source).not.toContain("auth.uid()");
    expect(compact).not.toMatch(/grant\s+execute[^;]+apple_native_sandbox[^;]+to\s+(anon|authenticated)/i);
  });

  it("routes production sandbox refreshes away from public.entitlements", () => {
    expect(source).toContain("current_setting('cgy.apple_deployment_mode', true)");
    expect(source).toContain("v_native_review_write boolean := v_deployment_mode = 'production' and v_environment = 'sandbox'");
    expect(source).toContain("insert into billing.apple_native_sandbox_entitlements");
    expect(source).toContain("insert into public.entitlements");
    expect(source.indexOf("if v_native_review_write then")).toBeLessThan(source.indexOf("insert into public.entitlements"));
    expect(source).toContain("'native_review_updated'::text");
  });

  it("requires explicit deployment policy in new Apple RPC overloads", () => {
    expect(source).toContain("create or replace function billing.apple_deployment_environment_allowed");
    expect(source).toContain("when 'staging' then lower(btrim(coalesce(p_provider_environment, ''))) = 'sandbox'");
    expect(source).toContain("when 'production' then lower(btrim(coalesce(p_provider_environment, ''))) in ('sandbox', 'production')");
    expect(source).toContain("create or replace function public.process_apple_purchase_verification(\n  p_provider_environment text,\n  p_deployment_mode text");
    expect(source).toContain("create or replace function public.process_apple_server_notification_event(\n  p_provider_environment text,\n  p_deployment_mode text");
    expect(source).toContain("invalid_deployment_environment");
    expect(source).toContain("perform set_config('cgy.apple_deployment_mode', v_deployment_mode, true)");
  });

  it("returns sanitized entitlement scope without exposing Apple identifiers", () => {
    expect(source).toContain("native_review_entitlement_refreshed boolean");
    expect(source).toContain("entitlement_scope text");
    expect(source).toContain("'native_review'");
    expect(source).toContain("'live'");
    expect(compact).not.toMatch(/returns table \([^;]*(original_transaction_id|transaction_id|payload_hash|app_account_token|user_ref_fingerprint)/i);
  });

  it("includes a rollback fixture for the deployment/environment matrix", () => {
    expect(fixture).toContain("begin;");
    expect(fixture).toContain("rollback;");
    expect(fixture).toContain("production sandbox leaves live entitlement free");
    expect(fixture).toContain("production sandbox writes isolated native entitlement");
    expect(fixture).toContain("staging sandbox continues granting staging QA entitlement");
    expect(fixture).toContain("production Apple transaction grants live entitlement");
    expect(fixture).toContain("staging rejects production Apple transactions");
    expect(fixture).not.toMatch(/\bdelete\s+from\s+public\.entitlements\b/i);
  });
});
