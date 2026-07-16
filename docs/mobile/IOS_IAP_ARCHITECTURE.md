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

---

Checkpoint 5A-3A status: architecture design only. This section defines the proposed native StoreKit 2 bridge contract,
client purchase state machine, and client trust boundary for a future first-party Capacitor plugin. It does not add
StoreKit code, a plugin package, TypeScript runtime code, migrations, Edge Functions, Apple products, App Store Connect
configuration, build uploads, or runtime behavior changes.

Official references used for this section:

- Capacitor plugin overview and philosophy: `https://capacitorjs.com/docs/plugins/creating-plugins`
- Capacitor iOS plugin guide: `https://capacitorjs.com/docs/plugins/ios`
- Capacitor Web/PWA plugin guide: `https://capacitorjs.com/docs/plugins/web`
- Apple StoreKit `Product.products(for:)`: `https://developer.apple.com/documentation/storekit/product/products(for:)`
- Apple StoreKit `Product.purchase(options:)`: `https://developer.apple.com/documentation/storekit/product/purchase(options:)`
- Apple StoreKit `Product.PurchaseResult`: `https://developer.apple.com/documentation/storekit/product/purchaseresult`
- Apple StoreKit `Product.PurchaseOption.appAccountToken(_:)`: `https://developer.apple.com/documentation/storekit/product/purchaseoption/appaccounttoken(_:)`
- Apple StoreKit `VerificationResult`: `https://developer.apple.com/documentation/storekit/verificationresult`
- Apple StoreKit `Transaction.updates`: `https://developer.apple.com/documentation/storekit/transaction/updates`
- Apple StoreKit `Transaction.currentEntitlements`: `https://developer.apple.com/documentation/storekit/transaction/currententitlements`
- Apple StoreKit `Transaction.unfinished`: `https://developer.apple.com/documentation/storekit/transaction/unfinished`
- Apple StoreKit `Transaction.finish()`: `https://developer.apple.com/documentation/storekit/transaction/finish()`
- Apple StoreKit `AppStore.sync()`: `https://developer.apple.com/documentation/storekit/appstore/sync()`
- Apple StoreKit `AppStore.showManageSubscriptions(in:)`: `https://developer.apple.com/documentation/storekit/appstore/showmanagesubscriptions(in:)`
- Apple StoreKit subscription period: `https://developer.apple.com/documentation/storekit/product/subscriptioninfo/subscriptionperiod`

## 30. Native plugin ownership and repository layout

Recommended ownership: **local source-controlled Capacitor plugin package** named `@canyougeo/capacitor-storekit`, kept
private to this repository.

Do not put first-party StoreKit source directly inside `ios/App/CapApp-SPM`. That package is generated by Capacitor and
its `Package.swift` currently states that it is managed by Capacitor CLI commands. Future `cap sync ios` runs should be
allowed to regenerate that package from package metadata, not from hand-edited generated files.

Recommended future layout:

```text
plugins/cgy-storekit/
  package.json
  src/
    definitions.ts
    index.ts
    web.ts
  ios/
    Package.swift
    CgyStoreKitPlugin.podspec
    Sources/CgyStoreKitPlugin/
      CgyStoreKitPlugin.swift
      CgyStoreKitService.swift
      CgyStoreKitModels.swift
      CgyStoreKitEventBuffer.swift
      CgyStoreKitErrors.swift
```

Future root app integration:

- Add the local package as a private workspace/file dependency only in the implementation checkpoint.
- Let `pnpm exec cap sync ios` register it into the generated iOS SPM/CocoaPods integration.
- Do not hand-edit `ios/App/CapApp-SPM/Package.swift` except as a diagnostic step that is reverted before commit.
- The Swift plugin class should extend `CAPPlugin` and `CAPBridgedPlugin`.
- The Swift implementation/service class should isolate StoreKit calls from Capacitor call parsing.
- The web fallback should live in `plugins/cgy-storekit/src/web.ts` and return stable unavailable responses.
- The app-facing adapter should live outside the plugin, likely in `src/lib/mobile/storekit/`, so React components never consume raw native payloads directly.
- Test doubles should live near the adapter and state machine, likely `src/lib/mobile/storekit/testDoubles.ts`.

Swift class split:

- `CgyStoreKitPlugin.swift`: Capacitor bridge, method registration, JSON serialization, listener notification, safe error mapping.
- `CgyStoreKitService.swift`: StoreKit 2 product loading, purchase, current entitlements, restore/sync, transaction observer, finishing policy.
- `CgyStoreKitModels.swift`: native normalized models matching the TypeScript contract.
- `CgyStoreKitEventBuffer.swift`: short-lived in-memory queue for transaction events emitted before JavaScript listeners attach.
- `CgyStoreKitErrors.swift`: stable diagnostic codes, no raw Apple payloads.

Registration approach:

- `identifier = "CgyStoreKitPlugin"`.
- `jsName = "CgyStoreKit"`.
- Promise-returning methods for product loading, purchase, current entitlements, restore, management, and finishing acknowledgement.
- Listener event name `storeKitTransaction`.
- Register early enough for the plugin `load()` hook to start the StoreKit transaction listener.

Android reuse without premature Android work:

- Keep TypeScript method names and normalized models provider-neutral enough that a future Play Billing plugin can implement the same adapter shape.
- The first package may contain only iOS native implementation plus a web fallback. Do not add Android native files until a Google Play checkpoint approves them.
- Product ids and provider-specific status mapping must remain allowlisted per platform.

Project-specific constraints from the current repository:

- `capacitor.config.ts` uses app id `com.canyougeo.app`, app name `Can You Geo`, and `webDir: "out"`.
- Native builds are detected with `NEXT_PUBLIC_CGY_NATIVE_APP=1`.
- Supabase sessions use native secure storage through `@aparajita/capacitor-secure-storage`; purchase state must not fall back to browser `localStorage`.
- Native builds currently disable GTM/paid analytics and marketing consent.
- Native builds currently block Stripe checkout and Customer Portal through `requestBillingActionUrl()` and billing UI guards.
- `useEntitlement()` reads `public.entitlements` and exposes `refresh()`, which future purchase flows should call after backend verification.
- iOS native QA already has Maestro guardrails asserting that native builds do not expose Stripe checkout.

## 31. TypeScript bridge contract

The proposed interface below is a contract for future implementation. It is not implemented today.

```ts
export type CgyStoreKitProductId = "com.canyougeo.pro.monthly" | "com.canyougeo.pro.annual";
export type CgyStoreKitPlatform = "ios" | "android" | "web" | "unknown";
export type CgyStoreKitEnvironment = "xcode" | "sandbox" | "production" | "unknown";

export type CgyStoreKitAvailability =
  | { available: true; platform: "ios"; environment: CgyStoreKitEnvironment }
  | {
      available: false;
      platform: CgyStoreKitPlatform;
      reason:
        | "web_build"
        | "unsupported_native_platform"
        | "storekit_unavailable"
        | "store_restricted"
        | "native_plugin_missing"
        | "unknown";
    };

export type CgySubscriptionPeriod = {
  unit: "day" | "week" | "month" | "year";
  value: number;
};

export type CgyStoreKitProduct = {
  id: string;
  allowedProductId: CgyStoreKitProductId | null;
  isAllowedProduct: boolean;
  availability: "available" | "missing" | "unexpected" | "not_subscription";
  displayName: string;
  description: string;
  displayPrice: string;
  currencyCode?: string;
  subscriptionPeriod?: CgySubscriptionPeriod;
  loadedAt: string;
  environment: CgyStoreKitEnvironment;
};

export type CgyLoadProductsResult = {
  status: "loaded" | "partial" | "unavailable" | "failed";
  products: CgyStoreKitProduct[];
  missingProductIds: CgyStoreKitProductId[];
  unexpectedProductIds: string[];
  loadedAt: string;
  code?: CgyStoreKitErrorCode;
};

export type CgyStoreKitAccountLink = {
  appAccountToken: string;
};

export type CgyStoreKitBackendCandidate = {
  provider: "apple";
  environment: CgyStoreKitEnvironment;
  productId: CgyStoreKitProductId;
  appAccountToken: string;
  signedTransactionJws: string;
  signedRenewalInfoJws?: string;
  transactionReason: "purchase" | "restore" | "update" | "current_entitlement";
};

export type CgyPurchaseInput = {
  productId: CgyStoreKitProductId;
  account: CgyStoreKitAccountLink;
  clientRequestId: string;
};

export type CgyPurchaseResult =
  | { outcome: "completed_verified"; productId: CgyStoreKitProductId; backendCandidate: CgyStoreKitBackendCandidate; clientRequestId: string }
  | { outcome: "pending"; productId: CgyStoreKitProductId; clientRequestId: string }
  | { outcome: "cancelled_by_user"; productId: CgyStoreKitProductId; clientRequestId: string }
  | { outcome: "unverified"; productId: CgyStoreKitProductId; code: CgyStoreKitErrorCode; clientRequestId: string }
  | { outcome: "product_unavailable"; productId: CgyStoreKitProductId; code: CgyStoreKitErrorCode; clientRequestId: string }
  | { outcome: "account_required"; productId: CgyStoreKitProductId; clientRequestId: string }
  | { outcome: "account_link_conflict"; productId?: CgyStoreKitProductId; code: CgyStoreKitErrorCode; clientRequestId: string }
  | { outcome: "network_error"; productId?: CgyStoreKitProductId; code: CgyStoreKitErrorCode; clientRequestId: string }
  | { outcome: "store_unavailable"; productId?: CgyStoreKitProductId; code: CgyStoreKitErrorCode; clientRequestId: string }
  | { outcome: "backend_verification_pending"; productId: CgyStoreKitProductId; clientRequestId: string }
  | { outcome: "failed"; productId?: CgyStoreKitProductId; code: CgyStoreKitErrorCode; clientRequestId: string };

export type CgyCurrentEntitlementsResult = {
  status: "found" | "none" | "unavailable" | "failed";
  candidates: CgyStoreKitBackendCandidate[];
  checkedAt: string;
  code?: CgyStoreKitErrorCode;
};

export type CgyRestoreResult =
  | { outcome: "restored"; candidates: CgyStoreKitBackendCandidate[]; checkedAt: string }
  | { outcome: "no_entitlement_found"; checkedAt: string }
  | { outcome: "belongs_to_another_account"; checkedAt: string; code: "account_link_conflict" }
  | { outcome: "verification_pending"; checkedAt: string }
  | { outcome: "user_cancelled"; checkedAt: string }
  | { outcome: "network_error" | "store_unavailable" | "failed"; checkedAt: string; code: CgyStoreKitErrorCode };

export type CgyManageSubscriptionsResult =
  | { opened: true }
  | { opened: false; code: "management_unavailable" | "unsupported_platform" | "unknown_native_error" };

export type CgyStoreKitTransactionEvent = {
  kind:
    | "new_verified_purchase"
    | "renewal_or_entitlement_update"
    | "revocation"
    | "refund"
    | "expiration"
    | "pending"
    | "unverified"
    | "reconciliation_required";
  productId?: CgyStoreKitProductId;
  environment: CgyStoreKitEnvironment;
  backendCandidate?: CgyStoreKitBackendCandidate;
  eventId: string;
  observedAt: string;
};

export interface CgyStoreKitPlugin {
  isAvailable(): Promise<CgyStoreKitAvailability>;
  loadProducts(options?: { productIds?: CgyStoreKitProductId[] }): Promise<CgyLoadProductsResult>;
  purchase(options: CgyPurchaseInput): Promise<CgyPurchaseResult>;
  currentEntitlements(): Promise<CgyCurrentEntitlementsResult>;
  restorePurchases(options: { account: CgyStoreKitAccountLink; clientRequestId: string }): Promise<CgyRestoreResult>;
  openManageSubscriptions(): Promise<CgyManageSubscriptionsResult>;
  addListener(
    eventName: "storeKitTransaction",
    listener: (event: CgyStoreKitTransactionEvent) => void
  ): Promise<PluginListenerHandle>;
}
```

Method rules:

- `isAvailable()` must distinguish native iOS with StoreKit, native iOS restricted/unavailable, ordinary web, and unsupported native platforms.
- `loadProducts()` requests only the configured allowlist by default and must explicitly report missing or unexpected products. StoreKit may omit invalid product identifiers from the response, so missing ids are meaningful.
- `purchase()` validates the product id and account token before calling StoreKit. It must prevent repeated taps from starting concurrent purchase requests.
- `currentEntitlements()` returns backend verification candidates only to the purchase adapter, not to general UI components.
- `restorePurchases()` requires sign-in and an account token. It may call Apple `AppStore.sync()` only in response to the explicit Restore Purchases action.
- `openManageSubscriptions()` uses Apple's native subscription-management sheet when available.
- Transaction updates are native-plugin events that flow into one purchase coordinator, not direct component listeners.

## 32. Normalized product model

The product model is application-facing and safe for UI display.

Required fields:

- `id`: raw StoreKit product identifier.
- `allowedProductId`: matching allowlisted Can You Geo product id, or `null`.
- `isAllowedProduct`: true only for `com.canyougeo.pro.monthly` or `com.canyougeo.pro.annual`.
- `availability`: `available`, `missing`, `unexpected`, or `not_subscription`.
- `displayName`: Apple-localized product display name.
- `description`: Apple-localized product description.
- `displayPrice`: Apple-localized display price. Do not replace with Stripe web price.
- `currencyCode`: safe currency code where StoreKit exposes one.
- `subscriptionPeriod`: duration and unit from StoreKit subscription information.
- `loadedAt`: ISO timestamp.
- `environment`: diagnostic classification only: `xcode`, `sandbox`, `production`, or `unknown`.

Rules:

- Unexpected products are never purchasable merely because StoreKit returned them.
- If one of the two approved products is missing, the app may show the available product but must label product loading as partial.
- If both approved products are missing, the native purchase UI must not show purchase buttons.
- Product data should be loaded from StoreKit on native iOS and should not use hard-coded web prices.
- Product model must not include Apple account details, transaction ids, original transaction ids, signed payloads, email addresses, or Supabase user ids.

## 33. Normalized purchase-result model

| Outcome | User error? | Client retry? | Backend contact? | Finish transaction? | Refresh entitlement? | Allowed analytics | Must not log |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `completed_verified` | Not as error; show verifying/complete copy. | No duplicate purchase retry. | Yes, submit verification candidate. | Only after backend durable acceptance or idempotent already-accepted response. | Yes after backend response. | Native purchase attempt/completed category only, if native analytics remains disabled this emits nothing. | Transaction id, original transaction id, signed JWS, account token, user id, email. |
| `pending` | No; show pending approval. | No immediate retry. | No transaction yet; listen for update. | No. | Later, when update arrives. | Pending category. | Same sensitive values. |
| `cancelled_by_user` | No error; dismiss cleanly. | User may retry manually. | No. | No. | No. | Cancelled category. | Same sensitive values. |
| `unverified` | Yes, security/retry later copy. | No automatic retry until current entitlements/updates rechecked. | No raw unverified transaction to backend unless 5A-3B explicitly designs a safe diagnostic endpoint. | No. | No. | Security failure category only. | Verification error payload, transaction payload, ids. |
| `product_unavailable` | Yes, product unavailable copy. | Retry after product reload/foreground. | No. | No. | No. | Product unavailable category. | StoreKit raw error payload. |
| `account_required` | Yes, sign-in required copy. | Retry after sign-in. | No. | No. | No. | Sign-in required category. | User id/email. |
| `account_link_conflict` | Yes, support copy. | No automatic retry. | Possibly support/reconciliation endpoint later. | Do not finish unless backend says the transaction is already durably owned and finished by this account. | Yes after backend decision. | Conflict category only. | Conflicting account id, Apple ids, transaction ids. |
| `network_error` | Yes, retry copy. | Yes with backoff after connectivity returns. | If local transaction exists, queue for backend retry. | No until backend durable acceptance. | Later. | Network failure category. | Raw request, tokens, JWS. |
| `store_unavailable` | Yes, store unavailable copy. | Retry after foreground/StoreKit availability. | No. | No. | No. | Store unavailable category. | Raw Apple error. |
| `backend_verification_pending` | Not fatal; show pending verification. | Poll/refresh with backoff. | Already contacted; continue reconciliation. | Yes only if backend durably accepted the transaction for processing. | Yes with backoff. | Backend pending category. | Provider ids/JWS/user id. |
| `failed` | Yes, generic support/retry copy. | Depends on code. | Depends on code. | No unless backend accepted. | Maybe. | Failed category with safe code. | Raw native error, payloads, ids. |

Avoid thrown exceptions as the primary purchase-state API. Native plugin calls may reject only for truly unexpected bridge failures; normal purchase outcomes must return one of the discriminated outcomes above.

## 34. Client purchase state machine

Only one purchase attempt may be active at a time. The state machine should live in pure TypeScript, likely under
`src/lib/mobile/storekit/purchaseStateMachine.ts`, and should be driven by a React coordinator.

| State | Allowed user actions | Disabled UI actions | Message category | Required next transition | Timeout/retry | Survives navigation/restart? |
| --- | --- | --- | --- | --- | --- | --- |
| `idle` | Choose plan, restore, manage if eligible. | None except ineligible actions. | None. | `loading_products` or `purchase_starting`. | None. | Yes as default. |
| `loading_products` | Cancel leaving page. | Purchase buttons, duplicate load. | Loading. | `products_ready` or `recoverable_failure`. | Retry with backoff; refresh on foreground if stale. | Navigation can drop UI state; cache result separately. |
| `products_ready` | Purchase allowed product, restore, manage. | Unexpected/missing products. | Ready. | `purchase_starting`, `loading_products`, or `idle`. | Product cache expires. | Yes within cache duration. |
| `purchase_starting` | Cancel only if StoreKit has not been invoked. | All purchase buttons. | Starting. | `awaiting_storekit`. | Short timeout for bridge failure. | No; if app dies before StoreKit returns, rely on transaction listener/current entitlements. |
| `awaiting_storekit` | Respond to Apple sheet. | Duplicate purchase, sign-out button should warn/confirm. | Apple sheet/opening. | `pending_external_approval`, `locally_verified`, `cancelled`, `recoverable_failure`, or `unverified_security_failure`. | No client retry while Apple sheet active. | StoreKit owns pending result; app restart recovers through updates/current entitlements. |
| `pending_external_approval` | Continue using app. | Duplicate same product purchase. | Pending approval. | Transaction update later, or timeout to `idle` with pending notice. | No active polling beyond listener/foreground entitlement refresh. | Yes as lightweight pending notice without sensitive payload. |
| `locally_verified` | Wait. | Duplicate purchase. | Verifying. | `backend_verification_in_progress`. | Immediate backend submission. | Candidate handled only by adapter/native queue; not general UI storage. |
| `backend_verification_in_progress` | Wait; maybe leave page. | Duplicate purchase. | Verifying. | `entitlement_refresh_in_progress`, `backend_verification_pending`, `account_link_conflict`, `recoverable_failure`, or `unverified_security_failure`. | Backoff on network/backend unavailable. | Native unfinished transaction recovers at launch; JS may keep only non-sensitive pending marker. |
| `entitlement_refresh_in_progress` | Wait. | Duplicate purchase. | Refreshing access. | `completed` or `recoverable_failure`. | Backoff; allow manual refresh. | Yes as non-sensitive pending marker. |
| `completed` | Continue to account/play. | Duplicate immediate purchase. | Success. | `idle` after acknowledgement. | None. | Effective entitlement persists through Supabase summary. |
| `cancelled` | Retry manually, choose other plan. | None after sheet closes. | Cancelled. | `idle`. | None. | No. |
| `recoverable_failure` | Retry, restore, contact support. | Duplicate automatic purchase. | Retry/error. | `loading_products`, `purchase_starting`, `restore`, or `idle`. | Bounded backoff; no infinite spinner. | Only safe code/message persists, not payload. |
| `unverified_security_failure` | Contact support; retry later only after fresh entitlement check. | Purchase retry until reset/reload. | Security. | `reconciliation_required` or `idle` after acknowledgement. | No automatic retry. | Safe code may persist; no payload. |
| `account_link_conflict` | Contact support, sign into owning account, restore after resolution. | Purchase/restore for conflicted entitlement. | Support. | `reconciliation_required` or `idle`. | No automatic retry. | Safe conflict marker may persist; no account ids. |
| `reconciliation_required` | Manual refresh, contact support. | Duplicate purchase if duplicate risk exists. | Pending support/reconciliation. | `entitlement_refresh_in_progress` or `idle` after backend resolution. | Scheduled/polling handled by backend plan later. | Yes as safe support state. |

State machine invariants:

- Repeated taps cannot start more than one `purchase()` call.
- A route change may hide the UI but must not cancel native transaction observation.
- Signing out during purchase cannot rebind an in-flight transaction to another account.
- A completed purchase does not grant durable Pro until `useEntitlement().refresh()` reads a backend-written Pro summary.
- Failure states must clear pending timers when a newer purchase/restore attempt starts.

## 35. Client/backend trust boundary

The iOS client may trust StoreKit local verification only for immediate UX state. Durable Can You Geo Pro access must come from the provider-neutral backend summary.

Client may use:

- product availability and localized product metadata from StoreKit;
- `Product.PurchaseResult` outcome categories;
- StoreKit verified transaction status for deciding whether to submit to backend;
- current entitlements to detect restore/update candidates;
- transaction update events to trigger backend reconciliation.

Client must send to backend only through a future trusted verification adapter:

- signed transaction JWS for verified transaction candidates;
- signed renewal info JWS when available and needed;
- allowlisted product id;
- StoreKit environment classification;
- transaction reason category;
- Supabase session bearer token for the currently signed-in user;
- app account token only as the expected Supabase UUID linkage value.

Client must never send to ordinary analytics:

- signed transaction data;
- transaction id or original transaction id;
- app account token or Supabase user UUID;
- email address;
- Apple account details;
- receipt/provider payloads.

Client must not store in `localStorage` or `sessionStorage`:

- signed transaction data;
- transaction ids/original transaction ids;
- app account token;
- Supabase session tokens;
- provider payloads.

Limited pending state:

- It is acceptable to store a non-sensitive pending category, product tier category, and client request id in React state.
- If restart recovery needs durable data, prefer leaving StoreKit transactions unfinished and recovering through `Transaction.updates`, `Transaction.unfinished`, and `currentEntitlements` rather than storing signed payloads.
- If a future implementation requires a durable local queue, use native secure storage and store only the minimum encrypted/signed payload necessary for backend retry. Do not expose it to React components.

Backend verification failure vs transaction verification failure:

- Transaction verification failure means StoreKit did not verify the transaction locally. Do not submit it for normal entitlement processing and do not finish it.
- Backend verification failure means StoreKit locally verified the transaction but Can You Geo's server could not accept or reconcile it. Do not grant durable Pro locally; follow backend retry/conflict/reconciliation outcome.

The client must not mutate `public.entitlements` because:

- browser/native users have no trusted authority to grant Pro;
- a local device cannot resolve Stripe/Apple/provider conflicts;
- RLS intentionally permits users to read only their own effective row and not write billing state;
- server-side event replay and reconciliation must remain idempotent and auditable.

Safe finish rule:

- A transaction is safe to finish only after Can You Geo has either delivered durable access through the backend summary or durably accepted the transaction/event for backend processing with idempotent replay.
- If backend is unavailable, do not finish; let StoreKit redeliver unfinished transactions.

Missed update recovery:

- Native plugin listener starts in plugin `load()` and buffers events until JavaScript attaches.
- On app foreground and after sign-in, the adapter calls `currentEntitlements()` and submits any eligible candidates.
- The implementation should also check `Transaction.unfinished` before deciding there is no pending work.

## 36. Account-linking client behavior

Signed-out user:

- Product information may be shown if StoreKit is available, but purchase buttons must route to sign-in/sign-up first.
- Do not call `purchase()` while signed out.
- Do not start an Apple purchase and ask for account creation afterward.
- Restore Purchases may be visible as disabled or may prompt sign-in before calling StoreKit.

Signed-in user:

- Derive the account-linking token from `useSupabaseAccount().user.id`.
- Validate that it is a UUID before calling StoreKit.
- Pass the token to StoreKit as `appAccountToken`.
- Never display the token or emit it to analytics/logs.

Signing out while a transaction is pending:

- Do not cancel StoreKit system processing.
- Clear UI association with the signed-out session.
- Do not submit a transaction under a new account unless the transaction's app account token matches the new account.
- If the transaction later arrives and no matching signed-in user exists, keep it unfinished and surface sign-in/restore guidance.

Account switching:

- If user A starts purchase and user B signs in before backend submission, the adapter must reject submission as `account_link_conflict` unless the app account token matches user B.
- If a restored original transaction is already assigned to another Can You Geo user, do not reassign locally. Show support/recovery copy and defer server policy to 5A-3B.
- If the current Apple device/App Store account has an entitlement linked to another Can You Geo account, Restore should return `belongs_to_another_account` after backend reconciliation, not silently grant Pro.

Deleted account:

- If Apple still reports an active subscription but the previous Can You Geo account is deleted, the client should show a support/recovery path after backend indicates manual review.
- Do not assume automatic reassignment to the current account.
- Do not expose deleted account ids or Apple transaction ids to the user.

## 37. Product-loading strategy

When to load:

- Load products when a signed-in or signed-out user enters the native upgrade/paywall surface.
- Optionally prefetch after account status settles in native iOS, but do not block app launch.
- Do not load products in ordinary web builds.

Cache:

- Cache successful product metadata in memory for about 15 minutes.
- Refresh on app foreground if cache is stale, if locale/storefront may have changed, or after StoreKit availability changes.
- Do not persist StoreKit product metadata in localStorage.

Retry/offline:

- On offline, show a safe unavailable state and keep Free/already-entitled Pro behavior available.
- Retry product loading after browser/native connectivity reports online.
- Use bounded backoff and a manual retry button.

Partial availability:

- If monthly loads and annual is missing, show only monthly and a non-alarming partial availability note.
- If annual loads and monthly is missing, show only annual.
- If neither loads, hide purchase buttons and show Store unavailable/product unavailable copy.
- Unexpected returned product ids are recorded only as sanitized diagnostic category and are not purchasable.

Localization/price changes:

- Always display Apple-localized `displayPrice` and product text from StoreKit for native Apple purchases.
- Never fall back to web Stripe prices as Apple prices.
- If StoreKit product metadata changes while the app is foregrounded, update the displayed Apple product cards on next product refresh.

Unavailable StoreKit:

- `isAvailable()` returns an explicit unavailable reason.
- Native iOS purchase UI should fall back to current mobile-purchase-unavailable copy, not Stripe checkout.

## 38. Transaction-listener lifecycle

Recommended owner: **custom plugin singleton plus web lifecycle coordinator**.

Native responsibilities:

- Start `Transaction.updates` in the Swift plugin `load()` hook or the earliest verified plugin initialization point.
- Buffer sanitized transaction events in memory until JavaScript attaches a listener.
- Deduplicate native events by a non-logged internal event id.
- Expose `currentEntitlements()` and unfinished transaction recovery for foreground/sign-in refreshes.
- Continue observing while the app runs; do not tie the native listener to one React component's mount.

Web app responsibilities:

- Mount a future `NativeStoreKitBridge` or purchase coordinator near the root layout for native iOS builds.
- Register the `storeKitTransaction` listener immediately after hydration.
- On sign-in, call `currentEntitlements()` and submit eligible candidates for backend reconciliation.
- On sign-out, stop submitting under the previous user but keep the native listener alive.
- On foreground/reconnect, refresh current entitlements and retry pending backend submissions.

Why not AppDelegate-only:

- AppDelegate should stay thin and currently only forwards URL/Universal Link events to Capacitor.
- StoreKit-specific logic belongs in the plugin/service so it can be tested, versioned, and eventually mirrored by Android.
- If future runtime testing proves Capacitor plugin `load()` is too late to satisfy Apple's launch-listener guidance, add the smallest AppDelegate bootstrap that initializes the plugin's observer without moving business logic into AppDelegate.

Duplicate delivery:

- Duplicate transaction delivery must be harmless. Backend submissions use idempotency based on provider/environment/transaction or event references, and the client also uses an internal request/event id.

App termination:

- Do not rely on JS state surviving termination.
- Unfinished StoreKit transactions and current entitlements are the source of recovery on next launch.

## 39. Transaction-finishing policy

Recommendation: **finish transactions after durable backend acceptance, not immediately after local StoreKit verification**.

Policy:

- Direct purchase: local verified transaction -> submit to backend -> backend durably records/accepts provider event or returns idempotent already-processed -> finish transaction -> refresh entitlement summary.
- Backend unavailable: do not finish; keep a retry state and recover through unfinished/current entitlement sequences.
- Backend accepted but entitlement summary still pending: finish only if backend response explicitly says the transaction is durably queued/accepted for processing. Show `backend_verification_pending` until `public.entitlements` refreshes.
- Renewal/update transactions: submit eligible verified update to backend; finish after backend acceptance if the transaction is unfinished.
- Revocation/refund/expiration updates: submit the verified update to backend; finish after backend acceptance when StoreKit indicates there is an unfinished transaction to complete.
- Unverified transactions: do not finish through the normal purchase path.
- Account-link conflict: do not finish unless backend says the transaction is already durably owned/processed for the same Can You Geo account or gives an explicit safe disposition.

Why:

- Apple documentation says `finish()` indicates that purchased content or service has been delivered/enabled.
- Can You Geo's durable service enablement is the provider-neutral backend summary, not a local UI flag.
- Leaving a transaction unfinished is preferable to losing a verified purchase before backend linkage.
- StoreKit can redeliver unfinished transactions, which supports app termination and offline recovery.

Failure recovery:

- On every native launch/foreground, check current entitlements and unfinished transactions.
- Retry backend submission with backoff when network/backend recovers.
- Keep user copy calm: "We are verifying your Pro access" rather than "purchase failed" when payment may have succeeded.

## 40. Restore-purchase behavior

Restore is a signed-in, explicit user action.

Flow:

1. User taps Restore Purchases.
2. App validates signed-in Supabase user and UUID account token.
3. Plugin calls Apple `AppStore.sync()` only because this is an explicit restore action.
4. Plugin reads `Transaction.currentEntitlements`.
5. Adapter submits verified allowlisted candidates to backend.
6. Backend reconciles ownership and provider state.
7. App refreshes `public.entitlements`.
8. UI reports restored, no entitlement found, conflict, pending, or technical failure.

Restore outcomes:

- `restored`: backend accepted at least one entitlement candidate for the current account.
- `no_entitlement_found`: StoreKit returned no eligible allowlisted Pro entitlement.
- `belongs_to_another_account`: backend says the original transaction is assigned elsewhere.
- `verification_pending`: backend accepted but summary is not yet updated.
- `user_cancelled`: user dismissed an Apple/App Store prompt.
- `network_error`, `store_unavailable`, or `failed`: technical failure.

Restore remains visible for existing Stripe subscribers because:

- it does not create a duplicate subscription;
- it may recover a legitimate Apple purchase made on another device;
- it can detect and safely report conflicts;
- it supports users who subscribed through Apple after canceling Stripe.

For Stripe-only Pro subscribers, Restore should be secondary and should not be presented as "upgrade." Apple purchase buttons remain hidden by default to avoid duplicates.

## 41. Native subscription-management behavior

Use Apple's native management surface through `AppStore.showManageSubscriptions(in:)` when available.

Display rules:

- Stripe-only subscriber: do not show "Manage Apple Subscription." Do not open Stripe Portal inside iOS. Show website-management copy for Stripe.
- Apple-only subscriber: show "Manage Apple Subscription."
- Dual subscriber: show Apple management plus website/Stripe management guidance. Do not auto-cancel either subscription.
- Expired Apple subscriber: show Restore Purchases first; show Apple management only if backend/provider history says there is an Apple subscription users may manage.
- Free user with no Apple history: hide Apple management and show purchase/restore according to sign-in and product availability.
- Apple management unavailable: show safe copy and optionally offer a trusted external Apple subscriptions URL as a fallback only after the native sheet fails.

Fallback:

- The native `showManageSubscriptions(in:)` sheet is preferred.
- A generic Apple subscription-management HTTPS link may be acceptable as a last-resort fallback opened through the trusted external-navigation path, but it should not replace the native sheet or simulate management inside Can You Geo.

## 42. Error vocabulary

Stable bridge diagnostic codes:

| Code | Category | User copy category |
| --- | --- | --- |
| `store_unavailable` | StoreKit/App Store unavailable. | Try again later. |
| `product_missing` | Approved product did not load. | Plan unavailable. |
| `product_identifier_rejected` | Product id not in allowlist. | Plan unavailable. |
| `user_cancelled` | User cancelled Apple sheet/prompt. | No charge made / cancelled. |
| `pending_approval` | Ask to Buy or external approval pending. | Pending approval. |
| `transaction_unverified` | StoreKit verification failed. | Could not verify purchase. |
| `account_token_invalid` | Supabase UUID/account token invalid or missing. | Sign in again. |
| `account_link_conflict` | Backend/account ownership conflict. | Contact support / sign into owning account. |
| `backend_unavailable` | Verification endpoint/network unavailable. | Verifying soon / retry. |
| `backend_rejected` | Backend rejected candidate. | Could not verify purchase. |
| `entitlement_refresh_failed` | Backend may have accepted but summary refresh failed. | Refresh account. |
| `restore_failed` | Restore technical failure. | Restore failed / retry. |
| `management_unavailable` | Apple management sheet failed/unavailable. | Could not open subscription management. |
| `unknown_native_error` | Unexpected native error. | Something went wrong. |

Rules:

- User-facing messages must be separate from diagnostic codes.
- Analytics/logs may include only the stable code, outcome, product tier category, environment category, and non-reversible client request id.
- Do not include raw Apple error payloads, signed data, provider ids, account ids, emails, or tokens in user-visible copy or analytics.

## 43. Privacy and logging

Never log:

- Supabase user UUID;
- app account token;
- original transaction id;
- transaction id;
- signed transaction data/JWS;
- receipt;
- Apple account details;
- email address;
- password;
- provider payload;
- Supabase session/access token.

Allowed in sanitized logs/analytics:

- event category, such as `purchase_attempt`, `purchase_result`, `restore_result`, `management_open`;
- product tier category, such as `pro_monthly` or `pro_annual`;
- environment category, such as `sandbox`, `production`, or `unknown`;
- stable error code from section 42;
- non-reversible client request id/correlation id;
- boolean flags such as `signed_in` only if native analytics policy later allows it.

Release builds:

- No raw StoreKit errors or payloads.
- No verbose product/account logs.
- Native analytics currently remains disabled; do not add paid-media or vendor pixel events.

Debug builds:

- May log high-level state transitions and stable diagnostic codes.
- Must redact or omit all provider/account identifiers and signed payloads.

## 44. Web fallback

Ordinary browser builds:

- `isAvailable()` returns `{ available: false, platform: "web", reason: "web_build" }`.
- `loadProducts()` returns `status: "unavailable"` with no products.
- `purchase()` returns `account_required` or `store_unavailable` without touching StoreKit.
- `currentEntitlements()` returns unavailable/none.
- `restorePurchases()` returns unavailable.
- `openManageSubscriptions()` returns `{ opened: false, code: "unsupported_platform" }`.
- `addListener()` is a no-op listener handle.

Web behavior requirements:

- Preserve existing Stripe checkout and Customer Portal behavior.
- Do not import iOS-only assumptions into web billing components.
- Keep bridge testable under jsdom.
- Keep native no-Stripe boundaries intact until Apple purchase UI is explicitly implemented.

## 45. Testing seams

Future tests should be layered.

Pure TypeScript:

- product loading normalization;
- successful purchase state transitions;
- user cancellation;
- pending purchase;
- unverified transaction;
- backend verification pending;
- account-link conflict;
- restore success/no entitlement/conflict;
- duplicate transaction event delivery;
- offline purchase attempt;
- restart with queued/pending verification marker;
- web fallback;
- native billing boundary remains no-Stripe.

Swift unit tests:

- product allowlist filtering;
- account-token validation;
- StoreKit result mapping;
- transaction update normalization;
- event buffering/deduplication;
- finish-after-backend-acceptance decision helper;
- error-code mapping and redaction.

StoreKit configuration/simulator:

- monthly and annual products load;
- missing product behavior;
- purchase success;
- Ask to Buy/pending;
- cancellation;
- renewal/update;
- refund/revocation if supported by local StoreKit testing;
- restore/sync and current entitlement recovery.

Maestro:

- native iOS paywall loads Apple-localized product cards;
- signed-out purchase redirects to sign-in before StoreKit;
- signed-in purchase reaches pending verification state without exposing Stripe;
- restore no-entitlement path;
- manage subscription opens Apple surface when available;
- existing Stripe Pro in native does not show Apple duplicate purchase CTA by default.

TestFlight sandbox:

- real sandbox monthly/annual purchase;
- restore after reinstall;
- account switching conflict;
- cancellation and expiration;
- billing retry/grace after backend support exists.

No tests are added in this checkpoint because no runtime code exists yet.

## 46. Future implementation file plan

Likely files for the implementation checkpoint, not created now:

```text
plugins/cgy-storekit/package.json
plugins/cgy-storekit/src/definitions.ts
plugins/cgy-storekit/src/index.ts
plugins/cgy-storekit/src/web.ts
plugins/cgy-storekit/ios/Package.swift
plugins/cgy-storekit/ios/CgyStoreKitPlugin.podspec
plugins/cgy-storekit/ios/Sources/CgyStoreKitPlugin/CgyStoreKitPlugin.swift
plugins/cgy-storekit/ios/Sources/CgyStoreKitPlugin/CgyStoreKitService.swift
plugins/cgy-storekit/ios/Sources/CgyStoreKitPlugin/CgyStoreKitModels.swift
plugins/cgy-storekit/ios/Sources/CgyStoreKitPlugin/CgyStoreKitEventBuffer.swift
plugins/cgy-storekit/ios/Sources/CgyStoreKitPlugin/CgyStoreKitErrors.swift
plugins/cgy-storekit/ios/Tests/CgyStoreKitPluginTests/CgyStoreKitServiceTests.swift
plugins/cgy-storekit/ios/Tests/CgyStoreKitPluginTests/Resources/CgyStoreKit.storekit
src/lib/mobile/storekit/storekitBridge.ts
src/lib/mobile/storekit/storekitTypes.ts
src/lib/mobile/storekit/purchaseStateMachine.ts
src/lib/mobile/storekit/storekitBackendAdapter.ts
src/lib/mobile/storekit/storekitTestDoubles.ts
src/lib/mobile/storekit/purchaseStateMachine.test.ts
src/components/NativeStoreKitBridge.tsx
src/features/account/NativePurchaseCoordinator.tsx
src/features/account/NativePurchaseCoordinator.test.tsx
canyougeo-blackbox/native/maestro/flows/ios/06_storekit_smoke.yaml
docs/mobile/IOS_IAP_ARCHITECTURE.md
```

Potential generated/sync files in a future implementation:

- `package.json` and `pnpm-lock.yaml` when adding the local plugin dependency.
- `ios/App/CapApp-SPM/Package.swift` after `cap sync ios`, generated from package metadata.
- iOS project files only if Capacitor sync requires them.

Any generated native web assets, build outputs, screenshots, logs, archives, or signed artifacts must stay out of Git.

## 47. Questions deferred to 5A-3B

- Exact Supabase Edge Function endpoint path for Apple transaction verification.
- Exact backend request/response schema for `CgyStoreKitBackendCandidate`.
- Whether backend accepts JWS directly from the client or the plugin posts through a native-only secure channel.
- Exact App Store Server API authentication/key storage and rotation plan.
- Exact idempotency key for Apple client-submitted transactions and App Store Server Notifications.
- Exact ownership-conflict response shape.
- Exact server policy for deleted-account Apple subscriptions.
- Exact provider-event fields stored after inspecting sandbox Apple payloads.
- Exact polling/retry budget for `backend_verification_pending`.
- Exact purchase/restore analytics source after server-side idempotency exists.
- Whether Apple grace period is enabled at launch.
- Whether a generic Apple subscription-management link is approved as fallback copy.

## 48. Explicit non-actions taken in 5A-3A

This checkpoint did not:

- Write Swift code or create a Capacitor plugin.
- Install dependencies or add a local package.
- Add TypeScript runtime code, React components, or tests for nonexistent code.
- Add migrations, database tables, RLS policies, Edge Functions, or backend endpoints.
- Modify Stripe, Supabase, GTM, analytics behavior, game behavior, auth behavior, entitlement runtime behavior, native projects, or Android.
- Accept Apple agreements, create Apple products, create App Store Server API keys, configure server notifications, upload a binary, increment version/build, create a PR, merge, or deploy.

## 49. 5A-3B scope and implementation status

This section extends the StoreKit design with the backend architecture for Apple purchase verification, App Store Server Notifications, entitlement recomputation, and reconciliation.

Status: design only. None of the endpoints, migrations, secrets, schedulers, Apple dashboard settings, or entitlement mutations described below exist yet unless explicitly called out as existing repository behavior.

The existing implemented billing surface remains:

- Stripe checkout, portal, and webhook Edge Functions.
- Browser/native app-side restrictions that keep Stripe web billing unavailable inside the native app.
- `public.entitlements` as the compatibility table read by the current app.
- Client-side StoreKit bridge and purchase state-machine scaffolding from 5A-3A, which still must not grant Pro without server acceptance.

Official references used for this design:

- Apple App Store Server API: `https://developer.apple.com/documentation/appstoreserverapi`
- Apple App Store Server Notifications: `https://developer.apple.com/documentation/appstoreservernotifications`
- Apple App Store Server Library: `https://developer.apple.com/documentation/appstoreserverapi/simplifying_your_implementation_by_using_the_app_store_server_library`
- Apple notification response and retry behavior: `https://developer.apple.com/documentation/appstoreservernotifications/responding_to_app_store_server_notifications`
- StoreKit `appAccountToken`: `https://developer.apple.com/documentation/storekit/product/purchaseoption/appaccounttoken(_:)`
- Supabase Edge Functions and secrets guidance: `https://supabase.com/docs/guides/functions` and `https://supabase.com/docs/guides/functions/secrets`

## 50. Apple backend component map

Recommended future components:

| Component | Future location | Auth model | Responsibility | Writes entitlements? |
| --- | --- | --- | --- | --- |
| Apple purchase verification endpoint | `supabase/functions/apple-purchase-verify/index.ts` | Supabase user JWT, `verify_jwt = true` | Accept the transaction identifier from a signed-in native user, verify it with Apple, enforce account ownership, persist provider state, recompute entitlement, and return an idempotent purchase decision. | Yes, only through shared server resolver. |
| Apple server notification endpoint | `supabase/functions/apple-server-notifications/index.ts` | Apple-signed JWS payload, `verify_jwt = false` | Receive App Store Server Notification V2 payloads, verify signatures, record provider events, mutate provider subscription state, and trigger entitlement recompute. | Yes, only after verified notification processing. |
| Apple reconciliation endpoint/job | `supabase/functions/apple-reconcile-subscriptions/index.ts` or a scheduled worker | Service-only scheduler/operator auth | Re-query App Store Server API for stale, conflicted, pending, or missed subscription state. | Yes, only through shared server resolver. |
| Apple verifier adapter | Future narrow verifier module/service | Internal server-to-server credential | Create Apple API JWTs, call App Store Server API, verify Apple JWS transaction/renewal/notification payloads, and return normalized facts. | No direct database writes. |
| Provider event ledger | Future database tables | Service role only | Store idempotency, processing state, attempts, normalized identifiers, and audit timestamps for Apple and later Stripe unification. | No direct entitlement decision by itself. |
| Effective entitlement resolver | Future shared function/RPC | Service role only | Combine verified Stripe and Apple provider state into the current app-compatible `public.entitlements` row. | Yes. |

The key boundary is that app code, StoreKit client code, and browser code never grant Pro directly. They can only request verification and then refresh the server-owned entitlement state.

## 51. Purchase-verification endpoint contract

Recommended endpoint:

- Path: `/functions/v1/apple-purchase-verify`
- JWT setting: `verify_jwt = true`
- Method: `POST`
- Caller: native app only, after StoreKit reports a purchased or restored transaction candidate.
- CORS: allow only approved app origins needed by the Capacitor WebView and deployed site. This endpoint is not a public webhook.

Recommended request body:

```json
{
  "transactionId": "2000000000000000",
  "clientProductId": "com.canyougeo.pro.monthly",
  "clientEnvironment": "sandbox",
  "clientCorrelationId": "optional-random-client-id"
}
```

Only `transactionId` should be required. Client fields are advisory and must not be trusted for entitlement decisions.

Do not accept or persist from the client:

- entitlement status
- active/expired flags
- period end dates
- price, currency, or proceeds
- user email
- Supabase user ID in the body
- full signed transaction JWS unless a later implementation proves it is required
- Apple receipt blobs
- Stripe identifiers
- analytics identifiers

The server derives the user from the Supabase JWT. It verifies the transaction with Apple, reads the `appAccountToken` from the verified transaction payload, and requires it to match the authenticated Supabase user UUID that initiated the purchase.

Recommended response shape:

```json
{
  "status": "accepted",
  "entitlementRefreshRecommended": true,
  "clientMayFinishTransaction": true,
  "retryAfterSeconds": null,
  "reason": null
}
```

Allowed response statuses:

| Status | Meaning | Client may finish StoreKit transaction? | Client action |
| --- | --- | --- | --- |
| `accepted` | Verified, ownership matched, provider state stored, entitlement recomputed. | Yes | Finish transaction and refresh account entitlement. |
| `already_processed` | Same transaction or original transaction was already accepted for the same user and environment. | Yes | Finish transaction and refresh account entitlement. |
| `verification_pending` | Durable event was recorded, but current Apple state or entitlement recompute has not completed. | No | Retry later using backoff; show pending copy. |
| `account_link_conflict` | Verified Apple transaction belongs to a different Can You Geo account or has an unexpected `appAccountToken`. | No | Show support-oriented copy; do not grant Pro locally. |
| `product_not_allowed` | Verified product is not in the Can You Geo allowlist. | No | Stop purchase flow and report safe error. |
| `environment_mismatch` | Transaction environment is not allowed for the current backend context. | No | Stop purchase flow; route to QA/operator investigation. |
| `transaction_unverified` | Apple verification failed permanently. | No | Stop purchase flow; do not retry aggressively. |
| `backend_temporarily_unavailable` | Apple API, verifier, or database work failed transiently. | No | Retry safely with backoff. |
| `rejected` | Permanent policy rejection not covered above. | No | Stop purchase flow with generic support copy. |

The endpoint must be idempotent for repeated calls with the same transaction. A user should be able to tap restore, relaunch, or retry without duplicate grants or duplicate analytics.

## 52. Notification endpoint contract

Recommended endpoint:

- Path: `/functions/v1/apple-server-notifications`
- JWT setting: `verify_jwt = false`
- Method: `POST`
- Caller: Apple App Store Server Notifications V2.
- Browser CORS: unnecessary. It should not be treated as a browser API.

Recommended request body:

```json
{
  "signedPayload": "apple-jws-payload"
}
```

Processing steps:

1. Reject non-`POST` requests.
2. Parse JSON with a strict body-size limit.
3. Require a `signedPayload` string.
4. Verify the App Store signed payload before trusting any field.
5. Verify nested `signedTransactionInfo` and `signedRenewalInfo` JWS values when present.
6. Validate bundle ID, environment, product allowlist, and, in production, the expected Apple app identifier when available.
7. Record the provider event by `notificationUUID` and environment before mutating provider subscription state.
8. Process only normalized facts, not raw payloads.
9. Recompute effective entitlement in the same durable processing path.
10. Return a response that matches Apple's retry semantics.

Response policy:

| Case | Response | Reason |
| --- | --- | --- |
| Duplicate valid notification already processed | `200` | Avoid retry storms. |
| Valid notification processed successfully | `200` | Apple treats 200-206 as success. |
| Valid notification recorded but intentionally ignored, such as `TEST` | `200` | Nothing should be retried. |
| Valid signed but unknown notification type | `200` after recording `unknown_needs_review` | Preserve evidence without forcing repeated delivery. |
| Invalid signature, malformed body, wrong bundle, or wrong permanent environment | `400` | Not retriable by our system. |
| Valid Apple notification but transient database, verifier, or Apple API failure | `500` | Let Apple retry and let reconciliation recover. |

Apple V2 retries failed notifications five times over roughly 1, 12, 24, 48, and 72 hours in production. Sandbox notifications do not provide the same retry safety, so sandbox testing must also exercise explicit reconciliation.

## 53. Recommended Apple verification approach

Use a hybrid architecture:

- Supabase Edge Functions own endpoint intake, Supabase Auth enforcement, service-role database writes, CORS, idempotency, and entitlement recomputation.
- A narrow Apple verifier adapter/service owns App Store Server API JWT creation, Apple API calls, and JWS/certificate verification using Apple's official App Store Server Library where practical.

This is the recommended approach for the first production implementation because:

- Supabase Edge Functions run on a Deno-compatible TypeScript runtime.
- Apple's official server libraries are documented for Swift, Java, Python, and Node, not Deno.
- Apple JWS validation, certificate-chain handling, and App Store Server API authentication are security-critical and should not be hand-rolled casually.
- A full separate billing service would be heavier than Can You Geo needs right now.
- A narrow verifier keeps the high-risk cryptography/API boundary small while leaving existing Supabase Edge Function patterns intact.

The verifier must be stateless and internal. It should return only normalized, verified facts and reason codes, never raw signed payloads to app code or analytics. Edge Functions remain the only component allowed to mutate Supabase billing rows.

If a future implementation spike proves Apple's official Node library runs reliably inside Supabase Edge Functions with the required crypto and certificate behavior, this design can collapse the verifier into a shared Edge helper without changing the external contracts.

## 54. Account ownership verification

StoreKit purchases must be linked to a Can You Geo user with Apple's `appAccountToken` purchase option. The native StoreKit layer should set the token to the authenticated Supabase user UUID at purchase time.

Server ownership rules:

| Scenario | Server behavior |
| --- | --- |
| New purchase, verified transaction has matching `appAccountToken` | Create or update Apple provider subscription for that user. |
| Repeated verification for the same user, transaction, original transaction, and environment | Return `already_processed`; do not duplicate state. |
| Restore on another device while signed into the same Can You Geo account | Accept and refresh entitlement. |
| Restore or purchase while signed into a different Can You Geo account | Return `account_link_conflict`; do not transfer ownership automatically. |
| Notification arrives before the client verifies purchase | If `appAccountToken` maps to an existing user and no conflicting owner exists, create the provider row; otherwise record unresolved and reconcile. |
| Notification lacks usable `appAccountToken` but original transaction is already linked | Update the existing provider subscription. |
| Notification lacks usable `appAccountToken` and no provider row exists | Record as unresolved; do not grant Pro. |
| User deletes the Can You Geo account while Apple subscription remains active | Mark the provider subscription orphaned or ownerless; do not grant a recreated account automatically. |

Manual reassignment must be rare and audited. It should require verified Apple transaction evidence, a clear reason, the old and new Can You Geo user IDs, operator identity, timestamp, and a support note. Never record Apple account credentials, full email secrets, device UDIDs, or raw signed payloads in support notes.

## 55. Provider-subscription mutation authority

Future Apple state should live in private service-owned provider tables, not directly in public app-readable rows.

Recommended authority model:

| Field family | Authoritative source | Notes |
| --- | --- | --- |
| User ownership | Verified `appAccountToken`, existing provider row, and audited support reassignment | App body claims never win. |
| Product ID and subscription group | Verified Apple transaction and renewal info | Must match Can You Geo allowlist. |
| Current active/expired/grace/billing-retry state | App Store Server API subscription status, supplemented by notifications | Reconciliation wins when notification order is ambiguous. |
| Period end and grace period end | Verified Apple transaction/renewal payloads and subscription status | Older events cannot shorten a newer verified active period. |
| Auto-renew state and cancel-at-period-end | Verified renewal info and related notifications | Cancelled auto-renew can still be active until period end. |
| Refund/revocation | Verified transaction revocation fields and refund notifications | May apply retrospectively even if signed earlier than a renewal. |
| Effective Can You Geo Pro entitlement | Shared entitlement resolver across Apple, Stripe, and manual future overrides | No provider writes directly to app-readable entitlement without recompute. |

No browser or native client code should write subscription, entitlement, or provider ownership state.

## 56. Notification type and state mapping

Initial mapping for App Store Server Notification V2:

| Apple notification | Subtype examples | Canonical provider state | Pro access decision |
| --- | --- | --- | --- |
| `SUBSCRIBED` | `INITIAL_BUY`, `RESUBSCRIBE` | `active` | Active after verification and ownership match. |
| `DID_RENEW` | empty, `BILLING_RECOVERY` | `active` | Active; extend period from verified transaction/status. |
| `DID_FAIL_TO_RENEW` | empty | `billing_retry` or still active until current `expiresDate` | Reconcile before removing access. |
| `DID_FAIL_TO_RENEW` | `GRACE_PERIOD` | `grace_period` | Active until verified grace end if Apple grace period is enabled. |
| `GRACE_PERIOD_EXPIRED` | empty | `expired` or `billing_retry` | Remove access only if no newer active provider exists. |
| `EXPIRED` | `VOLUNTARY`, `BILLING_RETRY`, `PRICE_INCREASE`, `PRODUCT_NOT_FOR_SALE`, empty | `expired` | Remove Apple-derived access unless another provider is active. |
| `DID_CHANGE_RENEWAL_STATUS` | `AUTO_RENEW_DISABLED` | `active_cancel_at_period_end` | Keep access through current period. |
| `DID_CHANGE_RENEWAL_STATUS` | `AUTO_RENEW_ENABLED` | `active` | Keep access. |
| `DID_CHANGE_RENEWAL_PREF` | `UPGRADE`, `DOWNGRADE`, empty | `active_product_change_pending` or `active` | Keep access; product changes after verified effective date. |
| `PRICE_INCREASE` | `PENDING`, `ACCEPTED` | `active_price_consent_pending` or `active` | Keep access unless Apple later expires the subscription. |
| `REFUND` | empty | `refunded` or `revoked` for affected transaction | Recompute access; may remove Apple-derived Pro. |
| `REFUND_DECLINED` | empty | no access change | Record for audit only. |
| `REFUND_REVERSED` | empty | `active_needs_reconciliation` | Reconcile current status before granting if stale. |
| `RENEWAL_EXTENDED` | empty | `active_extended` | Extend period if verified. |
| `RENEWAL_EXTENSION` | `SUMMARY`, `FAILURE` | operator/reconciliation event | No direct per-user access change unless transaction data is present. |
| `TEST` | empty | test event | No entitlement change. |
| `CONSUMPTION_REQUEST` | empty | refund/support information | No direct subscription access change for launch subscriptions. |
| Unknown valid signed type | any | `unknown_needs_review` | Preserve current entitlement and enqueue reconciliation/operator review. |

The resolver must always check whether another provider, such as Stripe, still grants Pro before downgrading the user's effective entitlement.

## 57. Provider event ledger

Add a provider-neutral event ledger before launching Apple billing. It can later replace or wrap the Stripe-specific `public.stripe_webhook_events` pattern.

Recommended fields:

- `id`
- `provider`: `apple` or `stripe`
- `environment`: `sandbox` or `production`
- `provider_event_id`: Apple `notificationUUID`, Stripe event ID, or a synthetic purchase-verification idempotency key
- `event_kind`
- `event_subtype`
- `processing_state`: `queued`, `processing`, `processed`, `ignored`, `error`, `dead_letter`, `needs_review`
- `attempt_count`
- `first_received_at`
- `last_attempted_at`
- `processed_at`
- `signed_at` or provider event time
- `effective_at`
- `related_user_id`
- `related_provider_subscription_id`
- `original_transaction_id` or provider subscription reference, stored only in a private service table
- `payload_hash`
- `last_error_code`
- `reconciliation_required`
- `source_endpoint`

Do not store raw App Store signed payloads by default. If incident response ever needs temporary payload retention, it should be encrypted, access-limited, short-lived, and governed by a separate retention decision. The normal ledger should store normalized fields and hashes only.

Required uniqueness and indexes:

- Unique `(provider, environment, provider_event_id)`.
- Unique Apple purchase-verification synthetic event key per `(provider, environment, transaction_id)` when represented in the ledger.
- Index by `(processing_state, last_attempted_at)`.
- Index by `(provider, environment, original_transaction_id)`.
- Index by `(related_user_id, provider, environment)`.

RLS should be enabled and forced. No user-facing policies should expose this ledger. Service role should own all writes.

## 58. Idempotency and concurrency

Idempotency keys:

| Flow | Idempotency key |
| --- | --- |
| Client purchase verification | `apple:purchase:{environment}:{transactionId}` |
| App Store notification | `apple:notification:{environment}:{notificationUUID}` |
| Subscription row | unique `(provider, environment, originalTransactionId)` |
| Individual transaction fact | unique `(provider, environment, transactionId)` |
| Stripe webhook compatibility | existing Stripe event ID, later mapped to `provider_event_id` |

Concurrency rules:

- Use database uniqueness as the primary duplicate guard.
- Use a short transaction for ledger insert, provider row mutation, entitlement recompute, and event-state update.
- Do not call Apple APIs while holding a database transaction open.
- Use row locks or advisory locks keyed by provider/environment/original transaction when processing competing events for the same subscription.
- Prefer `FOR UPDATE SKIP LOCKED` for future reconciliation queues.
- Treat in-memory dedupe as a client/runtime optimization only; it is not a backend correctness mechanism.

The purchase endpoint, notification endpoint, and reconciliation job must all be safe to race. The final entitlement must be computed from durable provider state, not from arrival order.

## 59. Event ordering and stale-event rules

Apple notifications and client verifications can arrive out of order. The backend should order by verified provider timestamps, not HTTP arrival time.

Ordering inputs:

- `signedDate`
- `purchaseDate`
- `expiresDate`
- `renewalDate`
- `gracePeriodExpiresDate`
- `revocationDate`
- `originalTransactionId`
- current result from App Store Server API subscription status

Rules:

- A newer verified active renewal should prevent an older expiration from downgrading access.
- An expiration can downgrade Apple-derived access only when no newer active, grace, or renewed status exists for the same original transaction.
- A refund or revocation can apply retrospectively to its affected transaction even if an active renewal exists. The resolver must then determine whether another valid period/provider still grants Pro.
- A billing-retry event should not immediately remove access if the current period has not ended or if Apple grace period is verified.
- Production and sandbox events are never compared as a single timeline.
- Unknown but valid signed events should not mutate access directly; record them and reconcile.
- Null or missing values from older events must not overwrite known current provider facts unless the current App Store Server API response confirms the field should be cleared.

## 60. App Store Server API usage

Recommended API calls:

| API | Use |
| --- | --- |
| Get Transaction Info | Verify a client-supplied transaction ID and read signed transaction facts. |
| Get All Subscription Statuses | Determine current state for an original transaction/subscription group. |
| Get Transaction History | Rebuild or audit a subscription timeline during reconciliation or support. |
| Get Notification History | Recover missed notifications after an outage or webhook misconfiguration. |
| Request Test Notification | Validate endpoint wiring after dashboard setup. |

Environment routing:

- If a verified payload identifies `Sandbox`, use sandbox API base URL.
- If a verified payload identifies `Production`, use production API base URL.
- For a client-supplied transaction ID with unknown environment, follow Apple's documented production-first pattern and fall back to sandbox only on the specific "transaction not found in production" condition.
- Persist the environment returned by Apple, not the client hint.

Rate-limit and outage handling:

- Apply per-user and per-transaction request throttles on purchase verification.
- Back off on Apple 429 and 5xx responses.
- Return `backend_temporarily_unavailable` to the client when verification cannot safely finish.
- Enqueue reconciliation instead of granting Pro from unverified client claims.

## 61. Sandbox and production separation

Sandbox and production Apple data must be fully separated.

Rules:

- Store environment on every Apple provider subscription and provider event.
- Scope uniqueness by environment.
- Never allow sandbox data to downgrade or overwrite production subscription state.
- Never allow production web users to receive Pro from sandbox Apple purchases.
- Use staging or an explicit internal TestFlight entitlement path for sandbox billing QA.
- Do not mix local StoreKit configuration purchases with shared production entitlement state.

TestFlight uses Apple's sandbox purchase environment even when the app binary points at production URLs. Before enabling TestFlight IAP QA, choose one of these safe strategies:

1. Test IAP against the staging Supabase project and staging entitlement rows.
2. Add a clearly isolated internal-only sandbox entitlement resolver that is not used by production web or App Store production builds.

Do not silently grant production `public.entitlements` from sandbox Apple rows.

## 62. Secrets inventory

Future Apple billing secrets and configuration:

| Name | Secret? | Expected storage | Notes |
| --- | --- | --- | --- |
| `APPLE_APP_STORE_ISSUER_ID` | Yes | Supabase project secrets or verifier secret store | App Store Server API JWT issuer. |
| `APPLE_APP_STORE_KEY_ID` | Yes-ish | Supabase project secrets or verifier secret store | Identifier for the private key. |
| `APPLE_APP_STORE_PRIVATE_KEY` | Yes | Secret store only | Never commit. Use escaped PEM or base64 secret format. |
| `APPLE_BUNDLE_ID` | No | Environment/config | `com.canyougeo.app`. |
| `APPLE_APP_ID` | No | Environment/config | Numeric App Store app identifier, when available. |
| `APPLE_ALLOWED_PRODUCT_IDS` | No/low | Environment/config | Launch allowlist, for example monthly and annual Pro IDs. |
| `APPLE_VERIFIER_INTERNAL_URL` | Maybe | Supabase secret/config | Only if using a separate verifier service. |
| `APPLE_VERIFIER_INTERNAL_AUTH` | Yes | Secret store only | Shared internal auth for Edge-to-verifier calls. |
| Apple root certificates | No | Code/package or trusted library | Public trust material, not app secrets. |

