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

create function pg_temp.insert_mapped_stripe_candidate(
  p_user_id uuid,
  p_environment text,
  p_plan text,
  p_status text,
  p_stripe_customer_id text,
  p_stripe_subscription_id text,
  p_stripe_price_id text,
  p_stripe_status text,
  p_cancel_at_period_end boolean,
  p_current_period_end timestamptz,
  p_updated_at timestamptz,
  p_as_of timestamptz
)
returns void
language plpgsql
as $$
begin
  insert into billing.provider_subscriptions (
    user_id,
    provider,
    environment,
    product_tier,
    provider_customer_ref,
    provider_subscription_ref,
    provider_product_ref,
    status,
    auto_renews,
    cancel_at_period_end,
    current_period_end,
    billing_retry_started_at,
    expires_at,
    paused_at,
    last_verified_at,
    last_event_at,
    reconciliation_status,
    created_at,
    updated_at
  )
  select
    mapped.user_id,
    mapped.provider,
    mapped.environment,
    mapped.product_tier,
    mapped.provider_customer_ref,
    mapped.provider_subscription_ref,
    mapped.provider_product_ref,
    mapped.status,
    mapped.auto_renews,
    mapped.cancel_at_period_end,
    mapped.current_period_end,
    mapped.billing_retry_started_at,
    mapped.expires_at,
    mapped.paused_at,
    mapped.last_verified_at,
    mapped.last_event_at,
    mapped.reconciliation_status,
    coalesce(mapped.last_event_at, p_as_of),
    coalesce(mapped.last_event_at, p_as_of)
  from billing.map_legacy_stripe_entitlement_candidate(
    p_user_id,
    p_environment,
    p_plan,
    p_status,
    p_stripe_customer_id,
    p_stripe_subscription_id,
    p_stripe_price_id,
    p_stripe_status,
    p_cancel_at_period_end,
    p_current_period_end,
    p_updated_at,
    p_as_of
  ) mapped
  where mapped.should_insert_candidate;
end;
$$;

create function pg_temp.expect_projection(
  p_label text,
  p_user_id uuid,
  p_environment text,
  p_as_of timestamptz,
  p_plan text,
  p_status text,
  p_cancel_at_period_end boolean,
  p_current_period_end timestamptz,
  p_management_provider text,
  p_multiple_active_providers boolean,
  p_requires_reconciliation boolean
)
returns void
language plpgsql
as $$
declare
  v_result record;
begin
  select *
  into strict v_result
  from billing.project_effective_entitlement_summary(p_user_id, p_environment, p_as_of);

  perform pg_temp.assert_eq_text(v_result.plan, p_plan, p_label || ': plan');
  perform pg_temp.assert_eq_text(v_result.status, p_status, p_label || ': status');
  perform pg_temp.assert_eq_bool(v_result.cancel_at_period_end, p_cancel_at_period_end, p_label || ': cancel flag');
  perform pg_temp.assert_eq_timestamptz(v_result.current_period_end, p_current_period_end, p_label || ': period end');
  perform pg_temp.assert_eq_text(v_result.management_provider, p_management_provider, p_label || ': management provider');
  perform pg_temp.assert_eq_bool(v_result.multiple_active_providers, p_multiple_active_providers, p_label || ': multiple providers');
  perform pg_temp.assert_eq_bool(v_result.requires_reconciliation, p_requires_reconciliation, p_label || ': reconciliation');
  perform pg_temp.assert_eq_timestamptz(v_result.computed_at, p_as_of, p_label || ': deterministic computed_at');
end;
$$;

