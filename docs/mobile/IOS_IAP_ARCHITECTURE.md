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

---

Checkpoint 5A-2 status: architecture design only. This section selects the recommended Apple subscription integration
approach and proposes the provider-neutral entitlement model. It does not add StoreKit code, migrations, Edge Functions,
Apple products, App Store Server Notification endpoints, or production configuration.

## 13. Integration options evaluated

| Option | Description | Fit for Can You Geo | Strengths | Risks and costs |
| --- | --- | --- | --- | --- |
| A. First-party StoreKit 2 Capacitor plugin | Add a small source-controlled iOS Capacitor plugin that wraps only the StoreKit 2 actions Can You Geo needs. The backend still verifies transactions and owns entitlements. | Best fit now. The native app already has controlled Capacitor bridges, Supabase Auth, durable native session storage, strict deep-link handling, and backend-owned billing boundaries. | Minimal client surface, direct control of `appAccountToken`, no new entitlement vendor, easiest to audit against App Store requirements, and least disruptive to existing Stripe/Supabase ownership. | Requires Swift maintenance, App Store Server API work, App Store Server Notification handling, and a separate future Google Play Billing checkpoint. |
| B. Maintained Capacitor IAP bridge | Use a maintained bridge such as `capacitor-plugin-cdv-purchase` for StoreKit 2 and Google Play Billing. Current npm metadata lists version `13.18.0` with `@capacitor/core` peer support for Capacitor 6, 7, and 8. | Viable fallback, not recommended for the first Can You Geo Apple implementation. | Cross-platform purchase abstraction, MIT license, existing restore-purchase concepts, and Android coverage later. | Broader API than needed, dependency/release risk, many edge cases still require Can You Geo backend verification, and reviewed package docs did not confirm the exact `appAccountToken` ownership path needed for strict Supabase-account binding. |
| C. RevenueCat or equivalent | Outsource store purchase collection, receipt validation, subscription state, webhooks, and entitlement reporting to a subscription platform. Current `@revenuecat/purchases-capacitor` metadata lists version `13.2.3` with `@capacitor/core >=8.0.0`. | Strong product if Can You Geo wants a managed cross-platform subscription vendor, but not the best fit for this checkpoint. | Mature StoreKit/Google abstraction, webhooks, customer info callbacks, restore handling, dashboards, and cross-platform tooling. | Introduces another billing authority beside Stripe and Supabase, adds vendor lock-in/cost/data-processing review, complicates migration/rollback from the current Stripe-owned entitlement model, and may obscure provider-state details needed for support and audits. |

Primary references used for this design:

- Apple StoreKit `Product.PurchaseOption.appAccountToken(_:)`: `https://developer.apple.com/documentation/storekit/product/purchaseoption/appaccounttoken(_:)`
- Apple App Store Server Notifications: `https://developer.apple.com/documentation/appstoreservernotifications`
- `capacitor-plugin-cdv-purchase` npm metadata: `https://www.npmjs.com/package/capacitor-plugin-cdv-purchase`
- RevenueCat Capacitor SDK npm metadata: `https://www.npmjs.com/package/@revenuecat/purchases-capacitor`
- Current app dependency baseline: Capacitor core/iOS/Android/CLI `8.4.1`, Capacitor App `8.1.0`.

## 14. Recommended integration approach

Recommend **Option A: a first-party StoreKit 2 Capacitor plugin backed by Supabase service-role verification**.

The client plugin should be deliberately small:

- fetch available Pro products from StoreKit;
- start purchase for a signed-in user only;
- pass the Supabase user UUID as StoreKit `appAccountToken`;
- return sanitized purchase/restore results to browser code;
- never decide Pro access locally;
- never log raw signed transactions, callback URLs, auth tokens, email addresses, or customer identifiers;
- hand any transaction identifiers or signed transaction data to a trusted Supabase Edge Function for verification;
- finish transactions only after the backend records the verified state or returns a safe idempotent already-processed result.

