# Can You Geo Deployment Runtime Parity Audit

Date: 2026-07-22

Executive result: PASS WITH OPERATIONAL PENDING ITEMS

This report closes the 6A deployment/runtime parity audit for Can You Geo. It records non-secret source, deployment, store-review, mobile-release, and RTDN topology evidence. No secret values, access tokens, database URLs, service-account JSON, tester emails, private store links, purchase tokens, transaction identifiers, user IDs, raw provider payloads, screenshots, local archives, or signed artifacts are included.

## Scope

The audit covered:

- Git branch/source parity between protected `main` and `staging`.
- Cloudflare production/staging environment separation.
- Supabase migration parity.
- Production and staging Supabase Edge Function source parity, including transitive shared imports.
- iOS App Store review provenance.
- Android Google Play release provenance.
- Apple and Google Play subscription catalog state.
- Google Play RTDN delivery topology.
- Safe unauthenticated runtime probes and sanitized aggregate database readbacks.

The audit did not perform a Cloudflare environment change, Supabase migration, Supabase secret change, store-console mutation, mobile build/sign/archive/upload, Stripe action, email send, purchase, Restore, refund, cancellation, entitlement edit, or provider-row edit.

## Git Refs

| Ref | Commit | Result |
| --- | --- | --- |
| `origin/main` | `ae6f521d2264fd701def553ddd393f74ebbeb47a` | Protected production source. |
| `origin/staging` | `5e539c7bef9a2203e3fe5d152189d387bb7f5764` | Protected staging source. |

`origin/main` is an ancestor of `origin/staging`, and the two branch trees are identical.

## Environment Topology

| Environment | Frontend | Source branch | Supabase project | Runtime posture |
| --- | --- | --- | --- | --- |
| Production | `https://canyougeo.com` | `main` | `jquebthneczqdxagagof` | Production Supabase, production indexing, live billing, production analytics settings. |
| Staging | `https://test.canyougeo.com` | `staging` | `hsgpjtyysbremrokkoym` | Staging Supabase, noindex, staging-safe billing and analytics settings. |

Cloudflare Production deploys from `main`. Cloudflare Preview/staging deploys from `staging`. Browser-safe environment variables were manually verified as separated for production and staging.

See [staging and production environments](./staging-production-environments.md) for the standing operations map.
See [security and access inventory](./security-access-inventory.md) for the matching non-secret access and JWT-boundary inventory.

## Migration Parity

Production and staging migration history both match all 21 repository migrations in order. No missing, unexpected, duplicate, or out-of-order migration was found.

## Production Edge Function Inventory

All production functions match protected `origin/main` source, including transitive shared imports.

| Function | Version | Supabase gateway JWT |
| --- | ---: | --- |
| `send-challenge-email` | 14 | `true` |
| `stripe-checkout` | 43 | `true` |
| `stripe-portal` | 38 | `true` |
| `stripe-webhook` | 40 | `false` |
| `apple-purchase-context` | 2 | `true` |
| `apple-purchase-verify` | 2 | `true` |
| `apple-app-store-notifications` | 2 | `false` |
| `google-play-purchase-context` | 1 | `true` |
| `google-play-purchase-verify` | 1 | `true` |
| `google-play-rtdn` | 1 | `false` |

The functions with `verify_jwt=false` verify provider signatures or Google Pub/Sub OIDC inside the function.

## Staging Edge Function Inventory

All staging functions match protected staging source.

| Function | Version | Supabase gateway JWT |
| --- | ---: | --- |
| `send-challenge-email` | 13 | `true` |
| `stripe-checkout` | 12 | `true` |
| `stripe-portal` | 12 | `true` |
| `stripe-webhook` | 13 | `false` |
| `apple-purchase-context` | 4 | `true` |
| `apple-purchase-verify` | 5 | `true` |
| `apple-app-store-notifications` | 6 | `false` |
| `google-play-purchase-context` | 5 | `true` |
| `google-play-purchase-verify` | 5 | `true` |
| `google-play-rtdn` | 6 | `false` |

## iOS Release Provenance

