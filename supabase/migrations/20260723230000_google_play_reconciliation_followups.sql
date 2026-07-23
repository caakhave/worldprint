-- Resolve Google Play RTDN-first and stale acknowledgement follow-ups.
--
-- Google Play can deliver a SUBSCRIPTION_PURCHASED RTDN before the app's
-- authenticated purchase verification has durably bound the purchase-token
-- fingerprint to a Can You Geo account. The RTDN processor must fail closed in
-- that moment, but once purchase verification proves ownership, the earlier
-- unbound event can be safely terminalized without replaying stale subscription
-- state or rewriting entitlements.

create or replace function billing.repair_google_play_unbound_rtdn_after_purchase_verification(
  p_provider_environment text,
  p_user_id uuid,
  p_purchase_token_fingerprint text,
  p_as_of timestamptz default now()
)
returns integer
language plpgsql
volatile
security invoker
set search_path = pg_catalog, billing, public
as $$
declare
  v_environment text := lower(btrim(coalesce(p_provider_environment, '')));
  v_user_id uuid := p_user_id;
  v_token_ref text := nullif(btrim(coalesce(p_purchase_token_fingerprint, '')), '');
  v_as_of timestamptz := coalesce(p_as_of, now());
  v_provider_subscription_id uuid;
  v_repaired_count integer := 0;
begin
  if v_environment not in ('test', 'production')
    or v_user_id is null
    or v_token_ref !~ '^sha256_[a-f0-9]{64}$'
  then
    return 0;
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('billing.repair_google_play_unbound_rtdn:google_play:' || v_environment || ':' || v_token_ref, 0)
  );

  select ps.id
  into v_provider_subscription_id
  from billing.google_play_purchase_tokens gt
  join billing.provider_subscriptions ps on ps.id = gt.provider_subscription_id
  where gt.provider_environment = v_environment
    and gt.purchase_token_fingerprint = v_token_ref
    and gt.user_id = v_user_id
    and ps.provider = 'google_play'
    and ps.environment = v_environment
    and ps.user_id = v_user_id
    and ps.provider_subscription_ref = v_token_ref
    and ps.reconciliation_status <> 'superseded'
  order by
    coalesce(ps.last_verified_at, ps.last_event_at, ps.updated_at, ps.created_at) desc nulls last,
    ps.updated_at desc,
    ps.id desc
  limit 1;

  if v_provider_subscription_id is null then
    return 0;
  end if;

  update billing.provider_events pe
  set processing_status = 'processed',
      processed_at = v_as_of,
      related_user_id = v_user_id,
      provider_subscription_id = v_provider_subscription_id,
      last_error_code = null,
      reconciliation_required = false,
      updated_at = v_as_of
  where pe.provider = 'google_play'
    and pe.environment = v_environment
    and pe.event_type = 'subscription_notification'
    and pe.processing_status = 'reconciliation_required'
    and pe.last_error_code = 'unbound_purchase_token'
    and pe.reconciliation_required is true
    and pe.provider_subscription_id is null
    and pe.provider_subscription_ref = v_token_ref
    and pe.payload_hash is not null
    and (pe.related_user_id is null or pe.related_user_id = v_user_id);

  get diagnostics v_repaired_count = row_count;
  return v_repaired_count;
end;
$$;

comment on function billing.repair_google_play_unbound_rtdn_after_purchase_verification(text, uuid, text, timestamptz) is
  'Service-role-only repair for Google Play RTDN notification-first races after authenticated purchase verification binds the same purchase-token fingerprint to the same user. Does not replay stale RTDN state, acknowledge purchases, or rewrite entitlements.';

revoke all on function billing.repair_google_play_unbound_rtdn_after_purchase_verification(text, uuid, text, timestamptz) from public;
revoke all on function billing.repair_google_play_unbound_rtdn_after_purchase_verification(text, uuid, text, timestamptz) from anon;
revoke all on function billing.repair_google_play_unbound_rtdn_after_purchase_verification(text, uuid, text, timestamptz) from authenticated;
grant execute on function billing.repair_google_play_unbound_rtdn_after_purchase_verification(text, uuid, text, timestamptz) to service_role;

