-- Controlled legacy Stripe provider-subscription backfill runner.
--
-- This migration adds a private service-role-only operational function for
-- converting eligible legacy public.entitlements Stripe rows into
-- billing.provider_subscriptions. It intentionally does not deploy a job,
-- update public.entitlements, insert provider events, change Stripe webhook
-- behavior, or call the compatibility-summary writer.

create or replace function billing.backfill_legacy_stripe_provider_subscriptions(
  p_provider_environment text,
  p_apply boolean default false,
  p_as_of timestamptz default now()
)
returns table (
  provider_environment text,
  dry_run boolean,
  computed_at timestamptz,
  total_rows_scanned integer,
  rows_with_subscription_reference integer,
  clean_candidates integer,
  inserted integer,
  updated integer,
  already_present integer,
  skipped_non_subscription integer,
  requires_reconciliation integer,
  parity_mismatch integer,
  ownership_conflict integer,
  environment_conflict integer,
  stale_source_skipped integer,
  failed integer
)
language plpgsql
volatile
security invoker
set search_path = pg_catalog, billing, public
as $$
declare
  v_environment text := lower(btrim(coalesce(p_provider_environment, '')));
  v_apply boolean := coalesce(p_apply, false);
  v_as_of timestamptz := coalesce(p_as_of, now());
  v_resolver_environment text;
  v_total_rows_scanned integer := 0;
  v_rows_with_subscription_reference integer := 0;
  v_clean_candidates integer := 0;
  v_inserted integer := 0;
  v_updated integer := 0;
  v_already_present integer := 0;
  v_skipped_non_subscription integer := 0;
  v_requires_reconciliation integer := 0;
  v_parity_mismatch integer := 0;
  v_ownership_conflict integer := 0;
  v_environment_conflict integer := 0;
  v_stale_source_skipped integer := 0;
  v_failed integer := 0;
  v_entitlement record;
  v_candidate record;
  v_candidate_observed_at timestamptz;
  v_existing_id uuid;
  v_existing_user_id uuid;
  v_existing_customer_ref text;
  v_existing_product_ref text;
  v_existing_status text;
  v_existing_auto_renews boolean;
  v_existing_cancel_at_period_end boolean;
  v_existing_current_period_end timestamptz;
  v_existing_billing_retry_started_at timestamptz;
  v_existing_expires_at timestamptz;
  v_existing_paused_at timestamptz;
  v_existing_last_verified_at timestamptz;
  v_existing_last_event_at timestamptz;
  v_existing_reconciliation_status text;
  v_existing_created_at timestamptz;
  v_existing_updated_at timestamptz;
  v_existing_timestamp timestamptz;
  v_existing_found boolean;
  v_same_existing boolean;
  v_environment_conflict_found boolean;
  v_before_plan text;
  v_after_plan text;
  v_after_status text;
  v_after_cancel_at_period_end boolean;
  v_after_current_period_end timestamptz;
  v_legacy_plan text;
  v_legacy_status text;
  v_legacy_stripe_status text;
  v_legacy_grants_pro boolean;
  v_expected_plan text;
  v_expected_status text;
  v_parity_passed boolean;
