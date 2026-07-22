-- Fix Apple production-sandbox reconciliation and notification-first races.
--
-- Production TestFlight/App Review sandbox Apple purchases intentionally grant
-- native-only Pro through billing.apple_native_sandbox_entitlements while
-- public.entitlements remains Free. Reconciliation checks must use the same
-- deployment lane. A verified purchase may also arrive after an already-verified
-- App Store Server Notification for the same original transaction; once the
-- authenticated purchase binds the chain, this migration safely resolves that
-- earlier unbound notification event without replaying signed material.

create or replace function billing.repair_apple_unbound_notifications_after_purchase_verification(
  p_provider_environment text,
  p_deployment_mode text,
  p_user_id uuid,
  p_provider_event_ref text,
  p_payload_hash text,
  p_original_transaction_id_fingerprint text,
  p_as_of timestamptz default now()
)
returns integer
language plpgsql
volatile
security invoker
set search_path = pg_catalog, billing, public
as $$
#variable_conflict use_column
declare
  v_environment text := lower(btrim(coalesce(p_provider_environment, '')));
  v_deployment_mode text := lower(btrim(coalesce(p_deployment_mode, '')));
  v_user_id uuid := p_user_id;
  v_event_ref text := nullif(btrim(coalesce(p_provider_event_ref, '')), '');
  v_payload_hash text := nullif(btrim(coalesce(p_payload_hash, '')), '');
  v_original_ref text := nullif(btrim(coalesce(p_original_transaction_id_fingerprint, '')), '');
  v_as_of timestamptz := coalesce(p_as_of, now());
  v_provider_subscription_id uuid;
  v_repaired_count integer := 0;
begin
  if not billing.apple_deployment_environment_allowed(v_deployment_mode, v_environment)
    or v_user_id is null
    or v_event_ref is null
    or v_payload_hash is null
    or length(v_payload_hash) < 32
    or v_payload_hash ~ '[[:space:]]'
    or v_original_ref !~ '^apple_original_transaction_sha256_[a-f0-9]{64}$'
  then
    return 0;
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('billing.repair_apple_unbound_notifications:apple:' || v_environment || ':' || v_original_ref, 0)
  );

  select ps.id
  into v_provider_subscription_id
  from billing.apple_transaction_chains ac
  join billing.provider_subscriptions ps on ps.id = ac.provider_subscription_id
  where ac.provider_environment = v_environment
    and ac.original_transaction_id_fingerprint = v_original_ref
    and ac.user_id = v_user_id
    and ac.app_account_token = v_user_id
    and ps.provider = 'apple'
    and ps.environment = v_environment
    and ps.user_id = v_user_id
    and ps.app_account_token = v_user_id
    and ps.provider_original_transaction_ref = v_original_ref
    and ps.reconciliation_status = 'current'
    and ps.reconciliation_status <> 'superseded'
  order by
    coalesce(ps.last_verified_at, ps.last_event_at, ps.updated_at, ps.created_at) desc nulls last,
    ps.updated_at desc,
    ps.id desc
  limit 1;

  if v_provider_subscription_id is null then
    return 0;
  end if;

  update billing.provider_events pe
  set processing_status = 'processed',
      processed_at = v_as_of,
      related_user_id = v_user_id,
      provider_subscription_id = v_provider_subscription_id,
      provider_subscription_ref = v_original_ref,
      provider_original_transaction_ref = v_original_ref,
      last_error_code = null,
      reconciliation_required = false,
      updated_at = v_as_of
  where pe.provider = 'apple'
    and pe.environment = v_environment
    and pe.provider_event_ref <> v_event_ref
    and pe.provider_event_ref like 'notification:%'
    and pe.event_type <> 'TEST'
    and pe.event_type <> 'purchase_verification'
    and pe.provider_original_transaction_ref = v_original_ref
    and pe.processing_status = 'reconciliation_required'
    and pe.last_error_code = 'unbound_original_transaction'
    and pe.reconciliation_required is true
    and pe.payload_hash is not null
    and pe.provider_subscription_id is null
    and (pe.related_user_id is null or pe.related_user_id = v_user_id)
    and (pe.provider_subscription_ref is null or pe.provider_subscription_ref = v_original_ref);

  get diagnostics v_repaired_count = row_count;
  return v_repaired_count;