Rotation guidance:

- Support overlapping App Store Server API keys during rotation.
- Log only key ID and reason codes, not private-key contents.
- Keep staging and production secrets separate.
- Do not store Apple Account credentials, two-factor codes, developer certificates, provisioning profiles, or signing private keys in Supabase secrets.

## 63. Effective entitlement recomputation

The entitlement resolver is the only future component that should write app-readable subscription state.

Recommended recompute triggers:

- Accepted Apple purchase verification.
- Valid Apple notification that changes provider state.
- Apple reconciliation result.
- Stripe webhook event.
- Support-owned manual recovery or reassignment.
- Backfill or repair job.

Resolver algorithm:

1. Load all verified provider subscriptions for the user.
2. Ignore sandbox Apple rows for production app entitlement unless an explicit internal QA mode is active.
3. Treat Apple active, grace-period, and verified current-period cancel-at-period-end rows as Pro while valid.
4. Treat Stripe active and trialing rows as Pro while valid.
5. If any provider grants Pro, write `plan = 'pro'` and an active-compatible status to `public.entitlements`.
6. If no provider grants Pro, write or preserve a Free-compatible entitlement.
7. Preserve provider-specific management metadata so the account UI can tell the user where to manage the subscription.
8. Record an entitlement history row in future private tables for audit.

The resolver must not let one provider's cancellation remove another provider's active entitlement. For example, an Apple expiration must not downgrade a user who still has an active Stripe subscription.

## 64. `public.entitlements` compatibility strategy

Current app code reads `public.entitlements` and treats missing rows safely as Free. That compatibility must remain through the Apple launch.

Recommended migration strategy:

1. Keep `public.entitlements` as the app-readable compatibility projection.
2. Add private provider-specific tables for Stripe and Apple facts.
3. Add provider-neutral fields to the projection only when app UI needs them.
4. Keep existing `plan` and `status` semantics stable for old web/native clients.
5. Add management-provider metadata carefully, for example `management_provider = 'stripe' | 'apple' | 'multiple' | 'manual' | 'none'`, only when UI is ready.
6. Do not expose Apple transaction IDs, original transaction IDs, notification UUIDs, or app account tokens in public rows.

The current `public.entitlements` Stripe columns can remain during the transition. They should eventually become derived compatibility fields, not the source of truth.

## 65. Server-backed analytics

Apple billing analytics should be emitted only after server-side idempotency and entitlement recompute succeed.

Future neutral events:

| Server event | Trigger | Notes |
| --- | --- | --- |
| `cgy_subscription_verified` | Purchase verification accepted or already processed for the same user | Do not include transaction IDs, user IDs, email, or Apple account data. |
| `cgy_entitlement_granted` | Resolver changes effective entitlement to Pro | Include provider category only: `apple`, `stripe`, or `multiple`. |
| `cgy_subscription_renewed` | Verified renewal extends active Apple entitlement | Server-side only, one per provider event. |
| `cgy_subscription_expired` | Effective entitlement changes from Pro to Free because no provider remains active | Do not emit if Stripe or another provider still grants Pro. |
| `cgy_subscription_refunded` | Refund/revocation changes effective entitlement | Avoid Apple transaction identifiers. |
| `cgy_subscription_restore_verified` | Restore path verifies an already owned Apple subscription | Idempotent and non-sensitive. |

Do not send raw provider identifiers, signed payloads, app account tokens, transaction IDs, original transaction IDs, notification UUIDs, user IDs, emails, or support notes to GA4, GTM, Meta, TikTok, Reddit, or any client-visible analytics layer.

No analytics code is implemented in this checkpoint.

## 66. Operational observability

Minimum metrics and operator views before launch:

- Apple purchase verification requests by outcome.
- Verification latency and Apple API latency.
- Apple API 401/403/429/5xx counts.
- Notification signature failures.
- Notification processing failures.
- Provider event backlog by state.
- Dead-letter and needs-review counts.
- Account ownership conflicts.
- Unresolved notifications without `appAccountToken` or known owner.
- Sandbox events reaching production entitlement paths.
- Effective entitlement recompute failures.
- Duplicate active provider count for the same user.
- Reconciliation age for active subscriptions.

Page immediately:

- Apple verifier unavailable.
- App Store Server API authentication failures.
- Valid Apple notifications returning 5xx.
- Entitlement recompute failures after verified payment events.
- Large or growing event backlog.
- Production sandbox-mixing guard firing.

Review during normal operations:

- Unknown valid signed notification types.
- Ownership conflicts.
- Repeated customer restore failures.
- Refund/revocation cases.
- Provider rows orphaned by account deletion.

Logs should contain provider, environment, event kind, outcome, and stable non-reversible hashes where useful. Logs must not contain raw signed payloads, tokens, transaction IDs, original transaction IDs, emails, Apple account data, passwords, or recovery links.

## 67. Reconciliation schedule

Reconciliation is required because notifications can be missed, sandbox retries are limited, and client verification may be interrupted.

Recommended schedules:

| Cadence | Scope |
| --- | --- |
| Every 5-15 minutes | Pending purchase verifications, valid notifications that failed processing, and rows marked `needs_reconciliation`. |
| Hourly | Active Apple subscriptions with period ends, grace ends, or billing-retry states near the current time. |
| Daily | Active Apple subscriptions not recently checked, plus a small sample of stable subscriptions. |
| On demand | Support-requested transaction audit, account conflict review, or post-incident notification replay. |

Recommended reconciliation steps:

1. Select a bounded batch using `FOR UPDATE SKIP LOCKED` or equivalent queue locking.
2. Call Apple subscription status or transaction history outside the database transaction.
3. Verify all returned signed payloads.
4. Re-open a short transaction to update provider state, ledger state, and effective entitlement.
5. Back off on rate limits and transient Apple failures.
6. Dead-letter after repeated failures with a safe operator reason code.

Use notification history after outages or webhook changes. Production notification history covers a longer period than sandbox, so sandbox testing should not rely on historical replay alone.

## 68. Backend testing seams

Do not add runtime tests for nonexistent backend code yet. When implementation begins, cover these seams:

| Test layer | Required coverage |
| --- | --- |
| Apple verifier adapter | Valid/invalid JWS, wrong bundle, wrong environment, wrong product, expired cert, malformed payload, Apple API 404/429/5xx. |
| Purchase endpoint | Missing JWT, wrong user token, valid purchase, duplicate purchase, account conflict, product not allowed, Apple outage, entitlement recompute failure. |
| Notification endpoint | Valid notification, duplicate notification, invalid signature, wrong bundle, unknown type, stale event, refund, renewal, expiration, transient DB failure. |
| Provider event ledger | Unique constraints, processing state transitions, retry/dead-letter behavior, service-only RLS. |
| Entitlement resolver | Apple active, Apple expired, Stripe active, dual provider, one provider cancellation, sandbox isolation, missing rows resolving Free. |
| Concurrency | Purchase and notification racing for same transaction, two notifications for same original transaction, reconciliation competing with webhook processing. |
| Native integration | StoreKit client waits for accepted/already-processed before finish, pending behavior, restore behavior, account conflict copy. |

Existing focused test families to keep running during implementation:

- billing/account tests around Stripe checkout, portal, and entitlements
- Supabase function structure/security tests
- native billing-boundary tests that assert Stripe remains unavailable inside native
- StoreKit bridge and purchase state-machine tests

## 69. Future backend implementation file plan

Likely future files, subject to a separate implementation checkpoint:

```text
supabase/functions/apple-purchase-verify/index.ts
supabase/functions/apple-server-notifications/index.ts
supabase/functions/apple-reconcile-subscriptions/index.ts
supabase/functions/_shared/appleVerifierClient.ts
supabase/functions/_shared/appleServerApi.ts
supabase/functions/_shared/appleNotificationMapping.ts
supabase/functions/_shared/providerEventLedger.ts
supabase/functions/_shared/effectiveEntitlements.ts
supabase/functions/_shared/appleBillingTypes.ts
supabase/functions/_shared/appleBilling.test.ts
supabase/functions/apple-purchase-verify/index.structure.test.ts
supabase/functions/apple-server-notifications/index.structure.test.ts
supabase/migrations/<timestamp>_provider_billing_foundation.sql
docs/mobile/APPLE_BILLING_OPERATIONS.md
```

If the selected verifier is a separate service, add only a narrow verifier project after an approved checkpoint. It should expose no public customer API and should not own entitlement writes.

Do not add any of these files in 5A-3B.

## 70. Questions deferred to 5A-3C

- Exact database DDL for provider subscriptions, provider events, entitlement history, constraints, indexes, and RLS.
- Exact StoreKit product IDs after App Store Connect product creation.
- Exact Apple verifier deployment target after a compatibility spike.
- Exact Supabase function names and `supabase/config.toml` entries.
- Exact Apple secret names and rotation runbook.
- Whether TestFlight sandbox IAP uses staging Supabase or an explicit internal sandbox entitlement path.
- Whether Apple grace period is enabled for launch.
- Final account-conflict support copy.
- Final subscription-management copy and link strategy for Apple subscribers.
- Event retention duration for provider ledgers and any encrypted incident payload store.
- Operator dashboard/reporting surface for conflicts, dead letters, and reconciliation.

## 71. Explicit non-actions taken in 5A-3B

This checkpoint did not:

- Add migrations, database tables, RLS policies, constraints, functions, RPCs, or cron jobs.
- Add Supabase Edge Functions or deploy existing functions.
- Add Apple App Store Server API keys, secrets, products, agreements, notification URLs, or dashboard configuration.
- Add a verifier service or Apple server library dependency.
- Change StoreKit client runtime code, native projects, iOS signing, Android code, or Capacitor configuration.
- Change Stripe checkout, Stripe portal, Stripe webhook behavior, Supabase Auth, entitlement runtime behavior, gameplay, GTM, analytics, or marketing pixels.
- Add analytics events or vendor-specific tracking.
- Build, upload, archive, release, merge, deploy, or create a PR.

## 72. 5A-3C1 scope, repository UX audit, and official references

Status: design only. This checkpoint designs the future native Apple subscription UX, disclosures, and analytics taxonomy. It does not implement UI, StoreKit calls, analytics emissions, legal copy, products, offers, App Store Connect settings, or backend billing behavior.

Existing repository behavior observed:

- `/upgrade/` currently shows Free/Pro comparison, current web prices from `PRO_PRICE_OPTIONS`, Stripe checkout actions for browser builds, and a native "Mobile purchases unavailable" guard.
- Account membership status currently comes from `public.entitlements` and the `membershipDisplay` helper.
- Native builds intentionally block Stripe checkout and Stripe portal in `BillingActionsClient`.
- Native builds currently disable live analytics providers through `analyticsConfigFromEnv`.
- `/legal/`, `/terms/`, and `/privacy/` exist, but the billing/privacy copy is still Stripe-oriented and must be updated before Apple subscription launch.
- `/support/` routes billing help to support and currently references Stripe management.
- Current Pro benefits are Mystery Map Custom Atlas, Pattern Atlas Pattern Runs, Order Atlas Pro Play, complete Past Games archive, advanced stats, and future premium modes where supported.
- The current web prices are `$3.99/month` and `$29.99/year`; these are not Apple price-point decisions.

Official Apple references used for this UX design:

- Auto-renewable subscriptions overview: `https://developer.apple.com/app-store/subscriptions/`
- App Review Guidelines, in-app purchase and subscription requirements: `https://developer.apple.com/app-store/review/guidelines/#in-app-purchase`
- Human Interface Guidelines, In-App Purchase: `https://developer.apple.com/design/human-interface-guidelines/in-app-purchase`
- StoreKit localized display price: `https://developer.apple.com/documentation/storekit/product/displayprice`
- StoreKit subscription period and renewal information: `https://developer.apple.com/documentation/storekit/product/subscriptioninfo`
- StoreKit restore/sync: `https://developer.apple.com/documentation/storekit/appstore/sync()`
- StoreKit subscription management: `https://developer.apple.com/documentation/storekit/appstore/showmanagesubscriptions(in:)`
- App Store Connect subscription pricing: `https://developer.apple.com/help/app-store-connect/manage-subscriptions/set-a-price-for-an-auto-renewable-subscription`
- App Store Connect Family Sharing: `https://developer.apple.com/help/app-store-connect/manage-subscriptions/set-up-family-sharing-for-auto-renewable-subscriptions`
- App Store Connect billing grace period: `https://developer.apple.com/help/app-store-connect/manage-subscriptions/offer-a-grace-period-for-auto-renewable-subscriptions`
- App Store Connect billing retry / involuntary churn guidance: `https://developer.apple.com/help/app-store-connect/manage-subscriptions/reduce-involuntary-subscriber-churn`
- App Store Connect introductory offers and offer codes: `https://developer.apple.com/help/app-store-connect/manage-subscriptions/set-up-introductory-offers-for-auto-renewable-subscriptions`

## 73. Native subscription UX principles

Recommended future behavior:

- Keep web and native billing boundaries clear: Stripe on web, Apple IAP in native iOS, no Stripe checkout or portal inside iOS.
- Require a Can You Geo account before purchase so `appAccountToken` can bind the Apple transaction to the Supabase user.
- Let StoreKit provide localized product names, prices, periods, and storefront-sensitive values.
- Treat the backend entitlement refresh as the moment of durable success. Local StoreKit verification can show "confirming subscription," but not "Pro active."
- Avoid purchase prompts during active gameplay. Upgrade prompts can appear in lobbies, result screens, account/status surfaces, and Pro gates.
- Existing Pro access suppresses purchase CTAs until the entitlement resolver confirms the user is eligible to buy.
- Restore Purchases is a support/recovery action, not a substitute for sign-in and not a way to restore Stripe purchases or passwords.
- Manage Subscription opens Apple's native management surface for Apple-backed subscriptions only.
- Dual-provider cases should be calm, explicit, and support-oriented, not accusatory.
- Native subscription UI should be portrait-first. Gameplay may remain landscape, but purchase and account surfaces should avoid landscape-only purchase decisions.

Existing behavior remains unchanged until implementation: native users currently see purchases unavailable.

## 74. Upgrade and paywall entry points

| Entry point | Future UI | Sign-in required before purchase? | Refresh entitlement first? | Load products immediately? | May initiate purchase? | Portrait/landscape guidance | Duplicate-subscription prevention |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Native `/upgrade/` | Full paywall when eligible; Pro/status page when already entitled | Yes | Yes | Yes, after account status begins loading | Yes, if signed in, eligible, and products loaded | Portrait-first; usable on narrow phones | Suppress purchase if effective Pro or provider conflict exists. |
| Account billing section | Compact status card plus management/restore actions | Yes for purchase; no for viewing signed-in status | Yes | Only when user taps upgrade or is eligible and account is loaded | Yes, through compact prompt or route to full paywall | Portrait account surface | Do not show Apple purchase as default for Stripe Pro or Apple Pro. |
| Pro-locked game-mode prompt | Compact prompt; route to `/upgrade/` | Yes before purchase, but prompt can be visible signed out | Yes before showing buy button | No; defer until paywall | No direct purchase in gameplay | Avoid during active map/round; use lobby/result gates | Prompt says "See Pro options," not immediate buy. |
| Past Games Pro gate | Compact prompt with archive benefit | Yes | Yes before buy | No; route to paywall | No direct purchase | Portrait/standard page ok | Existing Pro opens archive instead. |
| Advanced Stats Pro gate | Compact prompt with stats benefit | Yes | Yes before buy | No; route to paywall | No direct purchase | Account/stats portrait | Existing Pro opens stats instead. |
| Contextual prompt after free usage | Lightweight result/lobby prompt | Yes | Yes before buy | No; route to paywall | No direct purchase | Result screens only, not mid-round | Avoid repeated prompts in one session. |
| Restore-purchase entry | Account and paywall secondary action | Yes | Yes | No product load required for restore, but StoreKit availability required | No purchase; restore/sync only | Account/paywall portrait | Restore cannot remove Stripe access. |

Recommended default: full native paywall lives at `/upgrade/`; game/account prompts route there. Account can offer compact management and Restore Purchases.

## 75. Native paywall information hierarchy

Recommended paywall order:

1. Heading: `Can You Geo Pro`.
2. Short value line: full atlas and supported Pro modes across Mystery Map, Pattern Atlas, Order Atlas, Past Games, and advanced stats.
3. Current account status: signed out, Free, Pro active, Stripe-managed Pro, Apple-managed Pro, dual provider, or unavailable.
4. Product selector with two options: monthly and annual, using StoreKit localized price and period.
5. Primary purchase button for selected product.
6. Required auto-renewal disclosure near the purchase action.
7. Restore Purchases secondary action.
8. Terms of Use, Privacy Policy, and Support links.
9. Short management note: subscriptions are managed through Apple after purchase.

Annual presentation:

- The annually billed total must be the dominant annual price, for example Apple-localized `"$29.99/year"` from StoreKit.
- A monthly-equivalent or savings message may appear only as secondary copy, and only if calculated from StoreKit-loaded product prices for the same storefront/session.
- Do not hard-code web prices or use Stripe price values for Apple display.

The native paywall should avoid decorative complexity. The user must be able to understand product, duration, renewal, price, and cancellation path before tapping the purchase button.

## 76. Pro-benefit copy model

Recommended current benefit hierarchy:

1. `Full atlas access where supported`: broad umbrella, but avoid "everything unlimited."
2. `Mystery Map Custom Atlas`: currently supported Pro mode.
3. `Pattern Atlas Pattern Runs`: currently supported Pro mode.
4. `Order Atlas Pro Play`: currently supported repeatable Pro play.
5. `Complete Past Games archive`: currently supported Pro benefit.
6. `Advanced stats`: currently supported capability, with future richer stats copy kept modest.
7. `Future premium modes as they launch`: secondary, clearly future-oriented.

Avoid:

- "Unlimited everything."
- "All future games forever."
- "All Order Atlas features" if a specific feature is not Pro-enabled.
- Promising social/challenge history beyond what the app currently supports.

Recommended paywall benefit copy:

```text
Pro unlocks Mystery Map Custom Atlas, Pattern Atlas Pattern Runs, repeatable Order Atlas Pro Play, the complete Past Games archive, and advanced stats where supported.
```

Coming-later copy should be visually secondary and phrased as roadmap, not purchase consideration.

## 77. Monthly and annual selection

Recommended selector:

- Use two cards or a segmented-card group: Monthly and Annual.
- Preselect annual as "Best value" because the current web plan already treats annual as featured and it rewards regular atlas play.
- Keep Monthly equally visible and reachable; do not hide it, reduce contrast unfairly, or make Annual look mandatory.
- The annual option may show "Best value" and a secondary savings message only if both Apple products loaded and the savings calculation uses StoreKit prices.

Product loading rules:

- Load both StoreKit products after account status is known and the user is eligible to purchase.
- If one product loads and one is missing, show only the loaded product as purchasable and display a quiet "Other plan temporarily unavailable" note.
- If both products are missing, disable purchase and show product-unavailable copy.
- If StoreKit price or product data changes while the paywall is open, update display and announce the change if it affects the selected product.
- If a product is unavailable in the current territory or pending App Store approval, hide or disable that product and route to support only if the user is blocked.

Do not cache localized StoreKit product metadata in localStorage.

## 78. Purchase-button states

| State | Primary button label | Disabled? | Message intent |
| --- | --- | --- | --- |
| Products loading | `Loading Apple subscription options...` | Yes | Apple product details are loading. |
| Monthly selected | `Subscribe monthly` plus localized price/period nearby | No | Purchase monthly Pro through Apple. |
| Annual selected | `Subscribe annually` plus localized annual total nearby | No | Purchase annual Pro through Apple. |
| Purchase in progress | `Opening Apple purchase...` | Yes | Prevent duplicate taps while StoreKit sheet opens. |
| Pending approval | `Waiting for approval...` | Yes | Ask-to-Buy or pending StoreKit result; Pro not active yet. |
| Backend verification | `Confirming subscription...` | Yes | Local StoreKit verified, server is accepting/recomputing. |
| Entitlement refresh | `Refreshing Pro access...` | Yes | Server accepted purchase, app is reloading account state. |
| Existing Pro subscriber | `Pro active` | Yes | No purchase CTA. Show management/restore options. |
| Signed-out user | `Sign in to subscribe` or `Create account to subscribe` | No, navigates to auth | Purchase requires account. |
| Store unavailable | `Apple subscriptions unavailable` | Yes | StoreKit unavailable; retry later. |
| Product unavailable | `Plan unavailable` | Yes for missing product | Product not returned by StoreKit. |
| Account-link conflict | `Subscription linked to another account` | Yes | Route to support; no local grant. |
| Restore in progress | `Restoring purchases...` | Yes | Restore action active. |

