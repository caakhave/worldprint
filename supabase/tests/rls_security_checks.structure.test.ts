import { readFileSync } from "node:fs";

const rlsSecurityChecks = readFileSync("supabase/tests/rls_security_checks.sql", "utf8");
const supabaseValidation = readFileSync("docs/ops/supabase-validation.sql", "utf8");
const challengeLedgerMigration = readFileSync(
  "supabase/migrations/20260630130000_challenge_email_sends.sql",
  "utf8"
);

describe("Supabase RLS security checks", () => {
  it("covers the challenge email send ledger in the read-only validation script", () => {
    expect(rlsSecurityChecks).toContain("('challenge_email_sends')");
    expect(rlsSecurityChecks).toContain("'authenticated_has_service_ledger_access'");
    expect(rlsSecurityChecks).toContain("'missing_service_ledger'");
    expect(rlsSecurityChecks).toContain("'challenge_email_sends' as table_name");
    expect(rlsSecurityChecks).toContain("'profiles',");
    expect(rlsSecurityChecks).toContain("'stripe_webhook_events',");
  });

  it("keeps challenge_email_sends service-only in the migration", () => {
    expect(challengeLedgerMigration).toContain("revoke all on table public.challenge_email_sends from anon");
    expect(challengeLedgerMigration).toContain("revoke all on table public.challenge_email_sends from authenticated");
    expect(challengeLedgerMigration).toContain("grant all privileges on table public.challenge_email_sends to service_role");
    expect(challengeLedgerMigration).toContain("alter table public.challenge_email_sends enable row level security");
    expect(challengeLedgerMigration).toContain("alter table public.challenge_email_sends force row level security");
  });

  it("keeps the operator validation SQL aligned with challenge email RLS coverage", () => {
    expect(supabaseValidation).toContain("select 'challenge_email_sends' as table_name");
    expect(supabaseValidation).toContain("('challenge_email_sends')");
    expect(supabaseValidation).toContain("'BROWSER_SERVICE_LEDGER_GRANT'");
    expect(supabaseValidation).toContain("not in ('stripe_webhook_events', 'challenge_email_sends')");
  });
});
