import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260721014500_fix_apple_native_review_rehydration.sql"),
  "utf8"
);
const fixture = readFileSync(join(process.cwd(), "supabase/tests/apple_native_review_rehydration.sql"), "utf8");
const compactMigration = migration.replace(/--.*$/gm, "").replace(/\s+/g, " ");
const compactFixture = fixture.replace(/--.*$/gm, "").replace(/\s+/g, " ");

describe("Apple native review entitlement rehydration migration", () => {
  it("rehydrates already processed production sandbox verifications only after ownership proof", () => {
    expect(migration).toContain("v_native_review boolean := v_deployment_mode = 'production' and v_environment = 'sandbox'");
    expect(migration).toContain("coalesce(v_row.already_processed, false)");
    expect(migration).toContain("billing.provider_events pe");
    expect(migration).toContain("join billing.provider_subscriptions ps");
    expect(migration).toContain("join billing.apple_transaction_chains ac");
    expect(migration).toContain("pe.related_user_id = p_user_id");
    expect(migration).toContain("ps.user_id = p_user_id");
    expect(migration).toContain("ps.app_account_token = p_user_id");
    expect(migration).toContain("ac.user_id = p_user_id");
    expect(migration).toContain("ac.app_account_token = p_user_id");
    expect(migration).toContain("pe.payload_hash = p_payload_hash");
    expect(migration).toContain("ps.provider_original_transaction_ref = p_original_transaction_id_fingerprint");
    expect(migration).toContain("ac.original_transaction_id_fingerprint = p_original_transaction_id_fingerprint");
    expect(migration).toContain("billing.refresh_effective_entitlement_summary(p_user_id, v_environment, p_as_of)");
  });

  it("reports native review scope only when the refreshed sandbox entitlement still grants Pro", () => {
    expect(migration).toContain("billing.apple_native_sandbox_entitlements ne");
    expect(migration).toContain("ne.plan = 'pro'");
    expect(migration).toContain("ne.status = 'active'");
    expect(migration).toContain("ne.current_period_end is null or ne.current_period_end > p_as_of");
    expect(compactMigration).toMatch(/when\s+v_native_review_entitlement_active\s+then\s+'native_review'/i);
    expect(compactMigration).toMatch(/coalesce\(v_row\.compatibility_refreshed,\s*false\)\s+and\s+not\s+v_native_review/i);
  });

  it("does not add schema, touch public entitlements directly, or involve other providers", () => {
    expect(compactMigration).not.toMatch(/\bcreate\s+table\b/i);
    expect(compactMigration).not.toMatch(/\balter\s+table\b/i);
    expect(compactMigration).not.toMatch(/\binsert\s+into\s+public\.entitlements\b/i);
    expect(compactMigration).not.toMatch(/\bupdate\s+public\.entitlements\b/i);
    expect(compactMigration).not.toContain("stripe");
    expect(compactMigration).not.toContain("google_play");
  });

  it("covers current, idempotent, cross-account, and expired sandbox cases in a rollback fixture", () => {
    expect(fixture).toContain("begin;");
    expect(fixture).toContain("rollback;");
    expect(fixture).toContain("execute 'set local role service_role'");
    expect(fixture).toContain("already processed purchase verification rehydrates native review entitlement");
    expect(fixture).toContain("different user cannot rehydrate an already processed native review event");
    expect(fixture).toContain("expired production sandbox state does not refresh native review Pro");
    expect(fixture).toContain("conflicting payload hash fails closed");
    expect(fixture).toContain("staging deployment rejects production Apple verification");
    expect(fixture).toContain("normal public entitlement remains Free for production sandbox purchase");
    expect(fixture).toContain("idempotent verification restores native review Pro after process restart");
    expect(compactFixture).not.toMatch(/\bcommit\b/i);
    expect(compactFixture).not.toMatch(/\bdelete\s+from\s+(billing|public)\./i);
  });
});
