# Google Play Readiness

This document prepares the non-billing Google Play Console fields for the
current Android internal-testing release of Can You Geo. It is a worksheet and
entry guide only. Do not treat it as approval to submit declarations, upload a
new bundle, change tracks, or start closed, open, or production rollout.

## Scope

- App name: Can You Geo
- Package: `com.canyougeo.app`
- Current Android release target: `versionCode 2`, `versionName 1.0.1`
- Distribution state: internal testing only
- Purchases in this Android build: unavailable; Google Play Billing is present only as a bootstrap dependency
- Native analytics and marketing pixels: suppressed
- App model: Capacitor Android app bundling the static Next.js export

This bootstrap release is allowed to rebuild and upload one signed Android App Bundle to internal testing with
`versionCode 2` so Play Console can index the billing capability. It does not create products, offers, base plans,
Play Developer API credentials, RTDN/Pub/Sub configuration, production Supabase changes, production Stripe changes,
closed/open testing, or production rollout.

## Android Billing Bootstrap

Version 2 is a billing-capability bootstrap artifact. It adds the official Google Play Billing Library and lets the
library contribute `com.android.vending.BILLING` in the merged release manifest. The native app still renders the
existing mobile-purchases-unavailable UI, and no purchase path is reachable.

The app does not yet query Google Play subscription products, show Play-localized prices, call `launchBillingFlow`,
acknowledge purchases, send purchase tokens to a server, restore purchases, or grant Pro from browser/native code.
The approved `canyougeo_pro` subscription catalog remains uncreated until Play processes the billing-enabled internal
artifact. Backend Google Play Developer API verification and authenticated RTDN/Pub/Sub handling are required before
any purchase test.

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
| In-app purchases | Billing capability is present in version 2, but purchases remain unavailable | Play Billing is added only to unlock catalog setup; no product catalog, purchase UI, or backend verification exists yet. | Yes for internal bootstrap only |
| User-generated content | No public UGC. Limited private challenge note/email sharing exists. | No public feed, chat, profile posts, or moderation surface. If the questionnaire treats private challenge notes as UGC/messages, answer the narrower "limited user message" question truthfully. | Needs careful Console wording |
| Social interaction | Limited sharing only | Challenge links and optional challenge email exist; no direct chat or public social network. | Yes |
| Gambling simulation | No | No wagering, casino, prizes, or sweepstakes. | Yes |
| Violence/sex/profanity/drugs/fear | No | Geography puzzle content. | Yes |
| Location required | No | No Android location permission. IP-derived approximate location may exist in technical logs. | Yes |
| News app | No | Not a news publisher or news aggregator. | Yes |
| Government app | No | Not a government app. | Yes |
| Health app | No | No health or fitness functionality. | Yes |
| Financial features | No financial-product features | Digital subscription entitlement only in future; current Android has no purchases. | Yes |

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
Reviewers can test Can You Geo without signing in. Open the app, choose Play, then launch sample play in Mystery Map, Pattern Atlas, or Order Atlas. Account creation/sign-in is available from the account/sign-in surfaces for saved Daily progress and stats. Pro-only features require an entitled account, but purchases are not available in this Android build; the Upgrade screen shows mobile purchases as unavailable and does not open Stripe checkout or billing portal.
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
| Purchases | No in-app purchases in current Android build |
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
| Subscription/entitlement status | Yes, signed-in Android reads existing entitlement state from Supabase | No if Supabase is service provider | Optional for sample/free play, required for Pro access | App functionality, account management | Retained | Yes | Support/billing request with accounting/security caveats | Version 2 declares billing capability but cannot buy; web Stripe status may exist for previously entitled users |
| User payment info/card data | No | No | Not applicable | Not applicable | Not applicable | Not applicable | Not applicable | Stripe handles web payments; current Android does not launch checkout |
| Purchase history | Conservative answer: Yes if Play treats Pro entitlement/subscription state as purchase history | No if service-provider exception applies | Optional; required only for Pro entitlement display | App functionality, account management | Retained | Yes | Support/billing request with caveats | No Google Play purchase history is created by the bootstrap build; revisit after purchase testing is implemented |
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
- Current Android does not implement Play Billing.
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
9. Open Upgrade to confirm mobile purchases are unavailable and no Stripe
   checkout or portal opens.

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

- Upload the signed `versionCode 2` billing-bootstrap AAB to internal testing.
- Wait for Play internal-test propagation.
- Install through the official internal-testing opt-in route.
- Validate launch, all three games, Android Back, sign-in UI, upgrade boundary,
  no purchase sheet, no Stripe checkout, no crash, and permissions.

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

- Implement Google Play Billing subscriptions.
- Implement backend purchase-token validation.
- Update Android App Links for the Play App Signing certificate.
- Validate purchases, restoration, cancellation, and entitlement sync.
- Complete final release review.

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
  subscription caveat handled later under Play Billing.
- App access: guest/sample review instructions.
- Draft content rating answers.
- Draft Data safety answers, without submitting until production deployment and
  provider/share confirmation are settled.

## Fields Blocked By Billing Or Further QA

- Any in-app purchase/subscription declaration after Play Billing is added.
- Data safety purchase-history wording after Play Billing implementation.
- Play Billing product/base-plan/subscription setup until version 2 is processed and the Subscriptions page exposes creation controls.
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
