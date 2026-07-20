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

create function pg_temp.add_apple_subscription(
  p_user_id uuid,
  p_environment text,
  p_status text,
  p_suffix text,
  p_period_end timestamptz
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
    'apple',
    p_environment,
    'pro',
    'com.canyougeo.app:com.canyougeo.pro.monthly',
    'apple_original_transaction_sha256_' || repeat(substr(p_suffix, 1, 1), 64),
    'apple_original_transaction_sha256_' || repeat(substr(p_suffix, 1, 1), 64),
    'apple_transaction_sha256_' || repeat(substr(p_suffix, 1, 1), 64),
    p_user_id,
    p_status,
    true,
    false,
    '2026-07-20 12:00:00+00',
    '2026-07-20 12:00:00+00',
    p_period_end,
    '2026-07-20 12:00:00+00',
    '2026-07-20 12:00:00+00',
    'fixture_5d2a2_' || p_suffix,
    'current',
    '2026-07-20 12:00:00+00',
    '2026-07-20 12:00:00+00'
  );

  return v_id;
end;
$$;

do $$
declare
  v_prod_sandbox_user uuid := '00000000-0000-0000-0000-000000052201'::uuid;
  v_staging_sandbox_user uuid := '00000000-0000-0000-0000-000000052202'::uuid;
  v_prod_live_user uuid := '00000000-0000-0000-0000-000000052203'::uuid;
  v_as_of timestamptz := '2026-07-20 13:00:00+00'::timestamptz;
  v_future timestamptz := '2026-07-20 14:00:00+00'::timestamptz;
  v_result record;
begin
  perform pg_temp.add_profile(v_prod_sandbox_user);
  perform pg_temp.add_profile(v_staging_sandbox_user);
  perform pg_temp.add_profile(v_prod_live_user);

  insert into public.entitlements (user_id, plan, status, updated_at)
  values (v_prod_sandbox_user, 'free', 'free', v_as_of)
  on conflict (user_id) do update
    set plan = excluded.plan,
        status = excluded.status,
        updated_at = excluded.updated_at;

  perform pg_temp.add_apple_subscription(v_prod_sandbox_user, 'sandbox', 'active', 'a', v_future);
  perform set_config('cgy.apple_deployment_mode', 'production', true);
  select *
  into strict v_result
  from billing.refresh_effective_entitlement_summary(v_prod_sandbox_user, 'sandbox', v_as_of);

  perform pg_temp.assert_true(v_result.applied, 'production sandbox refresh applied');
  perform pg_temp.assert_eq_text(v_result.write_action, 'native_review_updated', 'production sandbox writes native review lane');
  perform pg_temp.assert_eq_text(
    (select plan from public.entitlements where user_id = v_prod_sandbox_user),
    'free',
    'production sandbox leaves live entitlement free'
  );
  perform pg_temp.assert_eq_text(
    (select plan from billing.apple_native_sandbox_entitlements where user_id = v_prod_sandbox_user),
    'pro',
    'production sandbox writes isolated native entitlement'
  );

  perform pg_temp.add_apple_subscription(v_staging_sandbox_user, 'sandbox', 'active', 'b', v_future);
  perform set_config('cgy.apple_deployment_mode', 'staging', true);
  select *
  into strict v_result
  from billing.refresh_effective_entitlement_summary(v_staging_sandbox_user, 'sandbox', v_as_of);

  perform pg_temp.assert_true(v_result.applied, 'staging sandbox refresh applied');
  perform pg_temp.assert_eq_text(v_result.write_action, 'inserted', 'staging sandbox writes compatibility row');
  perform pg_temp.assert_eq_text(
    (select plan from public.entitlements where user_id = v_staging_sandbox_user),
    'pro',
    'staging sandbox continues granting staging QA entitlement'
  );

  perform pg_temp.add_apple_subscription(v_prod_live_user, 'production', 'active', 'c', v_future);
  perform set_config('cgy.apple_deployment_mode', 'production', true);
  select *
  into strict v_result
  from billing.refresh_effective_entitlement_summary(v_prod_live_user, 'production', v_as_of);

  perform pg_temp.assert_true(v_result.applied, 'production live refresh applied');
  perform pg_temp.assert_eq_text(v_result.write_action, 'inserted', 'production live writes compatibility row');
  perform pg_temp.assert_eq_text(
    (select plan from public.entitlements where user_id = v_prod_live_user),
    'pro',
    'production Apple transaction grants live entitlement'
  );

  perform pg_temp.assert_false(
    billing.apple_deployment_environment_allowed('staging', 'production'),
    'staging rejects production Apple transactions'
  );
end $$;

rollback;
