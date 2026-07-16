\set ON_ERROR_STOP on

begin;

create function pg_temp.assert_true(p_condition boolean, p_message text)
returns void
language plpgsql
as $$
begin
  if coalesce(p_condition, false) is not true then
    raise exception 'assertion failed: %', p_message;
  end if;
end;
$$;

create function pg_temp.assert_false(p_condition boolean, p_message text)
returns void
language plpgsql
as $$
begin
  if coalesce(p_condition, false) is not false then
    raise exception 'assertion failed: %', p_message;
  end if;
end;
$$;

create function pg_temp.assert_eq_text(p_actual text, p_expected text, p_message text)
returns void
language plpgsql
as $$
begin
  if p_actual is distinct from p_expected then
    raise exception 'assertion failed: %, expected %, got %', p_message, p_expected, p_actual;
  end if;
end;
$$;

create function pg_temp.assert_eq_int(p_actual integer, p_expected integer, p_message text)
returns void
language plpgsql
as $$
begin
  if p_actual is distinct from p_expected then
    raise exception 'assertion failed: %, expected %, got %', p_message, p_expected, p_actual;
  end if;
end;
$$;

create function pg_temp.assert_eq_bool(p_actual boolean, p_expected boolean, p_message text)
returns void
language plpgsql
as $$
begin
  if p_actual is distinct from p_expected then
    raise exception 'assertion failed: %, expected %, got %', p_message, p_expected, p_actual;
  end if;
end;
$$;

create function pg_temp.assert_eq_timestamptz(
  p_actual timestamptz,
  p_expected timestamptz,
  p_message text
)
returns void
language plpgsql
as $$
begin
  if p_actual is distinct from p_expected then
    raise exception 'assertion failed: %, expected %, got %', p_message, p_expected, p_actual;
  end if;
end;
$$;

create function pg_temp.add_profile(p_user_id uuid)
returns void
language plpgsql
as $$
begin
  insert into auth.users (id, aud, role, created_at, updated_at)
  values (p_user_id, 'authenticated', 'authenticated', now(), now())
  on conflict (id) do nothing;

  insert into public.profiles (id, created_at, updated_at)
  values (p_user_id, now(), now())
  on conflict (id) do nothing;
end;
$$;

create function pg_temp.add_provider_subscription(
  p_user_id uuid,
  p_provider text,
  p_environment text,
  p_status text,
  p_suffix text,
  p_started_at timestamptz,
  p_period_end timestamptz,
  p_grace_end timestamptz default null,
  p_reconciliation_status text default 'current',
  p_cancel_at_period_end boolean default false
)
returns uuid
language plpgsql
as $$
declare
  v_id uuid := gen_random_uuid();
begin
  insert into billing.provider_subscriptions (
    id,
    user_id,
    provider,
    environment,
    product_tier,
    provider_product_ref,
    provider_customer_ref,
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
    paused_at,
    last_verified_at,
    last_event_at,
    last_provider_event_ref,
    reconciliation_status,
    created_at,
    updated_at
  )
  values (
    v_id,
    p_user_id,
    p_provider,
    p_environment,
    'pro',
    'fixture_5b1d_product_' || p_suffix,
    'fixture_5b1d_customer_' || p_suffix,
    'fixture_5b1d_subscription_' || p_suffix,
    case when p_provider = 'apple' then 'fixture_5b1d_original_' || p_suffix else null end,
    'fixture_5b1d_transaction_' || p_suffix,
    p_user_id,
    p_status,
    case when p_status in ('active', 'grace_period') then true else false end,
    p_cancel_at_period_end,
    p_started_at,
    p_started_at,
    p_period_end,
    p_grace_end,
    case when p_status = 'billing_retry' then p_started_at else null end,
    case when p_status = 'expired' then p_period_end else null end,
    case when p_status = 'revoked' then coalesce(p_period_end, p_started_at) else null end,
    case when p_status = 'refunded' then coalesce(p_period_end, p_started_at) else null end,
    case when p_status = 'paused' then coalesce(p_started_at, p_period_end) else null end,
    p_started_at,
    p_started_at,
    'fixture_5b1d_event_' || p_suffix,
    p_reconciliation_status,
    p_started_at,
    p_started_at
  );

  return v_id;
end;
$$;

create function pg_temp.seed_legacy_entitlement(
  p_user_id uuid,
  p_plan text,
  p_status text,
  p_suffix text,
  p_stripe_status text default null,
  p_cancel_at_period_end boolean default null,
  p_current_period_end timestamptz default null,
  p_with_stripe_refs boolean default true
)
returns void
language plpgsql
as $$
begin
  insert into public.entitlements (
    user_id,
    plan,
    status,
    stripe_customer_id,
    stripe_subscription_id,
    stripe_price_id,
    stripe_status,
    cancel_at_period_end,
    current_period_end,
    updated_at
  )
  values (
    p_user_id,
    p_plan,
    p_status,
    case when p_with_stripe_refs then 'fixture_5b1d_legacy_customer_' || p_suffix else null end,
    case when p_with_stripe_refs then 'fixture_5b1d_legacy_subscription_' || p_suffix else null end,
    case when p_with_stripe_refs then 'fixture_5b1d_legacy_product_' || p_suffix else null end,
    p_stripe_status,
    p_cancel_at_period_end,
    p_current_period_end,
    '2026-07-16 10:00:00+00'
  )
  on conflict (user_id) do update
    set plan = excluded.plan,
        status = excluded.status,
        stripe_customer_id = excluded.stripe_customer_id,
        stripe_subscription_id = excluded.stripe_subscription_id,
        stripe_price_id = excluded.stripe_price_id,
        stripe_status = excluded.stripe_status,
        cancel_at_period_end = excluded.cancel_at_period_end,
        current_period_end = excluded.current_period_end,
        updated_at = excluded.updated_at;
