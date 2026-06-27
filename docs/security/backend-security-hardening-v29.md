# Backend Security Hardening v29

Last updated: June 27, 2026

This pass fixes the Critical/High/Medium backend findings from `docs/security/backend-security-audit-v28.md` for Can You Geo / WORLDPRINT account, stats, entitlement, and billing paths.

## What Changed

- Added a tracked Supabase migration:
  - `supabase/migrations/20260627010000_rls_account_security_hardening.sql`
- Added a read-only Supabase verification helper:
  - `supabase/tests/rls_security_checks.sql`
- Hardened billing Edge Function helpers:
  - scoped CORS instead of wildcard browser origins
  - strict checkout JSON request validation
  - oversized request rejection for checkout/webhook payloads
  - configured Pro price allowlisting
- Hardened `stripe-webhook`:
  - rejects unsigned/invalid Stripe signatures
  - records processed Stripe event IDs in `public.stripe_webhook_events`
  - treats duplicate webhook replays as no-ops
  - validates subscription price IDs against configured Pro prices before granting Pro
  - validates invoice success/failure events against the associated subscription price

## Production Database Assumptions

The production database must contain these tables:

- `public.profiles`
- `public.game_runs`
- `public.round_results`
- `public.user_stats`
- `public.entitlements`
- `public.stripe_webhook_events`

RLS must be enabled and forced on all six tables.

Browser permissions:

- `anon`: no table access to account/stat/entitlement/webhook tables.
- `authenticated`: select/insert/update own `profiles`, `game_runs`, `round_results`, and `user_stats`.
- `authenticated`: select own `entitlements` only.
- `authenticated`: no insert/update/delete on `entitlements`.
- `authenticated`: no access to `stripe_webhook_events`.

Trusted server permissions:

- Supabase `service_role` can write `entitlements` and `stripe_webhook_events`.
- Supabase `service_role` is used only inside Edge Functions or manual trusted SQL, never in browser code.

## Remaining Trust Boundary

Signed-in players can still write their own personal run/stat rows from the browser. RLS prevents cross-user writes, but those rows are client-authoritative. Do not use `game_runs`, `round_results`, or `user_stats` for public leaderboards, prizes, anti-cheat claims, or competitive payments until scoring moves server-side.

Pro entitlements are not client-authoritative. The browser reads them only; Stripe webhooks and trusted SQL are the write authorities.

## Deployment Order

1. Apply `supabase/migrations/20260627010000_rls_account_security_hardening.sql`.
2. Run the read-only verification helper in Supabase SQL Editor:

   ```sql
   -- supabase/tests/rls_security_checks.sql
   ```

   The first query should return zero rows. Any returned row is a security finding to investigate.

3. Confirm Edge Function secrets are present by name only:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `STRIPE_PRO_MONTHLY_PRICE_ID`
   - `STRIPE_PRO_YEARLY_PRICE_ID`
   - `NEXT_PUBLIC_SITE_URL`
4. Redeploy the Edge Functions:

   ```bash
   supabase functions deploy stripe-checkout --use-api
   supabase functions deploy stripe-portal --use-api
   supabase functions deploy stripe-webhook --use-api --no-verify-jwt
   ```

5. Confirm `supabase/config.toml` function auth:
   - `stripe-checkout`: JWT protected
   - `stripe-portal`: JWT protected
   - `stripe-webhook`: JWT disabled at Supabase boundary, Stripe signature verified internally

## Stripe Assumptions

Webhook entitlement updates grant Pro only when the subscription has a price ID matching one of:

- `STRIPE_PRO_MONTHLY_PRICE_ID`
- `STRIPE_PRO_YEARLY_PRICE_ID`
- `STRIPE_PRO_PRICE_ID` legacy fallback, if intentionally configured

Unknown active/trialing subscriptions are ignored instead of granting Pro. Payment failure/success invoice events also reconcile through the subscription and require a configured Pro price.

## Production QA Checklist

- Signed-out checkout call returns 401 or a safe sign-in prompt.
- Signed-in Free checkout opens Stripe only when billing mode is intentionally enabled.
- Test checkout with configured monthly/yearly price grants Pro after webhook.
- Active/trialing configured subscription => `plan=pro`.
- Canceled/past_due/unpaid/incomplete configured subscription => Free/non-Pro state according to billing rules.
- Replaying the same Stripe webhook event returns a duplicate no-op.
- A webhook for an unconfigured price does not grant Pro.
- Invalid webhook signature returns 400.
- Browser cannot insert/update/delete `public.entitlements`.
- User A cannot read/write User B `game_runs`, `round_results`, or `user_stats`.
