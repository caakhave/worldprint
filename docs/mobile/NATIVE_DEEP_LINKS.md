# Can You Geo Native Deep-Link Foundation

Checkpoint 4B adds a code-only deep-link foundation for the Capacitor shells. It does not activate iOS Universal Links or Android App Links by itself.

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

Android Back behavior remains in `NativeAppBridge`. Warm links use `push` so system Back can return to the previous Can You Geo route. Cold links use `replace` so the synthetic local homepage is not inserted as a misleading Back destination.

## Deduplication

Cold start and warm events can deliver the same URL. The bridge keeps a session-local in-memory record of the last accepted destination fingerprint.

- immediate duplicate accepted links are skipped for a short window
- distinct links still navigate
- the same public URL can be opened again later
- nothing is persisted to `localStorage` or `sessionStorage`
- raw auth tokens and challenge codes are not stored as dedupe keys

## Deferred Platform Work

This checkpoint does not add or modify:

- iOS Associated Domains
- iOS entitlements
- Android HTTPS `VIEW` / `BROWSABLE` intent filters
- `android:autoVerify`
- `apple-app-site-association`
- `assetlinks.json`
- `public/.well-known`
- Cloudflare headers
- DNS
- Supabase redirect allowlists
- Supabase email templates
- custom URL schemes

## Remaining Auth Redirect Work

Native WebViews use a local origin. Future auth work must ensure native signup and password-reset emails use the public HTTPS callback origin, such as:

```text
https://canyougeo.com/auth/callback
```

Do not rely on the WebView origin for production Supabase Auth email redirects.

## Testing Limits

Checkpoint 4B can verify parser behavior, listener registration, cold/warm bridge routing, deduplication, and non-logging guarantees through tests.

It cannot prove end-to-end iOS Universal Links or Android App Links until later checkpoints add website association files and native platform configuration.
