import { readFileSync } from "node:fs";

const migrationFile = "supabase/migrations/20260716100000_provider_neutral_entitlement_resolver.sql";
const source = readFileSync(migrationFile, "utf8");
const compact = source.replace(/\s+/g, " ");

describe("provider-neutral entitlement resolver migration", () => {
  it("defines the private side-effect-free resolver contract", () => {
    expect(source).toContain("create or replace function billing.resolve_effective_entitlement");
    expect(source).toContain("p_user_id uuid");
    expect(source).toContain("p_environment text");
    expect(source).toContain("p_as_of timestamptz default now()");
    expect(source).toContain("returns table");

    for (const field of [
      "effective_plan text",
      "effective_access_status text",
      "grants_pro boolean",
      "active_provider_count integer",
      "active_providers text[]",
      "management_provider text",
      "multiple_active_providers boolean",
      "effective_period_end timestamptz",
      "cancel_at_period_end boolean",
      "grace_period_end timestamptz",
      "requires_reconciliation boolean",
      "computed_at timestamptz",
      "decision_reason text",
    ]) {
      expect(source).toContain(field);
    }
  });

  it("keeps the function deterministic, private, and service-role controlled", () => {
    expect(source).toContain("language sql");
    expect(source).toContain("stable");
    expect(source).toContain("security invoker");
    expect(source).toContain("set search_path = pg_catalog, billing, public");
    expect(source).toContain(
      "revoke all on function billing.resolve_effective_entitlement(uuid, text, timestamptz) from public"
    );
    expect(source).toContain(
      "revoke all on function billing.resolve_effective_entitlement(uuid, text, timestamptz) from anon"
    );
    expect(source).toContain(
      "revoke all on function billing.resolve_effective_entitlement(uuid, text, timestamptz) from authenticated"
    );
    expect(source).toContain(
      "grant execute on function billing.resolve_effective_entitlement(uuid, text, timestamptz) to service_role"
    );
  });

  it("maps canonical resolver environments without mixing sandbox and production", () => {
    expect(source).toContain("r.environment = 'production'");
    expect(source).toContain("(ps.provider = 'stripe' and ps.environment = 'live')");
    expect(source).toContain("(ps.provider = 'apple' and ps.environment = 'production')");
    expect(source).toContain("(ps.provider = 'google_play' and ps.environment = 'production')");
    expect(source).toContain("r.environment = 'sandbox'");
    expect(source).toContain("(ps.provider = 'stripe' and ps.environment = 'test')");
    expect(source).toContain("(ps.provider = 'apple' and ps.environment = 'sandbox')");
    expect(source).toContain("(ps.provider = 'google_play' and ps.environment = 'test')");
  });

  it("implements canonical access states and timestamp-bounded grants", () => {
    expect(source).toContain("cr.status = 'active'");
    expect(source).toContain("cr.status = 'cancelled_active_until_period_end'");
    expect(source).toContain("cr.status = 'grace_period'");
    expect(source).toContain("(select as_of from requested) < cr.current_period_end");
    expect(source).toContain("(select as_of from requested) < cr.grace_period_ends_at");
    expect(source).toContain("cr.status in ('pending', 'billing_retry', 'unknown_needs_reconciliation', 'grace_period')");
    expect(source).toContain("cr.status = 'revoked' and cr.revoked_at is null");
    expect(source).toContain("cr.status = 'refunded' and cr.refunded_at is null");
  });

  it("uses multi-provider OR semantics and safe management-provider output", () => {
    expect(source).toContain("count(distinct e.provider) filter (where e.grants_pro)");
    expect(source).toContain("array_agg(distinct e.provider order by e.provider) filter (where e.grants_pro)");
    expect(source).toContain("when ar.active_provider_count > 1 then 'multiple'");
    expect(source).toContain("ar.active_provider_count > 1 as multiple_active_providers");
    expect(source).toContain("pro_multiple_providers");
  });

  it("does not write app-facing entitlements, provider rows, events, or analytics", () => {
    expect(compact).not.toMatch(/\binsert\s+into\b/i);
    expect(compact).not.toMatch(/\bupdate\s+/i);
    expect(compact).not.toMatch(/\bdelete\s+from\b/i);
    expect(compact).not.toMatch(/\balter\s+table\s+public\.entitlements\b/i);
    expect(compact).not.toMatch(/\bpublic\.stripe_webhook_events\b/i);
    expect(compact).not.toMatch(/\bcgy_|analytics|dataLayer|stripe-checkout|stripe-webhook|StoreKit/i);
  });

  it("does not expose private provider identifiers in the resolver output", () => {
    const returnColumns = source.match(/returns table \(([\s\S]*?)\)\nlanguage sql/i)?.[1];

    expect(returnColumns).toBeTruthy();
    expect(returnColumns).not.toMatch(
      /stripe_customer|stripe_subscription|provider_subscription_ref|provider_original_transaction_ref|provider_transaction_ref|payload_hash|email/i
    );
  });
});