end;
$$;

comment on function billing.repair_apple_unbound_notifications_after_purchase_verification(text, text, uuid, text, text, text, timestamptz) is
  'Service-role-only repair for verified Apple notification-first races after authenticated purchase verification binds the same original transaction chain to the same user.';

revoke all on function billing.repair_apple_unbound_notifications_after_purchase_verification(text, text, uuid, text, text, text, timestamptz) from public;
revoke all on function billing.repair_apple_unbound_notifications_after_purchase_verification(text, text, uuid, text, text, text, timestamptz) from anon;
revoke all on function billing.repair_apple_unbound_notifications_after_purchase_verification(text, text, uuid, text, text, text, timestamptz) from authenticated;
grant execute on function billing.repair_apple_unbound_notifications_after_purchase_verification(text, text, uuid, text, text, text, timestamptz) to service_role;

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

  if (coalesce(v_row.processed, false) or coalesce(v_row.already_processed, false))
    and not coalesce(v_row.reconciliation_required, false)
    and not coalesce(v_row.retryable, false)
  then
    perform billing.repair_apple_unbound_notifications_after_purchase_verification(
      v_environment,
      v_deployment_mode,
      p_user_id,
      p_provider_event_ref,
      p_payload_hash,
      p_original_transaction_id_fingerprint,
      p_as_of
    );
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
  'Service-role-only Apple purchase verification bridge with explicit deployment policy, live entitlement projection, idempotent production sandbox native-review rehydration, and verified notification-first race repair.';

revoke all on function public.process_apple_purchase_verification(text, text, uuid, text, text, text, text, timestamptz, text, text, text, text, text, text, text, text, uuid, text, boolean, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, boolean, timestamptz) from public;
revoke all on function public.process_apple_purchase_verification(text, text, uuid, text, text, text, text, timestamptz, text, text, text, text, text, text, text, text, uuid, text, boolean, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, boolean, timestamptz) from anon;
revoke all on function public.process_apple_purchase_verification(text, text, uuid, text, text, text, text, timestamptz, text, text, text, text, text, text, text, text, uuid, text, boolean, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, boolean, timestamptz) from authenticated;
grant execute on function public.process_apple_purchase_verification(text, text, uuid, text, text, text, text, timestamptz, text, text, text, text, text, text, text, text, uuid, text, boolean, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, boolean, timestamptz) to service_role;

