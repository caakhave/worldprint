-- Stripe provider event processor.
--
-- This migration adds a private transactional operation for processing
-- normalized Stripe subscription events into the provider-neutral billing
-- model. It intentionally does not change the active Stripe webhook, legacy
-- webhook replay ledger, Stripe Checkout, Stripe Portal, Apple billing,
-- Android, analytics, triggers, or scheduled jobs.

create or replace function billing.process_stripe_subscription_event(
  p_provider_environment text,
  p_provider_event_ref text,
  p_event_type text,
  p_event_subtype text,
  p_event_created_at timestamptz,
  p_user_id uuid,
  p_provider_customer_ref text,
  p_provider_subscription_ref text,
  p_provider_product_ref text,
  p_provider_status text,
  p_current_period_start timestamptz,
  p_current_period_end timestamptz,
  p_cancel_at_period_end boolean,
  p_payload_hash text,
  p_product_allowed boolean default false,
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
  stale_event_ignored boolean,
  retryable boolean
)
language plpgsql
volatile
security invoker
set search_path = pg_catalog, billing, public
as $$
declare
  v_environment text := lower(btrim(coalesce(p_provider_environment, '')));
  v_event_ref text := nullif(btrim(p_provider_event_ref), '');
  v_event_type text := lower(btrim(coalesce(p_event_type, '')));
  v_event_subtype text := nullif(lower(btrim(coalesce(p_event_subtype, ''))), '');
  v_event_created_at timestamptz := p_event_created_at;
  v_as_of timestamptz := coalesce(p_as_of, now());
  v_customer_ref text := nullif(btrim(p_provider_customer_ref), '');
  v_subscription_ref text := nullif(btrim(p_provider_subscription_ref), '');
  v_product_ref text := nullif(btrim(p_provider_product_ref), '');
  v_stripe_status text := lower(btrim(coalesce(p_provider_status, '')));
  v_payload_hash text := nullif(btrim(p_payload_hash), '');
  v_resolver_environment text;
  v_event record;
  v_event_found boolean := false;
  v_existing record;
  v_existing_found boolean := false;
  v_existing_timestamp timestamptz;
  v_cross_environment_conflict boolean := false;
  v_canonical_status text;
  v_auto_renews boolean;
  v_cancel_at_period_end boolean := coalesce(p_cancel_at_period_end, false);
  v_started_at timestamptz;
  v_period_start timestamptz := p_current_period_start;
  v_period_end timestamptz := p_current_period_end;
  v_billing_retry_started_at timestamptz;
  v_expires_at timestamptz;
  v_paused_at timestamptz;
  v_last_verified_at timestamptz;
  v_reconciliation_status text := 'current';
  v_provider_subscription_id uuid;
  v_summary record;
  v_result text;
  v_summary_refresh_started boolean := false;