The backend remains the subscription authority:

- App Store Server API verification confirms the transaction and renewal status.
- App Store Server Notifications V2 provide renewal, cancellation, refund, revocation, billing-retry, and grace-period changes.
- Supabase service-role code writes provider subscription records, provider event records, and the effective entitlement summary.
- Browser/native app code reads only the effective entitlement summary through RLS.

Why this is the right default now:

- Can You Geo already owns Supabase Auth, Stripe webhooks, entitlement resolution, native route handling, and native release guardrails.
- Apple explicitly supports associating a purchase with an app account by providing a UUID through `appAccountToken`, which matches Supabase Auth user ids.
- A small first-party bridge keeps the iOS purchase boundary easier to review for App Store compliance and privacy.
- It avoids placing RevenueCat or another vendor in the middle of Stripe-to-Apple entitlement reconciliation.
- It avoids adopting a broad IAP bridge before Can You Geo knows the exact support, restore, and reconciliation behavior it wants.

What would change the recommendation:

- The team cannot maintain a small Swift Capacitor plugin.
- Google Play Billing must launch at the same time as iOS and a single cross-platform client abstraction becomes more valuable than first-party control.
- StoreKit 2 or App Store Server API validation proves substantially more complex than expected during 5A-3.
- A managed vendor is explicitly approved for cost, data-processing, support workflow, migration, and lock-in tradeoffs.
- The chosen maintained bridge proves, in source and runtime tests, that it supports strict `appAccountToken` ownership, server-side verification, minimal logging, Capacitor 8, and the exact restore semantics Can You Geo needs.

## 15. Rejected approaches

Option B is rejected for this first Apple checkpoint because it adds a broad third-party purchase abstraction while Can You Geo still needs to build backend verification, event dedupe, entitlement conflict handling, restore ownership rules, and support workflows. It remains a reasonable future fallback, especially if Android Play Billing needs to share client-side purchase code, but it should not be adopted until `appAccountToken` behavior and sensitive payload handling are verified in source and runtime tests.

Option C is rejected for this checkpoint because Can You Geo already has Stripe web billing and a Supabase-owned entitlement model. RevenueCat would be useful if Can You Geo wanted a managed subscription platform and dashboard, but it would also become a second entitlement authority that must be reconciled with Stripe. That adds vendor and migration risk before the app has even validated the minimal Apple purchase flow.

Do not implement external purchase links, alternative payment APIs, or browser Stripe checkout inside the iOS app. Native iOS Pro purchase must use Apple IAP until an explicitly approved legal/App Store review says otherwise.

## 16. Proposed Apple product model

| Item | Recommendation | Notes |
| --- | --- | --- |
| Subscription group reference | `Can You Geo Pro` | Create one auto-renewable subscription group in App Store Connect. The exact Apple group id is assigned by Apple and should be recorded later. |
| Monthly product display name | Can You Geo Pro Monthly | One Pro entitlement tier. |
| Monthly product id | `com.canyougeo.pro.monthly` | Candidate id. Do not create until App Store Connect product setup checkpoint. |
| Annual product display name | Can You Geo Pro Annual | Same Pro entitlement tier, annual duration. |
| Annual product id | `com.canyougeo.pro.annual` | Candidate id. |
| Levels | One level: Pro | Monthly and annual should be equivalent access, not separate access levels. |
| Family Sharing | Off for version 1 unless explicitly approved | Simpler account ownership and `appAccountToken` support. Reconsider only with clear support/account-sharing policy. |
| Intro trials/offers | Off for version 1 unless explicitly approved | Avoids additional eligibility, analytics, refund, and support complexity. |
| Grace period | Enable only after 5A-3 confirms App Store Connect and resolver handling | The proposed resolver supports `grace_period`, but product configuration should wait for backend notification handling. |
| Billing retry | Supported by schema and resolver | Access depends on whether Apple reports an active grace period. |
| Pricing parity | Target customer-facing parity with web where commercially practical | Web is `$3.99/month` and `$29.99/year`. Apple proceeds are lower after Apple commission, so exact net parity is not expected. |
| Storefront pricing | Use Apple price tiers selected during product setup | Record final storefront decisions in a later release checklist. |

