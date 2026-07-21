# Google Play Readiness

This document prepares the non-billing Google Play Console fields for the
current Android internal-testing release of Can You Geo. It is a worksheet and
entry guide only. Do not treat it as approval to submit declarations, upload a
new bundle, change tracks, or start closed, open, or production rollout.

## Scope

- App name: Can You Geo
- Package: `com.canyougeo.app`
- Current Android release target: `versionCode 4`, `versionName 1.0.2`
- Distribution state: internal testing only
- Purchases in this Android build: Google Play Billing purchase and restore UI is wired for controlled internal license testing only
- Native analytics and marketing pixels: suppressed
- App model: Capacitor Android app bundling the static Next.js export

This integrated mobile billing release keeps the production-approved
provider-neutral billing and account-deletion surfaces from `main` while
preserving the newer staging Android purchase-foundation implementation. It is
not approval to rebuild, re-sign, reupload, change testers, change products or
base plans, deploy production Supabase, mutate production Stripe, start closed
or open testing, or roll out production.

## Android Purchase Foundation

Version 3 is the first Google Play purchase-foundation artifact. It uses the official Google Play Billing Library,
queries only the approved `canyougeo_pro` subscription, filters to the `monthly` and `annual` auto-renewing base plans,
and launches Google Play Billing only after the authenticated staging backend returns an opaque Play account binding.

The Android client can send a Play purchase token to the JWT-protected staging verification function. The backend calls
the Android Publisher API, validates the package, product, base plan, token chain, and opaque account binding, persists
the result with service-role-only access, refreshes `public.entitlements`, and acknowledges only after durable
processing. Browser/native code must never grant Pro locally, store tokens, log tokens, or use Stripe checkout on
Android.

## RTDN Foundation

Checkpoint 5D-1D-RTDN added the staging backend path for Google Play Real-time Developer Notifications,
and Checkpoint 5D-1W3F normalizes the subscription configuration so the same
function source can be deployed safely to staging or production:

```text
Google Play -> Pub/Sub topic -> authenticated environment-specific push subscription -> google-play-rtdn Edge Function
```

The Edge Function is deployed with Supabase `verify_jwt=false` only because Google Pub/Sub supplies a Google-signed OIDC
JWT. The function verifies the Google JWT signature, issuer, exact audience, exact push service-account email, and
`email_verified` claim before parsing a Pub/Sub envelope.

Server-only configuration:

- `GOOGLE_PLAY_RTDN_PUSH_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PLAY_RTDN_AUDIENCE`
- `GOOGLE_PLAY_RTDN_TOPIC`
- `GOOGLE_PLAY_RTDN_SUBSCRIPTION`
- existing Android Publisher and catalog secrets from the API checkpoint

`GOOGLE_PLAY_RTDN_SUBSCRIPTION` is the current environment's Pub/Sub push
subscription name or full resource path. Existing staging deployments may still
define the legacy `GOOGLE_PLAY_RTDN_STAGING_SUBSCRIPTION`; the runtime accepts
that name only as a transition fallback when the neutral secret is absent.
Production must use the neutral secret.

The RTDN handler records Pub/Sub message IDs for idempotency. Test notifications are durably recorded and never create
provider subscriptions or entitlements. Subscription notifications call `purchases.subscriptionsv2.get` as the source of
truth, but only token fingerprints are persisted. A Google notification by itself cannot bind a purchase token to a user
and cannot grant Pro. Effective entitlement refresh runs only when the purchase-token fingerprint already matches an
existing service-only Google Play provider subscription for exactly one user.

Known RTDN resources from the staging evidence:

