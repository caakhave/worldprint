# Stripe Billing v1

Can You Geo? keeps the public app statically exported. Stripe secrets therefore do not live in Next.js pages or browser code. Billing runs through Supabase Edge Functions:

- `stripe-checkout` - creates subscription Checkout Sessions for signed-in players.
- `stripe-portal` - creates Billing Portal sessions for signed-in players with a Stripe customer.
- `stripe-webhook` - verifies Stripe webhook signatures and updates Supabase `entitlements`.

The current architecture decision and test-mode launch checklist are documented in `docs/BILLING_ARCHITECTURE.md`.

## Required Env Vars

Use the Supabase project root URL only. For the current project, use
`https://jquebthneczqdxagagof.supabase.co`, not `https://jquebthneczqdxagagof.supabase.co/rest/v1` or
`https://jquebthneczqdxagagof.supabase.co/auth/v1`.

Hosted Supabase Edge Functions expose these reserved values from the platform:

```bash
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Do not set `SUPABASE_URL`, `SUPABASE_ANON_KEY`, or `SUPABASE_SERVICE_ROLE_KEY` with `supabase secrets set` for hosted functions; the CLI treats `SUPABASE_` names as reserved. Local function runs may still need equivalent local env values.

Set these Edge Function secrets:

```bash
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRO_MONTHLY_PRICE_ID=
STRIPE_PRO_YEARLY_PRICE_ID=
# Optional local/dev fallback for older setups:
STRIPE_PRO_PRICE_ID=
NEXT_PUBLIC_SITE_URL=
```

For production Supabase Edge Functions, set:

```bash
NEXT_PUBLIC_SITE_URL=https://canyougeo.com
```

The hosted billing functions reject `localhost` return URLs when `SUPABASE_URL` points at a deployed Supabase project. Local development may still use `http://localhost:3000` only with a local Supabase URL such as `http://127.0.0.1:54321`.

The static Next app still needs:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_BILLING_MODE=disabled
```

Use `NEXT_PUBLIC_BILLING_MODE=test` only for intentional Stripe test-mode QA. Keep it `disabled` for regular production deploys until live billing is approved. The current app intentionally does not enable checkout for `NEXT_PUBLIC_BILLING_MODE=live`.

Never expose `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, or `SUPABASE_SERVICE_ROLE_KEY` to browser code.

## Create Product And Price

1. In Stripe Dashboard, create a product named `Can You Geo? Pro`.
2. Add two recurring subscription prices:
   - Monthly: `$3.99/month`
   - Yearly: `$29.99/year`
3. Copy both price ids, for example `price_...`.
4. Set `STRIPE_PRO_MONTHLY_PRICE_ID` and `STRIPE_PRO_YEARLY_PRICE_ID` in Supabase Edge Function secrets.
5. Keep `STRIPE_PRO_PRICE_ID` only as an optional fallback for local/dev compatibility. If only the fallback exists, both checkout buttons can point at the same fallback subscription price.

Checkout Sessions intentionally disable Stripe adaptive pricing. The public product copy promises `$3.99/month` and `$29.99/year`, so Checkout should display those USD amounts instead of localizing the recurring price on a player's machine.

## Apply Supabase SQL

Run the full production spine SQL for a fresh project:

```sql
-- docs/supabase/production_spine_v0.sql
```

For an existing project that already has the production spine tables but is missing Stripe billing fields, apply:

```sql
-- supabase/migrations/20260627000000_billing_test_mode_entitlements.sql
```

Before deploying hardened billing functions, also apply:

```sql
-- supabase/migrations/20260627010000_rls_account_security_hardening.sql
```

The `entitlements` table stores:

- `plan`
- `status`
- `stripe_customer_id`
- `stripe_subscription_id`
- `stripe_price_id`
- `stripe_status`
- `cancel_at_period_end`
- `current_period_end`
- `updated_at`

Browser clients can read their own entitlement row through RLS. They cannot grant themselves Pro.

Those migrations are idempotent, add the Stripe fields and indexes, enable/force RLS, grant authenticated read access for own rows, grant service-role write access, and do not create browser write policies.

## Deploy Functions

From the repo root:

```bash
supabase functions deploy stripe-checkout
supabase functions deploy stripe-portal
supabase functions deploy stripe-webhook --no-verify-jwt
```

If Docker is not running locally, use Supabase server-side bundling:

```bash
supabase functions deploy stripe-checkout --use-api
supabase functions deploy stripe-portal --use-api
supabase functions deploy stripe-webhook --use-api --no-verify-jwt
```

If `--use-api` reports a missing Supabase CLI profile, rerun `supabase login` or set `SUPABASE_ACCESS_TOKEN` locally and run `supabase login --token "$SUPABASE_ACCESS_TOKEN"`. Do not commit the access token.

Deployed function URL pattern:

```text
https://<project-ref>.supabase.co/functions/v1/stripe-checkout
https://<project-ref>.supabase.co/functions/v1/stripe-portal
https://<project-ref>.supabase.co/functions/v1/stripe-webhook
```

The app calls `stripe-checkout` and `stripe-portal` through the authenticated Supabase Functions client. Stripe should send webhook events to the `stripe-webhook` URL.

Set secrets for hosted Edge Functions:

```bash
supabase secrets set \
  STRIPE_SECRET_KEY=... \
  STRIPE_WEBHOOK_SECRET=... \
  STRIPE_PRO_MONTHLY_PRICE_ID=... \
  STRIPE_PRO_YEARLY_PRICE_ID=... \
  STRIPE_PRO_PRICE_ID=... \
  NEXT_PUBLIC_SITE_URL=https://canyougeo.com
```

