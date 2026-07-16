-- Provider-neutral billing schema foundation.
--
-- This migration adds private provider subscription and provider event ledgers
-- for future Stripe/Apple/Google reconciliation. It intentionally does not
-- change public.entitlements, Stripe webhook behavior, or app-facing access
-- decisions.

create extension if not exists pgcrypto;

create schema if not exists billing;

comment on schema billing is
  'Private provider billing records and replay ledgers. Browser/native clients read public.entitlements instead.';

revoke all on schema billing from public;
revoke all on schema billing from anon;
revoke all on schema billing from authenticated;
grant usage on schema billing to service_role;

create table if not exists billing.provider_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  provider text not null,
  environment text not null,
  product_tier text not null,
  provider_product_ref text not null,
  provider_customer_ref text,
  provider_subscription_ref text,
  provider_original_transaction_ref text,
  provider_transaction_ref text,
  app_account_token uuid references public.profiles(id) on delete set null,
  status text not null,
  auto_renews boolean,
  cancel_at_period_end boolean,
  started_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  grace_period_ends_at timestamptz,
  billing_retry_started_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  refunded_at timestamptz,
  paused_at timestamptz,
  last_verified_at timestamptz,
  last_event_at timestamptz,
  last_provider_event_ref text,
  reconciliation_status text not null default 'needs_verification',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table billing.provider_subscriptions is
  'Service-role-only normalized provider subscription state. Provider identifiers stay out of public.entitlements.';
comment on column billing.provider_subscriptions.app_account_token is
  'Supabase account UUID supplied to StoreKit as appAccountToken when available; cleared on profile deletion.';
comment on column billing.provider_subscriptions.reconciliation_status is
  'Service-side reconciliation state. App-facing access remains in public.entitlements.';

create table if not exists billing.provider_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  environment text not null,
  provider_event_ref text not null,
  event_type text not null,
  event_subtype text,
  occurred_at timestamptz,
  effective_at timestamptz,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_status text not null default 'queued',
  attempt_count integer not null default 0,
  last_attempted_at timestamptz,
  last_error_code text,
  reconciliation_required boolean not null default false,
  related_user_id uuid references public.profiles(id) on delete set null,
  provider_subscription_id uuid references billing.provider_subscriptions(id) on delete set null,
  provider_customer_ref text,
  provider_subscription_ref text,
  provider_original_transaction_ref text,
  provider_transaction_ref text,
  payload_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table billing.provider_events is
  'Service-role-only provider event replay ledger. Stores sanitized references and hashes, never raw provider payloads.';
comment on column billing.provider_events.occurred_at is
  'Provider-signed occurrence timestamp when available.';
comment on column billing.provider_events.effective_at is
  'Normalized timestamp that should order provider state changes when provider semantics differ from received time.';
