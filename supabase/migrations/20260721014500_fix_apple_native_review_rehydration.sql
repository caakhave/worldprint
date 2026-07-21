-- Rehydrate production TestFlight/App Review sandbox entitlements on idempotent
-- Apple purchase verification without writing sandbox access into public.entitlements.

create or replace function public.process_apple_purchase_verification(
  p_provider_environment text,
  p_deployment_mode text,
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
  native_review_entitlement_refreshed boolean,
  entitlement_scope text,
  reconciliation_required boolean,
  retryable boolean
)
language plpgsql
volatile
security invoker
set search_path = pg_catalog, public, billing
as $$
#variable_conflict use_column
declare
  v_environment text := lower(btrim(coalesce(p_provider_environment, '')));
  v_deployment_mode text := lower(btrim(coalesce(p_deployment_mode, '')));
  v_row record;
  v_native_review boolean := v_deployment_mode = 'production' and v_environment = 'sandbox';
  v_native_review_ownership_confirmed boolean := false;
  v_native_review_entitlement_active boolean := false;
  v_native_review_summary record;
begin
  if not billing.apple_deployment_environment_allowed(v_deployment_mode, v_environment) then
    return query
    select 'invalid_deployment_environment'::text, v_environment, lower(btrim(coalesce(p_event_type, 'purchase_verification'))),
      nullif(lower(btrim(coalesce(p_event_subtype, ''))), ''), false, false, false, false, false, 'none'::text, true, false;
    return;
  end if;

  perform set_config('cgy.apple_deployment_mode', v_deployment_mode, true);

  select *
  into strict v_row
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

  if v_native_review then
    if coalesce(v_row.compatibility_refreshed, false) then
      v_native_review_ownership_confirmed := true;
    elsif coalesce(v_row.already_processed, false)
      and not coalesce(v_row.reconciliation_required, false)
      and not coalesce(v_row.retryable, false)
    then
      select exists (
        select 1
        from billing.provider_events pe
        join billing.provider_subscriptions ps on ps.id = pe.provider_subscription_id
        join billing.apple_transaction_chains ac on ac.provider_subscription_id = ps.id
        where pe.provider = 'apple'
          and pe.environment = 'sandbox'
          and pe.provider_event_ref = p_provider_event_ref
          and pe.payload_hash = p_payload_hash
          and pe.processing_status = 'processed'
          and pe.processed_at is not null
          and pe.reconciliation_required is false
          and pe.related_user_id = p_user_id
          and pe.provider_original_transaction_ref = p_original_transaction_id_fingerprint
          and ps.provider = 'apple'
          and ps.environment = 'sandbox'
          and ps.user_id = p_user_id
          and ps.app_account_token = p_user_id
          and ps.provider_original_transaction_ref = p_original_transaction_id_fingerprint
          and ps.reconciliation_status = 'current'
          and ac.provider_environment = 'sandbox'
          and ac.user_id = p_user_id
          and ac.app_account_token = p_user_id
          and ac.original_transaction_id_fingerprint = p_original_transaction_id_fingerprint
      )
      into v_native_review_ownership_confirmed;

      if v_native_review_ownership_confirmed then
        select *
        into strict v_native_review_summary
        from billing.refresh_effective_entitlement_summary(p_user_id, v_environment, p_as_of);

        v_native_review_ownership_confirmed := coalesce(v_native_review_summary.applied, false);
      end if;
    end if;

    if v_native_review_ownership_confirmed then
      select exists (
        select 1
        from billing.apple_native_sandbox_entitlements ne
        where ne.user_id = p_user_id
          and ne.plan = 'pro'
          and ne.status = 'active'
          and (ne.current_period_end is null or ne.current_period_end > p_as_of)
      )
      into v_native_review_entitlement_active;
    end if;
  end if;

  return query
  select
    v_row.result::text,
    v_row.provider_environment::text,
    v_row.event_type::text,
    v_row.event_subtype::text,
    v_row.processed::boolean,
    v_row.already_processed::boolean,
    v_row.provider_subscription_changed::boolean,
    (coalesce(v_row.compatibility_refreshed, false) and not v_native_review)::boolean,
    v_native_review_entitlement_active::boolean,
    case
      when v_native_review_entitlement_active then 'native_review'
      when coalesce(v_row.compatibility_refreshed, false) and not v_native_review then 'live'
      else 'none'
    end::text,
    v_row.reconciliation_required::boolean,
    v_row.retryable::boolean;
end;
$$;

comment on function public.process_apple_purchase_verification(text, text, uuid, text, text, text, text, timestamptz, text, text, text, text, text, text, text, text, uuid, text, boolean, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, boolean, timestamptz) is
  'Service-role-only Apple purchase verification bridge with explicit deployment policy, live entitlement projection, and idempotent production sandbox native-review rehydration.';

revoke all on function public.process_apple_purchase_verification(text, text, uuid, text, text, text, text, timestamptz, text, text, text, text, text, text, text, text, uuid, text, boolean, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, boolean, timestamptz) from public;
revoke all on function public.process_apple_purchase_verification(text, text, uuid, text, text, text, text, timestamptz, text, text, text, text, text, text, text, text, uuid, text, boolean, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, boolean, timestamptz) from anon;
revoke all on function public.process_apple_purchase_verification(text, text, uuid, text, text, text, text, timestamptz, text, text, text, text, text, text, text, text, uuid, text, boolean, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, boolean, timestamptz) from authenticated;
grant execute on function public.process_apple_purchase_verification(text, text, uuid, text, text, text, text, timestamptz, text, text, text, text, text, text, text, text, uuid, text, boolean, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, boolean, timestamptz) to service_role;
