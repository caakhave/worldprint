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

create function pg_temp.add_public_entitlement(
  p_user_id uuid,
  p_plan text,
  p_status text,
  p_as_of timestamptz
)
returns void
language plpgsql
as $$
begin
  insert into public.entitlements (user_id, plan, status, updated_at)
  values (p_user_id, p_plan, p_status, p_as_of)
  on conflict on constraint entitlements_pkey do update
    set plan = excluded.plan,
        status = excluded.status,
        updated_at = excluded.updated_at;
end;
$$;

create function pg_temp.add_apple_subscription(
  p_user_id uuid,
  p_environment text,
  p_status text,
  p_suffix text,
  p_as_of timestamptz,
  p_period_end timestamptz
)
returns uuid
language plpgsql
as $$
declare
  v_id uuid := gen_random_uuid();
  v_original_ref text := 'apple_original_transaction_sha256_' || repeat(substr(p_suffix, 1, 1), 64);
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
    expires_at,
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
    v_original_ref,
    v_original_ref,
    'apple_transaction_sha256_' || repeat(substr(p_suffix, 2, 1), 64),
    p_user_id,
    p_status,
    p_status in ('active', 'cancelled_active_until_period_end', 'grace_period'),
    false,
    p_as_of - interval '10 minutes',
    p_as_of - interval '10 minutes',
    case when p_status in ('active', 'cancelled_active_until_period_end', 'grace_period') then p_period_end else null end,
    case when p_status in ('expired', 'refunded', 'revoked') then p_as_of else null end,
    p_as_of,
    p_as_of,
    'fixture_6c1a_race_' || p_suffix,
    'current',
    p_as_of,
    p_as_of
  );

  return v_id;
end;
$$;

do $$
declare
  v_native_user uuid := '00000000-0000-4000-8000-000000061a01'::uuid;
  v_missing_native_user uuid := '00000000-0000-4000-8000-000000061a02'::uuid;
  v_staging_user uuid := '00000000-0000-4000-8000-000000061a03'::uuid;
  v_live_user uuid := '00000000-0000-4000-8000-000000061a04'::uuid;
  v_inactive_native_user uuid := '00000000-0000-4000-8000-000000061a05'::uuid;
  v_wrong_native_user uuid := '00000000-0000-4000-8000-000000061a06'::uuid;
  v_purchase_first_user uuid := '00000000-0000-4000-8000-000000061a07'::uuid;
  v_owner_user uuid := '00000000-0000-4000-8000-000000061a08'::uuid;
  v_conflict_user uuid := '00000000-0000-4000-8000-000000061a09'::uuid;
  v_user_ref text := 'user_uuid_sha256_' || repeat('a', 64);
  v_owner_user_ref text := 'user_uuid_sha256_' || repeat('8', 64);
  v_conflict_user_ref text := 'user_uuid_sha256_' || repeat('9', 64);
  v_original_ref text := 'apple_original_transaction_sha256_' || repeat('b', 64);
  v_purchase_first_original_ref text := 'apple_original_transaction_sha256_' || repeat('0', 64);
  v_conflict_original_ref text := 'apple_original_transaction_sha256_' || repeat('2', 64);
  v_other_environment_original_ref text := 'apple_original_transaction_sha256_' || repeat('4', 64);
  v_transaction_ref text := 'apple_transaction_sha256_' || repeat('c', 64);
  v_purchase_first_transaction_ref text := 'apple_transaction_sha256_' || repeat('1', 64);
  v_conflict_transaction_ref text := 'apple_transaction_sha256_' || repeat('3', 64);
  v_payload_hash text := repeat('d', 64);
  v_payload_hash_2 text := repeat('f', 64);
  v_payload_hash_3 text := repeat('6', 64);
  v_payload_hash_4 text := repeat('7', 64);
  v_notification_payload_hash text := repeat('e', 64);
  v_as_of timestamptz := '2026-07-22 18:00:00+00'::timestamptz;
  v_future timestamptz := '2026-07-22 19:00:00+00'::timestamptz;
  v_result record;
  v_subscription_id uuid;
  v_other_subscription_id uuid;
