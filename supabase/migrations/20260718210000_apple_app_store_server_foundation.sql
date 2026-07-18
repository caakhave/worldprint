-- Apple App Store Server API and Notifications V2 foundation.
--
-- This migration adds the private service-role write paths needed by staging
-- Apple purchase verification and App Store Server Notifications V2. It keeps
-- Apple provider state inside the existing provider-neutral billing model,
-- stores raw Apple original transaction identifiers only in a private
-- service-only table for future reconciliation, and never exposes provider
-- identifiers through public entitlement rows.

create table if not exists billing.apple_transaction_chains (
  id uuid primary key default gen_random_uuid(),
  provider_environment text not null,
  user_id uuid references public.profiles(id) on delete set null,
  user_ref_fingerprint text not null,
  provider_subscription_id uuid references billing.provider_subscriptions(id) on delete set null,
  bundle_id text not null,
  app_apple_id text not null,
  product_id text not null,
  provider_product_ref text not null,
  original_transaction_id_fingerprint text not null,
  original_transaction_id text not null,
  latest_transaction_id_fingerprint text,
  app_account_token uuid,
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table billing.apple_transaction_chains is
  'Service-role-only Apple original-transaction ownership bindings. Raw original transaction ids are retained only for trusted server reconciliation.';
comment on column billing.apple_transaction_chains.user_ref_fingerprint is
  'Private stable fingerprint of the first Can You Geo user UUID bound to this Apple original transaction chain. Retained to prevent silent reclaim after account deletion.';
comment on column billing.apple_transaction_chains.original_transaction_id is
  'Raw Apple originalTransactionId retained only in private service-only storage for App Store Server API reconciliation.';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'apple_transaction_chains_environment_check'
      and conrelid = 'billing.apple_transaction_chains'::regclass
  ) then
    alter table billing.apple_transaction_chains
      add constraint apple_transaction_chains_environment_check
      check (provider_environment in ('sandbox', 'production'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'apple_transaction_chains_bundle_check'
      and conrelid = 'billing.apple_transaction_chains'::regclass
  ) then
    alter table billing.apple_transaction_chains
      add constraint apple_transaction_chains_bundle_check
      check (bundle_id = 'com.canyougeo.app' and app_apple_id = '6791248782');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'apple_transaction_chains_product_check'
      and conrelid = 'billing.apple_transaction_chains'::regclass
  ) then
    alter table billing.apple_transaction_chains
      add constraint apple_transaction_chains_product_check
      check (
        product_id in ('com.canyougeo.pro.monthly', 'com.canyougeo.pro.annual')
        and provider_product_ref in (
          'com.canyougeo.app:com.canyougeo.pro.monthly',
          'com.canyougeo.app:com.canyougeo.pro.annual'
        )
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'apple_transaction_chains_fingerprint_check'
      and conrelid = 'billing.apple_transaction_chains'::regclass
  ) then
    alter table billing.apple_transaction_chains
      add constraint apple_transaction_chains_fingerprint_check
      check (
        user_ref_fingerprint ~ '^user_uuid_sha256_[a-f0-9]{64}$'
        and original_transaction_id_fingerprint ~ '^apple_original_transaction_sha256_[a-f0-9]{64}$'
        and (
          latest_transaction_id_fingerprint is null
          or latest_transaction_id_fingerprint ~ '^apple_transaction_sha256_[a-f0-9]{64}$'
        )
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'apple_transaction_chains_raw_original_check'
      and conrelid = 'billing.apple_transaction_chains'::regclass
  ) then
    alter table billing.apple_transaction_chains
      add constraint apple_transaction_chains_raw_original_check
      check (
        length(original_transaction_id) between 1 and 256
        and original_transaction_id !~ '[[:space:]]'
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'apple_transaction_chains_app_account_token_user_check'
      and conrelid = 'billing.apple_transaction_chains'::regclass
  ) then
    alter table billing.apple_transaction_chains
      add constraint apple_transaction_chains_app_account_token_user_check
      check (app_account_token is null or user_id is null or app_account_token = user_id);
  end if;
end $$;

create unique index if not exists apple_transaction_chains_original_transaction_uidx
  on billing.apple_transaction_chains(provider_environment, original_transaction_id_fingerprint);

create index if not exists apple_transaction_chains_user_id_idx
  on billing.apple_transaction_chains(user_id);

create index if not exists apple_transaction_chains_subscription_id_idx
  on billing.apple_transaction_chains(provider_subscription_id);

create index if not exists apple_transaction_chains_user_ref_fingerprint_idx
  on billing.apple_transaction_chains(user_ref_fingerprint);

revoke all on table billing.apple_transaction_chains from public;
revoke all on table billing.apple_transaction_chains from anon;
revoke all on table billing.apple_transaction_chains from authenticated;
grant all privileges on table billing.apple_transaction_chains to service_role;

alter table billing.apple_transaction_chains enable row level security;
alter table billing.apple_transaction_chains force row level security;

