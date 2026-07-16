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

create function pg_temp.assert_text_array(p_actual text[], p_expected text[], p_message text)
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

create function pg_temp.add_subscription(
  p_user_id uuid,
  p_provider text,
  p_environment text,
  p_status text,
  p_started_at timestamptz,
  p_period_end timestamptz,
  p_grace_end timestamptz,
  p_reconciliation_status text,
  p_ref_suffix text,
  p_cancel_at_period_end boolean default false
)
returns uuid
language plpgsql
as $$
declare
  v_id uuid := gen_random_uuid();
begin
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
    grace_period_ends_at,
    billing_retry_started_at,
    expires_at,
    revoked_at,
    refunded_at,
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
    case
      when p_provider = 'apple' then 'com.canyougeo.pro.monthly'
      when p_provider = 'google_play' then 'canyougeo_pro_monthly'
      else 'price_pro_monthly'
    end,
    'customer_' || p_ref_suffix,
    'subscription_' || p_ref_suffix,
    case when p_provider = 'apple' then 'original_' || p_ref_suffix else null end,
    'transaction_' || p_ref_suffix,
    p_user_id,
    p_status,
    case when p_status in ('active', 'grace_period') then true else false end,
    p_cancel_at_period_end,
    p_started_at,
    p_started_at,
    p_period_end,
    p_grace_end,
    case when p_status = 'billing_retry' then p_started_at else null end,
    case when p_status = 'expired' then p_period_end else null end,
    case when p_status = 'revoked' then coalesce(p_period_end, p_started_at) else null end,
    case when p_status = 'refunded' then coalesce(p_period_end, p_started_at) else null end,
    case when p_status = 'paused' then coalesce(p_started_at, p_period_end) else null end,
    p_started_at,
    p_started_at,
    'event_' || p_ref_suffix,
    p_reconciliation_status,
    p_started_at,
    p_started_at
  );

  return v_id;
end;
$$;