| Field | Value |
| --- | --- |
| App name | Can You Geo |
| App Store Connect App ID | `6791248782` |
| Bundle ID | `com.canyougeo.app` |
| Apple Team ID | `G5N5U6QFS8` |
| Marketing version | `1.0.0` |
| Selected build | `9` |
| App status | Waiting for Review |
| Monthly subscription status | Waiting for Review |
| Annual subscription status | Waiting for Review |
| Production App Store Server Notifications V2 URL | `https://jquebthneczqdxagagof.supabase.co/functions/v1/apple-app-store-notifications` |
| Sandbox App Store Server Notifications V2 URL | `https://jquebthneczqdxagagof.supabase.co/functions/v1/apple-app-store-notifications` |

The Build 9 archive was verified and retained locally. The local archive path is intentionally not committed.

Relevant documentation:

- [iOS App Store submission pack](../mobile/IOS_APP_STORE_SUBMISSION_PACK.md)
- [iOS privacy manifest audit](../mobile/IOS_PRIVACY_MANIFEST_AUDIT.md)
- [iOS StoreKit and TestFlight readiness](../mobile/IOS_STOREKIT_TESTFLIGHT_READINESS.md)
- [Native billing black-box QA coverage](../mobile/NATIVE_BLACKBOX_QA.md)

## Apple Subscription Configuration

| Subscription | Product ID | Status | Notes |
| --- | --- | --- | --- |
| Monthly Pro | `com.canyougeo.pro.monthly` | Waiting for Review | Monthly access to Can You Geo Pro; no trial or offer recorded in source docs. |
| Annual Pro | `com.canyougeo.pro.annual` | Waiting for Review | Annual access to Can You Geo Pro; no trial or offer recorded in source docs. |

The first iOS release package is waiting for App Review. Final public release verification remains pending until Apple review completes.

## Android Release Provenance

| Field | Value |
| --- | --- |
| Package ID | `com.canyougeo.app` |
| Version name | `1.0.2` |
| Version code | `4` |
| AAB filename | `app-release.aab` |
| AAB SHA-256 | `a7fdcf07f2604d8d27ddd566f49dc7aa22d05cf5fc40b27e283066ca582d12bc` |
| Upload signing certificate SHA-256 | `7E:32:86:C0:69:2D:8C:DE:98:CC:20:05:93:79:7B:3C:6A:DD:D6:F9:4F:D7:94:4C:A6:E5:4E:26:3B:C4:4E:0E` |
| Provenance reconciliation commit | `461ccce414a897389cbb7385e22bdb86ed64f020` |

GitHub source now correctly declares Android `versionCode` 4 and `versionName` 1.0.2. No new AAB was rebuilt or uploaded during source reconciliation.

Existing Play Console state recorded by the audit:

- Existing internal-testing release shown in Play Console: `1.0.1-internal.2`.
- Play app-bundle library evidence after this audit shows only `versionCode` 1 /
  `versionName` 1.0 and `versionCode` 2 / `versionName` 1.0.1.
- The `1.0.2` code-4 artifact is an audited local release artifact and intended
  closed-testing artifact. It is not yet accepted into the Google Play bundle
  library, Internal testing, or Closed testing.
- The 2026-07-22 manual upload attempt was blocked pending replacement
  upload-certificate activation at `2026-07-23T16:11:28Z`.
- Closed-testing track has not been rolled out.
- Closed-testing tester list/service setup remains pending.
- Production access remains unavailable until Google Play closed-testing requirements are completed.

See [Android Play code 4 provenance](../mobile/ANDROID_PLAY_CODE4_PROVENANCE.md) and [Google Play readiness](../mobile/GOOGLE_PLAY_READINESS.md).

## Google Play Subscription Configuration

Product: `canyougeo_pro`

| Base plan | Status | Renewal | Anchor price | Mexico price | Grace period | Resubscribe |
| --- | --- | --- | --- | --- | --- | --- |
| `monthly` | Active | Monthly | USD 3.99 | MXN 79.00 | 3 days | Allowed |
| `annual` | Active | Annual | USD 29.99 | MXN 609.00 | 14 days | Allowed |

Confirmed catalog state:

- No free trial.
- No introductory offer.
- No prepaid plan.
- No installment plan.
- No unintended extra base plan.
- Annual 14-day grace period is the observed persisted Play Console state and should not be silently described as 3 days.

## Google Play RTDN Topology

Final active path:

```text
Google Play
-> projects/can-you-geo-play-billing/topics/cgy-google-play-rtdn
-> projects/can-you-geo-play-billing/subscriptions/cgy-google-play-rtdn-production-push
-> https://jquebthneczqdxagagof.supabase.co/functions/v1/google-play-rtdn
```

Authenticated push service account:

```text
cgy-rtdn-push@can-you-geo-play-billing.iam.gserviceaccount.com
```

The staging subscription was deleted:

```text
projects/can-you-geo-play-billing/subscriptions/cgy-google-play-rtdn-staging-push
```

Cloud Audit Log evidence:

| Field | Value |
| --- | --- |
| Timestamp | `2026-07-22T14:31:36.899384722Z` |
| Method | `google.pubsub.v1.Subscriber.DeleteSubscription` |
| Principal | `caakhave@gmail.com` |
| Resource | `projects/can-you-geo-play-billing/subscriptions/cgy-google-play-rtdn-staging-push` |

The staging Supabase RTDN function remains deployed and source-aligned, but no active Pub/Sub subscription delivers topic messages to it.

## Safe Probe Results

All probes were unauthenticated or malformed safe probes. No authenticated email send, Stripe session creation, Apple notification, Google Play TEST notification, synthetic Pub/Sub publish, purchase, Restore, or provider replay was performed.

| Probe | Expected result | Result |
| --- | --- | --- |
| Production `send-challenge-email` direct POST | 401 before email path | Passed |
| Production `stripe-portal` direct POST | 401 before Portal session path | Passed |
| Production `stripe-checkout` direct POST with valid monthly plan and no auth | 401 before Checkout session path | Passed |
| Production `google-play-rtdn` direct POST | 401 invalid Google Pub/Sub identity | Passed |
| Staging `google-play-rtdn` direct POST | 401 invalid Google Pub/Sub identity | Passed |

## Sanitized Aggregate-State Findings

Production after final verification:

- Google Play provider events: production `test_notification` processed = 1.
- Google Play provider subscriptions: 0.
- Google purchase-token rows: 0.
- Public entitlements: `free/canceled` = 1, `free/free` = 6, `pro/active` = 17.
- Apple transaction chains: sandbox = 2.
- Stripe provider events/subscriptions: 0 / 0.
- Reconciliation candidates table: absent.
- Challenge email ledger: sent = 14.

Staging after final verification:

- Google Play provider events: test `test_notification` processed = 3.
- Google Play provider subscriptions: 0.
- Google purchase-token rows: 0.
- Public entitlements: `free/canceled` = 1, `pro/active` = 4.
- Apple transaction chains: sandbox = 2.
- Stripe provider events/subscriptions: 9 / 2.
- Reconciliation candidates table: absent.

The historical RTDN test events remain intact. No real Google Play provider subscription, purchase-token row, or Google entitlement exists yet.

## Resolved Discrepancies

- Main/staging branch history was normalized while preserving identical source trees.
- Android protected source now records the audited local code-4 artifact metadata.
- Google Play evidence now distinguishes code 4 from Play-accepted bundles; the
  Play app-bundle library currently contains only code 1 and code 2.
- Staging Supabase function source parity was restored.
- Production Supabase function source parity was restored for `send-challenge-email`, `stripe-checkout`, and `stripe-portal`.
- Production and staging `google-play-rtdn` functions are source-aligned with `verify_jwt=false`.
- The duplicate staging Google Play RTDN push subscription was retired, leaving production-only topic delivery.
- The deployment/runtime audit now records that Google Play annual base-plan grace period persists as 14 days.

## Remaining Operational Pending Items

- Apple app and subscriptions are Waiting for Review.
- Android closed-testing release/tester enrollment has not started.
- Google production access remains locked until the closed-test requirement is completed.
- Android closed-testing service/vendor has not yet been finalized.
- Final public release verification must occur after store approval.
- Annual Google Play grace period remains 14 days as the persisted observed state.

These are operational pending items, not deployment/runtime parity failures.

## Closeout

The deployment/runtime parity audit is formally closed as PASS WITH OPERATIONAL PENDING ITEMS. Future changes to Cloudflare environments, Supabase migrations/functions/secrets, Apple or Google store configuration, Google Cloud Pub/Sub topology, Stripe billing, email delivery, mobile artifacts, purchases, restores, refunds, cancellations, or entitlements require their own approved checkpoint.