Never show `Purchase successful` until the backend entitlement refresh confirms Pro. Use `Subscription confirmed` or `Pro is active` only after effective entitlement is Pro.

## 79. Signed-out behavior

Signed-out native paywall:

- Product information and Pro benefits may be visible.
- Purchase buttons are replaced by sign-in/create-account actions.
- Copy should explain: `Sign in or create a Can You Geo account before subscribing so Pro access can stay linked across this app, the website, and future devices.`
- Do not imply the Apple ID and Can You Geo account are the same identity.
- Preserve intended upgrade destination with the existing auth return pattern, including selected plan where practical.
- If auth is canceled, return to the paywall in signed-out state with no StoreKit purchase started.
- Do not call StoreKit before account creation, profile sync, and current entitlement refresh.

If the user signs in and is already Pro, suppress purchase and show active status instead of continuing to Apple.

## 80. Stripe-subscriber iOS behavior

When effective Pro access comes from Stripe:

- Headline: `Pro is active`.
- Explanation intent: `Your Can You Geo Pro access is active. This subscription is managed on the Can You Geo website. Apple subscriptions are not needed for this account.`
- Primary action: `View Pro features` or `Open account`.
- Secondary action: `Restore Apple purchases`, because legitimate Apple history recovery can still exist.
- Do not show Apple purchase as the recommended path.
- Do not open Stripe Checkout or Stripe Portal inside iOS.
- Do not expose Stripe customer IDs, subscription IDs, or price IDs.
- Do not encourage dual billing.

Recommended initial release: no "Subscribe with Apple anyway" override. If a user wants to switch providers, use support or a future guided migration flow that avoids overlap.

## 81. Apple-subscriber behavior

When Apple grants Pro:

- Headline: `Pro is active`.
- Explanation intent: `Your subscription is managed through Apple. You can manage or cancel it in your Apple subscription settings.`
- Show renewal/expiration date only if verified by server and meaningful.
- If auto-renew is off: `Your Pro access stays active until [date].`
- If grace period: access remains active; prompt payment update through Apple.
- If billing retry without active access: explain Apple is retrying payment and provide management action.
- Primary action: `Manage Apple Subscription`.
- Secondary action: `Restore Purchases` and `Contact support`.
- Do not show Apple purchase again unless the resolver confirms expiration and no active provider exists.
- Do not show Stripe Checkout as the route to manage Apple Pro.
- Do not display transaction identifiers.

Website behavior for Apple subscribers should later show Pro active and explain that management happens on the iPhone/App Store, without offering Stripe Checkout by default.

## 82. Dual-provider behavior

Dual-provider state means Apple and Stripe, or another future provider, both appear active for the same Can You Geo account.

Recommended user-facing message intent:

```text
Pro is active, but this account appears to have more than one active subscription. You may be billed in more than one place. Manage each subscription where it was started, or contact support and we can help you review the account.
```

Rules:

- Keep Pro active.
- Do not automatically cancel Apple or Stripe.
- Do not hide either management path.
- Do not encourage another purchase.
- Show Apple management for Apple and website-management guidance for Stripe.
- Show support contact.
- Record an operational duplicate-provider condition in server logs/metrics without exposing transaction IDs, customer IDs, user UUIDs, or email in analytics.

Tone should be calm: "appears to have" and "we can help review" rather than blaming the user.

## 83. Canonical status presentation

| Canonical state | User headline | Short explanation | Pro active? | Primary action | Secondary action | Purchase visible? | Management available? | Support? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `active` | `Pro is active` | Your subscription is active. | Yes | Open Pro features | Manage subscription | No | Yes | Optional |
| `cancelled_active_until_period_end` | `Pro is active until [date]` | Renewal is off, but access continues through the paid period. | Yes | Manage subscription | Contact support | No | Yes | Optional |
| `grace_period` | `Payment needs attention` | Apple could not renew, but Pro remains active for now. | Yes | Manage Apple Subscription | Refresh status | No | Yes | Optional |
| `billing_retry` | `Payment is being retried` | Apple is trying to renew. Pro may be paused until payment is fixed. | Depends on resolver | Manage Apple Subscription | Refresh status | No until current | Yes | Optional |
| `pending` | `Subscription pending` | Purchase approval or backend confirmation is not complete yet. | No durable grant yet | Refresh status | Contact support | No | Maybe | Yes if delayed |
| `expired` | `Pro is inactive` | The subscription period ended. | No unless another provider active | See Pro options | Restore Purchases | Yes after refresh | If provider history exists | Optional |
| `revoked` | `Pro access changed` | The purchase is no longer active. | No unless another provider active | See Pro options | Contact support | Yes after refresh | Maybe | Recommended |
| `refunded` | `Pro access changed` | The refunded purchase no longer grants Pro. | No unless another provider active | See Pro options | Contact support | Yes after refresh | Maybe | Recommended |
| `paused` | `Subscription paused` | Subscription access is paused by provider state. | No unless another provider active | Manage subscription | Refresh status | No until current | Yes | Optional |
| `unknown_needs_reconciliation` | `Checking subscription` | We need a moment to verify the latest subscription state. | Preserve cached if safe | Refresh status | Contact support | No | Maybe | Yes if persistent |
| `dual_provider_active` | `Pro is active in more than one place` | You may have more than one active subscription. | Yes | Review management options | Contact support | No | Yes, for each provider | Recommended |
| `provider_unavailable_but_cached_entitlement_active` | `Pro is active; status update delayed` | Your last verified Pro access is available, but provider status could not refresh. | Yes for a bounded cache window | Retry refresh | Contact support | No | Maybe | Optional |

Do not expose enum names in UI.

## 84. Grace period and billing retry UX

Grace period:

- Access remains active.
- Message intent: `Apple could not renew your subscription, but Pro access is still active during the grace period. Update your Apple payment information to keep Pro.`
- Primary action: `Manage Apple Subscription`.
- Secondary action: `Refresh status`.
- Do not show Free downgrade messaging during verified grace access.

Billing retry without grace access:

- Pro may be inactive or paused depending on resolver state.
- Message intent: `Apple is retrying the renewal. Update your Apple payment information, then refresh your account status.`
- Primary action: `Manage Apple Subscription`.
- Secondary action: `Refresh status` and support.
- Avoid "expired forever" copy until Apple confirms expiration.

After returning from Apple management, the app should refresh entitlement and show a neutral "Checking subscription..." state while reconciliation runs.

## 85. Cancellation and expiration UX

Cancellation:

- If auto-renew is turned off but the paid period remains active, show `Pro active until [date]`.
- Do not imply immediate loss of access.
- Keep management visible.
- Hide purchase options until the resolver confirms the subscription is expired.

Expiration:

- After verified expiration and no other provider remains active, show Free status and restore/subscribe options.
- Upgrade prompts may reappear after a fresh resolver state is loaded.
- If provider state is delayed, show "Checking subscription" rather than a buy button that might cause duplicate billing.

Resubscribe and plan switch:

- Resubscribe uses the same StoreKit product group once the resolver confirms eligibility.
- Monthly/annual switch is handled through Apple subscription group behavior and verified renewal/preference state.
- The app should not promise immediate effective-date behavior beyond what StoreKit and server state confirm.

## 86. Refund and revocation UX

User-facing behavior:

- Do not accuse the user of fraud.
- Use neutral copy: `This purchase no longer grants Pro access. If you think this is wrong, contact support.`
- Refresh effective entitlement across all providers before removing Pro UI.
- If Stripe or another provider remains active, Pro stays active and the refund/revocation appears only as management/support context.
- Do not reveal provider event names, transaction IDs, refund reasons, revocation reasons, or internal fraud signals.
- Offer support for questions.

Stripe refund/dispute behavior should use the same tone if it later feeds the provider-neutral resolver.

## 87. Restore Purchases UX

Where it appears:

- Native paywall: secondary action below purchase and disclosure text.
- Account billing section: secondary action for signed-in users.
- Support page/account help: future text can mention Restore Purchases only for Apple App Store purchases.

Rules:

- Require sign-in before restore so recovered Apple entitlements can be linked to a Can You Geo account.
- `Restore Purchases` calls StoreKit sync/current entitlements and sends candidates to backend verification.
- No Apple purchases found: `No Apple subscription was found for this Apple ID. If you subscribed on the website, sign in to the same Can You Geo account or contact support.`
- Successful restore: show `Pro is active` only after backend entitlement refresh confirms Pro.
- Backend pending: show `We found a subscription and are confirming access.`
- Cross-account conflict: explain the subscription appears linked to another Can You Geo account; route to support.
- Store unavailable/network failure: allow retry.
- Already active entitlement: show no-op success such as `Pro is already active on this account.`
- Existing Stripe subscriber restore: may find no Apple purchase; must not remove Stripe Pro.

Restore Purchases does not restore passwords, Stripe subscriptions, deleted account data, or support tickets.

## 88. Manage Subscription UX

Apple-managed subscription:

- Show `Manage Apple Subscription`.
- Use StoreKit's Apple management surface when available.
- If it fails to open, show a generic retry/support message and do not navigate to Stripe.
- On return to the app, refresh entitlement and show "Checking subscription..." until resolved.

Website-managed subscription:

- Native iOS should not open Stripe Portal.
- Show neutral guidance: `This subscription is managed on the Can You Geo website. Sign in at canyougeo.com/account in a browser to manage billing, or contact support.`
- Do not embed checkout or portal inside the app.

Dual-provider:

- Show separate choices: `Manage Apple Subscription` and `Website billing help`.
- Also show support contact.

No active subscription:

- Show Restore Purchases and Subscribe options only after entitlement state is current.

## 89. Terms, privacy, and subscription disclosures

Current URLs:

- Terms route exists: `/terms/`
- Privacy route exists: `/privacy/`
- Combined legal route exists: `/legal/`
- Support route exists: `/support/`

Future requirement before Apple launch:

- Update legal copy so it accurately describes Apple IAP, Apple subscription management, StoreKit purchase data, Apple refund/revocation handling, and the continued existence of Stripe web billing.
- Keep distinct Terms of Use and Privacy Policy links on the paywall. `/terms/` and `/privacy/` can serve as the public URLs if their content is updated.
- Consider anchors or page copy that make "Terms of Use" and "Privacy Policy" visibly distinct from the combined legal page.

Required paywall disclosure intent:

- Subscription automatically renews unless canceled according to Apple subscription settings.
- Monthly and annual billing duration must be clear.
- Renewal price must be shown using Apple-localized product data.
- Cancellation/management happens through Apple for Apple subscriptions.
- Terms of Use and Privacy Policy links must be visible before purchase.
- Restore Purchases must be visible and understandable.

EULA recommendation:

- Use Apple's standard EULA for the initial release unless legal review requires a custom EULA.
- If a custom EULA is chosen later, make sure the paywall and App Store metadata link to the correct terms.

Do not invent refund guarantees or legal rights beyond the published Terms, Apple policies, and applicable law.

## 90. Pricing decision framework

Current web prices:

- Monthly: `$3.99`
- Annual: `$29.99`

No App Store price point is selected in this checkpoint.

Recommended philosophy: near customer-price parity with web, subject to final Apple price-point review.

Reasoning:

- Customer-facing parity is easier to explain than platform-specific pricing.
- Apple storefront pricing is localized and may be tax-inclusive, so exact parity may not be possible in every territory.
- Developer net proceeds are different from customer price because of Apple commission and any Small Business Program eligibility.
- Annual discount should remain meaningful but not deceptive; compute any savings from Apple product prices in the current storefront.
- If Apple price points force a small difference, explain simply through localized StoreKit prices and avoid comparing to Stripe checkout inside the app.

Separate decisions still required:

- Final Apple price points.
- Whether to apply Apple's equalized territory pricing or manual territory adjustments.
- Future price-increase communication and consent handling.
- Support copy for web subscribers who notice platform price differences.

## 91. Family Sharing decision

Recommended initial release: Family Sharing disabled.

UX reasons:

- Can You Geo Pro is account-linked through Supabase and `appAccountToken`.
- Family Sharing can create valid Apple access for multiple Apple family members who do not share the same Can You Geo account.
- That introduces account ownership, support, and entitlement-linking complexity before launch.
- Family members might expect separate Can You Geo accounts to inherit one Apple purchase, which the current entitlement model does not yet support.
- Revocation/account switching would need additional policy and support tooling.

If Family Sharing is enabled later:

- Decide whether one Apple subscription can grant multiple Can You Geo accounts.
- Add ownership type to provider subscriptions.
- Add UI explaining family-shared access.
- Add conflict handling for family members who already have Stripe or Apple Pro.
- Re-test restore, revocation, and account deletion.

Apple's current App Store Connect guidance should be rechecked immediately before configuration because enabling Family Sharing for an in-app purchase may be difficult or impossible to reverse.

## 92. Introductory-offer decision

Recommended initial release: no free trial, no introductory discounted period, no offer codes, and no promotional offers.

Reasons:

- Can You Geo already has guest samples and a Free account tier.
- Offers add eligibility rules, disclosure complexity, testing burden, App Review surface area, and subscription-state edge cases.
- Backend/server analytics must first be stable for ordinary purchase, renewal, restore, expiration, refund, and conflict flows.
- Marketing value can be revisited after baseline Apple billing is reliable.

If offers are introduced later, design must cover eligibility display, trial end disclosure, renewal price after offer, user reminders, offer-code redemption, server-side status mapping, and analytics separation between paid conversion and trial start.

## 93. Provider-neutral client analytics

Design only. Do not implement.

Future client-side neutral events:

| Event | Trigger | Safe properties |
| --- | --- | --- |
| `cgy_subscription_paywall_view` | Native paywall rendered | `provider`, `surface`, `signed_in`, `effective_plan`, `eligibility` |
| `cgy_subscription_product_load_start` | StoreKit product load starts | `provider`, `surface` |
| `cgy_subscription_product_load_result` | Product load succeeds/fails | `provider`, `surface`, `outcome`, `available_product_count`, `environment` |
| `cgy_subscription_product_select` | User selects monthly/annual | `provider`, `billing_period`, `surface` |
| `cgy_subscription_purchase_start` | User taps purchase | `provider`, `billing_period`, `surface`, `signed_in` |
| `cgy_subscription_purchase_cancel` | StoreKit reports user cancellation | `provider`, `billing_period`, `surface` |
| `cgy_subscription_purchase_pending` | StoreKit pending/approval result | `provider`, `billing_period`, `surface` |
| `cgy_subscription_local_verified` | StoreKit locally verifies transaction | `provider`, `billing_period`, `environment` |
| `cgy_subscription_backend_result` | Backend returns accepted/pending/conflict/failure | `provider`, `billing_period`, `outcome`, `environment` |
| `cgy_subscription_entitlement_confirmed` | Client refresh sees Pro after accepted purchase | `provider`, `billing_period`, `surface` |
| `cgy_subscription_purchase_failed` | Non-cancel purchase failure | `provider`, `billing_period`, `outcome`, `surface` |
| `cgy_subscription_restore_start` | Restore tapped | `provider`, `surface` |
| `cgy_subscription_restore_result` | Restore completed/no purchase/conflict/failed | `provider`, `outcome`, `surface` |
| `cgy_subscription_manage_open` | Management opened | `provider`, `surface` |
| `cgy_subscription_manage_failed` | Management failed to open | `provider`, `surface`, `outcome` |
| `cgy_subscription_duplicate_provider_notice` | Dual-provider warning displayed | `surface`, `effective_plan` |
| `cgy_subscription_paywall_suppressed` | Existing subscriber state suppresses buy UI | `provider`, `surface`, `effective_plan` |

Safe property values:

- provider category: `apple`, `stripe`, `multiple`, `none`
- product tier category: `pro`
- billing period: `monthly`, `annual`, `unknown`
- normalized outcome: `success`, `cancelled`, `pending`, `failed`, `conflict`, `unavailable`
- surface: `upgrade`, `account`, `pro_gate`, `result`, `support`
- signed-in status
- effective-plan category: `guest`, `free`, `pro`
- environment classification: `sandbox`, `production`, `unknown` where safe

Never send transaction IDs, original transaction IDs, app account tokens, signed transactions, receipts, Apple account information, Supabase user UUIDs, emails, provider customer IDs, provider subscription IDs, recovery links, or support free text.

Native analytics still requires a later decision because current native builds disable live analytics providers.

## 94. Server-backed conversion analytics

Server-side conversion events should be emitted only after durable backend processing and idempotency:

| Server event | Emit after | Double-count guard |
| --- | --- | --- |
| Purchase completed | Verified provider state stored and entitlement recompute succeeds | Provider event ledger key. |
| Initial entitlement granted | Effective entitlement changes Free/Guest to Pro | Entitlement transition history. |
| Renewal | Verified renewal extends provider subscription | Apple notification UUID or API reconciliation event key. |
| Expiration | Effective entitlement changes Pro to Free because no provider remains active | Entitlement transition history. |
| Refund | Refund/revocation processed and effective state recomputed | Provider event ledger key. |
| Revocation | Revocation processed and effective state recomputed | Provider event ledger key. |
| Restore entitlement granted | Restore confirms existing Apple subscription and Pro becomes active | Provider subscription/original transaction idempotency. |

Client events can measure funnel behavior; server events own conversion truth. Do not map a client StoreKit success event as a purchase conversion until the backend confirms durable entitlement.

## 95. Accessibility and localization

Requirements:

- Support Dynamic Type without clipping price, period, or disclosure text.
- VoiceOver labels must include product name, localized price, period, selected state, and whether the option is recommended.
- Announce loading, purchase progress, pending approval, backend verification, errors, and entitlement confirmation.
- Maintain strong contrast in dark navy/cyan/lime styling.
- Keep purchase controls within portrait safe areas and away from the home indicator.
- Avoid initiating purchase from landscape gameplay. Route to portrait-friendly account/paywall surfaces.
- Use StoreKit localized product strings and prices.
- Support right-to-left layout and long localized currency/period strings.
- Use locale-aware currency and date formatting.
- Respect Reduced Motion; purchase state changes should not depend on animation.
- Preserve keyboard/focus behavior for simulator, hardware keyboard, and accessibility users.
- Use clear focus order: status, benefits, product selector, purchase button, disclosures, restore, links.

The purchase button's disabled state should be communicated visually and semantically.

## 96. Failure and recovery matrix

| Failure | Message intent | Retry? | Support? | Pro access changes? | Navigation blocked? | Analytics? |
| --- | --- | --- | --- | --- | --- | --- |
| Store unavailable | Apple subscriptions cannot load right now. | Yes | Optional | No | No | Product-load failed. |
| Product unavailable | This plan is unavailable in the current App Store storefront. | Refresh/retry later | Optional | No | No | Product-load failed. |
| Offline | Connect to the internet to subscribe or restore. | Yes after reconnect | Optional | Existing cached access preserved per guardrails | Purchase blocked | Failure outcome. |
| Purchase cancelled | Purchase was cancelled. | Yes | No | No | No | Cancel event. |
| Purchase pending | Approval or processing is pending. | Refresh later | Optional | No durable grant yet | Purchase controls disabled for that transaction | Pending event. |
| Transaction unverified | We could not verify this purchase. | Limited | Yes | No | No | Failure outcome, no raw error. |
| Backend unavailable | We could not confirm Pro yet. | Yes with backoff | Optional | No new grant | No | Backend failed/pending. |
| Backend verification pending | Subscription found; confirming access. | Refresh/retry | Yes if long delay | No durable grant yet | No | Pending outcome. |
| Entitlement refresh failed | Purchase accepted, but account refresh failed. | Yes | Optional | Server may already grant; UI waits for refresh | No | Refresh failure. |
| Account-link conflict | Subscription appears linked to another Can You Geo account. | No immediate purchase retry | Yes | No local grant | No | Conflict outcome. |
| Restore failed | Purchases could not be restored right now. | Yes | Optional | No removal | No | Restore failed. |
| Management unavailable | Apple subscription settings could not open. | Yes | Optional | No | No | Manage failed. |
| Unknown reconciliation state | Checking latest subscription status. | Refresh/backoff | Yes if persistent | Preserve safe cached access only | Purchase blocked | Reconciliation pending. |

