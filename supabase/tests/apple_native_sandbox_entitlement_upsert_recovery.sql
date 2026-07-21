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

create function pg_temp.assert_fixture_counts(
  p_prefix text,
  p_user_id uuid,
  p_expected_provider_events integer,
  p_expected_provider_subscriptions integer,
  p_expected_transaction_chains integer,
  p_expected_native_entitlements integer,
  p_expected_public_pro_entitlements integer,
  p_message text
)
returns void
language plpgsql
as $$
begin
  perform pg_temp.assert_eq_int(
    (select count(*)::integer from billing.provider_events where provider = 'apple' and provider_event_ref like p_prefix || '%'),
    p_expected_provider_events,
    p_message || ': provider events'
  );
  perform pg_temp.assert_eq_int(
    (select count(*)::integer from billing.provider_subscriptions where provider = 'apple' and user_id = p_user_id),
    p_expected_provider_subscriptions,
    p_message || ': provider subscriptions'
  );
  perform pg_temp.assert_eq_int(
    (select count(*)::integer from billing.apple_transaction_chains where user_id = p_user_id),
    p_expected_transaction_chains,
    p_message || ': transaction chains'
  );
  perform pg_temp.assert_eq_int(
    (select count(*)::integer from billing.apple_native_sandbox_entitlements where user_id = p_user_id),
    p_expected_native_entitlements,
    p_message || ': native sandbox entitlements'
  );
  perform pg_temp.assert_eq_int(
    (select count(*)::integer from public.entitlements where user_id = p_user_id and plan = 'pro' and status = 'active'),
    p_expected_public_pro_entitlements,
    p_message || ': live public pro entitlements'
  );
end;
$$;

do $$
declare
  v_native_user uuid := '00000000-0000-4000-8000-000000052d20'::uuid;
  v_staging_user uuid := '00000000-0000-4000-8000-000000052d21'::uuid;
  v_live_user uuid := '00000000-0000-4000-8000-000000052d22'::uuid;
  v_native_prefix text := 'verify:fixture_5d2d:native:';
  v_staging_prefix text := 'verify:fixture_5d2d:staging:';
  v_live_prefix text := 'verify:fixture_5d2d:live:';
  v_user_ref text := 'user_uuid_sha256_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  v_staging_user_ref text := 'user_uuid_sha256_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
  v_live_user_ref text := 'user_uuid_sha256_cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc';
  v_original_ref text := 'apple_original_transaction_sha256_' || repeat('a', 64);
  v_staging_original_ref text := 'apple_original_transaction_sha256_' || repeat('b', 64);
  v_live_original_ref text := 'apple_original_transaction_sha256_' || repeat('c', 64);
  v_transaction_ref text := 'apple_transaction_sha256_' || repeat('d', 64);
  v_transaction_ref_2 text := 'apple_transaction_sha256_' || repeat('e', 64);
  v_staging_transaction_ref text := 'apple_transaction_sha256_' || repeat('f', 64);
  v_live_transaction_ref text := 'apple_transaction_sha256_' || repeat('1', 64);
  v_payload_hash text := repeat('2', 64);
  v_payload_hash_2 text := repeat('3', 64);
  v_staging_payload_hash text := repeat('4', 64);
  v_live_payload_hash text := repeat('5', 64);
  v_as_of timestamptz := '2026-07-21 00:45:00+00'::timestamptz;
  v_future timestamptz := '2026-07-21 01:45:00+00'::timestamptz;
  v_result record;