Do not create Apple products in this checkpoint.

## 17. Provider-neutral billing schema

Recommended model:

- Keep provider subscription records in a service-role-only schema.
- Keep provider event/replay records in a service-role-only schema.
- Keep one browser-readable effective entitlement summary per user.
- Keep optional immutable entitlement history for support and reconciliation.
- Preserve the existing `public.entitlements` row during migration so current app reads remain stable.

Recommended schemas:

- `billing`: private application schema for provider records and event ledgers. Do not expose through Supabase API roles.
- `public`: user-readable effective summaries only, protected by RLS.

Recommended tables:

- `billing.provider_subscriptions`
- `billing.provider_events`
- `public.entitlements` as the compatibility/effective summary during migration
- optional `billing.entitlement_history`

Long-term direction for `public.entitlements`:

- It should remain the app-facing effective summary until a migration explicitly replaces it with a view or `public.entitlement_summaries`.
- Stripe-specific columns should be treated as legacy compatibility columns after provider-neutral records exist.
- New provider identifiers should not be added to `public.entitlements`.
- Browser/native code should never read raw Apple original transaction ids, transaction ids, signed payloads, purchase tokens, Stripe subscription ids for decision-making, or Google purchase tokens.

## 18. Table and column definitions

### `billing.provider_subscriptions`

Service-role-owned normalized provider subscription state.

| Column | Type | Purpose |
| --- | --- | --- |
| `id` | `uuid primary key` | Internal subscription record id. |
| `user_id` | `uuid null references public.profiles(id) on delete set null` | Current Can You Geo account owner. Nullable to retain billing audit after deletion without exposing profile data. |
| `provider` | text enum/check | `stripe`, `apple`, or future `google_play`. |
| `environment` | text enum/check | Stripe: `test` or `live`; Apple: `sandbox` or `production`; Google: `test` or `production`. Enforce provider-specific allowed values. |
| `product_tier` | text | `pro` for the current product line. |
| `provider_product_ref` | text | Stripe price id, Apple product id, or Google product id/base-plan reference. |
| `provider_customer_ref` | text null | Stripe customer id or provider account/customer reference when applicable. Not used for browser access decisions. |
| `provider_subscription_ref` | text null | Stripe subscription id, Apple web order line item id or subscription reference, or Google subscription reference. |
| `provider_original_transaction_ref` | text null | Apple original transaction id or equivalent durable purchase-chain id. |
| `provider_transaction_ref` | text null | Latest verified transaction/renewal id when applicable. |
| `app_account_token` | `uuid null` | Supabase user UUID provided to StoreKit purchases. |
| `status` | text enum/check | Canonical status from section 20. |
| `auto_renews` | boolean null | Provider-reported renewal flag. |
| `cancel_at_period_end` | boolean null | Provider reports cancellation but paid access continues through period end. |
| `started_at` | timestamptz null | First known purchase/start timestamp. |
| `current_period_start` | timestamptz null | Current entitlement period start. |
| `current_period_end` | timestamptz null | Current paid-through/expiration boundary. |
| `grace_period_ends_at` | timestamptz null | Access-granting Apple/Google grace boundary. |
| `billing_retry_started_at` | timestamptz null | Provider billing retry start. |
| `expires_at` | timestamptz null | Normalized expiration when distinct from `current_period_end`. |
| `revoked_at` | timestamptz null | Provider revocation timestamp. |
| `refunded_at` | timestamptz null | Refund timestamp when provider indicates entitlement should be removed. |
| `paused_at` | timestamptz null | Future Google pause support. |
| `last_verified_at` | timestamptz null | Last successful server-side verification against provider. |
| `last_event_at` | timestamptz null | Latest provider event time applied to this row. |
| `last_provider_event_ref` | text null | Last deduped provider event id/notification id. |
| `reconciliation_status` | text | `current`, `needs_verification`, `verification_failed`, `event_pending`, `manual_review`, or `superseded`. |
| `created_at` | timestamptz | Database default. |
| `updated_at` | timestamptz | Service-role update timestamp. |

