# Can You Geo Native Black-Box QA

Native black-box QA uses local Maestro CLI flows against installed Capacitor iOS and Android builds. These tests exercise the packaged app through device UI automation rather than browser Playwright, GTM, Supabase dashboards, or native project internals.

## Prerequisites

- Maestro CLI installed locally with Homebrew: `brew tap mobile-dev-inc/tap && brew install mobile-dev-inc/tap/maestro`
- A fresh native web export synced into the platform project before installing the app.
- Android debug app installed on the emulator for Android flows.
- iOS debug app installed on the target simulator for iOS flows.
- No Maestro Cloud account, upload, or API key.

The default Android device is `emulator-5554`. The default iOS simulator UDID is `9DD07C47-7733-488F-9F1A-9D927ED9F6FB`. Pass `--device` to `canyougeo-blackbox/native/maestro/scripts/run-native-maestro.mjs` when using a different target.

## Commands

From the repository root:

```bash
pnpm qa:native:android:smoke
pnpm qa:native:android:interaction
pnpm qa:native:android:back
pnpm qa:native:android:deep-link
pnpm qa:native:android:auth
pnpm qa:native:android:guardrails
pnpm qa:native:android:billing
pnpm qa:native:android:release
pnpm qa:native:ios:smoke
pnpm qa:native:ios:interaction
pnpm qa:native:ios:auth
pnpm qa:native:ios:guardrails
pnpm qa:native:ios:billing
pnpm qa:native:ios:release
pnpm qa:native:ios:release-with-universal-link
pnpm qa:native:ios:universal-link
```

The Android complete release suite is `pnpm qa:native:android:release`. It runs smoke, interaction, Back, App Links, auth persistence, online/offline/reconnect guardrails, and Google Play billing discovery. `android:all` is a compatibility alias for that complete release suite.

The iOS complete local release suite is `pnpm qa:native:ios:release`. It runs smoke, interaction, auth persistence, release guardrails, and StoreKit billing discovery. iOS Universal Links remain separately gated because Apple association files and device cache state can make simulator-only results stale; run `pnpm qa:native:ios:release-with-universal-link` only after the production AASA prerequisites in this document are satisfied. `ios:all` is a compatibility alias for the local release suite without Universal Links.

## Credential Safety

Auth persistence flows require an approved local QA credential pair:

- `CGY_FREE_EMAIL` and `CGY_FREE_PASSWORD`
- or `CGY_PRO_EMAIL` and `CGY_PRO_PASSWORD`

Values may come from the shell, `canyougeo-blackbox/.env.local`, or `canyougeo-blackbox/.env`. The runner chooses the Free pair first and then Pro. It injects only `MAESTRO_CGY_EMAIL` and `MAESTRO_CGY_PASSWORD` into Maestro's subprocess environment.

Credential values must never be committed, printed, passed as CLI arguments, added to YAML, or uploaded. The runner sanitizes captured stdout/stderr and does not request Maestro screenshot/debug artifact directories for credential-bearing suites.

## Coverage

Current Android coverage:

- clean launch and primary public navigation
- Play hub and three game route lobbies
- Pattern Atlas WebView interaction
- Android system Back behavior
- verified production App Link intake for `/play/`
- tokenless auth callback route handling
- sign-in session persistence across app stop/relaunch
- native release guardrails for Browser-plugin social links, internal navigation, safe-area-visible controls, offline/reconnect behavior, billing boundaries, and consent absence
- Google Play billing discovery for signed-out sign-up boundaries, signed-in Free monthly/annual controls, localized plan prices when Play returns them, clear unavailable catalog states, and native Stripe suppression without tapping purchase or restore

Current iOS coverage:

- clean launch and primary public navigation
- Play hub and three game route lobbies
- Pattern Atlas WebView interaction
- sign-in session persistence across app stop/relaunch
- native release guardrails for Browser-plugin social links, internal navigation, safe-area-visible controls, billing boundaries, and consent absence
- StoreKit billing discovery for signed-out sign-up boundaries, signed-in Free monthly/annual controls, localized product prices when StoreKit returns them, clear unavailable catalog states, and native Stripe suppression without tapping purchase, restore, transaction finish, or subscription management
- prepared Universal Link intake for public, auth callback, challenge-without-code, and unsupported-route safety, pending live AASA deployment and app reinstall

`pnpm qa:native:ios:universal-link` is not included in `ios:all` yet. Run it only after the production AASA file is live at `https://canyougeo.com/.well-known/apple-app-site-association`, the app has been reinstalled on the target device/simulator, and any CDN or iOS association cache delay has been handled.

Android guardrails temporarily enable airplane mode and disable Wi-Fi/data on the target emulator/device through `adb`, then disable airplane mode and re-enable Wi-Fi/data before the reconnect flow. They must not alter host-machine networking.

## Reports

Non-secret smoke suites write ignored Maestro diagnostics under:

```text
canyougeo-blackbox/native/reports/
```

Credential-bearing suites create the ignored report directory but intentionally do not request screenshot/debug output paths. Do not commit generated reports, screenshots, videos, traces, emulator/simulator state, APKs, AABs, build output, `local.properties`, keystores, or logs.

## Android App Link Flow

`pnpm qa:native:android:deep-link` expects the installed app, APK fingerprint, and live `https://canyougeo.com/.well-known/assetlinks.json` to be aligned. It is a genuine domain-verification smoke and should fail if the emulator routes the unqualified link to a browser instead of Can You Geo.

## iOS Universal Link Flow

`pnpm qa:native:ios:universal-link` expects the installed iOS app to include the `applinks:canyougeo.com` entitlement and the live production AASA file to include `G5N5U6QFS8.com.canyougeo.app`. It opens unqualified HTTPS links and should fail if iOS routes them to Safari instead of Can You Geo.
