# Can You Geo iOS IAP Architecture Audit

Checkpoint 5A-1 status: factual audit only. This document records the current production billing and entitlement architecture as of `origin/main` commit `5ef9915c5cfd185e8309101b81da93d424fa4281`. It is not an approved final StoreKit architecture, schema design, or implementation plan.

## 1. Purpose and scope

This audit answers how Can You Geo currently grants, removes, reads, and protects Pro access before Apple subscriptions are added.

In scope:

- Existing Stripe Checkout, Customer Portal, webhook, and stale-customer recovery paths.
- Existing Supabase billing tables, fields, RLS, and service-role write boundaries.
- Existing app-side entitlement reads and Pro capability gates.
- Existing native iOS/Android no-purchase boundary and release guardrails.
- Existing billing analytics and operational documentation.
- Risks and questions that must be resolved before Apple billing is implemented.

Out of scope for this checkpoint:

- Choosing a StoreKit library or native purchase API.
- Designing the final dual-provider entitlement schema.
- Adding Apple products, StoreKit code, migrations, Edge Functions, UI changes, or production configuration.
- Verifying production user data or exposing real customer, subscription, session, email, token, or payment values.

Cross-references:

- Stripe/Supabase runbook: `docs/ops/billing-readiness.md`
- Supabase table/RLS guide: `docs/ops/supabase-owner-guide.md`
- Analytics event contract: `docs/ops/analytics.md`
- Native release guardrails: `docs/mobile/NATIVE_RELEASE_GUARDRAILS.md`
- iOS Capacitor baseline: `docs/mobile/IOS_CAPACITOR_POC.md`

## 2. Current production billing overview

Can You Geo currently has one paid tier, Pro. Website subscriptions use Stripe Checkout in subscription mode with visible pricing of `$3.99/month` and `$29.99/year` from `src/lib/billing/proPricing.ts`.

The current authoritative app entitlement record is `public.entitlements`, one row per Supabase user. Stripe writes are performed by trusted Supabase Edge Function code using service-role credentials. Browser and native app code only read the signed-in user's own row through RLS.

The current effective entitlement rule is:

- Signed-out user -> Guest.
- Signed-in user with no entitlement row -> Free.
- Signed-in user with `plan = 'pro'` and `status in ('active', 'trialing')` -> Pro.
- Any missing, inactive, past-due, canceled, malformed, or non-Pro row -> Free.

Native iOS and Android builds currently consume the same entitlement row so existing Stripe Pro subscribers can use Pro features in the app. Native builds intentionally cannot start Stripe checkout or open Stripe Customer Portal. StoreKit and Google Play Billing remain deferred.

## 3. Current Stripe checkout flow

| Flow | Entry point | Authoritative provider | Server function | Database fields read/written | User-visible result | Coverage | Missing or ambiguous behavior |
| --- | --- | --- | --- | --- | --- | --- | --- |
| User starts web checkout | `/upgrade` or `/account` through `BillingActionsClient` | Stripe | `supabase/functions/stripe-checkout/index.ts` | Reads existing `entitlements.stripe_customer_id`; may write `plan='free'`, `status='free'`, `stripe_customer_id`, `updated_at` while creating a customer | Browser redirects to Stripe Checkout only after a checkout URL is returned | `BillingActionsClient.test.tsx`, `billingActionHelpers.test.ts`, `stripe-checkout/index.structure.test.ts`, black-box opt-in checkout smoke | Checkout completion itself does not grant Pro until webhook processing arrives. |
| Stripe customer created or reused | `ensureStripeCustomer()` in `supabase/functions/_shared/billing.ts` | Stripe customer object | `stripe-checkout` | Reuses `stripe_customer_id`; creates a new Stripe Customer using Supabase user id metadata and optional user email; upserts `stripe_customer_id` | Transparent to user | `checkoutRecovery.test.ts`, structure tests | Customer email is sent to Stripe; this is expected for billing but should stay out of analytics and Apple event payloads. |
| Stale saved customer id recovery | Stripe Checkout Session creation throws `resource_missing` / "No such customer" | Stripe | `createCheckoutSessionWithStaleCustomerRecovery()` | Replaces stored `stripe_customer_id` by calling `ensureStripeCustomer()` with no existing id, then retries session creation once | Checkout still opens after a deleted/wrong-environment customer id | `checkoutRecovery.test.ts`, checkout structure tests, previous production hotfix validation | Recovery is Stripe-specific and not a generic provider reconciliation model. |
| Checkout success return | Stripe redirects to `/account?billing=success` or `/upgrade?billing=success` | Stripe + webhook result | No app-side write; `BillingReturnNotice` reads entitlement | Reads `entitlements` via `useEntitlement()` | Shows Pro if webhook has updated row; otherwise shows "Pro access is being verified" | `BillingReturnNotice.test.tsx` | Browser return pages are refreshable, so purchase/subscription success analytics are intentionally deferred. |
| Checkout cancellation return | Stripe redirects with billing cancelled state | Stripe | No app-side write | No billing table write | Shows "No charge was made" and links back to game/upgrade | `BillingReturnNotice.test.tsx` | None found for current Stripe-only flow. |
| Customer restores billing through portal | Pro account with `stripe_customer_id` clicks Manage billing | Stripe Customer Portal | `supabase/functions/stripe-portal/index.ts` | Reads `entitlements.stripe_customer_id`; writes nothing directly | Browser redirects to Stripe Portal | `BillingActionsClient.test.tsx`, `AuthNavStatus.test.tsx`, `stripe-portal/index.structure.test.ts` | Portal is only available for Stripe-backed Pro rows; future Apple subscriptions need a different management path. |

