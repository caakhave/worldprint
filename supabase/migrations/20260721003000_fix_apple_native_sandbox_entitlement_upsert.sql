-- Fix Apple native sandbox entitlement upsert conflict-target resolution.
--
-- The dual-environment entitlement writer returns a column named user_id.
-- In PL/pgSQL that output column is also a variable, so the native-review
-- branch's ON CONFLICT (user_id) target is ambiguous when the production
-- backend processes an Apple sandbox TestFlight/App Review transaction.
-- Use the table's named primary-key constraint, matching the live
-- public.entitlements branch, and add column conflict resolution as
-- defense in depth for this function body.

do $$
declare
  v_function regprocedure := 'billing.refresh_effective_entitlement_summary(uuid, text, timestamptz)'::regprocedure;
  v_source text;
  v_patched_source text;
begin
  select pg_get_functiondef(v_function)
  into v_source;

  if v_source is null then
    raise exception 'apple_native_sandbox_refresh_function_missing';
  end if;

  v_patched_source := v_source;

  if position('on conflict (user_id) do update' in lower(v_patched_source)) > 0 then
    v_patched_source := regexp_replace(
      v_patched_source,
      'on conflict\s*\(\s*user_id\s*\)\s*do update',
      'on conflict on constraint apple_native_sandbox_entitlements_pkey do update',
      'i'
    );
  end if;

  if position('on conflict on constraint apple_native_sandbox_entitlements_pkey do update' in lower(v_patched_source)) = 0 then
    raise exception 'apple_native_sandbox_entitlement_conflict_target_patch_failed';
  end if;

  if position('#variable_conflict use_column' in v_patched_source) = 0 then
    v_patched_source := replace(
      v_patched_source,
      E'AS $function$\ndeclare',
      E'AS $function$\n#variable_conflict use_column\ndeclare'
    );

    if position('#variable_conflict use_column' in v_patched_source) = 0 then
      raise exception 'apple_native_sandbox_refresh_variable_conflict_patch_failed';
    end if;
  end if;

  if v_patched_source is distinct from v_source then
    execute v_patched_source;
  end if;
end $$;

comment on function billing.refresh_effective_entitlement_summary(uuid, text, timestamptz) is
  'Service-role-only transactional writer that refreshes public.entitlements for live/staging entitlement lanes and writes production Apple sandbox review access only to billing.apple_native_sandbox_entitlements using a named native-review upsert constraint.';
