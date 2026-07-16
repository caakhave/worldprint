import { readFileSync } from "node:fs";

const migrationFile = "supabase/migrations/20260716160000_stripe_webhook_service_rpc_bridge.sql";
const fixtureFile = "supabase/tests/stripe_webhook_service_rpc_bridge.sql";
const transitionFile = "supabase/migrations/20260716150000_stripe_webhook_dual_write_transition.sql";
const configFile = "supabase/config.toml";

const migrationSource = readFileSync(migrationFile, "utf8");
const fixtureSource = readFileSync(fixtureFile, "utf8");
const transitionSource = readFileSync(transitionFile, "utf8");
const configSource = readFileSync(configFile, "utf8");
const compactMigration = migrationSource.replace(/--.*$/gm, "").replace(/\s+/g, " ");

describe("Stripe webhook service RPC bridge migration", () => {
  it("defines a public bridge with the exact Edge RPC name and transition contract", () => {
    expect(migrationSource).toContain("create or replace function public.process_stripe_webhook_transition_event");

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

  it("delegates to the private billing transition function without copying provider logic", () => {
    expect(migrationSource).toContain("from billing.process_stripe_webhook_transition_event(");
    expect(compactMigration).not.toMatch(/\binsert\s+into\b/i);
    expect(compactMigration).not.toMatch(/\bupdate\s+\b/i);
    expect(compactMigration).not.toMatch(/\bdelete\s+from\b/i);
    expect(compactMigration).not.toMatch(/\bcreate\s+(table|view|trigger)\b/i);
    expect(compactMigration).not.toMatch(/\bcron\b|\bschedule\b|\bnet\.http\b/i);
    expect(compactMigration).not.toMatch(/\bexecute\s+format\b|\bdynamic sql\b/i);
  });

  it("keeps the bridge service-role-only with invoker security and a locked search path", () => {
    expect(migrationSource).toContain("language sql");
    expect(migrationSource).toContain("volatile");
    expect(migrationSource).toContain("security invoker");
    expect(migrationSource).toContain("set search_path = pg_catalog, public");
    expect(migrationSource).toContain(
      "revoke all on function public.process_stripe_webhook_transition_event(text, text, text, text, timestamptz, uuid, text, text, text, text, timestamptz, timestamptz, boolean, text, timestamptz) from public"
    );
    expect(migrationSource).toContain(
      "revoke all on function public.process_stripe_webhook_transition_event(text, text, text, text, timestamptz, uuid, text, text, text, text, timestamptz, timestamptz, boolean, text, timestamptz) from anon"
    );
    expect(migrationSource).toContain(
      "revoke all on function public.process_stripe_webhook_transition_event(text, text, text, text, timestamptz, uuid, text, text, text, text, timestamptz, timestamptz, boolean, text, timestamptz) from authenticated"
    );
    expect(migrationSource).toContain(
      "grant execute on function public.process_stripe_webhook_transition_event(text, text, text, text, timestamptz, uuid, text, text, text, text, timestamptz, timestamptz, boolean, text, timestamptz) to service_role"
    );
  });

  it("does not expose the private billing schema through config or broaden private grants", () => {
    expect(configSource).not.toMatch(/extra_search_path|schemas\s*=|billing/i);
    expect(transitionSource).toContain("grant execute on function billing.process_stripe_webhook_transition_event");
    expect(transitionSource).toContain("to service_role");
    expect(transitionSource).toContain("revoke all on function billing.process_stripe_webhook_transition_event");
    expect(transitionSource).not.toMatch(/grant execute on function billing\.process_stripe_webhook_transition_event[\s\S]*to anon/i);
    expect(transitionSource).not.toMatch(/grant execute on function billing\.process_stripe_webhook_transition_event[\s\S]*to authenticated/i);
  });

  it("adds executable bridge fixture coverage for reachability, security, rollback, and idempotency", () => {
    for (const expected of [
      "invalid environment reaches bridge without writes",
      "bridge writes one provider event",
      "bridge preserves compatibility and legacy Stripe fields",
      "duplicate event creates no second provider event",
      "summary failure rolls back provider subscription",
      "public cannot execute bridge",
      "anon cannot execute bridge",
      "authenticated cannot execute bridge",
      "service_role can execute bridge",
      "bridge result excludes identifiers",
    ]) {
      expect(fixtureSource).toContain(expected);
    }
  });
});