end;
$$;

create function pg_temp.assert_public_entitlement(
  p_label text,
  p_user_id uuid,
  p_plan text,
  p_status text,
  p_cancel_at_period_end boolean,
  p_current_period_end timestamptz,
  p_updated_at timestamptz
)
returns void
language plpgsql
as $$
declare
  v_row record;
begin
  select *
  into strict v_row
  from public.entitlements
  where user_id = p_user_id;

  perform pg_temp.assert_eq_text(v_row.plan, p_plan, p_label || ': plan');
  perform pg_temp.assert_eq_text(v_row.status, p_status, p_label || ': status');
  perform pg_temp.assert_eq_bool(v_row.cancel_at_period_end, p_cancel_at_period_end, p_label || ': cancel flag');
  perform pg_temp.assert_eq_timestamptz(v_row.current_period_end, p_current_period_end, p_label || ': period end');
  perform pg_temp.assert_eq_timestamptz(v_row.updated_at, p_updated_at, p_label || ': updated_at');
end;
$$;

create function pg_temp.assert_stripe_fields(
  p_label text,
  p_user_id uuid,
  p_customer text,
  p_subscription text,
  p_price text,
  p_status text
)
returns void
language plpgsql
as $$
declare
  v_row record;
begin
  select
    stripe_customer_id,
    stripe_subscription_id,
    stripe_price_id,
    stripe_status
  into strict v_row
  from public.entitlements
  where user_id = p_user_id;

  perform pg_temp.assert_eq_text(v_row.stripe_customer_id, p_customer, p_label || ': stripe customer preserved');
  perform pg_temp.assert_eq_text(v_row.stripe_subscription_id, p_subscription, p_label || ': stripe subscription preserved');
  perform pg_temp.assert_eq_text(v_row.stripe_price_id, p_price, p_label || ': stripe price preserved');
  perform pg_temp.assert_eq_text(v_row.stripe_status, p_status, p_label || ': stripe status preserved');
end;
$$;

create temp table backfill_rehearsal_results (
  label text primary key,
  mapped boolean not null,
  skipped_non_subscription boolean not null,
  requires_reconciliation boolean not null,
  provider_rows_inserted integer not null,
  compatibility_rows_refreshed integer not null,
  legacy_access_matched boolean not null,
  idempotent_rerun_passed boolean not null,
  stripe_fields_preserved boolean not null
) on commit drop;

create function pg_temp.insert_mapped_candidate(
  p_user_id uuid,
  p_environment text,
  p_plan text,
  p_status text,
  p_customer text,
  p_subscription text,
  p_price text,
  p_stripe_status text,
  p_cancel_at_period_end boolean,
  p_current_period_end timestamptz,
  p_updated_at timestamptz,
  p_as_of timestamptz
)
returns integer
language plpgsql
as $$
declare
  v_mapped record;
  v_inserted integer := 0;
begin
  select *
  into strict v_mapped
  from billing.map_legacy_stripe_entitlement_candidate(
    p_user_id,
    p_environment,
    p_plan,
    p_status,
    p_customer,
    p_subscription,
    p_price,
    p_stripe_status,
    p_cancel_at_period_end,
    p_current_period_end,
    p_updated_at,
    p_as_of
  );

  insert into billing.provider_subscriptions (
    user_id,
    provider,
    environment,
    product_tier,
    provider_customer_ref,
    provider_subscription_ref,
    provider_product_ref,
    status,
    auto_renews,
    cancel_at_period_end,
    current_period_end,
    billing_retry_started_at,
    expires_at,
    paused_at,
    last_verified_at,
    last_event_at,
    reconciliation_status,
    created_at,
    updated_at
  )
  select
    v_mapped.user_id,
    v_mapped.provider,
    v_mapped.environment,
    v_mapped.product_tier,
    v_mapped.provider_customer_ref,
    v_mapped.provider_subscription_ref,
    v_mapped.provider_product_ref,
    v_mapped.status,
    v_mapped.auto_renews,
    v_mapped.cancel_at_period_end,
    v_mapped.current_period_end,
    v_mapped.billing_retry_started_at,
    v_mapped.expires_at,
    v_mapped.paused_at,
    v_mapped.last_verified_at,
    v_mapped.last_event_at,
    v_mapped.reconciliation_status,
    coalesce(v_mapped.last_event_at, p_as_of),
    coalesce(v_mapped.last_event_at, p_as_of)
  where v_mapped.should_insert_candidate;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

create function pg_temp.rehearse_legacy_fixture(
  p_label text,
  p_user_id uuid,
  p_environment text,
  p_legacy_plan text,
  p_legacy_status text,
  p_stripe_status text,
  p_cancel_at_period_end boolean,
  p_current_period_end timestamptz,
  p_expected_legacy_access_plan text,
  p_expected_requires_reconciliation boolean,
  p_with_customer_ref boolean default true,
  p_with_subscription_ref boolean default true,
  p_with_price_ref boolean default true
)
returns void
language plpgsql
as $$
declare
  v_now constant timestamptz := '2026-07-16 12:00:00+00';
  v_updated constant timestamptz := '2026-07-16 11:00:00+00';
  v_customer text := case when p_with_customer_ref then 'fixture_5b1d_backfill_customer_' || p_label else null end;
  v_subscription text := case when p_with_subscription_ref then 'fixture_5b1d_backfill_subscription_' || p_label else null end;
  v_price text := case when p_with_price_ref then 'fixture_5b1d_backfill_product_' || p_label else null end;
  v_mapped record;
  v_provider_rows_inserted integer := 0;
  v_writer record;
  v_row_before record;
  v_row_after record;
  v_row_rerun record;
  v_legacy_access_matched boolean;
  v_idempotent boolean;
  v_stripe_preserved boolean;