- Google Cloud project: `can-you-geo-play-billing`
- Google Play RTDN topic: `projects/can-you-geo-play-billing/topics/cgy-google-play-rtdn`
- Staging push subscription: `projects/can-you-geo-play-billing/subscriptions/cgy-google-play-rtdn-staging-push`
- Staging push URL: `https://hsgpjtyysbremrokkoym.supabase.co/functions/v1/google-play-rtdn`
- Staging OIDC audience: `https://hsgpjtyysbremrokkoym.supabase.co/functions/v1/google-play-rtdn`
- Push OIDC service account: `cgy-rtdn-push@can-you-geo-play-billing.iam.gserviceaccount.com`
- Recommended production push subscription: `projects/can-you-geo-play-billing/subscriptions/cgy-google-play-rtdn-production-push`
- Production push URL: `https://jquebthneczqdxagagof.supabase.co/functions/v1/google-play-rtdn`
- Production OIDC audience: `https://jquebthneczqdxagagof.supabase.co/functions/v1/google-play-rtdn`

The staging subscription must not be edited as part of production subscription
creation. Because Pub/Sub delivers every topic message to every active
subscription, decide separately before public production purchases whether to
disable/delete the staging push subscription or intentionally keep it only for a
controlled parallel staging observer. Do not make that decision implicitly while
creating the production subscription.

### Production RTDN Console Runbook

Use this runbook only after the v3 upload-certificate reset and Android release
plan are otherwise ready. It is a manual Google Cloud Console procedure because
the Android Publisher service-account credential intentionally lacks Pub/Sub
administration permissions.

1. Open Google Cloud Console and select project `can-you-geo-play-billing`.
2. Navigate to Pub/Sub -> Topics and inspect `cgy-google-play-rtdn`.
3. Confirm the full topic resource is `projects/can-you-geo-play-billing/topics/cgy-google-play-rtdn`.
4. Leave existing subscription `cgy-google-play-rtdn-staging-push` unchanged.
5. Confirm `google-play-developer-notifications@system.gserviceaccount.com` has Pub/Sub Publisher on the topic.
6. Confirm the Pub/Sub service agent `service-277427216726@gcp-sa-pubsub.iam.gserviceaccount.com` has Service Account Token Creator on `cgy-rtdn-push@can-you-geo-play-billing.iam.gserviceaccount.com`.
7. Create a push subscription named `cgy-google-play-rtdn-production-push` on the same topic.
8. Set the push endpoint to `https://jquebthneczqdxagagof.supabase.co/functions/v1/google-play-rtdn`.
9. Enable authenticated push using service account `cgy-rtdn-push@can-you-geo-play-billing.iam.gserviceaccount.com`.
10. Set the OIDC audience to `https://jquebthneczqdxagagof.supabase.co/functions/v1/google-play-rtdn`.
11. Keep payload unwrapping disabled.
12. Use the default 10-second acknowledgement deadline unless a future load test justifies changing it.
13. Match the staging retry policy: exponential backoff, minimum 10 seconds, maximum 600 seconds.
14. Match the staging retention and expiration settings where available: 7-day message retention and 31-day inactive expiration.
15. Collect non-secret evidence: topic details, IAM principal/role screenshots, production subscription details, push endpoint, OIDC service account, OIDC audience, retry settings, and retention/expiration settings.

Narrow permissions for the operator creating the subscription:

- Pub/Sub subscription creation permission on project `can-you-geo-play-billing`.
- `pubsub.topics.attachSubscription` on topic `projects/can-you-geo-play-billing/topics/cgy-google-play-rtdn`.
- Service Account User or equivalent `iam.serviceAccounts.actAs` on `cgy-rtdn-push@can-you-geo-play-billing.iam.gserviceaccount.com`.

Do not grant Owner or Editor to complete this setup.

### Production RTDN Deployment Plan

Do not execute these production steps until the production Pub/Sub subscription
has been created and verified.

Production function settings:

- `google-play-purchase-context`: Supabase JWT required.
- `google-play-purchase-verify`: Supabase JWT required.
- `google-play-rtdn`: Supabase `verify_jwt=false`, with Google Pub/Sub OIDC verified inside the function.

Production Google Play server-only secrets:

- `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`
- `GOOGLE_PLAY_PACKAGE_NAME` = `com.canyougeo.app`
- `GOOGLE_PLAY_SUBSCRIPTION_PRODUCT_ID` = `canyougeo_pro`
- `GOOGLE_PLAY_MONTHLY_BASE_PLAN_ID` = `monthly`
- `GOOGLE_PLAY_ANNUAL_BASE_PLAN_ID` = `annual`
- `GOOGLE_PLAY_ACCOUNT_BINDING_SECRET`
- `GOOGLE_PLAY_PROVIDER_ENVIRONMENT` = `production`
- `GOOGLE_PLAY_RTDN_PUSH_SERVICE_ACCOUNT_EMAIL` = `cgy-rtdn-push@can-you-geo-play-billing.iam.gserviceaccount.com`
- `GOOGLE_PLAY_RTDN_AUDIENCE` = `https://jquebthneczqdxagagof.supabase.co/functions/v1/google-play-rtdn`
- `GOOGLE_PLAY_RTDN_TOPIC` = `projects/can-you-geo-play-billing/topics/cgy-google-play-rtdn`
- `GOOGLE_PLAY_RTDN_SUBSCRIPTION` = `cgy-google-play-rtdn-production-push` or the full production subscription resource path

Use only local protected secret sources outside Git. One safe pattern is to
assemble a temporary env file in `mktemp`, run `supabase secrets set
--project-ref jquebthneczqdxagagof --env-file <temporary-file>`, and then
delete the temporary file.

Deploy only the Google Play functions from the approved production source:

```bash
supabase functions deploy google-play-purchase-context --project-ref jquebthneczqdxagagof
supabase functions deploy google-play-purchase-verify --project-ref jquebthneczqdxagagof
supabase functions deploy google-play-rtdn --project-ref jquebthneczqdxagagof --no-verify-jwt
```

Post-deploy validation should confirm:

- production `google-play-rtdn` rejects unauthenticated direct POSTs with `401`;
- an official Play Console test message or one synthetic Pub/Sub topic message reaches exactly the production push subscription;
- a test notification creates exactly one safe provider event and no provider subscription, transaction chain, reconciliation candidate, Apple entitlement, Stripe entitlement, or public entitlement change;
- a repeated delivery of the same Pub/Sub message is idempotent before any production purchase testing begins.

No closed/open/production rollout, purchase flow, acknowledgement, refund,
revocation, catalog change, Stripe mutation, Apple mutation, or production
purchase validation is implied by this runbook.

## Sources Reviewed

- `android/app/src/main/AndroidManifest.xml`
- `android/app/build.gradle`
- `capacitor.config.ts`
- `docs/mobile/ANDROID_CAPACITOR_POC.md`
- `docs/mobile/NATIVE_RELEASE_GUARDRAILS.md`
- `docs/STRIPE_BILLING.md`
- `docs/ops/analytics.md`
- `docs/ops/user-data-requests.md`
- `src/app/legal/page.tsx`
- `src/app/support/page.tsx`
- `src/app/page.tsx`
- `src/app/play/page.tsx`
- `src/app/play/mystery-map/page.tsx`
- `src/app/play/pattern-atlas/page.tsx`
- `src/app/play/order-atlas/page.tsx`
- `src/features/account/UpgradeClient.tsx`
- `src/features/account/BillingActionsClient.tsx`
- `src/features/account/billingActionHelpers.ts`
- `src/features/account/useSupabaseAccount.ts`
- `src/features/account/useEntitlement.ts`
- `src/features/worldprint/challengeEmailInvite.ts`
- `src/lib/account/sync.ts`
- `src/lib/account/entitlements.ts`
- `src/lib/mobile/nativeExternalNavigation.ts`
- `src/lib/persistence/storage.ts`
- `src/lib/site/analytics.ts`
- `src/lib/site/buildTarget.ts`
- `src/lib/supabase/client.ts`
- `src/lib/supabase/database.ts`
- `src/lib/supabase/nativeAuthStorage.ts`
- `supabase/functions/send-challenge-email/index.ts`
- `supabase/functions/stripe-checkout/index.ts`
- `supabase/functions/stripe-portal/index.ts`
- `supabase/migrations/20260627010000_rls_account_security_hardening.sql`
- `supabase/migrations/20260630130000_challenge_email_sends.sql`
- Public pages checked: `https://canyougeo.com/`, `https://canyougeo.com/play/`,
  `https://canyougeo.com/privacy/`, `https://canyougeo.com/terms/`,
  `https://canyougeo.com/support/`
