# Can You Geo iOS App Store Submission Pack

Checkpoint 5D-1H prepares App Store Connect submission metadata, review notes, privacy answers, and asset requirements for Can You Geo. This worksheet is documentation and asset planning only. It does not mutate App Store Connect, StoreKit products, Supabase, Stripe, app versions, archives, or uploads.

Original source baseline: protected staging commit `78f2ef34f8133cb4fc7e9dd5210276840a6db69c`.

Synchronized staging baseline: `9dbf43d0966ce2b21b06799435106f735e218df3`, the protected merge commit for PR #44, `Add iOS privacy manifest audit`. The submission worksheet now assumes the merged app-level privacy manifest at `ios/App/App/PrivacyInfo.xcprivacy` and the companion audit at `docs/mobile/IOS_PRIVACY_MANIFEST_AUDIT.md`.

Official Apple references checked on July 19, 2026:

- App information, including app name and subtitle limits: `https://developer.apple.com/help/app-store-connect/reference/app-information/app-information/`
- Platform version information, including promotional text, description, keywords, and support URL requirements: `https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information`
- Screenshot specifications: `https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/`
- Upload app previews and screenshots: `https://developer.apple.com/help/app-store-connect/manage-app-information/upload-app-previews-and-screenshots`
- App preview specifications: `https://developer.apple.com/help/app-store-connect/reference/app-information/app-preview-specifications/`
- Age rating setup: `https://developer.apple.com/help/app-store-connect/manage-app-information/set-an-app-age-rating/`
- Age rating values and definitions: `https://developer.apple.com/help/app-store-connect/reference/app-information/age-ratings-values-and-definitions`
- App privacy details: `https://developer.apple.com/app-store/app-privacy-details/`
- App Review Guidelines: `https://developer.apple.com/app-store/review/guidelines/`
- Submit an In-App Purchase: `https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-in-app-purchase/`
- Auto-renewable subscription information: `https://developer.apple.com/help/app-store-connect/reference/in-app-purchases-and-subscriptions/auto-renewable-subscription-information/`
- Promoting In-App Purchases, including display-name and description limits: `https://developer.apple.com/app-store/promoting-in-app-purchases/`

## 1. App Identity

| Field | Proposed or recorded value | Source and validation |
| --- | --- | --- |
| App name | `Can You Geo` | Source display name in `ios/App/App/Info.plist`; 11 characters, within Apple's 2-30 character limit. |
| Subtitle | `Geography map puzzles` | Proposed metadata; 21 characters, within Apple's 30 character limit. |
| Bundle ID | `com.canyougeo.app` | Source `PRODUCT_BUNDLE_IDENTIFIER` in `ios/App/App.xcodeproj/project.pbxproj`; do not change after build upload. |
| SKU | Existing App Store Connect field | The App Store app record already exists. Read the current SKU from App Store Connect and copy it into the final submission worksheet; do not create, guess, or change the SKU. The current SKU is not recorded in this repository. |
| Apple ID | `6791248782` | Already recorded in `docs/mobile/IOS_STOREKIT_TESTFLIGHT_READINESS.md`. |
| Primary language | English (U.S.) | Matches current source copy and local StoreKit configuration localization `en_US`. |
| Copyright | Manual legal field | Use the exact legal owner from the Apple Developer account seller record. Do not guess. Suggested format: `Copyright 2026 [Developer Legal Name]`. |
| Target device family | iPhone | Source `TARGETED_DEVICE_FAMILY = 1`. |
| Export compliance | Uses non-exempt encryption: `false` | Source `ITSAppUsesNonExemptEncryption` is a Boolean false, not a string. |

## 2. Product-Page Copy

### Character-Limited Fields

| Field | Proposed value | Limit check |
| --- | --- | --- |
| App name | `Can You Geo` | 11/30 characters. |
| Subtitle | `Geography map puzzles` | 21/30 characters. |
| Promotional text | `Read mystery maps, spot country patterns, and order world data in three quick geography puzzle games. Sample play is free; Pro unlocks deeper atlas modes.` | 154/170 characters. |
| Keywords | `geography,map quiz,world map,country quiz,atlas,daily puzzle,trivia,education,puzzle game` | 89/100 UTF-8 bytes. |
| Monthly IAP display name | `Can You Geo Pro Monthly` | 23/30 characters. |
| Monthly IAP description | `Monthly access to Can You Geo Pro.` | 34/45 characters. |
| Annual IAP display name | `Can You Geo Pro Annual` | 22/30 characters. |
| Annual IAP description | `Annual access to Can You Geo Pro.` | 33/45 characters. |