create or replace function billing.reconcile_google_play_unbound_rtdn_events(
  p_provider_environment text,
  p_limit integer default 100,
  p_as_of timestamptz default now()
)
returns table (
  eligible_count integer,
  repaired_count integer
)
language plpgsql
volatile
security invoker
set search_path = pg_catalog, billing, public
as $$
declare
  v_environment text := lower(btrim(coalesce(p_provider_environment, '')));
  v_limit integer := greatest(0, least(coalesce(p_limit, 100), 1000));
  v_as_of timestamptz := coalesce(p_as_of, now());
  v_eligible_count integer := 0;
  v_repaired_count integer := 0;
  v_row record;
begin
  if v_environment not in ('test', 'production') or v_limit = 0 then
    return query select 0::integer, 0::integer;
    return;
  end if;

  select count(distinct (gt.provider_environment, gt.purchase_token_fingerprint, gt.user_id))::integer
  into v_eligible_count
  from billing.provider_events pe
  join billing.google_play_purchase_tokens gt
    on gt.provider_environment = pe.environment
   and gt.purchase_token_fingerprint = pe.provider_subscription_ref
  join billing.provider_subscriptions ps on ps.id = gt.provider_subscription_id
  where pe.provider = 'google_play'
    and pe.environment = v_environment
    and pe.event_type = 'subscription_notification'
    and pe.processing_status = 'reconciliation_required'
    and pe.last_error_code = 'unbound_purchase_token'
    and pe.reconciliation_required is true
    and pe.provider_subscription_id is null
    and pe.provider_subscription_ref ~ '^sha256_[a-f0-9]{64}$'
    and pe.payload_hash is not null
    and (pe.related_user_id is null or pe.related_user_id = gt.user_id)
    and gt.user_id is not null
    and gt.provider_subscription_id is not null
    and ps.provider = 'google_play'
    and ps.environment = v_environment
    and ps.user_id = gt.user_id
    and ps.provider_subscription_ref = gt.purchase_token_fingerprint
    and ps.reconciliation_status <> 'superseded';

  for v_row in
    select
      gt.provider_environment,
      gt.purchase_token_fingerprint,
      gt.user_id,
      min(pe.received_at) as first_received_at
    from billing.provider_events pe
    join billing.google_play_purchase_tokens gt
      on gt.provider_environment = pe.environment
     and gt.purchase_token_fingerprint = pe.provider_subscription_ref
    join billing.provider_subscriptions ps on ps.id = gt.provider_subscription_id
    where pe.provider = 'google_play'
      and pe.environment = v_environment
      and pe.event_type = 'subscription_notification'
      and pe.processing_status = 'reconciliation_required'
      and pe.last_error_code = 'unbound_purchase_token'
      and pe.reconciliation_required is true
      and pe.provider_subscription_id is null
      and pe.provider_subscription_ref ~ '^sha256_[a-f0-9]{64}$'
      and pe.payload_hash is not null
      and (pe.related_user_id is null or pe.related_user_id = gt.user_id)
      and gt.user_id is not null
      and gt.provider_subscription_id is not null
      and ps.provider = 'google_play'
      and ps.environment = v_environment
      and ps.user_id = gt.user_id
      and ps.provider_subscription_ref = gt.purchase_token_fingerprint
      and ps.reconciliation_status <> 'superseded'
    group by gt.provider_environment, gt.purchase_token_fingerprint, gt.user_id
    order by min(pe.received_at)
    limit v_limit
  loop
    v_repaired_count := v_repaired_count + billing.repair_google_play_unbound_rtdn_after_purchase_verification(
      v_row.provider_environment,
      v_row.user_id,
      v_row.purchase_token_fingerprint,
      v_as_of
    );
  end loop;

  return query select v_eligible_count, v_repaired_count;
end;
$$;

