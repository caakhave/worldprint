-- Provider-neutral entitlement compatibility projection and Stripe dry-run mapper.
--
-- This migration adds private, side-effect-free helpers for future operator
-- backfill / dual-write validation. It intentionally does not write
-- public.entitlements, insert provider records, change Stripe webhook runtime
-- behavior, or expose provider identifiers through the app-facing projection.

create or replace function billing.project_effective_entitlement_summary(
  p_user_id uuid,
  p_environment text,
  p_as_of timestamptz default now()
)
returns table (
  user_id uuid,
  plan text,
  status text,
  cancel_at_period_end boolean,
  current_period_end timestamptz,
  computed_at timestamptz,
  management_provider text,
  multiple_active_providers boolean,
  requires_reconciliation boolean,
  decision_reason text
)
language sql
stable
security invoker
set search_path = pg_catalog, billing, public
as $$
with resolved as (
  select *
  from billing.resolve_effective_entitlement(p_user_id, p_environment, p_as_of)
),
provider_context as (
  select
    count(*)::integer as provider_record_count,
    coalesce(bool_or(ps.status = 'billing_retry'), false) as has_billing_retry
  from billing.provider_subscriptions ps
  cross join resolved r
  where p_user_id is not null
    and ps.user_id = p_user_id
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
)
select
  resolved.user_id,
  case when resolved.grants_pro then 'pro' else 'free' end as plan,
  case
    when resolved.grants_pro then 'active'
    when provider_context.provider_record_count = 0 then 'free'
    when provider_context.has_billing_retry then 'past_due'
    else 'canceled'
  end as status,
  resolved.cancel_at_period_end,
  resolved.effective_period_end as current_period_end,
  resolved.computed_at,
  resolved.management_provider,
  resolved.multiple_active_providers,
  resolved.requires_reconciliation,
  case
    when resolved.decision_reason = 'free_no_provider_records' then 'compat_free_no_provider_records'
    when resolved.grants_pro and resolved.multiple_active_providers then 'compat_pro_multiple_providers'
    when resolved.grants_pro and resolved.effective_access_status = 'grace_period' then 'compat_pro_grace_period'
    when resolved.grants_pro and resolved.effective_access_status = 'cancelled_active_until_period_end'
      then 'compat_pro_cancelled_active_until_period_end'
    when resolved.grants_pro then 'compat_pro_active_provider'
    when resolved.requires_reconciliation then 'compat_free_requires_reconciliation'
    else 'compat_free_inactive_provider'
  end as decision_reason
from resolved
cross join provider_context;
$$;

comment on function billing.project_effective_entitlement_summary(uuid, text, timestamptz) is
  'Side-effect-free service-only projection of the provider-neutral resolver into current public.entitlements app-facing semantics.';

revoke all on function billing.project_effective_entitlement_summary(uuid, text, timestamptz) from public;
revoke all on function billing.project_effective_entitlement_summary(uuid, text, timestamptz) from anon;
revoke all on function billing.project_effective_entitlement_summary(uuid, text, timestamptz) from authenticated;
grant execute on function billing.project_effective_entitlement_summary(uuid, text, timestamptz) to service_role;