Checkout request hardening:

- Browser sends only `{ plan: "monthly" | "yearly" }`.
- Edge Function validates JSON content type, request size, allowed key set, signed-in Supabase user, configured Stripe price id, return URL origin, and CORS origin.
- Client analytics sends `cgy_upgrade_click` before the request and `cgy_begin_checkout` only after a Stripe checkout URL is returned. It does not send Stripe session ids, checkout URLs, user ids, or emails.

## 4. Current Stripe webhook and entitlement flow

Stripe webhook handling lives in `supabase/functions/stripe-webhook/index.ts`. Supabase JWT verification is disabled for this function at the platform boundary, and the function verifies the Stripe signature with `STRIPE_WEBHOOK_SECRET`.

| Stripe event | Current behavior | Entitlement write | Coverage | Missing or ambiguous behavior |
| --- | --- | --- | --- | --- |
| `checkout.session.completed` | Retrieves the subscription, requires a configured Pro price id, resolves user from metadata or customer lookup. | Upserts `stripe_customer_id`, `stripe_subscription_id`, `stripe_price_id`, `stripe_status`, `cancel_at_period_end`, `current_period_end`; maps active/trialing to Pro. | `stripeEntitlements.test.ts`, webhook structure/security coverage, billing QA docs | If the event lacks a configured Pro price or user mapping it is ignored, not manually reconciled. |
| `customer.subscription.created` / `updated` / `deleted` | Retrieves the latest subscription when possible, requires configured Pro price, resolves user, ignores stale inactive events from old subscriptions when a newer active/trialing subscription is already recorded. | Same entitlement upsert. Canceled/unpaid/incomplete/incomplete_expired/paused map to Free/canceled. | `stripeEntitlements.test.ts`, prior billing QA cancellation/resubscribe notes | Current model has one global entitlement row, so provider-neutral multi-subscription ownership is not represented. |
| `invoice.payment_failed` | Retrieves subscription, requires configured Pro price, resolves user, writes `stripe_status='past_due'`. | `past_due` maps to `plan='free'`, `status='past_due'`. | `stripeEntitlements.test.ts`; live billing docs note customer-specific failed-payment QA was partially blocked earlier | The current product policy removes Pro immediately on past-due, independent of `current_period_end`. Confirm before Apple work. |
| `invoice.payment_succeeded` | Retrieves subscription, requires configured Pro price, resolves user, writes the live subscription status. | Active/trialing restores Pro; other statuses map through the shared status mapper. | `stripeEntitlements.test.ts`, owner notification tests indirectly through helper coverage | None found for current Stripe-only flow. |
| Unsupported events | Returns ignored outcome. | No entitlement write. | `stripeEntitlements.test.ts`, billing docs | Refunds, disputes, chargebacks, and explicit Stripe pause/resume events are not handled separately unless they arrive through subscription status changes. |

Webhook replay/idempotency:

- `public.stripe_webhook_events.event_id` is the primary replay ledger.
- The function checks for an existing event id before processing.
- After processing, it records event id, type, status, user id, Stripe customer id, Stripe subscription id, and `processed_at`.
- The ledger is service-role-only; browser roles have no access.

Operational notification:

- `supabase/functions/_shared/adminNotifications.ts` can send owner notifications for Pro start, cancellation, failed payment, and recovery through Resend when enabled.
- Notification failures are logged and do not block webhook responses.

## 5. Current Supabase billing schema

Billing-relevant migrations:

- `supabase/migrations/20260626000000_account_profiles_baseline.sql`
- `supabase/migrations/20260627000000_billing_test_mode_entitlements.sql`
- `supabase/migrations/20260627010000_rls_account_security_hardening.sql`
- `supabase/migrations/20260630090000_marketing_consent_profiles.sql` for profile marketing fields, not billing entitlement state.

Current billing tables:

- `public.profiles`
  - Account profile row keyed by Supabase Auth user id.
  - Entitlements reference `profiles(id)` with `on delete cascade`.
  - Authenticated users can select/insert/update only their own profile row.
- `public.entitlements`
  - One effective Free/Pro row per user.
  - Authenticated users can select only their own row.
  - Authenticated users have no insert/update/delete policies.
  - Service role writes entitlement state.
- `public.stripe_webhook_events`
  - Stripe event replay ledger.
  - Service-role-only; no browser policies.

Important schema properties:

- `entitlements.plan` is constrained to `free | pro`.
- `entitlements.status` is constrained to `free | trialing | active | past_due | canceled`.
- There is no `billing_provider`, `provider_entitlements`, `apple_original_transaction_id`, `storefront`, `environment`, `expires_at` separate from Stripe `current_period_end`, or provider-event table other than `stripe_webhook_events`.
- There is no browser-write path that can grant Pro.

## 6. Current entitlement-consumption paths

The app consumes entitlements through `src/lib/account/entitlements.ts` and `src/features/account/useEntitlement.ts`.

Primary app reads:

- `fetchRemoteEntitlement(client, userId)` selects `entitlements.*` for the signed-in user.
- `resolvePlayerEntitlement(row, signedIn)` turns raw rows into Guest, Free, or Pro capabilities.
- `useEntitlement()` returns the resolved entitlement to account, home, upgrade, game, stats, and archive UI.
- Native offline mode preserves an already loaded non-guest entitlement while account sync is deferred; otherwise signed-in offline users fall back to Free.

Current Pro capability gates:

- Mystery Map (`src/features/worldprint/WorldprintClient.tsx`)
  - Pro account unlocks Atlas mode.
  - `canUseFullPractice` unlocks full Practice Atlas and practice replay paths.
  - Signed-in Free gets Daily where supported.
- Pattern Atlas (`src/features/pattern-atlas/PatternAtlasClient.tsx`)
  - Practice/Pattern Runs require Pro.
  - Daily requires signed-in account.
- Order Atlas (`src/features/order-atlas/OrderAtlasClient.tsx`)
  - Practice/Pro Play requires Pro.
  - Daily requires signed-in account.
- Past Games (`src/features/worldprint/ArchiveClient.tsx`)
  - Uses `entitlement.capabilities.archiveLimitDays`.
  - Pro has complete archive access; Free has recent-window access.
- Account surfaces
  - Membership display, account status, advanced stats gate, and header account menu use `useEntitlement()`.

The key abstraction is the resolved `PlayerEntitlement` and its capabilities. Game code does not inspect Stripe subscription ids or Stripe statuses directly.

## 7. Current native billing boundaries

Native builds are detected by `NEXT_PUBLIC_CGY_NATIVE_APP=1` through `src/lib/site/buildTarget.ts`.

Native boundaries implemented today:

- `analyticsConfigFromEnv()` disables GTM/GA4/paid-media analytics in native builds.
- Marketing consent UI and consent event delivery are suppressed in native builds.
- `requestBillingActionUrl()` returns a native unavailable message before reading the Supabase session or invoking a Supabase Function.
- `BillingActionsClient` renders disabled native purchase UI and does not render checkout or portal actions.
- `UpgradeClient` shows "Mobile purchase preview" and does not enable web checkout in native builds.
- `AuthNavStatus` hides the Stripe Customer Portal action in native builds.
- Native external navigation opens only trusted social links through Capacitor Browser; internal Can You Geo routes stay in the WebView.
- Stripe checkout and Customer Portal are not opened through the native Browser plugin.
- Existing Pro entitlements can still be read and used in native builds when account sync succeeds.

Existing native coverage:

- `src/features/account/billingActionHelpers.test.ts`
- `src/features/account/BillingActionsClient.test.tsx`
- `src/features/account/UpgradeClient.test.tsx`
- `src/features/account/AuthNavStatus.test.tsx`
- `canyougeo-blackbox/native/maestro/flows/ios/04_guardrails.yaml`
- `canyougeo-blackbox/native/maestro/flows/android/06_guardrails_online.yaml`
- `docs/mobile/NATIVE_RELEASE_GUARDRAILS.md`

## 8. Current analytics and operational coverage

Checkout analytics:

- `cgy_upgrade_click` fires when plan/value checkout intent is explicit.
- `cgy_begin_checkout` fires only after a signed-in player receives a Stripe Checkout URL.
- Checkout analytics payloads include only `currency`, `value`, `plan`, `signed_in`, and `source` where applicable.
- The analytics sanitizer rejects PII-shaped keys and email-like string values.
- Native builds disable analytics delivery entirely.

Subscription success analytics:

- `cgy_subscription_success`, GA4 `purchase`, and ad-platform purchase events are intentionally deferred.
- Current browser return pages are refreshable and can be revisited, so frontend purchase tracking could double-count.
- A future purchase signal should come from a reliable billing source with a stable provider event or transaction id.

Operational coverage:

- `docs/ops/billing-readiness.md` documents production and staging Stripe setup, live-mode checklist, webhook events, status mapping, and billing QA.
- `docs/billing-qa-v1.md` records earlier Stripe test-mode live QA, including checkout, portal, cancellation, resubscribe, stale cancellation replay, and known failed-payment QA gap.
- `docs/ops/supabase-owner-guide.md` documents billing tables, RLS, service-role-only operations, and staging validation.
- `canyougeo-blackbox/tests/test_checkout_smoke.py` provides opt-in black-box checkout-open coverage without completing purchase.

## 9. Data ownership table

