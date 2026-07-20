-- Apple dual-environment entitlement isolation.
--
-- This migration lets the Apple server stack process both sandbox and
-- production Apple-signed payloads while preventing production-project
-- sandbox purchases from writing the normal live public.entitlements
-- compatibility row. Sandbox review/TestFlight access is stored in a private
-- Apple-specific projection and must still be activated in the native app only
-- after backend verification of StoreKit-signed current entitlement material.

create table if not exists billing.apple_native_sandbox_entitlements (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  plan text not null default 'free',
  status text not null default 'free',
  cancel_at_period_end boolean not null default false,
  current_period_end timestamptz,
  provider_subscription_id uuid references billing.provider_subscriptions(id) on delete set null,
  last_verified_at timestamptz,
  updated_at timestamptz not null default now()
);

comment on table billing.apple_native_sandbox_entitlements is
  'Private production TestFlight/App Review Apple sandbox entitlement projection. It is not the live website entitlement and is never written by unverified client state.';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'apple_native_sandbox_entitlements_plan_check'
      and conrelid = 'billing.apple_native_sandbox_entitlements'::regclass
  ) then
    alter table billing.apple_native_sandbox_entitlements
      add constraint apple_native_sandbox_entitlements_plan_check
      check (plan in ('free', 'pro'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'apple_native_sandbox_entitlements_status_check'
      and conrelid = 'billing.apple_native_sandbox_entitlements'::regclass
  ) then
    alter table billing.apple_native_sandbox_entitlements
      add constraint apple_native_sandbox_entitlements_status_check
      check (status in ('free', 'active', 'past_due', 'canceled'));
  end if;
end $$;

create index if not exists apple_native_sandbox_entitlements_subscription_idx
  on billing.apple_native_sandbox_entitlements(provider_subscription_id);

revoke all on table billing.apple_native_sandbox_entitlements from public;
revoke all on table billing.apple_native_sandbox_entitlements from anon;
revoke all on table billing.apple_native_sandbox_entitlements from authenticated;
grant all privileges on table billing.apple_native_sandbox_entitlements to service_role;

alter table billing.apple_native_sandbox_entitlements enable row level security;
alter table billing.apple_native_sandbox_entitlements force row level security;

create or replace function billing.apple_deployment_environment_allowed(
  p_deployment_mode text,
  p_provider_environment text
)
returns boolean
language sql
stable
security invoker
set search_path = pg_catalog
as $$
  select
    case lower(btrim(coalesce(p_deployment_mode, '')))
      when 'staging' then lower(btrim(coalesce(p_provider_environment, ''))) = 'sandbox'
      when 'production' then lower(btrim(coalesce(p_provider_environment, ''))) in ('sandbox', 'production')
      else false
    end;
$$;

revoke all on function billing.apple_deployment_environment_allowed(text, text) from public;
revoke all on function billing.apple_deployment_environment_allowed(text, text) from anon;
revoke all on function billing.apple_deployment_environment_allowed(text, text) from authenticated;
grant execute on function billing.apple_deployment_environment_allowed(text, text) to service_role;

create or replace function billing.refresh_effective_entitlement_summary(
  p_user_id uuid,
  p_environment text,
  p_as_of timestamptz default now()
)
returns table (
  user_id uuid,
  environment text,
  plan text,
  status text,
  cancel_at_period_end boolean,
  current_period_end timestamptz,
  computed_at timestamptz,
  updated_at timestamptz,
  management_provider text,
  multiple_active_providers boolean,
  requires_reconciliation boolean,
  decision_reason text,
  write_action text,
  applied boolean,
  error_code text
)
language plpgsql
volatile
security invoker
set search_path = pg_catalog, billing, public
as $$
declare
  v_environment text := lower(btrim(coalesce(p_environment, '')));
  v_as_of timestamptz := coalesce(p_as_of, now());
  v_projection record;
  v_row_exists boolean := false;
  v_user_exists boolean := false;
  v_updated_at timestamptz;
  v_deployment_mode text := lower(btrim(coalesce(current_setting('cgy.apple_deployment_mode', true), '')));
  v_native_review_write boolean := v_deployment_mode = 'production' and v_environment = 'sandbox';
  v_provider_subscription_id uuid;
begin
  if p_user_id is null then
    return query
    select null::uuid, v_environment, null::text, null::text, null::boolean, null::timestamptz,
      v_as_of, null::timestamptz, null::text, null::boolean, null::boolean, null::text,
      'skipped'::text, false, 'invalid_user'::text;
    return;
  end if;

  if v_environment not in ('production', 'sandbox') then
    return query
    select p_user_id, v_environment, null::text, null::text, null::boolean, null::timestamptz,
      v_as_of, null::timestamptz, null::text, null::boolean, null::boolean, null::text,
      'skipped'::text, false, 'invalid_environment'::text;
    return;
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('billing.refresh_effective_entitlement_summary:' || p_user_id::text, 0)
  );

  select exists (
    select 1
    from public.profiles p
    where p.id = p_user_id
  )
  into v_user_exists;

  if not v_user_exists then
    return query
    select p_user_id, v_environment, null::text, null::text, null::boolean, null::timestamptz,
      v_as_of, null::timestamptz, null::text, null::boolean, null::boolean, null::text,
      'skipped'::text, false, 'user_not_found'::text;
    return;
  end if;

  select *
  into strict v_projection
  from billing.project_effective_entitlement_summary(p_user_id, v_environment, v_as_of);

  if v_native_review_write then
    select ps.id
    into v_provider_subscription_id
    from billing.provider_subscriptions ps
    where ps.user_id = p_user_id
      and ps.provider = 'apple'
      and ps.environment = 'sandbox'
      and ps.reconciliation_status <> 'superseded'
    order by
      coalesce(ps.last_verified_at, ps.last_event_at, ps.updated_at, ps.created_at) desc nulls last,
      ps.updated_at desc,
      ps.id desc
    limit 1;

    insert into billing.apple_native_sandbox_entitlements (
      user_id,
      plan,
      status,
      cancel_at_period_end,
      current_period_end,
      provider_subscription_id,
      last_verified_at,
      updated_at
    )
    values (
      p_user_id,
      v_projection.plan,
      v_projection.status,
      coalesce(v_projection.cancel_at_period_end, false),
      v_projection.current_period_end,
      v_provider_subscription_id,
      v_as_of,
      v_as_of
    )
    on conflict (user_id) do update
      set plan = excluded.plan,
          status = excluded.status,
          cancel_at_period_end = excluded.cancel_at_period_end,
          current_period_end = excluded.current_period_end,
          provider_subscription_id = excluded.provider_subscription_id,
          last_verified_at = excluded.last_verified_at,
          updated_at = excluded.updated_at
    returning billing.apple_native_sandbox_entitlements.updated_at
    into v_updated_at;

    return query
    select p_user_id, v_environment, v_projection.plan::text, v_projection.status::text,
      v_projection.cancel_at_period_end::boolean, v_projection.current_period_end::timestamptz,
      v_projection.computed_at::timestamptz, v_updated_at, v_projection.management_provider::text,
      v_projection.multiple_active_providers::boolean, v_projection.requires_reconciliation::boolean,
      v_projection.decision_reason::text, 'native_review_updated'::text, true, null::text;
    return;
  end if;

  select exists (
    select 1
    from public.entitlements e
    where e.user_id = p_user_id
  )
  into v_row_exists;

  if v_row_exists then
    perform 1
    from public.entitlements e
    where e.user_id = p_user_id
    for update;
  end if;

  insert into public.entitlements (
    user_id,
    plan,
    status,
    cancel_at_period_end,
    current_period_end,
    updated_at
  )
  values (
    p_user_id,
    v_projection.plan,
    v_projection.status,
    v_projection.cancel_at_period_end,
    v_projection.current_period_end,
    v_as_of
  )
  on conflict on constraint entitlements_pkey do update
    set plan = excluded.plan,
        status = excluded.status,
        cancel_at_period_end = excluded.cancel_at_period_end,
        current_period_end = excluded.current_period_end,
        updated_at = excluded.updated_at
  returning public.entitlements.updated_at
  into v_updated_at;

  return query
  select p_user_id, v_environment, v_projection.plan::text, v_projection.status::text,
    v_projection.cancel_at_period_end::boolean, v_projection.current_period_end::timestamptz,
    v_projection.computed_at::timestamptz, v_updated_at, v_projection.management_provider::text,
    v_projection.multiple_active_providers::boolean, v_projection.requires_reconciliation::boolean,
    v_projection.decision_reason::text, case when v_row_exists then 'updated' else 'inserted' end,
    true, null::text;
