# Can You Geo Native Deep-Link Foundation

Checkpoint 4B adds a code-only deep-link foundation for the Capacitor shells. Checkpoint 4D-1 adds Android app-side HTTPS
intent filters for `canyougeo.com`. Checkpoint 4H-2 adds the iOS Associated Domains entitlement and the production
`apple-app-site-association` file for `canyougeo.com`.

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
- exact `/account/stats/`

The `/play/` prefix intentionally covers current game routes and dated Mystery Map URLs. The JavaScript parser remains the final
navigation authority: it still rejects malformed dates, unknown `/play/*` paths, unsafe query parameters, unsafe auth callbacks,
alternate origins, internal routes, and asset paths even if Android offers the URL to the app.

The apex-only policy is deliberate. Do not add `www.canyougeo.com`, `test.canyougeo.com`, or a custom scheme unless a later
checkpoint explicitly changes the production origin policy and parser configuration.

Android verification requires Can You Geo to serve:

```text
https://canyougeo.com/.well-known/assetlinks.json
```

Until the file is deployed, `adb shell pm get-app-links com.canyougeo.app` can show the declared domain but may report it as
unverified.

The current local debug certificate SHA-256 fingerprint is:

```text
D4:95:77:E6:E5:D7:90:B1:64:2E:86:32:EC:DD:24:3E:1D:97:82:73:64:03:6A:2E:93:B9:17:88:96:36:99:37
```

This fingerprint is public association metadata for Android App Links, not a private key or signing secret. A future
`assetlinks.json` may include the debug fingerprint for local/internal testing, but production release builds must use the
production Play App Signing certificate fingerprint from Play Console. Add that production fingerprint later; do not infer it
from the debug keystore.

## iOS Universal Links

The iOS target has a source-controlled Associated Domains entitlement at:

```text
ios/App/App/App.entitlements
```

The only associated domain is:

```text
applinks:canyougeo.com
```

Debug and Release both use that entitlements file through `CODE_SIGN_ENTITLEMENTS = App/App.entitlements`. Automatic signing,
Team ID `G5N5U6QFS8`, and bundle identifier `com.canyougeo.app` remain unchanged.

The production website association file is:

```text
https://canyougeo.com/.well-known/apple-app-site-association
```

The file is extensionless JSON and uses the exact application identifier:

```text
G5N5U6QFS8.com.canyougeo.app
```

`public/_headers` gives the AASA endpoint `Content-Type: application/json` and a one-hour public cache policy. Do not add
redirects, auth gates, or broad `.well-known` header changes for this endpoint.

The AASA path policy is intentionally allowlist-based. It includes current public, game, auth, callback, challenge, upgrade, and
account destinations with slash and slashless forms where real links may use either. It does not use a global `/*` claim and
does not claim `/internal/*`, `/_next/*`, data files, asset files, or arbitrary unknown routes.

The AASA file is not the final security boundary. It only controls whether iOS offers the URL to the app. The JavaScript parser
above remains the final in-app authority for origin, query, fragment, callback-token, challenge-code, and route validation.

Universal Link end-to-end verification still requires:

- deploying the AASA file to production: completed
- confirming the live endpoint returns `200` JSON without redirect or HTML fallback: completed
- waiting for CDN and iOS association cache propagation: completed for physical-device validation
- reinstalling the app on the physical device after the association file is live: completed on iPhone 14
- running a real Universal Link smoke against unqualified `https://canyougeo.com/...` URLs: completed for development-signed physical-device testing

Physical iPhone 14 validation after production AASA deployment confirmed:

- cold public Universal Links opened the installed app
- warm public Universal Links opened the installed app
- tokenless `/auth/callback/` routing opened safely
- a real password-recovery email callback for an approved confirmed production QA account opened the installed app
- the callback reached the reset-password flow
- password update and subsequent login with the new password passed

Do not record the QA account email, password, callback URL, callback token, or user id. This verifies the development-signed
physical-device Universal Link/auth path. The first App Store Connect/TestFlight upload, TestFlight-installed smoke, and
remaining TestFlight authentication QA are documented separately in `docs/mobile/IOS_CAPACITOR_POC.md`; TestFlight-installed
non-sensitive Universal Link routing and password-recovery routing have both passed.

Do not add `www.canyougeo.com`, `test.canyougeo.com`, localhost, custom schemes, `webcredentials`, `activitycontinuation`, push
notifications, Sign in with Apple, iCloud, or Game Center without a separate approved checkpoint.

## Deduplication

Cold start and warm events can deliver the same URL. The bridge keeps a session-local in-memory record of the last accepted destination fingerprint.

- immediate duplicate accepted links are skipped for a short window
- distinct links still navigate
- the same public URL can be opened again later
- nothing is persisted to `localStorage` or `sessionStorage`
- raw auth tokens and challenge codes are not stored as dedupe keys

## Deferred Live And Platform Work

These checkpoints do not add or modify:

- DNS
- Supabase redirect allowlists
- Supabase email templates
- custom URL schemes
- Play Console signing configuration
- Apple Developer portal capability settings
- App Store Connect metadata
- live production deployment

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

## Native Static Route Payloads

Checkpoint 4E-2B found a native-only static export mismatch in the Capacitor local asset server. Next's static export writes
route-qualified React Server Component page payloads, for example:

```text
out/account/__next.account.__PAGE__.txt
out/play/mystery-map/__next.play.mystery-map.__PAGE__.txt
```

