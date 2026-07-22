# Can You Geo Black-Box QA Coverage Contract

This external suite is a maintained QA artifact. Every meaningful Can You Geo site change should update the black-box suite when the change affects public behavior, public routes, account flows, gameplay entry points, SEO/indexing, security headers, or share/email surfaces.

## Stable Browser Entry Points

The operator-facing browser commands are:

- `pnpm qa:blackbox:test`: complete staging browser suite against `https://test.canyougeo.com`, excluding explicitly opt-in live/mutating tests.
- `pnpm qa:blackbox:prod`: complete production-safe browser suite against `https://canyougeo.com`.
- `pnpm qa:blackbox:prod-smoke`: minimal production launch smoke.
- `pnpm qa:blackbox:mobile`: mobile viewport browser checks against staging.

`production_safe` tests must not create accounts, send email, open Checkout or Portal sessions, initiate payment, initiate native purchase, tap Restore, use QA credentials, mutate entitlements, or rely on private browser storage. Public routes, public gameplay samples, responsive layout, indexing, security headers, canonical hosts, association documents, challenge safety, and legal/support/account-deletion copy are appropriate for this marker.

Optional authenticated checks use `auth`. Production authenticated checks must be run through `production_auth` and `CGY_PROD_*` credentials only. `checkout_smoke`, `signup_analytics`, and `email_live` are opt-in live categories and are excluded from the stable root commands.

## New Public Route

Must update:

- `tests/test_routes.py`
- `utils/route_policy.py`
- indexing expectations if the route should or should not be indexable
- mobile layout smoke if the route is user-facing
- page-object coverage when the route has interactive behavior
- association-document expectations when the route should be handled by AASA or Android App Links

## New Game

Must add:

- page object
- route smoke
- play hub card and CTA assertion
- signed-out sample smoke
- mobile board or primary-interaction visibility test
- result/completion smoke
- copy safety checks for signed-out users
- production-safe marker coverage when the sample flow has no mutation and stays local

## New Auth, Account, Or Billing Behavior

Must add or update:

- signed-out auth page smoke
- optional authenticated smoke behind env vars
- native auth persistence smoke when behavior affects Capacitor session storage or callback routing
- account and upgrade assertions
- payment safety checks
- checkout-open smoke behind `checkout_smoke` plus explicit credentials/opt-in when checkout behavior changes
- signup analytics smoke behind `signup_analytics` plus explicit disposable credentials/opt-in when signup conversion behavior changes

Never test live payments by default.

Native Apple StoreKit and Google Play Billing labels, product discovery, Restore controls, and Stripe suppression belong in native Maestro release guardrails. Browser QA may assert that the ordinary public web upgrade page does not show native purchase controls and does not navigate to Stripe unless an explicit checkout-open smoke is enabled.

## New SEO, Indexing, Or Security Policy

Must update:

- indexing policy tests
- robots and sitemap checks
- canonical host checks
- AASA and `assetlinks.json` checks where applicable
- security header expectations
- host policy notes when a host changes launch/private status

## New Share, Challenge, Or Email Feature

Must update:

- non-live route and copy smoke
- spoiler-safety assertions where applicable
- live email coverage only behind the `email_live` marker and explicit env opt-in

Challenge routes must not expose answer countries, hidden indicators, source labels, challenge-code internals, tokens, or user identifiers before play. Email UI should not be exercised by default.

## New Native App Routing Or WebView Behavior

Must add or update:

- Maestro native smoke in `native/maestro/flows/android/` or `native/maestro/flows/ios/`
- platform-specific Back, App Link, Universal Link, or auth persistence coverage when those areas change
- AASA or `assetlinks.json` route-policy changes must update the matching native flow, association tests, and docs in the same checkpoint
- native release-guardrail flows when external-link handling, safe areas/system bars, connectivity behavior, native billing visibility, or native analytics/consent behavior changes
- runner/docs updates when a new native flow needs credentials, devices, or platform prerequisites

Do not use Maestro Cloud for the baseline suite.

## Native Store Billing Drift

Any change to the native store billing bridge or purchase boundary must update native black-box coverage in the same PR, or add an explicit documented rationale that no black-box change is needed. The current impact files are:

- `src/features/account/BillingActionsClient.tsx`
- `src/features/account/appleStoreKitActions.ts`
- `src/features/account/googlePlayPurchaseActions.ts`
- `src/lib/mobile/appleStoreKit.ts`
- `src/lib/mobile/googlePlayBilling.ts`
- `ios/App/App/AppleStoreKitPlugin.swift`
- `android/app/src/main/java/com/canyougeo/app/GooglePlayBillingPlugin.java`

Baseline native billing QA remains non-mutating: it may verify labels, sign-in boundaries, localized product/plan discovery, safe unavailable states, and Stripe suppression, but it must not tap purchase, restore, transaction-finish, subscription-management, acknowledgement, refund, revoke, or cancellation actions.

## New `data-testid` Selector

Prefer stable selectors for black-box tests when roles/text are insufficient, but do not couple the suite to implementation internals unnecessarily. Names should describe user-visible regions or actions, not component internals.

## Definition Of Done

A feature is not QA-complete until:

- internal app tests pass
- black-box staging QA passes with `pnpm qa:blackbox:test` when Cloudflare Access credentials are available
- production-safe QA passes with `pnpm qa:blackbox:prod` before or after production promotion, as appropriate for the checkpoint
- relevant black-box coverage has been added or intentionally documented as not needed
- the export zip can be regenerated with `python tools/export_suite.py`
