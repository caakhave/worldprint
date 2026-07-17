import { readFileSync } from "node:fs";

const migrationFile = "supabase/migrations/20260716140000_stripe_provider_event_processor.sql";
const fixtureFile = "supabase/tests/stripe_provider_event_processor.sql";
const migrationSource = readFileSync(migrationFile, "utf8");
const fixtureSource = readFileSync(fixtureFile, "utf8");
const sqlWithoutComments = migrationSource.replace(/--.*$/gm, "");
const compactSqlWithoutComments = sqlWithoutComments.replace(/\s+/g, " ");

describe("Stripe provider event processor migration", () => {
  it("defines the private normalized Stripe event processor contract", () => {
    expect(migrationSource).toContain("create or replace function billing.process_stripe_subscription_event");

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
      "p_product_allowed boolean default false",
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
      "already_processed boolean",
      "provider_subscription_changed boolean",
      "compatibility_refreshed boolean",
      "reconciliation_required boolean",
      "stale_event_ignored boolean",
      "retryable boolean",
    ]) {
      expect(migrationSource).toContain(field);
    }
  });

  it("supports only the current Stripe webhook event classes", () => {
    for (const eventType of [
      "checkout.session.completed",
      "customer.subscription.created",
      "customer.subscription.updated",
      "customer.subscription.deleted",
      "invoice.payment_failed",
      "invoice.payment_succeeded",
    ]) {
      expect(migrationSource).toContain(eventType);
    }

    expect(migrationSource).toContain("'unsupported_event_type'::text");
    expect(compactSqlWithoutComments).not.toMatch(/charge\.|payment_intent|dispute|customer\.created/i);
  });

  it("uses provider-event idempotency, payload conflict protection, and transaction-scoped locks", () => {
    expect(migrationSource).toContain("from billing.provider_events pe");
    expect(migrationSource).toContain("where pe.provider = 'stripe'");
    expect(migrationSource).toContain("and pe.environment = v_environment");
    expect(migrationSource).toContain("and pe.provider_event_ref = v_event_ref");
    expect(migrationSource).toContain("v_event.payload_hash is distinct from v_payload_hash");
    expect(migrationSource).toContain("'payload_conflict'");
    expect(migrationSource).toContain("'already_processed'::text");
    expect(migrationSource).toContain("pg_advisory_xact_lock");
    expect(migrationSource).toContain("billing.process_stripe_subscription_event:stripe:");
    expect(migrationSource).toContain("billing.process_stripe_subscription_event:subscription:");
    expect(migrationSource).not.toContain("pg_advisory_lock(");
  });

  it("protects ownership, environment, ordering, and product allowlist boundaries", () => {
    expect(migrationSource).toContain("v_environment not in ('live', 'test')");
    expect(migrationSource).toContain("'invalid_environment'::text");
    expect(migrationSource).toContain("ps.environment <> v_environment");
    expect(migrationSource).toContain("'environment_conflict'");
    expect(migrationSource).toContain("v_existing.user_id is distinct from p_user_id");
    expect(migrationSource).toContain("'ownership_conflict'");
    expect(migrationSource).toContain("v_event_created_at < v_existing_timestamp");
    expect(migrationSource).toContain("'stale_event_ignored'");
    expect(migrationSource).toContain("not coalesce(p_product_allowed, false)");
    expect(migrationSource).toContain("'product_not_allowed'");
  });

  it("normalizes Stripe statuses into the provider-neutral status model", () => {
    for (const stripeStatus of [
      "active",
      "trialing",
      "past_due",
      "unpaid",
      "incomplete",
      "incomplete_expired",
      "paused",
      "canceled",
    ]) {
      expect(migrationSource).toContain(stripeStatus);
    }

    for (const canonicalStatus of [
      "active",
      "cancelled_active_until_period_end",
      "billing_retry",
      "pending",
      "expired",
      "paused",
      "unknown_needs_reconciliation",
    ]) {
      expect(migrationSource).toContain(canonicalStatus);
    }
  });

  it("mutates provider state and refreshes public compatibility state transactionally", () => {
    expect(migrationSource).toContain("insert into billing.provider_subscriptions");
    expect(migrationSource).toContain("update billing.provider_subscriptions");
    expect(migrationSource).toContain("from billing.refresh_effective_entitlement_summary");
    expect(migrationSource).toContain("processing_status = 'processed'");
    expect(migrationSource).toContain("processed_at = v_as_of");
    expect(migrationSource).toContain("'summary_refresh_failed'");
    expect(migrationSource).toContain("processing_status = 'retry_pending'");
  });

  it("preserves legacy Stripe fields and the legacy webhook replay ledger", () => {
    const updateClauses = compactSqlWithoutComments.match(/update public\.entitlements[\s\S]*?;/gi) ?? [];
    expect(updateClauses).toHaveLength(0);
    expect(compactSqlWithoutComments).not.toMatch(/set\s+stripe_customer_id|set\s+stripe_subscription_id|set\s+stripe_price_id|set\s+stripe_status/i);
    expect(compactSqlWithoutComments).not.toMatch(/\binsert\s+into\s+public\.stripe_webhook_events\b/i);
    expect(compactSqlWithoutComments).not.toMatch(/\bupdate\s+public\.stripe_webhook_events\b/i);
    expect(compactSqlWithoutComments).not.toMatch(/\bdelete\s+from\s+public\.stripe_webhook_events\b/i);
  });

  it("keeps the function service-role-only with invoker security and a locked search path", () => {
    expect(migrationSource).toContain("language plpgsql");
    expect(migrationSource).toContain("volatile");
    expect(migrationSource).toContain("security invoker");
    expect(migrationSource).toContain("set search_path = pg_catalog, billing, public");
    expect(migrationSource).toContain(
      "revoke all on function billing.process_stripe_subscription_event(text, text, text, text, timestamptz, uuid, text, text, text, text, timestamptz, timestamptz, boolean, text, boolean, timestamptz) from public"
    );
    expect(migrationSource).toContain(
      "revoke all on function billing.process_stripe_subscription_event(text, text, text, text, timestamptz, uuid, text, text, text, text, timestamptz, timestamptz, boolean, text, boolean, timestamptz) from anon"
    );
    expect(migrationSource).toContain(
      "revoke all on function billing.process_stripe_subscription_event(text, text, text, text, timestamptz, uuid, text, text, text, text, timestamptz, timestamptz, boolean, text, boolean, timestamptz) from authenticated"
    );
    expect(migrationSource).toContain(
      "grant execute on function billing.process_stripe_subscription_event(text, text, text, text, timestamptz, uuid, text, text, text, text, timestamptz, timestamptz, boolean, text, boolean, timestamptz) to service_role"
    );
    expect(compactSqlWithoutComments).not.toMatch(/\bexecute\s+format\b|\bdynamic sql\b/i);
  });

  it("does not accept sensitive provider payloads or expose private identifiers in the return contract", () => {
    const returnColumns = migrationSource.match(/returns table \(([\s\S]*?)\)\nlanguage plpgsql/i)?.[1];
    expect(returnColumns).toBeTruthy();
    expect(returnColumns).not.toMatch(
      /user_id|stripe_customer|stripe_subscription|stripe_price|provider_customer_ref|provider_subscription_ref|provider_product_ref|payload_hash|email|token|session|card|billing/i
    );

    const parameterBlock = migrationSource.match(/process_stripe_subscription_event\(([\s\S]*?)\)\nreturns table/i)?.[1];
    expect(parameterBlock).toBeTruthy();
    expect(parameterBlock).not.toMatch(/raw|json|payment_method|email|billing_address|card|signature|session_token/i);
  });

  it("adds executable fixture coverage for the required local cases", () => {
    for (const expected of [
      "active subscription creation",
      "annual checkout subscription",
      "cancel-at-period-end update",
      "payment failure",
      "payment success after failure",
      "future-period payment success after failure",
      "subscription deletion",
      "unsupported event",
      "unknown Stripe status",
      "missing subscription reference",
      "missing user",
      "unknown product",
      "same event retry after successful commit",
      "payload conflict",
      "older active after newer active",
      "older active after newer cancellation",
      "older update after deletion",
      "stale payment failure after success",
      "ownership conflict",
      "environment conflict",
      "same event id can exist independently in live and test",
      "Stripe active coexists with Apple active",
      "Apple preserves Pro after Stripe deletion",
      "summary refresh failure is sanitized",
      "retry succeeds after rolled-back transaction",
      "malformed legacy row does not fabricate provider record",
      "processor fixture does not mutate legacy Stripe webhook ledger",
    ]) {
      expect(fixtureSource).toContain(expected);
    }
  });
});
