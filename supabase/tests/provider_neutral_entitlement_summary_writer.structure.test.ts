import { readFileSync } from "node:fs";

const migrationFile = "supabase/migrations/20260716120000_provider_neutral_entitlement_summary_writer.sql";
const source = readFileSync(migrationFile, "utf8");
const sqlWithoutComments = source.replace(/--.*$/gm, "");
const compactSqlWithoutComments = sqlWithoutComments.replace(/\s+/g, " ");

describe("provider-neutral entitlement summary writer migration", () => {
  it("defines the private transactional writer contract", () => {
    expect(source).toContain("create or replace function billing.refresh_effective_entitlement_summary");
    expect(source).toContain("p_user_id uuid");
    expect(source).toContain("p_environment text");
    expect(source).toContain("p_as_of timestamptz default now()");
    expect(source).toContain("returns table");

    for (const field of [
      "user_id uuid",
      "environment text",
      "plan text",
      "status text",
      "cancel_at_period_end boolean",
      "current_period_end timestamptz",
      "computed_at timestamptz",
      "updated_at timestamptz",
      "management_provider text",
      "multiple_active_providers boolean",
      "requires_reconciliation boolean",
      "decision_reason text",
      "write_action text",
      "applied boolean",
      "error_code text",
    ]) {
      expect(source).toContain(field);
    }
  });

  it("uses service-role invoker security with a locked search path", () => {
    expect(source).toContain("language plpgsql");
    expect(source).toContain("volatile");
    expect(source).toContain("security invoker");
    expect(source).toContain("set search_path = pg_catalog, billing, public");
    expect(source).toContain(
      "revoke all on function billing.refresh_effective_entitlement_summary(uuid, text, timestamptz) from public"
    );
    expect(source).toContain(
      "revoke all on function billing.refresh_effective_entitlement_summary(uuid, text, timestamptz) from anon"
    );
    expect(source).toContain(
      "revoke all on function billing.refresh_effective_entitlement_summary(uuid, text, timestamptz) from authenticated"
    );
    expect(source).toContain(
      "grant execute on function billing.refresh_effective_entitlement_summary(uuid, text, timestamptz) to service_role"
    );
  });

  it("serializes refreshes with a user-scoped transaction advisory lock", () => {
    expect(source).toContain("pg_advisory_xact_lock");
    expect(source).toContain("hashtextextended('billing.refresh_effective_entitlement_summary:' || p_user_id::text, 0)");
    expect(source).not.toContain("pg_advisory_lock");
  });

  it("validates environment and user before writing", () => {
    expect(source).toContain("v_environment not in ('production', 'sandbox')");
    expect(source).toContain("'invalid_environment'::text");
    expect(source).toContain("'invalid_user'::text");
    expect(source).toContain("from public.profiles p");
    expect(source).toContain("'user_not_found'::text");
  });

  it("calls the provider-neutral projection and only writes compatibility fields", () => {
    expect(source).toContain("from billing.project_effective_entitlement_summary(p_user_id, v_environment, v_as_of)");
    expect(source).toContain("insert into public.entitlements");
    expect(source).toContain("on conflict on constraint entitlements_pkey do update");

    for (const writtenField of ["plan", "status", "cancel_at_period_end", "current_period_end", "updated_at"]) {
      expect(source).toContain(writtenField);
    }

    const updateClause = source.match(/on conflict on constraint entitlements_pkey do update([\s\S]*?)returning/i)?.[1];
    expect(updateClause).toBeTruthy();
    expect(updateClause).not.toMatch(/stripe_customer_id|stripe_subscription_id|stripe_price_id|stripe_status/i);
    expect(updateClause).not.toMatch(/provider_|apple|google|email|auth\./i);
  });

  it("preserves Stripe-specific legacy columns and avoids private identifiers in return values", () => {
    const returnColumns = source.match(/returns table \(([\s\S]*?)\)\nlanguage plpgsql/i)?.[1];
    expect(returnColumns).toBeTruthy();
    expect(returnColumns).not.toMatch(
      /stripe_customer|stripe_subscription|stripe_price|stripe_status|provider_customer_ref|provider_subscription_ref|provider_original_transaction_ref|provider_transaction_ref|payload_hash|email|token/i
    );

    expect(source).not.toMatch(/set\s+stripe_customer_id/i);
    expect(source).not.toMatch(/set\s+stripe_subscription_id/i);
    expect(source).not.toMatch(/set\s+stripe_price_id/i);
    expect(source).not.toMatch(/set\s+stripe_status/i);
  });

  it("does not add triggers, event completion, analytics, runtime code, or native billing changes", () => {
    expect(compactSqlWithoutComments).not.toMatch(/\bcreate\s+trigger\b/i);
    expect(compactSqlWithoutComments).not.toMatch(/\bprovider_events\s+set\b/i);
    expect(compactSqlWithoutComments).not.toMatch(/\binsert\s+into\s+billing\.provider_events\b/i);
    expect(compactSqlWithoutComments).not.toMatch(/\bupdate\s+billing\.provider_events\b/i);
    expect(compactSqlWithoutComments).not.toMatch(/\bstripe_webhook_events\b/i);
    expect(compactSqlWithoutComments).not.toMatch(
      /analytics|dataLayer|cgy_|StoreKit|Google Play Billing|stripe-checkout|stripe-portal|stripe-webhook/i
    );
    expect(compactSqlWithoutComments).not.toMatch(/src\/|ios\/|android\//i);
  });
});