- Google Play references:
  - `https://support.google.com/googleplay/android-developer/answer/10787469`
  - `https://support.google.com/googleplay/android-developer/answer/13327111`
  - `https://support.google.com/googleplay/android-developer/answer/9859655`
  - `https://support.google.com/googleplay/android-developer/answer/9867159`

## Store Listing Copy

### Short Description Options

Recommended:

```text
Read maps, spot patterns, and rank countries in daily geography games.
```

Alternates:

```text
Three geography games for maps, patterns, and country-order puzzles.
```

```text
Play daily geography puzzles across maps, patterns, and country ranks.
```

### Full Description

```text
Can You Geo turns world data into playable geography puzzles.

Pick from three ways to read the world:

Mystery Map
Study an unlabeled data map, spend clues carefully, and guess what the colors are showing.

Pattern Atlas
Find the rule that connects highlighted countries.

Order Atlas
Arrange country cards by a known data signal and see how close your read was.

You can try sample games without an account. Free accounts unlock Daily rounds in supported games, saved progress, streaks, and basic stats where available. Pro access, where available, unlocks supported advanced modes such as Custom Atlas, Pattern Runs, repeatable Order Atlas Pro Play, Past Games, and deeper stats.

Can You Geo is built for curious players who like maps, data, trivia, and the small shock of realizing the world makes a different pattern than expected.
```

Do not mention Supabase, Stripe, Capacitor, internal testing, propagation delay,
or temporary mobile purchase limitations in permanent public listing copy.

## App Classification

| Field | Recommended answer | Source or reason | Safe now |
| --- | --- | --- | --- |
| App or game | Game | Product is a geography game library. | Yes |
| Download price | Free | Current Play setup and launch model. | Yes |
| Primary category | Educational | Geography/data puzzle game with learning value. | Yes |
| Secondary/tags | Trivia, Puzzle, Geography/Educational if available | Actual gameplay is map reading, rule finding, and ordering. | Yes |
| Designed for children | No | Privacy policy says the service is not directed to children under 13; account features collect email. | Yes |
| Target age | Recommend 13-15, 16-17, 18+ | Educational but text/data-heavy, account-based, not designed for under-13 children. User/legal confirmation recommended. | Needs confirmation |
| Ads | No | No ad SDKs found; native analytics/pixels suppressed. | Yes |
| In-app purchases | Yes for the staged internal-test Android build only | Google Play Billing purchase and restore paths are implemented for controlled license testing against the approved `canyougeo_pro` catalog; native Stripe checkout/portal remain disabled. | Internal testing only; production declaration requires final release approval |
| User-generated content | No public UGC. Limited private challenge note/email sharing exists. | No public feed, chat, profile posts, or moderation surface. If the questionnaire treats private challenge notes as UGC/messages, answer the narrower "limited user message" question truthfully. | Needs careful Console wording |
| Social interaction | Limited sharing only | Challenge links and optional challenge email exist; no direct chat or public social network. | Yes |
| Gambling simulation | No | No wagering, casino, prizes, or sweepstakes. | Yes |
| Violence/sex/profanity/drugs/fear | No | Geography puzzle content. | Yes |
| Location required | No | No Android location permission. IP-derived approximate location may exist in technical logs. | Yes |
| News app | No | Not a news publisher or news aggregator. | Yes |
| Government app | No | Not a government app. | Yes |
| Health app | No | No health or fitness functionality. | Yes |
| Financial features | No financial-product features | Digital subscription entitlement only; no loans, banking, trading, or financial advice. Current Android purchases are limited to controlled internal license testing. | Yes |

