# Can You Geo Billing Readiness

Last updated: 2026-06-29 America/Mexico_City.

## Current Status

Production live billing is enabled and verified. Staging billing uses Stripe sandbox/test values only and writes to staging Supabase `hsgpjtyysbremrokkoym`. The current environment split lives in `docs/ops/staging-production-environments.md`.

## Readiness Grade

Green for production live billing and staging sandbox smoke. Keep full staging lifecycle items, such as yearly checkout, Customer Portal, cancellation, failed-payment, and resubscribe, marked pending unless each has been rerun and recorded against the separated staging Supabase project.

The app has the trusted billing boundary in code: browser UI can only request Supabase Edge Functions, Checkout and Portal require an authenticated Supabase user, webhook writes use service-role credentials, and missing or inactive entitlement rows resolve to Free.

## Current Product Model

- Free account: 3-map Free Daily, saved progress, and basic stats.
- Pro: unlimited Atlas play, full Practice Atlas, complete Past Games archive, advanced stats, and future premium surfaces.
- Visible pricing: `$3.99/month` and `$29.99/year`.
- Checkout provider: Stripe Checkout subscription mode.
- Billing management provider: Stripe Customer Portal.
- Entitlement source of truth: Supabase `public.entitlements`, written only from trusted Edge Function service-role code.

## Implemented In Code

Static app and UI:

- `/upgrade` renders pricing and enables checkout only for the configured environment billing mode.
- `/account` shows membership state from the entitlement row and opens Customer Portal only for Stripe-backed Pro users in environments where billing is configured.
- `src/lib/billing/publicBillingConfig.ts` keeps `disabled`, unset, and invalid modes from enabling checkout.
- `src/features/account/BillingActionsClient.tsx` reads the current Supabase session and invokes `stripe-checkout` or `stripe-portal` with `Authorization: Bearer <session token>`.
- Browser code does not include Stripe secret keys or Supabase service-role keys.

Supabase Edge Functions:

- `supabase/functions/stripe-checkout` creates subscription Checkout Sessions for signed-in users.
- `supabase/functions/stripe-portal` creates Billing Portal Sessions for signed-in users with a Stripe customer id.
- `supabase/functions/stripe-webhook` verifies Stripe webhook signatures, is idempotent through `public.stripe_webhook_events`, and writes entitlements with service-role access.
- `supabase/config.toml` keeps Checkout and Portal JWT-protected and disables Supabase JWT verification only for the Stripe webhook.

Database and RLS:

- `public.entitlements` stores `stripe_customer_id`, `stripe_subscription_id`, `stripe_price_id`, `stripe_status`, `cancel_at_period_end`, and `current_period_end`.
- Authenticated users can select only their own entitlement row.
- Authenticated users do not have entitlement insert/update/delete policies.
- `public.stripe_webhook_events` is service-role only and records processed or ignored Stripe events by event id.
- Missing entitlement rows resolve to Free in `src/lib/account/entitlements.ts`.

## Stripe Data Model

Create one Stripe product:

```text
Can You Geo Pro
```

Create two recurring test-mode prices:

```text
Monthly: USD $3.99/month
Yearly:  USD $29.99/year
```

Store the price IDs in Supabase Edge Function secrets:

```text
STRIPE_PRO_MONTHLY_PRICE_ID=price_<monthly_test_price>
STRIPE_PRO_YEARLY_PRICE_ID=price_<yearly_test_price>
```

The legacy `STRIPE_PRO_PRICE_ID` fallback may remain unset unless an older test flow still depends on it.

Supabase entitlement fields:

- `stripe_customer_id`: Stripe Customer id for the Supabase user.
- `stripe_subscription_id`: current or most recent Stripe Subscription id.
- `stripe_price_id`: configured Pro monthly/yearly price id from the subscription.
- `stripe_status`: raw Stripe subscription status.
- `cancel_at_period_end`: whether Stripe will cancel at the period end.
- `current_period_end`: subscription period end, when available.

Webhook ledger:

- `stripe_webhook_events.event_id` is the Stripe event id and primary key.
- Duplicate event ids are ignored before entitlement writes.
- The ledger is not readable or writable from browser clients.

## Entitlement Mapping

Stripe subscription statuses map to app access as follows:

- `active`, `trialing` -> Pro.
- `past_due` -> Free with `past_due` status.
- `canceled`, `unpaid`, `incomplete`, `incomplete_expired`, `paused` -> Free/non-Pro.
- Missing entitlement row -> Free.

Subscriptions canceled at period end remain Pro while Stripe still reports `active` or `trialing`; `cancel_at_period_end` and `current_period_end` carry the cancellation state for account UI.

## Required Stripe Dashboard Setup

Use Stripe test mode for staging and Stripe live mode for production. Never mix test/live keys, webhook secrets, price IDs, or customer data.

1. Create the `Can You Geo Pro` product.
2. Create the recurring monthly USD `$3.99` price and copy its `price_...` id.
3. Create the recurring yearly USD `$29.99` price and copy its `price_...` id.
4. Configure Stripe-hosted Checkout branding.
5. Configure the Stripe Customer Portal so customers can manage payment methods, cancel, and update subscriptions.
6. Create a webhook endpoint:

```text
https://<supabase-project-ref>.supabase.co/functions/v1/stripe-webhook
```

7. Subscribe the webhook to:

```text
checkout.session.completed
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
invoice.payment_succeeded
invoice.payment_failed
```

8. Copy the webhook signing secret for `STRIPE_WEBHOOK_SECRET`.
9. Prefer a restricted API key if it can cover Checkout Sessions, Customers, Subscriptions, Billing Portal Sessions, and the subscription lookups used by webhook reconciliation.

Do not use live-mode keys or prices until the live launch checklist is complete.

## Required Supabase Edge Function Secrets

Set these as Supabase Edge Function secrets, never in browser code or committed files:

```text
STRIPE_SECRET_KEY=<test-mode-stripe-secret-or-restricted-key>
STRIPE_WEBHOOK_SECRET=<test-mode-webhook-signing-secret>
STRIPE_PRO_MONTHLY_PRICE_ID=price_<monthly_test_price>
STRIPE_PRO_YEARLY_PRICE_ID=price_<yearly_test_price>
NEXT_PUBLIC_SITE_URL=https://test.canyougeo.com
```

Optional:

```text
STRIPE_PRO_PRICE_ID=price_<legacy_fallback>
```

Provider-neutral Stripe webhook dual-write is off by default during the transition. Set these only after the provider-neutral
billing migrations have been applied to that same Supabase project and the rollout has been explicitly approved:

```text
STRIPE_PROVIDER_NEUTRAL_DUAL_WRITE_ENABLED=true
STRIPE_PROVIDER_ENVIRONMENT=test|live
```

Use `STRIPE_PROVIDER_ENVIRONMENT=test` only for Stripe sandbox webhooks targeting the staging Supabase project. Use
`STRIPE_PROVIDER_ENVIRONMENT=live` only for Stripe live-mode webhooks targeting the production Supabase project. If the
dual-write flag is enabled without one of those exact values, `stripe-webhook` fails closed with a sanitized `503` before
mutating billing state. Checkout and Portal functions do not require these transition variables.

Billing CORS allows the production, www, test, strict Cloudflare Pages preview, and localhost browser origins without using a wildcard. Billing return URLs still come from `NEXT_PUBLIC_SITE_URL`; keep staging/test billing returns on `https://test.canyougeo.com` unless a preview return URL is intentionally configured and allowed.

Hosted Supabase functions provide `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` through the platform. Do not print or commit those values.

Deploy functions after changing secrets:

```bash
supabase functions deploy stripe-checkout --project-ref <target-supabase-project-ref>
supabase functions deploy stripe-portal --project-ref <target-supabase-project-ref>
supabase functions deploy stripe-webhook --project-ref <target-supabase-project-ref> --no-verify-jwt
```