Never expose raw Apple, Supabase, or network exception text to users.

## 97. Support workflows

| Support case | User guidance | Backend/operator need |
| --- | --- | --- |
| Stripe subscriber confused in iOS | Explain Pro is active and website-managed; no Apple purchase needed. | None unless status mismatch. |
| Apple subscriber on website | Explain Pro is active and Apple-managed; use iPhone/App Store to manage. | Ensure provider summary is visible on web. |
| Dual billing | Explain possible multiple active subscriptions and provide both management paths. | Provider reconciliation and support review. |
| Restore conflict | Explain purchase appears linked to another Can You Geo account. | Ownership-conflict review; no unsafe transfer. |
| Deleted account with active Apple subscription | Direct user to Apple subscription management and support. | Orphaned subscription review and manual policy. |
| Refund/revocation question | Neutral access-change explanation. | Provider event lookup and entitlement history. |
| Pending purchase | Explain confirmation may take time; retry refresh. | Check pending provider event and Apple status. |
| Billing retry | Direct to Apple payment management. | Reconciliation if state remains stale. |
| Family Sharing question | If disabled, explain Can You Geo Pro is not family-shared at launch. | None unless future policy changes. |
| Wrong Can You Geo account | Ask user to sign into the expected account and contact support. | Audited reassignment only if later policy allows. |

Do not design or expose an unsafe manual reassignment tool in the app. Manual reassignment remains an operator process requiring backend reconciliation and audit.

## 98. App Review readiness

Before App Review submission with Apple IAP:

- Provide a reviewer account if sign-in is required to access the paywall.
- Review notes should explain:
  - web subscriptions coexist with Apple IAP;
  - existing web subscribers can sign in and use Pro;
  - native iOS purchases use Apple IAP;
  - Stripe checkout and Stripe portal are unavailable inside iOS;
  - StoreKit products are monthly and annual at the same service level;
  - Restore Purchases is on the paywall and account billing surface;
  - Manage Apple Subscription appears for Apple-backed Pro;
  - Terms and Privacy links are on the paywall;
  - account deletion is available through the existing account/support/legal flow or documented route.
- Explain how the reviewer reaches the paywall: sign in, open `/upgrade/`, or open a Pro gate and follow the upgrade prompt.
- Note any products temporarily unavailable or not yet approved.

Do not create reviewer credentials or submit anything in this checkpoint.

## 99. Future UI component plan

Likely future React/application components:

```text
src/features/account/NativeApplePaywall.tsx
src/features/account/NativeProductSelector.tsx
src/features/account/NativePurchaseButton.tsx
src/features/account/SubscriptionStatusCard.tsx
src/features/account/BillingManagementActions.tsx
src/features/account/RestorePurchasesButton.tsx
src/features/account/BillingProviderNotice.tsx
src/features/account/DualSubscriptionWarning.tsx
src/features/account/BillingStatusMessage.tsx
src/features/account/NativePurchaseCoordinator.tsx
src/lib/billing/nativeSubscriptionAnalytics.ts
src/lib/billing/nativeSubscriptionCopy.ts
src/lib/billing/nativeSubscriptionStatus.ts
```

Likely test targets:

```text
src/features/account/NativeApplePaywall.test.tsx
src/features/account/RestorePurchasesButton.test.tsx
src/features/account/BillingManagementActions.test.tsx
src/lib/billing/nativeSubscriptionCopy.test.ts
src/lib/billing/nativeSubscriptionStatus.test.ts
```

Use existing account surface styles and notices where possible. Do not create placeholder files until the implementation checkpoint.

## 100. Questions deferred to 5A-3C2

- Final App Store price points and territory pricing.
- Final App Store product metadata, display names, review screenshots, and subscription group configuration.
- Whether Apple grace period is enabled at launch.
- Exact final legal copy updates for Terms, Privacy, refunds, Apple management, and web/native billing coexistence.
- Exact support policy for wrong-account purchases and deleted-account Apple subscriptions.
- Whether native analytics will remain disabled, use a server-backed event endpoint, or use a consent-aware native analytics provider.
- Exact UI copy after App Review/legal review.
- Exact account deletion flow wording for Apple subscribers.
- Whether future Family Sharing support is desirable after launch.
- Whether introductory offers, trials, offer codes, or promotional offers are worth a later marketing checkpoint.

## 101. Explicit non-actions taken in 5A-3C1

This checkpoint did not:

- Add React UI, Swift code, StoreKit code, native plugin code, or analytics implementation.
- Add dependencies, migrations, Edge Functions, Supabase tables, or server verification behavior.
- Modify Stripe checkout, Stripe portal, Stripe webhook, Supabase Auth, or entitlement runtime behavior.
- Modify legal pages, support pages, pricing constants, app metadata, App Store Connect, Apple agreements, subscription products, offers, Family Sharing, or grace-period settings.
- Change native projects, Android, version/build numbers, signing, TestFlight, App Review, or production deployment.
- Run a build, upload a binary, create a PR, merge, force-push, or make unrelated changes.

## 102. 5A-3C2 scope and official references

Status: design and release planning only. This checkpoint finalizes the testing, rollout, rollback, and readiness plan for future Apple billing implementation. It does not start implementation.

Official references used:

- StoreKit Testing in Xcode: `https://developer.apple.com/documentation/xcode/setting-up-storekit-testing-in-xcode`
- StoreKit Test framework: `https://developer.apple.com/documentation/storekittest`
- Sandbox in-app purchase testing: `https://developer.apple.com/help/app-store-connect/test-in-app-purchases/test-in-app-purchases-with-sandbox`
- Sandbox Apple Account settings and renewal rate: `https://developer.apple.com/help/app-store-connect/test-in-app-purchases/manage-sandbox-apple-account-settings`
- TestFlight subscriptions and in-app purchases: `https://developer.apple.com/help/app-store-connect/test-a-beta-version/testing-subscriptions-and-in-app-purchases-in-testflight`
- App Store Server API test notification: `https://developer.apple.com/documentation/appstoreserverapi/request-a-test-notification`
- App Store Server Notifications test notification setup: `https://developer.apple.com/help/app-store-connect/manage-app-information/enable-app-store-server-notifications`
- First in-app purchase or subscription submission: `https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-in-app-purchase`
- Build numbers and bundle version: `https://developer.apple.com/documentation/bundleresources/information_property_list/cfbundleversion`
- Supabase local development and migrations: `https://supabase.com/docs/guides/local-development`
- Supabase Edge Functions testing: `https://supabase.com/docs/guides/functions/unit-test`
- Supabase scheduled functions: `https://supabase.com/docs/guides/functions/schedule-functions`
- Supabase secrets: `https://supabase.com/docs/guides/functions/secrets`

## 103. Testing environment matrix

| Environment | Primary purpose | Backend behavior | What it proves | What it cannot prove |
| --- | --- | --- | --- | --- |
| Local StoreKit configuration | Product loading, local purchase UI, cancellation, pending transactions, renewals, expiration, refund/revocation simulation, product changes, transaction listener behavior, app restart recovery. | Must not write production provider records. Use mocked backend adapter or isolated local/staging backend that rejects `xcode` transactions from production entitlement resolution. | Client state machine, plugin mapping, UI states, duplicate-tap prevention, finish policy, restart recovery, local automation. | Real App Store Connect products, real signed transaction JWS, App Store Server API, App Store Server Notifications, storefront localization, real billing retry. |
| Apple sandbox | Real StoreKit products, real sandbox JWS, App Store Server API, App Store Server Notifications V2, accelerated renewal, restore across devices, sandbox account behavior, refund/revocation tooling where available. | Events should go to staging/sandbox provider records. Sandbox Apple rows must not grant production `public.entitlements`. | Product metadata, server verification, notification intake, app account token ownership, accelerated lifecycle, restore/reconciliation. | Real-money storefront behavior, production renewal timing, production notification reliability, App Review approval. |
| TestFlight | Apple-processed build, sandbox purchasing on physical devices, real account linking, reinstall restore, notification/reconciliation validation, native UX, existing Stripe subscriber behavior, dual-provider QA accounts. | Use sandbox Apple environment and an explicitly isolated entitlement path. If production Supabase is used for app shell, sandbox rows still must not grant production web Pro. | Distribution-signed build behavior, physical-device flows, Apple account/sandbox interaction, native app lifecycle. | Production Apple billing, final App Store metadata, live production storefront prices, public release behavior. |
| Production App Store | Real-money purchase, production notifications, production reconciliation, production management/restore, real pricing/localization. | Production Apple rows can grant production Pro only after all gates pass and Apple participation is enabled in the resolver. | Real production subscription lifecycle. | Anything that should have been caught before release. Production is not a test substitute. |

Sandbox users should be identifiable through test account conventions and provider environment, not by logging Apple IDs. Sandbox data can be retained for audit and debugging but should be excluded from production entitlement summaries and conversion reporting.

## 104. StoreKit configuration design

Future local StoreKit configuration:

- Recommended app-level file: `ios/App/StoreKit/CanYouGeoLocal.storekit`.
- Recommended plugin test fixture: `plugins/cgy-storekit/ios/Tests/CgyStoreKitPluginTests/Resources/CgyStoreKit.storekit`.
- Commit the files when created. StoreKit configuration files are test metadata, not secrets.
- Associate the app-level file only with Debug/local testing schemes, not Release archive behavior.
- Product group: one auto-renewable subscription group for Can You Geo Pro.
- Product identifiers: `com.canyougeo.pro.monthly` and `com.canyougeo.pro.annual`.
- Entitlement level: identical Pro access for both products.
- Durations: monthly and annual.
- Test prices: may mirror current web price intent for local readability, but must not be treated as Apple price approval.
- Localization: include at least English local product names/descriptions; add long-string fixtures if possible.
- Family Sharing: disabled in local config to match the recommended initial release.
- Offers: no free trial, introductory discount, offer code, or promotional offer.
- Grace-period/billing-retry simulation: use StoreKit Testing controls where supported, plus sandbox for server-visible lifecycle.
- Renewal simulation: use local StoreKit controls for fast client/plugin tests; use sandbox renewal rate for server and notification tests.

The local configuration may mirror production product identifiers, but it is not proof that App Store Connect products exist, are approved, or have correct territory pricing.

## 105. Automated test pyramid

| Layer | Coverage |
| --- | --- |
| Pure TypeScript tests | Purchase state machine, product allowlist, product selection, signed-out purchase block, duplicate-tap prevention, Stripe subscriber suppression, Apple subscriber management state, dual-provider warning, restore-result handling, failure-message mapping, analytics sanitization, web fallback, entitlement refresh behavior. |
| Swift unit tests | StoreKit model normalization, product filtering, `appAccountToken` validation, purchase-result mapping, transaction update buffering, stable error-code normalization, finish policy, retry queue, release logging redaction. |
| StoreKit Testing / simulator tests | Local product load, cancel, pending, purchase success through mocked backend, restore, transaction redelivery after restart, refund/revocation client mapping where supported. |
| Database tests | Provider subscription constraints, provider event uniqueness, RLS isolation, service-role-only writes, environment separation, dual-provider resolution, provider cancellation isolation, backfill correctness, concurrent event processing, resolver transactionality, deleted-account behavior. |
| Edge Function tests | Purchase verification, JWT validation, Apple verifier adapter, product allowlist, account ownership, duplicate submissions, invalid bundle ID, wrong environment, notification verification, retry response behavior, out-of-order events, reconciliation, Apple API outage, idempotent analytics. |
| Native black-box tests | Paywall entry, product loading, signed-out block, purchase cancellation, purchase pending where controllable, restore, manage subscription, existing Stripe subscriber, billing-boundary regression, rotation/safe areas, offline/reconnect. |

Native black-box flows that may remain partly manual: successful paid sandbox purchase, Ask to Buy/pending approval, refund/revocation, App Store subscription management UI, Apple account switching, and accelerated renewal timing.

## 106. Manual QA matrix

| Test ID | Environment | Preconditions | Action | Expected client result | Expected backend/result summary | Analytics | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| IAP-001 | Local StoreKit | Signed-in Free, mocked backend accept | Buy monthly | Confirming, then Pro active | Mock accepted; no production write | Client funnel only | Test output/video without IDs |
| IAP-002 | Sandbox/TestFlight | Signed-in Free, sandbox monthly ready | Buy monthly | Pro active after backend refresh | Apple production untouched; sandbox row accepted | Server purchase after idempotency | Entitlement summary, sandbox receipt state |
| IAP-003 | Sandbox/TestFlight | Signed-in Free, sandbox annual ready | Buy annual | Pro active after backend refresh | Annual provider row accepted | Server purchase after idempotency | Entitlement summary |
| IAP-004 | Local/Sandbox | Purchase sheet open | Cancel purchase | Returns to paywall, no Pro grant | No provider state change | Cancel event | Client log/test output |
| IAP-005 | Local/Sandbox | Pending approval available | Start pending purchase | Pending state, no Pro active | No entitlement until accepted | Pending event | StoreKit/sandbox state |
| IAP-006 | Any native | Offline | Tap subscribe | Purchase blocked or fails safely | No provider write | Failure event | Offline flow output |
| IAP-007 | Sandbox | Backend disabled/transient | Apple accepts, backend unavailable | Confirming/pending, no success claim | Pending event queued or no grant | Backend pending/failure | Sanitized event state |
| REN-001 | Sandbox | Active subscription | Accelerated renewal | Renewal status visible after refresh | Renewal event updates provider row | Server renewal once | Notification/event ledger |
| REN-002 | Sandbox | Active subscription | Turn off auto-renew | Pro active until period end | Cancel-at-period-end state recorded | Status event | Entitlement row |
| REN-003 | Sandbox | Payment failure/grace configured | Trigger billing issue | Grace copy if active | Grace state recorded | Status event | Provider state |
| REN-004 | Sandbox | Billing retry without access | Trigger retry | Recovery copy, Pro paused if resolver says so | Billing retry state | Status event | Provider state |
| REN-005 | Sandbox | Expired subscription | Wait for expiration | Free/upgrade visible after current refresh | Apple provider inactive; no other provider active | Expiration once | Entitlement transition |
| REN-006 | Sandbox | Expired subscription | Resubscribe | Pro active after accept | New event linked to original transaction | Purchase/renewal as applicable | Provider row |
| REN-007 | Sandbox | Active monthly | Switch to annual | Apple management/change copy; no duplicate CTA | Subscription group state reconciled | Status event | Apple status |
| REN-008 | Sandbox | Active annual | Switch to monthly | Change state reconciled | Provider row updated by verified status | Status event | Apple status |
| RES-001 | TestFlight | Same account, reinstall | Restore | Pro restored after backend refresh | Same owner accepted | Restore granted once | Device observation |
| RES-002 | TestFlight | Second device, same account | Restore | Pro active | Same owner accepted | Restore event | Device observation |
| RES-003 | TestFlight | Different Can You Geo account | Restore | Conflict/support copy | Ownership conflict, no transfer | Conflict event | Sanitized conflict state |
| RES-004 | TestFlight | No Apple purchase | Restore | No Apple subscription found | No provider change | Restore none | Device observation |
| RES-005 | TestFlight | Existing Stripe Pro | Restore no Apple purchase | Stripe Pro remains active | No Apple row; Stripe unaffected | Restore none | Entitlement summary |
| COEX-001 | Staging | Stripe only | Open iOS paywall | Pro active, website-managed | No Apple purchase CTA | Paywall suppressed | Screenshot sans IDs |
| COEX-002 | Staging | Apple only | Open account | Pro active, Apple-managed | Apple provider active | Paywall suppressed | Entitlement summary |
| COEX-003 | Staging | Stripe and Apple active | Open account | Dual-provider warning | Pro active; duplicate condition recorded | Warning displayed | Sanitized provider state |
| COEX-004 | Staging | Stripe canceling, Apple active | Refresh | Pro stays active | Apple still grants | Status event | Resolver output |
| COEX-005 | Staging | Apple canceling, Stripe active | Refresh | Pro stays active | Stripe still grants | Status event | Resolver output |
| REF-001 | Sandbox | Active Apple | Refund/revoke where available | Neutral access-change copy if no other provider | Provider revocation, resolver recompute | Refund/revoke once | Provider event state |
| REF-002 | Staging | Apple revoked, Stripe active | Refresh | Pro stays active with support context | Stripe still grants | Status event | Resolver output |
| ACC-001 | TestFlight | Signed in Pro | Sign out/in | Correct account and Pro reload | No provider mutation | Login only | Device observation |
| ACC-002 | TestFlight | Pending purchase | Sign out attempt | Warn/block unsafe action or preserve pending | No cross-account grant | Pending/failure | Device observation |
| ACC-003 | Staging | Deleted account, active Apple | Notification/reconcile | Orphaned handling, no new grant | Orphaned provider state | Ops event | DB assertion |
| OPS-001 | Staging | Invalid notification signature | POST notification | Safe rejection | No provider mutation | None/server failure metric | Function test |
| OPS-002 | Staging | Duplicate notification | Deliver twice | No duplicate grant | Idempotent ledger | Server event once | Ledger assertion |
| OPS-003 | Staging | Out-of-order events | Expire then renew | Latest verified state wins | Resolver correct | Server event once per state | Test output |
| OPS-004 | Staging | Apple API outage | Reconcile | Backoff/dead-letter if needed | No unsafe grant | Outage metric | Logs/queue state |
| OPS-005 | Staging | Sandbox event in production path | Process event | Guard blocks production entitlement | Contamination alert | Error metric | Guard assertion |

This matrix is the minimum. Build 2 cannot move to App Review until the TestFlight subset and backend lifecycle subset pass with non-sensitive evidence.

## 107. QA evidence standards

Acceptable evidence:

- Automated test command output.
- Native black-box/Maestro output and non-sensitive recordings.
- TestFlight physical observation notes.
- App Store Connect sandbox subscription state with account identifiers redacted.
- Sanitized provider-event rows using QA labels or hashes.
- `public.entitlements` summary output for QA accounts without emails or user UUIDs in reports.
- App Store Server Notification delivery status and request-test-notification result.
- Reconciliation queue counts and state transitions.

Do not store:

- Apple ID credentials.
- Supabase user UUIDs in public reports.
- Transaction IDs, original transaction IDs, app account tokens, signed JWS, receipts, recovery links, private keys, screenshots with emails/passwords, or raw provider payloads.

Screenshots are allowed only when they do not reveal credentials, transaction identifiers, or private account data.

## 108. Implementation checkpoint sequence

Recommended sequence after architecture approval:

| Checkpoint | Scope | Exit criteria |
| --- | --- | --- |
| 5B Provider-neutral database foundation | Add billing schema, provider subscription/event tables, resolver, RLS, current Stripe backfill, and compatibility projection. | Resolver matches current legacy output; no Pro loss/gain regressions. |
| 5C Stripe migration to provider-neutral writes | Update Stripe webhook to write provider records and recompute effective summary while preserving rollback compatibility. | Production Stripe behavior validated before Apple depends on the resolver. |
| 5D Apple server foundation | Add Apple verifier adapter, purchase verification endpoint, notification endpoint, reconciliation job, and secrets wiring without secret values. | Sandbox-only backend verifies purchases/notifications and blocks production contamination. |
| 5E StoreKit 2 Capacitor plugin | Add local plugin package, Swift service, TypeScript contract, buffered transaction listener, restore, management, StoreKit config tests. | Local StoreKit simulator tests and native compile pass. |
| 5F Native subscription UI | Add paywall, selector, purchase coordinator, account status, restore, management, dual-provider handling, analytics hooks. | UI/native boundary tests pass; no Stripe fallback in iOS. |
| 5G App Store Connect setup | Paid Apps Agreement, tax/banking, subscription group/products, pricing/localization, notifications, API key, grace-period decision, sandbox accounts. | Administrative setup documented and sandbox product loading proven. |
| 5H Build 2 TestFlight | Increment to build 2, archive/upload, sandbox purchase lifecycle testing, renewal/restore/refund/reconciliation QA. | Full TestFlight matrix passes with evidence. |
| 5I App Review submission | Submit first subscriptions with app version, metadata, reviewer account, notes, restore/management paths, legal links. | Review passes; public release waits for explicit approval. |

Do not combine 5B-5F into one large implementation. The provider-neutral backend foundation should land before Apple UI can grant anything.

## 109. Migration gates