## App Content Declarations

### Ads

Answer: No, the app does not contain ads.

Reason: No AdMob/advertising SDK or Play services advertising dependency was
found. Public policy mentions advertising measurement for production web, but
native builds suppress GTM/GA/Meta/TikTok/Reddit loaders.

### App Access

Recommended answer: Some features are restricted, but reviewers can evaluate
the app without credentials through guest/sample play.

Console instructions:

```text
Reviewers can test Can You Geo without signing in. Open the app, choose Play, then launch sample play in Mystery Map, Pattern Atlas, or Order Atlas. Account creation/sign-in is available from the account/sign-in surfaces for saved Daily progress and stats. Pro-only features require an entitled account or an authorized Google Play license-test purchase. The Upgrade screen uses Google Play Billing on Android and does not open Stripe checkout or billing portal.
```

If Google later requires review of Pro-only surfaces, create a dedicated
least-privileged review account outside Git and do not include billing
credentials or administrator access.

### Target Audience And Content

Recommended target age groups: 13-15, 16-17, and 18+. Confirm this before
saving because selecting any younger child audience can trigger Families policy
requirements. The app is educational, but the audience is general geography
players and learners, not children under 13.

### Content Rating Worksheet

| Topic | Recommended answer |
| --- | --- |
| Violence | No |
| Fear/horror | No |
| Sexual content/nudity | No |
| Profanity/crude humor | No |
| Controlled substances | No |
| Gambling/contests/prizes | No |
| User interaction | Limited sharing/challenge invites only; no public chat or public UGC |
| Sharing | Yes, challenge/result links and optional challenge email sharing |
| Location | No location permission or location gameplay; disclose IP-derived approximate location only in Data safety if treated as collected |
| Purchases | Yes for controlled internal license testing only; no public production purchase flow until release approval |
| Unrestricted internet access | No, it is not a web browser; it uses internet for app services and only allows trusted external social links |
| User-generated content | No public UGC; private challenge note/email requires careful answer if Console asks about user-created messages |

Do not submit the questionnaire until final Console wording is reviewed.

## Data Safety Worksheet

Google Play defines "collect" as transmitting data off device, including from
an app-controlled WebView. It defines some service-provider transfers as not
"sharing" when the provider processes data on the developer's behalf. The table
below uses that rule: third-party processors are listed, but "shared" should be
marked No where the provider qualifies for the service-provider exception.

