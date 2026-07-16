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
- Checkpoint 4H-5A physical-device frame-by-frame recording failed the launch-screen visual check: the app showed a brief dark/black launch frame with no visible approved artwork.
- Checkpoint 4H-5B diagnosis: the built `Info.plist` registered `UILaunchStoryboardName = LaunchScreen`, the compiled app contained `Base.lproj/LaunchScreen.storyboardc`, and the compiled `Assets.car` contained opaque `Splash` renditions. The launch artwork PNGs were valid RGB images and were not blank, corrupt, transparent, or almost entirely dark.
- The operating-system launch storyboard alone was not reliably visible on physical device; the compiled asset placement was not the problem. The root `UIImageView` hierarchy was corrected to a conventional root `UIView` with a child `UIImageView`, but that did not by itself produce visible branded launch artwork during observed startup.
- `LaunchScreen.storyboard` uses `scaleAspectFit` and remains as the immediate static dark-navy launch transition. It uses a conventional root `UIView` with a child `UIImageView`; the root view owns the dark navy background, and the child image view uses `image = Splash`, `scaleAspectFit`, and edge constraints to the root view.
- The official Capacitor Splash Screen plugin is installed and configured from `capacitor.config.ts` to show the approved full-logo `Splash` asset for approximately one second during startup. It uses background color `#000211`, hides automatically, and does not show a spinner.
- No spinner is shown.
- Checkpoint 4H-5C physical iPhone 14 visual check passed: the approved full globe plus `Can You Geo?` splash artwork appeared correctly, remained visible for approximately one second, and then the app continued into the application normally.
- Compiled asset validation command: `xcrun assetutil --info /path/to/App.app/Assets.car | rg -n 'Name|RenditionName|Splash|splash' -C 3`.
- Compiled storyboard validation checks that `LaunchScreen.storyboardc` is present and that the compiled nib strings resolve the `Splash` image name.
- Do not add AppDelegate sleeps, debugger-only launch delays, or temporary storyboard probes for inspection. The only committed visible launch-branding duration is the official Capacitor Splash Screen plugin configuration.
- Checkpoint 4H-5B simulator visual validation remains blocked: `simctl launch`, `simctl launch --wait-for-debugger`, LLDB breakpoint capture, and normal launch recording did not reliably expose the launch storyboard. A temporary red-background probe also captured black/gray/white transition frames, so no simulator visual pass is recorded yet.
- Any temporary diagnostic launch delay, breakpoint, direct bundle-resource probe, or red-background probe used to inspect the launch screen is local-only and must not be part of the committed application.
- Physical-device visual approval of the new Capacitor splash was received before this checkpoint was committed.
- Frame-by-frame screen recording is the recommended inspection method for the launch screen on physical devices.
- The first App Store Connect upload and internal TestFlight setup are recorded below in the release archive section.

## Physical iPhone 14 QA

Checkpoint 4H-6 physical iPhone 14 QA passed for Can You Geo `1.0.0 (1)`.

- App icon: Home Screen showed the approved globe-only icon with no wordmark inside the icon. The icon was centered, sharp, unclipped, and had no white or transparent corners. The app label was correct. App Library/Search showed the same correct icon.
- Launch branding: the previously confirmed full globe plus `Can You Geo?` splash result remained passed. The full-logo splash appeared correctly for approximately one second, showed no spinner, showed no Capacitor logo, and continued into the app normally. The launch screen also had no white flash, no clipping or stretching, and passed in portrait, landscape left, and landscape right.
- Runtime and navigation: the expected Can You Geo production app shell opened with no local development URL, Capacitor placeholder, blank screen, or crash. The Play hub opened, at least one sample or preview game opened, gameplay remained usable in landscape, portrait navigation/account surfaces remained usable, nothing was hidden by the notch/status bar/home indicator, and no broken layout or unexpected scrolling appeared.
- Lifecycle: cold relaunch, warm relaunch, background/foreground, and app-switch return all passed without a blank or frozen screen.
- Universal Links: a normal non-sensitive `canyougeo.com` link opened the installed app, routed safely to the expected location, and did not show a blank screen or redirect loop.
- Authentication recovery: the established approved QA procedure passed. The recovery link opened the installed app, the intended reset/recovery route was reached, and no blank screen or redirect loop occurred. Do not record the QA email, password, callback URL, token, code, user id, or session values.
- Additional defects or observations: none.
- Not checked in this checkpoint: none of the requested physical iPhone 14 QA items were left untested.
- At the time of Checkpoint 4H-6, no archive, IPA export, TestFlight upload, App Store action, version/build change, signing change, PR, merge, deployment, or Android change had occurred.