Required constraints and indexes:

- Unique `(provider, environment, provider_subscription_ref)` where `provider_subscription_ref is not null`.
- Unique `(provider, environment, provider_original_transaction_ref)` where `provider_original_transaction_ref is not null`.
- Unique `(provider, environment, provider_transaction_ref)` where `provider_transaction_ref is not null`.
- Index `(user_id)`.
- Index `(provider, environment, provider_customer_ref)` where `provider_customer_ref is not null`.
- Index `(status, current_period_end)`.
- Index `(reconciliation_status)`.
- Check that `provider = 'stripe'` only uses `environment in ('test', 'live')`.
- Check that `provider = 'apple'` only uses `environment in ('sandbox', 'production')`.
- Check that `provider = 'google_play'` only uses `environment in ('test', 'production')`.

### `billing.provider_events`

Service-role-only replay and reconciliation ledger.

| Column | Type | Purpose |
| --- | --- | --- |
| `id` | `uuid primary key` | Internal event row id. |
| `provider` | text enum/check | `stripe`, `apple`, or future `google_play`. |
| `environment` | text enum/check | Provider-specific environment. |
| `provider_event_ref` | text | Stripe event id, Apple notification UUID/JWS id, verified transaction id, or Google notification id. |
| `event_type` | text | Provider event/notification type. |
| `occurred_at` | timestamptz null | Provider event occurrence time. |
| `received_at` | timestamptz | Database default. |
| `processed_at` | timestamptz null | Processing completion timestamp. |
| `processing_status` | text | `processed`, `ignored`, `error`, `retry_pending`, or `manual_review`. |
| `attempt_count` | integer | Incremented on retries. |
| `last_error_code` | text null | Sanitized error code only, not raw provider payload. |
| `related_user_id` | `uuid null references public.profiles(id) on delete set null` | Matched account if known. |
| `provider_subscription_id` | `uuid null references billing.provider_subscriptions(id)` | Normalized subscription record affected. |
| `provider_customer_ref` | text null | Provider customer/account reference if needed for matching. |
| `provider_subscription_ref` | text null | Provider subscription reference if known. |
| `provider_original_transaction_ref` | text null | Durable purchase-chain id if known. |
| `provider_transaction_ref` | text null | Transaction id if known. |
| `payload_hash` | text null | Hash of the raw payload/JWS for support dedupe without storing raw sensitive payloads in user-readable rows. |
| `created_at` | timestamptz | Database default. |
| `updated_at` | timestamptz | Service-role update timestamp. |

Required constraints and indexes:

- Unique `(provider, environment, provider_event_ref)`.
- Index `(provider, environment, provider_original_transaction_ref)` where present.
- Index `(related_user_id)`.
- Index `(processing_status, received_at)`.
- Raw signed Apple transactions, raw receipts, full webhook payloads, purchase tokens, email addresses, and auth/session values must not be stored in user-readable tables.

### `public.entitlements`

Existing app-facing effective summary.

During the migration:

- Keep `user_id`, `plan`, `status`, and the existing capability semantics so current app code continues to resolve Guest/Free/Pro safely.
- Add provider-neutral summary columns only in a later migration if needed:
  - `effective_status`
  - `effective_current_period_end`
  - `management_provider`
  - `management_providers`
  - `has_multiple_active_providers`
  - `requires_billing_attention`
  - `computed_at`
  - `source_subscription_id`
