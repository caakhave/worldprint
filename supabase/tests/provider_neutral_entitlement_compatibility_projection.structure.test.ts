import { readFileSync } from "node:fs";

const migrationFile = "supabase/migrations/20260716110000_provider_neutral_entitlement_compatibility_projection.sql";
const source = readFileSync(migrationFile, "utf8");
const compact = source.replace(/\s+/g, " ");

describe("provider-neutral entitlement compatibility projection migration", () => {
  it("defines the private compatibility projection contract", () => {
    expect(source).toContain("create or replace function billing.project_effective_entitlement_summary");
    expect(source).toContain("p_user_id uuid");
    expect(source).toContain("p_environment text");
    expect(source).toContain("p_as_of timestamptz default now()");
    expect(source).toContain("from billing.resolve_effective_entitlement(p_user_id, p_environment, p_as_of)");

    for (const field of [
      "user_id uuid",
      "plan text",
      "status text",
      "cancel_at_period_end boolean",
      "current_period_end timestamptz",
      "computed_at timestamptz",
      "management_provider text",
      "multiple_active_providers boolean",
      "requires_reconciliation boolean",
      "decision_reason text",
    ]) {
      expect(source).toContain(field);
    }
  });

  it("projects current public entitlement semantics without provider identifiers", () => {
    expect(source).toContain("when resolved.grants_pro then 'pro' else 'free'");
    expect(source).toContain("when resolved.grants_pro then 'active'");
    expect(source).toContain("when provider_context.provider_record_count = 0 then 'free'");
    expect(source).toContain("when provider_context.has_billing_retry then 'past_due'");
    expect(source).toContain("else 'canceled'");

    const projectionReturnColumns = source.match(
      /billing\.project_effective_entitlement_summary[\s\S]*?returns table \(([\s\S]*?)\)\nlanguage sql/i
    )?.[1];
    expect(projectionReturnColumns).toBeTruthy();
    expect(projectionReturnColumns).not.toMatch(
      /stripe_customer|stripe_subscription|stripe_price|provider_customer_ref|provider_subscription_ref|provider_original_transaction_ref|provider_transaction_ref|payload_hash|email/i
    );
  });

  it("defines the Stripe dry-run mapper with explicit legacy fields and no writes", () => {
    expect(source).toContain("create or replace function billing.map_legacy_stripe_entitlement_candidate");
    for (const field of [
      "p_user_id uuid",
      "p_environment text",
      "p_plan text",
      "p_status text",
      "p_stripe_customer_id text",
      "p_stripe_subscription_id text",
      "p_stripe_price_id text",
      "p_stripe_status text",
      "p_cancel_at_period_end boolean",
      "p_current_period_end timestamptz",
      "p_updated_at timestamptz",
    ]) {
      expect(source).toContain(field);
    }

    for (const field of [
      "provider text",
      "environment text",
      "product_tier text",
      "provider_customer_ref text",
      "provider_subscription_ref text",
      "provider_product_ref text",
      "status text",
      "reconciliation_status text",
      "should_insert_candidate boolean",
      "requires_reconciliation boolean",
      "mapping_reason text",
    ]) {
      expect(source).toContain(field);
    }

    expect(compact).not.toMatch(/\binsert\s+into\b/i);
    expect(compact).not.toMatch(/\bupdate\s+public\.entitlements\b/i);
    expect(compact).not.toMatch(/\bdelete\s+from\b/i);
    expect(compact).not.toMatch(/\balter\s+table\s+public\.entitlements\b/i);
    expect(compact).not.toMatch(/\bupsert\b/i);
  });

  it("requires explicit Stripe environments and preserves resolver environment isolation", () => {
    expect(source).toContain("n.environment in ('live', 'test') as has_valid_environment");
    expect(source).toContain("when not c.has_valid_environment then 'invalid_environment'");
    expect(source).toContain("(ps.provider = 'stripe' and ps.environment = 'live')");
    expect(source).toContain("(ps.provider = 'stripe' and ps.environment = 'test')");
    expect(source).toContain("(ps.provider = 'apple' and ps.environment = 'production')");
    expect(source).toContain("(ps.provider = 'apple' and ps.environment = 'sandbox')");
    expect(source).toContain("(ps.provider = 'google_play' and ps.environment = 'production')");
    expect(source).toContain("(ps.provider = 'google_play' and ps.environment = 'test')");
  });

  it("maps legacy Stripe states to safe provider-neutral candidates", () => {
    expect(source).toContain("when c.stripe_status in ('active', 'trialing')");
    expect(source).toContain("then 'cancelled_active_until_period_end'");
    expect(source).toContain("then 'active'");
    expect(source).toContain("when c.stripe_status = 'past_due' then 'billing_retry'");
    expect(source).toContain("when c.stripe_status = 'incomplete' then 'pending'");
    expect(source).toContain("when c.stripe_status in ('canceled', 'cancelled', 'deleted', 'incomplete_expired', 'unpaid') then 'expired'");
    expect(source).toContain("when c.stripe_status = 'paused' then 'paused'");
    expect(source).toContain("else 'unknown_needs_reconciliation'");
    expect(source).toContain("when c.stripe_status in ('active', 'trialing') and c.current_period_end is null then 'active_missing_period_end'");
  });

  it("keeps both helpers deterministic, private, and service-role controlled", () => {
    for (const functionName of [
      "billing.project_effective_entitlement_summary(uuid, text, timestamptz)",
      "billing.map_legacy_stripe_entitlement_candidate(uuid, text, text, text, text, text, text, text, boolean, timestamptz, timestamptz, timestamptz)",
    ]) {
      expect(source).toContain(`revoke all on function ${functionName} from public`);
      expect(source).toContain(`revoke all on function ${functionName} from anon`);
      expect(source).toContain(`revoke all on function ${functionName} from authenticated`);
      expect(source).toContain(`grant execute on function ${functionName} to service_role`);
    }

    expect(source).toContain("language sql");
    expect(source).toContain("stable");
    expect(source).toContain("security invoker");
    expect(source).toContain("set search_path = pg_catalog, billing, public");
  });

  it("does not change runtime checkout, Stripe webhook, native billing, analytics, or app code", () => {
    expect(compact).not.toMatch(/stripe-checkout|stripe-portal|stripe-webhook|StoreKit|Google Play Billing/i);
    expect(compact).not.toMatch(/cgy_|dataLayer|analytics|Meta|TikTok|Reddit/i);
    expect(compact).not.toMatch(/src\/|ios\/|android\//i);
  });
});
