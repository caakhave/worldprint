import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const fixMigration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260720020000_fix_apple_purchase_verification_conflict_target.sql"),
  "utf8"
);
const fixture = readFileSync(join(process.cwd(), "supabase/tests/apple_purchase_verification_retry_recovery.sql"), "utf8");

describe("Apple purchase verification retry recovery migration", () => {
  it("recompiles the Apple purchase verifier with column-based conflict-target resolution", () => {
    expect(fixMigration).toContain("#variable_conflict use_column");
    expect(fixMigration).toContain("billing.process_apple_purchase_verification");
    expect(fixMigration).toContain("pg_get_functiondef");
    expect(fixMigration).toContain("apple_purchase_verification_variable_conflict_patch_failed");
    expect(fixMigration).not.toContain("manual provider subscription");
    expect(fixMigration).not.toContain("public.entitlements");
  });

  it("keeps the rollback fixture focused on refreshed Apple retry recovery", () => {
    expect(fixture).toContain("begin;");
    expect(fixture).toContain("rollback;");
    expect(fixture).toContain("failed-before-provider-write");
    expect(fixture).toContain("refreshed-payload");
    expect(fixture).toContain("attempt B recovers with refreshed payload");
    expect(fixture).toContain("attempt C is idempotent");
    expect(fixture).toContain("changed user fails closed");
    expect(fixture).toContain("changed environment fails closed");
    expect(fixture).toContain("changed original transaction fails closed");
    expect(fixture).toContain("changed transaction identity fails closed");
    expect(fixture).toContain("changed appAccountToken fails closed");
    expect(fixture).toContain("changed product fails closed");
    expect(fixture).not.toMatch(/\bdelete\s+from\s+billing\.provider_events\b/i);
    expect(fixture).not.toMatch(/\bupdate\s+public\.entitlements\b/i);
  });
});
