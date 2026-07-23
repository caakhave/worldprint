-- Harden Google Play purchase verification idempotency.
--
-- A processed purchase_verification event is keyed by the verified token
-- fingerprint and normalized payload. Idempotent retries must still fail
-- closed for a different signed-in Can You Geo account, and they must allow
-- a safe acknowledgement retry when durable persistence succeeded but Google
-- acknowledgement did not.

do $$
declare
  v_function regprocedure :=
    'billing.process_google_play_purchase_verification(text, uuid, text, timestamptz, text, text, text, text, text, text, text, text, text, boolean, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, boolean, timestamptz)'::regprocedure;
  v_source text;
  v_patched_source text;
  v_old_block text := $old$
    if v_event.processing_status in ('processed', 'reconciliation_required') and v_event.processed_at is not null then
      return query
      select
        'already_processed'::text,
        v_environment,
        'purchase_verification'::text,
        null::text,
        false,
        true,
        false,
        false,
        false,
        coalesce(v_event.reconciliation_required, false),
        false;
      return;
    end if;
$old$;
  v_new_block text := $new$
    if v_event.processing_status in ('processed', 'reconciliation_required') and v_event.processed_at is not null then
      if v_event.related_user_id is not null and v_event.related_user_id is distinct from v_user_id then
        return query
        select 'ownership_conflict'::text, v_environment, 'purchase_verification'::text, null::text, false, false, false, false, false, true, false;
        return;
      end if;

      if exists (
        select 1
        from billing.google_play_purchase_tokens gt
        where gt.provider_environment = v_environment
          and gt.purchase_token_fingerprint = v_token_ref
          and gt.user_id is not null
          and gt.user_id is distinct from v_user_id
      ) then
        return query
        select 'ownership_conflict'::text, v_environment, 'purchase_verification'::text, null::text, false, false, false, false, false, true, false;
        return;
      end if;

      select coalesce(
        gt.acknowledgement_state = 'ACKNOWLEDGEMENT_STATE_PENDING'
          and v_acknowledgement_state = 'ACKNOWLEDGEMENT_STATE_PENDING'
          and ps.status in ('active', 'cancelled_active_until_period_end', 'grace_period'),
        false
      )
      into v_ack_required
      from billing.google_play_purchase_tokens gt
      join billing.provider_subscriptions ps on ps.id = gt.provider_subscription_id
      where gt.provider_environment = v_environment
        and gt.purchase_token_fingerprint = v_token_ref
        and gt.user_id = v_user_id;

      v_ack_required := coalesce(v_ack_required, false);

      return query
      select
        'already_processed'::text,
        v_environment,
        'purchase_verification'::text,
        null::text,
        false,
        true,
        false,
        false,
        v_ack_required,
        coalesce(v_event.reconciliation_required, false),
        false;
      return;
    end if;
$new$;
begin
  select pg_get_functiondef(v_function)
  into v_source;

  if v_source is null then
    raise exception 'google_play_purchase_verification_function_missing';
  end if;

  if position('v_ack_required := coalesce(v_ack_required, false);' in v_source) > 0
    and position('gt.user_id is distinct from v_user_id' in v_source) > 0
  then
    return;
  end if;

  if position(v_old_block in v_source) = 0 then
    raise exception 'google_play_purchase_idempotent_owner_ack_block_not_found';
  end if;

  v_patched_source := replace(v_source, v_old_block, v_new_block);

  if position('gt.user_id is distinct from v_user_id' in v_patched_source) = 0
    or position('v_ack_required := coalesce(v_ack_required, false);' in v_patched_source) = 0
    or position('on conflict on constraint google_play_purchase_tokens_fingerprint_uidx do update' in lower(v_patched_source)) = 0
    or position('purchase_token_persistence_failed' in v_patched_source) = 0
  then
    raise exception 'google_play_purchase_idempotent_owner_ack_patch_failed';
  end if;

  execute v_patched_source;
end $$;

comment on function billing.process_google_play_purchase_verification(text, uuid, text, timestamptz, text, text, text, text, text, text, text, text, text, boolean, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, boolean, timestamptz) is
  'Service-role-only processor for authenticated Google Play purchase verification. Binds a verified token fingerprint to one Supabase user, rejects cross-account idempotent retries, stores the raw token only in a private service table, permits acknowledgement retry after durable persistence, refreshes public entitlement compatibility state, and records sanitized SQLSTATE/constraint diagnostics for fail-closed provider persistence errors.';

do $$
declare
  v_function regprocedure :=
    'billing.record_google_play_purchase_acknowledgement(text, text, timestamptz)'::regprocedure;
  v_source text;
  v_patched_source text;
  v_old_block text := $old$
  update billing.google_play_purchase_tokens
  set acknowledgement_state = 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED',
      acknowledged_at = v_acknowledged_at,
      updated_at = v_acknowledged_at
  where provider_environment = v_environment
    and purchase_token_fingerprint = v_token_ref;
$old$;
  v_new_block text := $new$
  update billing.google_play_purchase_tokens as gt
  set acknowledgement_state = 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED',
      acknowledged_at = v_acknowledged_at,
      updated_at = v_acknowledged_at
  where gt.provider_environment = v_environment
    and gt.purchase_token_fingerprint = v_token_ref;
$new$;
begin
  select pg_get_functiondef(v_function)
  into v_source;

  if v_source is null then
    raise exception 'google_play_acknowledgement_function_missing';
  end if;

  if position('update billing.google_play_purchase_tokens as gt' in v_source) > 0
    and position('gt.provider_environment = v_environment' in v_source) > 0
  then
    return;
  end if;

  if position(v_old_block in v_source) = 0 then
    raise exception 'google_play_acknowledgement_update_block_not_found';
  end if;

  v_patched_source := replace(v_source, v_old_block, v_new_block);

  if position('update billing.google_play_purchase_tokens as gt' in v_patched_source) = 0
    or position('gt.provider_environment = v_environment' in v_patched_source) = 0
  then
    raise exception 'google_play_acknowledgement_update_patch_failed';
  end if;

  execute v_patched_source;
end $$;

comment on function billing.record_google_play_purchase_acknowledgement(text, text, timestamptz) is
  'Service-role-only acknowledgement marker for already-verified Google Play subscriptions. Accepts token fingerprints only and qualifies token-table columns to avoid PL/pgSQL result-column ambiguity.';
