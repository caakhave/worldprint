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
  p_expected_provider_events integer,
  p_expected_provider_subscriptions integer,
  p_expected_transaction_chains integer,
  p_expected_pro_entitlements integer,
  p_message text
)
returns void
language plpgsql
as $$
begin
  perform pg_temp.assert_eq_int(
    (select count(*)::integer from billing.provider_events where provider_event_ref like 'verify:fixture_5d1n2:%'),
    p_expected_provider_events,
    p_message || ': provider events'
  );
  perform pg_temp.assert_eq_int(
    (
      select count(*)::integer
      from billing.provider_subscriptions
      where provider = 'apple'
        and provider_original_transaction_ref = 'apple_original_transaction_sha256_' || repeat('a', 64)
    ),
    p_expected_provider_subscriptions,
    p_message || ': provider subscriptions'
  );
  perform pg_temp.assert_eq_int(
    (
      select count(*)::integer
      from billing.apple_transaction_chains
      where original_transaction_id_fingerprint = 'apple_original_transaction_sha256_' || repeat('a', 64)
    ),
    p_expected_transaction_chains,
    p_message || ': transaction chains'
  );
  perform pg_temp.assert_eq_int(
    (select count(*)::integer from public.entitlements where user_id in (
      '00000000-0000-0000-0000-000000059210'::uuid,
      '00000000-0000-0000-0000-000000059211'::uuid
    ) and plan = 'pro' and status = 'active'),
    p_expected_pro_entitlements,
    p_message || ': pro entitlements'
  );
end;
$$;

do $$
declare
  v_user uuid := '00000000-0000-0000-0000-000000059210'::uuid;
  v_other_user uuid := '00000000-0000-0000-0000-000000059211'::uuid;
  v_user_ref text := 'user_uuid_sha256_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  v_other_user_ref text := 'user_uuid_sha256_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
  v_original_ref text := 'apple_original_transaction_sha256_' || repeat('a', 64);
  v_changed_original_ref text := 'apple_original_transaction_sha256_' || repeat('b', 64);
  v_transaction_ref text := 'apple_transaction_sha256_' || repeat('c', 64);
  v_changed_transaction_ref text := 'apple_transaction_sha256_' || repeat('d', 64);
  v_hash_a text := repeat('a', 64);
  v_hash_b text := repeat('b', 64);
  v_hash_c text := repeat('c', 64);
  v_as_of timestamptz := '2026-07-20 02:00:00+00'::timestamptz;
  v_result record;