| Data category | Current Android collection | Shared for Play Data safety | Required/optional | Purpose | Retained or ephemeral | Encrypted in transit | Deletion mechanism | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Email address | Yes for account sign-up/sign-in; optional challenge recipient email is sent through the email function | No if Supabase/Resend are service providers; user-initiated challenge email reaches the chosen recipient | Optional for sample play, required for accounts and challenge email sending | App functionality, account management, developer communications, security | Retained in auth/support/email systems as needed | Yes, HTTPS/TLS | `/account-deletion/` and support request workflow | Do not collect from guests unless they contact support or receive/send challenge email |
| User IDs/account identifiers | Yes for signed-in accounts | No if Supabase/hosting are service providers | Optional for sample play, required for saved account features | App functionality, account management, fraud/security | Retained | Yes | `/account-deletion/` and support request workflow | Supabase Auth user ID and app support/account identifiers |
| Authentication/session tokens | Yes, through Supabase auth; native stores session using secure storage | No if Supabase is service provider | Required for signed-in features | App functionality, account management, security | Retained until sign-out/session expiry/provider retention | Yes | Sign-out and account deletion request | Do not claim all browser storage is encrypted at rest; native uses secure storage |
| Profile/settings data | Display name derived from account, marketing preference fields | No if Supabase is service provider | Optional for sample play, required for accounts where profile exists | Account management, app functionality, developer communications preference | Retained | Yes | `/account-deletion/` and support request workflow | Marketing opt-in defaults to off unless explicitly opted in |
| Game scores/history/stats/streaks | Yes for signed-in synced runs; local-only for guest/sample until account sync where supported | No if Supabase is service provider | Optional for sample play, required for saved stats | App functionality, personalization, analytics-like personal stats | Retained | Yes | `/account-deletion/` and support request workflow | Includes run summaries and round results |
| Challenge data | Yes for challenge links/history and optional challenge email ledger | No if Supabase/Resend are service providers; user-initiated email reaches chosen recipient | Optional | App functionality, sharing, fraud/security/rate limiting, communications | Retained | Yes | Support request with retention caveats | Ledger stores hashes/domain/message length/status, not a marketing list |
| Subscription/entitlement status | Yes, signed-in Android reads existing entitlement state from Supabase and can refresh verified Google Play test purchases | No if Supabase is service provider | Optional for sample/free play, required for Pro access | App functionality, account management | Retained | Yes | Support/billing request with accounting/security caveats | Web Stripe status may exist for previously entitled users; Android production purchase access remains gated |
| User payment info/card data | No | No | Not applicable | Not applicable | Not applicable | Not applicable | Not applicable | Stripe handles web payments; current Android does not launch checkout |
| Purchase history | Conservative answer: Yes if Play treats Pro entitlement/subscription state as purchase history | No if service-provider exception applies | Optional; required only for Pro entitlement display and controlled license-test validation | App functionality, account management | Retained | Yes | Support/billing request with caveats | Google Play production purchase history should be disclosed only when public purchase access is enabled |
| Approximate location | Conservative answer: Yes if IP-derived approximate location in technical logs is treated as collected | No if hosting/Supabase are service providers | Automatic when network services are used | Security, fraud prevention, compliance, diagnostics | Retained in provider logs per provider settings | Yes | Support request/provider retention caveats | No GPS/precise location permission or gameplay location collection |
| Precise location | No | No | Not applicable | Not applicable | Not applicable | Not applicable | Not applicable | No Android location permission |
| App interactions | Native app has first-party gameplay interactions and local state; app-owned analytics delivery is suppressed in native | No | Required for gameplay; analytics collection disabled in native | App functionality; no native marketing analytics | Gameplay state retained locally and synced for signed-in users where supported | Yes when synced | Support request/local device clear | Do not mark native marketing analytics as active |
| Crash/diagnostics | No dedicated app crash SDK found; Play may collect Android vitals outside app code | Not by app | Not applicable for app-owned SDKs | Platform diagnostics | Google Play platform-controlled | Platform-controlled | Platform-controlled | If a crash SDK is added later, update this |
| Device or advertising IDs | No Advertising ID or device-ID SDK found | No | Not applicable | Not applicable | Not applicable | Not applicable | Not applicable | Dynamic receiver/license permissions may appear from dependencies, but no ad ID collection found |
| Photos/videos/files | No user media collection | No | Not applicable | Not applicable | Not applicable | Not applicable | Not applicable | FileProvider exists for platform support, not user-file upload |
| Contacts | No | No | Not applicable | Not applicable | Not applicable | Not applicable | Not applicable | Challenge email recipient is typed manually, not read from contacts |
| Camera | No | No | Not applicable | Not applicable | Not applicable | Not applicable | Not applicable | No camera permission |
| Microphone/audio | No | No | Not applicable | Not applicable | Not applicable | Not applicable | Not applicable | No microphone permission |
| Push notification token | No | No | Not applicable | Not applicable | Not applicable | Not applicable | Not applicable | Push is not configured |

Global Data safety answers:

- Data encrypted in transit: Yes for app-controlled network requests.
- Users can request deletion of data: Yes through the `/account-deletion/`
  support workflow after deployment. Do not claim instant or fully self-service
  deletion.
- Data shared: No for processors that qualify as service providers; user-
  initiated challenge email is expected by the sender/recipient flow. Confirm
  provider contracts before final submission.
- Data sold: No.

## Privacy Policy Alignment