During native client navigation, Android WebView requested generic route-local payload names such as:

```text
https://localhost/account/__next.__PAGE__.txt
```

Without a matching route-local alias, `/account/` could remain on loading UI or fail to hydrate the intended route. The fix is a
native-build-only post-export normalization step:

```text
node tools/mobile/normalizeNextNativeExport.mjs out
```

`pnpm build` remains the normal website export and does not run this step. `pnpm build:native` runs it after `next build`, then
Capacitor sync copies the normalized `out/` directory into the native projects.

The normalizer walks every exported route directory, finds exactly one route-qualified `__next.*.__PAGE__.txt`, and copies it to
`__next.__PAGE__.txt` beside the original. It is idempotent and fails loudly if a route directory has multiple candidate page payloads
or an existing generic alias with different contents. It intentionally leaves `_tree`, `_head`, `_index`, segment payloads, HTML files,
and unrelated assets unchanged.

Supported native route loading should go through Next app-router links or the native deep-link bridge. A diagnostic top-level WebView
assignment such as `location.href = "/account/"` can still pass through Capacitor's root document fallback and is not the supported
navigation path. Android validation should use visible route content plus absence of relevant `__PAGE__` 404s, not just the URL bar.

## Native Supabase Session Storage

Checkpoint 4E-2 confirmed that Android WebView `localStorage` is not durable enough for Can You Geo auth sessions. A harmless
`cgy:native-storage-probe` key written before `adb shell am force-stop com.canyougeo.app` was missing after relaunch, so the native
app must not rely on WebView storage for Supabase session persistence.

Web builds keep the existing `@supabase/ssr` browser client and cookie-backed auth storage. That preserves the exported website's
current browser behavior, callback handling, cookies, and deployed Supabase dashboard contract.

Native Capacitor runtimes use `@supabase/supabase-js` with an explicit async storage adapter backed by:

```text
@aparajita/capacitor-secure-storage@8.0.0
```

Native client auth options:

- `persistSession: true`
- `autoRefreshToken: true`
- `detectSessionInUrl: false`
- `storage: createNativeSupabaseAuthStorage()`
- `storageKey: sb-<supabase-project-ref>-auth-token`

The native storage adapter lazy-loads the secure storage plugin only after Capacitor reports a real native platform. It uses:

- storage prefix: `cgy.supabase.auth.`
- iCloud Keychain synchronization: disabled with `setSynchronize(false)`
- iOS Keychain accessibility: `KeychainAccess.whenUnlockedThisDeviceOnly`
- no biometric prompts
- no WebView `localStorage` fallback
- no key enumeration during normal auth operations

The Supabase storage key remains the standard `sb-<project-ref>-auth-token` namespace. The secure-storage plugin adds the
Can You Geo prefix underneath that key, so the app avoids broad keychain names while keeping Supabase's expected storage-key
contract.

The adapter exposes only the async `getItem`, `setItem`, and `removeItem` contract required by Supabase Auth. Secure-storage
failures are surfaced as sanitized operation errors. Never print access tokens, refresh tokens, session JSON, cookie values,
passwords, full callback URLs, or stored secure-storage values while debugging.

Checkpoint 4E-2B Android validation:

- clean signed-out launch rendered signed out and no secure auth key was present
- password sign-in created the secure auth key and rendered authenticated account state
- authenticated state survived `adb shell am force-stop com.canyougeo.app`
- authenticated state survived emulator restart
- sign-out removed the secure auth key
- signed-out state survived force-stop and emulator restart
- debug APK replacement with `adb install -r` preserved the authenticated session and secure auth key
- Android App Links opened the installed app for `/play/`
- `/auth/callback/` route loading through Android App Links still reached the callback screen
- live email callback was not rerun because no safe reusable callback token flow was available
- no credential, token, session JSON, raw callback URL, user id, or email value was printed or committed

iOS caveat: Keychain items can survive app deletion and reinstallation for the same bundle identifier. Do not claim uninstalling the
iOS app clears a session. If store-release policy requires clearing keychain data after reinstall, handle that in a later checkpoint
with a dedicated install-marker design rather than adding it here.

Checkpoint 4E-2B iOS validation:

- Capacitor iOS sync completed with `@aparajita/capacitor-secure-storage@8.0.0` and `@capacitor/app@8.1.0`
- iPhone 17 Pro, iOS 26.5 simulator compile passed
- simulator install and launch rendered the Can You Geo homepage
- automated iOS `/account/`, `/sign-in/`, and auth-persistence runtime checks were not run because this machine does not have an
  installed WebKit inspection bridge and `simctl` does not provide tap/DOM inspection for the WebView

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

Live platform verification remains separate from source-control setup. Installed apps receive production HTTPS links only after the
matching website association files are deployed and the operating system has verified the domain association for the installed app.

## Testing Limits

Checkpoint 4B can verify parser behavior, listener registration, cold/warm bridge routing, deduplication, and non-logging guarantees through tests.

Checkpoint 4D-1 can verify Android manifest structure and explicit package-targeted HTTPS intents before website verification.

Checkpoint 4H-2 verified iOS entitlement structure and AASA route policy from source control. Checkpoint 4H-4 records the
development-signed physical iPhone Universal Link and password-recovery callback validation. The first App Store
Connect/TestFlight upload, TestFlight-installed smoke, and remaining TestFlight authentication QA are documented in
`docs/mobile/IOS_CAPACITOR_POC.md`.
