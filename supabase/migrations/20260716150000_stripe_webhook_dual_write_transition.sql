-- Stripe webhook provider-neutral dual-write transition.
--
-- This migration adds a private service-role operation for the existing Stripe
-- webhook to call after Stripe signature verification and price/user
-- normalization. It delegates provider state to
-- billing.process_stripe_subscription_event, then preserves the legacy
-- Stripe-specific columns on public.entitlements in the same transaction.
--
-- It intentionally does not add triggers, scheduled jobs, public APIs, webhook
-- endpoint changes, StoreKit, Google Play Billing, analytics, or browser code.

create or replace function billing.process_stripe_webhook_transition_event(
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
  p_as_of timestamptz default now()
)
returns table (
  result text,
  provider_environment text,
  event_type text,
  event_subtype text,
  processed boolean,
  provider_result text,
  already_processed boolean,
  legacy_fields_updated boolean,
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
  v_event_type text := lower(btrim(coalesce(p_event_type, '')));
  v_event_subtype text := nullif(lower(btrim(coalesce(p_event_subtype, ''))), '');
  v_as_of timestamptz := coalesce(p_as_of, now());
  v_provider record;
  v_result text := 'failed';
  v_provider_environment text := v_environment;
  v_provider_event_type text := v_event_type;
  v_provider_event_subtype text := v_event_subtype;
  v_already_processed boolean := false;
  v_provider_subscription_changed boolean := false;
  v_compatibility_refreshed boolean := false;
  v_reconciliation_required boolean := true;
  v_stale_event_ignored boolean := false;
  v_provider_retryable boolean := true;
  v_legacy_update_count integer := 0;
begin
  if v_environment not in ('live', 'test') then
    return query
    select
      'invalid_environment'::text,
      v_environment,
      v_event_type,
      v_event_subtype,
      false,
      'invalid_environment'::text,
      false,
      false,
      false,
      false,
      true,
      false,
      false;
    return;
  end if;

  begin
    select *
    into strict v_provider
    from billing.process_stripe_subscription_event(
      v_environment,
      p_provider_event_ref,
      v_event_type,
      v_event_subtype,
      p_event_created_at,
      p_user_id,
      p_provider_customer_ref,
      p_provider_subscription_ref,
      p_provider_product_ref,
      p_provider_status,
      p_current_period_start,
      p_current_period_end,
      p_cancel_at_period_end,
      p_payload_hash,
      true,
      v_as_of
    );

    v_result := v_provider.result;
    v_provider_environment := v_provider.provider_environment;
    v_provider_event_type := v_provider.event_type;
    v_provider_event_subtype := v_provider.event_subtype;
    v_already_processed := coalesce(v_provider.already_processed, false);
    v_provider_subscription_changed := coalesce(v_provider.provider_subscription_changed, false);
    v_compatibility_refreshed := coalesce(v_provider.compatibility_refreshed, false);
    v_reconciliation_required := coalesce(v_provider.reconciliation_required, true);
    v_stale_event_ignored := coalesce(v_provider.stale_event_ignored, false);
    v_provider_retryable := coalesce(v_provider.retryable, true);

    if v_result in ('processed', 'already_processed') then
      update public.entitlements
      set stripe_customer_id = nullif(btrim(p_provider_customer_ref), ''),
          stripe_subscription_id = nullif(btrim(p_provider_subscription_ref), ''),
          stripe_price_id = nullif(btrim(p_provider_product_ref), ''),
          stripe_status = nullif(lower(btrim(coalesce(p_provider_status, ''))), ''),
          updated_at = v_as_of
      where user_id = p_user_id;

      get diagnostics v_legacy_update_count = row_count;

      if v_legacy_update_count <> 1 then
        v_result := 'legacy_field_update_failed';
        raise exception 'legacy_field_update_failed';
      end if;
    elsif v_result = 'stale_event_ignored' then
      return query
      select
        v_result,
        v_provider_environment,
        v_provider_event_type,
        v_provider_event_subtype,
        false,
        v_result,
        v_already_processed,
        false,
        v_provider_subscription_changed,
        v_compatibility_refreshed,
        v_reconciliation_required,
        true,
        v_provider_retryable;
      return;
    else
      raise exception 'provider_transition_failed';
    end if;

    return query
    select
      v_result,
      v_provider_environment,
      v_provider_event_type,
      v_provider_event_subtype,
      true,
      v_result,
      v_already_processed,
      true,
      v_provider_subscription_changed,
      v_compatibility_refreshed,
      v_reconciliation_required,
      v_stale_event_ignored,
      false;
    return;
  exception
    when others then
      return query
      select
        coalesce(nullif(v_result, ''), 'failed')::text,
        v_environment,
        v_event_type,
        v_event_subtype,
        false,
        coalesce(nullif(v_result, ''), 'failed')::text,
        v_already_processed,
        false,
        v_provider_subscription_changed,
        v_compatibility_refreshed,
        v_reconciliation_required,
        v_stale_event_ignored,
        case
          when coalesce(nullif(v_result, ''), 'failed') in (
            'summary_refresh_failed',
            'legacy_field_update_failed',
            'failed'
          ) then true
          when coalesce(nullif(v_result, ''), 'failed') in (
            'payload_conflict',
            'ownership_conflict',
            'environment_conflict',
            'product_not_allowed',
            'missing_user',
            'missing_subscription_reference',
            'requires_reconciliation',
            'invalid_environment'
          ) then false
          else true
        end;
      return;
  end;
end;
$$;

comment on function billing.process_stripe_webhook_transition_event(text, text, text, text, timestamptz, uuid, text, text, text, text, timestamptz, timestamptz, boolean, text, timestamptz) is
  'Service-role-only transition wrapper for the verified Stripe webhook. Delegates provider-neutral subscription processing, preserves legacy Stripe columns on public.entitlements, and rolls back provider/compatibility writes when a required transition step fails.';

revoke all on function billing.process_stripe_webhook_transition_event(text, text, text, text, timestamptz, uuid, text, text, text, text, timestamptz, timestamptz, boolean, text, timestamptz) from public;
revoke all on function billing.process_stripe_webhook_transition_event(text, text, text, text, timestamptz, uuid, text, text, text, text, timestamptz, timestamptz, boolean, text, timestamptz) from anon;
revoke all on function billing.process_stripe_webhook_transition_event(text, text, text, text, timestamptz, uuid, text, text, text, text, timestamptz, timestamptz, boolean, text, timestamptz) from authenticated;
grant execute on function billing.process_stripe_webhook_transition_event(text, text, text, text, timestamptz, uuid, text, text, text, text, timestamptz, timestamptz, boolean, text, timestamptz) to service_role;
