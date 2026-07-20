-- Google Play RTDN provider-neutral processor.
--
-- This migration adds the private transition used by the authenticated
-- google-play-rtdn Edge Function. It records Pub/Sub delivery idempotency and
-- normalized Google Play subscription state without storing raw purchase
-- tokens, raw Pub/Sub envelopes, bearer JWTs, Google API responses, or client
-- supplied entitlement assertions.

create or replace function billing.process_google_play_rtdn_event(
  p_provider_environment text,
  p_pubsub_message_id text,
  p_event_type text,
  p_event_subtype text,
  p_event_time timestamptz,
  p_payload_hash text,
  p_package_name text,
  p_provider_product_ref text,
  p_purchase_token_fingerprint text,
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
  v_event_ref text := 'pubsub:' || nullif(btrim(coalesce(p_pubsub_message_id, '')), '');
  v_event_type text := lower(btrim(coalesce(p_event_type, '')));
  v_event_subtype text := nullif(lower(btrim(coalesce(p_event_subtype, ''))), '');
  v_payload_hash text := nullif(btrim(coalesce(p_payload_hash, '')), '');
  v_package_name text := nullif(btrim(coalesce(p_package_name, '')), '');
  v_product_ref text := nullif(btrim(coalesce(p_provider_product_ref, '')), '');
  v_token_ref text := nullif(btrim(coalesce(p_purchase_token_fingerprint, '')), '');
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
  v_cross_environment_conflict boolean := false;
  v_provider_subscription_id uuid;
  v_summary record;
  v_summary_refresh_started boolean := false;
  v_resolver_environment text;
  v_result text := 'failed';
begin
  if v_environment not in ('test', 'production') then
    return query
    select 'invalid_environment'::text, v_environment, v_event_type, v_event_subtype, false, false, false, false, true, false, false;
    return;
  end if;

  if v_event_ref is null
    or v_event_ref = 'pubsub:'
    or v_event_type = ''
    or p_event_time is null
    or v_payload_hash is null
    or length(v_payload_hash) < 32
    or v_payload_hash ~ '[[:space:]]'
    or v_package_name <> 'com.canyougeo.app'
  then
    return query
    select 'invalid_event'::text, v_environment, v_event_type, v_event_subtype, false, false, false, false, true, false, false;
    return;
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('billing.process_google_play_rtdn_event:google_play:' || v_environment || ':' || v_event_ref, 0)
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
        occurred_at = p_event_time,
        effective_at = p_event_time,
        processing_status = 'processing',
        attempt_count = least(attempt_count + 1, 100),
        last_attempted_at = v_as_of,
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
      v_event_type,
      v_event_subtype,
      p_event_time,
      p_event_time,
      v_as_of,
      'processing',
      1,
      v_as_of,
      false,
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

  if v_event_type = 'test_notification' then
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

  if v_event_type in (
    'one_time_product_notification',
    'voided_purchase_notification',
    'pending_refund_review_notification',
    'unsupported_notification'
  ) then
    update billing.provider_events
    set processing_status = 'ignored',
        processed_at = v_as_of,
        last_error_code = 'unsupported_notification',
        reconciliation_required = false,
        updated_at = v_as_of
    where id = v_event.id;

    return query
    select 'unsupported_notification'::text, v_environment, v_event_type, v_event_subtype, true, false, false, false, false, true, false;
    return;
  end if;

  if v_event_type in ('subscription_notification_api_error', 'subscription_notification_reconciliation_required') then
    update billing.provider_events
    set processing_status = 'reconciliation_required',
        processed_at = v_as_of,
        last_error_code = coalesce(v_event_subtype, 'subscription_reconciliation_required'),
        reconciliation_required = true,
        updated_at = v_as_of
    where id = v_event.id;

    return query
    select 'reconciliation_required'::text, v_environment, v_event_type, v_event_subtype, true, false, false, false, true, false, false;
    return;
  end if;

  if v_event_type <> 'subscription_notification'
    or v_token_ref is null
    or v_status is null
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
    or v_product_ref not in (
      'com.canyougeo.app:canyougeo_pro:monthly',
      'com.canyougeo.app:canyougeo_pro:annual'
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
    hashtextextended('billing.process_google_play_rtdn_event:subscription:' || v_environment || ':' || v_token_ref, 0)
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
    select 'environment_conflict'::text, v_environment, v_event_type, v_event_subtype, false, false, false, false, true, false, false;
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

  if not v_existing_found or v_existing.user_id is null then
    update billing.provider_events
    set processing_status = 'reconciliation_required',
        processed_at = v_as_of,
        provider_subscription_id = case when v_existing_found then v_existing.id else null end,
        last_error_code = 'unbound_purchase_token',
        reconciliation_required = true,
        updated_at = v_as_of
    where id = v_event.id;

    return query
    select 'unbound_purchase_token'::text, v_environment, v_event_type, v_event_subtype, true, false, false, false, true, false, false;
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

    if found and v_linked_existing.user_id is not null and v_linked_existing.user_id is distinct from v_existing.user_id then
      update billing.provider_events
      set processing_status = 'reconciliation_required',
          processed_at = v_as_of,
          provider_subscription_id = v_existing.id,
          last_error_code = 'linked_token_ownership_conflict',
          reconciliation_required = true,
          updated_at = v_as_of
      where id = v_event.id;

      return query
      select 'linked_token_ownership_conflict'::text, v_environment, v_event_type, v_event_subtype, false, false, false, false, true, false, false;
      return;
    end if;
  end if;

  v_resolver_environment := case when v_environment = 'production' then 'production' else 'sandbox' end;

  begin
    update billing.provider_subscriptions
    set provider_product_ref = v_product_ref,
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
          else 'current'
        end,
        updated_at = v_as_of
    where id = v_existing.id
    returning id
    into v_provider_subscription_id;

    v_summary_refresh_started := true;

    select *
    into strict v_summary
    from billing.refresh_effective_entitlement_summary(v_existing.user_id, v_resolver_environment, v_as_of);

    if coalesce(v_summary.applied, false) is not true then
      raise exception 'billing_summary_refresh_failed';
    end if;

    update billing.provider_events
    set processing_status = 'processed',
        processed_at = v_as_of,
        provider_subscription_id = v_provider_subscription_id,
        provider_subscription_ref = v_token_ref,
        provider_original_transaction_ref = v_linked_token_ref,
        provider_transaction_ref = v_transaction_ref,
        related_user_id = v_existing.user_id,
        last_error_code = null,
        reconciliation_required = false,
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
  select 'processed'::text, v_environment, v_event_type, v_event_subtype, true, false, true, true, false, false, false;
end;
$$;

comment on function billing.process_google_play_rtdn_event(text, text, text, text, timestamptz, text, text, text, text, text, text, text, text, boolean, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, boolean, timestamptz) is
  'Service-role-only processor for authenticated Google Play RTDN events. Uses Pub/Sub message id idempotency, token fingerprints only, and refreshes effective entitlements only for an already-bound Google Play token.';

revoke all on function billing.process_google_play_rtdn_event(text, text, text, text, timestamptz, text, text, text, text, text, text, text, text, boolean, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, boolean, timestamptz) from public;
revoke all on function billing.process_google_play_rtdn_event(text, text, text, text, timestamptz, text, text, text, text, text, text, text, text, boolean, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, boolean, timestamptz) from anon;
revoke all on function billing.process_google_play_rtdn_event(text, text, text, text, timestamptz, text, text, text, text, text, text, text, text, boolean, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, boolean, timestamptz) from authenticated;
grant execute on function billing.process_google_play_rtdn_event(text, text, text, text, timestamptz, text, text, text, text, text, text, text, text, boolean, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, boolean, timestamptz) to service_role;

create or replace function public.process_google_play_rtdn_event(
  p_provider_environment text,
  p_pubsub_message_id text,
  p_event_type text,
  p_event_subtype text,
  p_event_time timestamptz,
  p_payload_hash text,
  p_package_name text,
  p_provider_product_ref text,
  p_purchase_token_fingerprint text,
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
  from billing.process_google_play_rtdn_event(
    p_provider_environment,
    p_pubsub_message_id,
    p_event_type,
    p_event_subtype,
    p_event_time,
    p_payload_hash,
    p_package_name,
    p_provider_product_ref,
    p_purchase_token_fingerprint,
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

comment on function public.process_google_play_rtdn_event(text, text, text, text, timestamptz, text, text, text, text, text, text, text, text, boolean, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, boolean, timestamptz) is
  'Service-role-only public RPC transport bridge for authenticated Google Play RTDN processing. Delegates to billing.process_google_play_rtdn_event and exposes only sanitized transition metadata.';

revoke all on function public.process_google_play_rtdn_event(text, text, text, text, timestamptz, text, text, text, text, text, text, text, text, boolean, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, boolean, timestamptz) from public;
revoke all on function public.process_google_play_rtdn_event(text, text, text, text, timestamptz, text, text, text, text, text, text, text, text, boolean, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, boolean, timestamptz) from anon;
revoke all on function public.process_google_play_rtdn_event(text, text, text, text, timestamptz, text, text, text, text, text, text, text, text, boolean, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, boolean, timestamptz) from authenticated;
grant execute on function public.process_google_play_rtdn_event(text, text, text, text, timestamptz, text, text, text, text, text, text, text, text, boolean, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, boolean, timestamptz) to service_role;
