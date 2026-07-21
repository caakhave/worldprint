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

create function pg_temp.assert_native_counts(
  p_user_id uuid,
  p_expected_events integer,
  p_expected_subscriptions integer,
  p_expected_chains integer,
  p_expected_native_rows integer,
  p_expected_public_pro_rows integer,
  p_message text
)
returns void
language plpgsql
as $$
begin
  perform pg_temp.assert_eq_int(
    (select count(*)::integer from billing.provider_events where provider = 'apple' and related_user_id = p_user_id),
    p_expected_events,
    p_message || ': provider events'
  );
  perform pg_temp.assert_eq_int(
    (select count(*)::integer from billing.provider_subscriptions where provider = 'apple' and user_id = p_user_id),
    p_expected_subscriptions,
    p_message || ': provider subscriptions'
  );
  perform pg_temp.assert_eq_int(
    (select count(*)::integer from billing.apple_transaction_chains where user_id = p_user_id),
    p_expected_chains,
    p_message || ': transaction chains'
  );
  perform pg_temp.assert_eq_int(
    (select count(*)::integer from billing.apple_native_sandbox_entitlements where user_id = p_user_id),
    p_expected_native_rows,
    p_message || ': native sandbox entitlements'
  );
  perform pg_temp.assert_eq_int(
    (select count(*)::integer from public.entitlements where user_id = p_user_id and plan = 'pro' and status = 'active'),
    p_expected_public_pro_rows,
    p_message || ': public pro entitlement rows'
  );
end;
$$;

do $$
declare
  v_user uuid := '00000000-0000-4000-8000-000000052d40'::uuid;
  v_other_user uuid := '00000000-0000-4000-8000-000000052d41'::uuid;
  v_expired_user uuid := '00000000-0000-4000-8000-000000052d42'::uuid;
  v_user_ref text := 'user_uuid_sha256_' || repeat('a', 64);
  v_other_user_ref text := 'user_uuid_sha256_' || repeat('b', 64);
  v_expired_user_ref text := 'user_uuid_sha256_' || repeat('c', 64);
  v_original_ref text := 'apple_original_transaction_sha256_' || repeat('d', 64);
  v_expired_original_ref text := 'apple_original_transaction_sha256_' || repeat('e', 64);
  v_transaction_ref text := 'apple_transaction_sha256_' || repeat('f', 64);
  v_expired_transaction_ref text := 'apple_transaction_sha256_' || repeat('1', 64);
  v_event_ref text := 'verify:fixture_5d2d_rehydrate:current';
  v_expired_event_ref text := 'verify:fixture_5d2d_rehydrate:expired';
  v_payload_hash text := repeat('2', 64);
  v_expired_payload_hash text := repeat('3', 64);
  v_conflicting_payload_hash text := repeat('4', 64);
  v_as_of timestamptz := '2026-07-21 01:45:00+00'::timestamptz;
  v_future timestamptz := '2026-07-21 02:45:00+00'::timestamptz;
  v_past timestamptz := '2026-07-21 00:45:00+00'::timestamptz;
  v_result record;
