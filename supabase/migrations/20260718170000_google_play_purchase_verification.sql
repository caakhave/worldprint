-- Google Play purchase verification and token binding.
--
-- This migration adds the private, transactional write path used after an
-- authenticated Android client sends a Play purchase token to the staging
-- Supabase Edge Function. Browser/native clients remain consumers of
-- public.entitlements only; they cannot write provider subscriptions or see raw
-- tokens.

create table if not exists billing.google_play_purchase_tokens (
  id uuid primary key default gen_random_uuid(),
  provider_environment text not null,
  user_id uuid references public.profiles(id) on delete set null,
  provider_subscription_id uuid references billing.provider_subscriptions(id) on delete set null,
  package_name text not null,
  provider_product_ref text not null,
  purchase_token_fingerprint text not null,
  purchase_token text not null,
  linked_purchase_token_fingerprint text,
  acknowledgement_state text,
  last_verified_at timestamptz,
  acknowledged_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table billing.google_play_purchase_tokens is
  'Service-role-only Google Play purchase-token binding table. Raw tokens are never exposed through public tables, responses, logs, or client-readable projections.';
comment on column billing.google_play_purchase_tokens.purchase_token is
  'Raw Google Play purchase token retained only for trusted server-side reconciliation and never granted to anon/authenticated roles.';
comment on column billing.google_play_purchase_tokens.purchase_token_fingerprint is
  'Stable sha256_ fingerprint used in provider ledgers, logs, and idempotency records instead of the raw purchase token.';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'google_play_purchase_tokens_environment_check'
      and conrelid = 'billing.google_play_purchase_tokens'::regclass
  ) then
    alter table billing.google_play_purchase_tokens
      add constraint google_play_purchase_tokens_environment_check
      check (provider_environment in ('test', 'production'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'google_play_purchase_tokens_package_check'
      and conrelid = 'billing.google_play_purchase_tokens'::regclass
  ) then
    alter table billing.google_play_purchase_tokens
      add constraint google_play_purchase_tokens_package_check
      check (package_name = 'com.canyougeo.app');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'google_play_purchase_tokens_product_ref_check'
      and conrelid = 'billing.google_play_purchase_tokens'::regclass
  ) then
    alter table billing.google_play_purchase_tokens
      add constraint google_play_purchase_tokens_product_ref_check
      check (
        provider_product_ref in (
          'com.canyougeo.app:canyougeo_pro:monthly',
          'com.canyougeo.app:canyougeo_pro:annual'
        )
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'google_play_purchase_tokens_fingerprint_check'
      and conrelid = 'billing.google_play_purchase_tokens'::regclass
  ) then
    alter table billing.google_play_purchase_tokens
      add constraint google_play_purchase_tokens_fingerprint_check
      check (
        purchase_token_fingerprint ~ '^sha256_[a-f0-9]{64}$'
        and (linked_purchase_token_fingerprint is null or linked_purchase_token_fingerprint ~ '^sha256_[a-f0-9]{64}$')
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'google_play_purchase_tokens_raw_token_check'
      and conrelid = 'billing.google_play_purchase_tokens'::regclass
  ) then
    alter table billing.google_play_purchase_tokens
      add constraint google_play_purchase_tokens_raw_token_check
      check (
        length(purchase_token) between 10 and 4096
        and purchase_token !~ '[[:space:]]'
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'google_play_purchase_tokens_acknowledgement_state_check'
      and conrelid = 'billing.google_play_purchase_tokens'::regclass
  ) then
    alter table billing.google_play_purchase_tokens
      add constraint google_play_purchase_tokens_acknowledgement_state_check
      check (
        acknowledgement_state is null
        or acknowledgement_state in (
          'ACKNOWLEDGEMENT_STATE_UNSPECIFIED',
          'ACKNOWLEDGEMENT_STATE_PENDING',
          'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED'
        )
      );
  end if;
end $$;

create unique index if not exists google_play_purchase_tokens_fingerprint_uidx
  on billing.google_play_purchase_tokens(provider_environment, purchase_token_fingerprint);