- Do not add Apple transaction ids, Apple original transaction ids, signed payloads, Google purchase tokens, or raw provider payloads to this table.
- Treat current `stripe_*` columns as legacy compatibility fields until web Portal and account UI are migrated to provider-neutral management copy.

### `billing.entitlement_history` optional

Immutable service-role-only audit rows for support/reconciliation.

Recommended columns:

- `id uuid primary key`
- `user_id uuid null references public.profiles(id) on delete set null`
- `previous_plan text null`
- `previous_status text null`
- `new_plan text not null`
- `new_status text not null`
- `reason text not null`
- `source_provider text null`
- `source_provider_event_id uuid null references billing.provider_events(id)`
- `source_subscription_id uuid null references billing.provider_subscriptions(id)`
- `computed_at timestamptz not null`
- `summary_hash text null`

## 19. RLS and security model

Security goals:

- Browser/native clients may read only their own effective entitlement summary.
- Browser/native clients may not insert, update, or delete entitlement or provider billing state.
- Provider identifiers and event ledgers are service-role-only.
- One provider's event cannot update another provider's record.
- One user's purchase cannot be silently reassigned to another user.

Recommended policies:

- Enable and force RLS on any `public` billing summary table.
- `public.entitlements`: authenticated users may `select` where `auth.uid() = user_id`; no authenticated `insert`, `update`, or `delete`; no anonymous access.
- `billing.provider_subscriptions`: no anon/auth grants; service-role only.
- `billing.provider_events`: no anon/auth grants; service-role only.
- `billing.entitlement_history`: no anon/auth grants; service-role only.

Trusted writers:

- Stripe webhook Edge Function.
- Apple App Store Server Notification Edge Function.
- Apple transaction verification/restore Edge Function.
- Future Google Play notification/verification Edge Function.
- Reviewed admin/support reconciliation scripts using service-role credentials.

Cross-account prevention:

- Unique provider/environment/original-transaction constraints prevent the same Apple purchase chain from being assigned to two users.
- If a restore or server notification references an already-owned original transaction for a different `user_id`, do not reassign automatically. Mark `manual_review`, keep effective access unchanged, and show a safe support message.
- Use Supabase Auth user UUID as Apple `appAccountToken` for purchases. Treat mismatched `appAccountToken` as a support/manual-review condition, not as a browser-resolvable conflict.

Deleted users and retention:

- Provider records should use `on delete set null`, not cascade, so accounting/refund/support audit is retained without keeping a live profile relationship.
- Do not preserve email addresses or raw auth identifiers in provider event rows.
- Keep retention periods aligned with legal/accounting review before broad paid launch.

## 20. Canonical subscription status vocabulary

| Status | Grants Pro? | Required timestamps | User-facing meaning | Reconciliation need | Override behavior |
| --- | --- | --- | --- | --- | --- |
| `active` | Yes | `current_period_end` or verified open-ended period | Pro is active and renewing unless `auto_renews` says otherwise. | Normal periodic verification. | Another active provider can also grant Pro. |
| `cancelled_active_until_period_end` | Yes until `current_period_end` | `current_period_end`, cancellation flag/event time when available | Subscription is canceled but paid access continues until the period ends. | Verify at period end. | Must not remove access from another active provider. |
| `grace_period` | Yes until `grace_period_ends_at` | `grace_period_ends_at`, provider event time | Billing issue, but Apple/Google grace access is still active. | High priority follow-up before grace expires. | Another active provider continues Pro even after grace ends. |
| `billing_retry` | No by default unless paired with `grace_period` | `billing_retry_started_at`, optional `current_period_end` | Payment needs attention and access is not currently verified. | High priority reconciliation. | Does not override another active/grace provider. |
| `pending` | No | `started_at` or `last_event_at` | Purchase or restore is awaiting trusted verification. | Must verify before granting. | Never grants Pro by itself. |
| `expired` | No | `expires_at` or `current_period_end` | Subscription period ended. | Low priority unless user disputes. | Does not override another active provider. |
| `revoked` | No | `revoked_at` | Provider revoked access. | Support/review if unexpected. | Does not override another active provider. |
| `refunded` | No | `refunded_at` | Purchase was refunded and access removed for that provider. | Support/review if unexpected. | Does not override another active provider. |
| `paused` | No by default | `paused_at`, optional resume timestamp | Future Google paused subscription support. | Verify before resuming. | Does not override another active provider. |
| `unknown_needs_reconciliation` | No new grant; preserve existing effective access only until a known paid-through boundary if one exists | `last_verified_at`, `current_period_end` when known | Billing state needs verification. | High priority. | Never downgrades another verified provider. |

