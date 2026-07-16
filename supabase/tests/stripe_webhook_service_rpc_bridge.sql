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

create function pg_temp.call_public_bridge(
  p_label text,
  p_user_id uuid,
  p_environment text default 'test',
  p_subscription_ref text default null,
  p_status text default 'active',
  p_event_at timestamptz default '2026-07-16 12:00:00+00'::timestamptz,
  p_period_end timestamptz default '2026-08-16 12:00:00+00'::timestamptz
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
  from public.process_stripe_webhook_transition_event(
    p_environment,
    'evt_bridge_fixture_' || p_label,
    'customer.subscription.updated',
    'monthly',
    p_event_at,
    p_user_id,
    'cus_bridge_fixture_' || p_label,
    coalesce(p_subscription_ref, 'sub_bridge_fixture_' || p_label),
    'price_bridge_fixture_' || p_label,
    p_status,
    '2026-07-16 00:00:00+00'::timestamptz,
    p_period_end,
    false,
    encode(digest('evt_bridge_fixture_' || p_label, 'sha256'), 'hex'),
    p_event_at
  );
end;
$$;

create function pg_temp.raise_bridge_summary_failure()
returns trigger
language plpgsql
as $$
begin
  if new.user_id = '00000000-0000-0000-0000-000000056501'::uuid then
    raise exception 'fixture_bridge_summary_failure';
  end if;
  return new;
end;
$$;

do $$
declare
  r record;
  v_user uuid := '00000000-0000-0000-0000-000000056001'::uuid;
  v_invalid_user uuid := '00000000-0000-0000-0000-000000056002'::uuid;
  v_failure_user uuid := '00000000-0000-0000-0000-000000056501'::uuid;
  v_signature text :=
    'public.process_stripe_webhook_transition_event(text,text,text,text,timestamp with time zone,uuid,text,text,text,text,timestamp with time zone,timestamp with time zone,boolean,text,timestamp with time zone)';
  v_output_names text[];
begin
  perform pg_temp.add_profile(v_user);
  perform pg_temp.add_profile(v_invalid_user);
  perform pg_temp.add_profile(v_failure_user);

  select * into strict r
  from pg_temp.call_public_bridge('invalid_environment', v_invalid_user, 'invalid_environment_probe');
  perform pg_temp.assert_eq_text(r.result, 'invalid_environment', 'invalid environment reaches bridge without writes');
  perform pg_temp.assert_false(r.processed, 'invalid environment is not processed');
  perform pg_temp.assert_eq_int(
    (select count(*)::integer from billing.provider_events pe where pe.provider_event_ref = 'evt_bridge_fixture_invalid_environment'),
    0,
    'invalid environment writes no provider event'
  );
  perform pg_temp.assert_eq_int(
    (select count(*)::integer from billing.provider_subscriptions ps where ps.provider_subscription_ref = 'sub_bridge_fixture_invalid_environment'),
    0,
    'invalid environment writes no provider subscription'
  );
  perform pg_temp.assert_false(
    exists (select 1 from public.entitlements e where e.user_id = v_invalid_user),
    'invalid environment writes no entitlement'
  );
  perform pg_temp.assert_eq_int((select count(*)::integer from public.stripe_webhook_events), 0, 'bridge writes no legacy webhook ledger');

  select * into strict r
  from pg_temp.call_public_bridge('metadata_update', v_user);
  perform pg_temp.assert_eq_text(r.result, 'processed', 'metadata-equivalent event processed through bridge');
  perform pg_temp.assert_true(r.processed, 'bridge result processed');
  perform pg_temp.assert_true(r.provider_subscription_changed, 'bridge changes provider subscription');
  perform pg_temp.assert_true(r.compatibility_refreshed, 'bridge refreshes compatibility');
  perform pg_temp.assert_true(r.legacy_fields_updated, 'bridge preserves legacy fields');
  perform pg_temp.assert_false(r.reconciliation_required, 'bridge does not require reconciliation for active synthetic event');
  perform pg_temp.assert_eq_int(
    (select count(*)::integer from billing.provider_events pe where pe.provider_event_ref = 'evt_bridge_fixture_metadata_update'),
    1,
    'bridge writes one provider event'
  );
  perform pg_temp.assert_eq_int(
    (select count(*)::integer from billing.provider_subscriptions ps where ps.provider_subscription_ref = 'sub_bridge_fixture_metadata_update'),
    1,
    'bridge writes one provider subscription'
  );
  perform pg_temp.assert_true(
    exists (
      select 1
      from public.entitlements e
      where e.user_id = v_user
        and e.plan = 'pro'
        and e.status = 'active'
        and e.stripe_customer_id = 'cus_bridge_fixture_metadata_update'
        and e.stripe_subscription_id = 'sub_bridge_fixture_metadata_update'
        and e.stripe_price_id = 'price_bridge_fixture_metadata_update'
        and e.stripe_status = 'active'
    ),
    'bridge preserves compatibility and legacy Stripe fields'
  );

  select * into strict r
  from pg_temp.call_public_bridge('metadata_update', v_user);
  perform pg_temp.assert_eq_text(r.result, 'already_processed', 'duplicate event reports already processed');
  perform pg_temp.assert_true(r.already_processed, 'duplicate event flags already processed');
  perform pg_temp.assert_eq_int(
    (select count(*)::integer from billing.provider_events pe where pe.provider_event_ref = 'evt_bridge_fixture_metadata_update'),
    1,
    'duplicate event creates no second provider event'
  );
  perform pg_temp.assert_eq_int(
    (select count(*)::integer from billing.provider_subscriptions ps where ps.provider_subscription_ref = 'sub_bridge_fixture_metadata_update'),
    1,
    'duplicate event creates no second provider subscription'
  );
  perform pg_temp.assert_true(
    exists (select 1 from public.entitlements e where e.user_id = v_user and e.plan = 'pro' and e.status = 'active'),
    'duplicate event keeps compatibility access stable'
  );

  create trigger fixture_bridge_summary_failure
    before insert or update on public.entitlements
    for each row
    execute function pg_temp.raise_bridge_summary_failure();

  select * into strict r
  from pg_temp.call_public_bridge('summary_failure', v_failure_user);
  perform pg_temp.assert_eq_text(r.result, 'summary_refresh_failed', 'bridge surfaces summary failure');
  perform pg_temp.assert_true(r.retryable, 'summary failure is retryable');
  perform pg_temp.assert_false(
    exists (select 1 from billing.provider_subscriptions ps where ps.provider_subscription_ref = 'sub_bridge_fixture_summary_failure'),
    'summary failure rolls back provider subscription'
  );
  perform pg_temp.assert_false(
    exists (select 1 from billing.provider_events pe where pe.provider_event_ref = 'evt_bridge_fixture_summary_failure'),
    'summary failure rolls back provider event'
  );
  perform pg_temp.assert_false(
    exists (select 1 from public.entitlements e where e.user_id = v_failure_user),
    'summary failure rolls back entitlement'
  );

  drop trigger fixture_bridge_summary_failure on public.entitlements;

  perform pg_temp.assert_false(has_function_privilege('public', v_signature, 'execute'), 'public cannot execute bridge');
  perform pg_temp.assert_false(has_function_privilege('anon', v_signature, 'execute'), 'anon cannot execute bridge');
  perform pg_temp.assert_false(has_function_privilege('authenticated', v_signature, 'execute'), 'authenticated cannot execute bridge');
  perform pg_temp.assert_true(has_function_privilege('service_role', v_signature, 'execute'), 'service_role can execute bridge');

  select array_agg(arg_name order by ordinality)
  into v_output_names
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  cross join lateral unnest(p.proargnames, p.proargmodes) with ordinality as a(arg_name, arg_mode, ordinality)
  where n.nspname = 'public'
    and p.proname = 'process_stripe_webhook_transition_event'
    and a.arg_mode = 't';

  perform pg_temp.assert_false(v_output_names && array[
    'user_id',
    'customer_id',
    'subscription_id',
    'price_id',
    'payload_hash',
    'email',
    'error',
    'payload'
  ], 'bridge result excludes identifiers, payload hashes, raw errors, and payloads');
end;
$$;

rollback;