### Promotional Text

```text
Read mystery maps, spot country patterns, and order world data in three quick geography puzzle games. Sample play is free; Pro unlocks deeper atlas modes.
```

### Full Description

This draft is 1110 characters, below Apple's 4000 character limit.

```text
Can You Geo is a geography game collection about reading the world from evidence.

Start with Mystery Map: study an unlabeled choropleth map, spend clues carefully, and guess what the colors are showing. Then try Pattern Atlas, where highlighted countries share a hidden rule, and Order Atlas, where you arrange country cards by a known world-data signal.

Free play includes sample runs and supported Daily games. A free account can save supported Daily progress, streaks, and basic stats. Can You Geo Pro unlocks supported advanced modes such as Mystery Map Custom Atlas, Pattern Atlas Pattern Runs, Order Atlas Pro Play, the full Past Games archive, and advanced stats.

The games are built from public world-data sources and are meant for entertainment and learning. Map boundaries, missing-data choices, and source definitions are treated as puzzle context, not political statements.

On iPhone, Pro subscriptions are managed by Apple In-App Purchase. Free play does not require a payment card, and Can You Geo does not collect payment card details. Restore Purchases is available for Apple subscriptions.
```

### Categories And URLs

| Field | Proposed value | Notes |
| --- | --- | --- |
| Primary category | Games | Best match for the current app. Apple says metadata categories must accurately match the app experience. |
| Game subcategories | Trivia, Puzzle | The app is a quiz/puzzle geography game. |
| Secondary category | Education | Optional. Use only if App Store Connect allows it alongside Games and the final reviewer copy keeps the learning positioning. |
| Support URL | `https://canyougeo.com/support/` | Current support page includes actual contact email. |
| Marketing URL | `https://canyougeo.com/` | Optional. The current home page is the product page and is suitable unless a dedicated marketing URL is later created. |
| Privacy Policy URL | `https://canyougeo.com/privacy/` | Required for iOS apps. |
| Terms URL | `https://canyougeo.com/terms/` | Public terms route. |
| Account deletion URL | `https://canyougeo.com/account-deletion/` | Public request surface required for account-creation apps. |

Do not include prices in app name, subtitle, keywords, screenshots, or preview copy. The public screenshots may show localized App Store prices only when captured from the real app after StoreKit products are live.

## 3. Age-Rating Worksheet

Can You Geo is a geography quiz and puzzle game. It has account creation, optional score-to-beat challenge email/link sharing, and no public chat, no user-generated public feed, no gambling, no prizes, no location tracking, no violence, and no mature content. The final App Store Connect rating is calculated by Apple and may vary by region.

| Apple topic | Answer | Evidence and note |
| --- | --- | --- |
| Parental Controls | No | The app does not provide a parental-control system. |
| Age Assurance | No | The app does not verify age. The public policy says the service is not directed to children under 13. |
| Unrestricted Web Access | No | Internal links stay in the app; external support/legal links are controlled Can You Geo URLs. The app does not provide a general web browser or search. |
| User-Generated Content | No | There is no public UGC feed, public profile posting, creator upload, or moderation workflow. Optional challenge sharing is private invite/link sharing for a generated game result. |
| Social Media | No | No social feed, followers, likes, or platform-style social networking. |
| Social Media Disabled For Users Under 13 | Not applicable | Social media features are not present. |
| Messaging and Chat | No | No in-app chat, inbox, direct messaging, or public chat. Challenge email/link sharing is a one-off sharing action, not chat. |
| Advertising | No | Native advertising and marketing analytics are disabled in current native builds. |
| Profanity or Crude Humor | None | Current geography-game copy does not contain this content. |
| Horror/Fear Themes | None | No horror or fear content. |
| Alcohol/Tobacco/Drug Use or References | None | No such content is part of current game data or copy. |
| Medical/Treatment Information | None | No medical advice or treatment information. |
| Health/Wellness Topics | None | No health or wellness content. |
| Mature/Suggestive Themes | None | No mature or suggestive content. |
| Sexual Content/Nudity | None | No sexual content or nudity. |
| Graphic Sexual Content/Nudity | None | No graphic sexual content or nudity. |
| Cartoon/Fantasy Violence | None | No violence. |
| Realistic Violence | None | No violence. |
| Prolonged Graphic/Sadistic Realistic Violence | None | No violence. |
| Guns/Weapons | None | No weapon content. |
| Gambling | No | No wagering, casino mechanics, cash-out, or gambling product. |
| Simulated Gambling | None | No casino simulation or simulated wagering. |
| Contests | Infrequent | Daily trivia-style play, personal score goals, challenge links, and score-to-beat sharing fall under Apple's current contest definition even without prizes. There are no sweepstakes, official rankings, cash rewards, or wagering. |
| Loot Boxes | No | No randomized paid item or loot box mechanic. |
| Made for Kids category | No | Do not select Made for Kids unless the product and legal posture changes; that selection has continuing obligations. |
| Override to higher age rating | Not planned | Use only if counsel or product policy chooses a higher rating than Apple's calculated result. |