do $$
declare
  v_now constant timestamptz := '2026-07-16 12:00:00+00';
  v_observed constant timestamptz := '2026-07-16 11:00:00+00';
  v_end constant timestamptz := '2026-08-16 12:00:00+00';
  v_later_end constant timestamptz := '2027-07-16 12:00:00+00';
  v_expired constant timestamptz := '2026-07-15 12:00:00+00';
  u_free uuid := '00000000-0000-0000-0000-000000051000';
  u_active_monthly uuid := '00000000-0000-0000-0000-000000051001';
  u_active_annual uuid := '00000000-0000-0000-0000-000000051002';
  u_cancelling uuid := '00000000-0000-0000-0000-000000051003';
  u_trialing uuid := '00000000-0000-0000-0000-000000051004';
  u_past_due uuid := '00000000-0000-0000-0000-000000051005';
  u_unpaid uuid := '00000000-0000-0000-0000-000000051006';
  u_incomplete uuid := '00000000-0000-0000-0000-000000051007';
  u_incomplete_expired uuid := '00000000-0000-0000-0000-000000051008';
  u_paused uuid := '00000000-0000-0000-0000-000000051009';
  u_unknown uuid := '00000000-0000-0000-0000-000000051010';
  u_missing_subscription uuid := '00000000-0000-0000-0000-000000051011';
  u_missing_period uuid := '00000000-0000-0000-0000-000000051012';
  u_reactivated uuid := '00000000-0000-0000-0000-000000051013';
  u_sandbox_only uuid := '00000000-0000-0000-0000-000000051014';
  u_retry_plus_apple uuid := '00000000-0000-0000-0000-000000051015';
  before_entitlements integer;
  before_subscriptions integer;
  before_events integer;
  r record;
