# Can You Geo iOS StoreKit And TestFlight Readiness

Checkpoint 5D-1E-PREP-IOS recorded the next safe iOS readiness step while Android upload-certificate activation was pending. Checkpoint 5D-1D-IOS-SERVER builds on that audit with the staging Apple App Store Server API and App Store Server Notifications V2 foundation.

No App Store Connect product, purchase, TestFlight upload, production Supabase mutation, Stripe mutation, credential creation, or App Store submission occurs in this checkpoint.

## Current Protected State

- Protected staging commit audited: `996223100d61627884d0aac3db1b3993ff034931`.
- Protected staging merge commit for the Apple server-foundation branch: `843faad836adf11e41c68d181337fa4c1f661a96`.
- Protected main commit observed during the audit: `16af035a53f001dd5d16625a28631951c9765479`.
- iOS app name: `Can You Geo`.
- Bundle ID: `com.canyougeo.app`.
- Apple Team ID: `G5N5U6QFS8`.
- App Store Connect Apple ID: `6791248782`.
- Current iOS marketing version/build in source: `1.0.0 (1)`.
- Signing style: Xcode-managed Automatic signing for Debug and Release.
- Associated Domains entitlement: `applinks:canyougeo.com`.
- Target devices: iPhone-only for the first TestFlight path.

The primary working checkout used for earlier Android/account-deletion work was dirty at the time of this audit, so iOS readiness inspection was performed from a clean detached staging worktree before this documentation branch was created.

## Branch And Commit Audit

All named historical iOS branches and commits were confirmed as ancestors of `origin/staging`.

| Ref | Tip or commit | Staging status | Notes |
| --- | --- | --- | --- |
| `origin/codex/capacitor-ios-poc` | `0557585e` | Contained | Historical Capacitor iOS shell work. |
| `origin/codex/ios-paid-signing` | `2b32ff91` | Contained | Paid-team signing work is already in staging. |
| `origin/codex/ios-universal-links` | `b5fdb7f2` | Contained | Superseded by the release branch, but not lost. |
| `origin/codex/ios-universal-links-release` | `1be78a03` | Contained | Merged by protected PR #19. |
| `origin/codex/ios-testflight-prep` | `195cf64f` | Contained | Merged by protected PR #21 and promoted by PR #22. |
| `origin/codex/ios-storekit-billing-foundation` | `adc0ce85` | Contained | Branch was reused for provider-neutral follow-up PRs #23-#26. |
| StoreKit foundation audit | `63036befa2908cba4b58a4e20010869eb164f300` | Contained | Architecture audit, not runtime StoreKit code. |
| Provider-neutral entitlement writer | `1d5ad7e1d7343b049a3b9ee773008c6cdac68fc7` | Contained | Provider-neutral entitlement summary foundation. |

Related protected PRs already merged:

- PR #19 to `staging`: iOS paid signing and Universal Links.
- PR #21 to `staging`: iOS TestFlight baseline.
- PR #22 to `main`: iOS TestFlight baseline promotion.
- PRs #23-#26 to `staging`: provider-neutral billing, Stripe transition foundation, and service RPC bridge.

No open PR was found during this audit. No completed iOS branch from the named list remains unmerged. Duplicate/superseded branches exist only as historical branch names: `codex/ios-universal-links` is superseded by `codex/ios-universal-links-release`, and `codex/ios-storekit-billing-foundation` now contains several provider-neutral follow-up commits. No branch should be direct-pushed to `staging` or `main`.

## Universal Links Status

Universal Links are ready from the app-side and production association-file perspective.

Public AASA validation performed on 2026-07-18:

- URL checked: `https://canyougeo.com/.well-known/apple-app-site-association`.
- HTTP status: `200`.
- Redirect behavior: no redirect observed.
- Content type: `application/json`.
- Application identifier: `G5N5U6QFS8.com.canyougeo.app`.
- AASA route policy: strict allowlist for public, game, auth, callback, upgrade, and account routes, with exclusions for internal, Next, data, and arbitrary asset paths.
- Production/staging separation: the source AASA and iOS entitlement do not include `test.canyougeo.com`, localhost, custom schemes, web credentials, app clips, or activity continuation.
- App entitlement: `ios/App/App/App.entitlements` contains only `applinks:canyougeo.com`.

Physical iPhone validation procedure for the next signed build:

1. Delete the previous development/TestFlight install from the iPhone.
2. Rebuild and reinstall with the paid team profile or install the Apple-processed TestFlight build.
3. Open a supported non-sensitive `https://canyougeo.com` route from Notes or Mail and verify it opens Can You Geo instead of Safari.
4. Open a supported game route and verify it lands in the app without a blank screen or redirect loop.
5. Open `/auth/callback/` without tokens and verify it routes safely.
6. Trigger the approved password-recovery procedure only with a safe existing QA account; do not record account email, callback URL, token, code, user ID, or session values.
7. Open an unsupported path and verify it stays on the website or fails safely rather than routing inside the app.

Do not mutate production just to pass Universal Link testing. If an AASA change is required later, promote it through the protected repository workflow.

## StoreKit Implementation Audit

Current staging has no StoreKit 2 runtime implementation. The existing native purchase implementation is Android-only Google Play Billing.

| Required StoreKit capability | Current status |
| --- | --- |
| StoreKit 2 product loading | Missing. |
| Monthly and annual iOS product mapping | Final-approved for server contracts: `com.canyougeo.pro.monthly` and `com.canyougeo.pro.annual`, both grant `pro`. StoreKit client product loading is still missing. |
| Localized App Store price display | Missing. |
| Purchase initiation | Missing. |
| `Transaction.updates` listener | Missing. |
| `Transaction.unfinished` handling | Missing. |
| `Transaction.currentEntitlements` restore/resync | Missing. |
| Transaction verification | Missing on iOS client. Staging server foundation adds Apple signed-transaction and current-subscription verification before provider persistence. |
| Secure backend submission | Staging foundation adds Apple-specific backend endpoints. Google Play has its own endpoint and must not be reused for Apple payloads. |
| No client-side Pro grant | Passing. Browser/native code still reads authoritative entitlement state and does not write Pro locally. |
| Idempotent provider persistence | Staging foundation adds Apple-specific service-role RPC processors over the existing provider-neutral schema. |
| Account ownership binding | Staging foundation issues the signed-in Supabase UUID as StoreKit `appAccountToken` and binds each original transaction chain to exactly one account. StoreKit client wiring is still missing. |
| Entitlement refresh after purchase/restore | Staging foundation refreshes provider-neutral entitlement projection only after verified Apple state is durable. |
| Revocation, expiration, grace, retry handling | Staging foundation normalizes these Apple states for purchase verification, notifications, and reconciliation candidates. |
| Native Manage Subscription navigation | Missing. |
| Native Stripe suppression | Passing. iOS native builds do not open Stripe Checkout or the Stripe Customer Portal. |

The product identifiers `com.canyougeo.pro.monthly` and `com.canyougeo.pro.annual`, subscription group name `Can You Geo Pro`, signed-in purchase requirement, Supabase-UUID `appAccountToken` policy, backend-before-finish policy, sandbox isolation, deleted-account no-reclaim policy, and target US prices are now final-approved for the server foundation. StoreKit client UI, App Store Connect product creation, offers, trials, promotional offers, win-back offers, and Family Sharing remain gated.

## Backend Apple Verification Readiness

Reusable foundation already in staging:

- Private `billing.provider_subscriptions` and `billing.provider_events` tables support `provider = 'apple'`.
- Provider environments support Apple `sandbox` and `production`.
- Provider-neutral resolver can evaluate Apple sandbox rows for sandbox entitlement checks and Apple production rows for production checks.
- Effective entitlement projection keeps browser/native clients reading `public.entitlements` rather than provider rows.
- Stripe and Google Play work demonstrate the desired pattern: authenticated purchase context, server-side provider verification, service-only mutation, replay/idempotency ledger, no raw provider payloads in user-readable rows, and no client-side Pro grant.

Missing Apple backend components:

- Deployment of `apple-purchase-context`, `apple-purchase-verify`, and `apple-app-store-notifications` to staging.
- Staging Supabase secrets for `APPLE_APP_STORE_ISSUER_ID`, `APPLE_APP_STORE_KEY_ID`, `APPLE_APP_STORE_PRIVATE_KEY`, `APPLE_BUNDLE_ID`, `APPLE_APP_ID`, `APPLE_ALLOWED_ENVIRONMENTS`, and `APPLE_DEPLOYMENT_MODE`. `APPLE_ENVIRONMENT` has been superseded by the dual-environment policy in `docs/mobile/APPLE_DUAL_ENVIRONMENT_ENTITLEMENTS.md`.
- App Store Connect notification URL configuration after the staging notification endpoint is deployed and verified.
- Scheduled/operator reconciliation endpoint or worker that uses `billing.apple_subscription_reconciliation_candidates`.
- StoreKit client code that calls the context endpoint, sends signed transaction material, waits for backend acceptance, and only then finishes transactions.
- App Store Connect subscription products, base metadata, and sandbox product loading.
- Sanitized support/operations query surfaces for Apple provider state.