begin
  perform pg_temp.add_profile(p_user_id);

  insert into public.entitlements (
    user_id,
    plan,
    status,
    stripe_customer_id,
    stripe_subscription_id,
    stripe_price_id,
    stripe_status,
    cancel_at_period_end,
    current_period_end,
    updated_at
  )
  values (
    p_user_id,
    p_legacy_plan,
    p_legacy_status,
    v_customer,
    v_subscription,
    v_price,
    p_stripe_status,
    p_cancel_at_period_end,
    p_current_period_end,
    v_updated
  );

  select *
  into strict v_row_before
  from public.entitlements
  where user_id = p_user_id;

  select *
  into strict v_mapped
  from billing.map_legacy_stripe_entitlement_candidate(
    p_user_id,
    p_environment,
    p_legacy_plan,
    p_legacy_status,
    v_customer,
    v_subscription,
    v_price,
    p_stripe_status,
    p_cancel_at_period_end,
    p_current_period_end,
    v_updated,
    v_now
  );
  v_provider_rows_inserted := pg_temp.insert_mapped_candidate(
    p_user_id,
    p_environment,
    p_legacy_plan,
    p_legacy_status,
    v_customer,
    v_subscription,
    v_price,
    p_stripe_status,
    p_cancel_at_period_end,
    p_current_period_end,
    v_updated,
    v_now
  );

  perform *
  from billing.resolve_effective_entitlement(
    p_user_id,
    case when p_environment = 'test' then 'sandbox' else 'production' end,
    v_now
  );
  perform *
  from billing.project_effective_entitlement_summary(
    p_user_id,
    case when p_environment = 'test' then 'sandbox' else 'production' end,
    v_now
  );

  select *
  into strict v_writer
  from billing.refresh_effective_entitlement_summary(
    p_user_id,
    case when p_environment = 'test' then 'sandbox' else 'production' end,
    v_now
  );
  perform pg_temp.assert_true(v_writer.applied, p_label || ': first writer applied');

  select *
  into strict v_row_after
  from public.entitlements
  where user_id = p_user_id;

  select *
  into strict v_writer
  from billing.refresh_effective_entitlement_summary(
    p_user_id,
    case when p_environment = 'test' then 'sandbox' else 'production' end,
    v_now
  );
  perform pg_temp.assert_true(v_writer.applied, p_label || ': repeated writer applied');

  select *
  into strict v_row_rerun
  from public.entitlements
  where user_id = p_user_id;

  v_legacy_access_matched := v_row_after.plan = p_expected_legacy_access_plan;
  v_idempotent :=
    v_row_after.plan is not distinct from v_row_rerun.plan
    and v_row_after.status is not distinct from v_row_rerun.status
    and v_row_after.cancel_at_period_end is not distinct from v_row_rerun.cancel_at_period_end
    and v_row_after.current_period_end is not distinct from v_row_rerun.current_period_end
    and v_row_after.updated_at is not distinct from v_row_rerun.updated_at;
  v_stripe_preserved :=
    v_row_before.stripe_customer_id is not distinct from v_row_rerun.stripe_customer_id
    and v_row_before.stripe_subscription_id is not distinct from v_row_rerun.stripe_subscription_id
    and v_row_before.stripe_price_id is not distinct from v_row_rerun.stripe_price_id
    and v_row_before.stripe_status is not distinct from v_row_rerun.stripe_status;

  perform pg_temp.assert_eq_bool(coalesce(v_mapped.requires_reconciliation, false), p_expected_requires_reconciliation, p_label || ': reconciliation expectation');
  perform pg_temp.assert_true(v_idempotent, p_label || ': idempotency');
  perform pg_temp.assert_true(v_stripe_preserved, p_label || ': Stripe fields preserved');

  insert into backfill_rehearsal_results (
    label,
    mapped,
    skipped_non_subscription,
    requires_reconciliation,
    provider_rows_inserted,
    compatibility_rows_refreshed,
    legacy_access_matched,
    idempotent_rerun_passed,
    stripe_fields_preserved
  )
  values (
    p_label,
    true,
    v_mapped.mapping_reason = 'ignored_free_row',
    coalesce(v_mapped.requires_reconciliation, false),
    v_provider_rows_inserted,
    1,
    v_legacy_access_matched,
    v_idempotent,
    v_stripe_preserved
  );
end;
$$;