The current public Privacy Policy covers authentication, account data, gameplay
records, support, billing/subscription state, service providers, technical logs,
marketing/advertising measurement when enabled, deletion requests by support,
retention caveats, security, and children under 13. The policy is broad enough
for the current Android build, but Play Data safety must distinguish native
behavior from production web behavior:

- Native analytics and marketing pixels are suppressed.
- Native Stripe checkout and portal are disabled.
- Current Android implements Play Billing only for controlled internal license
  testing; native Stripe checkout and portal remain disabled.
- Existing Pro entitlement state may still be read for already entitled users.

The public account-deletion resource and signed-in account entry point are
implemented in source and should be deployed before submitting account-deletion
answers in Play Console. The workflow is request-based and support-verified; it
does not claim instant or fully self-service deletion.

## Account Deletion Readiness

Current state:

- Public policy and support pages point users to `/account-deletion/` and
  `support@canyougeo.com`.
- Internal SOP maps data surfaces and deletion caveats.
- Signed-in Account includes a non-destructive Delete account entry that
  navigates to `/account-deletion/`.
- `/account-deletion/` prominently names Can You Geo, gives deletion request
  instructions, explains identity verification, summarizes data categories,
  includes retention caveats, and separates subscription cancellation.

Google Play account deletion requirement applies because the app lets users
create accounts. The Play Console account-deletion URL can be:

```text
https://canyougeo.com/account-deletion/
```

Use that URL only after production deployment verifies the page. Do not claim
full self-service deletion unless a later backend deletion workflow exists.

## Reviewer Access

Reviewers can evaluate the current build without credentials:

1. Launch Can You Geo.
2. Open Play.
3. Open Mystery Map and run sample play.
4. Return to Play.
5. Open Pattern Atlas and run sample play.
6. Return to Play.
7. Open Order Atlas and run sample play.
8. Open Account or Sign in to confirm account UI renders.
9. Open Upgrade to confirm Google Play Billing appears only for authorized
   internal license testing, no purchase sheet opens until explicitly tapped,
   and no Stripe checkout or portal opens.

Credentials are not required for basic review. If Google requests access to
account-only or Pro-only states, create a dedicated least-privileged review
account outside this repository and store credentials outside Git.

## Store Assets

| Asset | Current inventory | Status |
| --- | --- | --- |
| High-resolution app icon | `public/cgy-logo-icon-512.png` is 512x512 | Usable candidate; confirm Play icon styling/background |
| Android launcher icons | `android/app/src/main/res/mipmap-*` includes launcher PNG/XML assets | Packaged; not a substitute for Play high-res icon upload if Play asks separately |
| Feature graphic | No Play-sized 1024x500 feature graphic found | Missing |
| Phone screenshots | No Play-ready Android phone screenshots found | Missing |
| 7-inch tablet screenshots | None found | Optional/recommended only after tablet QA |
| 10-inch tablet screenshots | None found | Optional/recommended only after tablet QA |
| Promotional video | `public/images/homepage/can-you-geo-cinematic-hero.mp4` exists as web marketing media | Optional; do not upload without review |
| Existing marketing images | Homepage images are 1568x1003 or similar and can guide visual direction | Not direct Play screenshots |
| Privacy policy URL | `https://canyougeo.com/privacy/` | Ready |
| Support email | `support@canyougeo.com` | Ready |
| Website URL | `https://canyougeo.com/` | Ready |

Screenshot scenes to capture from the real Android app:

1. Can You Geo play hub.
2. Mystery Map gameplay with the map visible and no private account data.
3. Pattern Atlas gameplay with highlighted countries.
4. Order Atlas country-ranking gameplay.
5. A correct-result or stats moment with no account email, support ID, debug
   banner, emulator chrome, or credential visible.

Do not use AI-generated UI, browser screenshots, internal Play Console
screenshots, screenshots with private account identifiers, or images from a
different build as store screenshots.

## Play Console Entry Guide