create index if not exists google_play_purchase_tokens_user_id_idx
  on billing.google_play_purchase_tokens(user_id);

create index if not exists google_play_purchase_tokens_subscription_id_idx
  on billing.google_play_purchase_tokens(provider_subscription_id);

revoke all on table billing.google_play_purchase_tokens from public;
revoke all on table billing.google_play_purchase_tokens from anon;
revoke all on table billing.google_play_purchase_tokens from authenticated;
grant all privileges on table billing.google_play_purchase_tokens to service_role;

alter table billing.google_play_purchase_tokens enable row level security;
alter table billing.google_play_purchase_tokens force row level security;

create or replace function billing.process_google_play_purchase_verification(
  p_provider_environment text,
  p_user_id uuid,
  p_provider_event_ref text,
  p_event_time timestamptz,
  p_payload_hash text,
  p_package_name text,
  p_provider_product_ref text,
  p_purchase_token_fingerprint text,
  p_purchase_token text,
  p_linked_purchase_token_fingerprint text,
  p_provider_transaction_ref text,
  p_provider_status text,
  p_acknowledgement_state text,
  p_auto_renews boolean,
  p_start_time timestamptz,
  p_current_period_end timestamptz,
  p_grace_period_ends_at timestamptz,
  p_billing_retry_started_at timestamptz,
  p_expires_at timestamptz,
  p_paused_at timestamptz,
  p_test_purchase boolean default false,
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
  acknowledgement_required boolean,
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
  v_event_ref text := nullif(btrim(coalesce(p_provider_event_ref, '')), '');
  v_payload_hash text := nullif(btrim(coalesce(p_payload_hash, '')), '');
  v_package_name text := nullif(btrim(coalesce(p_package_name, '')), '');
  v_product_ref text := nullif(btrim(coalesce(p_provider_product_ref, '')), '');
  v_token_ref text := nullif(btrim(coalesce(p_purchase_token_fingerprint, '')), '');
  v_purchase_token text := nullif(btrim(coalesce(p_purchase_token, '')), '');
  v_linked_token_ref text := nullif(btrim(coalesce(p_linked_purchase_token_fingerprint, '')), '');
  v_transaction_ref text := nullif(btrim(coalesce(p_provider_transaction_ref, '')), '');
  v_status text := nullif(lower(btrim(coalesce(p_provider_status, ''))), '');
  v_acknowledgement_state text := nullif(btrim(coalesce(p_acknowledgement_state, '')), '');
  v_as_of timestamptz := coalesce(p_as_of, now());
  v_event record;
  v_event_found boolean := false;
  v_existing record;
  v_existing_found boolean := false;
  v_linked_existing record;
  v_token_binding record;
  v_cross_environment_conflict boolean := false;
  v_provider_subscription_id uuid;
  v_summary record;
  v_summary_refresh_started boolean := false;
  v_resolver_environment text;
  v_ack_required boolean := false;
  v_result text := 'failed';
begin
  if v_environment not in ('test', 'production') then
    return query
    select 'invalid_environment'::text, v_environment, 'purchase_verification'::text, null::text, false, false, false, false, false, true, false;
    return;
  end if;

  if v_user_id is null
    or v_event_ref is null
    or p_event_time is null
    or v_payload_hash is null
    or length(v_payload_hash) < 32
    or v_payload_hash ~ '[[:space:]]'
    or v_package_name <> 'com.canyougeo.app'
    or v_product_ref not in (
      'com.canyougeo.app:canyougeo_pro:monthly',
      'com.canyougeo.app:canyougeo_pro:annual'
    )
    or v_token_ref !~ '^sha256_[a-f0-9]{64}$'
    or v_purchase_token is null
    or length(v_purchase_token) < 10
    or length(v_purchase_token) > 4096
    or v_purchase_token ~ '[[:space:]]'
    or (v_linked_token_ref is not null and v_linked_token_ref !~ '^sha256_[a-f0-9]{64}$')
    or v_status not in (
      'active',
      'cancelled_active_until_period_end',
      'grace_period',
      'billing_retry',
      'pending',
      'expired',
      'paused',
      'unknown_needs_reconciliation'
    )
    or (
      v_acknowledgement_state is not null
      and v_acknowledgement_state not in (
        'ACKNOWLEDGEMENT_STATE_UNSPECIFIED',
        'ACKNOWLEDGEMENT_STATE_PENDING',
        'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED'
      )
    )
  then
    return query
    select 'invalid_purchase_verification'::text, v_environment, 'purchase_verification'::text, null::text, false, false, false, false, false, true, false;
    return;
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('billing.process_google_play_purchase_verification:google_play:' || v_environment || ':' || v_event_ref, 0)
  );

  select *
  into v_event
  from billing.provider_events pe
  where pe.provider = 'google_play'
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
      select 'payload_conflict'::text, v_environment, 'purchase_verification'::text, null::text, false, false, false, false, false, true, false;
      return;
    end if;

    if v_event.processing_status in ('processed', 'reconciliation_required') and v_event.processed_at is not null then
      return query
      select
        'already_processed'::text,
        v_environment,
        'purchase_verification'::text,
        null::text,
        false,
        true,
        false,
        false,
        false,
        coalesce(v_event.reconciliation_required, false),
        false;
      return;
    end if;

    update billing.provider_events
    set event_type = 'purchase_verification',
        event_subtype = null,
        occurred_at = p_event_time,
        effective_at = p_event_time,
        processing_status = 'processing',
        attempt_count = least(attempt_count + 1, 100),
        last_attempted_at = v_as_of,
        related_user_id = v_user_id,
        provider_subscription_ref = v_token_ref,
        provider_original_transaction_ref = v_linked_token_ref,
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
      'google_play',
      v_environment,
      v_event_ref,
      'purchase_verification',
      null,
      p_event_time,
      p_event_time,
      v_as_of,
      'processing',
      1,
      v_as_of,
      false,
      v_user_id,
      v_token_ref,
      v_linked_token_ref,
      v_transaction_ref,
      v_payload_hash,
      v_as_of,
      v_as_of
    )
    returning *
    into v_event;
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('billing.process_google_play_purchase_verification:subscription:' || v_environment || ':' || v_token_ref, 0)
  );

  select exists (
    select 1
    from billing.provider_subscriptions ps
    where ps.provider = 'google_play'
      and ps.provider_subscription_ref = v_token_ref
      and ps.environment <> v_environment
      and ps.reconciliation_status <> 'superseded'
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
    select 'environment_conflict'::text, v_environment, 'purchase_verification'::text, null::text, false, false, false, false, false, true, false;
    return;
  end if;

  select *
  into v_token_binding
  from billing.google_play_purchase_tokens gt
  where gt.provider_environment = v_environment
    and gt.purchase_token_fingerprint = v_token_ref
  for update;

  if found and v_token_binding.user_id is not null and v_token_binding.user_id is distinct from v_user_id then
    update billing.provider_events
    set processing_status = 'reconciliation_required',
        processed_at = v_as_of,
        provider_subscription_id = v_token_binding.provider_subscription_id,
        last_error_code = 'ownership_conflict',
        reconciliation_required = true,
        updated_at = v_as_of
    where id = v_event.id;

    return query
    select 'ownership_conflict'::text, v_environment, 'purchase_verification'::text, null::text, false, false, false, false, false, true, false;
    return;
  end if;

  select *
  into v_existing
  from billing.provider_subscriptions ps
  where ps.provider = 'google_play'
    and ps.environment = v_environment
    and ps.provider_subscription_ref = v_token_ref
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
    select 'ownership_conflict'::text, v_environment, 'purchase_verification'::text, null::text, false, false, false, false, false, true, false;
    return;
  end if;

  if v_linked_token_ref is not null then
    select *
    into v_linked_existing
    from billing.provider_subscriptions ps
    where ps.provider = 'google_play'
      and ps.environment = v_environment
      and ps.provider_subscription_ref = v_linked_token_ref
      and ps.reconciliation_status <> 'superseded'
    for update;

    if found and v_linked_existing.user_id is not null and v_linked_existing.user_id is distinct from v_user_id then
      update billing.provider_events
      set processing_status = 'reconciliation_required',
          processed_at = v_as_of,
          provider_subscription_id = case when v_existing_found then v_existing.id else null end,
          last_error_code = 'linked_token_ownership_conflict',
          reconciliation_required = true,
          updated_at = v_as_of
      where id = v_event.id;

      return query
      select 'linked_token_ownership_conflict'::text, v_environment, 'purchase_verification'::text, null::text, false, false, false, false, false, true, false;
      return;
    end if;
  end if;

  v_resolver_environment := case when v_environment = 'production' then 'production' else 'sandbox' end;
  v_ack_required := v_acknowledgement_state = 'ACKNOWLEDGEMENT_STATE_PENDING'
    and v_status in ('active', 'cancelled_active_until_period_end', 'grace_period');

  begin
    if v_existing_found then
      update billing.provider_subscriptions
      set user_id = v_user_id,
          app_account_token = v_user_id,
          provider_product_ref = v_product_ref,
          provider_original_transaction_ref = v_linked_token_ref,
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
          revoked_at = null,
          refunded_at = null,
          paused_at = p_paused_at,
          last_verified_at = v_as_of,
          last_event_at = p_event_time,
          last_provider_event_ref = v_event_ref,
          reconciliation_status = case
            when v_status = 'unknown_needs_reconciliation' then 'manual_review'
            when v_status in ('pending', 'billing_retry', 'paused') then 'needs_verification'
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
        paused_at,
        last_verified_at,
        last_event_at,
        last_provider_event_ref,
        reconciliation_status,
        created_at,
        updated_at
      )
      values (
        v_user_id,
        'google_play',
        v_environment,
        'pro',
        v_product_ref,
        v_token_ref,
        v_linked_token_ref,
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
        p_paused_at,
        v_as_of,
        p_event_time,
        v_event_ref,
        case
          when v_status = 'unknown_needs_reconciliation' then 'manual_review'
          when v_status in ('pending', 'billing_retry', 'paused') then 'needs_verification'
          else 'current'
        end,
        v_as_of,
        v_as_of
      )
      returning id
      into v_provider_subscription_id;
    end if;

    insert into billing.google_play_purchase_tokens (
      provider_environment,
      user_id,
      provider_subscription_id,
      package_name,
      provider_product_ref,
      purchase_token_fingerprint,
      purchase_token,
      linked_purchase_token_fingerprint,
      acknowledgement_state,
      last_verified_at,
      created_at,
      updated_at
    )
    values (
      v_environment,
      v_user_id,
      v_provider_subscription_id,
      v_package_name,
      v_product_ref,
      v_token_ref,
      v_purchase_token,
      v_linked_token_ref,
      v_acknowledgement_state,
      v_as_of,
      v_as_of,
      v_as_of
    )
    on conflict (provider_environment, purchase_token_fingerprint) do update
      set user_id = excluded.user_id,
          provider_subscription_id = excluded.provider_subscription_id,
          package_name = excluded.package_name,
          provider_product_ref = excluded.provider_product_ref,
          purchase_token = excluded.purchase_token,
          linked_purchase_token_fingerprint = excluded.linked_purchase_token_fingerprint,
          acknowledgement_state = excluded.acknowledgement_state,
          last_verified_at = excluded.last_verified_at,
          updated_at = excluded.updated_at;

    if v_linked_token_ref is not null then
      update billing.provider_subscriptions
      set reconciliation_status = 'superseded',
          updated_at = v_as_of
      where provider = 'google_play'
        and environment = v_environment
        and provider_subscription_ref = v_linked_token_ref
        and user_id = v_user_id
        and id <> v_provider_subscription_id
        and reconciliation_status <> 'superseded';
    end if;

    v_summary_refresh_started := true;

    select *
    into strict v_summary
    from billing.refresh_effective_entitlement_summary(v_user_id, v_resolver_environment, v_as_of);

    if coalesce(v_summary.applied, false) is not true then
      raise exception 'billing_summary_refresh_failed';
    end if;

    update billing.provider_events
    set processing_status = case when v_status = 'unknown_needs_reconciliation' then 'reconciliation_required' else 'processed' end,
        processed_at = v_as_of,
        provider_subscription_id = v_provider_subscription_id,
        provider_subscription_ref = v_token_ref,
        provider_original_transaction_ref = v_linked_token_ref,
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
      select v_result, v_environment, 'purchase_verification'::text, null::text, false, false, false, false, false, true, true;
      return;
  end;

  return query
  select
    case when v_status = 'unknown_needs_reconciliation' then 'requires_reconciliation' else 'processed' end,
    v_environment,
    'purchase_verification'::text,
    null::text,
    v_status <> 'unknown_needs_reconciliation',
    false,
    true,
    true,
    v_ack_required,
    v_status = 'unknown_needs_reconciliation',
    false;