create function pg_temp.expect_resolution(
  p_label text,
  p_user_id uuid,
  p_environment text,
  p_as_of timestamptz,
  p_grants_pro boolean,
  p_effective_plan text,
  p_access_status text,
  p_management_provider text,
  p_active_provider_count integer,
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
  from billing.resolve_effective_entitlement(p_user_id, p_environment, p_as_of);

  perform pg_temp.assert_true(v_result.computed_at = p_as_of, p_label || ': deterministic computed_at');
  perform pg_temp.assert_true(v_result.grants_pro is not distinct from p_grants_pro, p_label || ': grants_pro');
  perform pg_temp.assert_eq_text(v_result.effective_plan, p_effective_plan, p_label || ': effective_plan');
  perform pg_temp.assert_eq_text(v_result.effective_access_status, p_access_status, p_label || ': effective_access_status');
  perform pg_temp.assert_eq_text(v_result.management_provider, p_management_provider, p_label || ': management_provider');
  perform pg_temp.assert_eq_int(v_result.active_provider_count, p_active_provider_count, p_label || ': active_provider_count');
  perform pg_temp.assert_true(
    v_result.requires_reconciliation is not distinct from p_requires_reconciliation,
    p_label || ': requires_reconciliation'
  );
end;
$$;

do $$
declare
  v_now constant timestamptz := '2026-07-16 12:00:00+00';
  v_before constant timestamptz := '2026-07-15 11:59:59+00';
  v_start constant timestamptz := '2026-07-15 12:00:00+00';
  v_end constant timestamptz := '2026-08-16 12:00:00+00';
  v_later_end constant timestamptz := '2026-09-16 12:00:00+00';
  u_free uuid := '00000000-0000-0000-0000-000000050100';
  u_stripe_active uuid := '00000000-0000-0000-0000-000000050101';
  u_apple_active uuid := '00000000-0000-0000-0000-000000050102';
  u_google_active uuid := '00000000-0000-0000-0000-000000050103';
  u_cancel_valid uuid := '00000000-0000-0000-0000-000000050104';
  u_cancel_expired uuid := '00000000-0000-0000-0000-000000050105';
  u_grace_valid uuid := '00000000-0000-0000-0000-000000050106';
  u_grace_expired uuid := '00000000-0000-0000-0000-000000050107';
  u_retry uuid := '00000000-0000-0000-0000-000000050108';
  u_pending uuid := '00000000-0000-0000-0000-000000050109';
  u_expired uuid := '00000000-0000-0000-0000-000000050110';
  u_refunded uuid := '00000000-0000-0000-0000-000000050111';
  u_revoked uuid := '00000000-0000-0000-0000-000000050112';
  u_unknown uuid := '00000000-0000-0000-0000-000000050113';
  u_dual uuid := '00000000-0000-0000-0000-000000050114';
  u_stripe_expired_apple_active uuid := '00000000-0000-0000-0000-000000050115';
  u_apple_expired_stripe_active uuid := '00000000-0000-0000-0000-000000050116';
  u_cancel_plus_active uuid := '00000000-0000-0000-0000-000000050117';
  u_revoked_plus_active uuid := '00000000-0000-0000-0000-000000050118';
  u_refunded_plus_active uuid := '00000000-0000-0000-0000-000000050119';
  u_unknown_plus_active uuid := '00000000-0000-0000-0000-000000050120';
  u_both_expired uuid := '00000000-0000-0000-0000-000000050121';
  u_different_periods uuid := '00000000-0000-0000-0000-000000050122';
  u_both_cancelling uuid := '00000000-0000-0000-0000-000000050123';
  u_sandbox_only uuid := '00000000-0000-0000-0000-000000050124';
  u_prod_and_sandbox uuid := '00000000-0000-0000-0000-000000050125';
  u_history uuid := '00000000-0000-0000-0000-000000050126';
  u_revocation_history uuid := '00000000-0000-0000-0000-000000050127';
  u_missing_timestamp uuid := '00000000-0000-0000-0000-000000050128';
  u_null_owner uuid := '00000000-0000-0000-0000-000000050129';
  u_legacy_monthly uuid := '00000000-0000-0000-0000-000000050130';
  u_legacy_annual uuid := '00000000-0000-0000-0000-000000050131';
  u_legacy_reactivated uuid := '00000000-0000-0000-0000-000000050132';
  r record;
  before_entitlements integer;
  before_subscriptions integer;
  before_events integer;
begin
  for r in
    select unnest(array[
      u_free, u_stripe_active, u_apple_active, u_google_active, u_cancel_valid, u_cancel_expired,
      u_grace_valid, u_grace_expired, u_retry, u_pending, u_expired, u_refunded, u_revoked, u_unknown,
      u_dual, u_stripe_expired_apple_active, u_apple_expired_stripe_active, u_cancel_plus_active,
      u_revoked_plus_active, u_refunded_plus_active, u_unknown_plus_active, u_both_expired,
      u_different_periods, u_both_cancelling, u_sandbox_only, u_prod_and_sandbox, u_history,
      u_revocation_history, u_missing_timestamp, u_null_owner, u_legacy_monthly, u_legacy_annual,
      u_legacy_reactivated
    ]::uuid[]) as user_id
  loop
    perform pg_temp.add_profile(r.user_id);
  end loop;

  perform pg_temp.add_subscription(u_stripe_active, 'stripe', 'live', 'active', v_now - interval '1 day', v_end, null, 'current', 'stripe_active');
  perform pg_temp.add_subscription(u_apple_active, 'apple', 'production', 'active', v_now - interval '1 day', v_end, null, 'current', 'apple_active');
  perform pg_temp.add_subscription(u_google_active, 'google_play', 'production', 'active', v_now - interval '1 day', v_end, null, 'current', 'google_active');
  perform pg_temp.add_subscription(u_cancel_valid, 'stripe', 'live', 'cancelled_active_until_period_end', v_now - interval '1 day', v_end, null, 'current', 'cancel_valid', true);
  perform pg_temp.add_subscription(u_cancel_expired, 'stripe', 'live', 'cancelled_active_until_period_end', v_now - interval '40 days', v_now - interval '1 day', null, 'current', 'cancel_expired', true);
  perform pg_temp.add_subscription(u_grace_valid, 'apple', 'production', 'grace_period', v_now - interval '1 day', v_end, v_end + interval '7 days', 'current', 'grace_valid');
  perform pg_temp.add_subscription(u_grace_expired, 'apple', 'production', 'grace_period', v_now - interval '40 days', v_now - interval '10 days', v_now - interval '1 day', 'current', 'grace_expired');
  perform pg_temp.add_subscription(u_retry, 'apple', 'production', 'billing_retry', v_now - interval '1 day', v_end, null, 'current', 'retry');
  perform pg_temp.add_subscription(u_pending, 'apple', 'production', 'pending', v_now - interval '1 day', null, null, 'current', 'pending');
  perform pg_temp.add_subscription(u_expired, 'stripe', 'live', 'expired', v_now - interval '40 days', v_now - interval '1 day', null, 'current', 'expired');
  perform pg_temp.add_subscription(u_refunded, 'apple', 'production', 'refunded', v_now - interval '40 days', v_now - interval '1 day', null, 'current', 'refunded');
  perform pg_temp.add_subscription(u_revoked, 'apple', 'production', 'revoked', v_now - interval '40 days', v_now - interval '1 day', null, 'current', 'revoked');
  perform pg_temp.add_subscription(u_unknown, 'apple', 'production', 'unknown_needs_reconciliation', v_now - interval '1 day', v_end, null, 'current', 'unknown');

  perform pg_temp.add_subscription(u_dual, 'stripe', 'live', 'active', v_now - interval '1 day', v_end, null, 'current', 'dual_stripe');
  perform pg_temp.add_subscription(u_dual, 'apple', 'production', 'active', v_now - interval '1 day', v_later_end, null, 'current', 'dual_apple');
  perform pg_temp.add_subscription(u_stripe_expired_apple_active, 'stripe', 'live', 'expired', v_now - interval '40 days', v_now - interval '1 day', null, 'current', 'stripe_expired');
  perform pg_temp.add_subscription(u_stripe_expired_apple_active, 'apple', 'production', 'active', v_now - interval '1 day', v_end, null, 'current', 'apple_still_active');
  perform pg_temp.add_subscription(u_apple_expired_stripe_active, 'apple', 'production', 'expired', v_now - interval '40 days', v_now - interval '1 day', null, 'current', 'apple_expired');
  perform pg_temp.add_subscription(u_apple_expired_stripe_active, 'stripe', 'live', 'active', v_now - interval '1 day', v_end, null, 'current', 'stripe_still_active');
  perform pg_temp.add_subscription(u_cancel_plus_active, 'stripe', 'live', 'cancelled_active_until_period_end', v_now - interval '1 day', v_end, null, 'current', 'cancel_plus_stripe', true);
  perform pg_temp.add_subscription(u_cancel_plus_active, 'apple', 'production', 'active', v_now - interval '1 day', v_later_end, null, 'current', 'cancel_plus_apple');
  perform pg_temp.add_subscription(u_revoked_plus_active, 'stripe', 'live', 'revoked', v_now - interval '40 days', v_now - interval '1 day', null, 'current', 'revoked_plus_stripe');
  perform pg_temp.add_subscription(u_revoked_plus_active, 'apple', 'production', 'active', v_now - interval '1 day', v_end, null, 'current', 'revoked_plus_apple');
  perform pg_temp.add_subscription(u_refunded_plus_active, 'apple', 'production', 'refunded', v_now - interval '40 days', v_now - interval '1 day', null, 'current', 'refunded_plus_apple');
  perform pg_temp.add_subscription(u_refunded_plus_active, 'stripe', 'live', 'active', v_now - interval '1 day', v_end, null, 'current', 'refunded_plus_stripe');
  perform pg_temp.add_subscription(u_unknown_plus_active, 'apple', 'production', 'unknown_needs_reconciliation', v_now - interval '1 day', v_end, null, 'current', 'unknown_plus_apple');
  perform pg_temp.add_subscription(u_unknown_plus_active, 'stripe', 'live', 'active', v_now - interval '1 day', v_end, null, 'current', 'unknown_plus_stripe');
  perform pg_temp.add_subscription(u_both_expired, 'stripe', 'live', 'expired', v_now - interval '40 days', v_now - interval '1 day', null, 'current', 'both_expired_stripe');
  perform pg_temp.add_subscription(u_both_expired, 'apple', 'production', 'expired', v_now - interval '40 days', v_now - interval '1 day', null, 'current', 'both_expired_apple');
  perform pg_temp.add_subscription(u_different_periods, 'stripe', 'live', 'active', v_now - interval '1 day', v_end, null, 'current', 'period_stripe');
  perform pg_temp.add_subscription(u_different_periods, 'apple', 'production', 'active', v_now - interval '1 day', v_later_end, null, 'current', 'period_apple');
  perform pg_temp.add_subscription(u_both_cancelling, 'stripe', 'live', 'cancelled_active_until_period_end', v_now - interval '1 day', v_end, null, 'current', 'both_cancel_stripe', true);
  perform pg_temp.add_subscription(u_both_cancelling, 'apple', 'production', 'cancelled_active_until_period_end', v_now - interval '1 day', v_later_end, null, 'current', 'both_cancel_apple', true);

  perform pg_temp.add_subscription(u_sandbox_only, 'apple', 'sandbox', 'active', v_now - interval '1 day', v_end, null, 'current', 'same_ref_isolated');
  perform pg_temp.add_subscription(u_sandbox_only, 'stripe', 'test', 'active', v_now - interval '1 day', v_end, null, 'current', 'sandbox_stripe');
  perform pg_temp.add_subscription(u_prod_and_sandbox, 'apple', 'sandbox', 'active', v_now - interval '1 day', v_later_end, null, 'current', 'shared_original');
  perform pg_temp.add_subscription(u_prod_and_sandbox, 'apple', 'production', 'active', v_now - interval '1 day', v_end, null, 'current', 'shared_original_prod');

  perform pg_temp.add_subscription(u_history, 'stripe', 'live', 'expired', v_now - interval '90 days', v_now - interval '60 days', null, 'current', 'history_expired');
  perform pg_temp.add_subscription(u_history, 'stripe', 'live', 'active', v_now - interval '1 day', v_end, null, 'current', 'history_active');

  insert into billing.provider_subscriptions (
    user_id, provider, environment, product_tier, provider_product_ref, provider_customer_ref,
    status, started_at, current_period_start, current_period_end, revoked_at, last_verified_at,
    last_event_at, reconciliation_status, created_at, updated_at
  )
  values
    (u_revocation_history, 'stripe', 'live', 'pro', 'price_pro_monthly', 'customer_revocation_chain',
      'active', v_now - interval '30 days', v_now - interval '30 days', v_end, null,
      v_now - interval '30 days', v_now - interval '30 days', 'current', v_now - interval '30 days', v_now - interval '30 days'),
    (u_revocation_history, 'stripe', 'live', 'pro', 'price_pro_monthly', 'customer_revocation_chain',
      'revoked', v_now - interval '1 day', v_now - interval '30 days', v_end, v_now - interval '1 hour',
      v_now - interval '1 day', v_now - interval '1 hour', 'current', v_now - interval '1 day', v_now - interval '1 hour');

  insert into billing.provider_subscriptions (
    user_id, provider, environment, product_tier, provider_product_ref, provider_customer_ref,
    provider_subscription_ref, status, started_at, current_period_start, current_period_end,
    last_verified_at, last_event_at, reconciliation_status, created_at, updated_at
  )
  values (
    u_missing_timestamp, 'stripe', 'live', 'pro', 'price_pro_monthly', 'customer_missing_period',
    'subscription_missing_period', 'active', v_now - interval '1 day', v_now - interval '1 day', null,
    v_now - interval '1 day', v_now - interval '1 day', 'current', v_now - interval '1 day', v_now - interval '1 day'
  );

  insert into billing.provider_subscriptions (
    user_id, provider, environment, product_tier, provider_product_ref, provider_customer_ref,
    provider_subscription_ref, status, started_at, current_period_start, current_period_end,
    last_verified_at, last_event_at, reconciliation_status, created_at, updated_at
  )
  values (
    null, 'apple', 'production', 'pro', 'com.canyougeo.pro.monthly', 'customer_deleted_owner',
    'subscription_deleted_owner', 'active', v_now - interval '1 day', v_now - interval '1 day', v_end,
    v_now - interval '1 day', v_now - interval '1 day', 'current', v_now - interval '1 day', v_now - interval '1 day'
  );

  perform pg_temp.add_subscription(u_legacy_monthly, 'stripe', 'live', 'active', v_now - interval '1 day', v_end, null, 'current', 'legacy_monthly');
  perform pg_temp.add_subscription(u_legacy_annual, 'stripe', 'live', 'active', v_now - interval '1 day', v_later_end, null, 'current', 'legacy_annual');
  perform pg_temp.add_subscription(u_legacy_reactivated, 'stripe', 'live', 'expired', v_now - interval '90 days', v_now - interval '60 days', null, 'current', 'legacy_reactivated_old');
  perform pg_temp.add_subscription(u_legacy_reactivated, 'stripe', 'live', 'active', v_now - interval '1 day', v_end, null, 'current', 'legacy_reactivated_new');

  perform pg_temp.expect_resolution('no provider rows', u_free, 'production', v_now, false, 'free', 'free', 'none', 0, false);
  perform pg_temp.expect_resolution('stripe active only', u_stripe_active, 'production', v_now, true, 'pro', 'active', 'stripe', 1, false);
  perform pg_temp.expect_resolution('apple active only', u_apple_active, 'production', v_now, true, 'pro', 'active', 'apple', 1, false);
  perform pg_temp.expect_resolution('google active only', u_google_active, 'production', v_now, true, 'pro', 'active', 'google_play', 1, false);
  perform pg_temp.expect_resolution('cancelled but paid through', u_cancel_valid, 'production', v_now, true, 'pro', 'cancelled_active_until_period_end', 'stripe', 1, false);
  perform pg_temp.expect_resolution('cancelled after period', u_cancel_expired, 'production', v_now, false, 'free', 'unknown_needs_reconciliation', 'none', 0, true);
  perform pg_temp.expect_resolution('grace before end', u_grace_valid, 'production', v_now, true, 'pro', 'grace_period', 'apple', 1, true);
  perform pg_temp.expect_resolution('grace after end', u_grace_expired, 'production', v_now, false, 'free', 'unknown_needs_reconciliation', 'none', 0, true);
  perform pg_temp.expect_resolution('billing retry without grace', u_retry, 'production', v_now, false, 'free', 'unknown_needs_reconciliation', 'none', 0, true);
  perform pg_temp.expect_resolution('pending does not grant', u_pending, 'production', v_now, false, 'free', 'unknown_needs_reconciliation', 'none', 0, true);
  perform pg_temp.expect_resolution('expired does not grant', u_expired, 'production', v_now, false, 'free', 'free', 'none', 0, false);
  perform pg_temp.expect_resolution('refunded does not grant', u_refunded, 'production', v_now, false, 'free', 'free', 'none', 0, false);
  perform pg_temp.expect_resolution('revoked does not grant', u_revoked, 'production', v_now, false, 'free', 'free', 'none', 0, false);
  perform pg_temp.expect_resolution('unknown requires reconciliation', u_unknown, 'production', v_now, false, 'free', 'unknown_needs_reconciliation', 'none', 0, true);

  perform pg_temp.expect_resolution('dual active providers', u_dual, 'production', v_now, true, 'pro', 'active', 'multiple', 2, false);
  perform pg_temp.expect_resolution('stripe expired apple active', u_stripe_expired_apple_active, 'production', v_now, true, 'pro', 'active', 'apple', 1, false);
  perform pg_temp.expect_resolution('apple expired stripe active', u_apple_expired_stripe_active, 'production', v_now, true, 'pro', 'active', 'stripe', 1, false);
  perform pg_temp.expect_resolution('cancelling stripe plus apple active', u_cancel_plus_active, 'production', v_now, true, 'pro', 'active', 'multiple', 2, false);
  perform pg_temp.expect_resolution('revoked stripe plus apple active', u_revoked_plus_active, 'production', v_now, true, 'pro', 'active', 'apple', 1, false);
  perform pg_temp.expect_resolution('refunded apple plus stripe active', u_refunded_plus_active, 'production', v_now, true, 'pro', 'active', 'stripe', 1, false);
  perform pg_temp.expect_resolution('unknown apple plus stripe active', u_unknown_plus_active, 'production', v_now, true, 'pro', 'active', 'stripe', 1, true);
  perform pg_temp.expect_resolution('both expired', u_both_expired, 'production', v_now, false, 'free', 'free', 'none', 0, false);
  perform pg_temp.expect_resolution('both active and cancelling', u_both_cancelling, 'production', v_now, true, 'pro', 'cancelled_active_until_period_end', 'multiple', 2, false);

  select * into strict r from billing.resolve_effective_entitlement(u_dual, 'production', v_now);
  perform pg_temp.assert_text_array(r.active_providers, array['apple', 'stripe']::text[], 'dual active providers array');
  perform pg_temp.assert_true(r.multiple_active_providers, 'dual active multiple flag');
  perform pg_temp.assert_eq_timestamptz(r.effective_period_end, v_later_end, 'dual active latest effective period end');

  select * into strict r from billing.resolve_effective_entitlement(u_different_periods, 'production', v_now);
  perform pg_temp.assert_eq_timestamptz(r.effective_period_end, v_later_end, 'different periods choose latest active end');

  select * into strict r from billing.resolve_effective_entitlement(u_cancel_valid, 'production', v_end);
  perform pg_temp.assert_false(r.grants_pro, 'period end is exclusive');
  perform pg_temp.assert_eq_text(r.decision_reason, 'free_requires_reconciliation', 'period end requires refresh');

  select * into strict r from billing.resolve_effective_entitlement(u_stripe_active, 'production', v_start);
  perform pg_temp.assert_true(r.grants_pro, 'period start is inclusive');

  select * into strict r from billing.resolve_effective_entitlement(u_stripe_active, 'production', v_before);
  perform pg_temp.assert_false(r.grants_pro, 'before current period start does not grant');
  perform pg_temp.assert_true(r.requires_reconciliation, 'before current period start requires reconciliation');

  perform pg_temp.expect_resolution('sandbox-only does not grant production', u_sandbox_only, 'production', v_now, false, 'free', 'free', 'none', 0, false);
  perform pg_temp.expect_resolution('sandbox-only grants sandbox', u_sandbox_only, 'sandbox', v_now, true, 'pro', 'active', 'multiple', 2, false);
  perform pg_temp.expect_resolution('production ignores sandbox twin', u_prod_and_sandbox, 'production', v_now, true, 'pro', 'active', 'apple', 1, false);
  perform pg_temp.expect_resolution('sandbox ignores production twin', u_prod_and_sandbox, 'sandbox', v_now, true, 'pro', 'active', 'apple', 1, false);

  perform pg_temp.expect_resolution('historical expired plus newer active', u_history, 'production', v_now, true, 'pro', 'active', 'stripe', 1, false);
  perform pg_temp.expect_resolution('newer revocation beats older active for same chain', u_revocation_history, 'production', v_now, false, 'free', 'unknown_needs_reconciliation', 'none', 0, true);
  perform pg_temp.expect_resolution('missing required active period', u_missing_timestamp, 'production', v_now, false, 'free', 'unknown_needs_reconciliation', 'none', 0, true);
  perform pg_temp.expect_resolution('null owner row cannot grant deleted uuid', u_null_owner, 'production', v_now, false, 'free', 'free', 'none', 0, false);
  perform pg_temp.expect_resolution('invalid environment is conservative', u_stripe_active, 'live', v_now, false, 'free', 'unknown_needs_reconciliation', 'none', 0, true);

  perform pg_temp.expect_resolution('legacy free parity', u_free, 'production', v_now, false, 'free', 'free', 'none', 0, false);
  perform pg_temp.expect_resolution('legacy monthly active parity', u_legacy_monthly, 'production', v_now, true, 'pro', 'active', 'stripe', 1, false);
  perform pg_temp.expect_resolution('legacy annual active parity', u_legacy_annual, 'production', v_now, true, 'pro', 'active', 'stripe', 1, false);
  perform pg_temp.expect_resolution('legacy cancelling parity', u_cancel_valid, 'production', v_now, true, 'pro', 'cancelled_active_until_period_end', 'stripe', 1, false);
  perform pg_temp.expect_resolution('legacy expired parity', u_expired, 'production', v_now, false, 'free', 'free', 'none', 0, false);
  perform pg_temp.expect_resolution('legacy payment failure parity', u_retry, 'production', v_now, false, 'free', 'unknown_needs_reconciliation', 'none', 0, true);
  perform pg_temp.expect_resolution('legacy reactivated parity', u_legacy_reactivated, 'production', v_now, true, 'pro', 'active', 'stripe', 1, false);

  select count(*) into before_entitlements from public.entitlements;
  select count(*) into before_subscriptions from billing.provider_subscriptions;
  select count(*) into before_events from billing.provider_events;

  perform billing.resolve_effective_entitlement(u_dual, 'production', v_now);
  perform billing.resolve_effective_entitlement(u_dual, 'production', v_now);

  perform pg_temp.assert_eq_int((select count(*) from public.entitlements)::integer, before_entitlements, 'resolver does not mutate public.entitlements');
  perform pg_temp.assert_eq_int((select count(*) from billing.provider_subscriptions)::integer, before_subscriptions, 'resolver does not mutate provider_subscriptions');
  perform pg_temp.assert_eq_int((select count(*) from billing.provider_events)::integer, before_events, 'resolver does not mutate provider_events');

  select * into strict r from billing.resolve_effective_entitlement(u_dual, 'production', v_now);
  perform pg_temp.assert_eq_text(r.decision_reason, 'pro_multiple_providers', 'repeated execution remains stable');
end;
$$;

set local role service_role;
select pg_temp.assert_true(
  (select grants_pro from billing.resolve_effective_entitlement(
    '00000000-0000-0000-0000-000000050101',
    'production',
    '2026-07-16 12:00:00+00'
  )),
  'service_role can execute resolver'
);
reset role;

set local role authenticated;
do $$
begin
  perform * from billing.resolve_effective_entitlement(
    '00000000-0000-0000-0000-000000050101',
    'production',
    '2026-07-16 12:00:00+00'
  );
  raise exception 'authenticated unexpectedly executed billing resolver';
exception
  when insufficient_privilege then
    null;
end;
$$;
reset role;

set local role anon;
do $$
begin
  perform * from billing.resolve_effective_entitlement(
    '00000000-0000-0000-0000-000000050101',
    'production',
    '2026-07-16 12:00:00+00'
  );
  raise exception 'anon unexpectedly executed billing resolver';
exception
  when insufficient_privilege then
    null;
end;
$$;
reset role;

rollback;