create or replace function billing.process_apple_purchase_verification(
  p_provider_environment text,
  p_user_id uuid,
  p_user_ref_fingerprint text,
  p_provider_event_ref text,
  p_event_type text,
  p_event_subtype text,
  p_event_time timestamptz,
  p_payload_hash text,
  p_bundle_id text,
  p_app_apple_id text,
  p_product_id text,
  p_provider_product_ref text,
  p_original_transaction_id_fingerprint text,
  p_original_transaction_id text,
  p_transaction_id_fingerprint text,
  p_app_account_token uuid,
  p_provider_status text,
  p_auto_renews boolean,
  p_start_time timestamptz,
  p_current_period_end timestamptz,
  p_grace_period_ends_at timestamptz,
  p_billing_retry_started_at timestamptz,
  p_expires_at timestamptz,
  p_revoked_at timestamptz,
  p_refunded_at timestamptz,
  p_test_purchase boolean default true,
  p_as_of timestamptz default now()
)
returns table (
  result text,
  provider_environment text,
  event_type text,
  event_subtype text,
  processed boolean,
  already_processed boolean,
  provider_subscription_changed boolean,
  compatibility_refreshed boolean,
  reconciliation_required boolean,
  retryable boolean
)
language plpgsql
volatile
security invoker
set search_path = pg_catalog, billing, public
as $$
declare
  v_environment text := lower(btrim(coalesce(p_provider_environment, '')));
  v_user_id uuid := p_user_id;
  v_user_ref text := nullif(btrim(coalesce(p_user_ref_fingerprint, '')), '');
  v_event_ref text := nullif(btrim(coalesce(p_provider_event_ref, '')), '');
  v_event_type text := lower(btrim(coalesce(p_event_type, 'purchase_verification')));
  v_event_subtype text := nullif(lower(btrim(coalesce(p_event_subtype, ''))), '');
  v_event_time timestamptz := coalesce(p_event_time, p_as_of, now());
  v_payload_hash text := nullif(btrim(coalesce(p_payload_hash, '')), '');
  v_bundle_id text := nullif(btrim(coalesce(p_bundle_id, '')), '');
  v_app_apple_id text := nullif(btrim(coalesce(p_app_apple_id, '')), '');
  v_product_id text := nullif(btrim(coalesce(p_product_id, '')), '');
  v_product_ref text := nullif(btrim(coalesce(p_provider_product_ref, '')), '');
  v_original_ref text := nullif(btrim(coalesce(p_original_transaction_id_fingerprint, '')), '');
  v_original_id text := nullif(btrim(coalesce(p_original_transaction_id, '')), '');
  v_transaction_ref text := nullif(btrim(coalesce(p_transaction_id_fingerprint, '')), '');
  v_status text := nullif(lower(btrim(coalesce(p_provider_status, ''))), '');
  v_as_of timestamptz := coalesce(p_as_of, now());
  v_event record;
  v_event_found boolean := false;
  v_chain record;
  v_chain_found boolean := false;
  v_existing record;
  v_existing_found boolean := false;
  v_cross_environment_conflict boolean := false;
  v_provider_subscription_id uuid;
  v_summary record;
  v_summary_refresh_started boolean := false;
  v_result text := 'failed';