begin
  perform pg_temp.add_profile(v_user);
  perform pg_temp.add_profile(v_other_user);
  perform pg_temp.add_profile(v_expired_user);

  insert into public.entitlements (user_id, plan, status, updated_at)
  values
    (v_user, 'free', 'free', v_as_of),
    (v_other_user, 'free', 'free', v_as_of),
    (v_expired_user, 'free', 'free', v_as_of)
  on conflict on constraint entitlements_pkey do update
    set plan = excluded.plan,
        status = excluded.status,
        updated_at = excluded.updated_at;

  execute 'set local role service_role';

  select *
  into strict v_result
  from public.process_apple_purchase_verification(
    'sandbox',
    'production',
    v_user,
    v_user_ref,
    v_event_ref,
    'purchase_verification',
    null,
    v_as_of,
    v_payload_hash,
    'com.canyougeo.app',
    '6791248782',
    'com.canyougeo.pro.monthly',
    'com.canyougeo.app:com.canyougeo.pro.monthly',
    v_original_ref,
    'fixture-5d2d-rehydrate-original-current',
    v_transaction_ref,
    v_user,
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
    v_as_of
  );

  perform pg_temp.assert_true(v_result.processed, 'first production sandbox purchase verification processes');
  perform pg_temp.assert_false(v_result.compatibility_refreshed, 'first production sandbox verification does not refresh live entitlement');
  perform pg_temp.assert_true(v_result.native_review_entitlement_refreshed, 'first production sandbox verification refreshes native review entitlement');
  perform pg_temp.assert_eq_text(v_result.entitlement_scope, 'native_review', 'first production sandbox verification reports native review scope');
  perform pg_temp.assert_eq_text(
    (select plan from public.entitlements where user_id = v_user),
    'free',
    'normal public entitlement remains Free for production sandbox purchase'
  );
  perform pg_temp.assert_eq_text(
    (select plan from billing.apple_native_sandbox_entitlements where user_id = v_user),
    'pro',
    'native review entitlement records Pro'
  );
  perform pg_temp.assert_native_counts(v_user, 1, 1, 1, 1, 0, 'after first verified purchase');

  update billing.apple_native_sandbox_entitlements
  set plan = 'free',
      status = 'canceled',
      current_period_end = v_past,
      updated_at = v_as_of + interval '1 minute'
  where user_id = v_user;

  select *
  into strict v_result
  from public.process_apple_purchase_verification(
    'sandbox',
    'production',
    v_user,
    v_user_ref,
    v_event_ref,
    'purchase_verification',
    null,
    v_as_of,
    v_payload_hash,
    'com.canyougeo.app',
    '6791248782',
    'com.canyougeo.pro.monthly',
    'com.canyougeo.app:com.canyougeo.pro.monthly',
    v_original_ref,
    'fixture-5d2d-rehydrate-original-current',
    v_transaction_ref,
    v_user,
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
    v_as_of + interval '2 minutes'
  );

  perform pg_temp.assert_true(v_result.already_processed, 'already processed purchase verification is idempotent');
  perform pg_temp.assert_true(v_result.native_review_entitlement_refreshed, 'already processed purchase verification rehydrates native review entitlement');
  perform pg_temp.assert_eq_text(v_result.entitlement_scope, 'native_review', 'already processed purchase verification returns native review scope');
  perform pg_temp.assert_eq_text(
    (select plan from billing.apple_native_sandbox_entitlements where user_id = v_user),
    'pro',
    'idempotent verification restores native review Pro after process restart'
  );
  perform pg_temp.assert_native_counts(v_user, 1, 1, 1, 1, 0, 'after idempotent rehydration');

  select *
  into strict v_result
  from public.process_apple_purchase_verification(
    'sandbox',
    'production',
    v_other_user,
    v_other_user_ref,
    v_event_ref,
    'purchase_verification',
    null,
    v_as_of,
    v_payload_hash,
    'com.canyougeo.app',
    '6791248782',
    'com.canyougeo.pro.monthly',
    'com.canyougeo.app:com.canyougeo.pro.monthly',
    v_original_ref,
    'fixture-5d2d-rehydrate-original-current',
    v_transaction_ref,
    v_other_user,
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
    v_as_of + interval '3 minutes'
  );

  perform pg_temp.assert_true(v_result.already_processed, 'duplicate event remains already processed for different user');
  perform pg_temp.assert_false(v_result.native_review_entitlement_refreshed, 'different user cannot rehydrate an already processed native review event');
  perform pg_temp.assert_eq_text(v_result.entitlement_scope, 'none', 'different user receives no entitlement scope');
  perform pg_temp.assert_native_counts(v_other_user, 0, 0, 0, 0, 0, 'after different-user idempotent attempt');

  select *
  into strict v_result
  from public.process_apple_purchase_verification(
    'sandbox',
    'production',
    v_expired_user,
    v_expired_user_ref,
    v_expired_event_ref,
    'purchase_verification',
    null,
    v_as_of,
    v_expired_payload_hash,
    'com.canyougeo.app',
    '6791248782',
    'com.canyougeo.pro.monthly',
    'com.canyougeo.app:com.canyougeo.pro.monthly',
    v_expired_original_ref,
    'fixture-5d2d-rehydrate-original-expired',
    v_expired_transaction_ref,
    v_expired_user,
    'expired',
    false,
    v_as_of - interval '2 hours',
    v_past,
    null,
    null,
    v_past,
    null,
    null,
    true,
    v_as_of
  );

  perform pg_temp.assert_true(v_result.processed, 'expired production sandbox purchase verification processes');
  perform pg_temp.assert_false(v_result.native_review_entitlement_refreshed, 'expired production sandbox state does not refresh native review Pro');
  perform pg_temp.assert_eq_text(v_result.entitlement_scope, 'none', 'expired production sandbox state returns no entitlement scope');
  perform pg_temp.assert_eq_text(
    (select plan from billing.apple_native_sandbox_entitlements where user_id = v_expired_user),
    'free',
    'expired production sandbox state records native Free'
  );
  perform pg_temp.assert_native_counts(v_expired_user, 1, 1, 1, 1, 0, 'after expired verified purchase');

  select *
  into strict v_result
  from public.process_apple_purchase_verification(
    'sandbox',
    'production',
    v_user,
    v_user_ref,
    v_event_ref,
    'purchase_verification',
    null,
    v_as_of,
    v_conflicting_payload_hash,
    'com.canyougeo.app',
    '6791248782',
    'com.canyougeo.pro.monthly',
    'com.canyougeo.app:com.canyougeo.pro.monthly',
    v_original_ref,
    'fixture-5d2d-rehydrate-original-current',
    v_transaction_ref,
    v_user,
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

  perform pg_temp.assert_eq_text(v_result.result, 'payload_conflict', 'conflicting payload hash fails closed');
  perform pg_temp.assert_false(v_result.native_review_entitlement_refreshed, 'payload conflict does not refresh native review entitlement');
  perform pg_temp.assert_eq_text(v_result.entitlement_scope, 'none', 'payload conflict returns no entitlement scope');

  select *
  into strict v_result
  from public.process_apple_purchase_verification(
    'production',
    'staging',
    v_user,
    v_user_ref,
    'verify:fixture_5d2d_rehydrate:invalid-environment',
    'purchase_verification',
    null,
    v_as_of,
    repeat('5', 64),
    'com.canyougeo.app',
    '6791248782',
    'com.canyougeo.pro.monthly',
    'com.canyougeo.app:com.canyougeo.pro.monthly',
    'apple_original_transaction_sha256_' || repeat('6', 64),
    'fixture-5d2d-rehydrate-original-invalid-environment',
    'apple_transaction_sha256_' || repeat('7', 64),
    v_user,
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
    v_as_of + interval '5 minutes'
  );

  perform pg_temp.assert_eq_text(v_result.result, 'invalid_deployment_environment', 'staging deployment rejects production Apple verification');
  perform pg_temp.assert_false(v_result.native_review_entitlement_refreshed, 'invalid environment does not refresh native review entitlement');
  perform pg_temp.assert_eq_text(v_result.entitlement_scope, 'none', 'invalid environment returns no entitlement scope');
end $$;

rollback;
