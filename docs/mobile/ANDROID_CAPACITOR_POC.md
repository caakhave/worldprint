# Can You Geo Android Capacitor POC

This proof of concept packages the existing static-export Next.js app in a Capacitor Android shell. The native app bundles the local `out/` export and must not point Capacitor at a remote server URL for production-style testing.

## Project

- Current Android foundation branch: `codex/android-foundation`
- Checkpoint 5D-1A base: `origin/staging` at `6aba4fb15a5891c5c37949cc55893a95c8dc8c22`
- App name: `Can You Geo`
- Android application ID: `com.canyougeo.app`
- Android namespace: `com.canyougeo.app`
- Capacitor core, CLI, Android, and iOS packages: `8.4.1`
- Capacitor App plugin: `8.1.0`
- Capacitor Splash Screen plugin: `8.0.2`
- Native project: `android/`
- Web directory: `out`
- macOS: `26.5.2`
- Node.js: `24.11.1`
- pnpm: `11.0.9`
- Android Studio: `2025.2.1`
- JDK: `21.0.8`
- Minimum SDK: `24`
- Compile SDK: `36`
- Target SDK: `36`
- Android Gradle Plugin: `8.13.0`
- Gradle: `8.14.3`

## Architecture

The web app remains the source of truth. `pnpm build:native` runs the Next.js static export with `NEXT_PUBLIC_CGY_NATIVE_APP=1`, which marks the build as native and writes the static app into `out/`. `pnpm mobile:sync:android` copies that export into the Capacitor Android project for local emulator and device builds.

The source-controlled Android project is committed, but generated runtime artifacts are intentionally ignored, including copied web assets under `android/app/src/main/assets/`, generated Capacitor XML under `android/app/src/main/res/xml/config.xml`, Gradle caches, build outputs, `android/local.properties`, APK/AAB artifacts, emulator state, screenshots, logs, and user-specific Android Studio state.

The Android application bundles local `out/` assets through Capacitor. It should not use `server.url` or any remote-hosted web app URL for production-style validation, because that would test a remote website inside WebView rather than the packaged native app.

## Commands

Build the native web export:

```bash
pnpm build:native
```

Sync the export into Android:

```bash
pnpm mobile:sync:android
```

Open Android Studio:

```bash
pnpm mobile:open:android
```

Build a local debug APK with the Android Studio JDK and SDK:

```bash
cd android
JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" \
ANDROID_HOME="$HOME/Library/Android/sdk" \
ANDROID_SDK_ROOT="$HOME/Library/Android/sdk" \
GRADLE_USER_HOME="${TMPDIR:-/tmp}/cgy-gradle-home" \
PATH="/Applications/Android Studio.app/Contents/jbr/Contents/Home/bin:$HOME/Library/Android/sdk/platform-tools:$HOME/Library/Android/sdk/emulator:$PATH" \
./gradlew assembleDebug
```

Install and launch the debug APK on a booted emulator:

```bash
adb install --no-streaming -r android/app/build/outputs/apk/debug/app-debug.apk
adb shell monkey -p com.canyougeo.app -c android.intent.category.LAUNCHER 1
```

The validated emulator for Checkpoint 5D-1A was `Medium_Phone_API_36.1` (`emulator-5554`, `sdk_gphone64_arm64`, Android API 36.1 Play Store image).

## Native Behavior

- Analytics and GTM are disabled for native builds through the shared build-target helper.
- Marketing consent UI and consent events are suppressed in native builds.
- Android Capacitor bridge logging is disabled with `android.loggingBehavior = "none"` so plugin call/result payloads, including deep-link callback URLs, are not mirrored into app logcat.
- Stripe checkout and customer portal actions are unavailable in the native preview.
- Existing Pro entitlements can still be read by the web app, but purchase and subscription management must be replaced before Play Store release.
- Official social links open through Capacitor Browser after strict trusted-destination validation. Internal Can You Geo routes stay inside the WebView.
- Trusted social URLs must remain exact. Query strings, fragments, encoded path lookalikes, and redirect-shaped parameters are rejected before Capacitor Browser opens.
- Native offline handling uses `navigator.onLine`, browser connectivity events, and a short native-only HTTPS reachability probe when the Android WebView still reports online. It shows a small offline status, fails account actions quickly, preserves durable sessions, and retries sync after reconnect.
- Android system Back is handled through Capacitor's official App plugin. Internal routes with usable WebView history call `window.history.back()`, while the root route minimizes the app instead of force-closing it.
- Android status and navigation bars are handled as WebView system insets. Current shallow testing found content inset below the top status bar and above the bottom navigation/gesture area without obvious overlap.
- Android native builds add a `cgy-native-android` class to the document root so the web shell applies a conservative top safe-area fallback on Android WebView. This avoids the header overlapping the status bar on API 36 while leaving iOS safe-area handling unchanged.
- The Android launch theme must define `windowSplashScreenBackground`, `windowSplashScreenAnimatedIcon`, and `postSplashScreenTheme` for the AndroidX splash screen handoff. Without the post-splash theme, the native splash can remain over the WebView after wiring `@capacitor/splash-screen`.
- Capacitor Android 8.4.1 can log `Error injecting safe area CSS: TypeError: Cannot read properties of null (reading 'style')` during startup from `com.getcapacitor.plugin.SystemBars.injectSafeAreaCSS`. The injected JavaScript touches `document.documentElement.style` before the WebView has created `document.documentElement`, so the null value is the document element, not a Can You Geo selector. This is an upstream timing warning from the default `SystemBars.insetsHandling = "css"` path on Android WebView 134.0.6998.135, which Capacitor uses to compensate for older WebView safe-area bugs. It is currently non-fatal: the app launches, WebView history/back behavior works, and visual insets remain correct. Retest this note when upgrading Capacitor Android or when Android WebView is 140 or newer; do not disable SystemBars inset handling just to silence the warning.
- Portrait result moments use the existing inline correct/incorrect result content.
- Landscape result moments use centered transient overlays for Mystery Map and Pattern Atlas.
- Order Atlas result behavior remains unchanged.