create or replace function billing.map_legacy_stripe_entitlement_candidate(
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
  p_as_of timestamptz default now()
)
returns table (
  user_id uuid,
  provider text,
  environment text,
  product_tier text,
  provider_customer_ref text,
  provider_subscription_ref text,
  provider_product_ref text,
  status text,
  auto_renews boolean,
  cancel_at_period_end boolean,
  current_period_end timestamptz,
  billing_retry_started_at timestamptz,
  expires_at timestamptz,
  paused_at timestamptz,
  last_verified_at timestamptz,
  last_event_at timestamptz,
  reconciliation_status text,
  should_insert_candidate boolean,
  requires_reconciliation boolean,
  mapping_reason text
)
language sql
stable
security invoker
set search_path = pg_catalog, billing, public
as $$
with normalized as (
  select
    p_user_id as user_id,
    lower(btrim(p_environment)) as environment,
    lower(btrim(coalesce(p_plan, ''))) as legacy_plan,
    lower(btrim(coalesce(p_status, ''))) as legacy_status,
    nullif(btrim(p_stripe_customer_id), '') as provider_customer_ref,
    nullif(btrim(p_stripe_subscription_id), '') as provider_subscription_ref,
    nullif(btrim(p_stripe_price_id), '') as provider_product_ref,
    lower(btrim(coalesce(nullif(p_stripe_status, ''), nullif(p_status, ''), ''))) as stripe_status,
    coalesce(p_cancel_at_period_end, false) as cancel_at_period_end,
    p_current_period_end as current_period_end,
    coalesce(p_updated_at, p_as_of) as observed_at,
    p_as_of as as_of
),
classified as (
  select
    n.*,
    n.environment in ('live', 'test') as has_valid_environment,
    n.user_id is not null as has_user_id,
    n.provider_subscription_ref is not null as has_subscription_ref,
    n.provider_product_ref is not null as has_product_ref,
    (
      n.provider_customer_ref is null
      and n.provider_subscription_ref is null
      and n.provider_product_ref is null
      and n.legacy_plan = 'free'
      and n.legacy_status = 'free'
      and n.stripe_status in ('', 'free')
    ) as is_free_without_provider_refs
  from normalized n
),
mapped as (
  select
    c.*,
    case
      when not c.has_valid_environment then 'unknown_needs_reconciliation'
      when c.is_free_without_provider_refs then null::text
      when not c.has_subscription_ref then 'unknown_needs_reconciliation'
      when not c.has_product_ref then 'unknown_needs_reconciliation'
      when c.stripe_status in ('active', 'trialing')
        and c.current_period_end is not null
        and c.current_period_end > c.as_of
        and c.cancel_at_period_end
        then 'cancelled_active_until_period_end'
      when c.stripe_status in ('active', 'trialing')
        and c.current_period_end is not null
        and c.current_period_end > c.as_of
        then 'active'
      when c.stripe_status in ('active', 'trialing')
        and c.current_period_end is not null
        and c.current_period_end <= c.as_of
        then 'unknown_needs_reconciliation'
      when c.stripe_status in ('active', 'trialing') then 'unknown_needs_reconciliation'
      when c.stripe_status = 'past_due' then 'billing_retry'
      when c.stripe_status = 'incomplete' then 'pending'
      when c.stripe_status in ('canceled', 'cancelled', 'deleted', 'incomplete_expired', 'unpaid') then 'expired'
      when c.stripe_status = 'paused' then 'paused'
      else 'unknown_needs_reconciliation'
    end as canonical_status,
    case
      when not c.has_valid_environment then 'invalid_environment'
      when c.is_free_without_provider_refs then 'ignored_free_row'
      when not c.has_subscription_ref then 'missing_subscription_ref'
      when not c.has_product_ref then 'missing_product_ref'
      when c.stripe_status in ('active', 'trialing') and c.current_period_end is null then 'active_missing_period_end'
      when c.stripe_status in ('active', 'trialing') and c.current_period_end <= c.as_of then 'active_period_ended_requires_reconciliation'
      when c.stripe_status = 'active' and c.cancel_at_period_end then 'stripe_cancelled_active_until_period_end'
      when c.stripe_status = 'trialing' and c.cancel_at_period_end then 'stripe_trial_cancelled_active_until_period_end'
      when c.stripe_status = 'active' then 'stripe_active'
      when c.stripe_status = 'trialing' then 'stripe_trialing'
      when c.stripe_status = 'past_due' then 'stripe_billing_retry'
      when c.stripe_status = 'incomplete' then 'stripe_pending'
      when c.stripe_status in ('canceled', 'cancelled', 'deleted', 'incomplete_expired') then 'stripe_expired'
      when c.stripe_status = 'unpaid' then 'stripe_unpaid_legacy_canceled'
      when c.stripe_status = 'paused' then 'stripe_paused'
      else 'stripe_unknown_status'
    end as mapping_reason
  from classified c
),
candidate as (
  select
    m.*,
    (
      m.has_valid_environment
      and m.has_user_id
      and m.has_subscription_ref
      and m.has_product_ref
      and not m.is_free_without_provider_refs
    ) as should_insert_candidate,
    (
      m.canonical_status in ('billing_retry', 'pending', 'paused', 'unknown_needs_reconciliation')
      or m.mapping_reason in (
        'invalid_environment',
        'missing_subscription_ref',
        'missing_product_ref',
        'active_missing_period_end',
        'active_period_ended_requires_reconciliation',
        'stripe_unknown_status'
      )
    ) as requires_reconciliation
  from mapped m
)
select
  candidate.user_id,
  'stripe'::text as provider,
  candidate.environment,
  'pro'::text as product_tier,
  candidate.provider_customer_ref,
  candidate.provider_subscription_ref,
  candidate.provider_product_ref,
  candidate.canonical_status as status,
  case
    when candidate.canonical_status = 'active' then true
    when candidate.canonical_status = 'cancelled_active_until_period_end' then false
    else null::boolean
  end as auto_renews,
  case when candidate.canonical_status = 'cancelled_active_until_period_end' then true else false end as cancel_at_period_end,
  case
    when candidate.canonical_status in ('active', 'cancelled_active_until_period_end', 'billing_retry') then candidate.current_period_end
    else null::timestamptz
  end as current_period_end,
  case when candidate.canonical_status = 'billing_retry' then candidate.observed_at else null::timestamptz end as billing_retry_started_at,
  case when candidate.canonical_status = 'expired' then coalesce(candidate.current_period_end, candidate.observed_at) else null::timestamptz end as expires_at,
  case when candidate.canonical_status = 'paused' then candidate.observed_at else null::timestamptz end as paused_at,
  case when candidate.canonical_status in ('active', 'cancelled_active_until_period_end', 'expired') then candidate.observed_at else null::timestamptz end as last_verified_at,
  candidate.observed_at as last_event_at,
  case when candidate.requires_reconciliation then 'needs_verification' else 'current' end as reconciliation_status,
  candidate.should_insert_candidate,
  candidate.requires_reconciliation,
  candidate.mapping_reason
from candidate;
$$;

comment on function billing.map_legacy_stripe_entitlement_candidate(uuid, text, text, text, text, text, text, text, boolean, timestamptz, timestamptz, timestamptz) is
  'Side-effect-free service-only dry-run mapper from one legacy public.entitlements Stripe row to a normalized Stripe provider subscription candidate.';

revoke all on function billing.map_legacy_stripe_entitlement_candidate(uuid, text, text, text, text, text, text, text, boolean, timestamptz, timestamptz, timestamptz) from public;
revoke all on function billing.map_legacy_stripe_entitlement_candidate(uuid, text, text, text, text, text, text, text, boolean, timestamptz, timestamptz, timestamptz) from anon;
revoke all on function billing.map_legacy_stripe_entitlement_candidate(uuid, text, text, text, text, text, text, text, boolean, timestamptz, timestamptz, timestamptz) from authenticated;
grant execute on function billing.map_legacy_stripe_entitlement_candidate(uuid, text, text, text, text, text, text, text, boolean, timestamptz, timestamptz, timestamptz) to service_role;