| Table/source | Column/field | Data type | Writer | Reader | Public-profile-visible? | Stripe-specific? | Could support Apple unchanged? | Security or migration concern |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Supabase Auth `auth.users` | `id` | `uuid` | Supabase Auth | Edge Functions, browser session, profile FK | Current user/session only; not public profile | No | Yes, as account id | Used as Stripe metadata and support id. Do not send to analytics or Apple event logs unless explicitly designed. |
| Supabase Auth `auth.users` | `email` | text | Supabase Auth | Client account UI, `ensureStripeCustomer()` | Current user/session only; not public profile | No | Maybe, but do not use as provider ownership key | Sent to Stripe customer creation when available. Must not be logged in billing docs/tests. |
| `public.profiles` | `id` | `uuid` | Auth/profile creation | Browser own-profile reads; entitlement FK | Own-profile only; not public | No | Yes | Cascades delete to entitlement row. Active external subscriptions need account-deletion policy. |
| `public.profiles` | `display_name` | `text` nullable | Browser own-profile update | Browser own-profile reads | Own-profile only; not public | No | Yes | Not billing state. |
| `public.profiles` | `created_at` | `timestamptz` | Database default | Browser own-profile reads | Own-profile only; not public | No | Yes | Not billing state. |
| `public.profiles` | `updated_at` | `timestamptz` | Browser/profile writes | Browser own-profile reads | Own-profile only; not public | No | Yes | Not billing state. |
| `public.entitlements` | `user_id` | `uuid` | Service role | Browser own-row reads, Edge Functions | Own-row only; not public | No | Yes | Primary key currently permits only one effective entitlement row per account. |
| `public.entitlements` | `plan` | `text` constrained `free | pro` | Service role | Browser/native app entitlement resolver | Own-row only; not public | No | Yes as effective access, but not as provider state | Single global field can be overwritten by one provider even if another provider is active. Blocker before Apple billing. |
| `public.entitlements` | `status` | `text` constrained `free | trialing | active | past_due | canceled` | Service role | Browser/native app entitlement resolver and account UI | Own-row only; not public | Not by name, but Stripe-shaped today | Maybe as effective access status, but insufficient for multiple providers | A Stripe `past_due` or canceled state currently downgrades global access. |
| `public.entitlements` | `stripe_customer_id` | `text` nullable | `stripe-checkout`, `stripe-webhook` | Portal function, webhook customer lookup, browser owner read | Own-row only; not public | Yes | No | Should not be reused for Apple ownership. Consider moving provider identifiers out of owner-visible effective entitlement row. |
| `public.entitlements` | `stripe_subscription_id` | `text` nullable | `stripe-webhook` | Account UI, webhook stale-event guard, owner-visible diagnostics | Own-row only; not public | Yes | No | Single current subscription id cannot represent parallel Stripe and Apple subscriptions. |
| `public.entitlements` | `stripe_price_id` | `text` nullable | `stripe-webhook` | Account/support diagnostics and tests | Own-row only; not public | Yes | No | Price ids are public-ish identifiers but provider-specific. Do not expose as analytics parameters. |
| `public.entitlements` | `stripe_status` | `text` nullable | `stripe-webhook` | Account UI, webhook stale-event guard, tests | Own-row only; not public | Yes | No | Provider status is separate from effective app access but currently stored beside it. |
| `public.entitlements` | `cancel_at_period_end` | `boolean` nullable | `stripe-webhook` | Membership display and owner notifications | Own-row only; not public | Conceptually generic, but currently Stripe-sourced | Maybe, if provider-neutralized | Needs provider attribution before Apple subscriptions. |
| `public.entitlements` | `current_period_end` | `timestamptz` nullable | `stripe-webhook` | Membership display and owner notifications | Own-row only; not public | Conceptually generic, but currently Stripe-sourced | Maybe, if provider-neutralized | Current code does not use it to keep Pro during `past_due`; semantics need product decision. |
| `public.entitlements` | `updated_at` | `timestamptz` | Service role | Browser owner read/tests | Own-row only; not public | No | Yes | Not enough to reconcile provider event ordering by itself. |
| `public.stripe_webhook_events` | `event_id` | `text` primary key | `stripe-webhook` | Service role only | No | Yes | No | Good Stripe replay ledger; Apple needs its own event/transaction ledger. |
| `public.stripe_webhook_events` | `type` | `text` | `stripe-webhook` | Service role only | No | Yes | No | Stripe event taxonomy only. |
| `public.stripe_webhook_events` | `status` | `text` constrained `processed | ignored | error` | `stripe-webhook` | Service role only | No | Yes | No | No raw payload stored, which is privacy-positive but limits later manual reconstruction. |
| `public.stripe_webhook_events` | `user_id` | `uuid` nullable | `stripe-webhook` | Service role only | No | No | Maybe for provider-event tables | Delete behavior is `set null`, preserving ledger without account linkage. |
| `public.stripe_webhook_events` | `stripe_customer_id` | `text` nullable | `stripe-webhook` | Service role only | No | Yes | No | Provider-specific identifier. |
| `public.stripe_webhook_events` | `stripe_subscription_id` | `text` nullable | `stripe-webhook` | Service role only | No | Yes | No | Provider-specific identifier. |
| `public.stripe_webhook_events` | `received_at` | `timestamptz` | Database default | Service role only | No | No | Yes as pattern | Current code does not write an error ledger row when processing throws. |
| `public.stripe_webhook_events` | `processed_at` | `timestamptz` nullable | `stripe-webhook` | Service role only | No | No | Yes as pattern | Records after processing; a successful entitlement write followed by ledger write failure can be retried. |
| `public.stripe_webhook_events` | `error` | `text` nullable | Intended service role | Service role only | No | No | Yes as pattern | Current webhook code returns 500 on processing error but does not appear to persist this field. |

## 10. Risks and architectural gaps

### Blocker before Apple billing

- **Single global entitlement row is Stripe-shaped.** `plan`, `status`, and period/cancellation fields are the effective app access and are written by Stripe webhook code. A future Stripe cancellation, payment failure, or stale event could overwrite access that Apple should still grant.
- **No provider-neutral subscription ownership model exists.** There is no table for provider, environment, product id, original transaction id, provider subscription id, expires-at, revocation, or ownership conflict resolution.
- **No Apple transaction/server-notification ledger exists.** `stripe_webhook_events` is a good Stripe replay ledger but cannot represent App Store Server Notifications, StoreKit transaction ids, or Apple notification history.
- **Native management path is intentionally absent.** Existing native UI blocks Stripe checkout/portal. Before App Store release with IAP, native users need an Apple-compliant purchase, restore, and management path without routing around App Store rules.
- **Cross-provider precedence is undefined.** There is no documented rule for accounts that have both Stripe and Apple purchases, or for one provider expiring while another remains active.

### Important but not blocking