begin
  if v_environment not in ('sandbox', 'production')
    or v_user_id is null
    or v_user_ref !~ '^user_uuid_sha256_[a-f0-9]{64}$'
    or v_event_ref is null
    or v_payload_hash is null
    or length(v_payload_hash) < 32
    or v_payload_hash ~ '[[:space:]]'
    or v_bundle_id <> 'com.canyougeo.app'
    or v_app_apple_id <> '6791248782'
    or v_product_id not in ('com.canyougeo.pro.monthly', 'com.canyougeo.pro.annual')
    or v_product_ref not in (
      'com.canyougeo.app:com.canyougeo.pro.monthly',
      'com.canyougeo.app:com.canyougeo.pro.annual'
    )
    or v_original_ref !~ '^apple_original_transaction_sha256_[a-f0-9]{64}$'
    or v_original_id is null
    or length(v_original_id) > 256
    or v_original_id ~ '[[:space:]]'
    or v_transaction_ref !~ '^apple_transaction_sha256_[a-f0-9]{64}$'
    or p_app_account_token is distinct from v_user_id
    or v_status not in (
      'active',
      'cancelled_active_until_period_end',
      'grace_period',
      'billing_retry',
      'expired',
      'refunded',
      'revoked',
      'unknown_needs_reconciliation'
    )
  then
    return query
    select 'invalid_apple_purchase_verification'::text, v_environment, v_event_type, v_event_subtype, false, false, false, false, true, false;
    return;
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('billing.process_apple_purchase_verification:apple:' || v_environment || ':' || v_event_ref, 0)
  );

  select *
  into v_event
  from billing.provider_events pe
  where pe.provider = 'apple'
    and pe.environment = v_environment
    and pe.provider_event_ref = v_event_ref
  for update;
  v_event_found := found;

  if v_event_found then
    if v_event.payload_hash is distinct from v_payload_hash then
      update billing.provider_events
      set processing_status = 'manual_review',
          last_error_code = 'payload_conflict',
          reconciliation_required = true,
          last_attempted_at = v_as_of,
          attempt_count = least(attempt_count + 1, 100),
          updated_at = v_as_of
      where id = v_event.id;

      return query
      select 'payload_conflict'::text, v_environment, v_event_type, v_event_subtype, false, false, false, false, true, false;
      return;
    end if;

    if v_event.processing_status in ('processed', 'reconciliation_required') and v_event.processed_at is not null then
      return query
      select 'already_processed'::text, v_environment, v_event_type, v_event_subtype, false, true, false, false, coalesce(v_event.reconciliation_required, false), false;
      return;
    end if;

    update billing.provider_events
    set event_type = v_event_type,
        event_subtype = v_event_subtype,
        occurred_at = v_event_time,
        effective_at = v_event_time,
        processing_status = 'processing',
        attempt_count = least(attempt_count + 1, 100),
        last_attempted_at = v_as_of,
        related_user_id = v_user_id,
        provider_subscription_ref = v_original_ref,
        provider_original_transaction_ref = v_original_ref,
        provider_transaction_ref = v_transaction_ref,
        last_error_code = null,
        updated_at = v_as_of
    where id = v_event.id
    returning *
    into v_event;
  else
    insert into billing.provider_events (
      provider,
      environment,
      provider_event_ref,
      event_type,
      event_subtype,
      occurred_at,
      effective_at,
      received_at,
      processing_status,
      attempt_count,
      last_attempted_at,
      reconciliation_required,
      related_user_id,
      provider_subscription_ref,
      provider_original_transaction_ref,
      provider_transaction_ref,
      payload_hash,
      created_at,
      updated_at
    )
    values (
      'apple',
      v_environment,
      v_event_ref,
      v_event_type,
      v_event_subtype,
      v_event_time,
      v_event_time,
      v_as_of,
      'processing',
      1,
      v_as_of,
      false,
      v_user_id,
      v_original_ref,
      v_original_ref,
      v_transaction_ref,
      v_payload_hash,
      v_as_of,
      v_as_of
    )
    returning *
    into v_event;
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('billing.process_apple_purchase_verification:original:' || v_environment || ':' || v_original_ref, 0)
  );

  select exists (
    select 1
    from billing.apple_transaction_chains ac
    where ac.original_transaction_id_fingerprint = v_original_ref
      and ac.provider_environment <> v_environment
  )
  into v_cross_environment_conflict;

  if v_cross_environment_conflict then
    update billing.provider_events
    set processing_status = 'reconciliation_required',
        processed_at = v_as_of,
        last_error_code = 'environment_conflict',
        reconciliation_required = true,
        updated_at = v_as_of
    where id = v_event.id;

    return query
    select 'environment_conflict'::text, v_environment, v_event_type, v_event_subtype, false, false, false, false, true, false;
    return;
  end if;

  select *
  into v_chain
  from billing.apple_transaction_chains ac
  where ac.provider_environment = v_environment
    and ac.original_transaction_id_fingerprint = v_original_ref
  for update;
  v_chain_found := found;

  if v_chain_found and v_chain.user_id is not null and v_chain.user_id is distinct from v_user_id then
    update billing.provider_events
    set processing_status = 'reconciliation_required',
        processed_at = v_as_of,
        provider_subscription_id = v_chain.provider_subscription_id,
        last_error_code = 'ownership_conflict',
        reconciliation_required = true,
        updated_at = v_as_of
    where id = v_event.id;

    return query
    select 'ownership_conflict'::text, v_environment, v_event_type, v_event_subtype, false, false, false, false, true, false;
    return;
  end if;

  if v_chain_found and v_chain.user_id is null and v_chain.user_ref_fingerprint is distinct from v_user_ref then
    update billing.provider_events
    set processing_status = 'reconciliation_required',
        processed_at = v_as_of,
        provider_subscription_id = v_chain.provider_subscription_id,
        last_error_code = 'deleted_account_original_transaction_conflict',
        reconciliation_required = true,
        updated_at = v_as_of
    where id = v_event.id;

    return query
    select 'deleted_account_original_transaction_conflict'::text, v_environment, v_event_type, v_event_subtype, false, false, false, false, true, false;
    return;
  end if;

  select *
  into v_existing
  from billing.provider_subscriptions ps
  where ps.provider = 'apple'
    and ps.environment = v_environment
    and ps.provider_original_transaction_ref = v_original_ref
    and ps.reconciliation_status <> 'superseded'
  for update;
  v_existing_found := found;

  if v_existing_found and v_existing.user_id is not null and v_existing.user_id is distinct from v_user_id then
    update billing.provider_events
    set processing_status = 'reconciliation_required',
        processed_at = v_as_of,
        provider_subscription_id = v_existing.id,
        last_error_code = 'ownership_conflict',
        reconciliation_required = true,
        updated_at = v_as_of
    where id = v_event.id;

    return query
    select 'ownership_conflict'::text, v_environment, v_event_type, v_event_subtype, false, false, false, false, true, false;
    return;
  end if;

  begin
    if v_existing_found then
      update billing.provider_subscriptions
      set user_id = v_user_id,
          app_account_token = v_user_id,
          provider_product_ref = v_product_ref,
          provider_subscription_ref = v_original_ref,
          provider_original_transaction_ref = v_original_ref,
          provider_transaction_ref = v_transaction_ref,
          product_tier = 'pro',
          status = v_status,
          auto_renews = p_auto_renews,
          cancel_at_period_end = v_status = 'cancelled_active_until_period_end',
          started_at = p_start_time,
          current_period_start = null,
          current_period_end = p_current_period_end,
          grace_period_ends_at = p_grace_period_ends_at,
          billing_retry_started_at = p_billing_retry_started_at,
          expires_at = p_expires_at,
          revoked_at = p_revoked_at,
          refunded_at = p_refunded_at,
          paused_at = null,
          last_verified_at = v_as_of,
          last_event_at = v_event_time,
          last_provider_event_ref = v_event_ref,
          reconciliation_status = case
            when v_status = 'unknown_needs_reconciliation' then 'manual_review'
            when v_status = 'billing_retry' then 'needs_verification'
            else 'current'
          end,
          updated_at = v_as_of
      where id = v_existing.id
      returning id
      into v_provider_subscription_id;
    else
      insert into billing.provider_subscriptions (
        user_id,
        provider,
        environment,
        product_tier,
        provider_product_ref,
        provider_subscription_ref,
        provider_original_transaction_ref,
        provider_transaction_ref,
        app_account_token,
        status,
        auto_renews,
        cancel_at_period_end,
        started_at,
        current_period_start,
        current_period_end,
        grace_period_ends_at,
        billing_retry_started_at,
        expires_at,
        revoked_at,
        refunded_at,
        last_verified_at,
        last_event_at,
        last_provider_event_ref,
        reconciliation_status,
        created_at,
        updated_at
      )
      values (
        v_user_id,
        'apple',
        v_environment,
        'pro',
        v_product_ref,
        v_original_ref,
        v_original_ref,
        v_transaction_ref,
        v_user_id,
        v_status,
        p_auto_renews,
        v_status = 'cancelled_active_until_period_end',
        p_start_time,
        null,
        p_current_period_end,
        p_grace_period_ends_at,
        p_billing_retry_started_at,
        p_expires_at,
        p_revoked_at,
        p_refunded_at,
        v_as_of,
        v_event_time,
        v_event_ref,
        case
          when v_status = 'unknown_needs_reconciliation' then 'manual_review'
          when v_status = 'billing_retry' then 'needs_verification'
          else 'current'
        end,
        v_as_of,
        v_as_of
      )
      returning id
      into v_provider_subscription_id;
    end if;

    insert into billing.apple_transaction_chains (
      provider_environment,
      user_id,
      user_ref_fingerprint,
      provider_subscription_id,
      bundle_id,
      app_apple_id,
      product_id,
      provider_product_ref,
      original_transaction_id_fingerprint,
      original_transaction_id,
      latest_transaction_id_fingerprint,
      app_account_token,
      last_verified_at,
      created_at,
      updated_at
    )
    values (
      v_environment,
      v_user_id,
      v_user_ref,
      v_provider_subscription_id,
      v_bundle_id,
      v_app_apple_id,
      v_product_id,
      v_product_ref,
      v_original_ref,
      v_original_id,
      v_transaction_ref,
      v_user_id,
      v_as_of,
      v_as_of,
      v_as_of
    )
    on conflict (provider_environment, original_transaction_id_fingerprint) do update
      set user_id = excluded.user_id,
          provider_subscription_id = excluded.provider_subscription_id,
          bundle_id = excluded.bundle_id,
          app_apple_id = excluded.app_apple_id,
          product_id = excluded.product_id,
          provider_product_ref = excluded.provider_product_ref,
          original_transaction_id = excluded.original_transaction_id,
          latest_transaction_id_fingerprint = excluded.latest_transaction_id_fingerprint,
          app_account_token = excluded.app_account_token,
          last_verified_at = excluded.last_verified_at,
          updated_at = excluded.updated_at;

    v_summary_refresh_started := true;

    select *
    into strict v_summary
    from billing.refresh_effective_entitlement_summary(v_user_id, v_environment, v_as_of);

    if coalesce(v_summary.applied, false) is not true then
      raise exception 'billing_summary_refresh_failed';
    end if;

    update billing.provider_events
    set processing_status = case when v_status = 'unknown_needs_reconciliation' then 'reconciliation_required' else 'processed' end,
        processed_at = v_as_of,
        provider_subscription_id = v_provider_subscription_id,
        provider_subscription_ref = v_original_ref,
        provider_original_transaction_ref = v_original_ref,
        provider_transaction_ref = v_transaction_ref,
        related_user_id = v_user_id,
        last_error_code = case when v_status = 'unknown_needs_reconciliation' then 'requires_reconciliation' else null end,
        reconciliation_required = v_status = 'unknown_needs_reconciliation',
        updated_at = v_as_of
    where id = v_event.id;
  exception
    when others then
      v_result := case when v_summary_refresh_started then 'summary_refresh_failed' else 'failed' end;

      update billing.provider_events
      set processing_status = 'retry_pending',
          last_error_code = v_result,
          reconciliation_required = true,
          updated_at = v_as_of
      where id = v_event.id;

      return query
      select v_result, v_environment, v_event_type, v_event_subtype, false, false, false, false, true, true;
      return;
  end;

  return query
  select
    case when v_status = 'unknown_needs_reconciliation' then 'requires_reconciliation' else 'processed' end,
    v_environment,
    v_event_type,
    v_event_subtype,
    v_status <> 'unknown_needs_reconciliation',
    false,
    true,
    true,
    v_status = 'unknown_needs_reconciliation',
    false;