## Validated Scope

- Homepage launches in the Android emulator and renders Can You Geo branding.
- Native splash hands off to the WebView instead of remaining stuck over the app.
- The top navigation renders below the Android status bar on API 36.1.
- Mystery Map route renders and loads map/data assets from Capacitor `https://localhost/` packaged assets.
- Pattern Atlas and Order Atlas routes render during shallow native QA.
- Android App Link intents deliver supported Can You Geo routes to the running app, including `/play/pattern-atlas/`, `/play/order-atlas/`, `/upgrade/`, and `/sign-in/`.
- Android App Link path coverage now includes `/account/stats/`, matching the JavaScript deep-link parser for saved-stats account links.
- Upgrade route shows the native billing-preview/offline state and does not open Stripe checkout or an external browser.
- Account, sign-in, and header account controls use native-safe plan-preview copy. They do not present Stripe checkout, Stripe portal, or website-purchase controls in Android native builds.
- Sign In route renders the expected offline/native-disabled state on an emulator with no stable network.
- Android Back minimizes the app at root and does not force-close the process. Warm App Link history behavior is covered by focused component tests.
- No website marketing-consent banner is visible in the native app.
- Logcat showed packaged Capacitor asset requests under `https://localhost/`; no Can You Geo app crash or `FATAL EXCEPTION` was observed in the final smoke-test snapshot.
- The `Medium_Phone_API_36.1` emulator itself was unstable during Checkpoint 5D-1A: streamed APK install repeatedly broke PackageManager, `--no-streaming` install succeeded, and Pixel Launcher/System UI ANR dialogs appeared while the app remained renderable. Treat those as emulator-health findings, not app regressions, and re-run on a fresh API 36.1 AVD or physical Android device before Play internal testing.
- Release guardrails are documented in `docs/mobile/NATIVE_RELEASE_GUARDRAILS.md`.

## Debug APK

The debug APK output path is:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

This file is a local build artifact and must not be committed.

Gradle may create a local Android debug keystore at:

```text
~/.android/debug.keystore
```

That keystore is local developer state only. It is not part of the repository and is not suitable for production signing.

## Deferred Work

The app-side/runtime foundations are now in place and covered by focused unit and native black-box checks:

- Native authentication callbacks, password recovery, and email confirmation route through the hosted `https://canyougeo.com/auth/callback` origin.
- Strict native deep-link intake handles supported public Can You Geo routes, including challenge links, without logging sensitive callback values.
- Android App Link intent filters and warm-link history handling are implemented in the native app.
- Durable native Supabase session storage is implemented for Android and iOS.
- Native release guardrails cover trusted external social links, internal WebView navigation, offline/reconnect behavior, mobile billing boundaries, marketing-consent absence, and safe-area handling.

Remaining release/configuration work:

- Google Play Billing.
- Production Play signing and Play Console setup.
- Controlled live native authentication validation against a safe staging or dedicated test path. Current auth callback, storage, password recovery, and email-confirmation behavior is covered synthetically and by parser/component tests; this checkpoint did not create production accounts or send production auth emails.
- Final production App Link verification with the Play signing certificate; current production association metadata only covers the debug certificate used for emulator/local verification.
- Production icon and splash assets.
- Physical Android-device testing.
- Optional future push notifications.
- Optional future native sharing.
- Performance profiling and remaining device-specific warnings, including retesting the non-fatal Capacitor SystemBars startup warning after future Capacitor Android or Android WebView updates.
