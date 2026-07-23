-- Fix Google Play purchase-token upsert conflict target ambiguity.
--
-- Production diagnostics proved the token upsert failed with SQLSTATE 42702
-- because the unqualified ON CONFLICT target used provider_environment, which
-- is also an output column of the PL/pgSQL RPC. Attach the existing unique
-- index as a named UNIQUE constraint and target that constraint explicitly.
-- This preserves token ownership isolation, idempotent retry/Restore behavior,
-- and the existing sanitized SQLSTATE/constraint diagnostics.

do $$
declare
  v_function regprocedure :=
    'billing.process_google_play_purchase_verification(text, uuid, text, timestamptz, text, text, text, text, text, text, text, text, text, boolean, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, boolean, timestamptz)'::regprocedure;
  v_constraint_name text := 'google_play_purchase_tokens_fingerprint_uidx';
  v_source text;
  v_patched_source text;
begin
  if to_regclass('billing.google_play_purchase_tokens') is null then
    raise exception 'google_play_purchase_tokens_table_missing';
  end if;

  if not exists (
    select 1
    from pg_constraint c
    where c.conrelid = 'billing.google_play_purchase_tokens'::regclass
      and c.conname = v_constraint_name
      and c.contype = 'u'
  ) then
    if to_regclass('billing.google_play_purchase_tokens_fingerprint_uidx') is not null then
      alter table billing.google_play_purchase_tokens
        add constraint google_play_purchase_tokens_fingerprint_uidx
        unique using index google_play_purchase_tokens_fingerprint_uidx;
    else
      alter table billing.google_play_purchase_tokens
        add constraint google_play_purchase_tokens_fingerprint_uidx
        unique (provider_environment, purchase_token_fingerprint);
    end if;
  end if;

  select pg_get_functiondef(v_function)
  into v_source;

  if v_source is null then
    raise exception 'google_play_purchase_verification_function_missing';
  end if;

  if position('on conflict on constraint google_play_purchase_tokens_fingerprint_uidx do update' in v_source) > 0 then
    return;
  end if;

  if position('on conflict (provider_environment, purchase_token_fingerprint) do update' in v_source) = 0 then
    raise exception 'google_play_purchase_token_upsert_conflict_target_not_found';
  end if;

  v_patched_source := replace(
    v_source,
    'on conflict (provider_environment, purchase_token_fingerprint) do update',
    'on conflict on constraint google_play_purchase_tokens_fingerprint_uidx do update'
  );

  if position('on conflict on constraint google_play_purchase_tokens_fingerprint_uidx do update' in v_patched_source) = 0
    or position('purchase_token_persistence_failed' in v_patched_source) = 0
    or position('get stacked diagnostics v_db_constraint = constraint_name' in lower(v_patched_source)) = 0
    or position('v_last_error_code := v_result || '':sqlstate:''' in v_patched_source) = 0
  then
    raise exception 'google_play_purchase_token_upsert_conflict_target_patch_failed';
  end if;

  execute v_patched_source;
end $$;

comment on constraint google_play_purchase_tokens_fingerprint_uidx on billing.google_play_purchase_tokens is
  'Unique Google Play token fingerprint binding per Play environment. Used as the explicit ON CONFLICT target to avoid PL/pgSQL output-column ambiguity.';

comment on function billing.process_google_play_purchase_verification(text, uuid, text, timestamptz, text, text, text, text, text, text, text, text, text, boolean, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, boolean, timestamptz) is
  'Service-role-only processor for authenticated Google Play purchase verification. Binds a verified token fingerprint to a Supabase user using an explicit token uniqueness constraint, stores the raw token only in a private service table, refreshes public entitlement compatibility state, and records sanitized SQLSTATE/constraint diagnostics for fail-closed provider persistence errors.';