- **`past_due` immediately maps to Free.** This may be correct for Stripe launch, but it should be reconsidered before Apple grace-period or billing-retry states are introduced.
- **Webhook event recording happens after processing.** If an entitlement write succeeds and recording the Stripe event fails, a Stripe retry can reprocess the event. The upsert is mostly idempotent, but owner notifications or future side effects could repeat.
- **Processing errors are not persisted in `stripe_webhook_events.error`.** The schema has an error field, but current processing errors return 500 without writing an error ledger row.
- **Refund and dispute behavior is not explicit.** The webhook handles subscription and invoice events, not standalone refund/dispute events. Current behavior depends on Stripe subscription status changes reaching the existing handlers.
- **Account deletion with active external subscriptions needs policy.** `profiles -> entitlements` cascades delete locally, but external Stripe subscriptions are not canceled by that cascade.
- **Provider identifiers are owner-row-visible.** Authenticated users can select their own `stripe_*` fields. That is not public, but future provider identifiers may be better kept in service-role-only tables with a separate effective access view.
- **Native offline mode can preserve stale Pro until sync resumes.** This is good for interrupted play, but provider revocation will not be visible while offline.
- **Stripe API version is pinned.** Edge Functions use Stripe SDK `16.12.0` and API version `2024-06-20`; any upgrade should be deliberate and followed by billing QA.
- **Sandbox/live separation remains operationally critical.** Stale Stripe customer recovery fixed one failure class, but Apple/Stripe dual-provider work must avoid mixing test/live or sandbox/production identifiers.

### Existing design already sufficient for current Stripe-only production

- **Browser code cannot write Pro.** Authenticated users have select-only access to `entitlements`; writes use service-role Edge Functions.
- **Missing entitlement rows resolve safely to Free.**
- **Checkout and Portal require a signed-in Supabase session.**
- **Checkout request payload is narrow.** It accepts only a monthly/yearly plan, not price ids or user-provided billing identifiers.
- **Webhook signatures are verified.**
- **Stripe replay handling exists through `stripe_webhook_events.event_id`.**
- **Stale inactive Stripe events are guarded when a newer active/trialing subscription is already recorded.**
- **Native builds do not start Stripe checkout, open Stripe Portal, load GTM/paid pixels, or show marketing consent UI.**
- **Checkout analytics avoids payment/session/user identifiers.**

### Unknown and requiring later verification

- Whether production Supabase has every latest migration and RLS policy applied exactly as source-controlled.
- Whether live-mode failed-payment, refund, dispute, and portal cancellation flows have all been rerun after the latest production split.
- Whether Apple legal-entity, Paid Apps Agreement, banking/tax, and product setup will impose additional metadata or support-copy requirements.
- Which StoreKit transaction identifier should become the durable ownership key.
- Whether web Stripe and iOS Apple subscriptions can coexist for one account or must be mutually exclusive in UI policy.

## 11. Questions deferred to Checkpoint 5A-2

- What is the provider-neutral entitlement schema shape: effective entitlements plus provider subscription records, or another model?
- Which Apple identifiers are required: subscription group id, product id(s), original transaction id, app account token, web order line item id, environment, storefront, expiration, revocation, grace period, and renewal state?
- How should the app derive effective Pro when Stripe and Apple records disagree?
- What are the exact rules for restore purchases across accounts and devices?
- How should account deletion behave when a user has an active Stripe or Apple subscription?
- What should happen if an Apple purchase is made while a Stripe subscription is already active, or vice versa?
- Where should purchase success analytics be emitted without double-counting: webhook/server notification, server verification response, or another idempotent source?
- What App Store Server Notification endpoint and event ledger should be added, and how should it authenticate and deduplicate events?
- What support/admin tooling is needed to inspect provider state without exposing sensitive identifiers to the browser?
- How should staging/test builds separate Stripe test mode from Apple sandbox transactions?
- What explicit App Store copy and account-management flows are required before build 2?

## 12. Explicit non-actions taken

This checkpoint did not:

- Choose a StoreKit integration approach.
- Install an IAP dependency.
- Add Swift, StoreKit, JavaScript purchase, or restore-purchase code.
- Add database migrations or modify the Supabase schema.
- Add or deploy Edge Functions.
- Modify Stripe Checkout, Customer Portal, webhook, products, prices, or production data.
- Modify Supabase dashboard settings, secrets, RLS, or production data.
- Accept Apple agreements, create Apple products, configure App Store Server Notifications, create App Store Server API keys, or change App Store Connect.
- Upload a binary, increment version/build, change signing, create a PR, merge, deploy, or modify Android.
- Add speculative tests or change app behavior.
