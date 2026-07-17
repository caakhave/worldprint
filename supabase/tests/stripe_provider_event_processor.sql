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

create function pg_temp.seed_entitlement(
  p_user_id uuid,
  p_plan text,
  p_status text,
  p_suffix text,
  p_stripe_status text default null,
  p_period_end timestamptz default null,
  p_cancel_at_period_end boolean default false,
  p_with_subscription_ref boolean default true
)
returns void
language plpgsql
as $$
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
    p_plan,
    p_status,
    'cus_fixture_5c1a_' || p_suffix,
    case when p_with_subscription_ref then 'sub_fixture_5c1a_' || p_suffix else null end,
    'price_fixture_5c1a_' || p_suffix,
    p_stripe_status,
    p_cancel_at_period_end,
    p_period_end,
    '2026-07-16 08:00:00+00'::timestamptz
  )
  on conflict on constraint entitlements_pkey do update
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

create function pg_temp.add_provider_subscription(
  p_user_id uuid,
  p_provider text,
  p_environment text,
  p_status text,
  p_suffix text,
  p_event_at timestamptz,
  p_period_end timestamptz,
  p_cancel_at_period_end boolean default false,
  p_reconciliation_status text default 'current'
)
returns uuid
language plpgsql
as $$
declare
  v_id uuid := gen_random_uuid();
begin
  perform pg_temp.add_profile(p_user_id);

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
    billing_retry_started_at,
    expires_at,
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
    case when p_provider = 'apple' then 'com.canyougeo.pro.monthly' else 'price_fixture_5c1a_' || p_suffix end,
    'cus_fixture_5c1a_' || p_suffix,
    'sub_fixture_5c1a_' || p_suffix,
    case when p_provider = 'apple' then 'original_fixture_5c1a_' || p_suffix else null end,
    case when p_provider = 'apple' then 'transaction_fixture_5c1a_' || p_suffix else null end,
    case when p_provider = 'apple' then p_user_id else null end,
    p_status,
    p_status = 'active',
    p_cancel_at_period_end,
    p_event_at,
    p_event_at,
    case when p_status in ('active', 'cancelled_active_until_period_end', 'billing_retry') then p_period_end else null end,
    case when p_status = 'billing_retry' then p_event_at else null end,
    case when p_status = 'expired' then coalesce(p_period_end, p_event_at) else null end,
    case when p_status = 'paused' then p_event_at else null end,
    p_event_at,
    p_event_at,
    'evt_fixture_5c1a_seed_' || p_suffix,
    p_reconciliation_status,
    p_event_at,
    p_event_at
  );

  return v_id;
end;
$$;

create function pg_temp.process_event(
  p_label text,
  p_event_type text,
  p_user_id uuid,
  p_subscription_ref text,
  p_stripe_status text,
  p_event_at timestamptz,
  p_period_end timestamptz,
  p_environment text default 'live',
  p_event_subtype text default 'monthly',
  p_period_start timestamptz default '2026-07-16 00:00:00+00'::timestamptz,
  p_cancel_at_period_end boolean default false,
  p_product_allowed boolean default true,
  p_product_ref text default null,
  p_customer_ref text default null,
  p_payload_hash text default null
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
  reconciliation_required boolean,
  stale_event_ignored boolean,
  retryable boolean
)
language plpgsql
as $$
begin
  return query
  select *
  from billing.process_stripe_subscription_event(
    p_environment,
    'evt_fixture_5c1a_' || p_label,
    p_event_type,
    p_event_subtype,
    p_event_at,
    p_user_id,
    coalesce(p_customer_ref, 'cus_fixture_5c1a_' || p_label),
    p_subscription_ref,
    coalesce(p_product_ref, 'price_fixture_5c1a_' || p_label),
    p_stripe_status,
    p_period_start,
    p_period_end,
    p_cancel_at_period_end,
    coalesce(p_payload_hash, encode(digest('evt_fixture_5c1a_' || p_label, 'sha256'), 'hex')),
    p_product_allowed,
    p_event_at
  );
end;
$$;

create function pg_temp.expect_result(p_actual text, p_expected text, p_message text)
returns void
language plpgsql
as $$
begin
  perform pg_temp.assert_eq_text(p_actual, p_expected, p_message);
end;
$$;

create function pg_temp.expect_entitlement(
  p_user_id uuid,
  p_plan text,
  p_status text,
  p_cancel_at_period_end boolean,
  p_current_period_end timestamptz,
  p_message text
)
returns void
language plpgsql
as $$
declare
  v_row record;