## 21. Effective entitlement resolver

Core rule: **a user is Pro if at least one independently verified provider subscription currently grants Pro**.

Resolver inputs:

- all non-superseded `billing.provider_subscriptions` rows for the user;
- current timestamp;
- provider environment;
- status-specific paid-through/grace timestamps;
- reconciliation status and last verification timestamps.

Resolver output:

- `plan = 'pro'` when any provider grants Pro;
- `plan = 'free'` when no provider grants Pro;
- effective status for account copy;
- management provider metadata;
- billing-attention flag;
- whether multiple providers are active;
- source subscription id(s) for service-role support use only.

State handling:

- Active Stripe only: grant Pro while Stripe row is `active` or equivalent verified Pro state.
- Active Apple only: grant Pro while Apple row is `active`.
- Active Stripe and Apple: grant Pro, set `has_multiple_active_providers = true`, and show both management paths.
- Canceled but paid-through Stripe: grant Pro until `current_period_end`, then expire if no newer active state arrives.
- Canceled but paid-through Apple: grant Pro until Apple expiration/current-period end, then expire if no renewal state arrives.
- Apple grace period: grant Pro until `grace_period_ends_at`; show billing attention.
- Apple billing retry without grace: do not grant Pro from Apple, but do not affect Stripe or another active provider.
- Stripe payment failure: preserve current launch policy by mapping failed payment to no Pro for Stripe unless a later product decision approves a Stripe grace window.
- Expired/refunded/revoked provider: no Pro from that provider.
- Out-of-order events: store the event, but only mutate provider state if it is newer than the applied provider event or a fresh provider verification confirms the downgrade/upgrade.
- Provider unavailable: do not mutate provider state; mark reconciliation needed. Keep a previously verified grant only until the known paid-through/grace boundary.
- Stale verification: if `last_verified_at` is stale but the known paid-through boundary is still future, grant Pro with `requires_billing_attention = true`; after the boundary, no grant without re-verification.
- One provider removed while another is active: Pro remains active from the remaining provider.
- Unknown state: no new grant; do not downgrade a separate verified provider.

The resolver should be idempotent and safe to rerun after every provider event, manual reconciliation, restore attempt, or scheduled verification job.

## 22. Management-provider selection

| Effective state | Recommended management provider | User-facing behavior |
| --- | --- | --- |
| No provider grants Pro | `none` | Show the appropriate purchase CTA for the current platform. |
| Stripe grants Pro only | `stripe` | Website can open Stripe Portal. Native iOS should say subscription is managed on the website and must not open Stripe checkout in-app. |
| Apple grants Pro only | `apple` | iOS should use Apple's subscription management flow/copy. Website should say subscription is managed through Apple. |
| Future Google grants Pro only | `google_play` | Android should use Play subscription management flow/copy. Website should say subscription is managed through Google Play. |
| Multiple providers grant Pro | `multiple` | Show a billing-attention/support state and list the provider management paths without auto-canceling either provider. |
| One provider paid-through canceling and another active | Active provider primary plus secondary notice | Keep Pro. Show that one subscription remains paid-through and another continues. |
| Unknown/reconciliation only | `none` or last known provider with warning | Do not expose purchase actions that could create a duplicate until reconciliation finishes, unless product policy explicitly allows it. |