end;
$$;

comment on function billing.refresh_effective_entitlement_summary(uuid, text, timestamptz) is
  'Service-role-only transactional writer that refreshes public.entitlements for live/staging entitlement lanes and writes production Apple sandbox review access only to billing.apple_native_sandbox_entitlements.';

revoke all on function billing.refresh_effective_entitlement_summary(uuid, text, timestamptz) from public;
revoke all on function billing.refresh_effective_entitlement_summary(uuid, text, timestamptz) from anon;
revoke all on function billing.refresh_effective_entitlement_summary(uuid, text, timestamptz) from authenticated;
grant execute on function billing.refresh_effective_entitlement_summary(uuid, text, timestamptz) to service_role;

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
declare
  v_environment text := lower(btrim(coalesce(p_provider_environment, '')));
  v_deployment_mode text := lower(btrim(coalesce(p_deployment_mode, '')));
  v_row record;
  v_native_review boolean := v_deployment_mode = 'production' and v_environment = 'sandbox';
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
    (coalesce(v_row.compatibility_refreshed, false) and v_native_review)::boolean,
    case
      when coalesce(v_row.compatibility_refreshed, false) and v_native_review then 'native_review'
      when coalesce(v_row.compatibility_refreshed, false) then 'live'
      else 'none'
    end::text,
    v_row.reconciliation_required::boolean,
    v_row.retryable::boolean;