## Release Archive And App Store Export

Checkpoint 4H-7 created the first local Release archive on 2026-07-16 UTC for Can You Geo `1.0.0 (1)`. The archive used configuration `Release`, bundle ID `com.canyougeo.app`, Team ID `G5N5U6QFS8`, iPhone-only device family, portrait/landscape-left/landscape-right orientations, and `applinks:canyougeo.com`.

- Raw archive result: `ARCHIVE SUCCEEDED`. The `.xcarchive` was stored outside the repository under `/private/tmp/` and was not committed.
- Raw archive signing classification: Apple Development signing with an iOS Team Provisioning Profile. The raw archived app had `get-task-allow = true`, so the raw archive was not itself TestFlight/App Store distribution-signed.
- App Store export result: `EXPORT SUCCEEDED` using Xcode `method = app-store-connect`, `destination = export`, automatic signing, Team ID `G5N5U6QFS8`, `uploadSymbols = true`, and `manageAppVersionAndBuildNumber = false`.
- App Store export signing classification: the exported IPA was re-signed as Apple Distribution with an iOS Team Store Provisioning Profile for `com.canyougeo.app`.
- Exported entitlements: `application-identifier = G5N5U6QFS8.com.canyougeo.app`, `com.apple.developer.team-identifier = G5N5U6QFS8`, `com.apple.developer.associated-domains = [applinks:canyougeo.com]`, `beta-reports-active = true`, and `get-task-allow = false`.
- Strict code-sign verification passed for the exported app.
- Exported bundle inspection passed: the approved AppIcon and Splash assets were present in `Assets.car`, `LaunchScreen.storyboardc` was present, `SplashScreenPlugin` was included, and the Splash Screen configuration remained `launchShowDuration = 1000`, `launchAutoHide = true`, `backgroundColor = #000211`, and `showSpinner = false`.
- Static bundle inspection passed: the exported app included the bundled native static app, active `capacitor.config.json` had no `server` block, and no active localhost, live-reload, `127.0.0.1`, or `test.canyougeo.com` server dependency was present.
- dSYM/symbol output was present in the Release archive/export.
- The project-level `CODE_SIGN_IDENTITY = "iPhone Developer"` setting remained effective for the Release archive but did not block the App Store export from re-signing the app correctly. No source signing correction was required for this checkpoint.
- The exported IPA was stored outside the repository under `/private/tmp/` and was not committed.
- At the time of Checkpoint 4H-7A, no IPA upload, TestFlight upload, App Store Connect action, version/build change, signing-setting change, certificate revocation, PR, merge, deployment, Android change, or unrelated change had occurred.

## App Store Connect Upload And Internal TestFlight

Checkpoint 4H-8 uploaded the already-validated Can You Geo iOS build to App Store Connect on 2026-07-16 UTC.

