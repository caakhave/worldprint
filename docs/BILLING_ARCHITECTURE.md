# Billing Architecture v16

Last updated: 2026-06-27 America/Mexico_City.

This plan keeps Can You Geo? static-export compatible while allowing Stripe Pro billing to be tested safely in Stripe test mode. It does not turn on live payments.

## Decision

Use Stripe Checkout and Customer Portal through Supabase Edge Functions:

- `stripe-checkout` creates subscription Checkout Sessions for signed-in users.
- `stripe-portal` creates Customer Portal sessions for signed-in users with a Stripe customer.
- `stripe-webhook` verifies Stripe webhook signatures and writes entitlement changes with Supabase service-role access.

The Cloudflare Pages app remains a static Next export. It only calls Supabase Auth, reads its own entitlement row through RLS, and invokes protected Supabase Functions with the signed-in session.

## Options Considered

### Cloudflare Pages Functions

This would also be a valid server boundary for Stripe secrets, but it would split the trusted billing surface across Cloudflare and Supabase. Because entitlement writes already need Supabase service-role access, Cloudflare Functions would still need Supabase service-role secrets and duplicate auth/session verification. It is not the best fit for the current repo.

### Supabase Edge Functions

This is the recommended path. The repo already has the functions, JWT protection for Checkout/Portal, a public webhook with signature verification, and return URL validation. This keeps the static app simple and puts billing writes next to the Supabase entitlement table.

### Stripe Payment Links

Payment Links are useful for no-code subscription tests, but they are weaker for this product because Pro access must attach to a signed-in Supabase user. Payment Links can include metadata only if the link/session creation is controlled, so they either require manual reconciliation or another server step. They are acceptable as a temporary manual payment collection tool, not as the launch entitlement path.

### Manual Pro Entitlements

Manual Supabase SQL remains useful for local QA and trusted beta testing. It must not become the customer-facing paid flow.

## Checkout Flow

1. User signs in with Supabase passwordless email.
2. Static `/upgrade` page renders monthly/yearly Pro actions only when public Supabase env exists.
3. Browser invokes `stripe-checkout` through `client.functions.invoke`.
4. Function validates:
   - Supabase Edge Function env is present.
   - `NEXT_PUBLIC_SITE_URL` is an allowed origin.
   - request has a valid Supabase user session.
   - requested interval is `monthly` or `yearly`.
5. Function creates or reuses a Stripe Customer.
6. Function stores the Stripe customer id in `public.entitlements`.
7. Function creates a Stripe Checkout Session with `mode: "subscription"` and the selected Pro price.
8. Browser redirects to Stripe-hosted Checkout.
9. Stripe redirects back to `/account?billing=success` or `/upgrade?billing=cancelled`.
10. The app treats success as pending until webhook-driven entitlement reads return Pro.

## Webhook Flow

Stripe sends events to:

```text
https://<project-ref>.supabase.co/functions/v1/stripe-webhook
```

`stripe-webhook` must be deployed with JWT disabled at the function boundary because Stripe cannot send a Supabase user token. It is still secured by Stripe signature verification using `STRIPE_WEBHOOK_SECRET`.

Handled events:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`
- `invoice.payment_succeeded`

Status mapping:

- `active` or `trialing` -> `plan = 'pro'`
- `past_due` -> `plan = 'free'`, `status = 'past_due'`
- `canceled`, `unpaid`, `incomplete`, `incomplete_expired`, `paused` -> `plan = 'free'`, `status = 'canceled'`
- missing row -> app resolves to Free

Canceled-at-period-end subscriptions remain Pro while Stripe reports the subscription as active/trialing. The account UI can show renewal canceled plus the period end when those fields exist.

## User And Stripe Mapping

Primary mapping fields:

- `entitlements.user_id` is the Supabase auth user id.
- `entitlements.stripe_customer_id` maps the user to Stripe Customer.
- `entitlements.stripe_subscription_id` stores the latest subscription.
- `entitlements.stripe_price_id` stores monthly/yearly price id.
- `entitlements.stripe_status`, `cancel_at_period_end`, and `current_period_end` store Stripe subscription state for account UI.

Checkout and subscription metadata include `supabase_user_id` and `entitlement_tier=pro` so webhook events can reconcile even before customer lookup succeeds.

## Required Environment

### Static Cloudflare Pages app

Names only; set values in Cloudflare, not in source:

```bash
NEXT_PUBLIC_SITE_URL=https://canyougeo.com
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
NEXT_PUBLIC_BILLING_MODE=disabled
```

`NEXT_PUBLIC_SUPABASE_URL` must be the project root URL only. For the current project, use
`https://jquebthneczqdxagagof.supabase.co`, not `https://jquebthneczqdxagagof.supabase.co/rest/v1` or
`https://jquebthneczqdxagagof.supabase.co/auth/v1`.

Set `NEXT_PUBLIC_BILLING_MODE=test` only for an intentional Stripe test-mode QA deployment. Leave it `disabled` for normal static deploys until billing is ready. `live` is documented as a future value but remains disabled by the current app code until a later live-payments launch explicitly enables it.

### Supabase Edge Function secrets