end;
$$;

comment on function billing.process_google_play_purchase_verification(text, uuid, text, timestamptz, text, text, text, text, text, text, text, text, text, boolean, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, boolean, timestamptz) is
  'Service-role-only processor for authenticated Google Play purchase verification. Binds a verified token fingerprint to a Supabase user, stores the raw token only in a private service table, refreshes public entitlement compatibility state, and returns sanitized processing metadata.';

revoke all on function billing.process_google_play_purchase_verification(text, uuid, text, timestamptz, text, text, text, text, text, text, text, text, text, boolean, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, boolean, timestamptz) from public;
revoke all on function billing.process_google_play_purchase_verification(text, uuid, text, timestamptz, text, text, text, text, text, text, text, text, text, boolean, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, boolean, timestamptz) from anon;
revoke all on function billing.process_google_play_purchase_verification(text, uuid, text, timestamptz, text, text, text, text, text, text, text, text, text, boolean, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, boolean, timestamptz) from authenticated;
grant execute on function billing.process_google_play_purchase_verification(text, uuid, text, timestamptz, text, text, text, text, text, text, text, text, text, boolean, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, boolean, timestamptz) to service_role;

create or replace function public.process_google_play_purchase_verification(
  p_provider_environment text,
  p_user_id uuid,
  p_provider_event_ref text,
  p_event_time timestamptz,
  p_payload_hash text,
  p_package_name text,
  p_provider_product_ref text,
  p_purchase_token_fingerprint text,
  p_purchase_token text,
  p_linked_purchase_token_fingerprint text,
  p_provider_transaction_ref text,
  p_provider_status text,
  p_acknowledgement_state text,
  p_auto_renews boolean,
  p_start_time timestamptz,
  p_current_period_end timestamptz,
  p_grace_period_ends_at timestamptz,
  p_billing_retry_started_at timestamptz,
  p_expires_at timestamptz,
  p_paused_at timestamptz,
  p_test_purchase boolean default false,
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
  acknowledgement_required boolean,
  reconciliation_required boolean,
  retryable boolean
)
language sql
volatile
security invoker
set search_path = pg_catalog, public
as $$
  select *
  from billing.process_google_play_purchase_verification(
    p_provider_environment,
    p_user_id,
    p_provider_event_ref,
    p_event_time,
    p_payload_hash,
    p_package_name,
    p_provider_product_ref,
    p_purchase_token_fingerprint,
    p_purchase_token,
    p_linked_purchase_token_fingerprint,
    p_provider_transaction_ref,
    p_provider_status,
    p_acknowledgement_state,
    p_auto_renews,
    p_start_time,
    p_current_period_end,
    p_grace_period_ends_at,
    p_billing_retry_started_at,
    p_expires_at,
    p_paused_at,
    p_test_purchase,
    p_as_of
  );