- Uploaded version/build: `1.0.0 (1)`.
- Bundle ID: `com.canyougeo.app`.
- App Store Connect record: `Can You Geo`, Apple ID `6791248782`.
- Upload method: Xcode `xcodebuild -exportArchive` from the validated `.xcarchive` using `method = app-store-connect`, `destination = upload`, automatic signing, Team ID `G5N5U6QFS8`, `uploadSymbols = true`, and `manageAppVersionAndBuildNumber = false`.
- Upload result: `UPLOAD SUCCEEDED with no errors`.
- Delivery UUID: `76cb94d0-f321-4eb1-9fce-53b6a1b68452`.
- Uploaded date reported by Apple: 2026-07-15 at 6:40:58 PM Pacific time.
- Upload warnings/errors: none reported by App Store Connect or Xcode's ContentDelivery log.
- Initial Apple processing state after upload: `PROCESSING`.
- Processing result: build `1.0.0 (1)` appeared under iOS TestFlight, then required export-compliance completion.
- Export-compliance question answered: "What type of encryption algorithms does your app implement?"
- Export-compliance classification: `None of the algorithms mentioned above`.
- Export-compliance note: the app uses ordinary platform/browser HTTPS/TLS networking and does not implement proprietary encryption algorithms or independent standard crypto algorithms. Revisit this answer if app encryption behavior changes.
- Build status after compliance and group setup: `Ready to Test`, expiring in 90 days.
- Internal group: `Can You Geo Internal QA`.
- Automatic distribution for the internal group: disabled before group creation.
- Build group result: build `1.0.0 (1)` was added to `Can You Geo Internal QA`.
- Test information entered in "What to Test": first native iOS TestFlight build validation for launch branding, sign-in/session persistence, portrait navigation, landscape gameplay, Mystery Map, Pattern Atlas, Order Atlas sample flow, Universal Links, password recovery, offline recovery, and background/foreground behavior. Purchases and subscription management are intentionally unavailable in this native preview.
- Account-holder tester result: the eligible account-holder internal tester was added to the internal group and shown as `Invited`.
- No external testers, public TestFlight link, Beta App Review submission, App Review submission, public release, pricing change, In-App Purchase/subscription configuration, version/build change, signing change, PR, merge, deployment, Android change, or unrelated change occurred.
- Do not record Apple credentials, authentication tokens, private account information, tester email addresses, private invitation links, certificate material, provisioning-profile contents, IPA files, archives, upload options, or upload logs in the repository.

## TestFlight-Installed Physical iPhone 14 Smoke

Checkpoint 4H-9 validated the Apple-processed TestFlight build on the physical iPhone 14. This was not an Xcode-installed Debug build.

- Installation source: TestFlight.
- TestFlight version/build: `1.0.0 (1)`.
- Installation prerequisites: the previous Xcode development app was removed, the app was installed through TestFlight, TestFlight displayed version `1.0.0 (1)`, and the app launched without Xcode or a debugger attached.
- Installation and branding: passed. The approved globe-only Home Screen icon appeared, the full globe plus `Can You Geo?` splash appeared for approximately one second, no Capacitor logo or spinner appeared, no white flash, clipping, or stretching appeared, and the app opened into the expected production Can You Geo shell.
- Account and session: passed for sign-in, correct account/plan loading, session preservation after closing and reopening, and session preservation after backgrounding. Sign-out and sign-back-in were not checked.
- Navigation and orientation: passed. Portrait homepage/navigation, Play hub access, rotation into landscape, rotation back to portrait, safe-area behavior, and rotation stability all passed.
- Game smoke tests: Mystery Map passed, Pattern Atlas passed, and Order Atlas sample flow passed. Each game opened, at least one round could be played, landscape gameplay was usable, a result or solved state appeared correctly, and returning to the Play hub worked.
- Native release boundaries: passed. Checkout and subscription-management actions were unavailable as designed, no Stripe checkout opened inside the native app, no development server or localhost page appeared, official external links opened through the intended browser behavior, and internal Can You Geo navigation stayed inside the app where intended.
- Universal Links: passed. A normal non-sensitive `canyougeo.com` Universal Link opened the TestFlight app, routed correctly, and did not show a blank screen or redirect loop.
- Authentication recovery: not checked in this TestFlight smoke. Do not infer recovery-link behavior for the TestFlight build until a fresh recovery message is tested.
- Lifecycle and connectivity: passed. Cold relaunch, warm relaunch, background/foreground, app-switch return, offline behavior, recovery after reconnecting, and no-crash checks all passed.
- Additional defects or observations: none.
- No external testing, public TestFlight link, Beta App Review submission, App Review submission, public release, pricing change, In-App Purchase/subscription configuration, version/build change, signing change, PR, merge, deployment, Android change, or unrelated change occurred.
- Do not record TestFlight invitation links, tester email addresses, account credentials, password-recovery URLs, tokens, one-time codes, user IDs, session values, screenshots, logs, IPA files, or archives in the repository.

Remaining release/configuration work:

- Apple In-App Purchase.
- TestFlight-installed authentication-recovery QA with a fresh recovery message.
- App Store submission, only after explicit approval.
- Additional physical-device coverage beyond the iPhone 14 if desired before release.
- iPad UI and metadata decision if universal iPad support is desired later.
- Optional future push notifications.
- Optional future native sharing.
- Performance profiling and remaining device-specific warnings.