| Console section | Recommended entry | Source/reason | Safe now | Blocked |
| --- | --- | --- | --- | --- |
| Store settings | Game, Free, English (United States) unless changed by user | Existing app setup and product language | Yes | No |
| Category/tags | Educational game; Trivia/Puzzle/Geography tags if available | Gameplay type | Yes | No |
| Main store listing | Use copy in this doc | Public product copy | Yes | Needs final user approval |
| Contact details | Support email and website URL above | Public support page | Yes | No |
| Privacy policy | `https://canyougeo.com/privacy/` | Public policy | Yes | No |
| Ads | No | No ad SDKs/native marketing disabled | Yes | No |
| App access | Review without credentials; guest/sample paths | Play hub and sample access | Yes | Pro review account only if Google requires |
| Target audience | Recommend 13+, not designed for children | Policy and account model | Needs confirmation | No |
| Content rating | All mature content categories No; limited sharing/challenge invites | Product behavior | Draft now | Submit only after review |
| Data safety | Use worksheet above | Code/policy audit and Google definitions | Draft now | Final provider/share confirmation and production deployment |
| Account deletion | Request path implemented: `/account-deletion/` plus signed-in Account entry | Google requires in-app path and web resource for account-creating apps | Safe after production deployment verification | Full self-service deletion remains deferred |
| Internal testing status | Keep existing internal track only | Current checkpoint constraints | Monitor only | Play propagation/install validation |
| Closed testing | Do not start | User constraint and Play prerequisites | No | Requires 12 testers/14 days after readiness |

## Remaining Work Classification

Required before internal install validation:

- Upload the signed `versionCode 4` production-configured purchase-foundation AAB to internal testing after the v3 upload-certificate reset is active.
- Wait for Play internal-test propagation.
- Install through the official internal-testing opt-in route.
- Validate launch, all three games, Android Back, sign-in UI, upgrade boundary,
  Play-localized subscription plans visible, no purchase sheet until explicitly
  tapped, no Stripe checkout, no crash, and permissions.

Required before closed testing:

- Complete app content drafts accurately.
- Add/capture real Android phone screenshots and feature graphic.
- Confirm target age selection.
- Deploy and verify the account deletion path/web resource for Play declarations.
- Complete physical-device QA.
- Keep package ID and existing upload key unchanged.

Required before production-access application:

- 12 testers for 14 days after closed test begins.
- Production-access questionnaire.
- Content rating and Data safety submitted and accepted.
- Store listing graphics and copy approved.

Required before public production release:

- Validate Google Play purchases, restoration, cancellation, and entitlement
  synchronization through the full license-test matrix.
- Update Android App Links for the Play App Signing certificate.
- Promote and verify the approved mobile billing schema/functions in production
  through the protected release workflow.
- Complete final store listing, policy, Data safety, and review approval.

Optional post-launch improvements:

- Dedicated privacy/account portal.
- Formal export tooling.
- Tablet-specific screenshots after tablet QA.
- Promotional video after review.

## Console Fields Safe To Complete Now

- Store settings: Game, Free, default language English (United States).
- App name: Can You Geo.
- Short/full listing copy after user approval.
- Privacy policy URL.
- Support contact email and website.
- Ads: No.
- News/government/health/financial-feature declarations: No, with the digital
  subscription caveat handled in the in-app purchase and Data safety sections.
- App access: guest/sample review instructions.
- Draft content rating answers.
- Draft Data safety answers, without submitting until production deployment and
  provider/share confirmation are settled.

## Fields Blocked By Billing Or Further QA

- Public in-app purchase/subscription declaration until controlled internal
  billing validation is complete and production release is approved.
- Final Data safety purchase-history wording until production billing
  availability is approved.
- Public Play Billing rollout until the version 3 internal-test build,
  backend verification, RTDN, entitlement synchronization, and tester safety
  checks are accepted for production.
- Store screenshots from the Play-processed Android build.
- Closed testing start.
- Production-access application.
- Production rollout.

## Validation Notes

This is a documentation checkpoint. If this file changes in the repository,
run:

```bash
pnpm lint
pnpm typecheck
pnpm build
git diff --check
```

Do not run Android release build commands as part of this checkpoint.