begin
  for r in
    select unnest(array[
      u_free,
      u_active_monthly,
      u_active_annual,
      u_cancelling,
      u_trialing,
      u_past_due,
      u_unpaid,
      u_incomplete,
      u_incomplete_expired,
      u_paused,
      u_unknown,
      u_missing_subscription,
      u_missing_period,
      u_reactivated,
      u_sandbox_only,
      u_retry_plus_apple
    ]::uuid[]) as user_id
  loop
    perform pg_temp.add_profile(r.user_id);
  end loop;

  select count(*) into before_entitlements from public.entitlements;
  select count(*) into before_subscriptions from billing.provider_subscriptions;
  select count(*) into before_events from billing.provider_events;

  perform billing.project_effective_entitlement_summary(u_free, 'production', v_now);
  perform billing.map_legacy_stripe_entitlement_candidate(
    u_active_monthly, 'live', 'pro', 'active', 'cus_active', 'sub_active', 'price_monthly',
    'active', false, v_end, v_observed, v_now
  );

  perform pg_temp.assert_true((select count(*) from public.entitlements) = before_entitlements, 'helpers do not mutate public.entitlements');
  perform pg_temp.assert_true((select count(*) from billing.provider_subscriptions) = before_subscriptions, 'helpers do not mutate provider_subscriptions');
  perform pg_temp.assert_true((select count(*) from billing.provider_events) = before_events, 'helpers do not mutate provider_events');

  select * into strict r
  from billing.map_legacy_stripe_entitlement_candidate(
    u_free, 'live', 'free', 'free', null, null, null, null, null, null, v_observed, v_now
  );
  perform pg_temp.assert_false(r.should_insert_candidate, 'free row has no provider candidate');
  perform pg_temp.assert_eq_text(r.mapping_reason, 'ignored_free_row', 'free row mapping reason');

  select * into strict r
  from billing.map_legacy_stripe_entitlement_candidate(
    u_active_monthly, 'production', 'pro', 'active', 'cus_invalid_env', 'sub_invalid_env', 'price_monthly',
    'active', false, v_end, v_observed, v_now
  );
  perform pg_temp.assert_false(r.should_insert_candidate, 'mapper requires explicit Stripe live/test environment');
  perform pg_temp.assert_true(r.requires_reconciliation, 'invalid environment requires reconciliation');
  perform pg_temp.assert_eq_text(r.mapping_reason, 'invalid_environment', 'invalid environment mapping reason');

  select * into strict r
  from billing.map_legacy_stripe_entitlement_candidate(
    u_active_monthly, 'live', 'pro', 'active', 'cus_active', 'sub_active', 'price_monthly',
    'active', false, v_end, v_observed, v_now
  );
  perform pg_temp.assert_eq_text(r.status, 'active', 'active monthly canonical status');
  perform pg_temp.assert_true(r.should_insert_candidate, 'active monthly is insertable candidate');
  perform pg_temp.assert_false(r.requires_reconciliation, 'active monthly is current');
  perform pg_temp.assert_eq_text(r.reconciliation_status, 'current', 'active monthly reconciliation');

  perform pg_temp.insert_mapped_stripe_candidate(
    u_active_monthly, 'live', 'pro', 'active', 'cus_active', 'sub_active', 'price_monthly',
    'active', false, v_end, v_observed, v_now
  );
  perform pg_temp.expect_projection(
    'active monthly parity',
    u_active_monthly,
    'production',
    v_now,
    'pro',
    'active',
    false,
    v_end,
    'stripe',
    false,
    false
  );

  perform pg_temp.insert_mapped_stripe_candidate(
    u_active_annual, 'live', 'pro', 'active', 'cus_annual', 'sub_annual', 'price_annual',
    'active', false, v_later_end, v_observed, v_now
  );
  perform pg_temp.expect_projection(
    'active annual parity',
    u_active_annual,
    'production',
    v_now,
    'pro',
    'active',
    false,
    v_later_end,
    'stripe',
    false,
    false
  );

  select * into strict r
  from billing.map_legacy_stripe_entitlement_candidate(
    u_cancelling, 'live', 'pro', 'active', 'cus_cancel', 'sub_cancel', 'price_monthly',
    'active', true, v_end, v_observed, v_now
  );
  perform pg_temp.assert_eq_text(r.status, 'cancelled_active_until_period_end', 'cancelling canonical status');
  perform pg_temp.assert_true(r.cancel_at_period_end, 'cancelling preserves cancel flag');
  perform pg_temp.insert_mapped_stripe_candidate(
    u_cancelling, 'live', 'pro', 'active', 'cus_cancel', 'sub_cancel', 'price_monthly',
    'active', true, v_end, v_observed, v_now
  );
  perform pg_temp.expect_projection(
    'cancelling still grants until period end',
    u_cancelling,
    'production',
    v_now,
    'pro',
    'active',
    true,
    v_end,
    'stripe',
    false,
    false
  );

  perform pg_temp.insert_mapped_stripe_candidate(
    u_trialing, 'live', 'pro', 'trialing', 'cus_trial', 'sub_trial', 'price_monthly',
    'trialing', false, v_end, v_observed, v_now
  );
  perform pg_temp.expect_projection(
    'trialing legacy rows still grant Pro',
    u_trialing,
    'production',
    v_now,
    'pro',
    'active',
    false,
    v_end,
    'stripe',
    false,
    false
  );

  perform pg_temp.insert_mapped_stripe_candidate(
    u_past_due, 'live', 'free', 'past_due', 'cus_past_due', 'sub_past_due', 'price_monthly',
    'past_due', false, null, v_observed, v_now
  );
  perform pg_temp.expect_projection(
    'payment failure parity',
    u_past_due,
    'production',
    v_now,
    'free',
    'past_due',
    false,
    null,
    'none',
    false,
    true
  );

  perform pg_temp.insert_mapped_stripe_candidate(
    u_unpaid, 'live', 'free', 'canceled', 'cus_unpaid', 'sub_unpaid', 'price_monthly',
    'unpaid', false, v_expired, v_observed, v_now
  );
  perform pg_temp.expect_projection(
    'unpaid remains non-Pro canceled compatible',
    u_unpaid,
    'production',
    v_now,
    'free',
    'canceled',
    false,
    null,
    'none',
    false,
    false
  );

  perform pg_temp.insert_mapped_stripe_candidate(
    u_incomplete, 'live', 'free', 'canceled', 'cus_incomplete', 'sub_incomplete', 'price_monthly',
    'incomplete', false, null, v_observed, v_now
  );
  perform pg_temp.expect_projection(
    'incomplete is non-Pro and reconciliation surfaced',
    u_incomplete,
    'production',
    v_now,
    'free',
    'canceled',
    false,
    null,
    'none',
    false,
    true
  );

  perform pg_temp.insert_mapped_stripe_candidate(
    u_incomplete_expired, 'live', 'free', 'canceled', 'cus_incomplete_expired', 'sub_incomplete_expired', 'price_monthly',
    'incomplete_expired', false, v_expired, v_observed, v_now
  );
  perform pg_temp.expect_projection(
    'incomplete_expired remains non-Pro canceled compatible',
    u_incomplete_expired,
    'production',
    v_now,
    'free',
    'canceled',
    false,
    null,
    'none',
    false,
    false
  );

  perform pg_temp.insert_mapped_stripe_candidate(
    u_paused, 'live', 'free', 'canceled', 'cus_paused', 'sub_paused', 'price_monthly',
    'paused', false, null, v_observed, v_now
  );
  perform pg_temp.expect_projection(
    'paused is non-Pro and reconciliation surfaced',
    u_paused,
    'production',
    v_now,
    'free',
    'canceled',
    false,
    null,
    'none',
    false,
    true
  );

  perform pg_temp.insert_mapped_stripe_candidate(
    u_unknown, 'live', 'free', 'free', 'cus_unknown', 'sub_unknown', 'price_monthly',
    'future_stripe_state', false, null, v_observed, v_now
  );
  perform pg_temp.expect_projection(
    'unknown status is conservative non-Pro',
    u_unknown,
    'production',
    v_now,
    'free',
    'canceled',
    false,
    null,
    'none',
    false,
    true
  );

  select * into strict r
  from billing.map_legacy_stripe_entitlement_candidate(
    u_missing_subscription, 'live', 'pro', 'active', 'cus_missing_subscription', null, 'price_monthly',
    'active', false, v_end, v_observed, v_now
  );
  perform pg_temp.assert_false(r.should_insert_candidate, 'missing subscription ref is not insertable');
  perform pg_temp.assert_true(r.requires_reconciliation, 'missing subscription ref requires reconciliation');
  perform pg_temp.assert_eq_text(r.mapping_reason, 'missing_subscription_ref', 'missing subscription reason');

  perform pg_temp.insert_mapped_stripe_candidate(
    u_missing_period, 'live', 'pro', 'active', 'cus_missing_period', 'sub_missing_period', 'price_monthly',
    'active', false, null, v_observed, v_now
  );
  perform pg_temp.expect_projection(
    'active missing period is conservative non-Pro',
    u_missing_period,
    'production',
    v_now,
    'free',
    'canceled',
    false,
    null,
    'none',
    false,
    true
  );

  perform pg_temp.insert_mapped_stripe_candidate(
    u_reactivated, 'live', 'free', 'canceled', 'cus_reactivated', 'sub_reactivated_old', 'price_monthly',
    'canceled', false, v_expired, v_observed - interval '30 days', v_now
  );
  perform pg_temp.insert_mapped_stripe_candidate(
    u_reactivated, 'live', 'pro', 'active', 'cus_reactivated', 'sub_reactivated_new', 'price_monthly',
    'active', false, v_end, v_observed, v_now
  );
  perform pg_temp.expect_projection(
    'reactivated renewal parity',
    u_reactivated,
    'production',
    v_now,
    'pro',
    'active',
    false,
    v_end,
    'stripe',
    false,
    false
  );

  perform pg_temp.insert_mapped_stripe_candidate(
    u_sandbox_only, 'test', 'pro', 'active', 'cus_test_only', 'sub_test_only', 'price_test',
    'active', false, v_end, v_observed, v_now
  );
  perform pg_temp.expect_projection(
    'Stripe test candidate cannot affect production projection',
    u_sandbox_only,
    'production',
    v_now,
    'free',
    'free',
    false,
    null,
    'none',
    false,
    false
  );
  perform pg_temp.expect_projection(
    'Stripe test candidate grants only sandbox projection',
    u_sandbox_only,
    'sandbox',
    v_now,
    'pro',
    'active',
    false,
    v_end,
    'stripe',
    false,
    false
  );

  perform pg_temp.insert_mapped_stripe_candidate(
    u_retry_plus_apple, 'live', 'free', 'past_due', 'cus_retry_plus_apple', 'sub_retry_plus_apple', 'price_monthly',
    'past_due', false, null, v_observed, v_now
  );
  insert into billing.provider_subscriptions (
    user_id,
    provider,
    environment,
    product_tier,
    provider_product_ref,
    provider_customer_ref,
    provider_subscription_ref,
    status,
    auto_renews,
    cancel_at_period_end,
    current_period_end,
    last_verified_at,
    last_event_at,
    reconciliation_status,
    created_at,
    updated_at
  )
  values (
    u_retry_plus_apple,
    'apple',
    'production',
    'pro',
    'com.canyougeo.pro.monthly',
    'apple_customer_retry_plus_apple',
    'apple_subscription_retry_plus_apple',
    'active',
    true,
    false,
    v_end,
    v_observed,
    v_observed,
    'current',
    v_observed,
    v_observed
  );
  perform pg_temp.expect_projection(
    'billing retry does not shorten another active provider',
    u_retry_plus_apple,
    'production',
    v_now,
    'pro',
    'active',
    false,
    v_end,
    'apple',
    false,
    true
  );

  select count(*) into before_entitlements from public.entitlements;
  select count(*) into before_subscriptions from billing.provider_subscriptions;
  select count(*) into before_events from billing.provider_events;

  perform billing.project_effective_entitlement_summary(u_retry_plus_apple, 'production', v_now);
  perform billing.map_legacy_stripe_entitlement_candidate(
    u_active_annual, 'live', 'pro', 'active', 'cus_annual_repeat', 'sub_annual_repeat', 'price_annual',
    'active', false, v_later_end, v_observed, v_now
  );

  perform pg_temp.assert_true((select count(*) from public.entitlements) = before_entitlements, 'projection and mapper remain side-effect-free after fixtures');
  perform pg_temp.assert_true((select count(*) from billing.provider_subscriptions) = before_subscriptions, 'mapper does not insert provider candidates by itself');
  perform pg_temp.assert_true((select count(*) from billing.provider_events) = before_events, 'mapper and projection do not write provider events');
