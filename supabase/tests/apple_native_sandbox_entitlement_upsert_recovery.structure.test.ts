import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260721003000_fix_apple_native_sandbox_entitlement_upsert.sql"),
  "utf8"
);
const fixture = readFileSync(
  join(process.cwd(), "supabase/tests/apple_native_sandbox_entitlement_upsert_recovery.sql"),
  "utf8"
);
const compactMigration = migration.replace(/--.*$/gm, "").replace(/\s+/g, " ");
const compactFixture = fixture.replace(/--.*$/gm, "").replace(/\s+/g, " ");

describe("Apple native sandbox entitlement upsert recovery migration", () => {
  it("patches only the native sandbox entitlement conflict target with the named primary key", () => {
    expect(migration).toContain("billing.refresh_effective_entitlement_summary");
    expect(migration).toContain("pg_get_functiondef");
    expect(migration).toContain("apple_native_sandbox_entitlements_pkey");
    expect(migration).toContain("#variable_conflict use_column");
    expect(compactMigration).toMatch(/regexp_replace\([^;]+on conflict\\s\*\\\(\\s\*user_id\\s\*\\\)\\s\*do update/i);
    expect(compactMigration).not.toMatch(/\bcreate\s+table\b/i);
    expect(compactMigration).not.toMatch(/\balter\s+table\b/i);
    expect(compactMigration).not.toMatch(/\binsert\s+into\s+(billing|public)\./i);
    expect(compactMigration).not.toMatch(/\bupdate\s+(billing|public)\./i);
    expect(compactMigration).not.toContain("stripe");
    expect(compactMigration).not.toContain("google_play");
  });

  it("keeps the rollback fixture on the full service-role Apple RPC path", () => {
    expect(fixture).toContain("begin;");
    expect(fixture).toContain("rollback;");
    expect(fixture).toContain("execute 'set local role service_role'");
    expect(fixture).toContain("public.process_apple_purchase_verification");
    expect(fixture).toContain("'sandbox',\n    'production'");
    expect(fixture).toContain("retry_pending provider event can transition successfully");
    expect(fixture).toContain("native_review_entitlement_refreshed");
    expect(fixture).toContain("entitlement_scope");
    expect(fixture).toContain("normal public entitlement remains Free for production sandbox purchase");
    expect(fixture).toContain("second verification updates same native entitlement");
    expect(fixture).toContain("same logical verified transaction remains idempotent");
    expect(fixture).toContain("staging sandbox still processes");
    expect(fixture).toContain("production Apple purchase still processes");
    expect(fixture).toContain("Stripe and Google provider ledgers unaffected");
    expect(compactFixture).not.toMatch(/\bdelete\s+from\s+(billing|public)\./i);
    expect(compactFixture).not.toMatch(/\bupdate\s+public\.entitlements\b/i);
  });
});