Expected result: likely a low/global 4+ style rating under the current content profile, subject to Apple's current questionnaire and region-specific calculation.

## 4. App Privacy Worksheet

Apple requires privacy answers to cover the app and third-party partners whose code or services collect data. Do not claim that the app collects nothing: signed-in accounts, saved gameplay, subscription state, support requests, and deletion requests are transmitted to Can You Geo services. Do not claim payment-card collection: payment instruments are handled by Apple for iOS subscriptions and are not accessed by Can You Geo.

Use Apple's selectable purpose choices only in the App Store Connect purpose fields:

- Third-Party Advertising
- Developer's Advertising or Marketing
- Analytics
- Product Personalization
- App Functionality
- Other Purposes

Use internal rationale only for reviewer notes, policy worksheets, and operator understanding. Internal rationale terms such as authentication, account management, customer support, fraud prevention/security, subscription verification, legal/compliance, and service reliability are not standalone App Store Connect purpose choices.

| Data category | Collected by current native app? | Linked to user? | Used for tracking? | App Store Connect selectable purpose | Internal operational rationale | Responsible service or system | Notes for App Store Connect |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Email Address | Yes, for signed-in accounts and support flows | Yes | No | App Functionality; Developer's Advertising or Marketing only for consented update/marketing email | Authentication, account management, customer support, legal/compliance, optional consented updates | Can You Geo, Supabase Auth, email/support provider | Matches merged `PrivacyInfo.xcprivacy`: `NSPrivacyCollectedDataTypePurposeAppFunctionality` and `NSPrivacyCollectedDataTypePurposeDeveloperAdvertising`. Keep the developer-marketing purpose because Can You Geo may send optional updates only to users who consent. |
| User ID | Yes | Yes | No | App Functionality | Authentication, account ownership, subscription verification, customer support, fraud prevention/security | Can You Geo, Supabase | Includes Supabase user UUID and backend account identifiers. Apple `appAccountToken` uses the signed-in account UUID for subscription ownership binding. |
| Gameplay Content | Yes for signed-in saved progress/stats; guest sample play may remain local-only | Yes when signed in | No | App Functionality | Saved progress, runs, scores, streaks, challenge state, account-linked gameplay continuity | Can You Geo, Supabase | Includes guesses, runs, scores, streaks, challenge metadata, and stats. |
| Purchase History | Yes for subscription status and entitlement records | Yes | No | App Functionality | Subscription verification, entitlement restoration, billing support, fraud prevention/security | Can You Geo backend, Apple StoreKit/App Store Server API, Supabase | Includes provider subscription status, product ID, renewal/expiration state, and entitlement projection. Do not disclose payment-card collection. |
| Customer Support | Yes when users contact support or request deletion | Yes if the user includes account/contact details | No | App Functionality | Customer support, account deletion, account management, legal/compliance, service reliability | Can You Geo, support inbox/provider | Includes support emails, account-deletion requests, verification context, and operational follow-up. |
| Other Diagnostic Data | Limited operational diagnostics may be collected | May be linked when tied to account/session/security events | No | App Functionality | Service reliability, troubleshooting, security review, support investigation | Can You Geo, Supabase, Cloudflare/hosting, Apple tooling where applicable | Disclose only to the extent final Apple privacy reports and backend logging confirm collection. No native crash analytics or performance analytics SDK is bundled. |
| Product Interaction | Not for native marketing analytics in the current source | No current native collection | No | Do not select Analytics while native analytics remains disabled | Not applicable unless native analytics is enabled later | Current native app disables analytics/marketing pixels | If native analytics changes, update `PrivacyInfo.xcprivacy`, `docs/mobile/IOS_PRIVACY_MANIFEST_AUDIT.md`, and App Store Connect before submission. |
| Device ID | Not intentionally collected by Can You Geo native code | No | No | Do not select | Not applicable | Platform/store services may have their own processor disclosures | Do not declare unless final dependency privacy report shows collection by an included SDK. |
| Location | No precise or coarse location collection | No | No | Do not select | Not applicable | None in app source | Geography gameplay uses world data and maps; it does not collect the user's location. Approximate IP-derived region may appear in hosting/security logs outside native APIs. |
| Payment Info | No payment-card or bank details collected by Can You Geo | No | No | Do not select | Not applicable | Apple handles iOS payment instruments | Purchase history/subscription state is collected; card details are not. |
| Contacts | No | No | No | Do not select | Not applicable | None | Challenge email sends use a manually supplied recipient address for that send; the app does not read the device contacts database. |
| Photos or Videos | No | No | No | Do not select | Not applicable | None | Users may choose to send screenshots to support outside the app. |
| Audio Data | No | No | No | Do not select | Not applicable | None | No microphone capture. |
| Health and Fitness | No | No | No | Do not select | Not applicable | None | No HealthKit or fitness data. |
| Sensitive Info | No intentional collection | No | No | Do not select | Not applicable | None | Support instructions should continue to tell users not to send passwords, recovery codes, payment cards, or private tokens. |
| Advertising Data | No native ads or ad tracking | No | No | Do not select Third-Party Advertising or Analytics | Not applicable | None in native source | Web marketing measurement is separate and should remain disabled in native builds unless explicitly changed. |

