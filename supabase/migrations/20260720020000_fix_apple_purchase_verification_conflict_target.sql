-- Fix Apple purchase verification transaction-chain upsert name resolution.
--
-- The function returns a column named provider_environment. In PL/pgSQL that
-- output column is also a variable, which makes the transaction-chain
-- ON CONFLICT (provider_environment, original_transaction_id_fingerprint)
-- target ambiguous unless conflict-target names are resolved as table columns.

do $$
declare
  v_function regprocedure := 'billing.process_apple_purchase_verification(text, uuid, text, text, text, text, timestamptz, text, text, text, text, text, text, text, text, uuid, text, boolean, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, boolean, timestamptz)'::regprocedure;
  v_source text;
  v_patched_source text;
begin
  select pg_get_functiondef(v_function)
  into v_source;

  if v_source is null then
    raise exception 'apple_purchase_verification_function_missing';
  end if;

  if position('#variable_conflict use_column' in v_source) = 0 then
    v_patched_source := replace(
      v_source,
      E'AS $function$\ndeclare',
      E'AS $function$\n#variable_conflict use_column\ndeclare'
    );

    if v_patched_source is null or v_patched_source = v_source then
      raise exception 'apple_purchase_verification_variable_conflict_patch_failed';
    end if;

    execute v_patched_source;
  end if;
end $$;

comment on function billing.process_apple_purchase_verification(text, uuid, text, text, text, text, timestamptz, text, text, text, text, text, text, text, text, uuid, text, boolean, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, boolean, timestamptz) is
  'Service-role-only processor for authenticated Apple purchase verification. Binds a verified originalTransactionId chain to one Can You Geo user, stores raw Apple original ids only in a private table, refreshes provider-neutral entitlements, and resolves transaction-chain conflict targets as table columns.';