Expected function auth:

- `stripe-checkout`: JWT protected.
- `stripe-portal`: JWT protected.
- `stripe-webhook`: Supabase JWT disabled, Stripe signature required.

## Required Cloudflare Environment Variables

Preview or staging Stripe QA:

```text
NEXT_PUBLIC_SITE_URL=https://test.canyougeo.com
NEXT_PUBLIC_SUPABASE_URL=https://hsgpjtyysbremrokkoym.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key>
NEXT_PUBLIC_BILLING_MODE=test
```

Production live billing:

```text
NEXT_PUBLIC_SITE_URL=https://canyougeo.com
NEXT_PUBLIC_SUPABASE_URL=https://jquebthneczqdxagagof.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key>
NEXT_PUBLIC_BILLING_MODE=live
```

Do not put `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, or Resend/SMTP secrets in Cloudflare public app env.

## Test-Mode QA Checklist

Run this only against a test-mode Stripe setup.

1. Confirm Cloudflare deployment has `NEXT_PUBLIC_BILLING_MODE=test`.
2. Sign in on the target domain.
3. Open `/upgrade` and verify monthly/yearly Checkout buttons appear.
4. Complete monthly Checkout with a Stripe test card.
5. Confirm Stripe redirects to `/account?billing=success`.
6. Confirm `public.entitlements` has the signed-in `user_id`, Stripe customer id, subscription id, configured price id, and Pro status after webhook processing.
7. Confirm `public.stripe_webhook_events` contains the processed Stripe event id.
8. Confirm `/account` shows Pro and the Customer Portal button.
9. Open Customer Portal and verify payment method/subscription management is available.
10. Cancel at period end; confirm account remains Pro while Stripe reports active with `cancel_at_period_end=true`.
11. Test a payment failure path and confirm entitlement falls back to Free/past_due.
12. Test resubscribe and confirm stale inactive events from the older subscription do not remove newer Pro access.
13. Send or replay a duplicate event id and confirm it is ignored.
14. Send an invalid-signature webhook request and confirm it returns `400` and writes nothing.
15. Keep staging in `test` only while sandbox checkout is intentionally planned.

For fresh account QA, use Gmail plus-addresses such as `name+canyougeo-billing-01@gmail.com` so each run creates a distinct Supabase Auth user. Delete Supabase Auth test users only from the Supabase **Authentication -> Users** dashboard unless you are intentionally running a reviewed cleanup script.

## Live-Mode Launch Checklist

- Create live-mode Stripe product/prices; test price IDs cannot be reused.
- Create live-mode webhook endpoint and secret.
- Configure live Customer Portal, branding, tax, receipts, refund policy, and support details.
- Decide whether the Edge Functions should use a live restricted API key and test its permissions.
- Review or upgrade the pinned Stripe SDK/API version in Supabase Edge Functions.
- Confirm legal/privacy copy covers paid accounts and Stripe as payment processor.
- Confirm `support@canyougeo.com` is fully monitored for billing and account help.
- Run live-mode-safe Checkout, Portal, cancel, payment-failure, and resubscribe QA.
- Make an explicit dashboard/deployment decision before changing production live billing configuration.

## Current Follow-Ups

- Keep Stripe sandbox webhook endpoint pointed only at staging `hsgpjtyysbremrokkoym`.
- Record separate staging QA results for yearly checkout, Customer Portal, cancellation, failed-payment, and resubscribe if those flows have not been rerun since the Supabase split.
- Keep staging Stripe Edge Function secrets and deploys scoped to the staging Supabase project only.
- Keep production live billing changes behind explicit dashboard/deployment approval and production Stripe/Supabase values only.

## Non-Blocker To Revisit Before Stripe API Changes

The Supabase Edge Functions currently use Stripe SDK `stripe@16.12.0` with API version `2024-06-20`. That is acceptable to keep stable for launch; before any Stripe API or SDK upgrade, review the current Stripe API version and rerun the full billing QA matrix after the upgrade.
