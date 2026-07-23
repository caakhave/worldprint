# Can You Geo Mobile Release QA Matrix

This matrix coordinates browser, native, store-processed, and lifecycle QA for Can You Geo mobile releases. It is an operations checklist, not a credential store or store-console export.

Current release state:

- iOS `1.0.0` build `9`: Waiting for Review.
- Android internal testing currently exposes `1.0.1` versionCode `2`.
- Android `1.0.2` versionCode `4`: audited local release artifact and intended closed-testing artifact; not yet accepted into the Google Play bundle library.
- Android closed testing: not started.
- Draft closed-testing setup records 25 tester accounts and 177 countries/regions, but those tester/country changes have not been sent to Google because the code-4 release bundle is still blocked.
- Code-4 upload retry is blocked pending reset-certificate activation at `2026-07-23T16:11:28Z`.
- Google production access: pending the required closed-test process.
- Native default suites: non-mutating.
- Store lifecycle tests: explicit opt-in/manual checkpoints only.

References:

- Browser QA README: `canyougeo-blackbox/README.md`
- Native QA README: `canyougeo-blackbox/native/README.md`
- Native QA baseline: `docs/mobile/NATIVE_BLACKBOX_QA.md`
- deployment/runtime parity audit: `docs/ops/DEPLOYMENT_RUNTIME_PARITY_AUDIT_2026-07-22.md`
- Android code-4 provenance: `docs/mobile/ANDROID_PLAY_CODE4_PROVENANCE.md`
- iOS TestFlight readiness: `docs/mobile/IOS_STOREKIT_TESTFLIGHT_READINESS.md`
- iOS StoreKit ownership-conflict fix: `docs/qa/IOS_STOREKIT_OWNERSHIP_CONFLICT_FIX_2026-07-22.md`
- iOS lifecycle issue: GitHub issue #41
- Google Play/RTDN lifecycle issue: GitHub issue #42

Latest local 6B-3 native baseline notes:

- Android local debug app `com.canyougeo.app` `1.0.2` versionCode `4`: installed-app preflight passed and standalone smoke passed on the API 36 emulator. The complete Android release suite remains blocked by local Maestro Android driver startup instability before the remaining nonmutating flows could complete.
- iOS simulator app `com.canyougeo.app` `1.0.0` build `9`: installed-app preflight, smoke, Pattern Atlas interaction, and the non-credential Universal Link suite passed. The complete iOS release suite remains blocked at signed-in account-state verification after credential submission; credential-bearing screenshots/debug artifacts were not inspected or committed.
- The iOS `/auth/callback/` native assertion now accepts both safe outcomes: an invalid-link message for a signed-out session or the connected-account state for an already signed-in session.
- Native Challenge link assertions now verify the spoiler-safe missing-code copy instead of expecting the home hero.

Latest Google Play verification diagnostics QA-impact decision:

QA impact decision:
No additional black-box change required because the Google Play verification diagnostics change is limited to production backend purchase-verification diagnostics, sanitized error reporting, and SQL failure classification. Native billing behavior is unchanged: Android purchase UI, Google BillingClient invocation behavior, product selection, purchase/Restore request shape, native navigation, native billing discovery behavior, and iOS billing behavior are not changed. Focused Google Play verification tests cover successful verification, Google API failures, malformed service-account configuration, response mismatches, ownership conflicts, database/RPC failures, acknowledgement failures, idempotent retry, and log/response redaction. The real Play-distributed purchase and Restore path will be manually validated once after the staging and production database/function deployment sequence. Existing native QA coverage is not removed or weakened.

