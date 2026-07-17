-- Provider-neutral entitlement resolver future-period-start fix.
--
-- Staging had already applied the original resolver migration before Stripe
-- Test Clock recovery exposed that active/current provider rows can carry a
-- current_period_start ahead of the application wall clock. This forward
-- migration redefines the resolver without downgrading an authoritative
-- active/current provider solely because of that future period start.
--
-- It intentionally does not write public.entitlements, backfill Stripe,
-- dual-write provider state, reconcile users, or change webhook replay state.

create or replace function billing.resolve_effective_entitlement(
  p_user_id uuid,
  p_environment text,
  p_as_of timestamptz default now()
)
returns table (
  user_id uuid,
  environment text,
  effective_plan text,
  effective_access_status text,
  grants_pro boolean,
  active_provider_count integer,
  active_providers text[],
  management_provider text,
  multiple_active_providers boolean,
  effective_period_end timestamptz,
  cancel_at_period_end boolean,
  grace_period_end timestamptz,
  requires_reconciliation boolean,
  computed_at timestamptz,
  decision_reason text
)
language sql
stable
security invoker
set search_path = pg_catalog, billing, public
as $$
with requested as (
  select
    p_user_id as user_id,
    lower(btrim(p_environment)) as environment,
    p_as_of as as_of,
    p_user_id is not null as has_user_id,
    lower(btrim(p_environment)) in ('production', 'sandbox') as has_known_environment
),
matched as (
  select
    ps.*,
    coalesce(
      ps.provider_original_transaction_ref,
      ps.provider_subscription_ref,
      ps.provider_transaction_ref,
      ps.provider_customer_ref,
      ps.id::text
    ) as provider_chain_key,
    coalesce(ps.last_event_at, ps.last_verified_at, ps.updated_at, ps.created_at) as ordering_timestamp
  from billing.provider_subscriptions ps
  cross join requested r
  where r.has_user_id
    and r.has_known_environment
    and ps.user_id = r.user_id
    and ps.reconciliation_status <> 'superseded'
    and (
      (
        r.environment = 'production'
        and (
          (ps.provider = 'stripe' and ps.environment = 'live')
          or (ps.provider = 'apple' and ps.environment = 'production')
          or (ps.provider = 'google_play' and ps.environment = 'production')
        )
      )
      or (
        r.environment = 'sandbox'
        and (
          (ps.provider = 'stripe' and ps.environment = 'test')
          or (ps.provider = 'apple' and ps.environment = 'sandbox')
          or (ps.provider = 'google_play' and ps.environment = 'test')
        )
      )
    )
),
ranked as (
  select
    m.*,
    row_number() over (
      partition by m.provider, m.environment, m.provider_chain_key
      order by
        m.ordering_timestamp desc nulls last,
        m.updated_at desc,
        m.created_at desc,
        m.id desc
    ) as provider_chain_rank,
    count(*) over (partition by m.provider, m.environment, m.provider_chain_key) as provider_chain_row_count
  from matched m
),
current_records as (
  select *
  from ranked
  where provider_chain_rank = 1
),
evaluated_base as (
  select
    cr.*,
    case
      when cr.status = 'active'
        and cr.current_period_end is not null
        and (select as_of from requested) < cr.current_period_end
        then true
      when cr.status = 'cancelled_active_until_period_end'
        and cr.current_period_end is not null
        and (select as_of from requested) < cr.current_period_end
        then true
      when cr.status = 'grace_period'
        and cr.grace_period_ends_at is not null
        and (select as_of from requested) < cr.grace_period_ends_at
        then true
      else false
    end as grants_pro,
    case
      when cr.status in ('active', 'cancelled_active_until_period_end') then cr.current_period_end
      when cr.status = 'grace_period' then cr.grace_period_ends_at
      else null::timestamptz
    end as access_until,
    case
      when cr.reconciliation_status <> 'current' then true
      when cr.provider_chain_row_count > 1 then true
      when cr.status in ('pending', 'billing_retry', 'unknown_needs_reconciliation', 'grace_period') then true
      when cr.status = 'active'
        and (
          cr.current_period_end is null
          or ((select as_of from requested) >= cr.current_period_end)
          or (cr.last_verified_at is null and cr.last_event_at is null)
        )
        then true
      when cr.status = 'cancelled_active_until_period_end'
        and (
          cr.current_period_end is null
          or ((select as_of from requested) >= cr.current_period_end)
          or (cr.last_verified_at is null and cr.last_event_at is null)
        )
        then true
      when cr.status = 'grace_period'
        and (
          cr.grace_period_ends_at is null
          or ((select as_of from requested) >= cr.grace_period_ends_at)
          or (cr.last_verified_at is null and cr.last_event_at is null)
        )
        then true
      when cr.status = 'billing_retry' and cr.billing_retry_started_at is null then true
      when cr.status = 'pending' and coalesce(cr.started_at, cr.last_event_at) is null then true
      when cr.status = 'expired' and coalesce(cr.expires_at, cr.current_period_end) is null then true
      when cr.status = 'revoked' and cr.revoked_at is null then true
      when cr.status = 'refunded' and cr.refunded_at is null then true
      when cr.status = 'paused' and cr.paused_at is null then true
      else false
    end as record_requires_reconciliation
  from current_records cr
),
evaluated as (
  select
    eb.*,
    count(*) filter (where eb.grants_pro) over (partition by eb.provider) as granting_rows_for_provider
  from evaluated_base eb
),
aggregate_result as (
  select
    r.user_id,
    r.environment,
    r.as_of,
    r.has_user_id,
    r.has_known_environment,
    count(e.id)::integer as provider_record_count,
    count(distinct e.provider) filter (where e.grants_pro)::integer as active_provider_count,
    coalesce(
      array_agg(distinct e.provider order by e.provider) filter (where e.grants_pro),
      array[]::text[]
    ) as active_providers,
    coalesce(bool_or(e.grants_pro), false) as grants_pro,
    coalesce(bool_or(e.record_requires_reconciliation), false) as matched_requires_reconciliation,
    coalesce(bool_or(e.grants_pro and e.status = 'active'), false) as has_active_grant,
    coalesce(bool_or(e.grants_pro and e.status = 'grace_period'), false) as has_grace_grant,
    coalesce(
      bool_or(
        e.grants_pro
        and (e.status = 'cancelled_active_until_period_end' or e.cancel_at_period_end is true)
      ),
      false
    ) as has_cancelled_grant,
    coalesce(bool_or(e.grants_pro and e.granting_rows_for_provider > 1), false) as has_same_provider_duplicate_grants,
    max(e.access_until) filter (where e.grants_pro) as effective_period_end,
    max(e.grace_period_ends_at) filter (where e.grants_pro and e.status = 'grace_period') as grace_period_end
  from requested r
  left join evaluated e on true
  group by r.user_id, r.environment, r.as_of, r.has_user_id, r.has_known_environment
)
select
  ar.user_id,
  ar.environment,
  case when ar.grants_pro then 'pro' else 'free' end as effective_plan,
  case
    when not ar.has_user_id then 'unknown_needs_reconciliation'
    when not ar.has_known_environment then 'unknown_needs_reconciliation'
    when ar.grants_pro and ar.has_active_grant then 'active'
    when ar.grants_pro and ar.has_grace_grant then 'grace_period'
    when ar.grants_pro and ar.has_cancelled_grant then 'cancelled_active_until_period_end'
    when ar.matched_requires_reconciliation then 'unknown_needs_reconciliation'
    else 'free'
  end as effective_access_status,
  ar.grants_pro,
  ar.active_provider_count,
  ar.active_providers,
  case
    when ar.active_provider_count = 0 then 'none'
    when ar.active_provider_count > 1 then 'multiple'
    else ar.active_providers[1]
  end as management_provider,
  ar.active_provider_count > 1 as multiple_active_providers,
  ar.effective_period_end,
  ar.has_cancelled_grant as cancel_at_period_end,
  ar.grace_period_end,
  (
    (not ar.has_user_id)
    or (not ar.has_known_environment)
    or ar.matched_requires_reconciliation
    or ar.has_same_provider_duplicate_grants
  ) as requires_reconciliation,
  ar.as_of as computed_at,
  case
    when not ar.has_user_id then 'invalid_user'
    when not ar.has_known_environment then 'invalid_environment'
    when ar.grants_pro and ar.active_provider_count > 1 then 'pro_multiple_providers'
    when ar.grants_pro and ar.has_active_grant then 'pro_active_provider'
    when ar.grants_pro and ar.has_grace_grant then 'pro_grace_period'
    when ar.grants_pro and ar.has_cancelled_grant then 'pro_cancelled_active_until_period_end'
    when ar.provider_record_count = 0 then 'free_no_provider_records'
    when ar.matched_requires_reconciliation then 'free_requires_reconciliation'
    else 'free_no_active_provider'
  end as decision_reason
from aggregate_result ar;
$$;

comment on function billing.resolve_effective_entitlement(uuid, text, timestamptz) is
  'Side-effect-free service-only resolver that computes normalized effective Pro access from private provider subscription rows.';

revoke all on function billing.resolve_effective_entitlement(uuid, text, timestamptz) from public;
revoke all on function billing.resolve_effective_entitlement(uuid, text, timestamptz) from anon;
revoke all on function billing.resolve_effective_entitlement(uuid, text, timestamptz) from authenticated;
grant execute on function billing.resolve_effective_entitlement(uuid, text, timestamptz) to service_role;