begin
  if v_environment not in ('live', 'test') then
    return query
    select
      'invalid_environment'::text,
      v_environment,
      v_event_type,
      v_event_subtype,
      false,
      false,
      false,
      false,
      true,
      false,
      false;
    return;
  end if;

  if v_event_ref is null
    or v_event_type = ''
    or v_event_created_at is null
    or v_payload_hash is null
    or length(v_payload_hash) < 32
    or v_payload_hash ~ '[[:space:]]'
  then
    return query
    select
      'failed'::text,
      v_environment,
      v_event_type,
      v_event_subtype,
      false,
      false,
      false,
      false,
      true,
      false,
      false;
    return;
  end if;

  v_resolver_environment := case when v_environment = 'live' then 'production' else 'sandbox' end;

  perform pg_advisory_xact_lock(
    hashtextextended('billing.process_stripe_subscription_event:stripe:' || v_environment || ':' || v_event_ref, 0)
  );

  select *
  into v_event
  from billing.provider_events pe
  where pe.provider = 'stripe'
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
      select
        'payload_conflict'::text,
        v_environment,
        v_event_type,
        v_event_subtype,
        false,
        false,
        false,
        false,
        true,
        false,
        false;
      return;
    end if;

    if v_event.processing_status in ('processed', 'ignored') and v_event.processed_at is not null then
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
        occurred_at = v_event_created_at,
        effective_at = v_event_created_at,
        processing_status = 'processing',
        attempt_count = least(attempt_count + 1, 100),
        last_attempted_at = v_as_of,
        related_user_id = p_user_id,
        provider_customer_ref = v_customer_ref,
        provider_subscription_ref = v_subscription_ref,
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
      provider_customer_ref,
      provider_subscription_ref,
      payload_hash,
      created_at,
      updated_at
    )
    values (
      'stripe',
      v_environment,
      v_event_ref,
      v_event_type,
      v_event_subtype,
      v_event_created_at,
      v_event_created_at,
      v_as_of,
      'processing',
      1,
      v_as_of,
      false,
      p_user_id,
      v_customer_ref,
      v_subscription_ref,
      v_payload_hash,
      v_as_of,
      v_as_of
    )
    returning *
    into v_event;
  end if;

  if v_event_type not in (
    'checkout.session.completed',
    'customer.subscription.created',
    'customer.subscription.updated',
    'customer.subscription.deleted',
    'invoice.payment_failed',
    'invoice.payment_succeeded'
  ) then
    update billing.provider_events
    set processing_status = 'ignored',
        processed_at = v_as_of,
        last_error_code = 'unsupported_event_type',
        reconciliation_required = false,
        updated_at = v_as_of
    where id = v_event.id;

    return query
    select
      'unsupported_event_type'::text,
      v_environment,
      v_event_type,
      v_event_subtype,
      false,
      false,
      false,
      false,
      false,
      false,
      false;
    return;
  end if;

  if p_user_id is null then
    update billing.provider_events
    set processing_status = 'reconciliation_required',
        last_error_code = 'missing_user',
        reconciliation_required = true,
        updated_at = v_as_of
    where id = v_event.id;

    return query
    select 'missing_user'::text, v_environment, v_event_type, v_event_subtype, false, false, false, false, true, false, false;
    return;
  end if;

  if v_subscription_ref is null then
    update billing.provider_events
    set processing_status = 'reconciliation_required',
        last_error_code = 'missing_subscription_reference',
        reconciliation_required = true,
        updated_at = v_as_of
    where id = v_event.id;

    return query
    select
      'missing_subscription_reference'::text,
      v_environment,
      v_event_type,
      v_event_subtype,
      false,
      false,
      false,
      false,
      true,
      false,
      false;
    return;
  end if;

  if not coalesce(p_product_allowed, false)
    or v_product_ref is null
    or v_product_ref !~ '^price_[A-Za-z0-9_]+$'
  then
    update billing.provider_events
    set processing_status = 'reconciliation_required',
        provider_customer_ref = v_customer_ref,
        provider_subscription_ref = v_subscription_ref,
        last_error_code = 'product_not_allowed',
        reconciliation_required = true,
        updated_at = v_as_of
    where id = v_event.id;

    return query
    select 'product_not_allowed'::text, v_environment, v_event_type, v_event_subtype, false, false, false, false, true, false, false;
    return;
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('billing.process_stripe_subscription_event:subscription:' || v_environment || ':' || v_subscription_ref, 0)
  );

  select exists (
    select 1
    from billing.provider_subscriptions ps
    where ps.provider = 'stripe'
      and ps.provider_subscription_ref = v_subscription_ref
      and ps.environment <> v_environment
      and ps.reconciliation_status <> 'superseded'
  )
  into v_cross_environment_conflict;

  if v_cross_environment_conflict then
    update billing.provider_events
    set processing_status = 'reconciliation_required',
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
  where ps.provider = 'stripe'
    and ps.environment = v_environment
    and ps.provider_subscription_ref = v_subscription_ref
    and ps.reconciliation_status <> 'superseded'
  for update;
  v_existing_found := found;

  if v_existing_found and v_existing.user_id is distinct from p_user_id then
    update billing.provider_events
    set processing_status = 'reconciliation_required',
        provider_subscription_id = v_existing.id,
        last_error_code = 'ownership_conflict',
        reconciliation_required = true,
        updated_at = v_as_of
    where id = v_event.id;

    return query
    select 'ownership_conflict'::text, v_environment, v_event_type, v_event_subtype, false, false, false, false, true, false, false;
    return;
  end if;

  if v_event_type = 'invoice.payment_failed' then
    v_canonical_status := 'billing_retry';
  elsif v_event_type = 'customer.subscription.deleted'
    or v_stripe_status in ('canceled', 'unpaid', 'incomplete_expired')
  then
    v_canonical_status := 'expired';
  elsif v_stripe_status in ('active', 'trialing') then
    if v_period_end is null or v_period_end <= v_as_of then
      v_canonical_status := 'unknown_needs_reconciliation';
    elsif v_cancel_at_period_end then
      v_canonical_status := 'cancelled_active_until_period_end';
    else
      v_canonical_status := 'active';
    end if;
  elsif v_stripe_status = 'past_due' then
    v_canonical_status := 'billing_retry';
  elsif v_stripe_status = 'incomplete' then
    v_canonical_status := 'pending';
  elsif v_stripe_status = 'paused' then
    v_canonical_status := 'paused';
  else
    v_canonical_status := 'unknown_needs_reconciliation';
  end if;

  if v_canonical_status = 'unknown_needs_reconciliation' then
    update billing.provider_events
    set processing_status = 'reconciliation_required',
        last_error_code = 'requires_reconciliation',
        reconciliation_required = true,
        updated_at = v_as_of
    where id = v_event.id;

    return query
    select
      'requires_reconciliation'::text,
      v_environment,
      v_event_type,
      v_event_subtype,
      false,
      false,
      false,
      false,
      true,
      false,
      false;
    return;
  end if;

  v_existing_timestamp := null;
  if v_existing_found then
    v_existing_timestamp := coalesce(v_existing.last_event_at, v_existing.last_verified_at, v_existing.updated_at, v_existing.created_at);
  end if;

  if v_existing_found and v_event_created_at < v_existing_timestamp then
    update billing.provider_events
    set processing_status = 'ignored',
        provider_subscription_id = v_existing.id,
        processed_at = v_as_of,
        last_error_code = 'stale_event_ignored',
        reconciliation_required = false,
        updated_at = v_as_of
    where id = v_event.id;

    return query
    select
      'stale_event_ignored'::text,
      v_environment,
      v_event_type,
      v_event_subtype,
      false,
      false,
      false,
      false,
      false,
      true,
      false;
    return;
  end if;

  v_started_at := coalesce(v_existing.started_at, v_period_start, v_event_created_at);
  v_auto_renews := case
    when v_canonical_status = 'active' then true
    when v_canonical_status in ('cancelled_active_until_period_end', 'expired') then false
    else null::boolean
  end;
  v_billing_retry_started_at := case when v_canonical_status = 'billing_retry' then v_event_created_at else null::timestamptz end;
  v_expires_at := case when v_canonical_status = 'expired' then coalesce(v_period_end, v_event_created_at) else null::timestamptz end;
  v_paused_at := case when v_canonical_status = 'paused' then v_event_created_at else null::timestamptz end;
  v_last_verified_at := case
    when v_canonical_status in ('active', 'cancelled_active_until_period_end', 'expired') then v_event_created_at
    else null::timestamptz
  end;
  v_reconciliation_status := case
    when v_canonical_status in ('billing_retry', 'pending', 'paused') then 'needs_verification'
    else 'current'
  end;

  begin
    if v_existing_found then
      update billing.provider_subscriptions
      set user_id = p_user_id,
          provider_product_ref = v_product_ref,
          provider_customer_ref = coalesce(v_customer_ref, provider_customer_ref),
          product_tier = 'pro',
          status = v_canonical_status,
          auto_renews = v_auto_renews,
          cancel_at_period_end = v_canonical_status = 'cancelled_active_until_period_end',
          started_at = v_started_at,
          current_period_start = v_period_start,
          current_period_end = case
            when v_canonical_status in ('active', 'cancelled_active_until_period_end', 'billing_retry') then v_period_end
            else null::timestamptz
          end,
          grace_period_ends_at = null,
          billing_retry_started_at = v_billing_retry_started_at,
          expires_at = v_expires_at,
          revoked_at = null,
          refunded_at = null,
          paused_at = v_paused_at,
          last_verified_at = v_last_verified_at,
          last_event_at = v_event_created_at,
          last_provider_event_ref = v_event_ref,
          reconciliation_status = v_reconciliation_status,
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
        provider_customer_ref,
        provider_subscription_ref,
        status,
        auto_renews,
        cancel_at_period_end,
        started_at,
        current_period_start,
        current_period_end,
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
        p_user_id,
        'stripe',
        v_environment,
        'pro',
        v_product_ref,
        v_customer_ref,
        v_subscription_ref,
        v_canonical_status,
        v_auto_renews,
        v_canonical_status = 'cancelled_active_until_period_end',
        v_started_at,
        v_period_start,
        case
          when v_canonical_status in ('active', 'cancelled_active_until_period_end', 'billing_retry') then v_period_end
          else null::timestamptz
        end,
        v_billing_retry_started_at,
        v_expires_at,
        v_paused_at,
        v_last_verified_at,
        v_event_created_at,
        v_event_ref,
        v_reconciliation_status,
        v_as_of,
        v_as_of
      )
      returning id
      into v_provider_subscription_id;
    end if;

    v_summary_refresh_started := true;

    select *
    into strict v_summary
    from billing.refresh_effective_entitlement_summary(p_user_id, v_resolver_environment, v_as_of);

    if coalesce(v_summary.applied, false) is not true then
      raise exception 'billing_summary_refresh_failed';
    end if;

    update billing.provider_events
    set processing_status = 'processed',
        processed_at = v_as_of,
        provider_subscription_id = v_provider_subscription_id,
        provider_customer_ref = v_customer_ref,
        provider_subscription_ref = v_subscription_ref,
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
      select
        v_result,
        v_environment,
        v_event_type,
        v_event_subtype,
        false,
        false,
        false,
        false,
        true,
        false,
        true;
      return;
  end;

  return query
  select
    'processed'::text,
    v_environment,
    v_event_type,
    v_event_subtype,
    true,
    false,
    true,
    true,
    false,
    false,
    false;
end;
$$;

comment on function billing.process_stripe_subscription_event(text, text, text, text, timestamptz, uuid, text, text, text, text, timestamptz, timestamptz, boolean, text, boolean, timestamptz) is
  'Service-role-only transactional processor for normalized, already verified Stripe subscription events. Records provider-event idempotency, mutates Stripe provider state, refreshes compatibility entitlements, and returns sanitized classifications without accepting raw Stripe payloads.';

revoke all on function billing.process_stripe_subscription_event(text, text, text, text, timestamptz, uuid, text, text, text, text, timestamptz, timestamptz, boolean, text, boolean, timestamptz) from public;
revoke all on function billing.process_stripe_subscription_event(text, text, text, text, timestamptz, uuid, text, text, text, text, timestamptz, timestamptz, boolean, text, boolean, timestamptz) from anon;
revoke all on function billing.process_stripe_subscription_event(text, text, text, text, timestamptz, uuid, text, text, text, text, timestamptz, timestamptz, boolean, text, boolean, timestamptz) from authenticated;
grant execute on function billing.process_stripe_subscription_event(text, text, text, text, timestamptz, uuid, text, text, text, text, timestamptz, timestamptz, boolean, text, boolean, timestamptz) to service_role;
