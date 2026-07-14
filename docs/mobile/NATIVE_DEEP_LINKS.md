# Can You Geo Native Deep-Link Foundation

Checkpoint 4B adds a code-only deep-link foundation for the Capacitor shells. Checkpoint 4D-1 adds Android app-side HTTPS
intent filters for `canyougeo.com`, but verified Android App Links still require the website association file described below.

## Parser Contract

Incoming native URLs are parsed by `parseNativeDeepLinkUrl(url)` in `src/lib/mobile/nativeDeepLink.ts`.

Accepted result:

```ts
{
  accepted: true,
  destination: string,
  navigation: "push" | "replace",
  category: "public" | "auth" | "challenge"
}
```

Rejected result:

```ts
{
  accepted: false,
  reason:
    | "invalid-url"
    | "unsupported-scheme"
    | "untrusted-origin"
    | "credentials-not-allowed"
    | "path-not-allowed"
    | "query-not-allowed"
    | "fragment-not-allowed"
    | "too-long"
}
```

Rejected results intentionally contain only non-sensitive reason codes. Raw incoming URLs, auth tokens, auth codes, and challenge codes must not be logged.

## Production Origin Policy

The production default accepts only:

- `https://canyougeo.com`
- `https:` scheme
- no username/password credentials
- no untrusted host
- no local WebView origin
- no `www.canyougeo.com`
- no `test.canyougeo.com`
- no custom schemes

The parser accepts an explicit `allowedOrigins` configuration so a future staging build can use `https://test.canyougeo.com` without duplicating parser logic. The production bridge does not enable staging.

## Route Policy

Allowed public destinations:

- `/`
- `/play/`
- `/play/mystery-map/`
- `/play/pattern-atlas/`
- `/play/order-atlas/`
- `/play/mystery-map/YYYY-MM-DD/` for valid calendar dates
- `/challenge/mystery-map/`
- `/upgrade/`
- `/about/`
- `/how-to-play/`
- `/sources/`
- `/past-games/`
- `/support/`
- `/legal/`
- `/privacy/`
- `/terms/`
- `/choropleth-map-game/`
- `/country-guessing-game/`
- `/daily-geography-game/`
- `/map-quiz/`

Allowed auth/account destinations:

- `/sign-in/`
- `/sign-up/`
- `/forgot-password/`
- `/auth/callback/`
- `/reset-password/`
- `/account/`
- `/account/stats/`

Approved legacy normalizations:

- `/play/worldprint/` -> `/play/mystery-map/`
- `/play/worldprint/YYYY-MM-DD/` -> `/play/mystery-map/YYYY-MM-DD/`
- `/challenge/worldprint/` -> `/challenge/mystery-map/`
- `/archive/worldprint/` -> `/past-games/`
- `/beta/worldprint/` -> `/play/mystery-map/`

Rejected destinations include unknown app routes, `/internal/*`, private review routes, `/404/`, `/_not-found/`, `/_next/*`, raw data/assets, arbitrary file paths, path traversal, encoded traversal, malformed percent encoding, and oversized URLs.

## Query And Fragment Policy

Challenge links:

- `/challenge/mystery-map/`
- required `c`
- no additional query parameters
- `c` must be base64url-shaped, within the current challenge length limit, and pass existing challenge decoding/checksum validation

Upgrade links:

- `/upgrade/`
- optional `plan`
- allowed values: `monthly`, `yearly`
- no other query parameters

Sign-in and sign-up links:

- `/sign-in/` permits `next` and `signedOut=1`
- `/sign-up/` permits `next`
- `next` is sanitized through the existing safe account return-path helper
- external, game, arbitrary, or unsupported return destinations are rejected

Auth callback links:

- `/auth/callback/`
- navigation mode is always `replace`
- supported query or hash parameters are:
  - `token_hash`
  - `type`
  - `code`
  - `access_token`
  - `refresh_token`
  - `expires_in`
  - `expires_at`
  - `token_type`
  - `error`
  - `error_code`
  - `error_description`
- `type` must be one of the Supabase auth types already supported by the app: `signup`, `magiclink`, `recovery`, `invite`, `email`, `email_change`

Fragments:

- `/play/mystery-map/#practice-atlas`
- `/account/stats/#saved-stats`
- `/play/mystery-map/YYYY-MM-DD/?review=1#past-game-result`

