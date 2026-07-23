-- Preserve the Google Play purchase-verification fail-closed behavior while
-- replacing the catch-all "failed" result with a durable, sanitized stage.
-- This makes the next production retry distinguish provider/token persistence
-- from entitlement projection without exposing purchase tokens or identities.

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

  v_patched_source := v_source;

  if position('v_failure_result text' in lower(v_patched_source)) = 0 then
    v_patched_source := replace(
      v_patched_source,
      E'  v_ack_required boolean := false;\n  v_result text := ''failed'';',
      E'  v_ack_required boolean := false;\n  v_result text := ''failed'';\n  v_failure_result text := ''provider_subscription_persistence_failed'';'
    );
  end if;

  if position('v_failure_result := ''entitlement_persistence_failed'';' in lower(v_patched_source)) = 0 then
    v_patched_source := replace(
      v_patched_source,
      E'    v_summary_refresh_started := true;\n\n    select *',
      E'    v_failure_result := ''entitlement_persistence_failed'';\n    v_summary_refresh_started := true;\n\n    select *'
    );
  end if;

  v_patched_source := replace(
    v_patched_source,
    E'      v_result := case when v_summary_refresh_started then ''summary_refresh_failed'' else ''failed'' end;',
    E'      v_result := case when v_summary_refresh_started then ''entitlement_persistence_failed'' else v_failure_result end;'
  );

  if position('provider_subscription_persistence_failed' in v_patched_source) = 0
    or position('entitlement_persistence_failed' in v_patched_source) = 0
  then
    raise exception 'google_play_purchase_verification_diagnostics_patch_failed';
  end if;

  if v_patched_source is distinct from v_source then
    execute v_patched_source;
  end if;
end $$;

comment on function billing.process_google_play_purchase_verification(text, uuid, text, timestamptz, text, text, text, text, text, text, text, text, text, boolean, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, boolean, timestamptz) is
  'Service-role-only processor for authenticated Google Play purchase verification. Binds a verified token fingerprint to a Supabase user, stores the raw token only in a private service table, refreshes public entitlement compatibility state, and returns sanitized stage-aware processing metadata.';
