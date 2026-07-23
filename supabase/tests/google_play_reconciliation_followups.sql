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
  values (p_user_id, p_plan, p_status, '2026-07-23 23:00:00+00'::timestamptz)
  on conflict on constraint entitlements_pkey do update
    set plan = excluded.plan,
        status = excluded.status,
        updated_at = excluded.updated_at;
end;
$$;

-- RTDN arrives before direct app verification; later verification binds the
-- token and terminalizes the parked RTDN without replaying stale RTDN state.
do $$
declare
  v_owner uuid := '00000000-0000-0000-0000-000000072311'::uuid;
  v_token_ref text := 'sha256_' || repeat('a', 64);
  v_raw_token text := 'synthetic-google-play-rtdn-first-token-not-real';
  v_product_ref text := 'com.canyougeo.app:canyougeo_pro:monthly';
  v_order_ref text := 'gpa_order_sha256_' || repeat('b', 64);
  v_as_of timestamptz := '2026-07-23 23:05:00+00'::timestamptz;
  v_result record;
  v_repair record;
begin
  perform pg_temp.add_profile(v_owner);
  perform pg_temp.seed_entitlement(v_owner, 'free', 'free');

  select *
  into strict v_result
  from public.process_google_play_rtdn_event(
    'production',
    'fixture-rtdn-first-message',
    'subscription_notification',
    'subscription_notification_4',
    v_as_of - interval '2 seconds',
    repeat('1', 64),
    'com.canyougeo.app',
    v_product_ref,
    v_token_ref,
    null,
    v_order_ref,
    'active',
    'ACKNOWLEDGEMENT_STATE_PENDING',
    true,
    v_as_of - interval '1 minute',
    v_as_of + interval '30 days',
    null,
    null,
    null,
    null,
    true,
    v_as_of - interval '1 second'
  );

  perform pg_temp.assert_eq_text(v_result.result, 'unbound_purchase_token', 'RTDN-first event is parked');
  perform pg_temp.assert_true(v_result.reconciliation_required, 'RTDN-first event requires reconciliation before ownership exists');
  perform pg_temp.assert_eq_text((select plan || '/' || status from public.entitlements where user_id = v_owner), 'free/free', 'unbound RTDN does not grant Pro');

  select *
  into strict v_repair
  from billing.reconcile_google_play_unbound_rtdn_events('production', 100, v_as_of);

  perform pg_temp.assert_eq_int(v_repair.eligible_count, 0, 'no RTDN repair candidate before token ownership exists');
  perform pg_temp.assert_eq_int(v_repair.repaired_count, 0, 'no RTDN repair before token ownership exists');

  select *
  into strict v_result
  from public.process_google_play_purchase_verification(
    'production',
    v_owner,
    'verify:' || v_token_ref || ':rtdn-first',
    v_as_of,
    repeat('2', 64),
    'com.canyougeo.app',
    v_product_ref,
    v_token_ref,
    v_raw_token,
    null,
    v_order_ref,
    'active',
    'ACKNOWLEDGEMENT_STATE_PENDING',
    true,
    v_as_of - interval '1 minute',
    v_as_of + interval '30 days',
    null,
    null,
    null,
    null,
    true,
    v_as_of
  );

  perform pg_temp.assert_eq_text(v_result.result, 'processed', 'direct verification succeeds');
  perform pg_temp.assert_true(v_result.processed, 'direct verification processed');
  perform pg_temp.assert_true(v_result.provider_subscription_changed, 'direct verification persists provider subscription');
  perform pg_temp.assert_true(v_result.compatibility_refreshed, 'direct verification refreshes entitlement');
  perform pg_temp.assert_true(v_result.acknowledgement_required, 'fresh active purchase still requires acknowledgement');
  perform pg_temp.assert_false(v_result.reconciliation_required, 'direct verification does not require reconciliation');
  perform pg_temp.assert_eq_text((select plan || '/' || status from public.entitlements where user_id = v_owner), 'pro/active', 'verified active purchase grants Pro');

  perform pg_temp.assert_eq_text(
    (select processing_status from billing.provider_events where provider = 'google_play' and environment = 'production' and provider_event_ref = 'pubsub:fixture-rtdn-first-message'),
    'processed',
    'RTDN-first event is terminalized after verification'
  );
  perform pg_temp.assert_false(
    (select reconciliation_required from billing.provider_events where provider = 'google_play' and environment = 'production' and provider_event_ref = 'pubsub:fixture-rtdn-first-message'),
    'terminalized RTDN no longer requires reconciliation'
  );
  perform pg_temp.assert_true(
    (select related_user_id = v_owner from billing.provider_events where provider = 'google_play' and environment = 'production' and provider_event_ref = 'pubsub:fixture-rtdn-first-message'),
    'terminalized RTDN is linked to owner'
  );
  perform pg_temp.assert_true(
    (select provider_subscription_id is not null from billing.provider_events where provider = 'google_play' and environment = 'production' and provider_event_ref = 'pubsub:fixture-rtdn-first-message'),
    'terminalized RTDN is linked to provider subscription'
  );
  perform pg_temp.assert_eq_int(
    (select count(*)::integer from billing.provider_subscriptions where provider = 'google_play' and environment = 'production' and provider_subscription_ref = v_token_ref),
    1,
    'RTDN repair does not duplicate provider subscriptions'
  );
  perform pg_temp.assert_eq_int(
    (select count(*)::integer from billing.google_play_purchase_tokens where provider_environment = 'production' and purchase_token_fingerprint = v_token_ref),
    1,
    'RTDN repair does not duplicate token ownership'
  );

  select *
  into strict v_repair
  from billing.reconcile_google_play_unbound_rtdn_events('production', 100, v_as_of + interval '1 second');

  perform pg_temp.assert_eq_int(v_repair.eligible_count, 0, 'duplicate RTDN reconciliation has no remaining candidates');
  perform pg_temp.assert_eq_int(v_repair.repaired_count, 0, 'duplicate RTDN reconciliation is harmless');

  select *
  into strict v_result
  from public.process_google_play_purchase_verification(
    'production',
    v_owner,
    'verify:' || v_token_ref || ':rtdn-first',
    v_as_of,
    repeat('2', 64),
    'com.canyougeo.app',
    v_product_ref,
    v_token_ref,
    v_raw_token,
    null,
    v_order_ref,
    'active',
    'ACKNOWLEDGEMENT_STATE_PENDING',
    true,
    v_as_of - interval '1 minute',
    v_as_of + interval '30 days',
    null,
    null,
    null,
    null,
    true,
    v_as_of + interval '2 seconds'
  );

  perform pg_temp.assert_eq_text(v_result.result, 'already_processed', 'duplicate verification remains idempotent');
  perform pg_temp.assert_eq_int(
    (select count(*)::integer from billing.provider_subscriptions where provider = 'google_play' and environment = 'production' and provider_subscription_ref = v_token_ref),
    1,
    'duplicate verification does not duplicate provider subscriptions'
  );