Hosted Supabase exposes `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to functions. Do not commit or print these.

Set:

```bash
STRIPE_SECRET_KEY=<test-mode restricted-or-secret-key>
STRIPE_WEBHOOK_SECRET=<test-mode endpoint signing secret>
STRIPE_PRO_MONTHLY_PRICE_ID=price_<monthly>
STRIPE_PRO_YEARLY_PRICE_ID=price_<yearly>
STRIPE_PRO_PRICE_ID=price_<optional-legacy-fallback>
NEXT_PUBLIC_SITE_URL=https://canyougeo.com
```

Use Stripe test mode only until the live checklist is complete. Prefer a restricted API key with the minimum permissions needed by Checkout, Customer, Subscription, Portal, and webhook reconciliation calls when feasible.

## Supabase Setup

Required tables and policies are documented in:

```text
docs/supabase/production_spine_v0.sql
```

The tracked v16 migration for existing projects is:

```text
supabase/migrations/20260627000000_billing_test_mode_entitlements.sql
```

Important RLS expectations:

- Browser clients can read their own entitlement row.
- Browser clients cannot write `entitlements`.
- Edge Functions use service-role credentials to write billing state.
- Missing entitlement rows resolve to Free.

Current risk: only the Stripe entitlement-field migration is tracked. Before live payments, convert the rest of the production spine SQL into migrations or document the exact dashboard-applied schema revision.

## Function Deployment

```bash
supabase functions deploy stripe-checkout --use-api
supabase functions deploy stripe-portal --use-api
supabase functions deploy stripe-webhook --use-api --no-verify-jwt
```

Expected auth settings:

- `stripe-checkout`: JWT protected
- `stripe-portal`: JWT protected
- `stripe-webhook`: JWT disabled, signature verified internally

## Stripe Test-Mode Setup

1. Create product: `Can You Geo? Pro`.
2. Create recurring monthly price: `$3.99/month`.
3. Create recurring yearly price: `$29.99/year`.
4. Set Supabase Edge Function price secrets.
5. Configure Customer Portal in Stripe test mode.
6. Add test webhook endpoint for the Supabase `stripe-webhook` URL.
7. Subscribe webhook to the handled events listed above.
8. Set `STRIPE_WEBHOOK_SECRET` from that endpoint.
9. Run a signed-in test checkout from `/upgrade`.
10. Confirm webhook updates `public.entitlements`.
11. Confirm `/account` and Pro gates reflect Pro.
12. Test cancel, payment failure/past_due, resubscribe, invalid webhook signature, and stale inactive event behavior.

### Manual Test Card Checklist

Use Stripe test mode only. Never use real card details in testing.

- Successful subscription Checkout: `4242 4242 4242 4242`, any future date, any three-digit CVC.
- 3D Secure/authentication path if enabled in Dashboard: use Stripe's current 3D Secure test card from the Dashboard/docs and confirm Checkout returns cleanly.
- Decline/failure path: use Stripe's current declined-payment test cards or Dashboard test tools, then confirm `invoice.payment_failed` maps the account back to Free/past_due.

### Webhook Replay Checklist

Use Stripe CLI or Dashboard test events against the Supabase `stripe-webhook` endpoint:

```bash
stripe trigger checkout.session.completed
stripe trigger customer.subscription.created
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted
stripe trigger invoice.payment_failed
stripe trigger invoice.payment_succeeded
```

Generated fixture events may not always map to the real QA customer/subscription. For entitlement assertions, prefer a real test Checkout subscription and then replay or mutate events for that customer from the Stripe Dashboard.

## Failure States

- Missing public Supabase env: account pages render disabled sign-in/billing states; gameplay remains available.
- `NEXT_PUBLIC_BILLING_MODE` unset, `disabled`, or `live`: public checkout/portal actions stay disabled with `Checkout coming soon.`
- Missing billing function env: functions return `503`; public UI shows `Checkout is not open yet.`
- Signed-out checkout or portal request: function returns `401`; UI asks player to create a free account.
- Missing Stripe customer for Portal: function returns a safe error; account does not expose raw ids.
- Checkout success before webhook arrives: account shows pending verification, not immediate Pro.
- Webhook signature invalid: `stripe-webhook` returns `400` and writes nothing.
- Stale inactive subscription event after a newer active subscription: ignored.
- Stripe outage or webhook delay: manual trusted Supabase SQL can grant/remove Pro during test recovery; browser writes remain impossible.

## Rollback Plan

1. Leave static gameplay live.
2. Hide checkout by removing/withholding Supabase public env in preview, or unset Stripe Edge Function secrets so Checkout returns disabled.
3. Keep manual trusted Pro SQL available for testers.
4. If a bad webhook writes incorrect entitlements, correct rows in Supabase SQL Editor using trusted admin access.
5. Rotate Stripe webhook/API secrets if any secret is suspected to be exposed.

## Before Live Payments

- Finish live-mode Stripe Dashboard product, price, branding, portal, webhook, and tax review.
- Decide whether to use restricted API keys for the Edge Functions and test the required permissions.
- Review and upgrade the pinned Stripe SDK/API version in Supabase Edge Functions, then rerun test-mode billing QA.
- Convert Supabase SQL into tracked migrations or record the exact applied schema revision.
- Run live-mode-safe checkout, cancellation, payment failure, and resubscribe QA.
- Confirm privacy/legal copy covers paid accounts and Stripe as payment processor.
- Confirm support email is live before taking payments.