end;
$$;

comment on function billing.process_apple_purchase_verification(text, uuid, text, text, text, text, timestamptz, text, text, text, text, text, text, text, text, uuid, text, boolean, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, boolean, timestamptz) is
  'Service-role-only processor for authenticated Apple purchase verification. Binds a verified originalTransactionId chain to one Can You Geo user, stores raw Apple original ids only in a private table, and refreshes provider-neutral entitlements.';

revoke all on function billing.process_apple_purchase_verification(text, uuid, text, text, text, text, timestamptz, text, text, text, text, text, text, text, text, uuid, text, boolean, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, boolean, timestamptz) from public;
revoke all on function billing.process_apple_purchase_verification(text, uuid, text, text, text, text, timestamptz, text, text, text, text, text, text, text, text, uuid, text, boolean, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, boolean, timestamptz) from anon;
revoke all on function billing.process_apple_purchase_verification(text, uuid, text, text, text, text, timestamptz, text, text, text, text, text, text, text, text, uuid, text, boolean, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, boolean, timestamptz) from authenticated;
grant execute on function billing.process_apple_purchase_verification(text, uuid, text, text, text, text, timestamptz, text, text, text, text, text, text, text, text, uuid, text, boolean, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, boolean, timestamptz) to service_role;

create or replace function public.process_apple_purchase_verification(
  p_provider_environment text,
  p_user_id uuid,
  p_user_ref_fingerprint text,
  p_provider_event_ref text,
  p_event_type text,
  p_event_subtype text,
  p_event_time timestamptz,
  p_payload_hash text,
  p_bundle_id text,
  p_app_apple_id text,
  p_product_id text,
  p_provider_product_ref text,
  p_original_transaction_id_fingerprint text,
  p_original_transaction_id text,
  p_transaction_id_fingerprint text,
  p_app_account_token uuid,
  p_provider_status text,
  p_auto_renews boolean,
  p_start_time timestamptz,
  p_current_period_end timestamptz,
  p_grace_period_ends_at timestamptz,
  p_billing_retry_started_at timestamptz,
  p_expires_at timestamptz,
  p_revoked_at timestamptz,
  p_refunded_at timestamptz,
  p_test_purchase boolean default true,
  p_as_of timestamptz default now()
)
returns table (
  result text,
  provider_environment text,
  event_type text,
  event_subtype text,
  processed boolean,
  already_processed boolean,
  provider_subscription_changed boolean,
  compatibility_refreshed boolean,
  reconciliation_required boolean,
  retryable boolean
)
language sql
volatile
security invoker
set search_path = pg_catalog, public
as $$
  select *
  from billing.process_apple_purchase_verification(
    p_provider_environment,
    p_user_id,
    p_user_ref_fingerprint,
    p_provider_event_ref,
    p_event_type,
    p_event_subtype,
    p_event_time,
    p_payload_hash,
    p_bundle_id,
    p_app_apple_id,
    p_product_id,
    p_provider_product_ref,
    p_original_transaction_id_fingerprint,
    p_original_transaction_id,
    p_transaction_id_fingerprint,
    p_app_account_token,
    p_provider_status,
    p_auto_renews,
    p_start_time,
    p_current_period_end,
    p_grace_period_ends_at,
    p_billing_retry_started_at,
    p_expires_at,
    p_revoked_at,
    p_refunded_at,
    p_test_purchase,
    p_as_of
  );