$$;

comment on function public.process_google_play_purchase_verification(text, uuid, text, timestamptz, text, text, text, text, text, text, text, text, text, boolean, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, boolean, timestamptz) is
  'Service-role-only public RPC bridge for authenticated Google Play purchase verification. Returns sanitized processing metadata only.';

revoke all on function public.process_google_play_purchase_verification(text, uuid, text, timestamptz, text, text, text, text, text, text, text, text, text, boolean, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, boolean, timestamptz) from public;
revoke all on function public.process_google_play_purchase_verification(text, uuid, text, timestamptz, text, text, text, text, text, text, text, text, text, boolean, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, boolean, timestamptz) from anon;
revoke all on function public.process_google_play_purchase_verification(text, uuid, text, timestamptz, text, text, text, text, text, text, text, text, text, boolean, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, boolean, timestamptz) from authenticated;
grant execute on function public.process_google_play_purchase_verification(text, uuid, text, timestamptz, text, text, text, text, text, text, text, text, text, boolean, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, boolean, timestamptz) to service_role;

create or replace function billing.record_google_play_purchase_acknowledgement(
  p_provider_environment text,
  p_purchase_token_fingerprint text,
  p_acknowledged_at timestamptz default now()
)
returns table (
  result text,
  provider_environment text,
  acknowledged boolean,
  retryable boolean
)
language plpgsql
volatile
security invoker
set search_path = pg_catalog, billing, public
as $$
declare
  v_environment text := lower(btrim(coalesce(p_provider_environment, '')));
  v_token_ref text := nullif(btrim(coalesce(p_purchase_token_fingerprint, '')), '');
  v_acknowledged_at timestamptz := coalesce(p_acknowledged_at, now());