## 23. Account-linking rules

Native purchase rules:

- Require a Supabase session before showing Apple purchase actions.
- Block signed-out Apple purchases. Do not create anonymous StoreKit purchases.
- Use the Supabase Auth user UUID as StoreKit `appAccountToken`.
- Do not use email address, display name, Stripe customer id, or local device id as the Apple account key.

Restore rules:

- Signed-in restore fetches/verifies Apple transactions and matches `appAccountToken` and original transaction id.
- If the original transaction is already assigned to the same user, refresh provider state and recompute entitlement.
- If the original transaction is already assigned to another live user, do not reassign automatically. Mark manual review and show safe support copy.
- If the prior user was deleted, preserve the audit record and require a support-approved reassignment policy before granting.
- Switching accounts on one device must not silently move an Apple subscription.
- Recreated accounts should not automatically inherit old Apple purchases unless an explicit, audited support flow approves it.

Support rules:

- Support tooling may show provider names, product ids, status, period dates, and sanitized event ids.
- Support tooling must not expose raw signed transactions, receipts, session tokens, recovery tokens, private keys, or user passwords.

## 24. Duplicate-subscription prevention

Default product policy:

- If a user already has active Stripe Pro and opens iOS upgrade, do not offer Apple purchase by default. Explain that Pro is active and managed on the website. Offer restore only.
- If a user already has active Apple Pro and opens web upgrade, do not start Stripe checkout by default. Explain that Pro is active and managed through Apple.
- If a user already has active Apple Pro and tries to purchase Apple again, rely on StoreKit subscription-group behavior and also block redundant app UI where possible.
- If both Stripe and Apple are active, keep Pro and show a billing-attention state that tells the user to manage each provider separately.
- Never cancel one provider automatically in response to another provider becoming active.
- Never let one provider's cancellation, refund, payment failure, or revocation remove access granted by another independently verified provider.

Allowed exceptions require explicit later approval:

- A user intentionally switches from Stripe to Apple after canceling Stripe.
- A support agent manually resolves duplicate subscriptions.
- A migration offer or promo is created with counsel/App Store review.

## 25. Stripe-to-provider-neutral migration plan

Phase 0: design approval.

- Approve this architecture, open decisions, product ids, and Apple account-linking policy.
- No runtime changes.

Phase 1: additive schema.

- Add `billing.provider_subscriptions`, `billing.provider_events`, and optional `billing.entitlement_history`.
- Keep existing `public.entitlements` behavior unchanged.
- Add structure/RLS tests for the new schema.

Phase 2: Stripe backfill and dual-write.

- Backfill current Stripe entitlement rows into `billing.provider_subscriptions`.
- Keep `stripe_webhook_events` as the existing Stripe replay ledger while dual-writing new provider events.
- Stripe webhooks continue updating `public.entitlements`.
- A dry-run resolver compares provider-neutral output to the current entitlement row without changing app behavior.

Phase 3: resolver writes effective summary.

- Stripe webhooks update provider records and invoke the provider-neutral resolver.
- Resolver writes `public.entitlements` compatibility fields.
- App reads remain unchanged.

Phase 4: Apple backend foundation.

- Add Apple transaction verification and App Store Server Notification V2 endpoint.
- Apple events write provider records and invoke the same resolver.
- No purchase UI until sandbox verification and restore rules pass.

Phase 5: native Apple purchase UI.

- Add first-party StoreKit 2 Capacitor plugin.
- Enable signed-in Apple monthly/annual purchase and restore.
- Keep native Stripe checkout/portal disabled.

Phase 6: cleanup.

- Migrate account UI to provider-neutral management provider copy.
- Stop exposing Stripe-specific identifiers in browser-facing rows where practical.
- Decide whether `public.entitlements` remains a table, becomes a view over a new summary table, or is replaced by `public.entitlement_summaries`.