begin
  if v_environment not in ('live', 'test') then
    return query
    select
      v_environment,
      not v_apply,
      v_as_of,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      1;
    return;
  end if;

  v_resolver_environment := case when v_environment = 'live' then 'production' else 'sandbox' end;

  perform pg_advisory_xact_lock(
    hashtextextended('billing.backfill_legacy_stripe_provider_subscriptions:stripe:' || v_environment, 0)
  );

  for v_entitlement in
    select e.*
    from public.entitlements e
    order by e.user_id
  loop
    v_total_rows_scanned := v_total_rows_scanned + 1;

    select *
    into strict v_candidate
    from billing.map_legacy_stripe_entitlement_candidate(
      v_entitlement.user_id,
      v_environment,
      v_entitlement.plan,
      v_entitlement.status,
      v_entitlement.stripe_customer_id,
      v_entitlement.stripe_subscription_id,
      v_entitlement.stripe_price_id,
      v_entitlement.stripe_status,
      v_entitlement.cancel_at_period_end,
      v_entitlement.current_period_end,
      v_entitlement.updated_at,
      v_as_of
    );

    if v_candidate.provider_subscription_ref is not null then
      v_rows_with_subscription_reference := v_rows_with_subscription_reference + 1;
    end if;

    if v_candidate.mapping_reason = 'ignored_free_row' then
      v_skipped_non_subscription := v_skipped_non_subscription + 1;
      continue;
    end if;

    if
      not coalesce(v_candidate.should_insert_candidate, false)
      or coalesce(v_candidate.requires_reconciliation, false)
      or v_candidate.status is null
    then
      v_requires_reconciliation := v_requires_reconciliation + 1;
      continue;
    end if;

    v_clean_candidates := v_clean_candidates + 1;
    v_candidate_observed_at := coalesce(v_candidate.last_event_at, v_candidate.last_verified_at, v_as_of);

    select exists (
      select 1
      from billing.provider_subscriptions existing
      where existing.provider = 'stripe'
        and existing.provider_subscription_ref = v_candidate.provider_subscription_ref
        and existing.environment <> v_environment
        and existing.reconciliation_status <> 'superseded'
    )
    into v_environment_conflict_found;

    if v_environment_conflict_found then
      v_environment_conflict := v_environment_conflict + 1;
      continue;
    end if;

    v_existing_id := null;
    v_existing_user_id := null;
    v_existing_customer_ref := null;
    v_existing_product_ref := null;
    v_existing_status := null;
    v_existing_auto_renews := null;
    v_existing_cancel_at_period_end := null;
    v_existing_current_period_end := null;
    v_existing_billing_retry_started_at := null;
    v_existing_expires_at := null;
    v_existing_paused_at := null;
    v_existing_last_verified_at := null;
    v_existing_last_event_at := null;
    v_existing_reconciliation_status := null;
    v_existing_created_at := null;
    v_existing_updated_at := null;

    if v_apply then
      select
        existing.id,
        existing.user_id,
        existing.provider_customer_ref,
        existing.provider_product_ref,
        existing.status,
        existing.auto_renews,
        existing.cancel_at_period_end,
        existing.current_period_end,
        existing.billing_retry_started_at,
        existing.expires_at,
        existing.paused_at,
        existing.last_verified_at,
        existing.last_event_at,
        existing.reconciliation_status,
        existing.created_at,
        existing.updated_at
      into
        v_existing_id,
        v_existing_user_id,
        v_existing_customer_ref,
        v_existing_product_ref,
        v_existing_status,
        v_existing_auto_renews,
        v_existing_cancel_at_period_end,
        v_existing_current_period_end,
        v_existing_billing_retry_started_at,
        v_existing_expires_at,
        v_existing_paused_at,
        v_existing_last_verified_at,
        v_existing_last_event_at,
        v_existing_reconciliation_status,
        v_existing_created_at,
        v_existing_updated_at
      from billing.provider_subscriptions existing
      where existing.provider = 'stripe'
        and existing.environment = v_environment
        and existing.provider_subscription_ref = v_candidate.provider_subscription_ref
        and existing.reconciliation_status <> 'superseded'
      order by coalesce(existing.last_event_at, existing.last_verified_at, existing.updated_at, existing.created_at) desc,
        existing.updated_at desc,
        existing.created_at desc,
        existing.id desc
      limit 1
      for update;
    else
      select
        existing.id,
        existing.user_id,
        existing.provider_customer_ref,
        existing.provider_product_ref,
        existing.status,
        existing.auto_renews,
        existing.cancel_at_period_end,
        existing.current_period_end,
        existing.billing_retry_started_at,
        existing.expires_at,
        existing.paused_at,
        existing.last_verified_at,
        existing.last_event_at,
        existing.reconciliation_status,
        existing.created_at,
        existing.updated_at
      into
        v_existing_id,
        v_existing_user_id,
        v_existing_customer_ref,
        v_existing_product_ref,
        v_existing_status,
        v_existing_auto_renews,
        v_existing_cancel_at_period_end,
        v_existing_current_period_end,
        v_existing_billing_retry_started_at,
        v_existing_expires_at,
        v_existing_paused_at,
        v_existing_last_verified_at,
        v_existing_last_event_at,
        v_existing_reconciliation_status,
        v_existing_created_at,
        v_existing_updated_at
      from billing.provider_subscriptions existing
      where existing.provider = 'stripe'
        and existing.environment = v_environment
        and existing.provider_subscription_ref = v_candidate.provider_subscription_ref
        and existing.reconciliation_status <> 'superseded'
      order by coalesce(existing.last_event_at, existing.last_verified_at, existing.updated_at, existing.created_at) desc,
        existing.updated_at desc,
        existing.created_at desc,
        existing.id desc
      limit 1;
    end if;

    v_existing_found := v_existing_id is not null;

    if v_existing_found and v_existing_user_id is distinct from v_candidate.user_id then
      v_ownership_conflict := v_ownership_conflict + 1;
      continue;
    end if;

    v_same_existing :=
      v_existing_found
      and v_existing_customer_ref is not distinct from v_candidate.provider_customer_ref
      and v_existing_product_ref is not distinct from v_candidate.provider_product_ref
      and v_existing_status is not distinct from v_candidate.status
      and v_existing_auto_renews is not distinct from v_candidate.auto_renews
      and v_existing_cancel_at_period_end is not distinct from v_candidate.cancel_at_period_end
      and v_existing_current_period_end is not distinct from v_candidate.current_period_end
      and v_existing_billing_retry_started_at is not distinct from v_candidate.billing_retry_started_at
      and v_existing_expires_at is not distinct from v_candidate.expires_at
      and v_existing_paused_at is not distinct from v_candidate.paused_at
      and v_existing_last_verified_at is not distinct from v_candidate.last_verified_at
      and v_existing_last_event_at is not distinct from v_candidate.last_event_at
      and v_existing_reconciliation_status is not distinct from v_candidate.reconciliation_status;

    if v_same_existing then
      v_already_present := v_already_present + 1;
      continue;
    end if;

    if v_existing_found then
      v_existing_timestamp := coalesce(
        v_existing_last_event_at,
        v_existing_last_verified_at,
        v_existing_updated_at,
        v_existing_created_at
      );

      if v_candidate_observed_at < v_existing_timestamp then
        v_stale_source_skipped := v_stale_source_skipped + 1;
        continue;
      end if;
    end if;

    if not v_apply then
      if v_existing_found then
        v_updated := v_updated + 1;
      else
        v_inserted := v_inserted + 1;
      end if;
      continue;
    end if;

    begin
      select projection.plan
      into strict v_before_plan
      from billing.project_effective_entitlement_summary(v_candidate.user_id, v_resolver_environment, v_as_of) projection;

      if v_existing_found then
        update billing.provider_subscriptions
        set provider_customer_ref = v_candidate.provider_customer_ref,
            provider_product_ref = v_candidate.provider_product_ref,
            status = v_candidate.status,
            auto_renews = v_candidate.auto_renews,
            cancel_at_period_end = v_candidate.cancel_at_period_end,
            current_period_end = v_candidate.current_period_end,
            billing_retry_started_at = v_candidate.billing_retry_started_at,
            expires_at = v_candidate.expires_at,
            paused_at = v_candidate.paused_at,
            last_verified_at = v_candidate.last_verified_at,
            last_event_at = v_candidate.last_event_at,
            reconciliation_status = v_candidate.reconciliation_status,
            updated_at = v_candidate_observed_at
        where id = v_existing_id;
      else
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
        values (
          v_candidate.user_id,
          v_candidate.provider,
          v_candidate.environment,
          v_candidate.product_tier,
          v_candidate.provider_customer_ref,
          v_candidate.provider_subscription_ref,
          v_candidate.provider_product_ref,
          v_candidate.status,
          v_candidate.auto_renews,
          v_candidate.cancel_at_period_end,
          v_candidate.current_period_end,
          v_candidate.billing_retry_started_at,
          v_candidate.expires_at,
          v_candidate.paused_at,
          v_candidate.last_verified_at,
          v_candidate.last_event_at,
          v_candidate.reconciliation_status,
          v_candidate_observed_at,
          v_candidate_observed_at
        );
      end if;

      select
        projection.plan,
        projection.status,
        projection.cancel_at_period_end,
        projection.current_period_end
      into strict
        v_after_plan,
        v_after_status,
        v_after_cancel_at_period_end,
        v_after_current_period_end
      from billing.project_effective_entitlement_summary(v_candidate.user_id, v_resolver_environment, v_as_of) projection;

      v_legacy_plan := lower(btrim(coalesce(v_entitlement.plan, '')));
      v_legacy_status := lower(btrim(coalesce(v_entitlement.status, '')));
      v_legacy_stripe_status := lower(btrim(coalesce(nullif(v_entitlement.stripe_status, ''), nullif(v_entitlement.status, ''), '')));
      v_legacy_grants_pro := v_legacy_plan in ('pro', 'paid', 'admin') and v_legacy_status in ('active', 'trialing');
      v_expected_plan := case when v_legacy_grants_pro then 'pro' else 'free' end;
      v_expected_status := case
        when v_legacy_grants_pro then 'active'
        when v_legacy_stripe_status = 'past_due' or v_legacy_status = 'past_due' then 'past_due'
        when v_legacy_stripe_status in ('canceled', 'cancelled', 'deleted', 'incomplete', 'incomplete_expired', 'unpaid', 'paused')
          or v_legacy_status = 'canceled'
          then 'canceled'
        else 'free'
      end;

      v_parity_passed := case
        when v_before_plan = 'pro' then v_after_plan = 'pro'
        when v_legacy_grants_pro then
          v_after_plan = v_expected_plan
          and v_after_status = v_expected_status
          and v_after_cancel_at_period_end is not distinct from v_candidate.cancel_at_period_end
          and v_after_current_period_end is not distinct from v_candidate.current_period_end
        else
          v_after_plan = v_expected_plan
          and v_after_status = v_expected_status
      end;

      if not v_parity_passed then
        raise exception using
          errcode = 'P0001',
          message = 'billing_backfill_parity_mismatch';
      end if;

      if v_existing_found then
        v_updated := v_updated + 1;
      else
        v_inserted := v_inserted + 1;
      end if;
    exception
      when others then
        if sqlerrm = 'billing_backfill_parity_mismatch' then
          v_parity_mismatch := v_parity_mismatch + 1;
        else
          v_failed := v_failed + 1;
        end if;
    end;
  end loop;

  return query
  select
    v_environment,
    not v_apply,
    v_as_of,
    v_total_rows_scanned,
    v_rows_with_subscription_reference,
    v_clean_candidates,
    v_inserted,
    v_updated,
    v_already_present,
    v_skipped_non_subscription,
    v_requires_reconciliation,
    v_parity_mismatch,
    v_ownership_conflict,
    v_environment_conflict,
    v_stale_source_skipped,
    v_failed;
end;
$$;

comment on function billing.backfill_legacy_stripe_provider_subscriptions(text, boolean, timestamptz) is
  'Service-role-only controlled legacy Stripe entitlement backfill runner. Dry-run returns sanitized aggregate classifications only; apply writes eligible Stripe provider_subscriptions without modifying public.entitlements or provider_events.';

revoke all on function billing.backfill_legacy_stripe_provider_subscriptions(text, boolean, timestamptz) from public;
revoke all on function billing.backfill_legacy_stripe_provider_subscriptions(text, boolean, timestamptz) from anon;
revoke all on function billing.backfill_legacy_stripe_provider_subscriptions(text, boolean, timestamptz) from authenticated;
grant execute on function billing.backfill_legacy_stripe_provider_subscriptions(text, boolean, timestamptz) to service_role;