begin
  select *
  into strict v_row
  from public.entitlements e
  where e.user_id = p_user_id;

  perform pg_temp.assert_eq_text(v_row.plan, p_plan, p_message || ' plan');
  perform pg_temp.assert_eq_text(v_row.status, p_status, p_message || ' status');
  perform pg_temp.assert_eq_bool(v_row.cancel_at_period_end, p_cancel_at_period_end, p_message || ' cancel flag');
  perform pg_temp.assert_eq_timestamptz(v_row.current_period_end, p_current_period_end, p_message || ' period end');
end;
$$;

create function pg_temp.assert_legacy_fields(
  p_user_id uuid,
  p_suffix text,
  p_message text
)
returns void
language plpgsql
as $$
declare
  v_row record;
begin
  select *
  into strict v_row
  from public.entitlements e
  where e.user_id = p_user_id;

  perform pg_temp.assert_eq_text(v_row.stripe_customer_id, 'cus_fixture_5c1a_' || p_suffix, p_message || ' customer');
  perform pg_temp.assert_eq_text(v_row.stripe_subscription_id, 'sub_fixture_5c1a_' || p_suffix, p_message || ' subscription');
  perform pg_temp.assert_eq_text(v_row.stripe_price_id, 'price_fixture_5c1a_' || p_suffix, p_message || ' price');
  perform pg_temp.assert_eq_text(v_row.stripe_status, 'active', p_message || ' status');
end;
$$;

create function pg_temp.raise_summary_failure()
returns trigger
language plpgsql
as $$
begin
  if new.user_id = '00000000-0000-0000-0000-000000054501'::uuid then
    raise exception 'fixture_summary_refresh_failed';
  end if;
  return new;
end;
$$;

do $$
declare
  r record;
  v_now timestamptz := '2026-07-16 12:00:00+00'::timestamptz;
  v_later timestamptz := '2026-07-16 13:00:00+00'::timestamptz;
  v_future timestamptz := '2026-08-16 12:00:00+00'::timestamptz;
  v_far_future timestamptz := '2027-07-16 12:00:00+00'::timestamptz;
  v_future_period_start timestamptz := '2026-08-16 13:00:00+00'::timestamptz;
  v_future_period_end timestamptz := '2026-09-16 13:00:00+00'::timestamptz;
  v_user uuid := '00000000-0000-0000-0000-000000054001'::uuid;
  v_user_2 uuid := '00000000-0000-0000-0000-000000054002'::uuid;
  v_apple_user uuid := '00000000-0000-0000-0000-000000054003'::uuid;
  v_future_start_user uuid := '00000000-0000-0000-0000-000000054010'::uuid;
  v_failure_user uuid := '00000000-0000-0000-0000-000000054501'::uuid;
  v_processed_at timestamptz;
  v_entitlement_updated_at timestamptz;
  v_provider_count integer;
  v_event_count integer;