comment on column billing.provider_events.payload_hash is
  'Hash of a raw provider payload or JWS for support dedupe without storing the sensitive payload itself.';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'provider_subscriptions_provider_check'
      and conrelid = 'billing.provider_subscriptions'::regclass
  ) then
    alter table billing.provider_subscriptions
      add constraint provider_subscriptions_provider_check
      check (provider in ('stripe', 'apple', 'google_play'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'provider_subscriptions_environment_check'
      and conrelid = 'billing.provider_subscriptions'::regclass
  ) then
    alter table billing.provider_subscriptions
      add constraint provider_subscriptions_environment_check
      check (environment in ('test', 'live', 'sandbox', 'production'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'provider_subscriptions_provider_environment_check'
      and conrelid = 'billing.provider_subscriptions'::regclass
  ) then
    alter table billing.provider_subscriptions
      add constraint provider_subscriptions_provider_environment_check
      check (
        (provider = 'stripe' and environment in ('test', 'live'))
        or (provider = 'apple' and environment in ('sandbox', 'production'))
        or (provider = 'google_play' and environment in ('test', 'production'))
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'provider_subscriptions_product_tier_check'
      and conrelid = 'billing.provider_subscriptions'::regclass
  ) then
    alter table billing.provider_subscriptions
      add constraint provider_subscriptions_product_tier_check
      check (product_tier = 'pro');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'provider_subscriptions_status_check'
      and conrelid = 'billing.provider_subscriptions'::regclass
  ) then
    alter table billing.provider_subscriptions
      add constraint provider_subscriptions_status_check
      check (
        status in (
          'active',
          'cancelled_active_until_period_end',
          'grace_period',
          'billing_retry',
          'pending',
          'expired',
          'revoked',
          'refunded',
          'paused',
          'unknown_needs_reconciliation'
        )
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'provider_subscriptions_reconciliation_status_check'
      and conrelid = 'billing.provider_subscriptions'::regclass
  ) then
    alter table billing.provider_subscriptions
      add constraint provider_subscriptions_reconciliation_status_check
      check (
        reconciliation_status in (
          'current',
          'needs_verification',
          'verification_failed',
          'event_pending',
          'manual_review',
          'superseded'
        )
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'provider_subscriptions_identity_check'
      and conrelid = 'billing.provider_subscriptions'::regclass
  ) then
    alter table billing.provider_subscriptions
      add constraint provider_subscriptions_identity_check
      check (
        provider_subscription_ref is not null
        or provider_original_transaction_ref is not null
        or provider_transaction_ref is not null
        or provider_customer_ref is not null
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'provider_subscriptions_app_account_token_user_check'
      and conrelid = 'billing.provider_subscriptions'::regclass
  ) then
    alter table billing.provider_subscriptions
      add constraint provider_subscriptions_app_account_token_user_check
      check (app_account_token is null or user_id is null or app_account_token = user_id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'provider_subscriptions_text_refs_check'
      and conrelid = 'billing.provider_subscriptions'::regclass
  ) then
    alter table billing.provider_subscriptions
      add constraint provider_subscriptions_text_refs_check
      check (
        btrim(provider_product_ref) <> ''
        and (provider_customer_ref is null or btrim(provider_customer_ref) <> '')
        and (provider_subscription_ref is null or btrim(provider_subscription_ref) <> '')
        and (provider_original_transaction_ref is null or btrim(provider_original_transaction_ref) <> '')
        and (provider_transaction_ref is null or btrim(provider_transaction_ref) <> '')
        and (last_provider_event_ref is null or btrim(last_provider_event_ref) <> '')
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'provider_subscriptions_period_order_check'
      and conrelid = 'billing.provider_subscriptions'::regclass
  ) then
    alter table billing.provider_subscriptions
      add constraint provider_subscriptions_period_order_check
      check (
        current_period_start is null
        or current_period_end is null
        or current_period_start <= current_period_end
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'provider_subscriptions_status_timestamp_check'
      and conrelid = 'billing.provider_subscriptions'::regclass
  ) then
    alter table billing.provider_subscriptions
      add constraint provider_subscriptions_status_timestamp_check
      check (
        (status <> 'cancelled_active_until_period_end' or current_period_end is not null)
        and (status <> 'grace_period' or grace_period_ends_at is not null)
        and (status <> 'billing_retry' or billing_retry_started_at is not null)
        and (status <> 'expired' or coalesce(expires_at, current_period_end) is not null)
        and (status <> 'revoked' or revoked_at is not null)
        and (status <> 'refunded' or refunded_at is not null)
        and (status <> 'paused' or paused_at is not null)
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'provider_events_provider_check'
      and conrelid = 'billing.provider_events'::regclass
  ) then
    alter table billing.provider_events
      add constraint provider_events_provider_check
      check (provider in ('stripe', 'apple', 'google_play'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'provider_events_environment_check'
      and conrelid = 'billing.provider_events'::regclass
  ) then
    alter table billing.provider_events
      add constraint provider_events_environment_check
      check (environment in ('test', 'live', 'sandbox', 'production'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'provider_events_provider_environment_check'
      and conrelid = 'billing.provider_events'::regclass
  ) then
    alter table billing.provider_events
      add constraint provider_events_provider_environment_check
      check (
        (provider = 'stripe' and environment in ('test', 'live'))
        or (provider = 'apple' and environment in ('sandbox', 'production'))
        or (provider = 'google_play' and environment in ('test', 'production'))
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'provider_events_processing_status_check'
      and conrelid = 'billing.provider_events'::regclass
  ) then
    alter table billing.provider_events
      add constraint provider_events_processing_status_check
      check (
        processing_status in (
          'queued',
          'processing',
          'processed',
          'ignored',
          'error',
          'retry_pending',
          'manual_review',
          'reconciliation_required',
          'dead_letter'
        )
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'provider_events_attempt_count_check'
      and conrelid = 'billing.provider_events'::regclass
  ) then
    alter table billing.provider_events
      add constraint provider_events_attempt_count_check
      check (attempt_count between 0 and 100);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'provider_events_processing_time_check'
      and conrelid = 'billing.provider_events'::regclass
  ) then
    alter table billing.provider_events
      add constraint provider_events_processing_time_check
      check (
        processed_at is null
        or processed_at >= received_at
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'provider_events_text_refs_check'
      and conrelid = 'billing.provider_events'::regclass
  ) then
    alter table billing.provider_events
      add constraint provider_events_text_refs_check
      check (
        btrim(provider_event_ref) <> ''
        and btrim(event_type) <> ''
        and (event_subtype is null or btrim(event_subtype) <> '')
        and (last_error_code is null or btrim(last_error_code) <> '')
        and (provider_customer_ref is null or btrim(provider_customer_ref) <> '')
        and (provider_subscription_ref is null or btrim(provider_subscription_ref) <> '')
        and (provider_original_transaction_ref is null or btrim(provider_original_transaction_ref) <> '')
        and (provider_transaction_ref is null or btrim(provider_transaction_ref) <> '')
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'provider_events_payload_hash_check'
      and conrelid = 'billing.provider_events'::regclass
  ) then
    alter table billing.provider_events
      add constraint provider_events_payload_hash_check
      check (payload_hash is null or (length(payload_hash) between 32 and 256 and payload_hash !~ '[[:space:]]'));
  end if;
end $$;

create unique index if not exists provider_subscriptions_subscription_ref_uidx
  on billing.provider_subscriptions(provider, environment, provider_subscription_ref)
  where provider_subscription_ref is not null;

create unique index if not exists provider_subscriptions_original_transaction_ref_uidx
  on billing.provider_subscriptions(provider, environment, provider_original_transaction_ref)
  where provider_original_transaction_ref is not null;

create unique index if not exists provider_subscriptions_transaction_ref_uidx
  on billing.provider_subscriptions(provider, environment, provider_transaction_ref)
  where provider_transaction_ref is not null;

create index if not exists provider_subscriptions_user_id_idx
  on billing.provider_subscriptions(user_id);

create index if not exists provider_subscriptions_customer_ref_idx
  on billing.provider_subscriptions(provider, environment, provider_customer_ref)
  where provider_customer_ref is not null;

create index if not exists provider_subscriptions_status_period_idx
  on billing.provider_subscriptions(status, current_period_end);

create index if not exists provider_subscriptions_reconciliation_status_idx
  on billing.provider_subscriptions(reconciliation_status);

create unique index if not exists provider_events_event_ref_uidx
  on billing.provider_events(provider, environment, provider_event_ref);

create index if not exists provider_events_original_transaction_ref_idx
  on billing.provider_events(provider, environment, provider_original_transaction_ref)
  where provider_original_transaction_ref is not null;

create index if not exists provider_events_related_user_id_idx
  on billing.provider_events(related_user_id);

create index if not exists provider_events_processing_status_received_at_idx
  on billing.provider_events(processing_status, received_at);

create index if not exists provider_events_subscription_id_idx
  on billing.provider_events(provider_subscription_id);

create index if not exists provider_events_reconciliation_required_idx
  on billing.provider_events(provider, environment, reconciliation_required)
  where reconciliation_required is true;

revoke all on table billing.provider_subscriptions from public;
revoke all on table billing.provider_subscriptions from anon;
revoke all on table billing.provider_subscriptions from authenticated;
revoke all on table billing.provider_events from public;
revoke all on table billing.provider_events from anon;
revoke all on table billing.provider_events from authenticated;

grant all privileges on table billing.provider_subscriptions to service_role;
grant all privileges on table billing.provider_events to service_role;

alter table billing.provider_subscriptions enable row level security;
alter table billing.provider_subscriptions force row level security;
alter table billing.provider_events enable row level security;
alter table billing.provider_events force row level security;

-- No anon/authenticated policies are created. Trusted Supabase Edge Functions
-- and reviewed operational jobs own provider billing writes with service-role
-- credentials, then publish only effective access through public.entitlements.
