# Can You Geo iOS Capacitor POC

This proof of concept packages the existing static-export Next.js app in a Capacitor iOS shell. The native app bundles the local `out/` export and must not point Capacitor at a remote server URL for production-style testing.

## Project

- Branch: `codex/capacitor-ios-poc`
- Starting commit: `140b79bb19f26de43df9ed1e465c3bff251a8901`
- App name: `Can You Geo`
- Bundle ID: `com.canyougeo.app`
- Capacitor packages: `8.4.1`
- iOS dependency manager: Swift Package Manager
- Native project: `ios/App/App.xcodeproj`
- Scheme: `App`
- Web directory: `out`

## Signing

- App name: `Can You Geo`
- Bundle ID: `com.canyougeo.app`
- Apple Team ID: `G5N5U6QFS8`
- App Store Connect Apple ID: `6791248782`
- Marketing version: `1.0.0`
- Build number: `1`
- Signing style: Xcode-managed Automatic signing for Debug and Release.
- Associated Domains entitlement: `applinks:canyougeo.com`.
- Provisioning remains Xcode-managed. Do not commit provisioning profiles, certificates, signing private keys, device UDIDs, Apple Account credentials, or local keychain details.
- Physical iPhone 14 development install and launch passed after Apple Developer membership activation and automatic signing setup.
- The first TestFlight prep target is iPhone-only. Portrait, landscape left, and landscape right remain enabled because the app has portrait account/navigation surfaces and landscape gameplay surfaces.

## Architecture

The web app remains the source of truth. `pnpm build:native` runs the Next.js static export with `NEXT_PUBLIC_CGY_NATIVE_APP=1`, which marks the build as native and writes the static app into `out/`. `pnpm mobile:sync:ios` copies that export into the Capacitor iOS project for local simulator builds.

The source-controlled iOS project is committed, but generated runtime artifacts are intentionally ignored, including copied web assets under `ios/App/App/public/`, generated Capacitor config files inside the iOS app bundle, DerivedData, Cordova plugin output, user workspace state, screenshots, and logs.

## Commands

```bash
pnpm build:native
pnpm mobile:sync:ios
pnpm mobile:open:ios
```

To build and run the current simulator target without changing project configuration:

```bash
xcrun simctl boot "iPhone 17 Pro"
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug -destination 'platform=iOS Simulator,name=iPhone 17 Pro,OS=26.5' build
xcrun simctl install booted ~/Library/Developer/Xcode/DerivedData/App-*/Build/Products/Debug-iphonesimulator/App.app
xcrun simctl launch booted com.canyougeo.app
```

## Native Behavior

- Analytics and GTM are disabled for native builds through the shared build-target helper.
- Marketing consent UI and consent events are suppressed in native builds.
- Stripe checkout and customer portal actions are unavailable in the native preview.
- Existing Pro entitlements can still be read by the web app, but purchase and subscription management must be replaced before App Store release.
- Official social links open through Capacitor Browser after strict trusted-destination validation. Internal Can You Geo routes stay inside the WebView.
- Native offline handling uses `navigator.onLine`, browser connectivity events, and a short native-only HTTPS reachability probe when the WebView still reports online. It shows a small offline status, fails account actions quickly, preserves durable sessions, and retries sync after reconnect. Isolated iOS simulator offline runtime testing remains deferred unless it can be done without unsafe system-wide network changes.
- iOS Associated Domains is configured only for the production apex host: `applinks:canyougeo.com`. The website association file is `https://canyougeo.com/.well-known/apple-app-site-association` and uses the application identifier `G5N5U6QFS8.com.canyougeo.app`.
- The root layout marks native builds with `cgy-native-app` and enables `viewport-fit=cover`.
- Safe-area CSS variables use `env(safe-area-inset-*)` for header/footer padding and iPhone compact-header adjustments.
- Mystery Map and Pattern Atlas moment overlays are centered in the visible native landscape viewport.

## Validated Scope

- Homepage launches in the iPhone 17 Pro simulator and renders Can You Geo branding.
- Mystery Map sample flow launches, shows miss/solve overlays, and centers the native landscape result moments.
- Pattern Atlas sample flow launches and centers the native landscape solved moment.
- Order Atlas remains outside the shared Mystery Map / Pattern Atlas overlay change.
- No Android project is part of this POC.

Most recent checkpoint validation recorded:

- Full tests: 575 passed
- Ordinary web build: passed
- Native build: passed
- Capacitor iOS sync: passed
- Xcode iPhone 17 Pro simulator build: `BUILD SUCCEEDED`
- Manual iPhone 17 Pro QA: passed
- Release guardrails are documented in `docs/mobile/NATIVE_RELEASE_GUARDRAILS.md`.

## Deferred Work

The app-side/runtime foundations are now in place and covered by focused unit and native black-box checks:

- Native authentication callbacks, password recovery, and email confirmation route through the hosted `https://canyougeo.com/auth/callback` origin.
- Strict native deep-link intake handles supported public Can You Geo routes, including challenge links, without logging sensitive callback values.
- Durable native Supabase session storage is implemented for iOS and Android.
- Native release guardrails cover trusted external social links, internal WebView navigation, mobile billing boundaries, marketing-consent absence, and safe-area handling.
- Paid-team automatic development signing is configured for `com.canyougeo.app`, and a physical iPhone 14 development install and launch has passed.
- The iOS Universal Link app-side foundation is source controlled: Debug and Release use `ios/App/App/App.entitlements`, and the AASA file uses a strict route allowlist for current public, game, auth, callback, challenge, upgrade, and account destinations.
- Production AASA is live and verified as HTTP `200` JSON with no redirect.
- A fresh physical iPhone 14 development install after AASA deployment verified cold and warm public Universal Links opening the installed app.
- Tokenless `/auth/callback/` Universal Link routing opened safely.
- A real password-recovery email callback for an approved confirmed production QA account opened the installed app, reached reset-password, changed the password, and the new password worked. Do not record the QA account email, password, callback URL, token, or user id.

## Release Metadata Audit

- `MARKETING_VERSION` is `1.0.0` for Debug and Release.
- `CURRENT_PROJECT_VERSION` is `1` for Debug and Release.
- `PRODUCT_BUNDLE_IDENTIFIER` remains `com.canyougeo.app`.
- `DEVELOPMENT_TEAM` remains `G5N5U6QFS8`.
- `CODE_SIGN_STYLE` remains `Automatic`.
- `CODE_SIGN_ENTITLEMENTS` remains `App/App.entitlements`.
- Associated Domains remains limited to `applinks:canyougeo.com`.
- `TARGETED_DEVICE_FAMILY` is iPhone-only for this first TestFlight prep. iPad support should be a separate checkpoint after iPad UI review and App Store metadata decisions.
- `UISupportedInterfaceOrientations` supports portrait, landscape left, and landscape right. Portrait is required for public/account flows; landscape is required for Mystery Map and Pattern Atlas gameplay. Upside-down is not enabled.

## Icon And Launch Audit

- The approved globe-only image is the iOS app icon.
- The approved full globe-plus-wordmark image is the launch-screen artwork.
- The earlier `public/favicon.svg` source was incorrect and has been replaced for iOS native branding. Do not use the web favicon as the iOS app icon or launch-screen source.
- Checked-in approved source assets:
  - `assets/mobile/ios/source/app-icon.png`: 1024 x 1024 RGB PNG, no alpha, SHA-256 `aa6cc894b2f5bf615f5f502bc300a6e0d4f74cbbe088610c1e8535cd9d001858`.
  - `assets/mobile/ios/source/launch-screen.png`: 1254 x 1254 RGB PNG, no alpha, SHA-256 `fee1b9c2ee67fb061839ca62b35f060e990e386a67c86f762dcfcae7a917835a`.
  - `assets/mobile/ios/source/launch-screen-2732.png`: 2732 x 2732 RGB PNG prepared from the approved launch-screen source, no alpha, SHA-256 `d8f6d6fbfae76753f157a17f0fabb5bb2a696a7cbeee981318c0b90fd49c451c`.
- Asset-generation command: `node tools/mobile/generateIosBrandAssets.mjs`.
- Native AppIcon destination: `ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png`.
- Native launch destinations: `ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732-2.png`, `ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732-1.png`, and `ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732.png`.
- Icon validation: the AppIcon output is exactly the approved 1024 x 1024 globe-only RGB PNG with no alpha channel or transparent pixels. It does not add rounded corners, text, cropping, or favicon artwork.
- Launch validation: each launch image output is exactly the approved 2732 x 2732 full-logo RGB PNG with no alpha channel. The globe and `Can You Geo?` wordmark remain present.
- `LaunchScreen.storyboard` uses `scaleAspectFit` so the full square launch artwork remains visible in portrait and landscape. It uses a dark navy background derived from the approved artwork for any unused space.
- The native launch screen may be visible only for a fraction of a second because the app starts quickly. Do not add an artificial splash delay for inspection.
- Frame-by-frame screen recording is the recommended inspection method for the launch screen on physical devices.
- No archive or TestFlight upload has occurred.

Physical-device visual QA still required before the first archive:

- Physical visual QA must be repeated after a clean reinstall because the prior installed development build used the wrong native branding assets.
- Home-screen icon appearance
- App Library icon appearance
- Launch screen in portrait
- Launch screen in landscape left
- Launch screen in landscape right
- No flash of Capacitor branding
- No stretched or clipped logo
- Startup into the expected production app shell
- Existing Universal Link and auth-recovery behavior remains intact

Remaining release/configuration work:

- Apple In-App Purchase.
- TestFlight and App Store submission.
- App Store production signing and release provisioning review.
- TestFlight archive/export/upload after physical-device visual QA passes.
- Broader physical-device testing beyond the iPhone 14 development launch and Universal Link/auth validation.
- iPad UI and metadata decision if universal iPad support is desired later.
- Optional future push notifications.
- Optional future native sharing.
- Performance profiling and remaining device-specific warnings.