$$;

comment on function public.process_apple_purchase_verification(text, uuid, text, text, text, text, timestamptz, text, text, text, text, text, text, text, text, uuid, text, boolean, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, boolean, timestamptz) is
  'Service-role-only public RPC bridge for authenticated Apple purchase verification. Returns sanitized processing metadata only.';

revoke all on function public.process_apple_purchase_verification(text, uuid, text, text, text, text, timestamptz, text, text, text, text, text, text, text, text, uuid, text, boolean, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, boolean, timestamptz) from public;
revoke all on function public.process_apple_purchase_verification(text, uuid, text, text, text, text, timestamptz, text, text, text, text, text, text, text, text, uuid, text, boolean, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, boolean, timestamptz) from anon;
revoke all on function public.process_apple_purchase_verification(text, uuid, text, text, text, text, timestamptz, text, text, text, text, text, text, text, text, uuid, text, boolean, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, boolean, timestamptz) from authenticated;
grant execute on function public.process_apple_purchase_verification(text, uuid, text, text, text, text, timestamptz, text, text, text, text, text, text, text, text, uuid, text, boolean, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, boolean, timestamptz) to service_role;

create or replace function billing.process_apple_server_notification_event(
  p_provider_environment text,
  p_provider_event_ref text,
  p_event_type text,
  p_event_subtype text,
  p_event_time timestamptz,
  p_payload_hash text,
  p_bundle_id text,
  p_app_apple_id text,
  p_product_id text,
  p_provider_product_ref text,
  p_original_transaction_id_fingerprint text,
  p_original_transaction_id text,
  p_transaction_id_fingerprint text,
  p_app_account_token uuid,
  p_provider_status text,
  p_auto_renews boolean,
  p_start_time timestamptz,
  p_current_period_end timestamptz,
  p_grace_period_ends_at timestamptz,
  p_billing_retry_started_at timestamptz,
  p_expires_at timestamptz,
  p_revoked_at timestamptz,
  p_refunded_at timestamptz,
  p_test_purchase boolean default true,
  p_as_of timestamptz default now()
)
returns table (
  result text,
  provider_environment text,
  event_type text,
  event_subtype text,
  processed boolean,
  already_processed boolean,
  provider_subscription_changed boolean,
  compatibility_refreshed boolean,
  reconciliation_required boolean,
  unsupported_ignored boolean,
  retryable boolean
)
language plpgsql
volatile
security invoker
set search_path = pg_catalog, billing, public
as $$
declare
  v_environment text := lower(btrim(coalesce(p_provider_environment, '')));
  v_event_ref text := nullif(btrim(coalesce(p_provider_event_ref, '')), '');
  v_event_type text := upper(btrim(coalesce(p_event_type, '')));
  v_event_subtype text := nullif(upper(btrim(coalesce(p_event_subtype, ''))), '');
  v_event_time timestamptz := coalesce(p_event_time, p_as_of, now());
  v_payload_hash text := nullif(btrim(coalesce(p_payload_hash, '')), '');
  v_bundle_id text := nullif(btrim(coalesce(p_bundle_id, '')), '');
  v_app_apple_id text := nullif(btrim(coalesce(p_app_apple_id, '')), '');
  v_product_id text := nullif(btrim(coalesce(p_product_id, '')), '');
  v_product_ref text := nullif(btrim(coalesce(p_provider_product_ref, '')), '');
  v_original_ref text := nullif(btrim(coalesce(p_original_transaction_id_fingerprint, '')), '');
  v_original_id text := nullif(btrim(coalesce(p_original_transaction_id, '')), '');
  v_transaction_ref text := nullif(btrim(coalesce(p_transaction_id_fingerprint, '')), '');
  v_status text := nullif(lower(btrim(coalesce(p_provider_status, ''))), '');
  v_as_of timestamptz := coalesce(p_as_of, now());
  v_event record;
  v_event_found boolean := false;
  v_chain record;
  v_chain_found boolean := false;
  v_existing record;
  v_provider_subscription_id uuid;
  v_summary record;
  v_summary_refresh_started boolean := false;
  v_result text := 'failed';
