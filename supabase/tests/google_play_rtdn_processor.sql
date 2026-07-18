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

create function pg_temp.seed_entitlement(p_user_id uuid, p_plan text, p_status text)
returns void
language plpgsql
as $$
begin
  insert into public.entitlements (user_id, plan, status, updated_at)
  values (p_user_id, p_plan, p_status, '2026-07-18 14:00:00+00'::timestamptz)
  on conflict on constraint entitlements_pkey do update
    set plan = excluded.plan,
        status = excluded.status,
        updated_at = excluded.updated_at;
end;
$$;

-- test notification processed without entitlement or provider subscription mutation
do $$
declare
  v_result record;
  v_user uuid := '00000000-0000-0000-0000-000000071801'::uuid;
begin
  perform pg_temp.add_profile(v_user);
  perform pg_temp.seed_entitlement(v_user, 'free', 'free');

  select *
  into strict v_result
  from public.process_google_play_rtdn_event(
    'test',
    'fixture-test-message',
    'test_notification',
    'test',
    '2026-07-18 14:00:00+00'::timestamptz,
    repeat('a', 64),
    'com.canyougeo.app',
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    false,
    '2026-07-18 14:00:01+00'::timestamptz
  );

  perform pg_temp.assert_eq_text(v_result.result, 'test_processed', 'test notification result');
  perform pg_temp.assert_eq_text((select plan from public.entitlements where user_id = v_user), 'free', 'test notification keeps user free');
  perform pg_temp.assert_true(
    not exists (select 1 from billing.provider_subscriptions where provider = 'google_play'),
    'test notification does not create a provider subscription'
  );

  select *
  into strict v_result
  from public.process_google_play_rtdn_event(
    'test',
    'fixture-test-message',
    'test_notification',
    'test',
    '2026-07-18 14:00:00+00'::timestamptz,
    repeat('a', 64),
    'com.canyougeo.app',
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    false,
    '2026-07-18 14:00:02+00'::timestamptz
  );

  perform pg_temp.assert_eq_text(v_result.result, 'already_processed', 'duplicate Pub/Sub message is idempotent');
end $$;

-- unbound subscription notification records reconciliation without granting Pro
do $$
declare
  v_result record;
  v_user uuid := '00000000-0000-0000-0000-000000071802'::uuid;
begin
  perform pg_temp.add_profile(v_user);
  perform pg_temp.seed_entitlement(v_user, 'free', 'free');

  select *
  into strict v_result
  from public.process_google_play_rtdn_event(
    'test',
    'fixture-unbound-message',
    'subscription_notification',
    'subscription_notification_4',
    '2026-07-18 14:01:00+00'::timestamptz,
    repeat('b', 64),
    'com.canyougeo.app',
    'com.canyougeo.app:canyougeo_pro:monthly',
    'sha256_' || repeat('1', 64),
    null,
    'gpa_order_sha256_' || repeat('2', 64),
    'active',
    'ACKNOWLEDGEMENT_STATE_PENDING',
    true,
    '2026-07-18 14:00:00+00'::timestamptz,
    '2026-08-18 14:00:00+00'::timestamptz,
    null,
    null,
    null,
    null,
    true,
    '2026-07-18 14:01:01+00'::timestamptz
  );

  perform pg_temp.assert_eq_text(v_result.result, 'unbound_purchase_token', 'unbound token result');
  perform pg_temp.assert_eq_text((select plan from public.entitlements where user_id = v_user), 'free', 'unbound token does not grant Pro');
end $$;

-- already-bound Google token refreshes provider state and effective entitlement
do $$
declare
  v_result record;
  v_user uuid := '00000000-0000-0000-0000-000000071803'::uuid;
  v_token text := 'sha256_' || repeat('3', 64);
begin
  perform pg_temp.add_profile(v_user);
  perform pg_temp.seed_entitlement(v_user, 'free', 'free');

  insert into billing.provider_subscriptions (
    user_id,
    provider,
    environment,
    product_tier,
    provider_product_ref,
    provider_subscription_ref,
    status,
    reconciliation_status,
    created_at,
    updated_at
  )
  values (
    v_user,
    'google_play',
    'test',
    'pro',
    'com.canyougeo.app:canyougeo_pro:monthly',
    v_token,
    'pending',
    'needs_verification',
    '2026-07-18 13:59:00+00'::timestamptz,
    '2026-07-18 13:59:00+00'::timestamptz
  );

  select *
  into strict v_result
  from public.process_google_play_rtdn_event(
    'test',
    'fixture-bound-message',
    'subscription_notification',
    'subscription_notification_2',
    '2026-07-18 14:02:00+00'::timestamptz,
    repeat('c', 64),
    'com.canyougeo.app',
    'com.canyougeo.app:canyougeo_pro:monthly',
    v_token,
    null,
    'gpa_order_sha256_' || repeat('4', 64),
    'active',
    'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED',
    true,
    '2026-07-18 14:00:00+00'::timestamptz,
    '2026-08-18 14:00:00+00'::timestamptz,
    null,
    null,
    null,
    null,
    true,
    '2026-07-18 14:02:01+00'::timestamptz
  );

  perform pg_temp.assert_eq_text(v_result.result, 'processed', 'bound token result');
  perform pg_temp.assert_eq_text((select plan from public.entitlements where user_id = v_user), 'pro', 'bound active Google token grants Pro');
end $$;

rollback;
