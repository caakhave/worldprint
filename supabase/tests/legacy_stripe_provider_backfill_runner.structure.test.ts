import { readFileSync } from "node:fs";

const migrationFile = "supabase/migrations/20260716130000_legacy_stripe_provider_backfill_runner.sql";
const source = readFileSync(migrationFile, "utf8");
const sqlWithoutComments = source.replace(/--.*$/gm, "");
const compactSqlWithoutComments = sqlWithoutComments.replace(/\s+/g, " ");

describe("legacy Stripe provider backfill runner migration", () => {
  it("defines a private aggregate-only backfill runner contract", () => {
    expect(source).toContain("create or replace function billing.backfill_legacy_stripe_provider_subscriptions");
    expect(source).toContain("p_provider_environment text");
    expect(source).toContain("p_apply boolean default false");
    expect(source).toContain("p_as_of timestamptz default now()");
    expect(source).toContain("returns table");

    for (const field of [
      "provider_environment text",
      "dry_run boolean",
      "computed_at timestamptz",
      "total_rows_scanned integer",
      "rows_with_subscription_reference integer",
      "clean_candidates integer",
      "inserted integer",
      "updated integer",
      "already_present integer",
      "skipped_non_subscription integer",
      "requires_reconciliation integer",
      "parity_mismatch integer",
      "ownership_conflict integer",
      "environment_conflict integer",
      "stale_source_skipped integer",
      "failed integer",
    ]) {
      expect(source).toContain(field);
    }
  });

  it("requires explicit Stripe live/test environments and never infers from deployment context", () => {
    expect(source).toContain("v_environment not in ('live', 'test')");
    expect(source).toContain("v_resolver_environment := case when v_environment = 'live' then 'production' else 'sandbox' end");
    expect(source).not.toMatch(/hostname|project[_-]?ref|supabase\.co|stripe_.*prefix|starts_with/i);
  });

  it("uses transaction-scoped provider/environment advisory locking", () => {
    expect(source).toContain("pg_advisory_xact_lock");
    expect(source).toContain(
      "hashtextextended('billing.backfill_legacy_stripe_provider_subscriptions:stripe:' || v_environment, 0)"
    );
    expect(source).not.toContain("pg_advisory_lock(");
  });

  it("delegates legacy mapping and parity projection to existing helpers without calling the mutating summary writer", () => {
    expect(source).toContain("from billing.map_legacy_stripe_entitlement_candidate");
    expect(source).toContain("from billing.project_effective_entitlement_summary");
    expect(compactSqlWithoutComments).not.toMatch(/refresh_effective_entitlement_summary/i);
  });

  it("writes only provider_subscriptions in apply mode and never writes public entitlement or event ledgers", () => {
    expect(source).toContain("insert into billing.provider_subscriptions");
    expect(source).toContain("update billing.provider_subscriptions");
    expect(compactSqlWithoutComments).not.toMatch(/\binsert\s+into\s+public\.entitlements\b/i);
    expect(compactSqlWithoutComments).not.toMatch(/\bupdate\s+public\.entitlements\b/i);
    expect(compactSqlWithoutComments).not.toMatch(/\binsert\s+into\s+billing\.provider_events\b/i);
    expect(compactSqlWithoutComments).not.toMatch(/\bupdate\s+billing\.provider_events\b/i);
    expect(compactSqlWithoutComments).not.toMatch(/\binsert\s+into\s+public\.stripe_webhook_events\b/i);
    expect(compactSqlWithoutComments).not.toMatch(/\bupdate\s+public\.stripe_webhook_events\b/i);
    expect(compactSqlWithoutComments).not.toMatch(/\bcreate\s+trigger\b/i);
  });

  it("protects against ownership conflicts, environment conflicts, stale source snapshots, and parity mismatches", () => {
    expect(source).toContain("v_ownership_conflict := v_ownership_conflict + 1");
    expect(source).toContain("v_environment_conflict := v_environment_conflict + 1");
    expect(source).toContain("v_stale_source_skipped := v_stale_source_skipped + 1");
    expect(source).toContain("billing_backfill_parity_mismatch");
    expect(source).toContain("v_candidate_observed_at < v_existing_timestamp");
    expect(source).toContain("v_existing_user_id is distinct from v_candidate.user_id");
  });

  it("keeps the function service-role-only with invoker security and a locked search path", () => {
    expect(source).toContain("language plpgsql");
    expect(source).toContain("volatile");
    expect(source).toContain("security invoker");
    expect(source).toContain("set search_path = pg_catalog, billing, public");
    expect(source).toContain(
      "revoke all on function billing.backfill_legacy_stripe_provider_subscriptions(text, boolean, timestamptz) from public"
    );
    expect(source).toContain(
      "revoke all on function billing.backfill_legacy_stripe_provider_subscriptions(text, boolean, timestamptz) from anon"
    );
    expect(source).toContain(
      "revoke all on function billing.backfill_legacy_stripe_provider_subscriptions(text, boolean, timestamptz) from authenticated"
    );
    expect(source).toContain(
      "grant execute on function billing.backfill_legacy_stripe_provider_subscriptions(text, boolean, timestamptz) to service_role"
    );
    expect(compactSqlWithoutComments).not.toMatch(/\bexecute\s+format\b|\bdynamic sql\b/i);
  });

  it("does not expose private identifiers or add app/native/runtime changes", () => {
    const returnColumns = source.match(/returns table \(([\s\S]*?)\)\nlanguage plpgsql/i)?.[1];
    expect(returnColumns).toBeTruthy();
    expect(returnColumns).not.toMatch(
      /user_id|stripe_customer|stripe_subscription|stripe_price|provider_customer_ref|provider_subscription_ref|provider_product_ref|provider_transaction_ref|provider_original_transaction_ref|email|token|payload|session/i
    );

    expect(compactSqlWithoutComments).not.toMatch(
      /analytics|dataLayer|cgy_|StoreKit|Google Play Billing|stripe-checkout|stripe-portal|stripe-webhook/i
    );
    expect(compactSqlWithoutComments).not.toMatch(/src\/|ios\/|android\//i);
  });
});