| Stage | Platform | Artifact or Source Identity | Command or Manual Procedure | Required Evidence | Credentials Needed | Mutates State | Purchase/Restore Allowed | Physical Device Required | Completion Status / Related Issue |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Source/unit validation | Web, Android, iOS shared source | Protected Git source | `env -u NEXT_PUBLIC_SITE_URL -u CF_PAGES_URL pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm build:native` | CI logs and local command results | No | No | No | No | Required every release PR |
| QA-impact drift gate | Source control | PR changed files vs `canyougeo-blackbox/qa-impact-map.json` | `pnpm qa:drift` | Required `test` job output or local output | No | No | No | No | Required on pull requests |
| Staging browser validation | Hosted staging site | `https://test.canyougeo.com` | `pnpm qa:blackbox:test` | `canyougeo-blackbox/reports/test.html` and sidecar metadata | Cloudflare Access token may be needed; optional auth credentials only for explicit auth suite | No default mutation | No | No | Required when Access credentials are available |
| Production-safe browser validation | Production website | `https://canyougeo.com` | `pnpm qa:blackbox:prod` and `pnpm qa:blackbox:prod-smoke` | `reports/prod.html`, `reports/prod-smoke.html`, metadata | No | No | No | No | Required before/after production promotion |
| Android emulator QA | Installed Android app | `com.canyougeo.app`, versionName `1.0.2`, versionCode `4` | `pnpm qa:native:android:preflight`, `pnpm qa:native:android:release` | Native `run-metadata.json`, Maestro safe outputs for non-credential suites | `CGY_NATIVE_*` for auth and billing-discovery steps | No default mutation | No purchase; Restore must not be tapped | Emulator acceptable for baseline | Required before Play closed-test build acceptance |
| iOS simulator QA | Installed iOS app | `com.canyougeo.app`, marketing `1.0.0`, build `9` | `pnpm qa:native:ios:preflight`, `pnpm qa:native:ios:release` | Native `run-metadata.json`, Maestro safe outputs for non-credential suites | `CGY_NATIVE_*` for auth and billing-discovery steps | No default mutation | No purchase; Restore must not be tapped | Simulator acceptable for baseline | Required before TestFlight/App Review evidence refresh |
| iOS Universal Link QA | Installed iOS app plus live AASA | `G5N5U6QFS8.com.canyougeo.app` association | `pnpm qa:native:ios:universal-link` or `pnpm qa:native:ios:release-with-universal-link` after reinstall/cache prerequisites | Native metadata and Universal Link result | No app credential by default | No | No | Simulator acceptable only after AASA cache prerequisites; physical preferred before release | Separately gated |
| iOS physical/TestFlight QA | TestFlight build | iOS `1.0.0` build `9` | Manual TestFlight install, launch/game/auth/upgrade review, nonmutating checklist | Screenshots/notes with no private identifiers | Reviewer/test account may be needed | May create app session state | Purchases only in explicit lifecycle checkpoints | Yes for App Review confidence | Waiting for Review |
| Google Play internal testing | Play-processed Android app | Currently exposes Android `1.0.1` code `2`; code `4` is not accepted yet | Manual install through Internal testing, then native smoke/release where available | Play install source, installed metadata, native metadata | Native QA credentials if auth/billing discovery runs | No default mutation | No purchase/Restore in baseline | Emulator or physical Play device | Older internal build only; code-4 upload blocked pending reset-certificate activation |
| Google Play closed testing | Play-processed Android app | Intended Android `1.0.2` code `4` unless superseded | Manual code-4 upload retry after certificate activation, then closed-test rollout after prerequisites and Google approval gates | Tester count, country targeting, crash/ANR, feedback, daily operations notes | Tester accounts, not committed | Tester app usage state | No purchase unless explicit license-test checkpoint | Physical or Play-enabled emulator | Not started; 25 testers and 177 countries configured locally in draft state but not sent to Google |
| App Store sandbox lifecycle testing | Apple sandbox transactions | StoreKit/TestFlight sandbox for `com.canyougeo.app` | Explicit lifecycle checkpoints only | Provider-event, subscription, transaction-chain, entitlement evidence with sanitized identifiers | Apple sandbox tester and app account | Yes, controlled sandbox purchase/renewal/cancel state | Allowed only when checkpoint authorizes | Physical device preferred | Tracked by issue #41; ownership conflict and production-sandbox reconciliation/race findings are tracked in `docs/qa/IOS_STOREKIT_OWNERSHIP_CONFLICT_FIX_2026-07-22.md` and `docs/qa/IOS_STOREKIT_SANDBOX_RECONCILIATION_RACE_FIX_2026-07-22.md` |
| Google Play license-test lifecycle testing | Google Play license testing | Play Billing products for `com.canyougeo.app` | Explicit lifecycle checkpoints only | Purchase-token verification, acknowledgement, RTDN, entitlement evidence with sanitized identifiers | License tester account | Yes, controlled Google test purchase state | Allowed only when checkpoint authorizes | Play Store device/emulator required | Tracked by issue #42 |
| Final public-release verification | Store and production web | App Store / Play Store release candidate plus production backend | Manual release checklist, production-safe browser QA, native smoke, store listing verification | Release notes, deployed URLs, crash/ANR baseline, entitlement verification | Store operator accounts; no committed secrets | Public release changes only after approval | Real purchase testing only if explicitly authorized | Physical devices required | Blocked until review/closed-test/store gates clear |

## Evidence Rules

- Do not record tester emails, private opt-in links, passwords, session tokens, transaction identifiers, purchase tokens, store receipts, or raw provider payloads.
- Generated reports, screenshots, videos, app archives, APKs, AABs, and device logs remain ignored.
- `pnpm qa:report` may be used to create `canyougeo-blackbox/reports/index.html`, a local evidence index linking safe browser and native report artifacts.
- Store lifecycle actions remain outside default suites and must be run only through explicit checkpoints.
