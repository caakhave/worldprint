import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationFile = "supabase/migrations/20260718143000_google_play_rtdn_processor.sql";
const fixtureFile = "supabase/tests/google_play_rtdn_processor.sql";
const migrationSource = readFileSync(migrationFile, "utf8");
const fixtureSource = readFileSync(fixtureFile, "utf8");
const compactSql = migrationSource.replace(/--.*$/gm, "").replace(/\s+/g, " ");
const configSource = readFileSync("supabase/config.toml", "utf8");

describe("Google Play RTDN processor migration", () => {
  it("defines a private provider-neutral processor and a public service bridge", () => {
    expect(migrationSource).toContain("create or replace function billing.process_google_play_rtdn_event");
    expect(migrationSource).toContain("create or replace function public.process_google_play_rtdn_event");
    expect(migrationSource).toContain("from billing.process_google_play_rtdn_event(");

    for (const parameter of [
      "p_provider_environment text",
      "p_pubsub_message_id text",
      "p_event_type text",
      "p_event_subtype text",
      "p_event_time timestamptz",
      "p_payload_hash text",
      "p_package_name text",
      "p_provider_product_ref text",
      "p_purchase_token_fingerprint text",
      "p_linked_purchase_token_fingerprint text",
      "p_provider_transaction_ref text",
      "p_provider_status text",
      "p_acknowledgement_state text",
      "p_auto_renews boolean",
      "p_test_purchase boolean default false"
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
      "unsupported_ignored boolean",
      "retryable boolean"
    ]) {
      expect(migrationSource).toContain(field);
    }
  });

  it("uses Pub/Sub message id and payload hash idempotency without storing raw payloads", () => {
    expect(migrationSource).toContain("v_event_ref text := 'pubsub:'");
    expect(migrationSource).toContain("from billing.provider_events pe");
    expect(migrationSource).toContain("where pe.provider = 'google_play'");
    expect(migrationSource).toContain("and pe.provider_event_ref = v_event_ref");
    expect(migrationSource).toContain("v_event.payload_hash is distinct from v_payload_hash");
    expect(migrationSource).toContain("'payload_conflict'");
    expect(migrationSource).toContain("'already_processed'::text");
    expect(migrationSource).toContain("pg_advisory_xact_lock");
    expect(migrationSource).not.toContain("pg_advisory_lock(");
    expect(compactSql).not.toMatch(/\bjsonb?\b|raw_payload|raw_purchase|bearer|jwt|access_token|service_account_json/i);
  });

  it("records test and unsupported notifications durably without subscription or entitlement mutation", () => {
    expect(migrationSource).toContain("if v_event_type = 'test_notification' then");
    expect(migrationSource).toContain("select 'test_processed'::text");
    expect(migrationSource).toContain("'unsupported_notification'");
    expect(migrationSource).toContain("processing_status = 'ignored'");

    const testBlock = migrationSource.match(/if v_event_type = 'test_notification' then([\s\S]*?)end if;/)?.[1];
    expect(testBlock).toBeTruthy();
    expect(testBlock).not.toMatch(/provider_subscriptions|refresh_effective_entitlement_summary|public\.entitlements/i);
  });

  it("requires exact package, approved product/base plan refs, and already-bound token ownership", () => {
    expect(migrationSource).toContain("v_package_name <> 'com.canyougeo.app'");
    expect(migrationSource).toContain("'com.canyougeo.app:canyougeo_pro:monthly'");
    expect(migrationSource).toContain("'com.canyougeo.app:canyougeo_pro:annual'");
    expect(migrationSource).toContain("and ps.provider_subscription_ref = v_token_ref");
    expect(migrationSource).toContain("if not v_existing_found or v_existing.user_id is null then");
    expect(migrationSource).toContain("'unbound_purchase_token'");
    expect(migrationSource).toContain("'linked_token_ownership_conflict'");
    expect(migrationSource).not.toMatch(/email|order_id|latest_user|device/i);
  });

  it("updates provider-neutral Google state and refreshes effective entitlement only for a bound user", () => {
    expect(migrationSource).toContain("update billing.provider_subscriptions");
    expect(migrationSource).toContain("where id = v_existing.id");
    expect(migrationSource).toContain("from billing.refresh_effective_entitlement_summary(v_existing.user_id, v_resolver_environment, v_as_of)");
    expect(migrationSource).toContain("v_resolver_environment := case when v_environment = 'production' then 'production' else 'sandbox' end");
    expect(migrationSource).toContain("status = v_status");
    expect(migrationSource).toContain("auto_renews = p_auto_renews");
    expect(migrationSource).toContain("grace_period_ends_at = p_grace_period_ends_at");
    expect(migrationSource).toContain("billing_retry_started_at = p_billing_retry_started_at");
    expect(migrationSource).toContain("paused_at = p_paused_at");
  });

  it("keeps the functions service-role-only and leaves browser clients out", () => {
    expect(migrationSource).toContain("security invoker");
    expect(migrationSource).toContain("set search_path = pg_catalog, billing, public");
    expect(migrationSource).toContain("set search_path = pg_catalog, public");
    expect(migrationSource).toContain("revoke all on function billing.process_google_play_rtdn_event");
    expect(migrationSource).toContain("revoke all on function public.process_google_play_rtdn_event");
    expect(migrationSource).toContain("from anon");
    expect(migrationSource).toContain("from authenticated");
    expect(migrationSource).toContain("grant execute on function public.process_google_play_rtdn_event");
    expect(migrationSource).toContain("to service_role");
    expect(compactSql).not.toMatch(/\bcreate\s+(policy|trigger|table|view)\b/i);
    expect(configSource).toContain("[functions.google-play-rtdn]");
    expect(configSource).toContain("verify_jwt = false");
  });

  it("does not mutate Stripe, Android source, catalog, purchases, or production configuration", () => {
    expect(compactSql).not.toMatch(/stripe_|billingclient|launchBillingFlow|acknowledge_purchase|cancel_purchase|refund_purchase|revoke_purchase|android\/|aab|versionCode|closed_test|open_test|production rollout/i);
    expect(migrationSource).not.toMatch(/https:\/\/[a-z0-9]{20}\.supabase\.co|supabase\.co\/functions/i);
  });

  it("adds rollback fixture coverage for test, duplicate, unbound, and bound-token refresh cases", () => {
    expect(fixtureSource).toContain("begin;");
    expect(fixtureSource).toContain("rollback;");
    for (const expected of [
      "test notification does not create a provider subscription",
      "duplicate Pub/Sub message is idempotent",
      "unbound token does not grant Pro",
      "bound active Google token grants Pro"
    ]) {
      expect(fixtureSource).toContain(expected);
    }
    expect(fixtureSource).not.toMatch(/real_purchase_token|ya29\.|Bearer|BEGIN PRIVATE KEY|private_key/i);
  });
});