| Gate | Required before proceeding |
| --- | --- |
| Before 5C | Backfill verified; resolver matches legacy Stripe output; no existing Pro user loses access; no Free user gains Pro; RLS/service-role tests pass. |
| Before 5D | Stripe uses provider-neutral records successfully; rollback remains available; provider event ledger idempotency proven; provider cancellation isolation tested. |
| Before 5E | Apple backend contracts deployed in sandbox/staging; product allowlist and environment separation ready; purchase verification endpoint can reject unsafe data. |
| Before 5F | StoreKit plugin contract stable; backend returns accepted/pending/conflict/failure states; native billing boundary still blocks Stripe. |
| Before 5G | Legal entity/developer-name path reviewed; Paid Apps Agreement/tax/banking timing approved; product identifiers and group name approved; legal-copy update plan approved. |
| Before build 2 | Local StoreKit tests pass; sandbox products load; request-test-notification passes; purchase/restore on physical local or TestFlight-prep build passes. |
| Before App Review | Full TestFlight matrix passes; no P0/P1 billing issue open; legal links/disclosures complete; support runbooks ready; reconciliation operational. |
| Before public release | App Review approved; production notification endpoint healthy; rollback/purchase-disable flag tested; support monitoring staffed; explicit release approval given. |

Any gate failure stops promotion to the next checkpoint until resolved or explicitly waived with documented risk.

## 110. Build and version strategy

Current baseline:

- Public/internal iOS baseline: `1.0.0` build `1`.
- First Apple-billing binary: keep marketing version `1.0.0`, increment build to `2`.

Rules:

- Every uploaded binary must use a new build number.
- Do not reuse build `2` after upload, even for a small fix.
- If build 2 fails TestFlight or review, upload build 3 or higher.
- Keep all billing implementation under marketing version `1.0.0` until public submission unless the product scope changes enough to warrant `1.1.0`.
- Docs, migrations, Edge Functions, and backend changes do not require iOS build-number changes unless the native binary changes.
- TestFlight builds expire under Apple's TestFlight policy; record expiration risk in the release plan.
- Version/build numbers are changed only in an explicitly approved binary checkpoint.

Recommended default: build all Apple-billing implementation toward `1.0.0 (2)` and reserve marketing-version changes for public product scope or App Review strategy.

## 111. Feature flags and rollout controls

Recommended future flags:

| Flag | Owner | Safe default | Can disable without new binary? | Notes |
| --- | --- | --- | --- | --- |
| Native Apple paywall enabled | Server/build | Off | Yes if server-controlled | Shows Apple paywall instead of unavailable preview. |
| Apple product loading enabled | Server/build | Off | Yes | Must not turn on before StoreKit plugin and products exist. |
| Apple purchase enabled | Server | Off | Yes | Emergency kill switch for new purchases. |
| Restore enabled | Server | Off until backend ready | Yes | Can remain on if backend reconciliation is safe. |
| Manage Subscription enabled | Build/server | Off until plugin ready | Partly | Requires native method in binary. |
| Server notification processing enabled | Server | Off/record-only | Yes | Record-only mode useful before mutation. |
| Apple resolver participation enabled | Server | Off | Yes | Controls whether Apple rows affect `public.entitlements`. |
| Sandbox-only mode | Server | On for non-production | Yes | Prevents production entitlement grants from sandbox rows. |
| Internal tester allowlist | Server | On during QA | Yes | Limits purchase UI to QA accounts. |
| Emergency purchase disable | Server | On-call controlled | Yes | Must not remove existing verified access. |

Flag changes should be logged with operator, time, environment, old value, new value, and reason. No remote flag may enable Apple purchases before backend verification, product allowlist, and environment separation are ready.

## 112. Rollback strategy

| Layer | Rollback action | Existing entitlement impact | Prohibited fallback |
| --- | --- | --- | --- |
| Database | Preserve legacy Stripe columns, keep compatibility projection, avoid destructive column removal, keep provider rows for analysis. | Existing verified access should remain. | Do not drop provider data during an incident. |
| Stripe migration | Restore legacy webhook entitlement writes if needed; disable provider-neutral Stripe mutation path. | Stripe Pro preserved through legacy path. | Do not double-process the same Stripe event. |
| Apple backend | Disable purchase verification for new purchases; keep notification endpoint acknowledging safely or queueing record-only where possible; preserve verified access during temporary outage. | Existing Apple Pro can remain for bounded cached period if resolver state is trusted. | Do not grant Pro from unverified client claims. |
| Native UI | Disable purchase initiation remotely; show temporary unavailable copy; keep account status and management where safe. | Existing Pro remains visible. | Do not fall back to Stripe checkout or Stripe portal inside iOS. |
| Binary/TestFlight | Remove bad build from tester groups; upload a higher build with fixes. | Depends on server state; avoid changing entitlements through binary rollback alone. | Never replace build 2 with another build 2. |
| Public App Store | Disable server purchase path if urgent; submit expedited fix only if needed. | Existing access preserved where safe; new purchases disabled. | Do not rely on immediate App Store binary rollback. |

Rollback usually disables new purchase availability first. It should not remove existing verified entitlement unless there is evidence the entitlement is unsafe or assigned to the wrong account.

## 113. Operational runbooks

| Runbook | Detection | Immediate containment | Inspect | Safe actions | Prohibited actions | Recovery verification | Escalate when |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Apple notification endpoint outage | 5xx spike, missing notifications, App Store delivery failures | Put endpoint in minimal verified/queue mode if available | Provider event backlog, function logs, Apple status | Fix endpoint, replay notification history, reconcile | Manual entitlement edits by default | Notifications process and backlog drains | Valid paid events cannot be processed |
| Apple JWS verification failures | Signature/bundle/environment failures spike | Disable new grants if verifier trust is uncertain | Verifier deploy, cert/root config, environment, Apple status | Roll back verifier, use official library path, reconcile | Accept unverified JWS | Known valid sandbox/prod payload verifies | Any production valid payload rejected broadly |
| App Store Server API outage | Apple API 5xx/429 or auth failures | Disable new purchase finish; keep pending/retry | API status, key auth, rate limits | Backoff, queue reconciliation | Grant from client state | Pending queue clears after recovery | Purchases accepted by Apple cannot be confirmed |
| Reconciliation backlog | Queue age/count grows | Disable new purchase if backlog threatens grants | Queue states, locks, Apple API latency | Increase workers within limits, process priority rows | Skip verification to catch up | Oldest age under threshold | Backlog affects active access |
| Product metadata unavailable | StoreKit product load failures | Hide purchase buttons, keep Restore if safe | Product ids, App Store Connect status, storefront | Retry/load diagnostics | Hard-code Apple price | Products load in sandbox/TestFlight | Broad TestFlight/prod product outage |
| Apple accepted but Pro not granted | Support ticket, pending state, ledger accepted but no entitlement | Disable affected purchase path if systemic | Provider event, resolver logs, entitlement row | Re-run resolver/reconcile idempotently | Direct public row edit unless approved emergency | User Pro active after verified fix | Multiple paid users affected |
| Restore conflict | Conflict response or support ticket | Block local grant | Original transaction owner, account state | Guide user to owning account/support | Silent transfer | Conflict recorded and user informed | Many conflicts or wrong assignment suspected |
| Dual-provider subscriber | Resolver duplicate condition | Suppress purchase CTA | Provider rows and management paths | Show dual warning, support review | Auto-cancel either provider | User sees both management paths | Duplicate billing encouraged by app |
| Sandbox event in production path | Environment guard alert | Disable Apple resolver participation | Event env, resolver env filters | Fix guard, remove production effect if any | Treat sandbox as production | Production entitlement unchanged | Any production grant from sandbox |
| Refund or revocation | Provider event | Recompute across all providers | Affected provider row, other active providers | Neutral support copy, resolver retry | Accuse user or reveal event internals | Access matches remaining providers | Wrong users downgraded |
| Deleted account with active Apple subscription | Orphaned provider row | Do not auto-link recreated account | Deletion history, provider ownership | Guide Apple management/support | Auto-assign to new account | Orphan state recorded | Active paying user cannot recover access |
| Subscription products rejected | App Review/App Store Connect rejection | Keep Apple UI disabled | Rejection reason, metadata, legal links | Correct metadata/config in next checkpoint | Ship hidden unsupported product | Products Ready/Approved | Blocks build 2/App Review |
| Build 2 rejected | App Review rejection | Do not release; keep previous build | Rejection notes, binary, metadata | Fix in build 3+ | Reuse build 2 | New build accepted | Billing or policy issue unclear |
| Emergency purchase disable | P0/P1 incident | Turn off purchase flag, preserve access | Flags, provider events, support tickets | Disable new purchases, post internal note | Redirect iOS to Stripe checkout | New purchases blocked, existing access stable | Paid access/security impacted |
| Stripe entitlement regression | Resolver mismatch, Pro loss/gain | Roll back Stripe provider-neutral writer if needed | Stripe events, provider rows, legacy rows | Restore legacy path, reconcile | Delete provider rows | Stripe behavior matches baseline | Existing Pro users affected |

Manual database edits are last-resort emergency actions requiring approval, audit, before/after evidence, and a follow-up migration or support tool.

## 114. Incident severity model

| Severity | Examples | Response | Release impact |
| --- | --- | --- | --- |
| P0 | Widespread paid users lose access; purchases succeed but are not recorded; incorrect users receive Pro; cross-account assignment; production/sandbox contamination; signature verification failure. | Immediate containment, disable new purchases if needed, owner notification, incident log. | Blocks release and requires post-fix validation. |
| P1 | Restore broadly broken; notifications failing but reconciliation works; new purchases disabled; duplicate billing encouraged; management links broadly unavailable. | Same-day fix or clear mitigation; support guidance. | Blocks App Review/public release; may block TestFlight expansion. |
| P2 | Localized product metadata issue; one status message wrong; analytics missing; non-blocking reconciliation delay. | Scheduled fix with monitoring. | Does not block internal testing unless it hides a billing truth. |
| P3 | Documentation typo, low-risk copy polish, non-critical test fixture gap. | Backlog or next checkpoint. | No release block. |

Any issue that can charge a user, deny paid access, grant Pro to the wrong account, or mix sandbox with production is P0 until proven otherwise.

## 115. App Review submission checklist

Future checklist before submitting Apple IAP:

- Paid Apps Agreement active.
- Tax and banking complete.
- Subscription group configured.
- Monthly and annual products created with approved identifiers.
- Products Ready to Submit.
- Prices selected and reviewed.
- Product localization complete.
- Family Sharing disabled or final state verified.
- Grace-period state verified.
- Server Notifications V2 configured.
- App Store Server API key/issuer/key ID configured in secret store.
- Request Test Notification succeeds.
- Privacy and Terms URLs valid and Apple-aware.
- Restore Purchases visible on paywall and account.
- Manage Apple Subscription visible for Apple subscribers.
- Reviewer account available without exposing credentials in Git.
- Review notes explain web Stripe subscription coexistence and native Apple IAP.
- Native Stripe checkout and portal absent.
- Account deletion path documented.
- Build 2 or later selected.
- First subscriptions attached to the app submission as required by App Store Connect.
- Screenshots/metadata do not promise unsupported features.
- Support contact monitored.

Do not perform any checklist action in this checkpoint.

## 116. Final business-decision table

| Decision | Recommended default | Alternatives | Consequence | Needed before implementation? | Needed before App Store Connect setup? | User approval status |
| --- | --- | --- | --- | --- | --- | --- |
| StoreKit approach | First-party StoreKit 2 Capacitor plugin | Third-party IAP plugin, RevenueCat | More control, more maintenance | Yes | No | Recommended, not final-approved |
| Product IDs | `com.canyougeo.pro.monthly`, `com.canyougeo.pro.annual` | Different namespace | Stable backend/App Store contract | Yes | Yes | Recommended, not final-approved |
| Subscription group name | `Can You Geo Pro` | Product-specific group names | One entitlement level and upgrade/downgrade path | No | Yes | Needs approval |
| Family Sharing | Disabled initially | Enabled | Simpler account ownership | No | Yes | Recommended, not final-approved |
| Grace period | Decide before setup | Off or on | Affects billing-failure UX and tests | No | Yes | Deferred |
| Trials/offers | None initially | Trial, intro discount, offer codes | Simpler launch | No | Yes | Recommended, not final-approved |
| Apple pricing | Near customer-price parity | Exact parity, platform-adjusted | Customer clarity vs margin | No | Yes | Needs approval |
| Annual default | Annual selected as Best value | Monthly default, no default | Can improve annual adoption without hiding monthly | Yes for UI | No | Recommended, not final-approved |
| Sign-in requirement | Required before purchase | Allow anonymous Apple purchase | Enables account linking | Yes | No | Recommended, not final-approved |
| Stripe subscriber Apple override | No override initially | Allow forced Apple purchase | Avoids dual billing | Yes | No | Recommended, not final-approved |
| `appAccountToken` | Supabase user UUID | Generated billing UUID | Strong ownership binding | Yes | No | Recommended, not final-approved |
| Finish policy | Finish after backend accepted/already processed | Finish after local verification | Protects entitlement integrity | Yes | No | Recommended, not final-approved |
| Sandbox entitlement behavior | Isolated from production Pro | Sandbox can grant production Pro | Prevents contamination | Yes | Yes for testing config | Recommended, not final-approved |
| Deleted-account handling | Orphan provider row, no auto-link | Auto-link recreated account | Safer ownership | Yes | No | Needs approval |
| Manual reassignment | Audited operator-only exception | Self-serve transfer | Reduces abuse risk | No | No | Needs approval |
| Dual-provider messaging | Calm warning and support path | Hide one provider | Avoids surprise billing | Yes for UI | No | Recommended, not final-approved |
| Analytics policy | Server-backed conversion truth, sanitized client funnel | Client conversion event as purchase | Avoids double counting | Yes | No | Recommended, not final-approved |
| Paid Apps Agreement timing | Before 5G | Earlier admin-only work | Required for paid products | No | Yes | Needs approval/admin action |
| Legal entity/developer name timing | Review before 5G | Defer to App Review | Avoids metadata surprise | No | Yes | Needs approval/admin action |

Do not treat recommendations as final approvals. Use an explicit user approval checkpoint before 5B implementation and again before 5G App Store Connect setup.

## 117. Architecture-readiness criteria

Implementation-ready means:

- No unresolved security blocker.
- Product identifiers approved.
- Account-linking policy approved.
- Deleted-account policy approved.
- Sandbox/production policy approved.
- Migration strategy approved.
- Rollback strategy approved.
- Administrative timing approved.
- Testing matrix complete enough for 5B-5H.
- Implementation sequence agreed.

Current result after 5A-3C2:

- Technical architecture is sufficiently detailed to plan 5B.
- Apple billing as a whole is not yet implementation-approved because final business decisions, legal copy, App Store Connect administration, product pricing, grace-period choice, and deleted-account policy still require explicit approval.
- It is safe to start 5B only if the user approves the provider-neutral database foundation scope and confirms no App Store Connect or native purchase UI work should be bundled into it.

## 118. Recommended next implementation checkpoint

Recommended next checkpoint: `5B Provider-neutral database foundation`.

Scope should include only:

- Future billing schema migration.
- Provider subscription and provider event ledger tables.
- Service-role-only RLS and constraints.
- Effective entitlement resolver.
- Current Stripe backfill/dry-run tests.
- Compatibility with existing `public.entitlements` reads.
- Focused tests proving current Stripe users retain the same effective access.

Scope should exclude:

- Apple StoreKit plugin, Apple UI, App Store Connect, Apple secrets, Apple endpoints, paid products, StoreKit configuration, TestFlight build 2, and any production Apple billing behavior.

## 119. Explicit non-actions taken in 5A-3C2

This checkpoint did not:

- Add runtime code, StoreKit configuration files, Swift code, TypeScript purchase code, UI, or analytics implementation.
- Add dependencies, migrations, Supabase tables, Edge Functions, scheduled jobs, or deployments.
- Modify Stripe checkout, Stripe portal, Stripe webhook behavior, Supabase Auth, or entitlement runtime behavior.
- Accept Apple agreements, enter tax/banking information, create subscription groups/products/offers, configure Family Sharing, configure notifications, create App Store Server API keys, or change App Store Connect.
- Change legal pages, pricing constants, app metadata, iOS version/build, native projects, Android, TestFlight, App Review, production deployment, or Cloudflare/Supabase configuration.
- Upload build 2, create a PR, merge, force-push, or make unrelated changes.

---

Checkpoint 5B-1A status: provider-neutral private billing schema only. This checkpoint adds the additive database
foundation for future provider reconciliation. It does not deploy the migration, change runtime billing behavior, backfill
Stripe, add an entitlement resolver, add Apple verification, or alter native purchase UI.

## 120. Provider-neutral schema implementation status

Added migration:

- `supabase/migrations/20260716090000_provider_neutral_billing_schema.sql`

Tables added:

- `billing.provider_subscriptions`
  - private normalized provider subscription state for Stripe, Apple, and future Google Play;
  - provider/environment checks separate Stripe `test|live`, Apple `sandbox|production`, and Google Play `test|production`;
  - provider/environment partial uniqueness for provider subscription references, Apple original transaction references, and latest transaction references;
  - canonical subscription statuses from section 20;
  - `user_id` and StoreKit `app_account_token` reference `public.profiles(id) on delete set null` so account deletion keeps audit rows without preserving a live profile relationship;
  - no raw receipts, signed transactions, emails, session tokens, or analytics identifiers.
- `billing.provider_events`
  - private provider replay and reconciliation ledger;
  - idempotency by unique `(provider, environment, provider_event_ref)`;
  - provider occurrence, effective, received, attempted, and processed timestamps;
  - processing/reconciliation state with bounded retry count;
  - sanitized provider references plus `payload_hash` only, not raw payload storage.

Security posture:

- The `billing` schema is service-role-only.
- `anon` and `authenticated` have no grants on `billing.provider_subscriptions` or `billing.provider_events`.
- RLS is enabled and forced on both tables.
- No browser-readable policies are created.
- Future trusted Supabase Edge Functions or reviewed operator jobs are the only intended writers.

Current app behavior remains unchanged:

- `public.entitlements` remains the only app-facing effective entitlement summary.
- Existing Stripe Checkout, Stripe Customer Portal, Stripe webhook, `public.stripe_webhook_events`, and native no-Stripe-purchase guardrails are unchanged.
- No provider-neutral resolver, dry-run parity comparison, backfill, dual-write, StoreKit plugin, Apple verification endpoint, App Store Server Notification endpoint, or Google Play work is included.

Focused tests:

- `supabase/tests/provider_neutral_billing_schema.structure.test.ts` verifies the schema, provider/environment constraints,
  uniqueness, event idempotency, deletion/retention posture, service-role-only access, raw-payload minimization, and that
  current `public.entitlements` / Stripe webhook behavior is not altered by this migration.

Next recommended checkpoint: `5B-1B provider-neutral resolver design and dry-run fixtures`, or the separately approved
next slice of the 5B database foundation. Do not deploy or write to this schema until the resolver, Stripe backfill/dual-write,
and rollback checks are implemented and validated.

---

Checkpoint 5B-1B status: side-effect-free provider-neutral entitlement resolver. This checkpoint adds the private
computation function and local executable fixture coverage only. It does not deploy the migration, backfill Stripe,
dual-write provider state, update `public.entitlements`, change Stripe runtime behavior, or add Apple/StoreKit
implementation.

## 121. Provider-neutral resolver implementation status

Added migration:

- `supabase/migrations/20260716100000_provider_neutral_entitlement_resolver.sql`

Resolver function:

- `billing.resolve_effective_entitlement(p_user_id uuid, p_environment text, p_as_of timestamptz default now())`
- Returns one normalized decision row with:
  - `effective_plan`
  - `effective_access_status`
  - `grants_pro`
  - `active_provider_count`
  - `active_providers`
  - `management_provider`
  - `multiple_active_providers`
  - `effective_period_end`
  - `cancel_at_period_end`
  - `grace_period_end`
  - `requires_reconciliation`
  - `computed_at`
  - sanitized `decision_reason`

Implemented access rules:

- `active` grants Pro only within a verified current period.
- `cancelled_active_until_period_end` grants Pro until `current_period_end`.
- `grace_period` grants Pro until `grace_period_ends_at` and surfaces reconciliation.
- `pending`, `billing_retry`, `expired`, `revoked`, `refunded`, `paused`, and `unknown_needs_reconciliation` do not grant Pro by themselves.
- Access intervals are start-inclusive and end-exclusive: `p_as_of >= current_period_start` when present and `p_as_of < current_period_end` or `p_as_of < grace_period_ends_at`.
- Unknown or missing required timestamps produce a conservative Free result with reconciliation surfaced unless another provider independently grants Pro.

Environment behavior:

- Caller supplies a canonical resolver environment: `production` or `sandbox`.
- `production` evaluates Stripe `live`, Apple `production`, and Google Play `production` rows.
- `sandbox` evaluates Stripe `test`, Apple `sandbox`, and Google Play `test` rows.
- Sandbox rows do not grant production Pro, and production rows are not compared with sandbox rows.