Unknown fragments are rejected. Auth callback hash parameters are treated as auth parameters, not as visual fragments.

## Native Bridge Behavior

`NativeDeepLinkBridge` is mounted once from the root layout.

It registers only when:

- `NEXT_PUBLIC_CGY_NATIVE_APP=1`
- Capacitor platform is `ios` or `android`

Cold start:

- dynamically imports `@capacitor/app`
- calls `App.getLaunchUrl()`
- parses the URL through the strict parser
- navigates with `router.replace`
- leaves the app on its normal initial route when the URL is missing or rejected

Warm/running app:

- registers `App.addListener("appUrlOpen", ...)`
- parses each incoming URL through the strict parser
- navigates with `router.push` for ordinary accepted links
- uses `router.replace` for auth callbacks
- removes the listener on cleanup
- never uses `window.location.assign`
- never loads rejected external URLs in the WebView

Android Back behavior remains in `NativeAppBridge`. Warm links use `push` so system Back can return to the previous Can You Geo
route. Cold links use `replace` so the synthetic local homepage is not inserted as a misleading Back destination.

Checkpoint 4D-1A confirmed two Android runtime details:

- after a warm App Link, Android/Capacitor can report `backButton.canGoBack=false` even though Next's client navigation created
  a real browser history entry and `window.history.back()` works
- during a cold Android App Link launch, Capacitor can deliver the launch URL through `appUrlOpen` before `getLaunchUrl()`
  settles

The bridges therefore use this policy:

- root routes still minimize the app
- native `canGoBack=true` still uses `window.history.back()`
- `NativeAppBridge` tracks only a numeric, session-local count of native WebView `history.pushState` entries
- if `canGoBack=false` but that tracked depth is positive on a non-root route, Back uses `window.history.back()` and consumes one depth entry
- `appUrlOpen` events received before the initial launch URL lookup completes are treated as cold links
- cold links and auth callbacks use `replace` and reset the tracked depth
- the depth signal stores no route strings, incoming URLs, tokens, challenge codes, user identifiers, or browser storage

This keeps auth callbacks from becoming reusable Back destinations and avoids navigating from cold deep links to the synthetic
local bootstrap page.

## Android App Link Intent Filters

Checkpoint 4D-1 configures `android/app/src/main/AndroidManifest.xml` so `MainActivity` can receive approved HTTPS links:

- action: `android.intent.action.VIEW`
- categories: `android.intent.category.DEFAULT` and `android.intent.category.BROWSABLE`
- `android:autoVerify="true"`
- scheme: `https`
- host: `canyougeo.com`

The Android app does not claim:

- `http`
- `www.canyougeo.com`
- `test.canyougeo.com`
- localhost
- custom URL schemes
- arbitrary files
- `/_next/*`
- `/internal/*`

The manifest uses isolated intent filters so each filter has one `<data>` claim. This avoids Android combining separate scheme, host,
and path declarations into broader unintended matches.

Current manifest path claims:

- exact `/`
- prefix `/play/`
- exact `/challenge/mystery-map/`
- exact `/upgrade/`
- exact `/about/`
- exact `/how-to-play/`
- exact `/sources/`
- exact `/past-games/`
- exact `/support/`
- exact `/legal/`
- exact `/privacy/`
- exact `/terms/`
- exact `/choropleth-map-game/`
- exact `/country-guessing-game/`
- exact `/daily-geography-game/`
- exact `/map-quiz/`
- exact `/sign-in/`
- exact `/sign-up/`
- exact `/forgot-password/`
- exact `/auth/callback/`
- exact `/reset-password/`
- exact `/account/`

The `/play/` prefix intentionally covers current game routes and dated Mystery Map URLs. The JavaScript parser remains the final
navigation authority: it still rejects malformed dates, unknown `/play/*` paths, unsafe query parameters, unsafe auth callbacks,
alternate origins, internal routes, and asset paths even if Android offers the URL to the app.

The apex-only policy is deliberate. Do not add `www.canyougeo.com`, `test.canyougeo.com`, or a custom scheme unless a later
checkpoint explicitly changes the production origin policy and parser configuration.

Android verification is not expected to pass until Can You Geo serves:

```text
https://canyougeo.com/.well-known/assetlinks.json
```