do $$
declare
  v_now constant timestamptz := '2026-07-16 12:00:00+00';
  v_start constant timestamptz := '2026-07-15 12:00:00+00';
  v_end constant timestamptz := '2026-08-16 12:00:00+00';
  v_later_end constant timestamptz := '2026-09-16 12:00:00+00';
  v_expired constant timestamptz := '2026-07-15 12:00:00+00';
  u_free uuid := '00000000-0000-0000-0000-000000052000';
  u_missing_row uuid := '00000000-0000-0000-0000-000000052001';
  u_stripe_active uuid := '00000000-0000-0000-0000-000000052002';
  u_apple_active uuid := '00000000-0000-0000-0000-000000052003';
  u_google_active uuid := '00000000-0000-0000-0000-000000052004';
  u_stripe_cancel uuid := '00000000-0000-0000-0000-000000052005';
  u_apple_cancel uuid := '00000000-0000-0000-0000-000000052006';
  u_grace uuid := '00000000-0000-0000-0000-000000052007';
  u_retry uuid := '00000000-0000-0000-0000-000000052008';
  u_expired uuid := '00000000-0000-0000-0000-000000052009';
  u_refunded uuid := '00000000-0000-0000-0000-000000052010';
  u_revoked uuid := '00000000-0000-0000-0000-000000052011';
  u_dual uuid := '00000000-0000-0000-0000-000000052012';
  u_expired_plus_apple uuid := '00000000-0000-0000-0000-000000052013';
  u_active_plus_expired_apple uuid := '00000000-0000-0000-0000-000000052014';
  u_unknown_plus_active uuid := '00000000-0000-0000-0000-000000052015';
  u_unknown_only uuid := '00000000-0000-0000-0000-000000052016';
  u_env_prod_stripe_sandbox_apple uuid := '00000000-0000-0000-0000-000000052017';
  u_env_sandbox_stripe_prod_apple uuid := '00000000-0000-0000-0000-000000052018';
  u_null_provider uuid := '00000000-0000-0000-0000-000000052019';
  u_missing_user uuid := '00000000-0000-0000-0000-000000052020';
  u_invalid_env uuid := '00000000-0000-0000-0000-000000052021';
  u_stale_then_current uuid := '00000000-0000-0000-0000-000000052022';
  before_provider_events integer;
  before_stripe_events integer;
  r record;
