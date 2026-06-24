# Stripe/Supabase Billing QA v1

Date: 2026-06-24

## Summary

Live Stripe test-mode billing QA completed against the linked Supabase test project. Checkout can grant Pro through the deployed webhook, immediate cancellation removes Pro, resubscribe restores Pro, protected billing functions reject anonymous callers, and the public webhook rejects invalid signatures.

Two live checks remain partially blocked:

- A customer-specific `invoice.payment_failed` / `past_due` transition was not completed because the Stripe CLI fixture could not attach its generated failed-payment method to the QA customer/subscription.
- A valid unknown-event webhook no-op was not live-tested because the Stripe endpoint is intentionally subscribed only to the required production events. Unit tests cover ignored unknown events.

No secret values were printed or committed.

## Tooling And Auth

- Homebrew: installed.
- Stripe CLI: installed and authenticated, version `1.42.15`.
- Supabase CLI: installed and authenticated, version `2.107.0`.
- Stripe docs skill: installed successfully with `npx skills add -y https://docs.stripe.com`.
- `.env.local`: present, gitignored, and used only locally.
- `SUPABASE_ACCESS_TOKEN`: loaded only into the shell for Supabase CLI deploy commands; not set as an Edge Function secret.

## Deployment And Webhook Setup

Supabase project:

- Project linked locally.
- Production spine SQL applied to the Supabase test project.
- Table grants were applied so authenticated clients can read/write their allowed rows and service-role Edge Functions can write entitlements.

Functions deployed with the API deploy path:

```bash
supabase functions deploy stripe-checkout --use-api
supabase functions deploy stripe-portal --use-api
supabase functions deploy stripe-webhook --use-api --no-verify-jwt
```

Function auth:

- `stripe-checkout`: JWT protected.
- `stripe-portal`: JWT protected.
- `stripe-webhook`: JWT disabled at the Supabase function boundary and protected internally by Stripe signature verification.

Pricing env:

- Preferred: `STRIPE_PRO_MONTHLY_PRICE_ID` for `$3.99/month` and `STRIPE_PRO_YEARLY_PRICE_ID` for `$29.99/year`.
- Compatibility fallback: `STRIPE_PRO_PRICE_ID`. If only the fallback exists, both local/dev Checkout choices can use the same fallback subscription price.

Stripe webhook endpoint:

- Test-mode endpoint created for the deployed `stripe-webhook` function URL.
- Endpoint status: enabled.
- Configured events:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`

Security smoke check:

- Unsigned webhook POST: HTTP 400.
- Invalid-signature webhook POST: HTTP 400.

## Test User State Transitions

The QA user was created as a Free signed-in Supabase user. Identifiers are intentionally omitted.

| Step | Entitlement State |
| --- | --- |
| Before Checkout | `plan=free`, `status=free`, no Stripe customer/subscription fields |
| After Checkout | `plan=pro`, `status=active`, Stripe customer/subscription/price/current period fields present |
| After immediate cancellation | `plan=free`, `status=canceled`, Stripe customer/subscription fields retained |
| After resubscribe | `plan=pro`, `status=active`, new active subscription recorded |
| After replaying stale old cancellation event | Still `plan=pro`, `status=active`; stale inactive event ignored |

## Live Flows Tested

Checkout:

- Signed-in Free user opened `/upgrade`.
- Checkout was started through `stripe-checkout`.
- Stripe test card checkout completed.
- Redirect returned to `/account`.
- Webhook updated Supabase entitlement to Pro.
- `/account` showed Pro.

Pro gated surfaces:

- Full Practice atlas unlocked.
- Full Past Games archive unlocked.
- Advanced stats surface unlocked.

Billing Portal:

- Signed-in Pro user opened Billing Portal from `/account`.
- Anonymous portal function call returned HTTP 401.
- Anonymous checkout function call returned HTTP 401.

Cancellation:

- The test subscription was canceled in Stripe test mode.
- Webhook updated Supabase entitlement to Free/canceled.
- `/account` and gated surfaces reflected downgraded Free access.

Resubscribe:

- The same signed-in user resubscribed from `/upgrade`.
- Checkout completed.
- Webhook restored Pro/active.
- The active subscription changed from the canceled subscription.

Webhook robustness:

- Invalid signature rejected with HTTP 400.
- Replayed stale `customer.subscription.deleted` from the previous subscription did not knock the newer active subscription back to Free.

## Stripe Events Observed Or Exercised

Live event delivery or resend covered:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Attempted but not completed live for the QA customer:

- `invoice.payment_failed`

Unit tests cover:

- `invoice.payment_failed` mapping to Free/past_due.
- Unsupported/unknown events returning a safe ignored result.
- Missing user/customer lookup.
- Missing webhook signature.
- Invalid webhook signature.
- Stale inactive events for older subscriptions.

## Bugs Found And Fixed

- Browser billing actions did not include the signed-in user's Supabase access token when invoking protected Supabase Edge Functions. Fixed by reading the current session and sending `Authorization: Bearer <token>` from `BillingActionsClient`.
- The shared Edge Function auth helper relied on a global Supabase client authorization header path that failed during live QA. Fixed by extracting the bearer token and validating it with `supabase.auth.getUser(accessToken)`.
- Local Supabase env values were initially pointed at the REST URL path instead of the project root URL. Corrected locally; docs now call out root project URLs.
- Production spine SQL was missing explicit grants needed by authenticated clients and service-role function writes. Grants were added to `docs/supabase/production_spine_v0.sql`.
- E2E account-shell tests assumed Supabase env was missing. Updated tests to handle both missing-env and configured Supabase builds.

## Remaining Manual Verification

- Verify customer-specific `invoice.payment_failed` on the actual QA subscription by using Stripe Dashboard test-mode tools or a purpose-built test subscription/payment method setup. Expected result remains `plan=free`, `status=past_due`.
- A valid unknown event can be live-tested only by temporarily subscribing the test endpoint to an extra event or signing a custom test payload. The production endpoint should stay limited to the required event list.
- Supabase admin-generated magic links use an implicit hash URL shape that this static app callback does not consume. The player-facing magic-link form remains the intended sign-in path.

## Regression Commands And Results

Completed:

```bash
pnpm quality
pnpm typecheck
pnpm test:e2e
pnpm static:preview
curl -I http://localhost:3001/
curl -I http://localhost:3001/play/worldprint/
curl -I http://localhost:3001/account/
curl -I http://localhost:3001/account/stats/
curl -I http://localhost:3001/upgrade/
curl -I http://localhost:3001/archive/worldprint/
```

Results:

- `pnpm quality` passed:
  - ESLint passed.
  - TypeScript passed.
  - Vitest passed: 15 test files, 90 tests.
  - Static build/export passed: 137 pages.
- `pnpm typecheck` passed.
- First `pnpm test:e2e` attempt was blocked by sandboxed localhost binding: `listen EPERM: operation not permitted ::1:3000`.
- `pnpm test:e2e` rerun outside the sandbox passed: 57 passed, 1 skipped.
- `pnpm static:preview` served `out/`; `localhost:3001` returned HTTP 200 for all checked routes.
- Required `curl -I` route checks all returned HTTP 200:
  - `/`
  - `/play/worldprint/`
  - `/account/`
  - `/account/stats/`
  - `/upgrade/`
  - `/archive/worldprint/`

## Pricing Options Deployment QA v1 - First Attempt

Date: 2026-06-24

Requested goal:

- Set `STRIPE_PRO_MONTHLY_PRICE_ID` and `STRIPE_PRO_YEARLY_PRICE_ID` as Supabase Edge Function secrets.
- Redeploy only `stripe-checkout`.
- Verify monthly and yearly Stripe Checkout in test mode.

Setup completed:

- `.env.local` exists and remains gitignored.
- `STRIPE_PRO_MONTHLY_PRICE_ID`: present locally.
- `STRIPE_PRO_YEARLY_PRICE_ID`: present locally.
- `STRIPE_PRO_PRICE_ID`: not present locally, so no fallback secret was updated in this run.
- Supabase Edge Function secrets were updated for monthly/yearly price IDs.
- `stripe-checkout` was redeployed with `supabase functions deploy stripe-checkout --use-api`.

Sanitized Stripe price metadata check:

- Monthly price: active test-mode recurring monthly price, unit amount `399`.
- Yearly price: blocked. The configured yearly env value resolved to an active test-mode recurring monthly price, unit amount `399`, not the required yearly unit amount `2999`.

Blocked before browser Checkout QA:

- Monthly Checkout UI verification was not run.
- Yearly Checkout UI verification was not run.
- No Checkout purchase was completed.
- Pro entitlement and Billing Portal were not retested in this pricing-specific run.

Required fix:

- In Stripe Dashboard test mode, create or find the Can You Geo? Pro recurring yearly price for `$29.99/year`.
- Set that price ID locally as `STRIPE_PRO_YEARLY_PRICE_ID`.
- Rerun the pricing deployment QA so the corrected value is set as a Supabase Edge Function secret and `stripe-checkout` is redeployed.

## Pricing Options Deployment QA v1 - Rerun

Date: 2026-06-24

Requested goal:

- Recheck the corrected monthly/yearly Stripe test price ids.
- Set `STRIPE_PRO_MONTHLY_PRICE_ID` and `STRIPE_PRO_YEARLY_PRICE_ID` as Supabase Edge Function secrets.
- Redeploy only `stripe-checkout`.
- Verify monthly and yearly Checkout buttons in Stripe test mode.
- Complete one plan and confirm Pro entitlement still works.

Setup completed:

- `.env.local` exists, remains gitignored, and was read without printing secret values.
- `STRIPE_PRO_MONTHLY_PRICE_ID`: present locally.
- `STRIPE_PRO_YEARLY_PRICE_ID`: present locally.
- `STRIPE_PRO_PRICE_ID`: not present locally, so the legacy fallback was not updated in this run.
- Stripe price metadata was checked through the Stripe API without printing price ids.
- Supabase Edge Function secrets were updated for the monthly/yearly price ids.
- `stripe-checkout` was redeployed with `supabase functions deploy stripe-checkout --use-api`.

Sanitized Stripe price metadata check:

- Monthly price: active test-mode recurring monthly USD price, unit amount `399`.
- Yearly price: active test-mode recurring yearly USD price, unit amount `2999`.

QA findings:

- Local Supabase URL values initially pointed at the REST API path instead of the project root URL. They were corrected locally in `.env.local`; no secret values were committed.
- Stripe Checkout initially localized the monthly price to a non-USD adaptive display for this machine's region. `stripe-checkout` now disables Checkout adaptive pricing so the USD product copy and Checkout price display stay aligned.

Checkout UI verification:

- Monthly Checkout opened from `/upgrade` and displayed `$3.99/month`.
- Yearly Checkout opened from `/upgrade` and displayed `$29.99/year`.
- Returning/canceling from Checkout left the local Free user unchanged.

Purchase / entitlement verification:

- Automated browser completion of Stripe Checkout was blocked by Stripe's current test Checkout payment/verification UI. The visible price verification still completed for both buttons.
- To verify the downstream billing lifecycle without bypassing app entitlement rules, a Stripe test-mode yearly subscription was created for the same QA customer using a Stripe test token and the corrected yearly price.
- The deployed webhook processed the subscription and updated Supabase entitlement to `plan=pro`, `status=active`.
- `/account` showed Pro after the webhook update.
- Billing Portal opened for the signed-in Pro user.

Result:

- Monthly Checkout price display verified.
- Yearly Checkout price display verified.
- Pro entitlement verified after a completed Stripe test-mode yearly subscription.
- Billing Portal verified.

Regression commands and results:

```bash
pnpm quality
pnpm typecheck
pnpm test:e2e
pnpm static:preview
curl -I http://localhost:3001/
curl -I http://localhost:3001/play/worldprint/
curl -I http://localhost:3001/account/
curl -I http://localhost:3001/account/stats/
curl -I http://localhost:3001/upgrade/
curl -I http://localhost:3001/archive/worldprint/
```

- `pnpm quality` passed:
  - ESLint passed.
  - TypeScript passed.
  - Vitest passed: 16 test files, 92 tests.
  - Static build/export passed: 137 pages.
- `pnpm typecheck` passed.
- First `pnpm test:e2e` attempt was blocked by sandboxed localhost binding: `listen EPERM: operation not permitted ::1:3000`.
- `pnpm test:e2e` rerun outside the sandbox passed: 57 passed, 1 skipped.
- `pnpm static:preview` served `out/`; `localhost:3001` returned HTTP 200 for all checked routes.

Remaining manual verification:

- Complete a full browser-hosted Stripe Checkout purchase manually with a test card to confirm the same Pro grant path from `checkout.session.completed`. Previous live QA already verified Checkout-to-Pro with the single-price setup; this rerun verified the new monthly/yearly price selection and downstream subscription webhook path.