create or replace function billing.apple_subscription_reconciliation_candidates(
  p_environment text,
  p_deployment_mode text,
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
  with context as (
    select
      lower(btrim(coalesce(p_environment, ''))) as environment,
      lower(btrim(coalesce(p_deployment_mode, ''))) as deployment_mode,
      coalesce(p_as_of, now()) as as_of,
      coalesce(p_stale_after, interval '12 hours') as stale_after
  ),
  scoped as (
    select
      ps.*,
      e.user_id as public_entitlement_user_id,
      e.plan as public_plan,
      e.status as public_status,
      e.current_period_end as public_current_period_end,
      ne.user_id as native_entitlement_user_id,
      ne.plan as native_plan,
      ne.status as native_status,
      ne.current_period_end as native_current_period_end,
      ne.provider_subscription_id as native_provider_subscription_id,
      c.environment as requested_environment,
      c.deployment_mode,
      c.as_of,
      c.stale_after
    from context c
    join billing.provider_subscriptions ps
      on ps.provider = 'apple'
     and ps.environment = c.environment
     and ps.reconciliation_status <> 'superseded'
    left join public.entitlements e on e.user_id = ps.user_id
    left join billing.apple_native_sandbox_entitlements ne
      on ne.user_id = ps.user_id
     and ne.provider_subscription_id = ps.id
  ),
  classified as (
    select
      s.*,
      case
        when s.deployment_mode not in ('staging', 'production')
          or not billing.apple_deployment_environment_allowed(s.deployment_mode, s.requested_environment)
          then 'deployment_mode_required'
        when s.reconciliation_status <> 'current' then 'provider_reconciliation_status'
        when s.status in ('unknown_needs_reconciliation', 'billing_retry') then 'provider_state_requires_requery'
        when s.last_verified_at is null then 'never_verified'
        when s.last_verified_at < s.as_of - s.stale_after then 'stale_verification'
        when s.user_id is null then 'orphaned_subscription'
        when s.deployment_mode = 'production'
          and s.requested_environment = 'sandbox'
          and s.status in ('active', 'cancelled_active_until_period_end', 'grace_period')
          and (
            s.native_entitlement_user_id is null
            or s.native_plan <> 'pro'
            or s.native_status <> 'active'
            or s.native_provider_subscription_id is distinct from s.id
            or (s.native_current_period_end is not null and s.native_current_period_end <= s.as_of)
          )
          then 'entitlement_inconsistent'
        when s.deployment_mode = 'production'
          and s.requested_environment = 'sandbox'
          and s.status in ('expired', 'refunded', 'revoked')
          and s.native_plan = 'pro'
          and s.native_status = 'active'
          and (s.native_current_period_end is null or s.native_current_period_end > s.as_of)
          then 'inactive_provider_still_granting'
        when not (s.deployment_mode = 'production' and s.requested_environment = 'sandbox')
          and s.public_entitlement_user_id is null
          then 'missing_entitlement_projection'
        when not (s.deployment_mode = 'production' and s.requested_environment = 'sandbox')
          and s.status in ('active', 'cancelled_active_until_period_end', 'grace_period')
          and (s.public_plan <> 'pro' or s.public_status <> 'active')
          then 'entitlement_inconsistent'
        when not (s.deployment_mode = 'production' and s.requested_environment = 'sandbox')
          and s.status in ('expired', 'refunded', 'revoked')
          and s.public_plan = 'pro'
          and s.public_status = 'active'
          and s.public_current_period_end is null
          then 'inactive_provider_still_granting'
        else null::text
      end as reason
    from scoped s
  )
  select
    c.id as provider_subscription_id,
    c.environment as provider_environment,
    c.user_id,
    c.provider_original_transaction_ref as original_transaction_id_fingerprint,
    c.reason,
    c.last_verified_at,
    c.last_event_at
  from classified c
  where c.reason is not null
  order by c.last_verified_at nulls first, c.last_event_at nulls first, c.created_at;
$$;

comment on function billing.apple_subscription_reconciliation_candidates(text, text, timestamptz, interval) is
  'Read-only service-role Apple reconciliation helper with explicit deployment-mode entitlement lane selection for staging sandbox, production sandbox native review, and production live Apple state.';

revoke all on function billing.apple_subscription_reconciliation_candidates(text, text, timestamptz, interval) from public;
revoke all on function billing.apple_subscription_reconciliation_candidates(text, text, timestamptz, interval) from anon;
revoke all on function billing.apple_subscription_reconciliation_candidates(text, text, timestamptz, interval) from authenticated;
grant execute on function billing.apple_subscription_reconciliation_candidates(text, text, timestamptz, interval) to service_role;

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
  select *
  from billing.apple_subscription_reconciliation_candidates(
    p_environment,
    current_setting('cgy.apple_deployment_mode', true),
    p_as_of,
    p_stale_after
  );
$$;

comment on function billing.apple_subscription_reconciliation_candidates(text, timestamptz, interval) is
  'Compatibility wrapper for Apple reconciliation checks. Operators should prefer the explicit deployment-mode overload; without a configured session mode it reports deployment_mode_required instead of guessing.';

revoke all on function billing.apple_subscription_reconciliation_candidates(text, timestamptz, interval) from public;
revoke all on function billing.apple_subscription_reconciliation_candidates(text, timestamptz, interval) from anon;
revoke all on function billing.apple_subscription_reconciliation_candidates(text, timestamptz, interval) from authenticated;
grant execute on function billing.apple_subscription_reconciliation_candidates(text, timestamptz, interval) to service_role;