begin
  perform pg_temp.add_profile(v_user);
  perform pg_temp.add_profile(v_user_2);
  perform pg_temp.add_profile(v_apple_user);
  perform pg_temp.add_profile(v_future_start_user);
  perform pg_temp.add_profile(v_failure_user);

  select * into strict r
  from pg_temp.process_event('active_monthly', 'customer.subscription.created', v_user, 'sub_fixture_5c1a_active_monthly', 'active', v_now, v_future);
  perform pg_temp.expect_result(r.result, 'processed', 'active subscription creation');
  perform pg_temp.expect_entitlement(v_user, 'pro', 'active', false, v_future, 'active creation grants Pro');
  perform pg_temp.assert_eq_text(
    (select ps.status from billing.provider_subscriptions ps where ps.provider_subscription_ref = 'sub_fixture_5c1a_active_monthly'),
    'active',
    'active provider status'
  );

  select * into strict r
  from pg_temp.process_event(
    'active_yearly',
    'checkout.session.completed',
    v_user_2,
    'sub_fixture_5c1a_active_yearly',
    'trialing',
    v_now,
    v_far_future,
    'live',
    'annual',
    v_now,
    false,
    true,
    'price_fixture_5c1a_annual'
  );
  perform pg_temp.expect_result(r.result, 'processed', 'annual checkout subscription');
  perform pg_temp.expect_entitlement(v_user_2, 'pro', 'active', false, v_far_future, 'annual checkout grants Pro');

  select * into strict r
  from pg_temp.process_event(
    'cancel_active',
    'customer.subscription.updated',
    v_user,
    'sub_fixture_5c1a_active_monthly',
    'active',
    v_later,
    v_future,
    'live',
    'monthly',
    v_now,
    true
  );
  perform pg_temp.expect_result(r.result, 'processed', 'cancel-at-period-end update');
  perform pg_temp.expect_entitlement(v_user, 'pro', 'active', true, v_future, 'cancel-at-period-end preserves Pro');

  select * into strict r
  from pg_temp.process_event('payment_failed', 'invoice.payment_failed', v_user, 'sub_fixture_5c1a_active_monthly', 'past_due', v_later + interval '1 minute', v_future);
  perform pg_temp.expect_result(r.result, 'processed', 'payment failure');
  perform pg_temp.expect_entitlement(v_user, 'free', 'past_due', false, null, 'Stripe-only payment failure removes Pro');

  select * into strict r
  from pg_temp.process_event('payment_recovered', 'invoice.payment_succeeded', v_user, 'sub_fixture_5c1a_active_monthly', 'active', v_later + interval '2 minutes', v_future);
  perform pg_temp.expect_result(r.result, 'processed', 'payment success after failure');
  perform pg_temp.expect_entitlement(v_user, 'pro', 'active', false, v_future, 'payment success restores Pro');

  select * into strict r
  from pg_temp.process_event(
    'future_period_failure',
    'invoice.payment_failed',
    v_future_start_user,
    'sub_fixture_5c1a_future_period',
    'past_due',
    v_later + interval '4 minutes',
    v_future_period_end,
    'live',
    'monthly',
    v_future_period_start,
    false,
    true,
    'price_fixture_5c1a_future_period'
  );
  perform pg_temp.expect_result(r.result, 'processed', 'future-period payment failure');
  perform pg_temp.expect_entitlement(v_future_start_user, 'free', 'past_due', false, null, 'future-period payment failure removes Pro');

  select * into strict r
  from pg_temp.process_event(
    'future_period_recovered',
    'invoice.payment_succeeded',
    v_future_start_user,
    'sub_fixture_5c1a_future_period',
    'active',
    v_later + interval '5 minutes',
    v_future_period_end,
    'live',
    'monthly',
    v_future_period_start,
    false,
    true,
    'price_fixture_5c1a_future_period'
  );
  perform pg_temp.expect_result(r.result, 'processed', 'future-period payment success after failure');
  perform pg_temp.expect_entitlement(v_future_start_user, 'pro', 'active', false, v_future_period_end, 'future-period payment success restores Pro');

  select * into strict r
  from pg_temp.process_event('deleted', 'customer.subscription.deleted', v_user, 'sub_fixture_5c1a_active_monthly', 'canceled', v_later + interval '3 minutes', v_future);
  perform pg_temp.expect_result(r.result, 'processed', 'subscription deletion');
  perform pg_temp.expect_entitlement(v_user, 'free', 'canceled', false, null, 'subscription deletion removes Stripe-only Pro');

  select * into strict r
  from pg_temp.process_event('unsupported', 'customer.created', v_user, 'sub_fixture_5c1a_unsupported', 'active', v_now, v_future);
  perform pg_temp.expect_result(r.result, 'unsupported_event_type', 'unsupported event');

  select * into strict r
  from pg_temp.process_event('unknown_status', 'customer.subscription.updated', v_user, 'sub_fixture_5c1a_unknown', 'mystery_status', v_now, v_future);
  perform pg_temp.expect_result(r.result, 'requires_reconciliation', 'unknown Stripe status');
  perform pg_temp.assert_false(
    exists (select 1 from billing.provider_subscriptions ps where ps.provider_subscription_ref = 'sub_fixture_5c1a_unknown'),
    'unknown status does not create provider row'
  );

  select * into strict r
  from pg_temp.process_event('missing_subscription', 'invoice.payment_succeeded', v_user, null, 'active', v_now, v_future);
  perform pg_temp.expect_result(r.result, 'missing_subscription_reference', 'missing subscription reference');

  select * into strict r
  from pg_temp.process_event('missing_user', 'customer.subscription.created', null, 'sub_fixture_5c1a_missing_user', 'active', v_now, v_future);
  perform pg_temp.expect_result(r.result, 'missing_user', 'missing user');

  select * into strict r
  from pg_temp.process_event('unknown_product', 'customer.subscription.created', v_user, 'sub_fixture_5c1a_unknown_product', 'active', v_now, v_future, 'live', 'monthly', v_now, false, false, 'price_fixture_5c1a_unknown_product');
  perform pg_temp.expect_result(r.result, 'product_not_allowed', 'unknown product');

  select processed_at into strict v_processed_at
  from billing.provider_events
  where provider = 'stripe'
    and environment = 'live'
    and provider_event_ref = 'evt_fixture_5c1a_active_monthly';
  select updated_at into strict v_entitlement_updated_at
  from public.entitlements
  where user_id = v_user;
  select * into strict r
  from pg_temp.process_event('active_monthly', 'customer.subscription.created', v_user, 'sub_fixture_5c1a_active_monthly', 'active', v_now, v_future);
  perform pg_temp.expect_result(r.result, 'already_processed', 'same event retry after successful commit');
  perform pg_temp.assert_eq_timestamptz(
    (select pe.processed_at from billing.provider_events pe where pe.provider_event_ref = 'evt_fixture_5c1a_active_monthly' and pe.environment = 'live'),
    v_processed_at,
    'duplicate preserves processed timestamp'
  );
  perform pg_temp.assert_eq_timestamptz(
    (select e.updated_at from public.entitlements e where e.user_id = v_user),
    v_entitlement_updated_at,
    'duplicate does not refresh public entitlement'
  );

  select * into strict r
  from pg_temp.process_event(
    'active_monthly',
    'customer.subscription.created',
    v_user,
    'sub_fixture_5c1a_active_monthly',
    'active',
    v_now,
    v_future,
    'live',
    'monthly',
    v_now,
    false,
    true,
    null,
    null,
    repeat('b', 64)
  );
  perform pg_temp.expect_result(r.result, 'payload_conflict', 'payload conflict for same event reference');

  select * into strict r
  from pg_temp.process_event('newer_active', 'customer.subscription.updated', v_user_2, 'sub_fixture_5c1a_ordering', 'active', v_later, v_future);
  perform pg_temp.expect_result(r.result, 'processed', 'newer active ordering seed');
  select * into strict r
  from pg_temp.process_event('older_active', 'customer.subscription.updated', v_user_2, 'sub_fixture_5c1a_ordering', 'active', v_now, v_future);
  perform pg_temp.expect_result(r.result, 'stale_event_ignored', 'older active after newer active');

  select * into strict r
  from pg_temp.process_event('newer_cancel', 'customer.subscription.updated', v_user_2, 'sub_fixture_5c1a_cancel_order', 'active', v_later, v_future, 'live', 'monthly', v_now, true);
  perform pg_temp.expect_result(r.result, 'processed', 'newer cancellation ordering seed');
  select * into strict r
  from pg_temp.process_event('older_active_after_cancel', 'customer.subscription.updated', v_user_2, 'sub_fixture_5c1a_cancel_order', 'active', v_now, v_future);
  perform pg_temp.expect_result(r.result, 'stale_event_ignored', 'older active after newer cancellation');
  perform pg_temp.assert_eq_text(
    (select ps.status from billing.provider_subscriptions ps where ps.provider_subscription_ref = 'sub_fixture_5c1a_cancel_order'),
    'cancelled_active_until_period_end',
    'older active does not overwrite cancellation'
  );

  select * into strict r
  from pg_temp.process_event('newer_deleted', 'customer.subscription.deleted', v_user_2, 'sub_fixture_5c1a_delete_order', 'canceled', v_later, v_future);
  perform pg_temp.expect_result(r.result, 'processed', 'newer deletion ordering seed');
  select * into strict r
  from pg_temp.process_event('older_update_after_delete', 'customer.subscription.updated', v_user_2, 'sub_fixture_5c1a_delete_order', 'active', v_now, v_future);
  perform pg_temp.expect_result(r.result, 'stale_event_ignored', 'older update after deletion');
  perform pg_temp.assert_eq_text(
    (select ps.status from billing.provider_subscriptions ps where ps.provider_subscription_ref = 'sub_fixture_5c1a_delete_order'),
    'expired',
    'older update does not overwrite deletion'
  );

  select * into strict r
  from pg_temp.process_event('success_before_failure', 'invoice.payment_succeeded', v_user_2, 'sub_fixture_5c1a_reverse_failure', 'active', v_later, v_future);
  perform pg_temp.expect_result(r.result, 'processed', 'payment success reverse-order seed');
  select * into strict r
  from pg_temp.process_event('stale_failure', 'invoice.payment_failed', v_user_2, 'sub_fixture_5c1a_reverse_failure', 'past_due', v_now, v_future);
  perform pg_temp.expect_result(r.result, 'stale_event_ignored', 'stale payment failure after success');
  perform pg_temp.assert_eq_text(
    (select ps.status from billing.provider_subscriptions ps where ps.provider_subscription_ref = 'sub_fixture_5c1a_reverse_failure'),
    'active',
    'stale payment failure does not downgrade active subscription'
  );

  select * into strict r
  from pg_temp.process_event('same_user_update', 'customer.subscription.updated', v_user, 'sub_fixture_5c1a_active_monthly', 'active', v_later + interval '4 minutes', v_future);
  perform pg_temp.expect_result(r.result, 'processed', 'existing same user update');

  select * into strict r
  from pg_temp.process_event('ownership_conflict_seed', 'customer.subscription.created', v_user, 'sub_fixture_5c1a_ownership', 'active', v_now, v_future);
  perform pg_temp.expect_result(r.result, 'processed', 'ownership seed');
  select * into strict r
  from pg_temp.process_event('ownership_conflict', 'customer.subscription.updated', v_user_2, 'sub_fixture_5c1a_ownership', 'active', v_later, v_future);
  perform pg_temp.expect_result(r.result, 'ownership_conflict', 'ownership conflict for existing subscription');

  select * into strict r
  from pg_temp.process_event('test_seed', 'customer.subscription.created', v_user, 'sub_fixture_5c1a_env_conflict', 'active', v_now, v_future, 'test');
  perform pg_temp.expect_result(r.result, 'processed', 'test seed');
  select * into strict r
  from pg_temp.process_event('live_against_test', 'customer.subscription.updated', v_user, 'sub_fixture_5c1a_env_conflict', 'active', v_later, v_future, 'live');
  perform pg_temp.expect_result(r.result, 'environment_conflict', 'environment conflict for live event against test record');

  select * into strict r
  from pg_temp.process_event('live_seed', 'customer.subscription.created', v_user, 'sub_fixture_5c1a_env_conflict_live', 'active', v_now, v_future, 'live');
  perform pg_temp.expect_result(r.result, 'processed', 'live seed');
  select * into strict r
  from pg_temp.process_event('test_against_live', 'customer.subscription.updated', v_user, 'sub_fixture_5c1a_env_conflict_live', 'active', v_later, v_future, 'test');
  perform pg_temp.expect_result(r.result, 'environment_conflict', 'environment conflict for test event against live record');

  select * into strict r
  from pg_temp.process_event('same_event_id', 'customer.subscription.created', v_user, 'sub_fixture_5c1a_same_event_live', 'active', v_now, v_future, 'live');
  perform pg_temp.expect_result(r.result, 'processed', 'same event id live');
  select * into strict r
  from billing.process_stripe_subscription_event(
    'test',
    'evt_fixture_5c1a_same_event_id',
    'customer.subscription.created',
    'monthly',
    v_now,
    v_user,
    'cus_fixture_5c1a_same_event_test',
    'sub_fixture_5c1a_same_event_test',
    'price_fixture_5c1a_same_event_test',
    'active',
    v_now,
    v_future,
    false,
    encode(digest('evt_fixture_5c1a_same_event_id_test_payload', 'sha256'), 'hex'),
    true,
    v_now
  );
  perform pg_temp.expect_result(r.result, 'processed', 'same event id test environment');
  perform pg_temp.assert_eq_int(
    (select count(*)::integer from billing.provider_events pe where pe.provider_event_ref = 'evt_fixture_5c1a_same_event_id'),
    2,
    'same event id can exist independently in live and test'
  );

  perform pg_temp.add_provider_subscription(v_apple_user, 'apple', 'production', 'active', 'apple_active', v_now, v_future);