This checkpoint does not add that file and does not deploy the website. Until the file is deployed, `adb shell pm get-app-links
com.canyougeo.app` can show the declared domain but may report it as unverified.

The current local debug certificate SHA-256 fingerprint is:

```text
D4:95:77:E6:E5:D7:90:B1:64:2E:86:32:EC:DD:24:3E:1D:97:82:73:64:03:6A:2E:93:B9:17:88:96:36:99:37
```

This fingerprint is public association metadata for Android App Links, not a private key or signing secret. A future
`assetlinks.json` may include the debug fingerprint for local/internal testing, but production release builds must use the
production Play App Signing certificate fingerprint from Play Console. Add that production fingerprint later; do not infer it
from the debug keystore.

## Deduplication

Cold start and warm events can deliver the same URL. The bridge keeps a session-local in-memory record of the last accepted destination fingerprint.

- immediate duplicate accepted links are skipped for a short window
- distinct links still navigate
- the same public URL can be opened again later
- nothing is persisted to `localStorage` or `sessionStorage`
- raw auth tokens and challenge codes are not stored as dedupe keys

## Deferred Platform Work

These checkpoints do not add or modify:

- iOS Associated Domains
- iOS entitlements
- `apple-app-site-association`
- `assetlinks.json`
- `public/.well-known`
- Cloudflare headers
- DNS
- Supabase redirect allowlists
- Supabase email templates
- custom URL schemes
- Play Console signing configuration

## Remaining Auth Redirect Work

Native WebViews use a local origin. Checkpoint 4C keeps Supabase Auth email redirects on a hosted HTTPS origin instead of deriving them from the Capacitor WebView origin.

Native production builds use:

```bash
NEXT_PUBLIC_CGY_NATIVE_HOSTED_ORIGIN=https://canyougeo.com
```

The native build script supplies this public value together with `NEXT_PUBLIC_CGY_NATIVE_APP=1`. It is public build-time configuration, not a secret.

Production native signup confirmation and password-reset requests send Supabase this exact callback URL:

```text
https://canyougeo.com/auth/callback
```

Do not rely on the WebView origin for production Supabase Auth email redirects. A Capacitor app may run the web bundle from a local origin such as `https://localhost`; hosted Supabase Auth emails must not contain that origin.

Web builds preserve the existing behavior: signup and password reset callbacks are still based on the active browser origin through the existing site-origin helper, so local web development and deployed web origins keep working as before.

Native builds fail closed if `NEXT_PUBLIC_CGY_NATIVE_HOSTED_ORIGIN` is missing or invalid. The UI does not send the Supabase `signUp` or `resetPasswordForEmail` request when a safe hosted callback cannot be constructed.

Production hosted-origin validation currently allows only:

- `https://canyougeo.com`
- HTTPS
- no credentials
- no non-production host such as `www.canyougeo.com`, `test.canyougeo.com`, or `localhost`
- no path other than `/`
- no query string
- no fragment
- no custom scheme

The helper accepts an explicit allowed-origin option so a future staging native build can intentionally use:

```text
https://test.canyougeo.com
```

Do not enable staging by default in the production native build.

## Supabase Dashboard Contract

Repository documentation expects the production Supabase Auth URL configuration to be:

```text
Site URL: https://canyougeo.com
Redirect URL: https://canyougeo.com/auth/callback
```

Repository documentation expects the staging Supabase Auth callback entry to be:

```text
https://test.canyougeo.com/auth/callback
```

Those are documented expectations from `docs/AUTH_SETUP.md` and `docs/DOMAIN_EMAIL_SETUP.md`. This checkpoint does not verify or modify the live Supabase dashboard.

Do not add `https://localhost/auth/callback` to a hosted production or staging Supabase allowlist. Local web QA continues to use the documented `http://localhost:3000/auth/callback` and `http://localhost:3001/auth/callback` entries where appropriate.

Platform association work is still required before installed iOS or Android apps can receive production HTTPS links directly.

## Testing Limits

Checkpoint 4B can verify parser behavior, listener registration, cold/warm bridge routing, deduplication, and non-logging guarantees through tests.

Checkpoint 4D-1 can verify Android manifest structure and explicit package-targeted HTTPS intents before website verification.

It cannot prove end-to-end iOS Universal Links or verified Android App Links until later checkpoints add website association files and production signing configuration.