begin
  perform pg_temp.add_profile(v_native_user);
  perform pg_temp.add_profile(v_staging_user);
  perform pg_temp.add_profile(v_live_user);

  insert into public.entitlements (user_id, plan, status, updated_at)
  values (v_native_user, 'free', 'free', v_as_of)
  on conflict on constraint entitlements_pkey do update
    set plan = excluded.plan,
        status = excluded.status,
        updated_at = excluded.updated_at;

  insert into billing.provider_events (
    provider,
    environment,
    provider_event_ref,
    event_type,
    occurred_at,
    effective_at,
    received_at,
    processing_status,
    attempt_count,
    last_attempted_at,
    last_error_code,
    reconciliation_required,
    related_user_id,
    provider_subscription_ref,
    provider_original_transaction_ref,
    provider_transaction_ref,
    payload_hash,
    created_at,
    updated_at
  )
  values (
    'apple',
    'sandbox',
    v_native_prefix || 'retry-pending',
    'purchase_verification',
    v_as_of,
    v_as_of,
    v_as_of,
    'retry_pending',
    1,
    v_as_of,
    'summary_refresh_failed',
    true,
    v_native_user,
    v_original_ref,
    v_original_ref,
    v_transaction_ref,
    v_payload_hash,
    v_as_of,
    v_as_of
  );

  execute 'set local role service_role';

  select *
  into strict v_result
  from public.process_apple_purchase_verification(
    'sandbox',
    'production',
    v_native_user,
    v_user_ref,
    v_native_prefix || 'retry-pending',
    'purchase_verification',
    null,
    v_as_of + interval '1 minute',
    v_payload_hash,
    'com.canyougeo.app',
    '6791248782',
    'com.canyougeo.pro.monthly',
    'com.canyougeo.app:com.canyougeo.pro.monthly',
    v_original_ref,
    'fixture-5d2d-original',
    v_transaction_ref,
    v_native_user,
    'active',
    true,
    v_as_of,
    v_future,
    null,
    null,
    null,
    null,
    null,
    true,
    v_as_of + interval '1 minute'
  );

  perform pg_temp.assert_eq_text(current_user, 'service_role', 'fixture runs RPC as service_role');
  perform pg_temp.assert_eq_text(v_result.result, 'processed', 'retry_pending provider event can transition successfully');
  perform pg_temp.assert_true(v_result.processed, 'native review retry is processed');
  perform pg_temp.assert_true(v_result.provider_subscription_changed, 'native review retry writes provider subscription');
  perform pg_temp.assert_false(v_result.compatibility_refreshed, 'native review does not write live entitlement');
  perform pg_temp.assert_true(v_result.native_review_entitlement_refreshed, 'native review entitlement refreshed');
  perform pg_temp.assert_eq_text(v_result.entitlement_scope, 'native_review', 'native review entitlement scope returned');
  perform pg_temp.assert_false(v_result.retryable, 'native review retry is no longer retryable');
  perform pg_temp.assert_fixture_counts(v_native_prefix, v_native_user, 1, 1, 1, 1, 0, 'production sandbox retry recovery');
  perform pg_temp.assert_eq_text(
    (select plan from billing.apple_native_sandbox_entitlements where user_id = v_native_user),
    'pro',
    'production sandbox writes isolated native Pro entitlement'
  );
  perform pg_temp.assert_eq_text(
    (select status from public.entitlements where user_id = v_native_user),
    'free',
    'normal public entitlement remains Free for production sandbox purchase'
  );

  select *
  into strict v_result
  from public.process_apple_purchase_verification(
    'sandbox',
    'production',
    v_native_user,
    v_user_ref,
    v_native_prefix || 'second-current',
    'purchase_verification',
    null,
    v_as_of + interval '2 minutes',
    v_payload_hash_2,
    'com.canyougeo.app',
    '6791248782',
    'com.canyougeo.pro.monthly',
    'com.canyougeo.app:com.canyougeo.pro.monthly',
    v_original_ref,
    'fixture-5d2d-original',
    v_transaction_ref_2,
    v_native_user,
    'active',
    true,
    v_as_of,
    v_future + interval '1 hour',
    null,
    null,
    null,
    null,
    null,
    true,
    v_as_of + interval '2 minutes'
  );

  perform pg_temp.assert_eq_text(v_result.result, 'processed', 'second verification updates same native entitlement');
  perform pg_temp.assert_fixture_counts(v_native_prefix, v_native_user, 2, 1, 1, 1, 0, 'production sandbox upsert idempotency');
  perform pg_temp.assert_eq_text(
    (select provider_transaction_ref from billing.provider_subscriptions where provider = 'apple' and user_id = v_native_user),
    v_transaction_ref_2,
    'second verification updates existing provider subscription'
  );

  select *
  into strict v_result
  from public.process_apple_purchase_verification(
    'sandbox',
    'production',
    v_native_user,
    v_user_ref,
    v_native_prefix || 'second-current',
    'purchase_verification',
    null,
    v_as_of + interval '3 minutes',
    v_payload_hash_2,
    'com.canyougeo.app',
    '6791248782',
    'com.canyougeo.pro.monthly',
    'com.canyougeo.app:com.canyougeo.pro.monthly',
    v_original_ref,
    'fixture-5d2d-original',
    v_transaction_ref_2,
    v_native_user,
    'active',
    true,
    v_as_of,
    v_future + interval '1 hour',
    null,
    null,
    null,
    null,
    null,
    true,
    v_as_of + interval '3 minutes'
  );

  perform pg_temp.assert_eq_text(v_result.result, 'already_processed', 'same logical verified transaction remains idempotent');
  perform pg_temp.assert_true(v_result.already_processed, 'same event reports already processed');
  perform pg_temp.assert_fixture_counts(v_native_prefix, v_native_user, 2, 1, 1, 1, 0, 'same transaction idempotency');

  select *
  into strict v_result
  from public.process_apple_purchase_verification(
    'sandbox',
    'staging',
    v_staging_user,
    v_staging_user_ref,
    v_staging_prefix || 'current',
    'purchase_verification',
    null,
    v_as_of + interval '4 minutes',
    v_staging_payload_hash,
    'com.canyougeo.app',
    '6791248782',
    'com.canyougeo.pro.monthly',
    'com.canyougeo.app:com.canyougeo.pro.monthly',
    v_staging_original_ref,
    'fixture-5d2d-staging-original',
    v_staging_transaction_ref,
    v_staging_user,
    'active',
    true,
    v_as_of,
    v_future,
    null,
    null,
    null,
    null,
    null,
    true,
    v_as_of + interval '4 minutes'
  );

  perform pg_temp.assert_eq_text(v_result.result, 'processed', 'staging sandbox still processes');
  perform pg_temp.assert_true(v_result.compatibility_refreshed, 'staging sandbox writes public compatibility entitlement');
  perform pg_temp.assert_false(v_result.native_review_entitlement_refreshed, 'staging sandbox does not write native review lane');
  perform pg_temp.assert_fixture_counts(v_staging_prefix, v_staging_user, 1, 1, 1, 0, 1, 'staging sandbox compatibility path');

  select *
  into strict v_result
  from public.process_apple_purchase_verification(
    'production',
    'production',
    v_live_user,
    v_live_user_ref,
    v_live_prefix || 'current',
    'purchase_verification',
    null,
    v_as_of + interval '5 minutes',
    v_live_payload_hash,
    'com.canyougeo.app',
    '6791248782',
    'com.canyougeo.pro.monthly',
    'com.canyougeo.app:com.canyougeo.pro.monthly',
    v_live_original_ref,
    'fixture-5d2d-live-original',
    v_live_transaction_ref,
    v_live_user,
    'active',
    true,
    v_as_of,
    v_future,
    null,
    null,
    null,
    null,
    null,
    false,
    v_as_of + interval '5 minutes'
  );

  perform pg_temp.assert_eq_text(v_result.result, 'processed', 'production Apple purchase still processes');
  perform pg_temp.assert_true(v_result.compatibility_refreshed, 'production Apple purchase writes live public entitlement');
  perform pg_temp.assert_false(v_result.native_review_entitlement_refreshed, 'production Apple purchase does not write native review lane');
  perform pg_temp.assert_fixture_counts(v_live_prefix, v_live_user, 1, 1, 1, 0, 1, 'production Apple live path');

  perform pg_temp.assert_eq_int(
    (select count(*)::integer from billing.provider_events where provider in ('stripe', 'google_play') and provider_event_ref like 'verify:fixture_5d2d:%'),
    0,
    'Stripe and Google provider ledgers unaffected'
  );
end $$;

rollback;