end;
$$;

do $$
declare
  r record;
  v_now timestamptz := '2026-07-16 12:00:00+00'::timestamptz;
  v_later timestamptz := '2026-07-16 13:00:00+00'::timestamptz;
  v_future timestamptz := '2026-08-16 12:00:00+00'::timestamptz;
  v_apple_user uuid := '00000000-0000-0000-0000-000000054003'::uuid;
begin
  select *
  into strict r
  from billing.refresh_effective_entitlement_summary(v_apple_user, 'production', v_now);
  perform pg_temp.assert_true(r.applied, 'apple compatibility seed refreshes');
  perform pg_temp.expect_entitlement(v_apple_user, 'pro', 'active', false, v_future, 'Apple active grants Pro before Stripe changes');

  select * into strict r
  from pg_temp.process_event('coexist_stripe_active', 'customer.subscription.created', v_apple_user, 'sub_fixture_5c1a_coexist_active', 'active', v_now, v_future);
  perform pg_temp.expect_result(r.result, 'processed', 'Stripe active coexists with Apple active');
  perform pg_temp.expect_entitlement(v_apple_user, 'pro', 'active', false, v_future, 'Stripe active plus Apple active remains Pro');
  perform pg_temp.assert_eq_int(
    (select active_provider_count from billing.resolve_effective_entitlement(v_apple_user, 'production', v_now)),
    2,
    'resolver sees two active providers'
  );

  select * into strict r
  from pg_temp.process_event('coexist_stripe_cancel', 'customer.subscription.updated', v_apple_user, 'sub_fixture_5c1a_coexist_active', 'active', v_later, v_future, 'live', 'monthly', v_now, true);
  perform pg_temp.expect_result(r.result, 'processed', 'Stripe cancellation with Apple active');
  perform pg_temp.expect_entitlement(v_apple_user, 'pro', 'active', true, v_future, 'Apple preserves Pro after Stripe cancellation');

  select * into strict r
  from pg_temp.process_event('coexist_stripe_failure', 'invoice.payment_failed', v_apple_user, 'sub_fixture_5c1a_coexist_active', 'past_due', v_later + interval '1 minute', v_future);
  perform pg_temp.expect_result(r.result, 'processed', 'Stripe payment failure with Apple active');
  perform pg_temp.expect_entitlement(v_apple_user, 'pro', 'active', false, v_future, 'Apple preserves Pro after Stripe payment failure');

  select * into strict r
  from pg_temp.process_event('coexist_stripe_delete', 'customer.subscription.deleted', v_apple_user, 'sub_fixture_5c1a_coexist_active', 'canceled', v_later + interval '2 minutes', v_future);
  perform pg_temp.expect_result(r.result, 'processed', 'Stripe deletion with Apple active');
  perform pg_temp.expect_entitlement(v_apple_user, 'pro', 'active', false, v_future, 'Apple preserves Pro after Stripe deletion');

  select * into strict r
  from pg_temp.process_event('coexist_uncertain', 'customer.subscription.updated', v_apple_user, 'sub_fixture_5c1a_uncertain', 'mystery_status', v_now, v_future);
  perform pg_temp.expect_result(r.result, 'requires_reconciliation', 'uncertain Stripe event with Apple active');
  perform pg_temp.expect_entitlement(v_apple_user, 'pro', 'active', false, v_future, 'Apple preserves Pro after uncertain Stripe event');