comment on function billing.reconcile_google_play_unbound_rtdn_events(text, integer, timestamptz) is
  'Service-role-only bounded reconciliation helper that terminalizes Google Play RTDN events parked as unbound_purchase_token after later verified token ownership exists. Does not acknowledge purchases or rewrite entitlements.';

revoke all on function billing.reconcile_google_play_unbound_rtdn_events(text, integer, timestamptz) from public;
revoke all on function billing.reconcile_google_play_unbound_rtdn_events(text, integer, timestamptz) from anon;
revoke all on function billing.reconcile_google_play_unbound_rtdn_events(text, integer, timestamptz) from authenticated;
grant execute on function billing.reconcile_google_play_unbound_rtdn_events(text, integer, timestamptz) to service_role;

do $$
declare
  v_function regprocedure :=
    'billing.process_google_play_purchase_verification(text, uuid, text, timestamptz, text, text, text, text, text, text, text, text, text, boolean, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, boolean, timestamptz)'::regprocedure;
  v_source text;
  v_patched_source text;
begin
  select pg_get_functiondef(v_function)
  into v_source;

  if v_source is null then
    raise exception 'google_play_purchase_verification_function_missing';
  end if;

  if position('repair_google_play_unbound_rtdn_after_purchase_verification' in v_source) > 0 then
    return;
  end if;

  if position('v_ack_required := coalesce(v_ack_required, false);' in v_source) = 0
    or position('return query' in v_source) = 0
    or position('case when v_status = ''unknown_needs_reconciliation'' then ''requires_reconciliation'' else ''processed'' end,' in v_source) = 0
  then
    raise exception 'google_play_purchase_reconciliation_repair_patch_anchor_missing';
  end if;

  v_patched_source := replace(
    v_source,
    E'      v_ack_required := coalesce(v_ack_required, false);\n\n      return query',
    E'      v_ack_required := coalesce(v_ack_required, false);\n\n      if not coalesce(v_event.reconciliation_required, false) then\n        perform billing.repair_google_play_unbound_rtdn_after_purchase_verification(\n          v_environment,\n          v_user_id,\n          v_token_ref,\n          v_as_of\n        );\n      end if;\n\n      return query'
  );

  v_patched_source := replace(
    v_patched_source,
    E'  return query\n  select\n    case when v_status = ''unknown_needs_reconciliation'' then ''requires_reconciliation'' else ''processed'' end,',
    E'  if v_status <> ''unknown_needs_reconciliation'' then\n    perform billing.repair_google_play_unbound_rtdn_after_purchase_verification(\n      v_environment,\n      v_user_id,\n      v_token_ref,\n      v_as_of\n    );\n  end if;\n\n  return query\n  select\n    case when v_status = ''unknown_needs_reconciliation'' then ''requires_reconciliation'' else ''processed'' end,'
  );

  if v_patched_source = v_source
    or position('repair_google_play_unbound_rtdn_after_purchase_verification' in v_patched_source) = 0
    or position('if not coalesce(v_event.reconciliation_required, false) then' in v_patched_source) = 0
    or position('if v_status <> ''unknown_needs_reconciliation'' then' in v_patched_source) = 0
    or position('on conflict on constraint google_play_purchase_tokens_fingerprint_uidx do update' in lower(v_patched_source)) = 0
    or position('gt.user_id is distinct from v_user_id' in v_patched_source) = 0
    or position('purchase_token_persistence_failed' in v_patched_source) = 0
  then
    raise exception 'google_play_purchase_reconciliation_repair_patch_failed';
  end if;

  execute v_patched_source;
end $$;

comment on function billing.process_google_play_purchase_verification(text, uuid, text, timestamptz, text, text, text, text, text, text, text, text, text, boolean, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, boolean, timestamptz) is
  'Service-role-only processor for authenticated Google Play purchase verification. Binds a verified token fingerprint to one Supabase user, rejects cross-account idempotent retries, stores the raw token only in a private service table, permits acknowledgement retry after durable persistence, refreshes public entitlement compatibility state, repairs matching unbound RTDN notification-first races without replaying stale state, and records sanitized SQLSTATE/constraint diagnostics for fail-closed provider persistence errors.';
