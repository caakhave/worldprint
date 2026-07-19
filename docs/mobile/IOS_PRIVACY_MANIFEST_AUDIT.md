# Can You Geo iOS Privacy Manifest Audit

Checkpoint 5D-1G audits the native iOS app at staging commit `78f2ef34f8133cb4fc7e9dd5210276840a6db69c`. It records the app-level privacy manifest decision, third-party manifest coverage, Required Reason API review, native tracking-domain review, and the App Store Connect App Privacy worksheet. This checkpoint does not change versions, archive, upload, mutate App Store Connect, initiate purchases, or touch Supabase or Stripe data.

## Result

- Application target manifest: required and added at `ios/App/App/PrivacyInfo.xcprivacy`.
- Tracking: `No`.
- Tracking domains: none declared for the application target.
- Required Reason APIs: none found in app target code, first-party Swift plugin code, synchronized WebView bundle strings, or bundled native framework strings.
- App target data collection declarations: account email, user id, gameplay content, purchase history, customer support, and other diagnostic data, all linked to the user where applicable and not used for tracking.
- Release-style validation build: `xcodebuild` processed privacy manifests and placed the app manifest at the app bundle root.

## Audited Native Surfaces

| Surface | Files or package | Audit result |
| --- | --- | --- |
| App lifecycle and bridge | `ios/App/App/AppDelegate.swift`, `ios/App/App/ViewController.swift` | Standard Capacitor lifecycle and plugin registration. No file timestamp, disk-space, boot-time, UserDefaults, pasteboard-read, device identifier, advertising, analytics, or tracking API use found. |
| StoreKit 2 bridge | `ios/App/App/AppleStoreKitPlugin.swift` | Uses StoreKit products, purchase, restore, transaction observation, subscription management, and authenticated Supabase verification. It transmits signed transaction material only to staging server functions and does not expose raw transaction details to JavaScript. |
| Secure auth storage | `src/lib/supabase/nativeAuthStorage.ts`, `@aparajita/capacitor-secure-storage`, `KeychainSwift` | Native auth storage uses the iOS Keychain with this-device-only accessibility. No UserDefaults fallback is configured for native auth tokens. |
| Supabase auth and gameplay sync | `src/lib/supabase/client.ts`, account/game sync modules | Signed-in sessions transmit account identifiers, email where provided by Supabase Auth, gameplay progress/stats, entitlement reads, and support/deletion request context through Supabase APIs. |
| WebView storage | Capacitor WebView and browser JavaScript | Guest gameplay and UI state can use local browser storage. Signed-in auth tokens are directed to secure native storage. WebView storage APIs are not Apple Required Reason APIs. |
| Clipboard and pasteboard | `src/features/account/AccountStatusClient.tsx` | The support-id copy action writes user-initiated text to the clipboard. No pasteboard read or polling path was found. |
| Analytics and marketing loaders | `src/lib/site/analytics.ts`, `src/components/AnalyticsScripts.tsx`, `src/components/MarketingConsentManager.tsx` | Native builds disable analytics and marketing-consent UI through `NEXT_PUBLIC_CGY_NATIVE_APP=1`. No Google Tag Manager, Google Analytics, Meta, Reddit, or TikTok tracking loader was found in the native static bundle. |
| Native external navigation | Capacitor Browser plugin and trusted-link routing | User-initiated social/support/legal links can open outside the WebView. Social profile URLs are content links, not app tracking domains. |
| Diagnostics | app/backend request handling and support channels | No native crash or performance SDK is bundled. Operational request logs and support-provided troubleshooting details are represented as other diagnostic data for App Store Connect disclosure. |

## Third-Party Privacy Manifests

| Dependency | Version or source | Manifest status in audit | Notes |
| --- | --- | --- | --- |
| Capacitor iOS | `@capacitor/ios` `8.4.1` | Bundled in final app as `Capacitor.framework/PrivacyInfo.xcprivacy` | Declares no collected data, no tracking, no tracking domains, and no Required Reason API use. |
| Capacitor Cordova compatibility | `@capacitor/ios` `8.4.1` | Bundled in final app as `Cordova.framework/PrivacyInfo.xcprivacy` | Declares no collected data, no tracking, no tracking domains, and no Required Reason API use. |
| KeychainSwift | Swift Package `21.0.0` | Source package includes `Sources/PrivacyInfo.xcprivacy` | Used by secure storage for Keychain operations. No app-level Required Reason API declaration is needed for Keychain use. |
| Capacitor App, Browser, Splash Screen | local Swift package products from Capacitor plugins | No separate final bundle manifest found | Reviewed for required-reason, pasteboard, identifier, analytics, advertising, and tracking behavior. No additional declaration was justified. |
| Aparajita Capacitor Secure Storage | local Swift package product | No separate final bundle manifest found | Reviewed alongside KeychainSwift. It stores auth material in Keychain and does not collect data for its own tracking or analytics. |