Required App Store Connect posture:

- Email Address: linked to the user, not used for tracking, purpose `App Functionality`; add `Developer's Advertising or Marketing` only for consented update/marketing email.
- User ID: linked to the user, not used for tracking, purpose `App Functionality`.
- Gameplay Content: linked to signed-in users, not used for tracking, purpose `App Functionality`.
- Purchase History: linked to the user, not used for tracking, purpose `App Functionality`.
- Customer Support: linked when the requester identifies an account, not used for tracking, purpose `App Functionality`.
- Other Diagnostic Data: linked where tied to account/session/security events, not used for tracking, purpose `App Functionality`.
- Analytics: do not select while native analytics remains disabled.
- Tracking: `No`.

## 5. App Review Information

### Review Contact

Fill these fields only in App Store Connect. Do not commit private reviewer contact details to Git.

| Field | Value |
| --- | --- |
| First name | `[review contact first name]` |
| Last name | `[review contact last name]` |
| Phone number | `[review contact phone]` |
| Email | `[review contact email]` |

### Reviewer Account Strategy

- Guest/sample testing: no account is required. Launch the app, open the game library, and run sample gameplay in Mystery Map, Pattern Atlas, and Order Atlas.
- Signed-in Free testing: provide one ordinary reviewer test account in App Store Connect Review Notes only. The account should have Free status, no admin privileges, and no real personal data beyond the reviewer credentials.
- Pro/subscription testing: use Apple sandbox purchase review flow and the attached `Can You Geo Pro` subscriptions. The reviewer should be able to load monthly and annual products, subscribe in sandbox, return to the app, and use Restore Purchases.
- No shared administrator or superuser account should be provided.
- Keep all account passwords, sandbox tester credentials, and reviewer-only emails out of Git.

### Reviewer Notes Draft

```text
Can You Geo is a geography puzzle game collection with guest sample play, signed-in Free play, and optional Pro access.

Guest testing: launch the app and open the game library. Mystery Map, Pattern Atlas, and Order Atlas each include sample/free gameplay without a paid subscription.

Signed-in testing: use the reviewer test account provided in App Store Connect to verify account sign-in, saved progress surfaces, and the Free/Pro boundary.

Pro testing: native iOS subscriptions use Apple In-App Purchase only. The app does not open Stripe Checkout or the Stripe Customer Portal on iOS. Select a monthly or annual Can You Geo Pro plan from the Upgrade or Account billing area, complete the Apple sandbox sheet, then wait for backend verification. Entitlement refresh may take a short moment because the app waits for server-side App Store verification before finishing transactions and showing Pro. Restore Purchases is available from the same native Apple purchase area.

Account deletion instructions are available at https://canyougeo.com/account-deletion/. Support is available at support@canyougeo.com.
```

## 6. Subscription Submission

Current local StoreKit configuration:

| Field | Monthly | Annual |
| --- | --- | --- |
| Subscription group | `Can You Geo Pro` | `Can You Geo Pro` |
| Product ID | `com.canyougeo.pro.monthly` | `com.canyougeo.pro.annual` |
| Reference name | `Can You Geo Pro Monthly` | `Can You Geo Pro Annual` |
| Display name | `Can You Geo Pro Monthly` | `Can You Geo Pro Annual` |
| Description | `Monthly access to Can You Geo Pro.` | `Annual access to Can You Geo Pro.` |
| Duration | 1 month | 1 year |
| Price in local StoreKit config | USD 3.99 | USD 29.99 |
| Family Sharing | Disabled | Disabled |
| Trials/offers | None | None |

Submission rules and notes:

- Submit the first auto-renewable subscriptions together with a new iOS app version. Do not click Add for Review until the final production-configured build and metadata are ready.
- The new subscription group must be submitted with at least one subscription; submit both monthly and annual plans with the first app version so the live app's two-plan UI matches reviewed products.
- Keep free trials, introductory offers, promotional offers, win-back offers, and Family Sharing disabled unless a later approved checkpoint changes the product plan.
- Upload the required private App Review screenshot for each subscription. This screenshot is for review only and is not one of the public product-page screenshots.
- The private review screenshot should show the real native Apple purchase section with monthly and annual localized price-bearing controls plus Restore Purchases. Do not include a real user email, private account state, transaction IDs, subscription tokens, or payment details.

## 7. Screenshot Plan

Current app target is iPhone-only. Apple allows one to ten screenshots in `.jpeg`, `.jpg`, or `.png`; images must not contain alpha channels or transparency. Apple can scale from higher-resolution screenshots when the interface is the same across device sizes and localizations.

### Current iPhone Screenshot Dimensions

| Display class | Accepted portrait sizes | Accepted landscape sizes | Requirement or scaling note |
| --- | --- | --- | --- |
| 6.9 inch | 1260 x 2736, 1290 x 2796, 1320 x 2868 | 2736 x 1260, 2796 x 1290, 2868 x 1320 | Recommended source set for first submission. |
| 6.5 inch | 1284 x 2778, 1242 x 2688 | 2778 x 1284, 2688 x 1242 | Required if 6.9 inch screenshots are not provided; otherwise Apple can scale. |
| 6.3 inch | 1179 x 2556, 1206 x 2622 | 2556 x 1179, 2622 x 1206 | Apple can scale from 6.5 inch if omitted. |
| 6.1 inch | 1170 x 2532, 1125 x 2436, 1080 x 2340 | 2532 x 1170, 2436 x 1125, 2340 x 1080 | Apple can scale from 6.5 inch if omitted. |
| 5.5 inch | 1242 x 2208 | 2208 x 1242 | Apple can scale from 6.1 inch if omitted. |
| 4.7 inch | 750 x 1334 | 1334 x 750 | Apple can scale from 5.5 inch if omitted. |
| 4 inch | 640 x 1096 without status bar, 640 x 1136 with status bar | 1136 x 600 without status bar, 1136 x 640 with status bar | Apple can scale from 4.7 inch if omitted. |
| 3.5 inch | 640 x 920 without status bar, 640 x 960 with status bar | 960 x 600 without status bar, 960 x 640 with status bar | Apple can scale from 4 inch if omitted. |

Recommended production set:

- Capture and design one complete 6.9 inch iPhone portrait source set at `1320 x 2868`.
- Keep every image based on real app screens from the final production-configured build.
- Use real gameplay captures and real UI state. Do not fabricate scores, countries, prices, rankings, maps, payment sheets, or unsupported Pro features.
- Use concise overlay copy only to clarify the screen. Per Apple guidelines, screenshots should show the app in use, not just title art, login, or splash screens.
- For landscape gameplay, capture the actual landscape game screen and place it inside a portrait marketing frame only if the embedded screen remains an honest, readable capture of the app. Do not invent extra controls around it. Alternatively, provide separate landscape screenshots at an accepted 6.9 inch landscape size.
- Keep the private subscription-review screenshot separate from public screenshots.

### Public Screenshot Sequence

| Order | Screen | Content plan |
| --- | --- | --- |
| 1 | Game library or home | Show Can You Geo branding and the three-game collection. |
| 2 | Mystery Map sample | Show an actual unlabeled choropleth map and the guessing premise. |
| 3 | Mystery Map clue flow | Show real clue/spend UI and answer-entry state without revealing private account data. |
| 4 | Pattern Atlas | Show highlighted countries and the pattern-solving surface. |
| 5 | Order Atlas | Show country cards and ordering interaction. |
| 6 | Account or stats | Show signed-in Free progress/stats with fictional reviewer-safe data only. |
| 7 | Pro library boundary | Show supported Pro unlock areas without showing a purchase confirmation sheet. |
| 8 | Native Apple purchase section | Show monthly/annual localized prices only after products are live and captured from the real app; include Restore Purchases. |
| 9 | Support/legal trust surface | Optional. Show Support, Privacy, Terms, or Account Deletion only if a trust screenshot helps the first release. |
| 10 | Optional strongest gameplay moment | Reserve for a polished real gameplay capture if the first eight do not cover the core experience. |

