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
  values (p_user_id, p_plan, p_status, '2026-07-23 21:50:00+00'::timestamptz)
  on conflict on constraint entitlements_pkey do update
    set plan = excluded.plan,
        status = excluded.status,
        updated_at = excluded.updated_at;
end;
$$;

do $$
declare
  v_owner uuid := '00000000-0000-0000-0000-000000072301'::uuid;
  v_other_user uuid := '00000000-0000-0000-0000-000000072302'::uuid;
  v_token_ref text := 'sha256_' || repeat('1', 64);
  v_linked_token_ref text := 'sha256_' || repeat('2', 64);
  v_transaction_ref text := 'gpa_order_sha256_' || repeat('3', 64);
  v_event_ref text := 'verify:' || v_token_ref || ':abcdef1234567890';
  v_raw_token text := 'synthetic-google-play-token-not-real-20260723';
  v_product_ref text := 'com.canyougeo.app:canyougeo_pro:monthly';
  v_payload_hash text := repeat('a', 64);
  v_as_of timestamptz := '2026-07-23 21:55:00+00'::timestamptz;
  v_result record;
begin
  perform pg_temp.add_profile(v_owner);
  perform pg_temp.add_profile(v_other_user);
  perform pg_temp.seed_entitlement(v_owner, 'free', 'free');
  perform pg_temp.seed_entitlement(v_other_user, 'free', 'free');

  select *
  into strict v_result
  from public.process_google_play_purchase_verification(
    'production',
    v_owner,
    v_event_ref,
    v_as_of,
    v_payload_hash,
    'com.canyougeo.app',
    v_product_ref,
    v_token_ref,
    v_raw_token,
    null,
    v_transaction_ref,
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

  perform pg_temp.assert_eq_text(v_result.result, 'processed', 'new verified purchase result');
  perform pg_temp.assert_true(v_result.processed, 'new verified purchase processed');
  perform pg_temp.assert_true(v_result.provider_subscription_changed, 'new verified purchase writes provider subscription');
  perform pg_temp.assert_true(v_result.compatibility_refreshed, 'new verified purchase refreshes entitlement');
  perform pg_temp.assert_true(v_result.acknowledgement_required, 'new verified purchase requires acknowledgement');
  perform pg_temp.assert_false(v_result.reconciliation_required, 'new verified purchase avoids reconciliation');
  perform pg_temp.assert_false(v_result.retryable, 'new verified purchase is terminal');

  perform pg_temp.assert_eq_int(
    (select count(*)::integer from billing.provider_subscriptions where provider = 'google_play' and environment = 'production' and provider_subscription_ref = v_token_ref),
    1,
    'provider subscription persisted'
  );
  perform pg_temp.assert_eq_text(
    (select status from billing.provider_subscriptions where provider = 'google_play' and environment = 'production' and provider_subscription_ref = v_token_ref),
    'active',
    'provider subscription status'
  );
  perform pg_temp.assert_eq_text(
    (select reconciliation_status from billing.provider_subscriptions where provider = 'google_play' and environment = 'production' and provider_subscription_ref = v_token_ref),
    'current',
    'provider subscription reconciliation status'
  );
  perform pg_temp.assert_eq_int(
    (select count(*)::integer from billing.google_play_purchase_tokens where provider_environment = 'production' and purchase_token_fingerprint = v_token_ref),
    1,
    'purchase token ownership persisted'
  );
  perform pg_temp.assert_eq_text(
    (select acknowledgement_state from billing.google_play_purchase_tokens where provider_environment = 'production' and purchase_token_fingerprint = v_token_ref),
    'ACKNOWLEDGEMENT_STATE_PENDING',
    'token remains pending until Google acknowledgement succeeds'
  );
  perform pg_temp.assert_eq_text(
    (select plan || '/' || status from public.entitlements where user_id = v_owner),
    'pro/active',
    'owner public entitlement is active Pro'
  );
  perform pg_temp.assert_eq_text(
    (select processing_status from billing.provider_events where provider = 'google_play' and environment = 'production' and provider_event_ref = v_event_ref),
    'processed',
    'provider event processed'
  );

  select *
  into strict v_result
  from public.process_google_play_purchase_verification(
    'production',
    v_owner,
    v_event_ref,
    v_as_of,
    v_payload_hash,
    'com.canyougeo.app',
    v_product_ref,
    v_token_ref,
    v_raw_token,
    null,
    v_transaction_ref,
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
    v_as_of + interval '1 minute'
  );

  perform pg_temp.assert_eq_text(v_result.result, 'already_processed', 'idempotent retry result');
  perform pg_temp.assert_true(v_result.already_processed, 'idempotent retry is terminal success');
  perform pg_temp.assert_true(v_result.acknowledgement_required, 'idempotent retry permits pending acknowledgement retry');
  perform pg_temp.assert_false(v_result.retryable, 'idempotent retry is not retryable failure');
  perform pg_temp.assert_eq_int(
    (select count(*)::integer from billing.provider_subscriptions where provider = 'google_play' and environment = 'production' and provider_subscription_ref = v_token_ref),
    1,
    'idempotent retry does not duplicate provider subscription'
  );
  perform pg_temp.assert_eq_int(
    (select count(*)::integer from billing.google_play_purchase_tokens where provider_environment = 'production' and purchase_token_fingerprint = v_token_ref),
    1,
    'idempotent retry does not duplicate token ownership'
  );

  select *
  into strict v_result
  from public.record_google_play_purchase_acknowledgement(
    'production',
    v_token_ref,
    v_as_of + interval '2 minutes'
  );

  perform pg_temp.assert_eq_text(v_result.result, 'acknowledged', 'acknowledgement marker result');
  perform pg_temp.assert_true(v_result.acknowledged, 'acknowledgement marker succeeds');
  perform pg_temp.assert_eq_text(
    (select acknowledgement_state from billing.google_play_purchase_tokens where provider_environment = 'production' and purchase_token_fingerprint = v_token_ref),
    'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED',
    'token acknowledgement recorded'
  );

  select *
  into strict v_result
  from public.process_google_play_purchase_verification(
    'production',
    v_other_user,
    v_event_ref,
    v_as_of,
    v_payload_hash,
    'com.canyougeo.app',
    v_product_ref,
    v_token_ref,
    v_raw_token,
    null,
    v_transaction_ref,
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
    v_as_of + interval '3 minutes'
  );

  perform pg_temp.assert_eq_text(v_result.result, 'ownership_conflict', 'cross-user idempotent retry rejects ownership conflict');
  perform pg_temp.assert_false(v_result.processed, 'cross-user conflict is not processed');
  perform pg_temp.assert_true(v_result.reconciliation_required, 'cross-user conflict requires reconciliation');
  perform pg_temp.assert_eq_text(
    (select plan || '/' || status from public.entitlements where user_id = v_other_user),
    'free/free',
    'cross-user conflict does not grant Pro'
  );
  perform pg_temp.assert_eq_int(
    (select count(*)::integer from billing.provider_subscriptions where provider = 'google_play' and environment = 'production' and provider_subscription_ref = v_token_ref),
    1,
    'cross-user conflict does not duplicate provider subscription'
  );
  perform pg_temp.assert_eq_int(
    (select count(*)::integer from billing.google_play_purchase_tokens where provider_environment = 'production' and purchase_token_fingerprint = v_token_ref),
    1,
    'cross-user conflict does not duplicate token ownership'
  );
  perform pg_temp.assert_eq_text(
    (select plan || '/' || status from public.entitlements where user_id = v_owner),
    'pro/active',
    'cross-user conflict leaves owner entitlement intact'
  );
end $$;

rollback;