begin
  perform pg_temp.add_profile(v_native_user);
  perform pg_temp.add_profile(v_missing_native_user);
  perform pg_temp.add_profile(v_staging_user);
  perform pg_temp.add_profile(v_live_user);
  perform pg_temp.add_profile(v_inactive_native_user);
  perform pg_temp.add_profile(v_wrong_native_user);
  perform pg_temp.add_profile(v_purchase_first_user);
  perform pg_temp.add_profile(v_owner_user);
  perform pg_temp.add_profile(v_conflict_user);

  perform pg_temp.add_public_entitlement(v_native_user, 'free', 'free', v_as_of);

  insert into billing.provider_events (
    provider,
    environment,
    provider_event_ref,
    event_type,
    event_subtype,
    occurred_at,
    effective_at,
    received_at,
    processed_at,
    processing_status,
    attempt_count,
    last_attempted_at,
    last_error_code,
    reconciliation_required,
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
    'notification:fixture-6c1a-race-initial-buy',
    'SUBSCRIBED',
    'INITIAL_BUY',
    v_as_of - interval '1 minute',
    v_as_of - interval '1 minute',
    v_as_of - interval '1 minute',
    v_as_of - interval '1 minute',
    'reconciliation_required',
    1,
    v_as_of - interval '1 minute',
    'unbound_original_transaction',
    true,
    v_original_ref,
    v_original_ref,
    v_transaction_ref,
    v_notification_payload_hash,
    v_as_of - interval '1 minute',
    v_as_of - interval '1 minute'
  );

  execute 'set local role service_role';

  select *
  into strict v_result
  from public.process_apple_purchase_verification(
    'sandbox',
    'production',
    v_native_user,
    v_user_ref,
    'verify:fixture-6c1a-race',
    'purchase_verification',
    null,
    v_as_of,
    v_payload_hash,
    'com.canyougeo.app',
    '6791248782',
    'com.canyougeo.pro.monthly',
    'com.canyougeo.app:com.canyougeo.pro.monthly',
    v_original_ref,
    'fixture-6c1a-original',
    v_transaction_ref,
    v_native_user,
    'active',
    true,
    v_as_of - interval '2 minutes',
    v_future,
    null,
    null,
    null,
    null,
    null,
    true,
    v_as_of
  );

  perform pg_temp.assert_eq_text(v_result.result, 'processed', 'purchase verification is accepted');
  perform pg_temp.assert_true(v_result.native_review_entitlement_refreshed, 'production sandbox native review entitlement refreshed');
  perform pg_temp.assert_eq_text(v_result.entitlement_scope, 'native_review', 'production sandbox result stays in native review scope');
  perform pg_temp.assert_eq_text(
    (select plan from public.entitlements where user_id = v_native_user),
    'free',
    'production sandbox leaves public entitlement Free'
  );
  perform pg_temp.assert_eq_text(
    (select plan from billing.apple_native_sandbox_entitlements where user_id = v_native_user),
    'pro',
    'production sandbox writes native Pro'
  );
  perform pg_temp.assert_eq_int(
    (
      select count(*)::integer
      from billing.provider_events
      where provider_event_ref = 'notification:fixture-6c1a-race-initial-buy'
        and processing_status = 'processed'
        and last_error_code is null
        and reconciliation_required is false
        and related_user_id = v_native_user
        and provider_subscription_id is not null
        and attempt_count = 1
    ),
    1,
    'verified purchase resolves the earlier unbound INITIAL_BUY notification without replay'
  );
  perform pg_temp.assert_eq_int(
    (
      select count(*)::integer
      from billing.apple_subscription_reconciliation_candidates('sandbox', 'production', v_as_of, interval '12 hours')
      where user_id = v_native_user
    ),
    0,
    'active production-sandbox provider with matching native Pro is consistent'
  );

  select *
  into strict v_result
  from public.process_apple_purchase_verification(
    'sandbox',
    'production',
    v_native_user,
    v_user_ref,
    'verify:fixture-6c1a-race',
    'purchase_verification',
    null,
    v_as_of,
    v_payload_hash,
    'com.canyougeo.app',
    '6791248782',
    'com.canyougeo.pro.monthly',
    'com.canyougeo.app:com.canyougeo.pro.monthly',
    v_original_ref,
    'fixture-6c1a-original',
    v_transaction_ref,
    v_native_user,
    'active',
    true,
    v_as_of - interval '2 minutes',
    v_future,
    null,
    null,
    null,
    null,
    null,
    true,
    v_as_of
  );

  perform pg_temp.assert_eq_text(v_result.result, 'already_processed', 'repeated verification remains idempotent');
  perform pg_temp.assert_eq_int(
    (
      select count(*)::integer
      from billing.provider_subscriptions
      where provider = 'apple'
        and environment = 'sandbox'
        and provider_original_transaction_ref = v_original_ref
    ),
    1,
    'repeated verification creates no duplicate provider subscription'
  );
  perform pg_temp.assert_eq_int(
    (
      select count(*)::integer
      from billing.apple_transaction_chains
      where provider_environment = 'sandbox'
        and original_transaction_id_fingerprint = v_original_ref
    ),
    1,
    'repeated verification creates no duplicate chain'
  );

  v_subscription_id := pg_temp.add_apple_subscription(v_missing_native_user, 'sandbox', 'active', 'ef', v_as_of, v_future);
  perform pg_temp.add_public_entitlement(v_missing_native_user, 'free', 'free', v_as_of);
  perform pg_temp.assert_eq_text(
    (
      select reason
      from billing.apple_subscription_reconciliation_candidates('sandbox', 'production', v_as_of, interval '12 hours')
      where provider_subscription_id = v_subscription_id
    ),
    'entitlement_inconsistent',
    'active production-sandbox provider without native Pro is inconsistent'
  );

  v_subscription_id := pg_temp.add_apple_subscription(v_wrong_native_user, 'sandbox', 'active', '78', v_as_of, v_future);
  v_other_subscription_id := pg_temp.add_apple_subscription(v_wrong_native_user, 'sandbox', 'active', '9a', v_as_of, v_future);
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
    v_wrong_native_user,
    'pro',
    'active',
    false,
    v_future,
    v_other_subscription_id,
    v_as_of,
    v_as_of
  );
  perform pg_temp.assert_eq_text(
    (
      select reason
      from billing.apple_subscription_reconciliation_candidates('sandbox', 'production', v_as_of, interval '12 hours')
      where provider_subscription_id = v_subscription_id
    ),
    'entitlement_inconsistent',
    'active production-sandbox provider with native Pro linked to the wrong subscription is inconsistent'
  );

  v_subscription_id := pg_temp.add_apple_subscription(v_staging_user, 'sandbox', 'active', '12', v_as_of, v_future);
  perform pg_temp.add_public_entitlement(v_staging_user, 'pro', 'active', v_as_of);
  perform pg_temp.assert_eq_int(
    (
      select count(*)::integer
      from billing.apple_subscription_reconciliation_candidates('sandbox', 'staging', v_as_of, interval '12 hours')
      where provider_subscription_id = v_subscription_id
    ),
    0,
    'staging sandbox active provider uses public entitlement projection'
  );

  v_subscription_id := pg_temp.add_apple_subscription(v_live_user, 'production', 'active', '34', v_as_of, v_future);
  perform pg_temp.add_public_entitlement(v_live_user, 'pro', 'active', v_as_of);
  perform pg_temp.assert_eq_int(
    (
      select count(*)::integer
      from billing.apple_subscription_reconciliation_candidates('production', 'production', v_as_of, interval '12 hours')
      where provider_subscription_id = v_subscription_id
    ),
    0,
    'production live Apple active provider uses public entitlement projection'
  );

  v_subscription_id := pg_temp.add_apple_subscription(v_inactive_native_user, 'sandbox', 'expired', '56', v_as_of, v_future);
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
    v_inactive_native_user,
    'pro',
    'active',
    false,
    null,
    v_subscription_id,
    v_as_of,
    v_as_of
  );
  perform pg_temp.assert_eq_text(
    (
      select reason
      from billing.apple_subscription_reconciliation_candidates('sandbox', 'production', v_as_of, interval '12 hours')
      where provider_subscription_id = v_subscription_id
    ),
    'inactive_provider_still_granting',
    'inactive production-sandbox provider with stale native Pro is a candidate'
  );

  select *
  into strict v_result
  from public.process_apple_purchase_verification(
    'sandbox',
    'production',
    v_purchase_first_user,
    'user_uuid_sha256_' || repeat('1', 64),
    'verify:fixture-6c1a-purchase-first',
    'purchase_verification',
    null,
    v_as_of,
    v_payload_hash_2,
    'com.canyougeo.app',
    '6791248782',
    'com.canyougeo.pro.monthly',
    'com.canyougeo.app:com.canyougeo.pro.monthly',
    v_purchase_first_original_ref,
    'fixture-6c1a-purchase-first-original',
    v_purchase_first_transaction_ref,
    v_purchase_first_user,
    'active',
    true,
    v_as_of - interval '2 minutes',
    v_future,
    null,
    null,
    null,
    null,
    null,
    true,
    v_as_of
  );
  perform pg_temp.assert_eq_text(v_result.result, 'processed', 'purchase-first verification accepted');

  select *
  into strict v_result
  from public.process_apple_server_notification_event(
    'sandbox',
    'production',
    'notification:fixture-6c1a-purchase-first-renewal',
    'DID_RENEW',
    null,
    v_as_of + interval '1 minute',
    repeat('2', 64),
    'com.canyougeo.app',
    '6791248782',
    'com.canyougeo.pro.monthly',
    'com.canyougeo.app:com.canyougeo.pro.monthly',
    v_purchase_first_original_ref,
    'fixture-6c1a-purchase-first-original',
    'apple_transaction_sha256_' || repeat('5', 64),
    v_purchase_first_user,
    'active',
    true,
    v_as_of - interval '2 minutes',
    v_future + interval '1 hour',
    null,
    null,
    null,
    null,
    null,
    true,
    v_as_of + interval '1 minute'
  );
  perform pg_temp.assert_eq_text(v_result.result, 'processed', 'purchase-first notification processes normally');
  perform pg_temp.assert_false(v_result.reconciliation_required, 'purchase-first notification does not require reconciliation');

  perform pg_temp.add_public_entitlement(v_owner_user, 'free', 'free', v_as_of);
  select *
  into strict v_result
  from public.process_apple_purchase_verification(
    'sandbox',
    'production',
    v_owner_user,
    v_owner_user_ref,
    'verify:fixture-6c1a-owner-seed',
    'purchase_verification',
    null,
    v_as_of,
    v_payload_hash_3,
    'com.canyougeo.app',
    '6791248782',
    'com.canyougeo.pro.monthly',
    'com.canyougeo.app:com.canyougeo.pro.monthly',
    v_conflict_original_ref,
    'fixture-6c1a-conflict-original',
    v_conflict_transaction_ref,
    v_owner_user,
    'active',
    true,
    v_as_of - interval '2 minutes',
    v_future,
    null,
    null,
    null,
    null,
    null,
    true,
    v_as_of
  );
  perform pg_temp.assert_eq_text(v_result.result, 'processed', 'owner seed verification accepted');

  insert into billing.provider_events (
    provider,
    environment,
    provider_event_ref,
    event_type,
    event_subtype,
    occurred_at,
    effective_at,
    received_at,
    processed_at,
    processing_status,
    attempt_count,
    last_attempted_at,
    last_error_code,
    reconciliation_required,
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
    'notification:fixture-6c1a-conflict-not-repaired',
    'SUBSCRIBED',
    'INITIAL_BUY',
    v_as_of,
    v_as_of,
    v_as_of,
    v_as_of,
    'reconciliation_required',
    1,
    v_as_of,
    'unbound_original_transaction',
    true,
    v_conflict_original_ref,
    v_conflict_original_ref,
    v_conflict_transaction_ref,
    repeat('3', 64),
    v_as_of,
    v_as_of
  );

  select *
  into strict v_result
  from public.process_apple_purchase_verification(
    'sandbox',
    'production',
    v_conflict_user,
    v_conflict_user_ref,
    'verify:fixture-6c1a-conflict-user',
    'purchase_verification',
    null,
    v_as_of + interval '1 minute',
    v_payload_hash_4,
    'com.canyougeo.app',
    '6791248782',
    'com.canyougeo.pro.monthly',
    'com.canyougeo.app:com.canyougeo.pro.monthly',
    v_conflict_original_ref,
    'fixture-6c1a-conflict-original',
    'apple_transaction_sha256_' || repeat('6', 64),
    v_conflict_user,
    'active',
    true,
    v_as_of - interval '2 minutes',
    v_future,
    null,
    null,
    null,
    null,
    null,
    true,
    v_as_of + interval '1 minute'
  );
  perform pg_temp.assert_eq_text(v_result.result, 'ownership_conflict', 'ownership conflict still fails closed');
  perform pg_temp.assert_eq_text(
    (
      select processing_status
      from billing.provider_events
      where provider_event_ref = 'notification:fixture-6c1a-conflict-not-repaired'
    ),
    'reconciliation_required',
    'ownership-conflict notification is never auto-repaired'
  );

  insert into billing.provider_events (
    provider,
    environment,
    provider_event_ref,
    event_type,
    event_subtype,
    occurred_at,
    effective_at,
    received_at,
    processed_at,
    processing_status,
    attempt_count,
    last_attempted_at,
    last_error_code,
    reconciliation_required,
    provider_subscription_ref,
    provider_original_transaction_ref,
    provider_transaction_ref,
    payload_hash,
    created_at,
    updated_at
  )
  values (
    'apple',
    'production',
    'notification:fixture-6c1a-other-environment-not-repaired',
    'SUBSCRIBED',
    'INITIAL_BUY',
    v_as_of,
    v_as_of,
    v_as_of,
    v_as_of,
    'reconciliation_required',
    1,
    v_as_of,
    'unbound_original_transaction',
    true,
    v_original_ref,
    v_original_ref,
    v_transaction_ref,
    repeat('4', 64),
    v_as_of,
    v_as_of
  ),
  (
    'apple',
    'sandbox',
    'notification:fixture-6c1a-other-original-not-repaired',
    'SUBSCRIBED',
    'INITIAL_BUY',
    v_as_of,
    v_as_of,
    v_as_of,
    v_as_of,
    'reconciliation_required',
    1,
    v_as_of,
    'unbound_original_transaction',
    true,
    v_other_environment_original_ref,
    v_other_environment_original_ref,
    v_transaction_ref,
    repeat('5', 64),
    v_as_of,
    v_as_of
  );
  perform billing.repair_apple_unbound_notifications_after_purchase_verification(
    'sandbox',
    'production',
    v_native_user,
    'verify:fixture-6c1a-race',
    v_payload_hash,
    v_original_ref,
    v_as_of + interval '2 minutes'
  );
  perform pg_temp.assert_eq_int(
    (
      select count(*)::integer
      from billing.provider_events
      where provider_event_ref in (
        'notification:fixture-6c1a-other-environment-not-repaired',
        'notification:fixture-6c1a-other-original-not-repaired'
      )
        and processing_status = 'reconciliation_required'
        and last_error_code = 'unbound_original_transaction'
    ),
    2,
    'different environment or original fingerprint is never repaired'
  );

  perform pg_temp.assert_eq_int(
    (
      select count(*)::integer
      from billing.provider_events
      where provider in ('stripe', 'google_play')
        and (
          provider_event_ref like '%fixture-6c1a%'
          or coalesce(provider_original_transaction_ref, '') like '%fixture-6c1a%'
        )
    ),
    0,
    'Stripe and Google provider events are untouched'
  );
  perform pg_temp.assert_eq_int(
    (
      select count(*)::integer
      from billing.provider_subscriptions
      where provider in ('stripe', 'google_play')
        and (
          provider_subscription_ref like '%fixture-6c1a%'
          or coalesce(provider_original_transaction_ref, '') like '%fixture-6c1a%'
        )
    ),
    0,
    'Stripe and Google provider subscriptions are untouched'
  );

  perform set_config('cgy.apple_deployment_mode', '', true);
  perform pg_temp.assert_eq_text(
    (
      select reason
      from billing.apple_subscription_reconciliation_candidates('sandbox', v_as_of, interval '12 hours')
      where provider_subscription_id = v_subscription_id
    ),
    'deployment_mode_required',
    'compatibility wrapper refuses to infer the deployment lane'
  );
end $$;

rollback;