begin
  if v_environment not in ('sandbox', 'production')
    or v_event_ref is null
    or v_payload_hash is null
    or length(v_payload_hash) < 32
    or v_payload_hash ~ '[[:space:]]'
  then
    return query
    select 'invalid_notification_event'::text, v_environment, v_event_type, v_event_subtype, false, false, false, false, true, false, false;
    return;
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('billing.process_apple_server_notification_event:apple:' || v_environment || ':' || v_event_ref, 0)
  );

  select *
  into v_event
  from billing.provider_events pe
  where pe.provider = 'apple'
    and pe.environment = v_environment
    and pe.provider_event_ref = v_event_ref
  for update;
  v_event_found := found;

  if v_event_found then
    if v_event.payload_hash is distinct from v_payload_hash then
      update billing.provider_events
      set processing_status = 'manual_review',
          last_error_code = 'payload_conflict',
          reconciliation_required = true,
          last_attempted_at = v_as_of,
          attempt_count = least(attempt_count + 1, 100),
          updated_at = v_as_of
      where id = v_event.id;

      return query
      select 'payload_conflict'::text, v_environment, v_event_type, v_event_subtype, false, false, false, false, true, false, false;
      return;
    end if;

    if v_event.processing_status in ('processed', 'ignored', 'reconciliation_required') and v_event.processed_at is not null then
      return query
      select
        'already_processed'::text,
        v_environment,
        v_event_type,
        v_event_subtype,
        false,
        true,
        false,
        false,
        coalesce(v_event.reconciliation_required, false),
        v_event.processing_status = 'ignored',
        false;
      return;
    end if;

    update billing.provider_events
    set event_type = v_event_type,
        event_subtype = v_event_subtype,
        occurred_at = v_event_time,
        effective_at = v_event_time,
        processing_status = 'processing',
        attempt_count = least(attempt_count + 1, 100),
        last_attempted_at = v_as_of,
        provider_subscription_ref = v_original_ref,
        provider_original_transaction_ref = v_original_ref,
        provider_transaction_ref = v_transaction_ref,
        last_error_code = null,
        updated_at = v_as_of
    where id = v_event.id
    returning *
    into v_event;
  else
    insert into billing.provider_events (
      provider,
      environment,
      provider_event_ref,
      event_type,
      event_subtype,
      occurred_at,
      effective_at,
      received_at,
      processing_status,
      attempt_count,
      last_attempted_at,
      reconciliation_required,
      provider_subscription_ref,
      provider_original_transaction_ref,
      provider_transaction_ref,
      payload_hash,
      created_at,
      updated_at
    )
    values (
      'apple',
      v_environment,
      v_event_ref,
      v_event_type,
      v_event_subtype,
      v_event_time,
      v_event_time,
      v_as_of,
      'processing',
      1,
      v_as_of,
      false,
      v_original_ref,
      v_original_ref,
      v_transaction_ref,
      v_payload_hash,
      v_as_of,
      v_as_of
    )
    returning *
    into v_event;
  end if;

  if v_event_type = 'TEST' then
    update billing.provider_events
    set processing_status = 'processed',
        processed_at = v_as_of,
        last_error_code = null,
        reconciliation_required = false,
        updated_at = v_as_of
    where id = v_event.id;

    return query
    select 'test_processed'::text, v_environment, v_event_type, v_event_subtype, true, false, false, false, false, false, false;
    return;
  end if;

  if v_bundle_id <> 'com.canyougeo.app'
    or v_app_apple_id <> '6791248782'
    or v_product_id not in ('com.canyougeo.pro.monthly', 'com.canyougeo.pro.annual')
    or v_product_ref not in (
      'com.canyougeo.app:com.canyougeo.pro.monthly',
      'com.canyougeo.app:com.canyougeo.pro.annual'
    )
    or v_original_ref !~ '^apple_original_transaction_sha256_[a-f0-9]{64}$'
    or v_original_id is null
    or length(v_original_id) > 256
    or v_original_id ~ '[[:space:]]'
    or v_transaction_ref !~ '^apple_transaction_sha256_[a-f0-9]{64}$'
    or v_status not in (
      'active',
      'cancelled_active_until_period_end',
      'grace_period',
      'billing_retry',
      'expired',
      'refunded',
      'revoked',
      'unknown_needs_reconciliation'
    )
  then
    update billing.provider_events
    set processing_status = 'reconciliation_required',
        processed_at = v_as_of,
        last_error_code = 'invalid_subscription_notification',
        reconciliation_required = true,
        updated_at = v_as_of
    where id = v_event.id;

    return query
    select 'invalid_subscription_notification'::text, v_environment, v_event_type, v_event_subtype, false, false, false, false, true, false, false;
    return;
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('billing.process_apple_server_notification_event:original:' || v_environment || ':' || v_original_ref, 0)
  );

  select *
  into v_chain
  from billing.apple_transaction_chains ac
  where ac.provider_environment = v_environment
    and ac.original_transaction_id_fingerprint = v_original_ref
  for update;
  v_chain_found := found;

  if not v_chain_found or v_chain.user_id is null then
    update billing.provider_events
    set processing_status = 'reconciliation_required',
        processed_at = v_as_of,
        provider_subscription_id = case when v_chain_found then v_chain.provider_subscription_id else null end,
        last_error_code = 'unbound_original_transaction',
        reconciliation_required = true,
        updated_at = v_as_of
    where id = v_event.id;

    return query
    select 'unbound_original_transaction'::text, v_environment, v_event_type, v_event_subtype, true, false, false, false, true, false, false;
    return;
  end if;

  select *
  into v_existing
  from billing.provider_subscriptions ps
  where ps.provider = 'apple'
    and ps.environment = v_environment
    and ps.provider_original_transaction_ref = v_original_ref
    and ps.reconciliation_status <> 'superseded'
  for update;

  if found and v_existing.user_id is not null and v_existing.user_id is distinct from v_chain.user_id then
    update billing.provider_events
    set processing_status = 'reconciliation_required',
        processed_at = v_as_of,
        provider_subscription_id = v_existing.id,
        last_error_code = 'ownership_conflict',
        reconciliation_required = true,
        updated_at = v_as_of
    where id = v_event.id;

    return query
    select 'ownership_conflict'::text, v_environment, v_event_type, v_event_subtype, false, false, false, false, true, false, false;
    return;
  end if;

  begin
    update billing.provider_subscriptions
    set user_id = v_chain.user_id,
        app_account_token = v_chain.user_id,
        provider_product_ref = v_product_ref,
        provider_subscription_ref = v_original_ref,
        provider_original_transaction_ref = v_original_ref,
        provider_transaction_ref = v_transaction_ref,
        product_tier = 'pro',
        status = v_status,
        auto_renews = p_auto_renews,
        cancel_at_period_end = v_status = 'cancelled_active_until_period_end',
        started_at = p_start_time,
        current_period_start = null,
        current_period_end = p_current_period_end,
        grace_period_ends_at = p_grace_period_ends_at,
        billing_retry_started_at = p_billing_retry_started_at,
        expires_at = p_expires_at,
        revoked_at = p_revoked_at,
        refunded_at = p_refunded_at,
        paused_at = null,
        last_verified_at = v_as_of,
        last_event_at = v_event_time,
        last_provider_event_ref = v_event_ref,
        reconciliation_status = case
          when v_status = 'unknown_needs_reconciliation' then 'manual_review'
          when v_status = 'billing_retry' then 'needs_verification'
          else 'current'
        end,
        updated_at = v_as_of
    where id = v_chain.provider_subscription_id
    returning id
    into v_provider_subscription_id;

    if v_provider_subscription_id is null then
      raise exception 'apple_provider_subscription_missing';
    end if;

    update billing.apple_transaction_chains
    set product_id = v_product_id,
        provider_product_ref = v_product_ref,
        latest_transaction_id_fingerprint = v_transaction_ref,
        app_account_token = coalesce(p_app_account_token, v_chain.user_id),
        last_verified_at = v_as_of,
        updated_at = v_as_of
    where id = v_chain.id;

    v_summary_refresh_started := true;

    select *
    into strict v_summary
    from billing.refresh_effective_entitlement_summary(v_chain.user_id, v_environment, v_as_of);

    if coalesce(v_summary.applied, false) is not true then
      raise exception 'billing_summary_refresh_failed';
    end if;

    update billing.provider_events
    set processing_status = case when v_status = 'unknown_needs_reconciliation' then 'reconciliation_required' else 'processed' end,
        processed_at = v_as_of,
        provider_subscription_id = v_provider_subscription_id,
        provider_subscription_ref = v_original_ref,
        provider_original_transaction_ref = v_original_ref,
        provider_transaction_ref = v_transaction_ref,
        related_user_id = v_chain.user_id,
        last_error_code = case when v_status = 'unknown_needs_reconciliation' then 'requires_reconciliation' else null end,
        reconciliation_required = v_status = 'unknown_needs_reconciliation',
        updated_at = v_as_of
    where id = v_event.id;
  exception
    when others then
      v_result := case when v_summary_refresh_started then 'summary_refresh_failed' else 'failed' end;

      update billing.provider_events
      set processing_status = 'retry_pending',
          last_error_code = v_result,
          reconciliation_required = true,
          updated_at = v_as_of
      where id = v_event.id;

      return query
      select v_result, v_environment, v_event_type, v_event_subtype, false, false, false, false, true, false, true;
      return;
  end;

  return query
  select
    case when v_status = 'unknown_needs_reconciliation' then 'requires_reconciliation' else 'processed' end,
    v_environment,
    v_event_type,
    v_event_subtype,
    v_status <> 'unknown_needs_reconciliation',
    false,
    true,
    true,
    v_status = 'unknown_needs_reconciliation',
    false,
    false;