begin
  for r in
    select unnest(array[
      u_free,
      u_missing_row,
      u_stripe_active,
      u_apple_active,
      u_google_active,
      u_stripe_cancel,
      u_apple_cancel,
      u_grace,
      u_retry,
      u_expired,
      u_refunded,
      u_revoked,
      u_dual,
      u_expired_plus_apple,
      u_active_plus_expired_apple,
      u_unknown_plus_active,
      u_unknown_only,
      u_env_prod_stripe_sandbox_apple,
      u_env_sandbox_stripe_prod_apple,
      u_null_provider,
      u_invalid_env,
      u_stale_then_current
    ]::uuid[]) as user_id
  loop
    perform pg_temp.add_profile(r.user_id);
  end loop;

  select count(*) into before_provider_events from billing.provider_events;
  select count(*) into before_stripe_events from public.stripe_webhook_events;

  perform pg_temp.seed_legacy_entitlement(u_free, 'pro', 'active', 'free_preserve', 'active', false, v_end, true);
  select *
  into strict r
  from billing.refresh_effective_entitlement_summary(u_free, 'production', v_now);
  perform pg_temp.assert_true(r.applied, 'no-provider writer applies');
  perform pg_temp.assert_eq_text(r.write_action, 'updated', 'no-provider writer updates existing row');
  perform pg_temp.assert_public_entitlement('no providers', u_free, 'free', 'free', false, null, v_now);
  perform pg_temp.assert_stripe_fields(
    'no providers',
    u_free,
    'fixture_5b1d_legacy_customer_free_preserve',
    'fixture_5b1d_legacy_subscription_free_preserve',
    'fixture_5b1d_legacy_product_free_preserve',
    'active'
  );

  perform pg_temp.add_provider_subscription(u_missing_row, 'apple', 'production', 'active', 'missing_row_apple', v_start, v_end);
  select *
  into strict r
  from billing.refresh_effective_entitlement_summary(u_missing_row, 'production', v_now);
  perform pg_temp.assert_true(r.applied, 'missing entitlement row is created');
  perform pg_temp.assert_eq_text(r.write_action, 'inserted', 'missing entitlement row action');
  perform pg_temp.assert_public_entitlement('missing row apple active', u_missing_row, 'pro', 'active', false, v_end, v_now);
  perform pg_temp.assert_stripe_fields('missing row apple active', u_missing_row, null, null, null, null);

  perform pg_temp.seed_legacy_entitlement(u_stripe_active, 'free', 'free', 'stripe_active', 'past_due', true, v_expired, true);
  perform pg_temp.add_provider_subscription(u_stripe_active, 'stripe', 'live', 'active', 'stripe_active', v_start, v_end);
  select * into strict r from billing.refresh_effective_entitlement_summary(u_stripe_active, 'production', v_now);
  perform pg_temp.assert_public_entitlement('stripe active', u_stripe_active, 'pro', 'active', false, v_end, v_now);
  perform pg_temp.assert_stripe_fields(
    'stripe active',
    u_stripe_active,
    'fixture_5b1d_legacy_customer_stripe_active',
    'fixture_5b1d_legacy_subscription_stripe_active',
    'fixture_5b1d_legacy_product_stripe_active',
    'past_due'
  );

  perform pg_temp.seed_legacy_entitlement(u_apple_active, 'free', 'free', 'apple_active', 'canceled', false, v_expired, true);
  perform pg_temp.add_provider_subscription(u_apple_active, 'apple', 'production', 'active', 'apple_active', v_start, v_end);
  select * into strict r from billing.refresh_effective_entitlement_summary(u_apple_active, 'production', v_now);
  perform pg_temp.assert_public_entitlement('apple active', u_apple_active, 'pro', 'active', false, v_end, v_now);
  perform pg_temp.assert_stripe_fields(
    'apple active preserves legacy Stripe fields',
    u_apple_active,
    'fixture_5b1d_legacy_customer_apple_active',
    'fixture_5b1d_legacy_subscription_apple_active',
    'fixture_5b1d_legacy_product_apple_active',
    'canceled'
  );

  perform pg_temp.add_provider_subscription(u_google_active, 'google_play', 'production', 'active', 'google_active', v_start, v_end);
  select * into strict r from billing.refresh_effective_entitlement_summary(u_google_active, 'production', v_now);
  perform pg_temp.assert_public_entitlement('google active', u_google_active, 'pro', 'active', false, v_end, v_now);

  perform pg_temp.seed_legacy_entitlement(u_stripe_cancel, 'pro', 'active', 'stripe_cancel', 'active', false, v_expired, true);
  perform pg_temp.add_provider_subscription(u_stripe_cancel, 'stripe', 'live', 'cancelled_active_until_period_end', 'stripe_cancel', v_start, v_end, null, 'current', true);
  select * into strict r from billing.refresh_effective_entitlement_summary(u_stripe_cancel, 'production', v_now);
  perform pg_temp.assert_public_entitlement('stripe cancelling', u_stripe_cancel, 'pro', 'active', true, v_end, v_now);
  perform pg_temp.assert_stripe_fields(
    'stripe cancelling preserves legacy fields',
    u_stripe_cancel,
    'fixture_5b1d_legacy_customer_stripe_cancel',
    'fixture_5b1d_legacy_subscription_stripe_cancel',
    'fixture_5b1d_legacy_product_stripe_cancel',
    'active'
  );

  perform pg_temp.add_provider_subscription(u_apple_cancel, 'apple', 'production', 'cancelled_active_until_period_end', 'apple_cancel', v_start, v_end, null, 'current', true);
  select * into strict r from billing.refresh_effective_entitlement_summary(u_apple_cancel, 'production', v_now);
  perform pg_temp.assert_public_entitlement('apple cancelling', u_apple_cancel, 'pro', 'active', true, v_end, v_now);

  perform pg_temp.add_provider_subscription(u_grace, 'apple', 'production', 'grace_period', 'apple_grace', v_start, v_end, v_later_end, 'current');
  select * into strict r from billing.refresh_effective_entitlement_summary(u_grace, 'production', v_now);
  perform pg_temp.assert_public_entitlement('apple grace', u_grace, 'pro', 'active', false, v_later_end, v_now);
  perform pg_temp.assert_true(r.requires_reconciliation, 'grace period surfaces reconciliation');

  perform pg_temp.seed_legacy_entitlement(u_retry, 'pro', 'active', 'retry_preserve', 'active', false, v_end, true);
  perform pg_temp.add_provider_subscription(u_retry, 'apple', 'production', 'billing_retry', 'retry', v_start, v_end);
  select * into strict r from billing.refresh_effective_entitlement_summary(u_retry, 'production', v_now);
  perform pg_temp.assert_public_entitlement('billing retry', u_retry, 'free', 'past_due', false, null, v_now);
  perform pg_temp.assert_true(r.requires_reconciliation, 'billing retry reconciliation surfaced');
  perform pg_temp.assert_stripe_fields(
    'billing retry preserves legacy fields',
    u_retry,
    'fixture_5b1d_legacy_customer_retry_preserve',
    'fixture_5b1d_legacy_subscription_retry_preserve',
    'fixture_5b1d_legacy_product_retry_preserve',
    'active'
  );

  perform pg_temp.add_provider_subscription(u_expired, 'stripe', 'live', 'expired', 'expired', v_start - interval '40 days', v_expired);
  select * into strict r from billing.refresh_effective_entitlement_summary(u_expired, 'production', v_now);
  perform pg_temp.assert_public_entitlement('expired', u_expired, 'free', 'canceled', false, null, v_now);

  perform pg_temp.add_provider_subscription(u_refunded, 'stripe', 'live', 'refunded', 'refunded', v_start - interval '40 days', v_expired);
  select * into strict r from billing.refresh_effective_entitlement_summary(u_refunded, 'production', v_now);
  perform pg_temp.assert_public_entitlement('refunded', u_refunded, 'free', 'canceled', false, null, v_now);

  perform pg_temp.add_provider_subscription(u_revoked, 'stripe', 'live', 'revoked', 'revoked', v_start - interval '40 days', v_expired);
  select * into strict r from billing.refresh_effective_entitlement_summary(u_revoked, 'production', v_now);
  perform pg_temp.assert_public_entitlement('revoked', u_revoked, 'free', 'canceled', false, null, v_now);

  perform pg_temp.seed_legacy_entitlement(u_dual, 'free', 'free', 'dual', 'past_due', false, null, true);
  perform pg_temp.add_provider_subscription(u_dual, 'stripe', 'live', 'active', 'dual_stripe', v_start, v_end);
  perform pg_temp.add_provider_subscription(u_dual, 'apple', 'production', 'active', 'dual_apple', v_start, v_later_end);
  select * into strict r from billing.refresh_effective_entitlement_summary(u_dual, 'production', v_now);
  perform pg_temp.assert_public_entitlement('dual active providers', u_dual, 'pro', 'active', false, v_later_end, v_now);
  perform pg_temp.assert_true(r.multiple_active_providers, 'dual active multiple flag');
  perform pg_temp.assert_eq_text(r.management_provider, 'multiple', 'dual active management provider');
  perform pg_temp.assert_stripe_fields(
    'dual active preserves legacy fields',
    u_dual,
    'fixture_5b1d_legacy_customer_dual',
    'fixture_5b1d_legacy_subscription_dual',
    'fixture_5b1d_legacy_product_dual',
    'past_due'
  );

  perform pg_temp.add_provider_subscription(u_expired_plus_apple, 'stripe', 'live', 'expired', 'expired_plus_stripe', v_start - interval '40 days', v_expired);
  perform pg_temp.add_provider_subscription(u_expired_plus_apple, 'apple', 'production', 'active', 'expired_plus_apple', v_start, v_end);
  select * into strict r from billing.refresh_effective_entitlement_summary(u_expired_plus_apple, 'production', v_now);
  perform pg_temp.assert_public_entitlement('stripe expired apple active', u_expired_plus_apple, 'pro', 'active', false, v_end, v_now);

  perform pg_temp.add_provider_subscription(u_active_plus_expired_apple, 'apple', 'production', 'expired', 'active_plus_expired_apple', v_start - interval '40 days', v_expired);
  perform pg_temp.add_provider_subscription(u_active_plus_expired_apple, 'stripe', 'live', 'active', 'active_plus_stripe', v_start, v_end);
  select * into strict r from billing.refresh_effective_entitlement_summary(u_active_plus_expired_apple, 'production', v_now);
  perform pg_temp.assert_public_entitlement('stripe active apple expired', u_active_plus_expired_apple, 'pro', 'active', false, v_end, v_now);

  perform pg_temp.add_provider_subscription(u_unknown_plus_active, 'stripe', 'live', 'unknown_needs_reconciliation', 'unknown_plus_stripe', v_start, v_end, null, 'needs_verification');
  perform pg_temp.add_provider_subscription(u_unknown_plus_active, 'apple', 'production', 'active', 'unknown_plus_apple', v_start, v_end);
  select * into strict r from billing.refresh_effective_entitlement_summary(u_unknown_plus_active, 'production', v_now);
  perform pg_temp.assert_public_entitlement('unknown plus active', u_unknown_plus_active, 'pro', 'active', false, v_end, v_now);
  perform pg_temp.assert_true(r.requires_reconciliation, 'unknown plus active surfaces reconciliation');

  perform pg_temp.add_provider_subscription(u_unknown_only, 'stripe', 'live', 'unknown_needs_reconciliation', 'unknown_only', v_start, v_end, null, 'needs_verification');
  select * into strict r from billing.refresh_effective_entitlement_summary(u_unknown_only, 'production', v_now);
  perform pg_temp.assert_public_entitlement('unknown only', u_unknown_only, 'free', 'canceled', false, null, v_now);
  perform pg_temp.assert_true(r.requires_reconciliation, 'unknown only reconciliation surfaced');

  perform pg_temp.add_provider_subscription(u_env_prod_stripe_sandbox_apple, 'stripe', 'live', 'active', 'prod_stripe', v_start, v_end);
  perform pg_temp.add_provider_subscription(u_env_prod_stripe_sandbox_apple, 'apple', 'sandbox', 'active', 'sandbox_apple_ignored', v_start, v_later_end);
  select * into strict r from billing.refresh_effective_entitlement_summary(u_env_prod_stripe_sandbox_apple, 'production', v_now);
  perform pg_temp.assert_public_entitlement('production ignores sandbox apple', u_env_prod_stripe_sandbox_apple, 'pro', 'active', false, v_end, v_now);

  perform pg_temp.add_provider_subscription(u_env_sandbox_stripe_prod_apple, 'stripe', 'test', 'active', 'sandbox_stripe_ignored', v_start, v_later_end);
  perform pg_temp.add_provider_subscription(u_env_sandbox_stripe_prod_apple, 'apple', 'production', 'active', 'prod_apple', v_start, v_end);
  select * into strict r from billing.refresh_effective_entitlement_summary(u_env_sandbox_stripe_prod_apple, 'production', v_now);
  perform pg_temp.assert_public_entitlement('production ignores sandbox stripe', u_env_sandbox_stripe_prod_apple, 'pro', 'active', false, v_end, v_now);
  select * into strict r from billing.refresh_effective_entitlement_summary(u_env_sandbox_stripe_prod_apple, 'sandbox', v_now);
  perform pg_temp.assert_public_entitlement('sandbox sees sandbox stripe', u_env_sandbox_stripe_prod_apple, 'pro', 'active', false, v_later_end, v_now);

  insert into billing.provider_subscriptions (
    user_id,
    provider,
    environment,
    product_tier,
    provider_product_ref,
    provider_customer_ref,
    provider_subscription_ref,
    status,
    current_period_end,
    last_verified_at,
    last_event_at,
    reconciliation_status,
    created_at,
    updated_at
  )
  values (
    null,
    'apple',
    'production',
    'pro',
    'fixture_5b1d_product_deleted',
    'fixture_5b1d_customer_deleted',
    'fixture_5b1d_subscription_deleted',
    'active',
    v_end,
    v_start,
    v_start,
    'current',
    v_start,
    v_start
  );
  select * into strict r from billing.refresh_effective_entitlement_summary(u_null_provider, 'production', v_now);
  perform pg_temp.assert_public_entitlement('null provider owner ignored', u_null_provider, 'free', 'free', false, null, v_now);

  select * into strict r from billing.refresh_effective_entitlement_summary(u_missing_user, 'production', v_now);
  perform pg_temp.assert_false(r.applied, 'missing user is not applied');
  perform pg_temp.assert_eq_text(r.error_code, 'user_not_found', 'missing user error classification');
  perform pg_temp.assert_false(exists(select 1 from public.entitlements where user_id = u_missing_user), 'missing user did not create row');

  select * into strict r from billing.refresh_effective_entitlement_summary(u_invalid_env, 'live', v_now);
  perform pg_temp.assert_false(r.applied, 'invalid environment is not applied');
  perform pg_temp.assert_eq_text(r.error_code, 'invalid_environment', 'invalid environment error classification');
  perform pg_temp.assert_false(exists(select 1 from public.entitlements where user_id = u_invalid_env), 'invalid environment did not create row');

  perform pg_temp.add_provider_subscription(u_stale_then_current, 'stripe', 'live', 'expired', 'stale_then_current_old', v_start - interval '40 days', v_expired);
  select * into strict r from billing.refresh_effective_entitlement_summary(u_stale_then_current, 'production', v_now);
  perform pg_temp.assert_public_entitlement('stale state first write', u_stale_then_current, 'free', 'canceled', false, null, v_now);
  perform pg_temp.add_provider_subscription(u_stale_then_current, 'apple', 'production', 'active', 'stale_then_current_new', v_start, v_later_end);
  select * into strict r from billing.refresh_effective_entitlement_summary(u_stale_then_current, 'production', v_now);
  perform pg_temp.assert_public_entitlement('new committed provider state refreshes summary', u_stale_then_current, 'pro', 'active', false, v_later_end, v_now);

  select * into strict r from billing.refresh_effective_entitlement_summary(u_stale_then_current, 'production', v_now);
  perform pg_temp.assert_eq_text(r.write_action, 'updated', 'repeated writer remains update');
  perform pg_temp.assert_public_entitlement('idempotent repeated execution', u_stale_then_current, 'pro', 'active', false, v_later_end, v_now);

  perform pg_temp.assert_eq_int((select count(*) from billing.provider_events)::integer, before_provider_events, 'writer does not mutate provider_events');
  perform pg_temp.assert_eq_int((select count(*) from public.stripe_webhook_events)::integer, before_stripe_events, 'writer does not mutate stripe_webhook_events');
  perform pg_temp.assert_false(
    exists (
      select 1
      from billing.provider_subscriptions ps
      where ps.user_id::text like '00000000-0000-0000-0000-000000052%'
        and (
          ps.provider_customer_ref like 'cus_%'
          or ps.provider_subscription_ref like 'sub_%'
          or ps.provider_product_ref like 'price_%'
        )
    ),
    'synthetic fixtures do not use production-like Stripe id prefixes'
  );