## 26. Rollback strategy

Rollback principles:

- Keep current Stripe-only production behavior working until Apple purchase UI is explicitly launched.
- Make all schema changes additive before cutting over resolver writes.
- Keep legacy `public.entitlements` readable by the app throughout.
- Do not delete Stripe columns or `stripe_webhook_events` until provider-neutral parity has been proven.

Rollback by phase:

- Phase 1 rollback: leave additive tables unused or drop them in a reviewed rollback migration if no production data depends on them.
- Phase 2 rollback: disable dual-write/backfill job; keep Stripe webhooks writing legacy entitlements.
- Phase 3 rollback: disable provider-neutral resolver writes and return to direct Stripe entitlement writes.
- Phase 4 rollback: disable Apple notification/verification functions; existing Stripe access remains unchanged.
- Phase 5 rollback: hide Apple purchase/restore UI with a native billing feature flag; continue honoring already verified Apple subscriptions only if backend state is trusted, or mark them for manual reconciliation if not.
- Any Apple incident: do not alter Stripe provider records; never downgrade a Stripe-active user because of Apple rollback.

## 27. Open decisions for user approval

Default recommendations unless changed:

- Use first-party StoreKit 2 Capacitor plugin.
- Use subscription group reference `Can You Geo Pro`.
- Use candidate product ids `com.canyougeo.pro.monthly` and `com.canyougeo.pro.annual`.
- Keep Family Sharing off for version 1.
- Keep trials and introductory offers off for version 1.
- Use Supabase Auth UUID as StoreKit `appAccountToken`.
- Require sign-in before purchase.
- Block signed-out restore from granting access.
- Keep `public.entitlements` as the app-facing effective summary during migration.
- Keep native Stripe checkout/portal unavailable.
- Prevent duplicate Stripe/Apple purchases in UI by default.
- Preserve current Stripe payment-failure policy unless separately approved.

Decisions still needing explicit approval:

- Final App Store prices/tiers and local storefront policy.
- Whether Apple grace period should be enabled at launch.
- Whether a user may intentionally switch providers without support involvement.
- Whether support can manually reassign Apple original transactions after account deletion.
- How long provider events and entitlement history should be retained.
- Whether to build admin/support tooling before or after Apple sandbox purchase testing.

## 28. Questions deferred to Checkpoint 5A-3

- Exact Apple App Store Server API authentication and key-management plan.
- Exact App Store Server Notification V2 endpoint path, CORS posture, signature/JWS validation, and replay handling.
- Exact Apple transaction fields to persist after reviewing sandbox payloads.
- Exact Swift plugin API shape and TypeScript types.
- Exact StoreKit sandbox test matrix for purchase, renewal, cancellation, billing retry, refund, restore, and account switching.
- Exact Supabase migration DDL and RLS tests.
- Exact resolver implementation and dry-run parity tests.
- Exact account UI copy for Stripe-only, Apple-only, duplicate-provider, grace-period, billing-retry, and manual-review states.
- Exact purchase analytics source for idempotent `purchase`/subscription-success events without browser double-counting.
- Exact production launch sequence after Apple products and server notifications exist.

## 29. Explicit non-actions taken in 5A-2

This checkpoint did not:

- Accept Apple agreements, banking, tax, or Paid Apps setup.
- Create Apple subscription groups, products, App Store Server API keys, or notification URLs.
- Modify App Store Connect, Apple Developer, Stripe, Supabase, Cloudflare, GTM, or production configuration.
- Install packages or add StoreKit, Swift, Android, migration, Edge Function, or UI code.
- Add provider-neutral schema migrations.
- Upload another binary, increment version/build, submit for review, release, create a PR, merge, or deploy.
- Change native Stripe, analytics, marketing-consent, game, auth, or entitlement runtime behavior.
