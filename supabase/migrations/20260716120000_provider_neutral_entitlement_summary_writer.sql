-- Provider-neutral entitlement summary writer.
--
-- This migration adds a private transactional writer that projects durable
-- provider state into the current public.entitlements compatibility row. It
-- does not add triggers, event completion, Stripe dual-write, Apple/Google
-- verification, analytics, or application runtime changes.

create or replace function billing.refresh_effective_entitlement_summary(
  p_user_id uuid,
  p_environment text,
  p_as_of timestamptz default now()
)
returns table (
  user_id uuid,
  environment text,
  plan text,
  status text,
  cancel_at_period_end boolean,
  current_period_end timestamptz,
  computed_at timestamptz,
  updated_at timestamptz,
  management_provider text,
  multiple_active_providers boolean,
  requires_reconciliation boolean,
  decision_reason text,
  write_action text,
  applied boolean,
  error_code text
)
language plpgsql
volatile
security invoker
set search_path = pg_catalog, billing, public
as $$
declare
  v_environment text := lower(btrim(coalesce(p_environment, '')));
  v_as_of timestamptz := coalesce(p_as_of, now());
  v_projection record;
  v_row_exists boolean := false;
  v_user_exists boolean := false;
  v_updated_at timestamptz;
begin
  if p_user_id is null then
    return query
    select
      null::uuid,
      v_environment,
      null::text,
      null::text,
      null::boolean,
      null::timestamptz,
      v_as_of,
      null::timestamptz,
      null::text,
      null::boolean,
      null::boolean,
      null::text,
      'skipped'::text,
      false,
      'invalid_user'::text;
    return;
  end if;

  if v_environment not in ('production', 'sandbox') then
    return query
    select
      p_user_id,
      v_environment,
      null::text,
      null::text,
      null::boolean,
      null::timestamptz,
      v_as_of,
      null::timestamptz,
      null::text,
      null::boolean,
      null::boolean,
      null::text,
      'skipped'::text,
      false,
      'invalid_environment'::text;
    return;
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('billing.refresh_effective_entitlement_summary:' || p_user_id::text, 0)
  );

  select exists (
    select 1
    from public.profiles p
    where p.id = p_user_id
  )
  into v_user_exists;

  if not v_user_exists then
    return query
    select
      p_user_id,
      v_environment,
      null::text,
      null::text,
      null::boolean,
      null::timestamptz,
      v_as_of,
      null::timestamptz,
      null::text,
      null::boolean,
      null::boolean,
      null::text,
      'skipped'::text,
      false,
      'user_not_found'::text;
    return;
  end if;

  select exists (
    select 1
    from public.entitlements e
    where e.user_id = p_user_id
  )
  into v_row_exists;

  if v_row_exists then
    perform 1
    from public.entitlements e
    where e.user_id = p_user_id
    for update;
  end if;

  select *
  into strict v_projection
  from billing.project_effective_entitlement_summary(p_user_id, v_environment, v_as_of);

  insert into public.entitlements (
    user_id,
    plan,
    status,
    cancel_at_period_end,
    current_period_end,
    updated_at
  )
  values (
    p_user_id,
    v_projection.plan,
    v_projection.status,
    v_projection.cancel_at_period_end,
    v_projection.current_period_end,
    v_as_of
  )
  on conflict on constraint entitlements_pkey do update
    set plan = excluded.plan,
        status = excluded.status,
        cancel_at_period_end = excluded.cancel_at_period_end,
        current_period_end = excluded.current_period_end,
        updated_at = excluded.updated_at
  returning public.entitlements.updated_at
  into v_updated_at;

  return query
  select
    p_user_id,
    v_environment,
    v_projection.plan::text,
    v_projection.status::text,
    v_projection.cancel_at_period_end::boolean,
    v_projection.current_period_end::timestamptz,
    v_projection.computed_at::timestamptz,
    v_updated_at,
    v_projection.management_provider::text,
    v_projection.multiple_active_providers::boolean,
    v_projection.requires_reconciliation::boolean,
    v_projection.decision_reason::text,
    case when v_row_exists then 'updated' else 'inserted' end,
    true,
    null::text;
end;
$$;

comment on function billing.refresh_effective_entitlement_summary(uuid, text, timestamptz) is
  'Service-role-only transactional writer that refreshes public.entitlements compatibility fields from provider-neutral billing state while preserving legacy Stripe columns.';

revoke all on function billing.refresh_effective_entitlement_summary(uuid, text, timestamptz) from public;
revoke all on function billing.refresh_effective_entitlement_summary(uuid, text, timestamptz) from anon;
revoke all on function billing.refresh_effective_entitlement_summary(uuid, text, timestamptz) from authenticated;
grant execute on function billing.refresh_effective_entitlement_summary(uuid, text, timestamptz) to service_role;
