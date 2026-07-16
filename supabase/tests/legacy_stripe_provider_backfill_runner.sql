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

create function pg_temp.clear_billing_fixtures()
returns void
language plpgsql
as $$
begin
  delete from billing.provider_events;
  delete from billing.provider_subscriptions;
  delete from public.entitlements;
end;
$$;

create function pg_temp.seed_legacy_entitlement(
  p_user_id uuid,
  p_plan text,
  p_status text,
  p_suffix text,
  p_stripe_status text default null,
  p_cancel_at_period_end boolean default null,
  p_current_period_end timestamptz default null,
  p_updated_at timestamptz default '2026-07-16 11:00:00+00',
  p_with_customer_ref boolean default true,
  p_with_subscription_ref boolean default true,
  p_with_price_ref boolean default true
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
    case when p_with_customer_ref then 'fixture_5b1f_customer_' || p_suffix else null end,
    case when p_with_subscription_ref then 'fixture_5b1f_subscription_' || p_suffix else null end,
    case when p_with_price_ref then 'fixture_5b1f_product_' || p_suffix else null end,
    p_stripe_status,
    p_cancel_at_period_end,
    p_current_period_end,
    p_updated_at
  )
  on conflict (user_id) do update
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
  p_observed_at timestamptz,
  p_current_period_end timestamptz default null,
  p_cancel_at_period_end boolean default false,
  p_product_ref text default null,
  p_subscription_ref text default null,
  p_customer_ref text default null,
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
    current_period_start,
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
  values (
    v_id,
    p_user_id,
    p_provider,
    p_environment,
    'pro',
    coalesce(p_product_ref, 'fixture_5b1f_product_' || p_suffix),
    coalesce(p_customer_ref, 'fixture_5b1f_customer_' || p_suffix),
    coalesce(p_subscription_ref, 'fixture_5b1f_subscription_' || p_suffix),
    case when p_provider = 'apple' then 'fixture_5b1f_original_' || p_suffix else null end,
    'fixture_5b1f_transaction_' || p_suffix,
    p_user_id,
    p_status,
    case when p_status = 'active' then true when p_status = 'cancelled_active_until_period_end' then false else null end,
    p_cancel_at_period_end,
    case when p_status in ('active', 'cancelled_active_until_period_end') then p_observed_at else null end,
    p_current_period_end,
    case when p_status = 'billing_retry' then p_observed_at else null end,
    case when p_status = 'expired' then coalesce(p_current_period_end, p_observed_at) else null end,
    case when p_status = 'paused' then p_observed_at else null end,
    case when p_status in ('active', 'cancelled_active_until_period_end', 'expired') then p_observed_at else null end,
    p_observed_at,
    p_reconciliation_status,
    p_observed_at,
    p_observed_at
  );

  return v_id;
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
  p_current_period_end timestamptz
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
end;
$$;

create function pg_temp.assert_backfill_result(
  p_result record,
  p_label text,
  p_total integer,
  p_with_subscription integer,
  p_clean integer,
  p_inserted integer,
  p_updated integer,
  p_already_present integer,
  p_skipped_non_subscription integer,
  p_requires_reconciliation integer,
  p_parity_mismatch integer,
  p_ownership_conflict integer,
  p_environment_conflict integer,
  p_stale_source_skipped integer,
  p_failed integer,
  p_dry_run boolean
)
returns void
language plpgsql
as $$
begin
  perform pg_temp.assert_eq_int(p_result.total_rows_scanned, p_total, p_label || ': total rows');
  perform pg_temp.assert_eq_int(p_result.rows_with_subscription_reference, p_with_subscription, p_label || ': rows with subscription');
  perform pg_temp.assert_eq_int(p_result.clean_candidates, p_clean, p_label || ': clean candidates');
  perform pg_temp.assert_eq_int(p_result.inserted, p_inserted, p_label || ': inserted');
  perform pg_temp.assert_eq_int(p_result.updated, p_updated, p_label || ': updated');
  perform pg_temp.assert_eq_int(p_result.already_present, p_already_present, p_label || ': already present');
  perform pg_temp.assert_eq_int(p_result.skipped_non_subscription, p_skipped_non_subscription, p_label || ': skipped non-subscription');
  perform pg_temp.assert_eq_int(p_result.requires_reconciliation, p_requires_reconciliation, p_label || ': requires reconciliation');
  perform pg_temp.assert_eq_int(p_result.parity_mismatch, p_parity_mismatch, p_label || ': parity mismatch');
  perform pg_temp.assert_eq_int(p_result.ownership_conflict, p_ownership_conflict, p_label || ': ownership conflict');
  perform pg_temp.assert_eq_int(p_result.environment_conflict, p_environment_conflict, p_label || ': environment conflict');
  perform pg_temp.assert_eq_int(p_result.stale_source_skipped, p_stale_source_skipped, p_label || ': stale source');
  perform pg_temp.assert_eq_int(p_result.failed, p_failed, p_label || ': failed');
  perform pg_temp.assert_eq_bool(p_result.dry_run, p_dry_run, p_label || ': dry-run flag');