Private App Review subscription screenshot:

- Capture the real iOS native Apple purchase area in the final build.
- Show both subscription options and Restore Purchases.
- Exclude real account emails, reviewer credentials, transaction identifiers, debug logs, and payment information.
- Do not reuse this private review screenshot as a public marketing screenshot unless it is also polished, user-safe, and accurate.

## 8. Optional App Preview Recommendation

Recommendation: defer App Preview for the first App Store submission.

Rationale:

- Apple treats previews as videos of the app itself and they appear before screenshots.
- A polished preview would be useful later, but first release risk is lower with accurate screenshots, complete metadata, and tested purchase/review notes.
- Can You Geo's core loops are understandable from screenshots, and the current launch work still needs final production-configured TestFlight regression before any public release.

If a later checkpoint adds an App Preview, use only real captured gameplay:

- 5 seconds: Can You Geo game library.
- 8 seconds: Mystery Map map reading and clue spend.
- 6 seconds: Pattern Atlas highlighted-countries solve.
- 6 seconds: Order Atlas card ordering.
- 3 seconds: account-safe Pro/Restore boundary.

Keep the video between 15 and 30 seconds, no fake UI, no unsupported features, no prices unless captured from real localized StoreKit UI.

## 9. Manual Compliance Checklist

| Item | Status for submission planning | Manual action |
| --- | --- | --- |
| Paid Apps Agreement | Required before paid subscriptions | Confirm Active in App Store Connect. |
| Banking and tax | Required before paid subscriptions | Confirm complete for the seller account. |
| EU trader status and verification | Required if applicable | Decide trader/non-trader status and complete Apple-required verification before release. |
| Export compliance | Source records non-exempt encryption as false | Confirm during submission and keep `ITSAppUsesNonExemptEncryption` Boolean false unless cryptography posture changes. |
| App Privacy | Worksheet prepared here | Enter answers in App Store Connect and update if final privacy report or dependencies differ. |
| Age rating | Worksheet prepared here | Complete Apple's questionnaire honestly from the current app behavior. |
| Content rights | Required | Confirm rights for Can You Geo branding, map assets, screenshots, game data presentation, and any marketing overlays. |
| Subscriptions ready | Not yet submission-ready until final App Store Connect product status allows review | Confirm group/products, metadata, prices, availability, review screenshots, and sandbox/TestFlight validation. |
| Account deletion | Public route exists | Verify `https://canyougeo.com/account-deletion/` before final submission. |
| Support contact | Public route exists | Verify `https://canyougeo.com/support/` and `support@canyougeo.com` routing before final submission. |
| Final build selected | Not yet | Use the production-configured release candidate after final TestFlight regression. |
| Release method | Manual release recommended | Use manual/controlled release after approval so launch can wait for final operational readiness. |

## 10. Final Submission Order

1. Build a production-configured iOS release candidate from a protected commit.
2. Run final TestFlight regression: launch, splash, all three games, sign-in, restore, Apple sandbox purchase, cancellation/expiration where possible, account deletion link, Privacy/Terms/Support links, Universal Links, offline/reconnect, and no Stripe checkout in native iOS.
3. Select the final build in the iOS app version.
4. Attach the first `Can You Geo Pro` subscriptions and subscription group to the same app-version submission.
5. Complete App Information, pricing/availability, age rating, App Privacy, content rights, review notes, support/privacy/legal URLs, screenshots, and subscription review screenshots.
6. Submit the app version and first subscriptions as one reviewed package.
7. Use manual release after approval unless an explicit launch decision approves automatic release.

## Remaining Manual Fields Before App Review

- Exact developer legal name for the copyright field.
- Existing App Store Connect SKU, if already created.
- Review contact name, phone, and email.
- Reviewer Free account credentials, entered only in App Store Connect.
- Sandbox subscription review setup and private screenshots.
- Final App Store Connect age-rating calculation.
- Final App Privacy entries after the production-configured privacy report/build audit.
- EU trader status, banking, tax, paid-app agreement, and regional compliance confirmations.