Staging Apple server foundation added by Checkpoint 5D-1D-IOS-SERVER:

- `supabase/functions/apple-purchase-context`: JWT-protected endpoint returning the signed-in user's stable UUID `appAccountToken`, the approved bundle/app identifiers, the dual-environment server mode, and product allowlist. It creates no provider subscription and grants no entitlement.
- `supabase/functions/apple-purchase-verify`: JWT-protected endpoint that accepts StoreKit signed transaction material, verifies Apple signed data, derives the transaction environment from verified Apple payloads, re-queries the matching App Store Server API current subscription state, enforces bundle/app/product/environment/appAccountToken allowlists, persists via a service-role RPC, and returns sanitized finish guidance.
- `supabase/functions/apple-app-store-notifications`: App Store Server Notifications V2 endpoint with `verify_jwt = false`. It verifies `signedPayload` and nested signed transaction/renewal data before any mutation, records `TEST` notifications without subscription or entitlement writes, re-queries Apple current state for subscription notifications, and updates only already-bound original transaction chains.
- `billing.apple_transaction_chains`: service-role-only private table for original transaction ownership, raw original transaction ID storage needed for future reconciliation, and deleted-account no-reclaim protection through a retained user UUID fingerprint.
- `billing.process_apple_purchase_verification` and `billing.process_apple_server_notification_event`: service-only processors that write sanitized Apple provider events and provider subscriptions, fail closed on ownership conflicts, and refresh the correct entitlement projection only after durable verified provider state. Production sandbox Apple state uses the isolated native review lane rather than the live `public.entitlements` row.
- `billing.apple_subscription_reconciliation_candidates`: read-only service-role reconciliation foundation for stale, conflicted, unknown, orphaned, missed, out-of-order, and entitlement-inconsistent Apple provider state.

Manual credentials/configuration checklist for a later approved checkpoint:

1. Confirm App Store Connect account role can manage In-App Purchases, API keys, users, agreements, and server notifications.
2. Confirm Paid Apps Agreement, tax, and banking status before paid products.
3. Create the Apple subscription group and products only after the protected server foundation is deployed and App Store Connect mutation is explicitly authorized.
4. Use the approved product identifiers `com.canyougeo.pro.monthly` and `com.canyougeo.pro.annual`.
5. Create exactly the required App Store Server API key only after the server secret destination is approved.
6. Store Apple issuer ID, key ID, bundle ID, allowed environments, deployment mode, and private key only as server-side Supabase Edge Function secrets.
7. Configure App Store Server Notifications V2 only after the endpoint is deployed and can verify test notifications.
8. Keep sandbox notifications and sandbox transactions isolated from production entitlement grants.

## TestFlight Preparation

Build-number strategy:

- The next TestFlight build that contains StoreKit/backend integration should increment `CURRENT_PROJECT_VERSION` from `1` to `2`, unless App Store Connect proves build 2 has already been used.
- Keep `MARKETING_VERSION = 1.0.0` unless release notes, App Store metadata, or product policy require a marketing-version bump.
- Do not archive or upload a new TestFlight build until Apple backend endpoints are deployed to staging, server-only Apple secrets are configured, StoreKit client code exists, App Store Connect products exist, and sandbox product loading is proven.

Internal testing checklist:

- Build from an exact protected `origin/staging` commit.
- Confirm bundle ID `com.canyougeo.app`, Team ID `G5N5U6QFS8`, and Associated Domains remain unchanged.
- Confirm no `server.url`, localhost, live reload, staging host, or production-secret value is bundled.
- Confirm native iOS analytics and marketing pixels remain disabled.
- Confirm native Stripe Checkout and Customer Portal are unavailable.
- Confirm StoreKit purchase UI does not appear for signed-out users.
- Confirm StoreKit products load only from approved product identifiers.
- Confirm purchase, restore, transaction update, and unfinished transaction handling cannot grant Pro locally.
- Confirm backend verification accepts only authenticated, verified, idempotent Apple transactions.
- Confirm sandbox Apple rows do not grant production web Pro.
- Confirm account deletion, Privacy, Terms, Support, and subscription management links are reachable.

Internal tester group plan:

- Continue using the existing internal TestFlight group for owner/staff smoke.
- Do not add external testers or public TestFlight links until the internal StoreKit sandbox lifecycle matrix passes.
- Do not store tester email addresses, invitation links, screenshots with identities, or device identifiers in Git.

Beta app description draft:

```text
Can You Geo is a geography game collection focused on reading maps, patterns, and ordering challenges. This TestFlight build is for validating native launch, sign-in, gameplay, Universal Links, offline/reconnect behavior, and controlled subscription testing. Do not share account passwords or payment information in feedback.
```

Feedback email: `support@canyougeo.com`.

Export-compliance guidance:

- Current answer remains that the app does not implement proprietary encryption algorithms or independent standard crypto algorithms.
- Re-check this answer if a future StoreKit/backend implementation adds custom cryptography beyond platform HTTPS/TLS and Apple/OS-provided signing verification.

App Privacy readiness checklist:

- Account creation and authentication data.
- Gameplay progress and saved stats.
- Purchase/subscription state by provider.
- Support and account-deletion requests.
- Diagnostics/crash data if collected through Apple tooling.
- Analytics remains disabled in native builds unless a future checkpoint explicitly changes that policy.
- No payment card details are collected by Can You Geo; Apple, Google Play, or Stripe handle payment details depending on platform.

Reviewer notes draft:

```text
Can You Geo offers Free play and a Pro subscription. Website subscriptions are managed through Stripe on the website. Native iOS purchases, when enabled, use Apple In-App Purchase only. The iOS app does not open Stripe Checkout or Stripe Customer Portal. Restore Purchases and Apple subscription management are provided for Apple subscriptions. Account deletion requests are available at https://canyougeo.com/account-deletion/.
```

Test-account strategy:

- Use one ordinary Free QA account for sign-in, game smoke, and signed-out/signed-in boundaries.
- Use separate sandbox Apple tester accounts for StoreKit lifecycle testing.
- Use at least one existing Stripe-backed Pro QA account to verify iOS suppresses Apple purchase steering for already entitled Pro users.
- Do not create or store shared administrator or superuser credentials.
- Do not record account emails, passwords, user IDs, transaction IDs, original transaction IDs, receipts, signed JWS, or recovery links in Git.

Subscription-testing instructions for a later approved build:

- Do not initiate purchases until Apple products, backend verification, server notifications, and sandbox isolation are all green.
- Start with local StoreKit configuration and mocked backend acceptance.
- Move to Apple sandbox/TestFlight only after local StoreKit tests and backend rejection tests pass.
- Test monthly and annual purchase, cancellation, pending approval, restore, reinstall restore, renewal, expiration, refund/revoke where available, ownership conflict, backend outage, notification duplicate, and notification out-of-order cases.
- Never claim purchase success until backend entitlement refresh confirms Pro.

Screenshot and metadata inventory:

- App icon: completed.
- Launch branding: completed and previously validated on physical iPhone and TestFlight.
- Feature graphic/video: not applicable to App Store but App Preview decision remains open.
- iPhone screenshots: need fresh screenshots after final StoreKit UI exists.
- Short promotional text/subtitle: needs final App Store copy review.
- Full description: needs Apple-aware subscription and restore wording.
- Keywords/category: needs final App Store review.
- Support URL: `/support/`.
- Marketing URL: optional.
- Privacy Policy URL: `/privacy/`.
- Terms URL: `/terms/`.
- Account deletion URL: `/account-deletion/`.

Release blockers:

- Apple server foundation PR must be merged, then migration/functions must be deployed to staging.
- Apple App Store Server API credentials have not been created or stored as staging Supabase secrets.
- App Store Connect subscription group/products have not been created.
- Family Sharing remains not approved.
- Free trials, introductory offers, promotional offers, win-back offers, prepaid plans, and installments remain not approved.
- App Store Server API credentials are not created or stored.
- StoreKit 2 Capacitor plugin is missing.
- Native iOS subscription UI is missing.
- Local StoreKit configuration and tests are missing.
- Sandbox product loading has not been proven.
- No purchase, restore, renewal, refund/revoke, or reconciliation QA has been run.

## Next Safe Step

After the protected Apple server foundation PR merges and deploys to staging, the next safe implementation step is StoreKit client foundation before purchase UI:

1. Deploy the staging migration and Apple Edge Functions only after protected PR approval.
2. Create/store Apple server credentials as staging Supabase secrets only after the secret destination is approved.
3. Add StoreKit 2 plugin and local StoreKit configuration after backend contracts can reject invalid or unapproved transactions.
4. Add native iOS subscription UI only after the plugin/backend contract is stable.
5. Increment to the next iOS build number, archive, upload to TestFlight, and begin sandbox lifecycle validation only after those gates pass.

Recommended next checkpoint after protected merge and staging deploy: `5D-1D-IOS-CLIENT` - add the StoreKit 2 client bridge, local StoreKit configuration, and signed-in purchase/restore state machine that calls the staging Apple server foundation without granting Pro locally.
