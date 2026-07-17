-- Stripe webhook service-role RPC bridge.
--
-- This migration exposes one narrow public-schema RPC transport function for
-- Supabase PostgREST while keeping provider billing tables and business logic
-- in the private billing schema. The existing Edge Function calls
-- supabase.rpc("process_stripe_webhook_transition_event", ...), which resolves
-- through the exposed public schema; this bridge delegates atomically to the
-- private billing transition wrapper without adding billing logic.

create or replace function public.process_stripe_webhook_transition_event(
  p_provider_environment text,
  p_provider_event_ref text,
  p_event_type text,
  p_event_subtype text,
  p_event_created_at timestamptz,
  p_user_id uuid,
  p_provider_customer_ref text,
  p_provider_subscription_ref text,
  p_provider_product_ref text,
  p_provider_status text,
  p_current_period_start timestamptz,
  p_current_period_end timestamptz,
  p_cancel_at_period_end boolean,
  p_payload_hash text,
  p_as_of timestamptz default now()
)
returns table (
  result text,
  provider_environment text,
  event_type text,
  event_subtype text,
  processed boolean,
  provider_result text,
  already_processed boolean,
  legacy_fields_updated boolean,
  provider_subscription_changed boolean,
  compatibility_refreshed boolean,
  reconciliation_required boolean,
  stale_event_ignored boolean,
  retryable boolean
)
language sql
volatile
security invoker
set search_path = pg_catalog, public
as $$
  select *
  from billing.process_stripe_webhook_transition_event(
    p_provider_environment,
    p_provider_event_ref,
    p_event_type,
    p_event_subtype,
    p_event_created_at,
    p_user_id,
    p_provider_customer_ref,
    p_provider_subscription_ref,
    p_provider_product_ref,
    p_provider_status,
    p_current_period_start,
    p_current_period_end,
    p_cancel_at_period_end,
    p_payload_hash,
    p_as_of
  );
$$;

comment on function public.process_stripe_webhook_transition_event(text, text, text, text, timestamptz, uuid, text, text, text, text, timestamptz, timestamptz, boolean, text, timestamptz) is
  'Service-role-only public RPC transport bridge for the verified Stripe webhook. Delegates to billing.process_stripe_webhook_transition_event while keeping provider billing logic and data private.';

revoke all on function public.process_stripe_webhook_transition_event(text, text, text, text, timestamptz, uuid, text, text, text, text, timestamptz, timestamptz, boolean, text, timestamptz) from public;
revoke all on function public.process_stripe_webhook_transition_event(text, text, text, text, timestamptz, uuid, text, text, text, text, timestamptz, timestamptz, boolean, text, timestamptz) from anon;
revoke all on function public.process_stripe_webhook_transition_event(text, text, text, text, timestamptz, uuid, text, text, text, text, timestamptz, timestamptz, boolean, text, timestamptz) from authenticated;
grant execute on function public.process_stripe_webhook_transition_event(text, text, text, text, timestamptz, uuid, text, text, text, text, timestamptz, timestamptz, boolean, text, timestamptz) to service_role;