Multiple-provider behavior:

- Pro is granted if at least one environment-matching provider row independently grants Pro.
- One provider expiring, retrying, refunding, revoking, or needing reconciliation does not remove access from another valid provider.
- Multiple valid providers return `management_provider = 'multiple'` and `multiple_active_providers = true`.
- Effective period end is the latest access-granting period end among active providers.

Security and side-effect posture:

- The function lives in the private `billing` schema.
- `SECURITY INVOKER` is used with a locked search path.
- Execute is revoked from `public`, `anon`, and `authenticated`; only `service_role` is granted execute.
- The result does not expose Stripe customer/subscription ids, Apple transaction/original transaction ids, Google purchase tokens, provider event identifiers, payload hashes, emails, or raw payloads.
- The resolver reads private provider rows only and does not mutate `public.entitlements`, `billing.provider_subscriptions`, `billing.provider_events`, analytics, or runtime application state.

Fixture coverage:

- `supabase/tests/provider_neutral_entitlement_resolver.sql` runs executable local database fixtures for no-record, single-provider, dual-provider, timestamp-boundary, environment-isolation, management-provider, reconciliation, ordering/history, deleted-account retention, execution-privilege, and side-effect checks.
- Synthetic legacy Stripe parity fixtures cover Free, active monthly Pro, active annual Pro, cancelling at period end, expired, payment failure/retry, and reactivated renewal outcomes without reading or copying production data.
- `supabase/tests/provider_neutral_entitlement_resolver.structure.test.ts` guards the function contract, environment mapping, privilege posture, multi-provider OR semantics, and no-mutation boundary.

Next recommended checkpoint: `5B-1C provider-neutral compatibility projection and Stripe backfill dry-run`, or another
explicitly approved slice that proves Stripe backfill/dual-write parity before anything writes app-readable entitlement
state.

---

Checkpoint 5B-1C status: compatibility projection and Stripe backfill dry-run mapping only. This checkpoint adds private,
side-effect-free database helpers and fixture coverage. It does not deploy migrations, update `public.entitlements`, insert
provider subscription records, change Stripe webhook behavior, dual-write billing state, or add Apple/StoreKit or Google
Play implementation.

## 122. Entitlement compatibility projection status

Added migration:

- `supabase/migrations/20260716110000_provider_neutral_entitlement_compatibility_projection.sql`

Compatibility projection:

- `billing.project_effective_entitlement_summary(p_user_id uuid, p_environment text, p_as_of timestamptz default now())`
- Calls `billing.resolve_effective_entitlement(...)` and projects the private provider-neutral decision into the current
  app-facing `public.entitlements` semantics:
  - `plan = 'pro'` only when the resolver grants Pro;
  - `status = 'active'` for provider-neutral Pro grants, including cancel-at-period-end and grace-period grants;
  - `status = 'past_due'` for billing-retry states without an active provider;
  - `status = 'canceled'` for inactive provider states such as expired, refunded, revoked, paused, unknown, or incomplete;
  - `status = 'free'` when no provider records exist.
- The projection returns private operational fields needed by a future trusted writer:
  - `management_provider`
  - `multiple_active_providers`
  - `requires_reconciliation`
  - sanitized `decision_reason`
- It intentionally does not return Stripe customer/subscription ids, Apple transaction/original transaction ids, Google
  purchase tokens, provider event identifiers, payload hashes, emails, or raw provider payloads.

Stripe dry-run mapper:

- `billing.map_legacy_stripe_entitlement_candidate(...)`
- Maps one legacy Stripe-shaped `public.entitlements` row to a normalized Stripe provider-subscription candidate without
  inserting it.
- Requires an explicit Stripe environment of `live` or `test`; invalid environments return a reconciliation-required
  candidate and are not insertable.
- Preserves Stripe identifiers as private provider candidate references only:
  - `stripe_customer_id` -> `provider_customer_ref`
  - `stripe_subscription_id` -> `provider_subscription_ref`
  - `stripe_price_id` -> `provider_product_ref`
- Does not fabricate missing provider identifiers, clear existing legacy Stripe values, or update any existing row.
- Maps current Stripe behavior conservatively:
  - active and trialing rows with valid future period ends become `active`;
  - active/trialing rows with `cancel_at_period_end = true` become `cancelled_active_until_period_end`;
  - `past_due` becomes `billing_retry`;
  - `incomplete` becomes `pending`;
  - `canceled`, `cancelled`, `deleted`, `incomplete_expired`, and `unpaid` become `expired`;
  - `paused` becomes `paused`;
  - unknown or inconsistent rows become `unknown_needs_reconciliation`.
- Rows missing required subscription or product references are marked reconciliation-required and not insertable.
- Missing period ends for active/trialing Stripe rows are reconciliation-required and do not grant Pro.

Environment behavior:

- The projection still uses canonical resolver environments:
  - `production` evaluates Stripe `live`, Apple `production`, and Google Play `production`.
  - `sandbox` evaluates Stripe `test`, Apple `sandbox`, and Google Play `test`.
- The dry-run Stripe mapper accepts Stripe environments only:
  - `live`
  - `test`
- Fixture coverage proves Stripe `test` candidates cannot affect the `production` projection.

Security and side-effect posture:

- Both helpers live in the private `billing` schema.
- Both helpers are `SECURITY INVOKER` with a locked search path.
- Execute is revoked from `public`, `anon`, and `authenticated`; only `service_role` is granted execute.
- Neither helper mutates `public.entitlements`, `billing.provider_subscriptions`, `billing.provider_events`,
  `public.stripe_webhook_events`, analytics state, or runtime app state.
- Existing Stripe Checkout, Stripe Customer Portal, Stripe webhook, app entitlement reads, and native billing guardrails
  remain unchanged.

Fixture coverage:

- `supabase/tests/provider_neutral_entitlement_compatibility_projection.sql` runs executable local database fixtures for:
  - Free/no-provider rows;
  - active monthly and annual Stripe rows;
  - cancel-at-period-end rows;
  - trialing rows;
  - payment failure / `past_due`;
  - `unpaid`, `incomplete`, `incomplete_expired`, `paused`, unknown status, missing subscription ref, and missing period
    end;
  - reactivated renewal;
  - Stripe `test` vs `live` environment isolation;
  - another active provider preserving Pro access while Stripe requires reconciliation;
  - service-role-only execution;
  - no writes from either helper unless a fixture explicitly inserts a returned candidate.
- `supabase/tests/provider_neutral_entitlement_compatibility_projection.structure.test.ts` guards the migration contract,
  projection output, explicit environment handling, safe status mapping, privilege posture, and no runtime app/vendor
  behavior changes.

Remaining deferred work:

- A future trusted writer or backfill job may consume the dry-run mapper and projection, but no such writer exists yet.
- No production Stripe data has been copied, backfilled, or reconciled.
- No remote Supabase migration has been applied.
- No Apple/StoreKit, Google Play Billing, StoreKit product, App Store Server Notification, or Play Developer API
  implementation is included.

---

Checkpoint 5B-1D status: transactional entitlement-summary writer and synthetic backfill rehearsal. This checkpoint adds
the private database writer needed by future provider event processors, plus local-only rollback fixtures. It does not
deploy migrations, perform a real backfill, query production data, change Stripe webhooks, dual-write provider state from
runtime code, add triggers, or add Apple/StoreKit or Google Play implementation.

## 123. Transactional entitlement-summary writer status

Added migration:

- `supabase/migrations/20260716120000_provider_neutral_entitlement_summary_writer.sql`

Writer function:

- `billing.refresh_effective_entitlement_summary(p_user_id uuid, p_environment text, p_as_of timestamptz default now())`
- Intended caller: trusted service-role code only, inside the caller's existing provider-event transaction.
- Returns a safe compatibility summary:
  - `user_id`
  - `environment`
  - `plan`
  - `status`
  - `cancel_at_period_end`
  - `current_period_end`
  - `computed_at`
  - `updated_at`
  - `management_provider`
  - `multiple_active_providers`
  - `requires_reconciliation`
  - sanitized `decision_reason`
  - `write_action`
  - `applied`
  - sanitized `error_code`

Execution flow:

1. Validate `p_user_id` and canonical resolver environment.
2. Acquire a transaction-scoped, user-scoped advisory lock:
   `pg_advisory_xact_lock(hashtextextended('billing.refresh_effective_entitlement_summary:' || p_user_id::text, 0))`.
3. Confirm the user has a `public.profiles` row.
4. Lock the existing `public.entitlements` row with `FOR UPDATE` when it exists.
5. Call `billing.project_effective_entitlement_summary(...)`, which calls the provider-neutral resolver.
6. Insert or update the app-facing compatibility row.
7. Return the written safe summary.

Security decision:

- The writer is `SECURITY INVOKER`, not `SECURITY DEFINER`.
- Rationale: current trusted billing Edge Functions already write `public.entitlements` using service-role credentials, and
  this function is granted only to `service_role`. Keeping invoker security avoids creating a browser-callable privilege
  escalator and preserves the current service-controlled write boundary.
- Execute is revoked from `public`, `anon`, and `authenticated`; only `service_role` is granted execute.
- The function uses a locked search path and no dynamic SQL.
- The return value does not expose Stripe customer/subscription ids, Apple transaction/original transaction ids, Google
  purchase tokens, provider event identifiers, payload hashes, emails, auth tokens, or raw provider payloads.

Fields written:

- The writer may insert/update only current app-facing compatibility fields:
  - `plan`
  - `status`
  - `cancel_at_period_end`
  - `current_period_end`
  - `updated_at`
- It preserves legacy Stripe fields during the migration:
  - `stripe_customer_id`
  - `stripe_subscription_id`
  - `stripe_price_id`
  - `stripe_status`
- It does not add or write Apple references, Google Play references, provider-event data, profile data, email, auth state,
  analytics, or history rows.

Missing-row behavior:

- Existing app code treats a missing entitlement row as Free.
- The writer deterministically creates the minimum `public.entitlements` compatibility row when the user has a valid
  `public.profiles` row.
- Newly inserted rows do not invent Stripe-specific values; legacy Stripe columns remain null.
- If the user/profile is missing, the writer returns `applied = false` and `error_code = 'user_not_found'` without writing.
- Invalid environments return `applied = false` and `error_code = 'invalid_environment'` without writing.

Concurrency strategy:

- The transaction-scoped advisory lock is keyed by Supabase user UUID, so billing refreshes for different users do not
  serialize globally.
- The lock is acquired before resolver/projection execution and before writing `public.entitlements`.
- Existing rows are also locked with `FOR UPDATE` before refresh.
- Future Stripe, Apple, Google Play, restore, reconciliation, and support flows should mutate provider state and then call
  this function in the same transaction.
- The function does not commit independently, start an autonomous transaction, mark provider events processed, emit
  analytics, or swallow projection/update failures.

Local synthetic validation:

- `supabase/tests/provider_neutral_entitlement_summary_writer.sql` runs a rollback-only fixture suite that covers:
  - no-provider Free;
  - missing `public.entitlements` row;
  - Stripe active;
  - Apple active;
  - Google Play active;
  - Stripe and Apple cancel-at-period-end while still active;
  - Apple grace period;
  - billing retry;
  - expired, refunded, revoked, paused, pending, unknown, and stale/ambiguous states;
  - Stripe + Apple coexistence;
  - provider-specific failure not removing access from another valid provider;
  - production/sandbox isolation;
  - user_id-null provider records;
  - invalid environment and missing-user classifications;
  - repeated writer idempotency;
  - service-role-only execution;
  - rollback cleanup.

Synthetic backfill rehearsal totals:

- Total fixtures: 20.
- Legacy rows mapped: 20.
- Rows skipped as non-subscriptions: 1.
- Rows requiring reconciliation: 10.
- Provider rows inserted during rehearsal: 17.
- Compatibility rows refreshed: 20.
- Legacy access parity matched: 16.
- Legacy access parity mismatched: 4 intentionally malformed/ambiguous Pro-shaped repair fixtures:
  - missing subscription reference;
  - missing period end;
  - period-ended active row;
  - stale/ambiguous trialing row.
- Idempotent reruns passed: 20.
- Stripe-specific field preservation passed: 20.
- Transaction rollback and post-cleanup passed.

Current app/runtime behavior remains unchanged:

- Existing Stripe Checkout, Stripe Customer Portal, Stripe webhook, `public.stripe_webhook_events`, account entitlement
  reads, native billing guardrails, analytics, React UI, Edge Functions, Capacitor config, Android, iOS version/build, and
  StoreKit/Google Play code are unchanged.
- No trigger on `billing.provider_subscriptions` was added. Future provider-event processors must explicitly invoke the
  writer inside their own transaction.
- `public.entitlements` changed only inside rolled-back local tests.
- No remote Supabase migration was applied and no production data was read.

Next recommended checkpoint: `5B-1F1 controlled legacy Stripe provider backfill runner`, or an explicitly approved
slice that safely converts eligible legacy Stripe entitlement rows into private provider records before Stripe runtime
dual-write begins.

---

Checkpoint 5B-1F1 status: controlled legacy Stripe provider backfill runner. This checkpoint adds a private operational
database function and synthetic fixture coverage only. It does not deploy the migration remotely, run a staging or
production backfill, update `public.entitlements`, insert provider events, change Stripe webhooks, add dual-write, add
triggers, add Edge Functions, or add Apple/StoreKit or Google Play implementation.

## 124. Controlled Stripe backfill runner implementation status

Added migration:

- `supabase/migrations/20260716130000_legacy_stripe_provider_backfill_runner.sql`

Backfill function:

- `billing.backfill_legacy_stripe_provider_subscriptions(p_provider_environment text, p_apply boolean default false, p_as_of timestamptz default now())`
- Intended caller: trusted service-role operator code only, inside an explicit operator-controlled transaction.
- The caller must pass an explicit Stripe provider environment:
  - `live`
  - `test`
- The function does not infer the environment from Stripe id prefixes, hostname, project ref, Supabase project, or database
  context.
- Invalid environments return a sanitized failed aggregate without scanning or writing.

Returned aggregate contract:

- `provider_environment`
- `dry_run`
- `computed_at`
- `total_rows_scanned`
- `rows_with_subscription_reference`
- `clean_candidates`
- `inserted`
- `updated`
- `already_present`
- `skipped_non_subscription`
- `requires_reconciliation`
- `parity_mismatch`
- `ownership_conflict`
- `environment_conflict`
- `stale_source_skipped`
- `failed`

The result intentionally does not include user ids, Stripe customer ids, Stripe subscription ids, Stripe price ids,
provider row ids, emails, raw SQL errors, provider payloads, auth tokens, session ids, or exact user-linked timestamps.

Dry-run behavior:

- `p_apply = false` scans legacy `public.entitlements` rows, calls
  `billing.map_legacy_stripe_entitlement_candidate(...)`, classifies each row, and returns aggregate would-insert /
  would-update / already-present / skip / reconciliation counts.
- Dry run performs zero writes:
  - no `billing.provider_subscriptions` insert/update;
  - no `billing.provider_events` insert/update;
  - no `public.entitlements` update;
  - no `public.stripe_webhook_events` update;
  - no compatibility-summary writer call.

Apply behavior:

- `p_apply = true` may insert or refresh only clean, unambiguous Stripe candidates in
  `billing.provider_subscriptions`.
- It skips rows that are missing a Stripe subscription reference, missing required product/period information, unknown or
  unsupported, internally inconsistent, owned by another user, present in a conflicting Stripe environment, stale compared
  with a newer provider-neutral record, or classified by the mapper as requiring reconciliation.
- The staging-shaped `missing_subscription_ref` case is intentionally skipped and counted as reconciliation-required.
- It never invents a provider subscription reference and never substitutes a Stripe customer reference for a missing
  subscription reference.

Idempotency and stale-source protection:

- The runner relies on the existing provider/environment/subscription-reference uniqueness model for Stripe provider
  records.
- Repeated apply with unchanged source rows does not create duplicate provider subscriptions.
- Existing identical rows are counted as `already_present`.
- Existing older same-user rows may be refreshed from newer legacy source values for:
  - `provider_customer_ref`
  - `provider_product_ref`
  - canonical `status`
  - `auto_renews`
  - `cancel_at_period_end`
  - `current_period_end`
  - `billing_retry_started_at`
  - `expires_at`
  - `paused_at`
  - `last_verified_at`
  - `last_event_at`
  - `reconciliation_status`
  - `updated_at`
- Existing newer provider-neutral rows are not downgraded by older legacy snapshots and are counted as
  `stale_source_skipped`.
- The runner does not reassign a provider record to a different Can You Geo user.

Parity gate:

- For each clean apply candidate, the runner:
  1. maps the legacy row;
  2. captures the current side-effect-free compatibility projection;
  3. inserts or updates the private Stripe provider record inside an exception-scoped subtransaction;
  4. re-runs the side-effect-free compatibility projection;
  5. compares access-relevant output with the current legacy entitlement expectation, while preserving an already-active
     non-Stripe provider grant;
  6. keeps the provider record only when parity passes.
- Parity failures roll back the individual candidate write and return only the aggregate `parity_mismatch` count.
- The runner does not call `billing.refresh_effective_entitlement_summary(...)` and does not update
  `public.entitlements` to force parity.

Locking and transaction model:

- The runner acquires a transaction-scoped advisory lock keyed by Stripe provider environment:
  `pg_advisory_xact_lock(hashtextextended('billing.backfill_legacy_stripe_provider_subscriptions:stripe:' || v_environment, 0))`.
- This prevents concurrent backfill runs for the same Stripe environment while allowing unrelated environments/providers to
  remain independent where practical.
- Existing matching provider records are locked with `FOR UPDATE` before apply-mode refreshes.
- The function does not commit independently; the caller may roll back the whole operation.

Security posture:

- The function lives in the private `billing` schema.
- It is `SECURITY INVOKER` with a locked search path.
- Execute is revoked from `public`, `anon`, and `authenticated`; only `service_role` is granted execute.
- It uses schema-qualified references and no dynamic SQL.
- It creates no browser-readable RPC, public view, trigger, scheduled job, or Edge Function.

Synthetic fixture coverage:

- `supabase/tests/legacy_stripe_provider_backfill_runner.sql` runs rollback-only local fixtures for:
  - dry-run classification;
  - clean active monthly and annual Stripe rows;
  - cancel-at-period-end rows;
  - valid expired rows;
  - existing identical rows;
  - existing older rows updated from a newer legacy source;
  - existing newer rows not downgraded by a stale legacy source;
  - missing subscription reference;
  - missing active period end;
  - ownership conflict;
  - environment conflict;
  - parity mismatch rollback;
  - repeated apply idempotency;
  - Stripe + Apple coexistence;
  - expired Stripe + active Apple coexistence;
  - reconciliation-required Stripe rows preserving Apple access;
  - Stripe `test` vs `live` environment isolation;
  - invalid environment rejection;
  - no-write boundaries for `public.entitlements`, `billing.provider_events`, `public.stripe_webhook_events`,
    `public.profiles`, and `auth.users`.
- `supabase/tests/legacy_stripe_provider_backfill_runner.structure.test.ts` guards the function contract, privilege posture,
  advisory-lock strategy, no compatibility-summary writer call, no provider-event insertion, no public entitlement writes,
  and no app/native/runtime changes.

Synthetic staging-shape result:

- Fixture shape:
  - 2 legacy entitlement rows;
  - 1 clean active Stripe candidate;
  - 1 row missing Stripe subscription reference.
- Expected dry-run aggregate:
  - total rows: 2;
  - clean candidates: 1;
  - reconciliation required: 1;
  - writes: 0.
- Expected apply result inside the rolled-back local transaction:
  - inserted provider subscriptions: 1;
  - skipped/reconciliation rows: 1;
  - provider events: 0;
  - public entitlement changes: 0;
  - clean-row compatibility parity: passed;
  - repeated apply: no duplicate insertion.

Current app/runtime behavior remains unchanged:

- Existing Stripe Checkout, Stripe Customer Portal, Stripe webhook, `public.stripe_webhook_events`, account entitlement
  reads, native billing guardrails, analytics, React UI, Edge Functions, Capacitor config, Android, iOS version/build, and
  StoreKit/Google Play code are unchanged.
- No remote Supabase migration was applied by this checkpoint.
- No staging or production backfill was run.
- No provider events were inserted.
- `public.entitlements` changed only inside rolled-back local tests.

Next recommended checkpoint: `5B-1F2 controlled staging legacy Stripe backfill dry-run/apply rehearsal`, or another
explicitly approved operational checkpoint that first runs this function on staging in dry-run mode and stops for review
before any real provider row insertion.