begin
  perform pg_temp.add_profile(v_user);
  perform pg_temp.add_profile(v_other_user);

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
    'verify:fixture_5d1n2:attempt-a:failed-before-provider-write',
    'purchase_verification',
    null,
    v_as_of,
    v_as_of,
    v_as_of,
    'retry_pending',
    1,
    v_as_of,
    'failed',
    true,
    v_user,
    v_original_ref,
    v_original_ref,
    v_transaction_ref,
    v_hash_a,
    v_as_of,
    v_as_of
  );

  perform pg_temp.assert_fixture_counts(1, 0, 0, 0, 'attempt A failed before provider writes');

  select *
  into strict v_result
  from public.process_apple_purchase_verification(
    'sandbox',
    v_user,
    v_user_ref,
    'verify:fixture_5d1n2:attempt-b:refreshed-payload',
    'purchase_verification',
    null,
    v_as_of + interval '1 minute',
    v_hash_b,
    'com.canyougeo.app',
    '6791248782',
    'com.canyougeo.pro.monthly',
    'com.canyougeo.app:com.canyougeo.pro.monthly',
    v_original_ref,
    'fixture-5d1n2-original',
    v_transaction_ref,
    v_user,
    'active',
    true,
    v_as_of,
    v_as_of + interval '30 minutes',
    null,
    null,
    null,
    null,
    null,
    true,
    v_as_of + interval '1 minute'
  );

  perform pg_temp.assert_eq_text(v_result.result, 'processed', 'attempt B recovers with refreshed payload');
  perform pg_temp.assert_true(v_result.processed, 'attempt B is processed');
  perform pg_temp.assert_true(v_result.provider_subscription_changed, 'attempt B writes provider subscription');
  perform pg_temp.assert_true(v_result.compatibility_refreshed, 'attempt B refreshes compatibility entitlement');
  perform pg_temp.assert_false(v_result.reconciliation_required, 'attempt B does not require reconciliation');
  perform pg_temp.assert_fixture_counts(2, 1, 1, 1, 'attempt B recovery');

  perform pg_temp.assert_eq_text(
    (select processing_status from billing.provider_events where provider_event_ref = 'verify:fixture_5d1n2:attempt-b:refreshed-payload'),
    'processed',
    'attempt B provider event processed'
  );
  perform pg_temp.assert_eq_text(
    (select plan from public.entitlements where user_id = v_user),
    'pro',
    'attempt B grants Pro'
  );

  select *
  into strict v_result
  from public.process_apple_purchase_verification(
    'sandbox',
    v_user,
    v_user_ref,
    'verify:fixture_5d1n2:attempt-b:refreshed-payload',
    'purchase_verification',
    null,
    v_as_of + interval '2 minutes',
    v_hash_b,
    'com.canyougeo.app',
    '6791248782',
    'com.canyougeo.pro.monthly',
    'com.canyougeo.app:com.canyougeo.pro.monthly',
    v_original_ref,
    'fixture-5d1n2-original',
    v_transaction_ref,
    v_user,
    'active',
    true,
    v_as_of,
    v_as_of + interval '30 minutes',
    null,
    null,
    null,
    null,
    null,
    true,
    v_as_of + interval '2 minutes'
  );

  perform pg_temp.assert_eq_text(v_result.result, 'already_processed', 'attempt C is idempotent');
  perform pg_temp.assert_true(v_result.already_processed, 'attempt C reports already processed');
  perform pg_temp.assert_fixture_counts(2, 1, 1, 1, 'attempt C idempotency');

  select *
  into strict v_result
  from public.process_apple_purchase_verification(
    'sandbox',
    v_other_user,
    v_other_user_ref,
    'verify:fixture_5d1n2:changed-user',
    'purchase_verification',
    null,
    v_as_of + interval '3 minutes',
    v_hash_c,
    'com.canyougeo.app',
    '6791248782',
    'com.canyougeo.pro.monthly',
    'com.canyougeo.app:com.canyougeo.pro.monthly',
    v_original_ref,
    'fixture-5d1n2-original',
    v_transaction_ref,
    v_other_user,
    'active',
    true,
    v_as_of,
    v_as_of + interval '30 minutes',
    null,
    null,
    null,
    null,
    null,
    true,
    v_as_of + interval '3 minutes'
  );

  perform pg_temp.assert_eq_text(v_result.result, 'ownership_conflict', 'changed user fails closed');
  perform pg_temp.assert_fixture_counts(3, 1, 1, 1, 'changed user conflict');

  select *
  into strict v_result
  from public.process_apple_purchase_verification(
    'production',
    v_user,
    v_user_ref,
    'verify:fixture_5d1n2:changed-environment',
    'purchase_verification',
    null,
    v_as_of + interval '4 minutes',
    repeat('d', 64),
    'com.canyougeo.app',
    '6791248782',
    'com.canyougeo.pro.monthly',
    'com.canyougeo.app:com.canyougeo.pro.monthly',
    v_original_ref,
    'fixture-5d1n2-original',
    v_transaction_ref,
    v_user,
    'active',
    true,
    v_as_of,
    v_as_of + interval '30 minutes',
    null,
    null,
    null,
    null,
    null,
    false,
    v_as_of + interval '4 minutes'
  );

  perform pg_temp.assert_eq_text(v_result.result, 'environment_conflict', 'changed environment fails closed');
  perform pg_temp.assert_fixture_counts(4, 1, 1, 1, 'changed environment conflict');

  select *
  into strict v_result
  from public.process_apple_purchase_verification(
    'sandbox',
    v_user,
    v_user_ref,
    'verify:fixture_5d1n2:changed-original',
    'purchase_verification',
    null,
    v_as_of + interval '5 minutes',
    repeat('e', 64),
    'com.canyougeo.app',
    '6791248782',
    'com.canyougeo.pro.monthly',
    'com.canyougeo.app:com.canyougeo.pro.monthly',
    v_changed_original_ref,
    'fixture-5d1n2-other-original',
    v_transaction_ref,
    v_user,
    'active',
    true,
    v_as_of,
    v_as_of + interval '30 minutes',
    null,
    null,
    null,
    null,
    null,
    true,
    v_as_of + interval '5 minutes'
  );

  perform pg_temp.assert_eq_text(v_result.result, 'failed', 'changed original transaction fails closed through existing transaction identity uniqueness');
  perform pg_temp.assert_fixture_counts(5, 1, 1, 1, 'changed original transaction rejection');

  select *
  into strict v_result
  from public.process_apple_purchase_verification(
    'sandbox',
    v_user,
    v_user_ref,
    'verify:fixture_5d1n2:changed-transaction',
    'purchase_verification',
    null,
    v_as_of + interval '6 minutes',
    repeat('f', 64),
    'com.canyougeo.app',
    '6791248782',
    'com.canyougeo.pro.monthly',
    'com.canyougeo.app:com.canyougeo.pro.monthly',
    v_changed_original_ref,
    'fixture-5d1n2-other-original',
    'apple_transaction_sha256_invalid',
    v_user,
    'active',
    true,
    v_as_of,
    v_as_of + interval '30 minutes',
    null,
    null,
    null,
    null,
    null,
    true,
    v_as_of + interval '6 minutes'
  );

  perform pg_temp.assert_eq_text(v_result.result, 'invalid_apple_purchase_verification', 'changed transaction identity fails closed when fingerprint shape is invalid');
  perform pg_temp.assert_fixture_counts(5, 1, 1, 1, 'changed transaction identity rejection');

  select *
  into strict v_result
  from public.process_apple_purchase_verification(
    'sandbox',
    v_user,
    v_user_ref,
    'verify:fixture_5d1n2:changed-app-account-token',
    'purchase_verification',
    null,
    v_as_of + interval '7 minutes',
    repeat('7', 64),
    'com.canyougeo.app',
    '6791248782',
    'com.canyougeo.pro.monthly',
    'com.canyougeo.app:com.canyougeo.pro.monthly',
    v_changed_original_ref,
    'fixture-5d1n2-other-original',
    v_changed_transaction_ref,
    v_other_user,
    'active',
    true,
    v_as_of,
    v_as_of + interval '30 minutes',
    null,
    null,
    null,
    null,
    null,
    true,
    v_as_of + interval '7 minutes'
  );

  perform pg_temp.assert_eq_text(v_result.result, 'invalid_apple_purchase_verification', 'changed appAccountToken fails closed');
  perform pg_temp.assert_fixture_counts(5, 1, 1, 1, 'changed appAccountToken rejection');

  select *
  into strict v_result
  from public.process_apple_purchase_verification(
    'sandbox',
    v_user,
    v_user_ref,
    'verify:fixture_5d1n2:changed-product-same-event',
    'purchase_verification',
    null,
    v_as_of + interval '8 minutes',
    repeat('8', 64),
    'com.canyougeo.app',
    '6791248782',
    'com.canyougeo.pro.unapproved',
    'com.canyougeo.app:com.canyougeo.pro.unapproved',
    v_original_ref,
    'fixture-5d1n2-original',
    v_transaction_ref,
    v_user,
    'active',
    true,
    v_as_of,
    v_as_of + interval '30 minutes',
    null,
    null,
    null,
    null,
    null,
    true,
    v_as_of + interval '8 minutes'
  );

  perform pg_temp.assert_eq_text(v_result.result, 'invalid_apple_purchase_verification', 'changed product fails closed when product is outside the approved catalog');
  perform pg_temp.assert_fixture_counts(5, 1, 1, 1, 'changed product rejection');
end $$;

rollback;