end;
$$;

do $$
declare
  r record;
  v_now timestamptz := '2026-07-16 12:00:00+00'::timestamptz;
  v_future timestamptz := '2026-08-16 12:00:00+00'::timestamptz;
  v_legacy_user uuid := '00000000-0000-0000-0000-000000054004'::uuid;
  v_failure_user uuid := '00000000-0000-0000-0000-000000054501'::uuid;
begin
  perform pg_temp.seed_entitlement(v_legacy_user, 'free', 'free', 'legacy_preserved', 'active', null, false, true);
  select * into strict r
  from pg_temp.process_event('legacy_preserved', 'customer.subscription.created', v_legacy_user, 'sub_fixture_5c1a_legacy_preserved', 'active', v_now, v_future);
  perform pg_temp.expect_result(r.result, 'processed', 'valid event with legacy columns');
  perform pg_temp.expect_entitlement(v_legacy_user, 'pro', 'active', false, v_future, 'valid event grants Pro through compatibility summary');
  perform pg_temp.assert_legacy_fields(v_legacy_user, 'legacy_preserved', 'processor preserves legacy Stripe columns');

  create trigger fixture_5c1a_summary_failure
    before insert or update on public.entitlements
    for each row
    execute function pg_temp.raise_summary_failure();

  select * into strict r
  from pg_temp.process_event('summary_failure', 'customer.subscription.created', v_failure_user, 'sub_fixture_5c1a_summary_failure', 'active', v_now, v_future);
  perform pg_temp.expect_result(r.result, 'summary_refresh_failed', 'summary refresh failure is sanitized');
  perform pg_temp.assert_false(
    exists (select 1 from billing.provider_subscriptions ps where ps.provider_subscription_ref = 'sub_fixture_5c1a_summary_failure'),
    'provider mutation rolls back after summary failure'
  );
  perform pg_temp.assert_false(
    exists (select 1 from public.entitlements e where e.user_id = v_failure_user),
    'public entitlement mutation rolls back after summary failure'
  );
  perform pg_temp.assert_eq_text(
    (select pe.processing_status from billing.provider_events pe where pe.provider_event_ref = 'evt_fixture_5c1a_summary_failure'),
    'retry_pending',
    'event is not marked processed after summary failure'
  );

  drop trigger fixture_5c1a_summary_failure on public.entitlements;

  select * into strict r
  from pg_temp.process_event('summary_failure', 'customer.subscription.created', v_failure_user, 'sub_fixture_5c1a_summary_failure', 'active', v_now, v_future);
  perform pg_temp.expect_result(r.result, 'processed', 'retry succeeds after rolled-back transaction');
  perform pg_temp.expect_entitlement(v_failure_user, 'pro', 'active', false, v_future, 'retry after rollback grants Pro');
