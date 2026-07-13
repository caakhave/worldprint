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

## Deferred Work

- Apple In-App Purchase
- Authentication redirects and deep links
- Password recovery, email confirmation, and challenge link handling in native routes
- Push notifications
- Native sharing
- Production app icons and splash screen
- Physical-device testing
- App Store signing, provisioning, TestFlight, and submission
- Android implementation