end;
$$;

set local role service_role;
select pg_temp.assert_true(
  (select plan = 'free' from billing.project_effective_entitlement_summary(
    '00000000-0000-0000-0000-000000051000',
    'production',
    '2026-07-16 12:00:00+00'
  )),
  'service_role can execute compatibility projection'
);
select pg_temp.assert_true(
  (select mapping_reason = 'ignored_free_row' from billing.map_legacy_stripe_entitlement_candidate(
    '00000000-0000-0000-0000-000000051000',
    'live',
    'free',
    'free',
    null,
    null,
    null,
    null,
    null,
    null,
    '2026-07-16 11:00:00+00',
    '2026-07-16 12:00:00+00'
  )),
  'service_role can execute legacy mapper'
);
reset role;

set local role authenticated;
do $$
begin
  perform * from billing.project_effective_entitlement_summary(
    '00000000-0000-0000-0000-000000051000',
    'production',
    '2026-07-16 12:00:00+00'
  );
  raise exception 'authenticated unexpectedly executed compatibility projection';
exception
  when insufficient_privilege then
    null;
end;
$$;
do $$
begin
  perform * from billing.map_legacy_stripe_entitlement_candidate(
    '00000000-0000-0000-0000-000000051000',
    'live',
    'free',
    'free',
    null,
    null,
    null,
    null,
    null,
    null,
    '2026-07-16 11:00:00+00',
    '2026-07-16 12:00:00+00'
  );
  raise exception 'authenticated unexpectedly executed legacy mapper';
exception
  when insufficient_privilege then
    null;
end;
$$;
reset role;

rollback;