end;
$$;

do $$
declare
  r record;
  v_now timestamptz := '2026-07-16 12:00:00+00'::timestamptz;
  v_future timestamptz := '2026-08-16 12:00:00+00'::timestamptz;
  v_clean_user uuid := '00000000-0000-0000-0000-000000054601'::uuid;
  v_malformed_user uuid := '00000000-0000-0000-0000-000000054602'::uuid;
  v_before_malformed record;
begin
  perform pg_temp.add_provider_subscription(v_clean_user, 'stripe', 'test', 'active', 'staging_clean', v_now, v_future);
  perform pg_temp.seed_entitlement(v_malformed_user, 'pro', 'active', 'staging_missing_subscription', 'active', v_future, false, false);

  select *
  into strict v_before_malformed
  from public.entitlements
  where user_id = v_malformed_user;

  select * into strict r
  from pg_temp.process_event(
    'staging_clean_future',
    'customer.subscription.updated',
    v_clean_user,
    'sub_fixture_5c1a_staging_clean',
    'active',
    v_now + interval '1 hour',
    v_future,
    'test'
  );
  perform pg_temp.expect_result(r.result, 'processed', 'valid future event for clean staging-shaped subscription');
  perform pg_temp.assert_eq_int(
    (select count(*)::integer from billing.provider_subscriptions ps where ps.user_id = v_malformed_user),
    0,
    'malformed legacy row does not fabricate provider record'
  );
  perform pg_temp.assert_eq_text(
    (select e.stripe_subscription_id from public.entitlements e where e.user_id = v_malformed_user),
    v_before_malformed.stripe_subscription_id,
    'malformed legacy subscription reference remains untouched'
  );
  perform pg_temp.assert_eq_text(
    (select e.stripe_customer_id from public.entitlements e where e.user_id = v_malformed_user),
    v_before_malformed.stripe_customer_id,
    'malformed legacy customer reference remains untouched'
  );
end;
$$;

do $$
declare
  v_signature text :=
    'billing.process_stripe_subscription_event(text,text,text,text,timestamp with time zone,uuid,text,text,text,text,timestamp with time zone,timestamp with time zone,boolean,text,boolean,timestamp with time zone)';
begin
  perform pg_temp.assert_false(has_function_privilege('anon', v_signature, 'execute'), 'anon cannot execute processor');
  perform pg_temp.assert_false(has_function_privilege('authenticated', v_signature, 'execute'), 'authenticated cannot execute processor');
  perform pg_temp.assert_true(has_function_privilege('service_role', v_signature, 'execute'), 'service_role can execute processor');
  perform pg_temp.assert_true(
    exists (
      select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'billing'
        and p.proname = 'process_stripe_subscription_event'
        and p.prosecdef is false
    ),
    'processor uses security invoker'
  );
  perform pg_temp.assert_eq_int(
    (select count(*)::integer from public.stripe_webhook_events),
    0,
    'processor fixture does not mutate legacy Stripe webhook ledger'
  );
end;
$$;

rollback;