end $$;

-- An expired provider subscription with a pending acknowledgement marker is
-- retained for audit but is not actionable and cannot grant Pro.
do $$
declare
  v_owner uuid := '00000000-0000-0000-0000-000000072312'::uuid;
  v_token_ref text := 'sha256_' || repeat('c', 64);
  v_raw_token text := 'synthetic-google-play-expired-pending-token-not-real';
  v_product_ref text := 'com.canyougeo.app:canyougeo_pro:monthly';
  v_order_ref text := 'gpa_order_sha256_' || repeat('d', 64);
  v_as_of timestamptz := '2026-07-23 23:15:00+00'::timestamptz;
  v_result record;
begin
  perform pg_temp.add_profile(v_owner);
  perform pg_temp.seed_entitlement(v_owner, 'free', 'free');

  select *
  into strict v_result
  from public.process_google_play_purchase_verification(
    'production',
    v_owner,
    'verify:' || v_token_ref || ':expired-pending',
    v_as_of,
    repeat('3', 64),
    'com.canyougeo.app',
    v_product_ref,
    v_token_ref,
    v_raw_token,
    null,
    v_order_ref,
    'active',
    'ACKNOWLEDGEMENT_STATE_PENDING',
    true,
    v_as_of - interval '1 minute',
    v_as_of + interval '5 minutes',
    null,
    null,
    null,
    null,
    true,
    v_as_of
  );

  perform pg_temp.assert_eq_text(v_result.result, 'processed', 'initial purchase before expiry succeeds');
  perform pg_temp.assert_true(v_result.acknowledgement_required, 'initial purchase requires acknowledgement');
  perform pg_temp.assert_eq_text((select plan || '/' || status from public.entitlements where user_id = v_owner), 'pro/active', 'initial active purchase grants Pro');

  select *
  into strict v_result
  from public.process_google_play_rtdn_event(
    'production',
    'fixture-expired-pending-message',
    'subscription_notification',
    'subscription_notification_13',
    v_as_of + interval '10 minutes',
    repeat('4', 64),
    'com.canyougeo.app',
    v_product_ref,
    v_token_ref,
    null,
    v_order_ref,
    'expired',
    'ACKNOWLEDGEMENT_STATE_PENDING',
    false,
    v_as_of - interval '1 minute',
    null,
    null,
    null,
    v_as_of + interval '10 minutes',
    null,
    true,
    v_as_of + interval '10 minutes'
  );

  perform pg_temp.assert_eq_text(v_result.result, 'processed', 'expired RTDN processes against owned token');
  perform pg_temp.assert_eq_text(
    (select status from billing.provider_subscriptions where provider = 'google_play' and environment = 'production' and provider_subscription_ref = v_token_ref),
    'expired',
    'provider subscription expires'
  );
  perform pg_temp.assert_eq_text((select plan || '/' || status from public.entitlements where user_id = v_owner), 'free/canceled', 'expired provider state removes Pro');
  perform pg_temp.assert_eq_text(
    (select acknowledgement_state from billing.google_play_purchase_tokens where provider_environment = 'production' and purchase_token_fingerprint = v_token_ref),
    'ACKNOWLEDGEMENT_STATE_PENDING',
    'expired pending acknowledgement token is retained for audit'
  );

  select *
  into strict v_result
  from public.process_google_play_purchase_verification(
    'production',
    v_owner,
    'verify:' || v_token_ref || ':expired-pending',
    v_as_of,
    repeat('3', 64),
    'com.canyougeo.app',
    v_product_ref,
    v_token_ref,
    v_raw_token,
    null,
    v_order_ref,
    'expired',
    'ACKNOWLEDGEMENT_STATE_PENDING',
    false,
    v_as_of - interval '1 minute',
    null,
    null,
    null,
    v_as_of + interval '10 minutes',
    null,
    true,
    v_as_of + interval '11 minutes'
  );

  perform pg_temp.assert_eq_text(v_result.result, 'already_processed', 'expired pending token duplicate verification is terminal');
  perform pg_temp.assert_false(v_result.acknowledgement_required, 'expired pending token is not actionable for acknowledgement retry');
  perform pg_temp.assert_eq_text((select plan || '/' || status from public.entitlements where user_id = v_owner), 'free/canceled', 'expired pending token cannot retain Pro');
  perform pg_temp.assert_eq_int(
    (select count(*)::integer from billing.provider_subscriptions where provider = 'google_play' and environment = 'production' and provider_subscription_ref = v_token_ref),
    1,
    'expired pending token does not duplicate provider subscriptions'
  );
  perform pg_temp.assert_eq_int(
    (select count(*)::integer from billing.google_play_purchase_tokens where provider_environment = 'production' and purchase_token_fingerprint = v_token_ref),
    1,
    'expired pending token does not duplicate token ownership'
  );
end $$;

rollback;
