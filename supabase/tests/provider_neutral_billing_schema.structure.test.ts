import { readFileSync } from "node:fs";

const migrationFile = "supabase/migrations/20260716090000_provider_neutral_billing_schema.sql";
const migrationSource = readFileSync(migrationFile, "utf8");
const compactSource = migrationSource.replace(/\s+/g, " ");

describe("provider-neutral private billing schema migration", () => {
  it("adds exactly the private billing schema tables needed for provider records and events", () => {
    expect(migrationSource).toContain("create schema if not exists billing");
    expect(migrationSource).toContain("create table if not exists billing.provider_subscriptions");
    expect(migrationSource).toContain("create table if not exists billing.provider_events");

    for (const column of [
      "user_id uuid references public.profiles(id) on delete set null",
      "provider text not null",
      "environment text not null",
      "product_tier text not null",
      "provider_product_ref text not null",
      "provider_customer_ref text",
      "provider_subscription_ref text",
      "provider_original_transaction_ref text",
      "provider_transaction_ref text",
      "app_account_token uuid references public.profiles(id) on delete set null",
      "status text not null",
      "reconciliation_status text not null default 'needs_verification'",
    ]) {
      expect(migrationSource).toContain(column);
    }

    for (const column of [
      "provider_event_ref text not null",
      "event_type text not null",
      "event_subtype text",
      "occurred_at timestamptz",
      "effective_at timestamptz",
      "processing_status text not null default 'queued'",
      "attempt_count integer not null default 0",
      "last_attempted_at timestamptz",
      "reconciliation_required boolean not null default false",
      "payload_hash text",
    ]) {
      expect(migrationSource).toContain(column);
    }
  });

  it("keeps provider environments strict and provider-scoped", () => {
    expect(migrationSource).toContain("provider_subscriptions_provider_environment_check");
    expect(migrationSource).toContain("(provider = 'stripe' and environment in ('test', 'live'))");
    expect(migrationSource).toContain("(provider = 'apple' and environment in ('sandbox', 'production'))");
    expect(migrationSource).toContain("(provider = 'google_play' and environment in ('test', 'production'))");
    expect(migrationSource).toContain("provider_events_provider_environment_check");
  });

  it("uses provider/environment partial uniqueness for provider subscription identifiers", () => {
    expect(compactSource).toContain(
      "create unique index if not exists provider_subscriptions_subscription_ref_uidx on billing.provider_subscriptions(provider, environment, provider_subscription_ref) where provider_subscription_ref is not null;"
    );
    expect(compactSource).toContain(
      "create unique index if not exists provider_subscriptions_original_transaction_ref_uidx on billing.provider_subscriptions(provider, environment, provider_original_transaction_ref) where provider_original_transaction_ref is not null;"
    );
    expect(compactSource).toContain(
      "create unique index if not exists provider_subscriptions_transaction_ref_uidx on billing.provider_subscriptions(provider, environment, provider_transaction_ref) where provider_transaction_ref is not null;"
    );
  });

  it("deduplicates provider events by provider, environment, and provider event reference", () => {
    expect(compactSource).toContain(
      "create unique index if not exists provider_events_event_ref_uidx on billing.provider_events(provider, environment, provider_event_ref);"
    );
    expect(compactSource).toContain(
      "create index if not exists provider_events_original_transaction_ref_idx on billing.provider_events(provider, environment, provider_original_transaction_ref) where provider_original_transaction_ref is not null;"
    );
    expect(compactSource).toContain(
      "create index if not exists provider_events_processing_status_received_at_idx on billing.provider_events(processing_status, received_at);"
    );
  });

  it("keeps status, timestamp, and retry state constrained for future resolver work", () => {
    for (const status of [
      "active",
      "cancelled_active_until_period_end",
      "grace_period",
      "billing_retry",
      "pending",
      "expired",
      "revoked",
      "refunded",
      "paused",
      "unknown_needs_reconciliation",
    ]) {
      expect(migrationSource).toContain(`'${status}'`);
    }

    expect(migrationSource).toContain("provider_subscriptions_status_timestamp_check");
    expect(migrationSource).toContain("status <> 'grace_period' or grace_period_ends_at is not null");
    expect(migrationSource).toContain("status <> 'billing_retry' or billing_retry_started_at is not null");
    expect(migrationSource).toContain("provider_events_attempt_count_check");
    expect(migrationSource).toContain("provider_events_processing_time_check");
    expect(migrationSource).toContain("provider_events_reconciliation_required_idx");
  });

  it("retains provider records after account deletion without keeping live profile relationships", () => {
    expect(migrationSource).toContain("user_id uuid references public.profiles(id) on delete set null");
    expect(migrationSource).toContain("app_account_token uuid references public.profiles(id) on delete set null");
    expect(migrationSource).toContain("related_user_id uuid references public.profiles(id) on delete set null");
    expect(migrationSource).toContain("provider_subscriptions_app_account_token_user_check");
  });

  it("keeps the billing schema service-role-only with RLS forced and no browser policies", () => {
    expect(migrationSource).toContain("revoke all on schema billing from anon");
    expect(migrationSource).toContain("revoke all on schema billing from authenticated");
    expect(migrationSource).toContain("grant usage on schema billing to service_role");

    for (const table of ["billing.provider_subscriptions", "billing.provider_events"]) {
      expect(migrationSource).toContain(`revoke all on table ${table} from anon`);
      expect(migrationSource).toContain(`revoke all on table ${table} from authenticated`);
      expect(migrationSource).toContain(`grant all privileges on table ${table} to service_role`);
      expect(migrationSource).toContain(`alter table ${table} enable row level security`);
      expect(migrationSource).toContain(`alter table ${table} force row level security`);
    }

    expect(migrationSource).not.toMatch(/create policy/i);
  });

  it("stores only sanitized provider references and hashes, not raw payloads or PII-shaped columns", () => {
    expect(migrationSource).toContain("payload_hash text");
    expect(migrationSource).toContain("provider_events_payload_hash_check");
    expect(migrationSource).not.toMatch(/\bjsonb?\b/i);
    expect(migrationSource).not.toMatch(/\b(email|user_email|customer_email|receipt|raw_payload|payload_json|signed_payload|signed_transaction|purchase_token|session_token|stripe_session_id)\b/i);
  });

  it("does not alter the current app-facing entitlement or Stripe webhook behavior", () => {
    expect(migrationSource).not.toMatch(/alter table public\.entitlements/i);
    expect(migrationSource).not.toMatch(/create table if not exists public\.entitlements/i);
    expect(migrationSource).not.toMatch(/public\.stripe_webhook_events/i);
    expect(migrationSource).not.toMatch(/stripe-webhook|stripe_checkout|stripe-checkout/i);
  });
});
