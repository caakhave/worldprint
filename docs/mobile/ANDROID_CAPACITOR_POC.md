# Can You Geo Android Capacitor POC

This proof of concept packages the existing static-export Next.js app in a Capacitor Android shell. The native app bundles the local `out/` export and must not point Capacitor at a remote server URL for production-style testing.

## Project

- Branch: `codex/capacitor-android-poc`
- Base iOS POC commit: `0557585e83e5b790d82663e9d5886a621bf96912`
- App name: `Can You Geo`
- Android application ID: `com.canyougeo.app`
- Android namespace: `com.canyougeo.app`
- Capacitor core, CLI, Android, and iOS packages: `8.4.1`
- Capacitor App plugin: `8.1.0`
- Native project: `android/`
- Web directory: `out`
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
PATH="/Applications/Android Studio.app/Contents/jbr/Contents/Home/bin:$HOME/Library/Android/sdk/platform-tools:$HOME/Library/Android/sdk/emulator:$PATH" \
./gradlew assembleDebug
```

Install and launch the debug APK on a booted emulator:

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
adb shell monkey -p com.canyougeo.app -c android.intent.category.LAUNCHER 1
```

The validated emulator for this POC was `Medium_Phone_API_36.1`.

## Native Behavior

- Analytics and GTM are disabled for native builds through the shared build-target helper.
- Marketing consent UI and consent events are suppressed in native builds.
- Stripe checkout and customer portal actions are unavailable in the native preview.
- Existing Pro entitlements can still be read by the web app, but purchase and subscription management must be replaced before Play Store release.
- Android system Back is handled through Capacitor's official App plugin. Internal routes with usable WebView history call `window.history.back()`, while the root route minimizes the app instead of force-closing it.
- Android status and navigation bars are handled as WebView system insets. Current shallow testing found content inset below the top status bar and above the bottom navigation/gesture area without obvious overlap.
- Portrait result moments use the existing inline correct/incorrect result content.
- Landscape result moments use centered transient overlays for Mystery Map and Pattern Atlas.
- Order Atlas result behavior remains unchanged.

## Validated Scope

- Homepage launches in the Android emulator and renders Can You Geo branding.
- `/play/` opens from the packaged app.
- Mystery Map route renders and loads map/data assets from Capacitor `https://localhost/` packaged assets.
- Pattern Atlas and Order Atlas routes render during shallow native QA.
- Upgrade route shows the native billing-preview state and does not open Stripe checkout or an external browser.
- No website marketing-consent banner is visible in the native app.
- No GTM, GA4, Meta, TikTok, or Reddit runtime markers were observed in shallow native runtime logs.

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

- Safe-area CSS injection can log a console warning in WebView.
- Google Play Billing.
- Authentication redirects and app links.
- Password recovery, email confirmation, and challenge links.
- Push notifications.
- Native sharing.
- Production icon and splash screen.
- Physical-device testing.
- Production signing and Play Console submission.
- Performance profiling and emulator graphics/media warnings.
