import { readFileSync } from "node:fs";

const migrationFile = "supabase/migrations/20260716150000_stripe_webhook_dual_write_transition.sql";
const fixtureFile = "supabase/tests/stripe_webhook_dual_write_transition.sql";
const migrationSource = readFileSync(migrationFile, "utf8");
const fixtureSource = readFileSync(fixtureFile, "utf8");
const sqlWithoutComments = migrationSource.replace(/--.*$/gm, "");
const compactSqlWithoutComments = sqlWithoutComments.replace(/\s+/g, " ");

describe("Stripe webhook provider-neutral transition migration", () => {
  it("defines the private webhook transition wrapper contract", () => {
    expect(migrationSource).toContain("create or replace function billing.process_stripe_webhook_transition_event");

    for (const parameter of [
      "p_provider_environment text",
      "p_provider_event_ref text",
      "p_event_type text",
      "p_event_subtype text",
      "p_event_created_at timestamptz",
      "p_user_id uuid",
      "p_provider_customer_ref text",
      "p_provider_subscription_ref text",
      "p_provider_product_ref text",
      "p_provider_status text",
      "p_current_period_start timestamptz",
      "p_current_period_end timestamptz",
      "p_cancel_at_period_end boolean",
      "p_payload_hash text",
      "p_as_of timestamptz default now()",
    ]) {
      expect(migrationSource).toContain(parameter);
    }

    for (const field of [
      "result text",
      "provider_environment text",
      "event_type text",
      "event_subtype text",
      "processed boolean",
      "provider_result text",
      "already_processed boolean",
      "legacy_fields_updated boolean",
      "provider_subscription_changed boolean",
      "compatibility_refreshed boolean",
      "reconciliation_required boolean",
      "stale_event_ignored boolean",
      "retryable boolean",
    ]) {
      expect(migrationSource).toContain(field);
    }
  });

  it("delegates provider state to the existing processor instead of duplicating it", () => {
    expect(migrationSource).toContain("from billing.process_stripe_subscription_event(");
    expect(migrationSource).toContain("p_payload_hash,");
    expect(migrationSource).toContain("true,");
    expect(compactSqlWithoutComments).not.toMatch(/\binsert\s+into\s+billing\.provider_subscriptions\b/i);
    expect(compactSqlWithoutComments).not.toMatch(/\bupdate\s+billing\.provider_subscriptions\b/i);
    expect(compactSqlWithoutComments).not.toMatch(/\binsert\s+into\s+billing\.provider_events\b/i);
    expect(compactSqlWithoutComments).not.toMatch(/\bupdate\s+billing\.provider_events\b/i);
  });

  it("preserves only the legacy Stripe fields after provider processing succeeds", () => {
    expect(migrationSource).toContain("update public.entitlements");
    expect(migrationSource).toContain("set stripe_customer_id = nullif(btrim(p_provider_customer_ref), '')");
    expect(migrationSource).toContain("stripe_subscription_id = nullif(btrim(p_provider_subscription_ref), '')");
    expect(migrationSource).toContain("stripe_price_id = nullif(btrim(p_provider_product_ref), '')");
    expect(migrationSource).toContain("stripe_status = nullif(lower(btrim(coalesce(p_provider_status, ''))), '')");
    expect(migrationSource).toContain("get diagnostics v_legacy_update_count = row_count");
    expect(migrationSource).toContain("'legacy_field_update_failed'");

    const updateClause = migrationSource.match(/update public\.entitlements([\s\S]*?)where user_id = p_user_id/i)?.[1];
    expect(updateClause).toBeTruthy();
    expect(updateClause).not.toMatch(/\bplan\s*=|\bstatus\s*=|\bcancel_at_period_end\s*=|\bcurrent_period_end\s*=/i);
  });

  it("rolls back provider changes for required-step failures and returns sanitized classifications", () => {
    expect(migrationSource).toContain("begin");
    expect(migrationSource).toContain("exception");
    expect(migrationSource).toContain("when others then");
    expect(migrationSource).toContain("'payload_conflict'");
    expect(migrationSource).toContain("'summary_refresh_failed'");
    expect(migrationSource).toContain("'legacy_field_update_failed'");
    expect(migrationSource).toContain("return query");
    expect(migrationSource).not.toMatch(/raise notice|raise log/i);
  });

  it("keeps stale provider events as ignored successes and unsupported events out of the wrapper path", () => {
    expect(migrationSource).toContain("elsif v_result = 'stale_event_ignored' then");
    expect(migrationSource).toContain("true,");
    expect(compactSqlWithoutComments).not.toMatch(/unsupported_event_type[\s\S]*update public\.entitlements/i);
  });

  it("keeps the function service-role-only with invoker security and a locked search path", () => {
    expect(migrationSource).toContain("language plpgsql");
    expect(migrationSource).toContain("volatile");
    expect(migrationSource).toContain("security invoker");
    expect(migrationSource).toContain("set search_path = pg_catalog, billing, public");
    expect(migrationSource).toContain(
      "revoke all on function billing.process_stripe_webhook_transition_event(text, text, text, text, timestamptz, uuid, text, text, text, text, timestamptz, timestamptz, boolean, text, timestamptz) from public"
    );
    expect(migrationSource).toContain(
      "revoke all on function billing.process_stripe_webhook_transition_event(text, text, text, text, timestamptz, uuid, text, text, text, text, timestamptz, timestamptz, boolean, text, timestamptz) from anon"
    );
    expect(migrationSource).toContain(
      "revoke all on function billing.process_stripe_webhook_transition_event(text, text, text, text, timestamptz, uuid, text, text, text, text, timestamptz, timestamptz, boolean, text, timestamptz) from authenticated"
    );
    expect(migrationSource).toContain(
      "grant execute on function billing.process_stripe_webhook_transition_event(text, text, text, text, timestamptz, uuid, text, text, text, text, timestamptz, timestamptz, boolean, text, timestamptz) to service_role"
    );
    expect(compactSqlWithoutComments).not.toMatch(/\bexecute\s+format\b|\bdynamic sql\b/i);
  });

  it("does not create triggers, public APIs, legacy webhook ledger writes, or app/runtime changes", () => {
    expect(compactSqlWithoutComments).not.toMatch(/\bcreate\s+trigger\b/i);
    expect(compactSqlWithoutComments).not.toMatch(/\binsert\s+into\s+public\.stripe_webhook_events\b/i);
    expect(compactSqlWithoutComments).not.toMatch(/\bupdate\s+public\.stripe_webhook_events\b/i);
    expect(compactSqlWithoutComments).not.toMatch(/\bdelete\s+from\s+public\.stripe_webhook_events\b/i);
    expect(compactSqlWithoutComments).not.toMatch(
      /analytics|dataLayer|cgy_|StoreKit|Google Play Billing|stripe-checkout|stripe-portal|src\/|ios\/|android\//i
    );
  });

  it("adds executable fixture coverage for transition rollout cases", () => {
    for (const expected of [
      "active transition result",
      "active transition preserves Stripe legacy fields",
      "transition does not write legacy webhook ledger",
      "future-period payment success after failure",
      "future-period recovery keeps legacy Stripe fields active",
      "already processed transition restores legacy fields",
      "payload conflict leaves Stripe legacy fields unchanged",
      "payload conflict is rolled back to the prior processed provider event",
      "Stripe payment failure with Apple active transition",
      "Apple active preserves Pro after Stripe failure",
      "test-mode Stripe row does not grant production resolver access",
      "summary failure rolls back provider subscription",
      "summary failure rolls back provider event",
      "retry after summary failure succeeds",
      "service_role can execute transition wrapper",
    ]) {
      expect(fixtureSource).toContain(expected);
    }
  });
});