end;
$$;

do $$
declare
  v_now constant timestamptz := '2026-07-16 12:00:00+00';
  v_end constant timestamptz := '2026-08-16 12:00:00+00';
  v_later_end constant timestamptz := '2027-07-16 12:00:00+00';
  v_expired constant timestamptz := '2026-07-15 12:00:00+00';
begin
  perform pg_temp.rehearse_legacy_fixture('free_no_subscription', '00000000-0000-0000-0000-000000052100', 'live', 'free', 'free', null, null, null, 'free', false, false, false, false);
  perform pg_temp.rehearse_legacy_fixture('plan_status_inconsistency', '00000000-0000-0000-0000-000000052101', 'live', 'pro', 'free', 'active', false, v_end, 'free', true, true, false, true);
  perform pg_temp.rehearse_legacy_fixture('missing_subscription_ref', '00000000-0000-0000-0000-000000052102', 'live', 'pro', 'active', 'active', false, v_end, 'pro', true, true, false, true);
  perform pg_temp.rehearse_legacy_fixture('missing_period_end', '00000000-0000-0000-0000-000000052103', 'live', 'pro', 'active', 'active', false, null, 'pro', true);
  perform pg_temp.rehearse_legacy_fixture('unknown_stripe_status', '00000000-0000-0000-0000-000000052104', 'live', 'free', 'free', 'future_state', false, null, 'free', true);
  perform pg_temp.rehearse_legacy_fixture('monthly_active', '00000000-0000-0000-0000-000000052105', 'live', 'pro', 'active', 'active', false, v_end, 'pro', false);
  perform pg_temp.rehearse_legacy_fixture('annual_active', '00000000-0000-0000-0000-000000052106', 'live', 'pro', 'active', 'active', false, v_later_end, 'pro', false);
  perform pg_temp.rehearse_legacy_fixture('monthly_cancelling', '00000000-0000-0000-0000-000000052107', 'live', 'pro', 'active', 'active', true, v_end, 'pro', false);
  perform pg_temp.rehearse_legacy_fixture('annual_cancelling', '00000000-0000-0000-0000-000000052108', 'live', 'pro', 'active', 'active', true, v_later_end, 'pro', false);
  perform pg_temp.rehearse_legacy_fixture('successful_renewal', '00000000-0000-0000-0000-000000052109', 'live', 'pro', 'active', 'active', false, v_later_end, 'pro', false);
  perform pg_temp.rehearse_legacy_fixture('reactivated_subscription', '00000000-0000-0000-0000-000000052110', 'live', 'pro', 'active', 'active', false, v_end, 'pro', false);
  perform pg_temp.rehearse_legacy_fixture('period_ended', '00000000-0000-0000-0000-000000052111', 'live', 'pro', 'active', 'active', false, v_expired, 'pro', true);
  perform pg_temp.rehearse_legacy_fixture('subscription_deleted', '00000000-0000-0000-0000-000000052112', 'live', 'free', 'canceled', 'canceled', false, v_expired, 'free', false);
  perform pg_temp.rehearse_legacy_fixture('past_due', '00000000-0000-0000-0000-000000052113', 'live', 'free', 'past_due', 'past_due', false, null, 'free', true);
  perform pg_temp.rehearse_legacy_fixture('unpaid', '00000000-0000-0000-0000-000000052114', 'live', 'free', 'canceled', 'unpaid', false, v_expired, 'free', false);
  perform pg_temp.rehearse_legacy_fixture('incomplete', '00000000-0000-0000-0000-000000052115', 'live', 'free', 'canceled', 'incomplete', false, null, 'free', true);
  perform pg_temp.rehearse_legacy_fixture('incomplete_expired', '00000000-0000-0000-0000-000000052116', 'live', 'free', 'canceled', 'incomplete_expired', false, v_expired, 'free', false);
  perform pg_temp.rehearse_legacy_fixture('paused', '00000000-0000-0000-0000-000000052117', 'live', 'free', 'canceled', 'paused', false, null, 'free', true);
  perform pg_temp.rehearse_legacy_fixture('payment_failure', '00000000-0000-0000-0000-000000052118', 'live', 'free', 'past_due', 'past_due', false, null, 'free', true);
  perform pg_temp.rehearse_legacy_fixture('stale_ambiguous_state', '00000000-0000-0000-0000-000000052119', 'live', 'pro', 'active', 'trialing', false, v_expired, 'pro', true);

  perform pg_temp.assert_eq_int((select count(*) from backfill_rehearsal_results)::integer, 20, 'total backfill rehearsal fixtures');
  perform pg_temp.assert_eq_int((select count(*) from backfill_rehearsal_results where mapped)::integer, 20, 'legacy rows mapped');
  perform pg_temp.assert_eq_int((select count(*) from backfill_rehearsal_results where skipped_non_subscription)::integer, 1, 'non-subscription rows skipped');
  perform pg_temp.assert_eq_int((select coalesce(sum(provider_rows_inserted), 0) from backfill_rehearsal_results)::integer, 17, 'provider rows inserted during rehearsal');
  perform pg_temp.assert_eq_int((select coalesce(sum(compatibility_rows_refreshed), 0) from backfill_rehearsal_results)::integer, 20, 'compatibility rows refreshed');
  perform pg_temp.assert_eq_int((select count(*) from backfill_rehearsal_results where requires_reconciliation)::integer, 10, 'rows requiring reconciliation');
  perform pg_temp.assert_eq_int((select count(*) from backfill_rehearsal_results where legacy_access_matched)::integer, 16, 'legacy access parity matched');
  perform pg_temp.assert_eq_int((select count(*) from backfill_rehearsal_results where not legacy_access_matched)::integer, 4, 'legacy access parity mismatched repair fixtures');
  perform pg_temp.assert_eq_int((select count(*) from backfill_rehearsal_results where idempotent_rerun_passed)::integer, 20, 'idempotent reruns passed');
  perform pg_temp.assert_eq_int((select count(*) from backfill_rehearsal_results where stripe_fields_preserved)::integer, 20, 'Stripe field preservation passed');
