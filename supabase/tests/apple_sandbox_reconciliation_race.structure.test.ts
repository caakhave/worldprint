import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = "supabase/migrations/20260722233000_fix_apple_sandbox_reconciliation_race.sql";
const migration = readFileSync(join(process.cwd(), migrationPath), "utf8");
const fixture = readFileSync(join(process.cwd(), "supabase/tests/apple_sandbox_reconciliation_race.sql"), "utf8");
const compactMigration = migration.replace(/--.*$/gm, "").replace(/\s+/g, " ");
const compactFixture = fixture.replace(/--.*$/gm, "").replace(/\s+/g, " ");

describe("Apple production-sandbox reconciliation race migration", () => {
  it("adds a narrow verified notification-first race repair helper", () => {
    expect(migration).toContain("billing.repair_apple_unbound_notifications_after_purchase_verification");
    expect(migration).toContain("billing.apple_deployment_environment_allowed(v_deployment_mode, v_environment)");
    expect(migration).toContain("pe.provider_event_ref like 'notification:%'");
    expect(migration).toContain("pe.last_error_code = 'unbound_original_transaction'");
    expect(migration).toContain("pe.processing_status = 'reconciliation_required'");
    expect(migration).toContain("pe.provider_subscription_id is null");
    expect(migration).toContain("pe.event_type <> 'purchase_verification'");
    expect(migration).toContain("pe.event_type <> 'TEST'");
    expect(migration).toContain("ac.user_id = v_user_id");
    expect(migration).toContain("ps.user_id = v_user_id");
    expect(migration).toContain("ps.provider_original_transaction_ref = v_original_ref");
    expect(migration).toContain("provider_subscription_id = v_provider_subscription_id");
    expect(compactMigration).not.toMatch(/attempt_count\s*=\s*least\s*\(\s*attempt_count\s*\+\s*1/i);
  });

  it("repairs only after an accepted purchase verification disposition", () => {
    expect(migration).toContain("create or replace function public.process_apple_purchase_verification");
    expect(migration).toContain("coalesce(v_row.processed, false) or coalesce(v_row.already_processed, false)");
    expect(migration).toContain("not coalesce(v_row.reconciliation_required, false)");
    expect(migration).toContain("not coalesce(v_row.retryable, false)");
    expect(migration).toContain("perform billing.repair_apple_unbound_notifications_after_purchase_verification");
    expect(migration).toContain("native_review_entitlement_refreshed");
    expect(migration).toContain("entitlement_scope");
  });

  it("makes Apple reconciliation candidates deployment-lane aware", () => {
    expect(migration).toContain("billing.apple_subscription_reconciliation_candidates(\n  p_environment text,\n  p_deployment_mode text");
    expect(migration).toContain("billing.apple_deployment_environment_allowed(s.deployment_mode, s.requested_environment)");
    expect(migration).toContain("then 'deployment_mode_required'");
    expect(migration).toContain("s.deployment_mode = 'production'");
    expect(migration).toContain("s.requested_environment = 'sandbox'");
    expect(migration).toContain("billing.apple_native_sandbox_entitlements ne");
    expect(migration).toContain("s.native_provider_subscription_id is distinct from s.id");
    expect(migration).toContain("not (s.deployment_mode = 'production' and s.requested_environment = 'sandbox')");
    expect(migration).toContain("left join public.entitlements e");
  });

  it("keeps the compatibility wrapper from guessing production or staging", () => {
    expect(migration).toContain("current_setting('cgy.apple_deployment_mode', true)");
    expect(migration).toContain("Operators should prefer the explicit deployment-mode overload");
    expect(compactMigration).not.toMatch(/jquebthneczqdxagagof|hsgpjtyysbremrokkoym|supabase\.co/i);
  });

  it("includes rollback fixtures for the known race and lane matrix", () => {
    expect(fixture).toContain("begin;");
    expect(fixture).toContain("rollback;");
    expect(fixture).toContain("notification:fixture-6c1a-race-initial-buy");
    expect(fixture).toContain("production sandbox leaves public entitlement Free");
    expect(fixture).toContain("active production-sandbox provider with matching native Pro is consistent");
    expect(fixture).toContain("active production-sandbox provider without native Pro is inconsistent");
    expect(fixture).toContain("active production-sandbox provider with native Pro linked to the wrong subscription is inconsistent");
    expect(fixture).toContain("staging sandbox active provider uses public entitlement projection");
    expect(fixture).toContain("production live Apple active provider uses public entitlement projection");
    expect(fixture).toContain("inactive production-sandbox provider with stale native Pro is a candidate");
    expect(fixture).toContain("purchase-first notification processes normally");
    expect(fixture).toContain("ownership-conflict notification is never auto-repaired");
    expect(fixture).toContain("different environment or original fingerprint is never repaired");
    expect(fixture).toContain("repeated verification remains idempotent");
    expect(fixture).toContain("Stripe and Google provider subscriptions are untouched");
    expect(fixture).toContain("compatibility wrapper refuses to infer the deployment lane");
    expect(compactFixture).not.toMatch(/\bdelete\s+from\s+(billing|public)\./i);
    expect(compactFixture).not.toMatch(/\bupdate\s+public\.entitlements\b/i);
  });
});
