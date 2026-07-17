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

create function pg_temp.assert_eq_timestamptz(p_actual timestamptz, p_expected timestamptz, p_message text)
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
  p_status text,
  p_suffix text,
  p_event_at timestamptz,
  p_period_end timestamptz
)
returns void
language plpgsql
as $$
begin
  perform pg_temp.add_profile(p_user_id);

  insert into billing.provider_subscriptions (
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
    last_verified_at,
    last_event_at,
    last_provider_event_ref,
    reconciliation_status,
    created_at,
    updated_at
  )
  values (
    p_user_id,
    'apple',
    'production',
    'pro',
    'com.canyougeo.pro.monthly',
    'apple_customer_fixture_' || p_suffix,
    'apple_subscription_fixture_' || p_suffix,
    'apple_original_fixture_' || p_suffix,
    'apple_transaction_fixture_' || p_suffix,
    p_user_id,
    p_status,
    p_status = 'active',
    false,
    p_event_at,
    p_event_at,
    p_period_end,
    p_event_at,
    p_event_at,
    'apple_event_fixture_' || p_suffix,
    'current',
    p_event_at,
    p_event_at
  );
end;
$$;

create function pg_temp.process_transition(
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
  provider_result text,
  already_processed boolean,
  legacy_fields_updated boolean,
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
  from billing.process_stripe_webhook_transition_event(
    p_environment,
    'evt_fixture_5c1b1_' || p_label,
    p_event_type,
    p_event_subtype,
    p_event_at,
    p_user_id,
    coalesce(p_customer_ref, 'cus_fixture_5c1b1_' || p_label),
    p_subscription_ref,
    coalesce(p_product_ref, 'price_fixture_5c1b1_' || p_label),
    p_stripe_status,
    p_period_start,
    p_period_end,
    p_cancel_at_period_end,
    coalesce(p_payload_hash, encode(digest('evt_fixture_5c1b1_' || p_label, 'sha256'), 'hex')),
    p_event_at
  );
end;
$$;

create function pg_temp.expect_transition_result(p_actual text, p_expected text, p_message text)
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

create function pg_temp.expect_legacy_fields(
  p_user_id uuid,
  p_customer text,
  p_subscription text,
  p_price text,
  p_status text,
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

  perform pg_temp.assert_eq_text(v_row.stripe_customer_id, p_customer, p_message || ' customer');
  perform pg_temp.assert_eq_text(v_row.stripe_subscription_id, p_subscription, p_message || ' subscription');
  perform pg_temp.assert_eq_text(v_row.stripe_price_id, p_price, p_message || ' price');
  perform pg_temp.assert_eq_text(v_row.stripe_status, p_status, p_message || ' status');
end;
$$;

create function pg_temp.raise_summary_failure()
returns trigger
language plpgsql
as $$
begin
  if new.user_id = '00000000-0000-0000-0000-000000055501'::uuid then
    raise exception 'fixture_summary_refresh_failed';
  end if;
  return new;
end;
$$;

do $$
declare
  r record;
  v_now timestamptz := '2026-07-16 12:00:00+00'::timestamptz;
  v_future timestamptz := '2026-08-16 12:00:00+00'::timestamptz;
  v_future_period_start timestamptz := '2026-08-16 13:00:00+00'::timestamptz;
  v_future_period_end timestamptz := '2026-09-16 13:00:00+00'::timestamptz;
  v_user uuid := '00000000-0000-0000-0000-000000055001'::uuid;
  v_apple_user uuid := '00000000-0000-0000-0000-000000055002'::uuid;
  v_test_user uuid := '00000000-0000-0000-0000-000000055003'::uuid;
  v_future_start_user uuid := '00000000-0000-0000-0000-000000055004'::uuid;
  v_failure_user uuid := '00000000-0000-0000-0000-000000055501'::uuid;
begin
  perform pg_temp.add_profile(v_user);
  perform pg_temp.add_profile(v_apple_user);
  perform pg_temp.add_profile(v_test_user);
  perform pg_temp.add_profile(v_future_start_user);
  perform pg_temp.add_profile(v_failure_user);

  select * into strict r
  from pg_temp.process_transition(
    'active_monthly',
    'customer.subscription.created',
    v_user,
    'sub_fixture_5c1b1_active_monthly',
    'active',
    v_now,
    v_future
  );
  perform pg_temp.expect_transition_result(r.result, 'processed', 'active transition result');
  perform pg_temp.assert_true(r.processed, 'active transition processed');
  perform pg_temp.assert_true(r.legacy_fields_updated, 'active transition updates legacy fields');
  perform pg_temp.assert_true(r.provider_subscription_changed, 'active transition changes provider subscription');
  perform pg_temp.assert_true(r.compatibility_refreshed, 'active transition refreshes compatibility summary');
  perform pg_temp.expect_entitlement(v_user, 'pro', 'active', false, v_future, 'active transition grants Pro');
  perform pg_temp.expect_legacy_fields(
    v_user,
    'cus_fixture_5c1b1_active_monthly',
    'sub_fixture_5c1b1_active_monthly',
    'price_fixture_5c1b1_active_monthly',
    'active',
    'active transition preserves Stripe legacy fields'
  );
  perform pg_temp.assert_true(
    exists (
      select 1
      from billing.provider_subscriptions ps
      where ps.provider = 'stripe'
        and ps.environment = 'live'
        and ps.provider_subscription_ref = 'sub_fixture_5c1b1_active_monthly'
    ),
    'active transition writes Stripe provider subscription'
  );
  perform pg_temp.assert_true(
    exists (
      select 1
      from billing.provider_events pe
      where pe.provider = 'stripe'
        and pe.environment = 'live'
        and pe.provider_event_ref = 'evt_fixture_5c1b1_active_monthly'
        and pe.processing_status = 'processed'
    ),
    'active transition writes processed provider event'
  );
  perform pg_temp.assert_eq_int((select count(*)::integer from public.stripe_webhook_events), 0, 'transition does not write legacy webhook ledger');

  select * into strict r
  from pg_temp.process_transition(
    'future_period_failure',
    'invoice.payment_failed',
    v_future_start_user,
    'sub_fixture_5c1b1_future_period',
    'past_due',
    v_now + interval '2 minutes',
    v_future_period_end,
    'live',
    'monthly',
    v_future_period_start,
    false,
    'price_fixture_5c1b1_future_period'
  );
  perform pg_temp.expect_transition_result(r.result, 'processed', 'future-period payment failure transition');
  perform pg_temp.expect_entitlement(v_future_start_user, 'free', 'past_due', false, null, 'future-period payment failure removes Pro');
  perform pg_temp.expect_legacy_fields(
    v_future_start_user,
    'cus_fixture_5c1b1_future_period_failure',
    'sub_fixture_5c1b1_future_period',
    'price_fixture_5c1b1_future_period',
    'past_due',
    'future-period failure records Stripe legacy fields'
  );

  select * into strict r
  from pg_temp.process_transition(
    'future_period_recovered',
    'invoice.payment_succeeded',
    v_future_start_user,
    'sub_fixture_5c1b1_future_period',
    'active',
    v_now + interval '3 minutes',
    v_future_period_end,
    'live',
    'monthly',
    v_future_period_start,
    false,
    'price_fixture_5c1b1_future_period'
  );
  perform pg_temp.expect_transition_result(r.result, 'processed', 'future-period payment success after failure');
  perform pg_temp.expect_entitlement(v_future_start_user, 'pro', 'active', false, v_future_period_end, 'future-period payment success restores Pro');
  perform pg_temp.expect_legacy_fields(
    v_future_start_user,
    'cus_fixture_5c1b1_future_period_recovered',
    'sub_fixture_5c1b1_future_period',
    'price_fixture_5c1b1_future_period',
    'active',
    'future-period recovery keeps legacy Stripe fields active'
  );

  update public.entitlements
  set stripe_customer_id = null,
      stripe_subscription_id = null,
      stripe_price_id = null,
      stripe_status = null
  where user_id = v_user;

  select * into strict r
  from pg_temp.process_transition(
    'active_monthly',
    'customer.subscription.created',
    v_user,
    'sub_fixture_5c1b1_active_monthly',
    'active',
    v_now,
    v_future
  );
  perform pg_temp.expect_transition_result(r.result, 'already_processed', 'already processed transition result');
  perform pg_temp.assert_true(r.already_processed, 'already processed transition reports retry recovery');
  perform pg_temp.assert_true(r.legacy_fields_updated, 'already processed transition restores legacy fields');
  perform pg_temp.expect_legacy_fields(
    v_user,
    'cus_fixture_5c1b1_active_monthly',
    'sub_fixture_5c1b1_active_monthly',
    'price_fixture_5c1b1_active_monthly',
    'active',
    'already processed transition restores Stripe legacy fields'
  );
  perform pg_temp.assert_eq_int(
    (select count(*)::integer from billing.provider_events pe where pe.provider_event_ref = 'evt_fixture_5c1b1_active_monthly'),
    1,
    'already processed transition does not duplicate provider events'
  );

  select * into strict r
  from pg_temp.process_transition(
    'active_monthly',
    'customer.subscription.created',
    v_user,
    'sub_fixture_5c1b1_active_monthly',
    'active',
    v_now,
    v_future,
    'live',
    'monthly',
    v_now,
    false,
    'price_fixture_5c1b1_conflict',
    'cus_fixture_5c1b1_conflict',
    repeat('c', 64)
  );
  perform pg_temp.expect_transition_result(r.result, 'payload_conflict', 'payload conflict transition result');
  perform pg_temp.assert_false(r.legacy_fields_updated, 'payload conflict does not report legacy success');
  perform pg_temp.expect_legacy_fields(
    v_user,
    'cus_fixture_5c1b1_active_monthly',
    'sub_fixture_5c1b1_active_monthly',
    'price_fixture_5c1b1_active_monthly',
    'active',
    'payload conflict leaves Stripe legacy fields unchanged'
  );
  perform pg_temp.assert_eq_text(
    (select pe.processing_status from billing.provider_events pe where pe.provider_event_ref = 'evt_fixture_5c1b1_active_monthly'),
    'processed',
    'payload conflict is rolled back to the prior processed provider event'
  );

  perform pg_temp.add_apple_subscription(v_apple_user, 'active', 'apple_active', v_now, v_future);
  select * into strict r
  from billing.refresh_effective_entitlement_summary(v_apple_user, 'production', v_now);
  perform pg_temp.assert_true(r.applied, 'Apple seed summary applies');
  select * into strict r
  from pg_temp.process_transition(
    'apple_plus_stripe_failure',
    'invoice.payment_failed',
    v_apple_user,
    'sub_fixture_5c1b1_apple_plus_stripe_failure',
    'past_due',
    v_now + interval '1 minute',
    v_future
  );
  perform pg_temp.expect_transition_result(r.result, 'processed', 'Stripe payment failure with Apple active transition');
  perform pg_temp.expect_entitlement(v_apple_user, 'pro', 'active', false, v_future, 'Apple active preserves Pro after Stripe failure');
  perform pg_temp.expect_legacy_fields(
    v_apple_user,
    'cus_fixture_5c1b1_apple_plus_stripe_failure',
    'sub_fixture_5c1b1_apple_plus_stripe_failure',
    'price_fixture_5c1b1_apple_plus_stripe_failure',
    'past_due',
    'Stripe failure with Apple active records latest Stripe legacy fields'
  );

  select * into strict r
  from pg_temp.process_transition(
    'sandbox_active',
    'customer.subscription.created',
    v_test_user,
    'sub_fixture_5c1b1_sandbox_active',
    'active',
    v_now,
    v_future,
    'test'
  );
  perform pg_temp.expect_transition_result(r.result, 'processed', 'test-mode Stripe transition result');
  perform pg_temp.assert_eq_text(
    (select effective_plan from billing.resolve_effective_entitlement(v_test_user, 'production', v_now)),
    'free',
    'test-mode Stripe row does not grant production resolver access'
  );
  perform pg_temp.assert_eq_text(
    (select effective_plan from billing.resolve_effective_entitlement(v_test_user, 'sandbox', v_now)),
    'pro',
    'test-mode Stripe row grants sandbox resolver access'
  );

  create trigger fixture_5c1b1_summary_failure
    before insert or update on public.entitlements
    for each row
    execute function pg_temp.raise_summary_failure();

  select * into strict r
  from pg_temp.process_transition(
    'summary_failure',
    'customer.subscription.created',
    v_failure_user,
    'sub_fixture_5c1b1_summary_failure',
    'active',
    v_now,
    v_future
  );
  perform pg_temp.expect_transition_result(r.result, 'summary_refresh_failed', 'summary failure transition result');
  perform pg_temp.assert_true(r.retryable, 'summary failure remains retryable');
  perform pg_temp.assert_false(
    exists (select 1 from billing.provider_subscriptions ps where ps.provider_subscription_ref = 'sub_fixture_5c1b1_summary_failure'),
    'summary failure rolls back provider subscription'
  );
  perform pg_temp.assert_false(
    exists (select 1 from billing.provider_events pe where pe.provider_event_ref = 'evt_fixture_5c1b1_summary_failure'),
    'summary failure rolls back provider event'
  );
  perform pg_temp.assert_false(
    exists (select 1 from public.entitlements e where e.user_id = v_failure_user),
    'summary failure rolls back public entitlement row'
  );

  drop trigger fixture_5c1b1_summary_failure on public.entitlements;

  select * into strict r
  from pg_temp.process_transition(
    'summary_failure',
    'customer.subscription.created',
    v_failure_user,
    'sub_fixture_5c1b1_summary_failure',
    'active',
    v_now,
    v_future
  );
  perform pg_temp.expect_transition_result(r.result, 'processed', 'retry after summary failure succeeds');
  perform pg_temp.expect_entitlement(v_failure_user, 'pro', 'active', false, v_future, 'retry after summary failure grants Pro');
  perform pg_temp.expect_legacy_fields(
    v_failure_user,
    'cus_fixture_5c1b1_summary_failure',
    'sub_fixture_5c1b1_summary_failure',
    'price_fixture_5c1b1_summary_failure',
    'active',
    'retry after summary failure records Stripe legacy fields'
  );
end;
$$;

do $$
declare
  v_signature text :=
    'billing.process_stripe_webhook_transition_event(text,text,text,text,timestamp with time zone,uuid,text,text,text,text,timestamp with time zone,timestamp with time zone,boolean,text,timestamp with time zone)';
begin
  perform pg_temp.assert_false(has_function_privilege('anon', v_signature, 'execute'), 'anon cannot execute transition wrapper');
  perform pg_temp.assert_false(has_function_privilege('authenticated', v_signature, 'execute'), 'authenticated cannot execute transition wrapper');
  perform pg_temp.assert_true(has_function_privilege('service_role', v_signature, 'execute'), 'service_role can execute transition wrapper');
  perform pg_temp.assert_true(
    exists (
      select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'billing'
        and p.proname = 'process_stripe_webhook_transition_event'
        and p.prosecdef is false
    ),
    'transition wrapper uses security invoker'
  );
end;
$$;

rollback;