## Required Reason API Review

| Apple category | App target result | Manifest action |
| --- | --- | --- |
| File timestamps | No first-party native API use found for file metadata timestamps. | No `NSPrivacyAccessedAPITypes` entry. |
| System boot time | No first-party native API use found for system uptime or boot time. | No `NSPrivacyAccessedAPITypes` entry. |
| Disk space | No first-party native API use found for disk-space inspection. | No `NSPrivacyAccessedAPITypes` entry. |
| Active keyboards | No first-party native API use found for active keyboard enumeration. | No `NSPrivacyAccessedAPITypes` entry. |
| UserDefaults | No first-party native `UserDefaults` use found. Native auth storage is Keychain-backed. | No `NSPrivacyAccessedAPITypes` entry. |

## Network And Tracking-Domain Review

Native app functionality can contact Can You Geo web origins, staging Supabase Edge Functions and APIs for authenticated staging builds, and Apple StoreKit/App Store services through StoreKit. User-initiated support, legal, privacy, and social links may open in the system browser.

No native advertising SDK, tracking SDK, analytics SDK, IDFA use, IDFV use, cross-app tracking declaration, tracking domain, or tracking-domain manifest entry was found. The application manifest therefore sets `NSPrivacyTracking` to Boolean `false` and does not declare `NSPrivacyTrackingDomains`.

## App Store Connect App Privacy Worksheet

| Source behavior | Privacy manifest | App Store Connect App Privacy Answer |
| --- | --- | --- |
| Supabase Auth account email, challenge recipient email, support/account-deletion email context, and optional Can You Geo update emails | `NSPrivacyCollectedDataTypeEmailAddress`; linked: true; tracking: false; purposes: app functionality and developer advertising | Disclose Email Address. Linked to user. Not used for tracking. Used for account functionality, support/developer communications, and optional developer marketing emails when the user opts in. |
| Supabase Auth user id, support id, entitlement ownership, Apple app account token binding, and account-scoped server verification | `NSPrivacyCollectedDataTypeUserID`; linked: true; tracking: false; purpose: app functionality | Disclose User ID. Linked to user. Not used for tracking. Used for authentication, support, entitlement ownership, and purchase verification. |
| Daily progress, saved runs, game results, streaks, stats, archive/practice progress, and challenge participation | `NSPrivacyCollectedDataTypeGameplayContent`; linked: true; tracking: false; purpose: app functionality | Disclose Gameplay Content. Linked to user for signed-in sync. Not used for tracking. Used for app functionality. Guest-only local play is not transmitted until a signed-in sync path applies. |
| Apple and Google subscription state, entitlement status, product id, renewal/cancellation state, and provider verification records | `NSPrivacyCollectedDataTypePurchaseHistory`; linked: true; tracking: false; purpose: app functionality | Disclose Purchase History. Linked to user. Not used for tracking. Used to provide and restore Pro access. Payment card details are handled by Apple or Google and are not collected by Can You Geo. |
| Support messages, feedback, account deletion requests, challenge invite message length/delivery metadata, and troubleshooting context sent to support | `NSPrivacyCollectedDataTypeCustomerSupport`; linked: true; tracking: false; purpose: app functionality | Disclose Customer Support. Linked to user when a signed-in account or email address is included. Not used for tracking. Used for support, account deletion, and service communications. |
| Operational request logs, security diagnostics, backend error context, and user-submitted troubleshooting details | `NSPrivacyCollectedDataTypeOtherDiagnosticData`; linked: true where tied to an account/session; tracking: false; purpose: app functionality | Disclose Other Diagnostic Data. Not used for tracking. Used to keep account, subscription, support, and service availability working. No native crash analytics or performance analytics SDK is bundled. |

Categories not supported by the audited native behavior:

- Payment Information: Can You Geo does not collect card or payment instrument details in the iOS app.
- Device ID or Advertising Data: no IDFA, IDFV, advertising SDK, or device identifier collection was found.
- Product Interaction analytics: native analytics delivery is disabled and gameplay telemetry is represented as gameplay content rather than analytics.
- Crash Data and Performance Data: no native crash-reporting or performance SDK is bundled. User-submitted support diagnostics are covered by customer support and other diagnostic data.
- Location: no precise or coarse location collection was found.

## Validation Checklist

- `plutil -lint ios/App/App/PrivacyInfo.xcprivacy`
- `pnpm mobile:sync:ios`
- Release-style Xcode build with signing disabled for local audit only.
- Inspect `App.app/PrivacyInfo.xcprivacy` in the Release-style build output.
- Inspect bundled third-party framework manifests.
- Run the focused privacy-manifest test, iOS platform tests, lint, typecheck, build, and `git diff --check`.

## Boundaries

This checkpoint did not create App Store Connect App Privacy answers, change StoreKit products, initiate purchases, create a build number, archive, upload, mutate Supabase, mutate Stripe, configure production notifications, or change Android.