end;
$$;

set local role service_role;
select pg_temp.assert_true(
  (select applied from billing.refresh_effective_entitlement_summary(
    '00000000-0000-0000-0000-000000052000',
    'production',
    '2026-07-16 12:00:00+00'
  )),
  'service_role can execute writer'
);
reset role;

set local role authenticated;
do $$
begin
  perform * from billing.refresh_effective_entitlement_summary(
    '00000000-0000-0000-0000-000000052000',
    'production',
    '2026-07-16 12:00:00+00'
  );
  raise exception 'authenticated unexpectedly executed entitlement summary writer';
exception
  when insufficient_privilege then
    null;
end;
$$;
reset role;

set local role anon;
do $$
begin
  perform * from billing.refresh_effective_entitlement_summary(
    '00000000-0000-0000-0000-000000052000',
    'production',
    '2026-07-16 12:00:00+00'
  );
  raise exception 'anon unexpectedly executed entitlement summary writer';
exception
  when insufficient_privilege then
    null;
end;
$$;
reset role;

rollback;

do $$
begin
  if exists (select 1 from auth.users where id::text like '00000000-0000-0000-0000-000000052%') then
    raise exception 'synthetic auth users remained after rollback';
  end if;

  if exists (select 1 from public.entitlements where user_id::text like '00000000-0000-0000-0000-000000052%') then
    raise exception 'synthetic public entitlement rows remained after rollback';
  end if;

  if exists (
    select 1
    from billing.provider_subscriptions
    where coalesce(user_id::text, '') like '00000000-0000-0000-0000-000000052%'
      or provider_customer_ref like 'fixture_5b1d_%'
      or provider_subscription_ref like 'fixture_5b1d_%'
      or provider_product_ref like 'fixture_5b1d_%'
      or provider_original_transaction_ref like 'fixture_5b1d_%'
      or provider_transaction_ref like 'fixture_5b1d_%'
  ) then
    raise exception 'synthetic provider subscription rows remained after rollback';
  end if;

  if exists (
    select 1
    from billing.provider_events
    where coalesce(related_user_id::text, '') like '00000000-0000-0000-0000-000000052%'
      or provider_customer_ref like 'fixture_5b1d_%'
      or provider_subscription_ref like 'fixture_5b1d_%'
      or provider_original_transaction_ref like 'fixture_5b1d_%'
      or provider_transaction_ref like 'fixture_5b1d_%'
  ) then
    raise exception 'synthetic provider events remained after rollback';
  end if;
end;
$$;
