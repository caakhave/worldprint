import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const migrationsDir = "supabase/migrations";
const migrationFiles = readdirSync(migrationsDir).filter((file) => file.endsWith(".sql")).sort();

function migrationSource(fileName: string) {
  return readFileSync(join(migrationsDir, fileName), "utf8");
}

function migrationIndex(fileName: string) {
  const index = migrationFiles.indexOf(fileName);
  if (index < 0) throw new Error(`Missing migration ${fileName}`);
  return index;
}

describe("Supabase migration reproducibility", () => {
  const profilesBaseline = "20260626000000_account_profiles_baseline.sql";
  const billingEntitlements = "20260627000000_billing_test_mode_entitlements.sql";
  const accountSecurity = "20260627010000_rls_account_security_hardening.sql";
  const marketingConsent = "20260630090000_marketing_consent_profiles.sql";
  const challengeEmailSends = "20260630130000_challenge_email_sends.sql";

  it("keeps the profiles baseline before every tracked profile-dependent migration", () => {
    const baselineIndex = migrationIndex(profilesBaseline);

    expect(baselineIndex).toBeLessThan(migrationIndex(billingEntitlements));
    expect(baselineIndex).toBeLessThan(migrationIndex(accountSecurity));
    expect(baselineIndex).toBeLessThan(migrationIndex(marketingConsent));

    const dependentMigrations = migrationFiles.filter((file) => {
      if (file === profilesBaseline) return false;
      const source = migrationSource(file);
      return source.includes("public.profiles") || source.includes("profiles(id)");
    });

    expect(dependentMigrations).toEqual(
      expect.arrayContaining([billingEntitlements, accountSecurity, marketingConsent])
    );
    for (const file of dependentMigrations) {
      expect(baselineIndex).toBeLessThan(migrationIndex(file));
    }
  });

  it("creates the minimal public.profiles table needed by later migrations and app code", () => {
    const source = migrationSource(profilesBaseline);

    expect(source).toContain("create table if not exists public.profiles");
    expect(source).toContain("id uuid primary key references auth.users(id) on delete cascade");
    expect(source).toContain("display_name text");
    expect(source).toContain("created_at timestamptz not null default now()");
    expect(source).toContain("updated_at timestamptz not null default now()");
    expect(source).toContain("alter table public.profiles enable row level security");
    expect(source).toContain("alter table public.profiles force row level security");
  });

  it("keeps profile marketing fields reproducible through the tracked migration chain", () => {
    const source = migrationSource(marketingConsent);

    expect(source).toContain("add column if not exists marketing_opt_in boolean not null default false");
    expect(source).toContain("add column if not exists marketing_opt_in_at timestamptz");
    expect(source).toContain("add column if not exists marketing_opt_in_source text");
    expect(source).toContain("add column if not exists marketing_opt_out_at timestamptz");
    expect(source).toContain("profiles_marketing_opt_in_source_check");
    expect(source).toContain("profiles_marketing_opt_in_idx");
  });

  it("keeps account, billing, and service-ledger tables reproducible after the baseline", () => {
    const accountSource = migrationSource(accountSecurity);
    const challengeSource = migrationSource(challengeEmailSends);

    for (const tableName of [
      "public.game_runs",
      "public.round_results",
      "public.user_stats",
      "public.entitlements",
      "public.stripe_webhook_events",
    ]) {
      expect(accountSource).toContain(`create table if not exists ${tableName}`);
    }

    expect(challengeSource).toContain("create table if not exists public.challenge_email_sends");
    expect(challengeSource).toContain("alter table public.challenge_email_sends enable row level security");
    expect(challengeSource).toContain("alter table public.challenge_email_sends force row level security");
  });
});