end;
$$;

comment on function billing.process_apple_server_notification_event(text, text, text, text, timestamptz, text, text, text, text, text, text, text, text, uuid, text, boolean, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, boolean, timestamptz) is
  'Service-role-only processor for verified App Store Server Notifications V2. It records TEST notifications without entitlement writes and updates only already-bound Apple original transaction chains.';

revoke all on function billing.process_apple_server_notification_event(text, text, text, text, timestamptz, text, text, text, text, text, text, text, text, uuid, text, boolean, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, boolean, timestamptz) from public;
revoke all on function billing.process_apple_server_notification_event(text, text, text, text, timestamptz, text, text, text, text, text, text, text, text, uuid, text, boolean, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, boolean, timestamptz) from anon;
revoke all on function billing.process_apple_server_notification_event(text, text, text, text, timestamptz, text, text, text, text, text, text, text, text, uuid, text, boolean, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, boolean, timestamptz) from authenticated;
grant execute on function billing.process_apple_server_notification_event(text, text, text, text, timestamptz, text, text, text, text, text, text, text, text, uuid, text, boolean, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, boolean, timestamptz) to service_role;

create or replace function public.process_apple_server_notification_event(
  p_provider_environment text,
  p_provider_event_ref text,
  p_event_type text,
  p_event_subtype text,
  p_event_time timestamptz,
  p_payload_hash text,
  p_bundle_id text,
  p_app_apple_id text,
  p_product_id text,
  p_provider_product_ref text,
  p_original_transaction_id_fingerprint text,
  p_original_transaction_id text,
  p_transaction_id_fingerprint text,
  p_app_account_token uuid,
  p_provider_status text,
  p_auto_renews boolean,
  p_start_time timestamptz,
  p_current_period_end timestamptz,
  p_grace_period_ends_at timestamptz,
  p_billing_retry_started_at timestamptz,
  p_expires_at timestamptz,
  p_revoked_at timestamptz,
  p_refunded_at timestamptz,
  p_test_purchase boolean default true,
  p_as_of timestamptz default now()
)
returns table (
  result text,
  provider_environment text,
  event_type text,
  event_subtype text,
  processed boolean,
  already_processed boolean,
  provider_subscription_changed boolean,
  compatibility_refreshed boolean,
  reconciliation_required boolean,
  unsupported_ignored boolean,
  retryable boolean
)
language sql
volatile
security invoker
set search_path = pg_catalog, public
as $$
  select *
  from billing.process_apple_server_notification_event(
    p_provider_environment,
    p_provider_event_ref,
    p_event_type,
    p_event_subtype,
    p_event_time,
    p_payload_hash,
    p_bundle_id,
    p_app_apple_id,
    p_product_id,
    p_provider_product_ref,
    p_original_transaction_id_fingerprint,
    p_original_transaction_id,
    p_transaction_id_fingerprint,
    p_app_account_token,
    p_provider_status,
    p_auto_renews,
    p_start_time,
    p_current_period_end,
    p_grace_period_ends_at,
    p_billing_retry_started_at,
    p_expires_at,
    p_revoked_at,
    p_refunded_at,
    p_test_purchase,
    p_as_of
  );