end;
$$;

create function pg_temp.assert_entitlements_unchanged(p_label text)
returns void
language plpgsql
as $$
declare
  v_diff integer;
begin
  select count(*)
  into v_diff
  from (
    (select * from public.entitlements except select * from entitlement_snapshot)
    union all
    (select * from entitlement_snapshot except select * from public.entitlements)
  ) diffs;

  perform pg_temp.assert_eq_int(v_diff, 0, p_label || ': public.entitlements unchanged');
end;
$$;

do $$
declare
  v_now constant timestamptz := '2026-07-16 12:00:00+00';
  v_observed constant timestamptz := '2026-07-16 11:00:00+00';
  v_older constant timestamptz := '2026-07-15 11:00:00+00';
  v_newer constant timestamptz := '2026-07-17 11:00:00+00';
  v_end constant timestamptz := '2026-08-16 12:00:00+00';
  v_later_end constant timestamptz := '2026-09-16 12:00:00+00';
  v_expired constant timestamptz := '2026-07-15 12:00:00+00';
  r record;
  first_dry_run record;
  second_dry_run record;
  first_apply record;
  second_apply record;
  before_events integer;
  before_stripe_events integer;
  before_profiles integer;
  before_auth_users integer;
begin
  perform pg_temp.clear_billing_fixtures();

  -- Dry-run classification fixture.
  perform pg_temp.seed_legacy_entitlement(
    '00000000-0000-0000-0000-000000053001',
    'pro',
    'active',
    'dry_active',
    'active',
    false,
    v_end
  );
  perform pg_temp.seed_legacy_entitlement(
    '00000000-0000-0000-0000-000000053002',
    'pro',
    'active',
    'dry_missing_subscription',
    'active',
    false,
    v_end,
    v_observed,
    true,
    false,
    true
  );
  perform pg_temp.seed_legacy_entitlement(
    '00000000-0000-0000-0000-000000053003',
    'free',
    'free',
    'dry_free',
    null,
    null,
    null,
    v_observed,
    false,
    false,
    false
  );
  perform pg_temp.seed_legacy_entitlement(
    '00000000-0000-0000-0000-000000053004',
    'free',
    'free',
    'dry_unknown',
    'future_stripe_state',
    false,
    null
  );

  select count(*) into before_events from billing.provider_events;
  create temp table entitlement_snapshot as table public.entitlements;

  select *
  into strict first_dry_run
  from billing.backfill_legacy_stripe_provider_subscriptions('live', false, v_now);
  select *
  into strict second_dry_run
  from billing.backfill_legacy_stripe_provider_subscriptions('live', false, v_now);

  perform pg_temp.assert_backfill_result(first_dry_run, 'first dry run', 4, 2, 1, 1, 0, 0, 1, 2, 0, 0, 0, 0, 0, true);
  perform pg_temp.assert_true(to_jsonb(first_dry_run) = to_jsonb(second_dry_run), 'repeated dry run returns identical aggregates');
  perform pg_temp.assert_eq_int((select count(*)::integer from billing.provider_subscriptions), 0, 'dry run inserts no provider rows');
  perform pg_temp.assert_eq_int((select count(*)::integer from billing.provider_events), before_events, 'dry run inserts no provider events');
  perform pg_temp.assert_entitlements_unchanged('dry run');
  drop table entitlement_snapshot;

  -- Apply fixture: inserts, updates, idempotency, conflicts, stale source, and parity mismatch.
  perform pg_temp.clear_billing_fixtures();
  perform pg_temp.seed_legacy_entitlement('00000000-0000-0000-0000-000000053101', 'pro', 'active', 'active_monthly', 'active', false, v_end);
  perform pg_temp.seed_legacy_entitlement('00000000-0000-0000-0000-000000053102', 'pro', 'active', 'active_annual', 'active', false, v_later_end);
  perform pg_temp.seed_legacy_entitlement('00000000-0000-0000-0000-000000053103', 'pro', 'active', 'cancelling', 'active', true, v_end);
  perform pg_temp.seed_legacy_entitlement('00000000-0000-0000-0000-000000053104', 'free', 'canceled', 'expired', 'canceled', false, v_expired);
  perform pg_temp.seed_legacy_entitlement('00000000-0000-0000-0000-000000053105', 'pro', 'active', 'already_present', 'active', false, v_end);
  perform pg_temp.seed_legacy_entitlement('00000000-0000-0000-0000-000000053106', 'pro', 'active', 'older_existing', 'active', false, v_later_end);
  perform pg_temp.seed_legacy_entitlement(
    '00000000-0000-0000-0000-000000053107',
    'free',
    'canceled',
    'newer_existing',
    'canceled',
    false,
    v_expired,
    v_older
  );
  perform pg_temp.seed_legacy_entitlement(
    '00000000-0000-0000-0000-000000053108',
    'pro',
    'active',
    'missing_subscription',
    'active',
    false,
    v_end,
    v_observed,
    true,
    false,
    true
  );
  perform pg_temp.seed_legacy_entitlement('00000000-0000-0000-0000-000000053109', 'pro', 'active', 'missing_period', 'active', false, null);
  perform pg_temp.seed_legacy_entitlement('00000000-0000-0000-0000-000000053110', 'pro', 'active', 'ownership_conflict', 'active', false, v_end);
  perform pg_temp.seed_legacy_entitlement('00000000-0000-0000-0000-000000053111', 'pro', 'active', 'environment_conflict', 'active', false, v_end);
  perform pg_temp.seed_legacy_entitlement('00000000-0000-0000-0000-000000053112', 'pro', 'active', 'parity_mismatch', 'canceled', false, v_expired);

  perform pg_temp.add_provider_subscription(
    '00000000-0000-0000-0000-000000053105',
    'stripe',
    'live',
    'active',
    'already_present',
    v_observed,
    v_end
  );
  perform pg_temp.add_provider_subscription(
    '00000000-0000-0000-0000-000000053106',
    'stripe',
    'live',
    'expired',
    'older_existing',
    v_older,
    v_expired
  );
  perform pg_temp.add_provider_subscription(
    '00000000-0000-0000-0000-000000053107',
    'stripe',
    'live',
    'active',
    'newer_existing',
    v_newer,
    v_later_end
  );
  update billing.provider_subscriptions
  set current_period_start = v_observed,
      last_verified_at = v_newer,
      last_event_at = v_newer,
      updated_at = v_newer
  where provider = 'stripe'
    and environment = 'live'
    and provider_subscription_ref = 'fixture_5b1f_subscription_newer_existing';
  perform pg_temp.add_provider_subscription(
    '00000000-0000-0000-0000-000000053999',
    'stripe',
    'live',
    'active',
    'ownership_conflict',
    v_observed,
    v_end,
    false,
    'fixture_5b1f_product_ownership_conflict',
    'fixture_5b1f_subscription_ownership_conflict',
    'fixture_5b1f_customer_ownership_conflict'
  );
  perform pg_temp.add_provider_subscription(
    '00000000-0000-0000-0000-000000053111',
    'stripe',
    'test',
    'active',
    'environment_conflict',
    v_observed,
    v_end,
    false,
    'fixture_5b1f_product_environment_conflict',
    'fixture_5b1f_subscription_environment_conflict',
    'fixture_5b1f_customer_environment_conflict'
  );

  select count(*) into before_events from billing.provider_events;
  select count(*) into before_stripe_events from public.stripe_webhook_events;
  select count(*) into before_profiles from public.profiles;
  select count(*) into before_auth_users from auth.users;
  create temp table entitlement_snapshot as table public.entitlements;

  select *
  into strict first_apply
  from billing.backfill_legacy_stripe_provider_subscriptions('live', true, v_now);

  perform pg_temp.assert_backfill_result(first_apply, 'first apply', 12, 11, 10, 4, 1, 1, 0, 2, 1, 1, 1, 1, 0, false);
  perform pg_temp.assert_eq_int((select count(*)::integer from billing.provider_subscriptions), 9, 'first apply provider row count');
  perform pg_temp.assert_eq_int((select count(*)::integer from billing.provider_events), before_events, 'first apply inserts no provider events');
  perform pg_temp.assert_eq_int((select count(*)::integer from public.stripe_webhook_events), before_stripe_events, 'first apply does not change Stripe webhook ledger');
  perform pg_temp.assert_eq_int((select count(*)::integer from public.profiles), before_profiles, 'first apply does not modify profiles');
  perform pg_temp.assert_eq_int((select count(*)::integer from auth.users), before_auth_users, 'first apply does not modify auth users');
  perform pg_temp.assert_entitlements_unchanged('first apply');

  perform pg_temp.expect_projection('active monthly', '00000000-0000-0000-0000-000000053101', 'production', v_now, 'pro', 'active', false, v_end);
  perform pg_temp.expect_projection('active annual', '00000000-0000-0000-0000-000000053102', 'production', v_now, 'pro', 'active', false, v_later_end);
  perform pg_temp.expect_projection('cancelling', '00000000-0000-0000-0000-000000053103', 'production', v_now, 'pro', 'active', true, v_end);
  perform pg_temp.expect_projection('expired valid row', '00000000-0000-0000-0000-000000053104', 'production', v_now, 'free', 'canceled', false, null);
  perform pg_temp.expect_projection('older provider updated', '00000000-0000-0000-0000-000000053106', 'production', v_now, 'pro', 'active', false, v_later_end);
  perform pg_temp.expect_projection('newer provider not downgraded', '00000000-0000-0000-0000-000000053107', 'production', v_now, 'pro', 'active', false, v_later_end);
  perform pg_temp.expect_projection('parity mismatch rolled back', '00000000-0000-0000-0000-000000053112', 'production', v_now, 'free', 'free', false, null);

  select *
  into strict second_apply
  from billing.backfill_legacy_stripe_provider_subscriptions('live', true, v_now);
  perform pg_temp.assert_backfill_result(second_apply, 'second apply', 12, 11, 10, 0, 0, 6, 0, 2, 1, 1, 1, 1, 0, false);
  perform pg_temp.assert_eq_int((select count(*)::integer from billing.provider_subscriptions), 9, 'repeated apply creates no duplicates');
  perform pg_temp.assert_eq_int((select count(*)::integer from billing.provider_events), before_events, 'repeated apply inserts no events');
  perform pg_temp.assert_entitlements_unchanged('repeated apply');
  drop table entitlement_snapshot;

  -- Provider coexistence and environment isolation.
  perform pg_temp.clear_billing_fixtures();
  perform pg_temp.seed_legacy_entitlement('00000000-0000-0000-0000-000000053201', 'pro', 'active', 'coexist_stripe_active', 'active', false, v_end);
  perform pg_temp.add_provider_subscription(
    '00000000-0000-0000-0000-000000053201',
    'apple',
    'production',
    'active',
    'coexist_apple_active',
    v_observed,
    v_later_end
  );
  perform pg_temp.seed_legacy_entitlement('00000000-0000-0000-0000-000000053202', 'free', 'canceled', 'coexist_stripe_expired', 'canceled', false, v_expired);
  perform pg_temp.add_provider_subscription(
    '00000000-0000-0000-0000-000000053202',
    'apple',
    'production',
    'active',
    'coexist_apple_expired',
    v_observed,
    v_later_end
  );
  perform pg_temp.seed_legacy_entitlement(
    '00000000-0000-0000-0000-000000053203',
    'pro',
    'active',
    'coexist_missing_subscription',
    'active',
    false,
    v_end,
    v_observed,
    true,
    false,
    true
  );
  perform pg_temp.add_provider_subscription(
    '00000000-0000-0000-0000-000000053203',
    'apple',
    'production',
    'active',
    'coexist_apple_reconciliation',
    v_observed,
    v_later_end
  );

  select * into strict r from billing.backfill_legacy_stripe_provider_subscriptions('live', true, v_now);
  perform pg_temp.assert_backfill_result(r, 'coexist apply', 3, 2, 2, 2, 0, 0, 0, 1, 0, 0, 0, 0, 0, false);
  perform pg_temp.expect_projection('stripe active plus apple', '00000000-0000-0000-0000-000000053201', 'production', v_now, 'pro', 'active', false, v_later_end);
  perform pg_temp.expect_projection('expired stripe plus apple', '00000000-0000-0000-0000-000000053202', 'production', v_now, 'pro', 'active', false, v_later_end);
  perform pg_temp.expect_projection('reconciliation stripe skipped plus apple', '00000000-0000-0000-0000-000000053203', 'production', v_now, 'pro', 'active', false, v_later_end);

  perform pg_temp.clear_billing_fixtures();
  perform pg_temp.seed_legacy_entitlement('00000000-0000-0000-0000-000000053211', 'pro', 'active', 'test_environment', 'active', false, v_end);
  select * into strict r from billing.backfill_legacy_stripe_provider_subscriptions('test', true, v_now);
  perform pg_temp.assert_backfill_result(r, 'test environment apply', 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, false);
  perform pg_temp.expect_projection('Stripe test grants sandbox only', '00000000-0000-0000-0000-000000053211', 'sandbox', v_now, 'pro', 'active', false, v_end);
  perform pg_temp.expect_projection('Stripe test does not grant production', '00000000-0000-0000-0000-000000053211', 'production', v_now, 'free', 'free', false, null);

  perform pg_temp.clear_billing_fixtures();
  perform pg_temp.seed_legacy_entitlement('00000000-0000-0000-0000-000000053212', 'pro', 'active', 'live_environment', 'active', false, v_end);
  select * into strict r from billing.backfill_legacy_stripe_provider_subscriptions('live', true, v_now);
  perform pg_temp.assert_backfill_result(r, 'live environment apply', 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, false);
  perform pg_temp.expect_projection('Stripe live grants production only', '00000000-0000-0000-0000-000000053212', 'production', v_now, 'pro', 'active', false, v_end);
  perform pg_temp.expect_projection('Stripe live does not grant sandbox', '00000000-0000-0000-0000-000000053212', 'sandbox', v_now, 'free', 'free', false, null);

  -- Sanitized staging-shape fixture: two legacy rows, one clean active candidate and one missing subscription ref.
  perform pg_temp.clear_billing_fixtures();
  perform pg_temp.seed_legacy_entitlement('00000000-0000-0000-0000-000000053301', 'pro', 'active', 'staging_clean', 'active', false, v_end);
  perform pg_temp.seed_legacy_entitlement(
    '00000000-0000-0000-0000-000000053302',
    'pro',
    'active',
    'staging_missing_subscription',
    'active',
    false,
    v_end,
    v_observed,
    true,
    false,
    true
  );
  create temp table entitlement_snapshot as table public.entitlements;
  select * into strict r from billing.backfill_legacy_stripe_provider_subscriptions('test', false, v_now);
  perform pg_temp.assert_backfill_result(r, 'staging-shape dry run', 2, 1, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, true);
  perform pg_temp.assert_eq_int((select count(*)::integer from billing.provider_subscriptions), 0, 'staging-shape dry-run writes zero provider rows');
  perform pg_temp.assert_eq_int((select count(*)::integer from billing.provider_events), 0, 'staging-shape dry-run writes zero provider events');
  perform pg_temp.assert_entitlements_unchanged('staging-shape dry-run');

  select * into strict r from billing.backfill_legacy_stripe_provider_subscriptions('test', true, v_now);
  perform pg_temp.assert_backfill_result(r, 'staging-shape apply', 2, 1, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, false);
  perform pg_temp.assert_eq_int((select count(*)::integer from billing.provider_subscriptions), 1, 'staging-shape apply inserts one provider row');
  perform pg_temp.assert_eq_int((select count(*)::integer from billing.provider_events), 0, 'staging-shape apply inserts no provider events');
  perform pg_temp.assert_entitlements_unchanged('staging-shape apply');
  perform pg_temp.expect_projection('staging-shape clean row parity', '00000000-0000-0000-0000-000000053301', 'sandbox', v_now, 'pro', 'active', false, v_end);

  select * into strict r from billing.backfill_legacy_stripe_provider_subscriptions('test', true, v_now);
  perform pg_temp.assert_backfill_result(r, 'staging-shape repeated apply', 2, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, false);
  perform pg_temp.assert_eq_int((select count(*)::integer from billing.provider_subscriptions), 1, 'staging-shape repeated apply stays idempotent');
  drop table entitlement_snapshot;

  -- Invalid environment is rejected before scanning or writing.
  perform pg_temp.clear_billing_fixtures();
  perform pg_temp.seed_legacy_entitlement('00000000-0000-0000-0000-000000053401', 'pro', 'active', 'invalid_environment', 'active', false, v_end);
  select * into strict r from billing.backfill_legacy_stripe_provider_subscriptions('production', true, v_now);
  perform pg_temp.assert_backfill_result(r, 'invalid environment', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, false);
  perform pg_temp.assert_eq_int((select count(*)::integer from billing.provider_subscriptions), 0, 'invalid environment writes no provider rows');
  perform pg_temp.assert_eq_int((select count(*)::integer from billing.provider_events), 0, 'invalid environment writes no provider events');
end;
$$;

rollback;
