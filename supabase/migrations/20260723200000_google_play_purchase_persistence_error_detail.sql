-- Refine Google Play purchase-verification persistence diagnostics.
--
-- The prior diagnostic migration correctly proved that real production
-- purchase verification reaches the private database transition, but the
-- inner write block still grouped provider-subscription, purchase-token, and
-- linked-token failures under one result. This patch keeps the fail-closed
-- behavior and records only sanitized statement class plus SQLSTATE/constraint
-- in billing.provider_events.last_error_code. Raw row values, purchase tokens,
-- and Postgres DETAIL text are intentionally not persisted.

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

  if position('purchase_token_persistence_failed' in v_source) > 0
    and position('get stacked diagnostics v_db_constraint = constraint_name' in lower(v_source)) > 0
  then
    return;
  end if;

  v_patched_source := v_source;

  v_patched_source := replace(
    v_patched_source,
    E'  v_failure_result text := ''provider_subscription_persistence_failed'';',
    E'  v_failure_result text := ''provider_subscription_write_failed'';\n  v_db_sqlstate text;\n  v_db_constraint text;\n  v_last_error_code text;'
  );

  v_patched_source := replace(
    v_patched_source,
    E'    insert into billing.google_play_purchase_tokens (',
    E'    v_failure_result := ''purchase_token_persistence_failed'';\n\n    insert into billing.google_play_purchase_tokens ('
  );

  v_patched_source := replace(
    v_patched_source,
    E'    if v_linked_token_ref is not null then\n      update billing.provider_subscriptions',
    E'    v_failure_result := ''linked_subscription_supersede_failed'';\n\n    if v_linked_token_ref is not null then\n      update billing.provider_subscriptions'
  );

  v_patched_source := replace(
    v_patched_source,
    E'      v_result := case when v_summary_refresh_started then ''entitlement_persistence_failed'' else v_failure_result end;\n\n      update billing.provider_events\n      set processing_status = ''retry_pending'',\n          last_error_code = v_result,',
    E'      get stacked diagnostics v_db_constraint = constraint_name;\n      v_db_sqlstate := SQLSTATE;\n      v_result := case when v_summary_refresh_started then ''entitlement_persistence_failed'' else v_failure_result end;\n      v_last_error_code := v_result || '':sqlstate:'' || coalesce(nullif(v_db_sqlstate, ''''), ''unknown'');\n      if nullif(v_db_constraint, '''') is not null and v_db_constraint ~ ''^[a-zA-Z0-9_]+$'' then\n        v_last_error_code := v_last_error_code || '':constraint:'' || v_db_constraint;\n      end if;\n\n      update billing.provider_events\n      set processing_status = ''retry_pending'',\n          last_error_code = v_last_error_code,'
  );

  if position('provider_subscription_write_failed' in v_patched_source) = 0
    or position('purchase_token_persistence_failed' in v_patched_source) = 0
    or position('linked_subscription_supersede_failed' in v_patched_source) = 0
    or position('get stacked diagnostics v_db_constraint = constraint_name' in lower(v_patched_source)) = 0
    or position('v_last_error_code := v_result || '':sqlstate:''' in v_patched_source) = 0
  then
    raise exception 'google_play_purchase_persistence_error_detail_patch_failed';
  end if;

  if v_patched_source is distinct from v_source then
    execute v_patched_source;
  end if;
end $$;

comment on function billing.process_google_play_purchase_verification(text, uuid, text, timestamptz, text, text, text, text, text, text, text, text, text, boolean, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, boolean, timestamptz) is
  'Service-role-only processor for authenticated Google Play purchase verification. Binds a verified token fingerprint to a Supabase user, stores the raw token only in a private service table, refreshes public entitlement compatibility state, and records sanitized SQLSTATE/constraint diagnostics for fail-closed provider persistence errors.';
