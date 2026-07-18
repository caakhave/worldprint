# Can You Geo iOS StoreKit And TestFlight Readiness

Checkpoint 5D-1E-PREP-IOS records the next safe iOS readiness step while Android upload-certificate activation remains pending. It is a documentation and audit checkpoint only.

No App Store Connect product, purchase, TestFlight upload, production Supabase mutation, Stripe mutation, credential creation, or App Store submission occurs in this checkpoint.

## Current Protected State

- Protected staging commit audited: `996223100d61627884d0aac3db1b3993ff034931`.
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
| Monthly and annual iOS product mapping | Not implemented. Recommended IDs exist in architecture docs but remain not final-approved. |
| Localized App Store price display | Missing. |
| Purchase initiation | Missing. |
| `Transaction.updates` listener | Missing. |
| `Transaction.unfinished` handling | Missing. |
| `Transaction.currentEntitlements` restore/resync | Missing. |
| Transaction verification | Missing on iOS client; Apple server verification endpoint also missing. |
| Secure backend submission | Missing for Apple. Google Play has its own endpoint and must not be reused for Apple payloads. |
| No client-side Pro grant | Passing. Browser/native code still reads authoritative entitlement state and does not write Pro locally. |
| Idempotent provider persistence | Partly ready through provider-neutral schema/resolver; Apple-specific processor is missing. |
| Account ownership binding | Schema supports `app_account_token`, but StoreKit `appAccountToken` flow is not implemented. |
| Entitlement refresh after purchase/restore | Missing for Apple. |
| Revocation, expiration, grace, retry handling | Representable in schema; missing Apple verifier/notification normalization. |
| Native Manage Subscription navigation | Missing. |
| Native Stripe suppression | Passing. iOS native builds do not open Stripe Checkout or the Stripe Customer Portal. |

The iOS architecture document currently marks the product identifiers `com.canyougeo.pro.monthly` and `com.canyougeo.pro.annual` as recommended, not final-approved. Treat final product IDs, subscription group name, sign-in requirement, app account token policy, finish policy, sandbox entitlement behavior, deleted-account behavior, and pricing as manual gates before implementation.

## Backend Apple Verification Readiness

Reusable foundation already in staging:

- Private `billing.provider_subscriptions` and `billing.provider_events` tables support `provider = 'apple'`.
- Provider environments support Apple `sandbox` and `production`.
- Provider-neutral resolver can evaluate Apple sandbox rows for sandbox entitlement checks and Apple production rows for production checks.
- Effective entitlement projection keeps browser/native clients reading `public.entitlements` rather than provider rows.
- Stripe and Google Play work demonstrate the desired pattern: authenticated purchase context, server-side provider verification, service-only mutation, replay/idempotency ledger, no raw provider payloads in user-readable rows, and no client-side Pro grant.

Missing Apple backend components:

- `apple-purchase-context` or equivalent authenticated endpoint for account binding, if final design keeps that split.
- `apple-purchase-verify` authenticated endpoint for signed-in native purchase/restore candidates.
- App Store Server API JWT creation and key storage in server-only Supabase secrets.
- Apple signed transaction and signed renewal info verification.
- Product and bundle allowlist enforcement for `com.canyougeo.app`.
- Original transaction ownership binding and conflict handling.
- App Store Server Notifications V2 endpoint with JWS signature verification.
- Idempotent Apple provider-event processor.
- Reconciliation runner for missed, stale, conflicted, pending, expired, refunded, revoked, grace-period, and billing-retry states.
- Sanitized support/operations query for Apple provider state.

Manual credentials/configuration checklist for a later approved checkpoint:

1. Confirm App Store Connect account role can manage In-App Purchases, API keys, users, agreements, and server notifications.
2. Confirm Paid Apps Agreement, tax, and banking status before paid products.
3. Approve final subscription group name and product identifiers.
4. Create the Apple subscription group and products only after product IDs are approved.
5. Create exactly the required App Store Server API key only after the server secret destination is approved.
6. Store Apple issuer ID, key ID, bundle ID, environment setting, and private key only as server-side Supabase Edge Function secrets.
7. Configure App Store Server Notifications V2 only after the endpoint is deployed and can verify test notifications.
8. Keep sandbox notifications and sandbox transactions isolated from production entitlement grants.

## TestFlight Preparation

Build-number strategy:

- The next TestFlight build that contains StoreKit/backend integration should increment `CURRENT_PROJECT_VERSION` from `1` to `2`, unless App Store Connect proves build 2 has already been used.
- Keep `MARKETING_VERSION = 1.0.0` unless release notes, App Store metadata, or product policy require a marketing-version bump.
- Do not archive or upload a new TestFlight build until StoreKit product IDs, Apple backend endpoints, staging secrets, and sandbox product loading are approved.

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

- Final iOS product IDs are not approved.
- Subscription group name, pricing, territory availability, Family Sharing, grace period, offers/trials, and deleted-account handling are not final-approved.
- Apple purchase verification endpoint is missing.
- Apple server notification endpoint is missing.
- App Store Server API credentials are not created or stored.
- StoreKit 2 Capacitor plugin is missing.
- Native iOS subscription UI is missing.
- Local StoreKit configuration and tests are missing.
- Sandbox product loading has not been proven.
- No purchase, restore, renewal, refund/revoke, or reconciliation QA has been run.

## Next Safe Step

The next protected implementation step is Apple server foundation before native StoreKit UI:

1. Approve final iOS product identifiers and sandbox/production entitlement policy.
2. Implement Apple server verification and notification endpoints against staging only, with no App Store Connect mutation unless separately authorized.
3. Add StoreKit 2 plugin and local StoreKit configuration after backend contracts can safely reject invalid or unapproved transactions.
4. Add native iOS subscription UI only after the plugin/backend contract is stable.
5. Increment to the next iOS build number, archive, upload to TestFlight, and begin sandbox lifecycle validation only after those gates pass.

Recommended next checkpoint: `5D-1D-IOS-SERVER` - implement Apple App Store Server API verification and App Store Server Notifications V2 foundation for staging, without creating App Store Connect products or initiating purchases until product IDs and administrative gates are approved.