$$;

comment on function public.process_apple_server_notification_event(text, text, text, text, timestamptz, text, text, text, text, text, text, text, text, uuid, text, boolean, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, boolean, timestamptz) is
  'Service-role-only public RPC bridge for verified App Store Server Notifications V2. Returns sanitized processing metadata only.';

revoke all on function public.process_apple_server_notification_event(text, text, text, text, timestamptz, text, text, text, text, text, text, text, text, uuid, text, boolean, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, boolean, timestamptz) from public;
revoke all on function public.process_apple_server_notification_event(text, text, text, text, timestamptz, text, text, text, text, text, text, text, text, uuid, text, boolean, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, boolean, timestamptz) from anon;
revoke all on function public.process_apple_server_notification_event(text, text, text, text, timestamptz, text, text, text, text, text, text, text, text, uuid, text, boolean, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, boolean, timestamptz) from authenticated;
grant execute on function public.process_apple_server_notification_event(text, text, text, text, timestamptz, text, text, text, text, text, text, text, text, uuid, text, boolean, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, boolean, timestamptz) to service_role;

create or replace function billing.apple_subscription_reconciliation_candidates(
  p_environment text,
  p_as_of timestamptz default now(),
  p_stale_after interval default interval '12 hours'
)
returns table (
  provider_subscription_id uuid,
  provider_environment text,
  user_id uuid,
  original_transaction_id_fingerprint text,
  reason text,
  last_verified_at timestamptz,
  last_event_at timestamptz
)
language sql
stable
security invoker
set search_path = pg_catalog, billing, public
as $$
  select
    ps.id as provider_subscription_id,
    ps.environment as provider_environment,
    ps.user_id,
    ps.provider_original_transaction_ref as original_transaction_id_fingerprint,
    case
      when ps.reconciliation_status <> 'current' then 'provider_reconciliation_status'
      when ps.status in ('unknown_needs_reconciliation', 'billing_retry') then 'provider_state_requires_requery'
      when ps.last_verified_at is null then 'never_verified'
      when ps.last_verified_at < coalesce(p_as_of, now()) - coalesce(p_stale_after, interval '12 hours') then 'stale_verification'
      when ps.user_id is null then 'orphaned_subscription'
      when e.user_id is null then 'missing_entitlement_projection'
      when ps.status in ('active', 'cancelled_active_until_period_end', 'grace_period') and e.plan <> 'pro' then 'entitlement_inconsistent'
      when ps.status in ('expired', 'refunded', 'revoked') and e.plan = 'pro' and e.current_period_end is null then 'inactive_provider_still_granting'
      else 'unknown_or_out_of_order'
    end as reason,
    ps.last_verified_at,
    ps.last_event_at
  from billing.provider_subscriptions ps
  left join public.entitlements e on e.user_id = ps.user_id
  where ps.provider = 'apple'
    and ps.environment = lower(btrim(coalesce(p_environment, '')))
    and ps.reconciliation_status <> 'superseded'
    and (
      ps.reconciliation_status <> 'current'
      or ps.status in ('unknown_needs_reconciliation', 'billing_retry')
      or ps.last_verified_at is null
      or ps.last_verified_at < coalesce(p_as_of, now()) - coalesce(p_stale_after, interval '12 hours')
      or ps.user_id is null
      or e.user_id is null
      or (ps.status in ('active', 'cancelled_active_until_period_end', 'grace_period') and e.plan <> 'pro')
      or (ps.status in ('expired', 'refunded', 'revoked') and e.plan = 'pro' and e.current_period_end is null)
    )
  order by ps.last_verified_at nulls first, ps.last_event_at nulls first, ps.created_at;
$$;

comment on function billing.apple_subscription_reconciliation_candidates(text, timestamptz, interval) is
  'Read-only service-role Apple reconciliation foundation for stale, conflicted, missed, out-of-order, orphaned, and entitlement-inconsistent provider state.';

revoke all on function billing.apple_subscription_reconciliation_candidates(text, timestamptz, interval) from public;
revoke all on function billing.apple_subscription_reconciliation_candidates(text, timestamptz, interval) from anon;
revoke all on function billing.apple_subscription_reconciliation_candidates(text, timestamptz, interval) from authenticated;
grant execute on function billing.apple_subscription_reconciliation_candidates(text, timestamptz, interval) to service_role;
