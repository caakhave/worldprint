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
- Signing style: Xcode-managed Automatic signing for Debug and Release.
- Associated Domains entitlement: `applinks:canyougeo.com`.
- Provisioning remains Xcode-managed. Do not commit provisioning profiles, certificates, signing private keys, device UDIDs, Apple Account credentials, or local keychain details.
- Physical iPhone 14 development install and launch passed after Apple Developer membership activation and automatic signing setup.

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

Remaining release/configuration work:

- Apple In-App Purchase.
- TestFlight and App Store submission.
- App Store production signing and release provisioning review.
- Deploy the AASA file to production, wait for CDN/device cache propagation, reinstall the app, and verify real iOS Universal Links on a physical device. Do not claim production Universal Link success before that live test passes.
- Production app icons and splash assets.
- Broader physical-device testing beyond the initial iPhone 14 development launch.
- Optional future push notifications.
- Optional future native sharing.
- Performance profiling and remaining device-specific warnings.
