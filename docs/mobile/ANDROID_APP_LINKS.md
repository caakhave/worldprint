# Android App Links

Can You Geo uses Android App Links so the native Android shell can receive supported `https://canyougeo.com` URLs after domain verification succeeds.

## Production Association File

- Production URL: `https://canyougeo.com/.well-known/assetlinks.json`
- Android package name: `com.canyougeo.app`
- Current debug SHA-256 fingerprint: `D4:95:77:E6:E5:D7:90:B1:64:2E:86:32:EC:DD:24:3E:1D:97:82:73:64:03:6A:2E:93:B9:17:88:96:36:99:37`

The SHA-256 fingerprint in `assetlinks.json` is public domain-association metadata. It is not a private key, signing key, password, token, or credential.

This first association file exists to let the locally built debug Android proof of concept perform real App Link verification against the production apex domain. Do not remove the debug fingerprint until local/debug verification is no longer needed, or until release hardening explicitly decides to remove it.

Before any Google Play production release, add the Google Play App Signing certificate fingerprint to the same association file. Do not invent or guess the Play fingerprint; copy it from the Play Console when the app record and Play App Signing configuration exist.

## Route Boundaries

The website association proves that `com.canyougeo.app` is allowed to handle supported `https://canyougeo.com` URLs. It does not broaden the app's accepted routes by itself.

The Android manifest path filters and the JavaScript native deep-link parser still restrict which route families are accepted inside the app. Unsupported paths should continue to be rejected by app-side parsing even if Android delivers a broad matching URL.

This checkpoint does not add:

- `www` or staging domain association
- Android custom-scheme links
- Supabase redirect allowlist changes
- Play Console configuration

iOS Universal Links are documented separately in `docs/mobile/NATIVE_DEEP_LINKS.md`; keep Android and iOS association policies narrow and platform-specific.

## HTTP Behavior

Cloudflare Pages should serve `/.well-known/assetlinks.json` directly as JSON from the static export, without authentication, redirecting, or falling back to the homepage.

The `public/_headers` contract for this file is:

- `Content-Type: application/json`
- `Cache-Control: public, max-age=3600, must-revalidate`

After deployment, verify production with:

```sh
curl -i https://canyougeo.com/.well-known/assetlinks.json
```

Expected production checks:

- HTTP `200`
- JSON body, not homepage HTML
- no redirect
- no Cloudflare Access login page
- package name `com.canyougeo.app`
- the current debug SHA-256 fingerprint above