begin
  if v_environment not in ('test', 'production') or v_token_ref !~ '^sha256_[a-f0-9]{64}$' then
    return query
    select 'invalid_acknowledgement'::text, v_environment, false, false;
    return;
  end if;

  update billing.google_play_purchase_tokens
  set acknowledgement_state = 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED',
      acknowledged_at = v_acknowledged_at,
      updated_at = v_acknowledged_at
  where provider_environment = v_environment
    and purchase_token_fingerprint = v_token_ref;

  if not found then
    return query
    select 'token_not_found'::text, v_environment, false, true;
    return;
  end if;

  return query
  select 'acknowledged'::text, v_environment, true, false;
end;
$$;

comment on function billing.record_google_play_purchase_acknowledgement(text, text, timestamptz) is
  'Service-role-only acknowledgement marker for already-verified Google Play subscriptions. Accepts token fingerprints only.';

revoke all on function billing.record_google_play_purchase_acknowledgement(text, text, timestamptz) from public;
revoke all on function billing.record_google_play_purchase_acknowledgement(text, text, timestamptz) from anon;
revoke all on function billing.record_google_play_purchase_acknowledgement(text, text, timestamptz) from authenticated;
grant execute on function billing.record_google_play_purchase_acknowledgement(text, text, timestamptz) to service_role;

create or replace function public.record_google_play_purchase_acknowledgement(
  p_provider_environment text,
  p_purchase_token_fingerprint text,
  p_acknowledged_at timestamptz default now()
)
returns table (
  result text,
  provider_environment text,
  acknowledged boolean,
  retryable boolean
)
language sql
volatile
security invoker
set search_path = pg_catalog, public
as $$
  select *
  from billing.record_google_play_purchase_acknowledgement(
    p_provider_environment,
    p_purchase_token_fingerprint,
    p_acknowledged_at
  );
$$;

comment on function public.record_google_play_purchase_acknowledgement(text, text, timestamptz) is
  'Service-role-only public RPC bridge for recording Google Play acknowledgement completion by token fingerprint.';

revoke all on function public.record_google_play_purchase_acknowledgement(text, text, timestamptz) from public;
revoke all on function public.record_google_play_purchase_acknowledgement(text, text, timestamptz) from anon;
revoke all on function public.record_google_play_purchase_acknowledgement(text, text, timestamptz) from authenticated;
grant execute on function public.record_google_play_purchase_acknowledgement(text, text, timestamptz) to service_role;
