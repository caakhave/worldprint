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
pnpm qa:native:ios:smoke
pnpm qa:native:ios:interaction
pnpm qa:native:ios:auth
```

The `android:all` and `ios:all` shortcuts run the platform's complete current native flow list. Use the narrower commands while diagnosing a regression.

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

Current iOS coverage:

- clean launch and primary public navigation
- Play hub and three game route lobbies
- Pattern Atlas WebView interaction
- sign-in session persistence across app stop/relaunch

iOS does not claim Universal Links yet, so the iOS flows avoid OS-level HTTPS link routing. Add those tests only after iOS association and entitlement work exists.

## Reports

Non-secret smoke suites write ignored Maestro diagnostics under:

```text
canyougeo-blackbox/native/reports/
```

Credential-bearing suites create the ignored report directory but intentionally do not request screenshot/debug output paths. Do not commit generated reports, screenshots, videos, traces, emulator/simulator state, APKs, AABs, build output, `local.properties`, keystores, or logs.

## Android App Link Flow

`pnpm qa:native:android:deep-link` expects the installed app, APK fingerprint, and live `https://canyougeo.com/.well-known/assetlinks.json` to be aligned. It is a genuine domain-verification smoke and should fail if the emulator routes the unqualified link to a browser instead of Can You Geo.