Use `SUPABASE_ACCESS_TOKEN` only for CLI authentication if the local Supabase profile/keychain flow is unavailable. Do not set it as an Edge Function secret.

## Local Webhook Testing

Use the Stripe CLI:

```bash
stripe listen --forward-to http://127.0.0.1:54321/functions/v1/stripe-webhook
```

Copy the `whsec_...` value into:

```bash
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

Trigger test events:

```bash
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
stripe trigger invoice.payment_failed
stripe trigger invoice.payment_succeeded
```

For a full local upgrade test:

1. Start Supabase locally.
2. Serve the static app or Next dev app with Supabase public env vars.
3. Create or sign in to a Supabase email/password account.
4. Open `/upgrade`.
5. Click `Upgrade to Pro`.
6. Complete monthly or yearly Checkout with Stripe test card `4242 4242 4242 4242`.
7. Confirm the webhook writes `entitlements.plan = 'pro'` and `status = 'active'`.
8. Use the successful Checkout test card `4242 4242 4242 4242` with any future date and any three-digit CVC. Do not use real card details.

## Cancellation, Past Due, Resubscribe

- Cancel subscription in Stripe Dashboard or Billing Portal. If Stripe keeps the subscription `active` with `cancel_at_period_end`, Can You Geo? keeps Pro until Stripe reaches the period end and emits the canceled/deleted subscription state. Immediate cancellation writes `plan = 'free'`, `status = 'canceled'`.
- Simulate payment failure with Stripe test cards or `stripe trigger invoice.payment_failed`. The webhook writes `plan = 'free'`, `status = 'past_due'`.
- Simulate payment success/recovery with `invoice.payment_succeeded` on the QA subscription. The webhook reconciles the subscription and writes active/trialing subscriptions back to Pro.
- Resubscribe through Checkout. Subscription `active` or `trialing` writes `plan = 'pro'`.

The webhook also ignores inactive events for an older subscription if the same user already has a newer active/trialing Stripe subscription recorded. Subscription create/update/delete events are reconciled against Stripe's current subscription record before the entitlement row is written whenever Stripe can be reached.

Security hardening notes:

- Replayed Stripe webhook event IDs are recorded in `stripe_webhook_events` and return duplicate no-ops.
- Pro grants require a subscription price matching `STRIPE_PRO_MONTHLY_PRICE_ID`, `STRIPE_PRO_YEARLY_PRICE_ID`, or the legacy fallback `STRIPE_PRO_PRICE_ID`.
- Active/trialing subscriptions with unconfigured prices are ignored and do not grant Pro.

## Manual Pro Testing

Manual SQL Pro testing is still useful before Stripe is configured, but Stripe Billing v1 replaces it for real subscriptions.

```sql
insert into public.entitlements (user_id, plan, status)
values ('USER_UUID_HERE', 'pro', 'active')
on conflict (user_id) do update
set plan = excluded.plan,
    status = excluded.status,
    updated_at = now();
```

Use manual SQL only from trusted Supabase admin contexts.

## Deployment Caveat

The public app can remain a static export. Billing cannot. The three Supabase Edge Functions are the required server boundary for Stripe secrets, Checkout creation, Billing Portal creation, and webhook verification.

## QA v1 Local Results

Date: 2026-06-24.

Initial live Stripe/Supabase test-mode QA was blocked because billing env vars and CLIs were not present. A later live test-mode run completed after installing/authenticating the Stripe and Supabase CLIs, linking the Supabase project, deploying Edge Functions, and creating the Stripe test webhook endpoint.

Non-live checks completed:

```bash
node -e "/* checked required env var presence without printing values */"
pnpm test -- src/lib/billing/stripeEntitlements.test.ts
pnpm typecheck
pnpm quality
pnpm test:e2e
pnpm static:preview
curl -I http://localhost:3001/
curl -I http://localhost:3001/play/worldprint/
curl -I http://localhost:3001/account/
curl -I http://localhost:3001/account/stats/
curl -I http://localhost:3001/upgrade/
curl -I http://localhost:3001/archive/worldprint/
```

Latest results:

- Checkout granted Pro through the deployed Stripe webhook.
- Immediate cancellation downgraded the user to Free/canceled.
- Resubscribe restored Pro/active.
- Anonymous checkout/portal calls were rejected.
- Invalid webhook signatures were rejected with HTTP 400.
- Stale inactive events for an older subscription were ignored after a newer active subscription existed.
- `pnpm quality` passed, including static export of 137 pages.
- `pnpm typecheck` passed.
- `pnpm test:e2e` passed on rerun outside the sandbox: 57 passed, 1 skipped.
- `curl -I` returned 200 for the listed static routes.

Remaining live manual check:

- Customer-specific `invoice.payment_failed` / `past_due` on the QA subscription still needs a Dashboard or purpose-built Stripe test setup. Unit tests cover the expected Free/past_due mapping.

Pricing Options QA:

- Monthly and yearly Stripe test price ids were rechecked after the first yearly value accidentally pointed at another monthly price.
- Monthly Checkout displayed `$3.99/month`.
- Yearly Checkout displayed `$29.99/year`.
- Stripe test-mode subscription webhook processing granted Pro for the corrected yearly price.
- Browser-hosted Checkout completion for the corrected pricing rerun was blocked by Stripe's current test Checkout payment/verification UI in automation; the detailed result is recorded in `docs/billing-qa-v1.md`.

The detailed QA report lives in `docs/billing-qa-v1.md`.