end;
$$;

comment on function public.process_apple_purchase_verification(text, text, uuid, text, text, text, text, timestamptz, text, text, text, text, text, text, text, text, uuid, text, boolean, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, boolean, timestamptz) is
  'Service-role-only Apple purchase verification bridge with explicit staging/production deployment policy and production sandbox entitlement isolation.';

revoke all on function public.process_apple_purchase_verification(text, text, uuid, text, text, text, text, timestamptz, text, text, text, text, text, text, text, text, uuid, text, boolean, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, boolean, timestamptz) from public;
revoke all on function public.process_apple_purchase_verification(text, text, uuid, text, text, text, text, timestamptz, text, text, text, text, text, text, text, text, uuid, text, boolean, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, boolean, timestamptz) from anon;
revoke all on function public.process_apple_purchase_verification(text, text, uuid, text, text, text, text, timestamptz, text, text, text, text, text, text, text, text, uuid, text, boolean, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, boolean, timestamptz) from authenticated;
grant execute on function public.process_apple_purchase_verification(text, text, uuid, text, text, text, text, timestamptz, text, text, text, text, text, text, text, text, uuid, text, boolean, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, boolean, timestamptz) to service_role;

create or replace function public.process_apple_server_notification_event(
  p_provider_environment text,
  p_deployment_mode text,
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
  unsupported_ignored boolean,
  retryable boolean
)
language plpgsql
volatile
security invoker
set search_path = pg_catalog, public, billing
as $$
declare
  v_environment text := lower(btrim(coalesce(p_provider_environment, '')));
  v_deployment_mode text := lower(btrim(coalesce(p_deployment_mode, '')));
  v_row record;
  v_native_review boolean := v_deployment_mode = 'production' and v_environment = 'sandbox';
begin
  if not billing.apple_deployment_environment_allowed(v_deployment_mode, v_environment) then
    return query
    select 'invalid_deployment_environment'::text, v_environment, upper(btrim(coalesce(p_event_type, ''))),
      nullif(upper(btrim(coalesce(p_event_subtype, ''))), ''), false, false, false, false, false,
      'none'::text, true, false, false;
    return;
  end if;

  perform set_config('cgy.apple_deployment_mode', v_deployment_mode, true);

  select *
  into strict v_row
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
    (coalesce(v_row.compatibility_refreshed, false) and v_native_review)::boolean,
    case
      when coalesce(v_row.compatibility_refreshed, false) and v_native_review then 'native_review'
      when coalesce(v_row.compatibility_refreshed, false) then 'live'
      else 'none'
    end::text,
    v_row.reconciliation_required::boolean,
    v_row.unsupported_ignored::boolean,
    v_row.retryable::boolean;
end;
$$;

comment on function public.process_apple_server_notification_event(text, text, text, text, text, timestamptz, text, text, text, text, text, text, text, text, uuid, text, boolean, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, boolean, timestamptz) is
  'Service-role-only App Store Server Notifications V2 bridge with explicit staging/production deployment policy and production sandbox entitlement isolation.';

revoke all on function public.process_apple_server_notification_event(text, text, text, text, text, timestamptz, text, text, text, text, text, text, text, text, uuid, text, boolean, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, boolean, timestamptz) from public;
revoke all on function public.process_apple_server_notification_event(text, text, text, text, text, timestamptz, text, text, text, text, text, text, text, text, uuid, text, boolean, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, boolean, timestamptz) from anon;
revoke all on function public.process_apple_server_notification_event(text, text, text, text, text, timestamptz, text, text, text, text, text, text, text, text, uuid, text, boolean, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, boolean, timestamptz) from authenticated;
grant execute on function public.process_apple_server_notification_event(text, text, text, text, text, timestamptz, text, text, text, text, text, text, text, text, uuid, text, boolean, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, boolean, timestamptz) to service_role;
