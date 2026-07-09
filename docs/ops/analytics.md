# Can You Geo Analytics Guide

Last updated: July 1, 2026

## Status

Launch analytics are supported in code but disabled by default. The app loads analytics only when all of these are true:

- `NEXT_PUBLIC_ANALYTICS_ENABLED=true`
- `NEXT_PUBLIC_SITE_URL` is a production root origin such as `https://canyougeo.com`
- the site is not noindexed by hostname, branch, or `NEXT_PUBLIC_NO_INDEX`
- a valid Google Tag Manager ID or GA4 measurement ID is present

`test.canyougeo.com`, Cloudflare Pages preview URLs, localhost, and noindexed builds do not load Can You Geo analytics scripts even if an ID is accidentally present.

## Provider Choice

Prefer Google Tag Manager for launch:

```text
NEXT_PUBLIC_ANALYTICS_ENABLED=true
NEXT_PUBLIC_GTM_ID=GTM-5CQ22953
NEXT_PUBLIC_GA_MEASUREMENT_ID=
```

Current launch setup: GA4 measurement ID `G-PQKXKN89W9` is configured inside the GTM container as a Google Tag. Do not also set `NEXT_PUBLIC_GA_MEASUREMENT_ID` in Production while GTM is configured, or page views may be counted twice.

Direct GA4 is supported only when GTM is absent:

```text
NEXT_PUBLIC_ANALYTICS_ENABLED=true
NEXT_PUBLIC_GTM_ID=
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

Keep staging disabled:

```text
NEXT_PUBLIC_ANALYTICS_ENABLED=false
NEXT_PUBLIC_SITE_URL=https://test.canyougeo.com
NEXT_PUBLIC_NO_INDEX=true
```

## Tracked Events

Only high-level, non-PII product events are tracked:

- `cgy_game_start`
- `cgy_round_answered`
- `cgy_game_complete`
- `cgy_share_clicked`
- `cgy_sign_in_clicked`
- `cgy_upgrade_clicked`
- `cgy_past_game_opened`
- `cgy_challenge_created`

Allowed event parameters are generic fields such as run mode, tier, round count, score, plan, source, method, and boolean state. Do not send account emails, user IDs, recipient emails, auth tokens, payment details, precise location, answer countries, hidden indicators, source labels, or challenge codes.

## Privacy Notes

The analytics helper rejects PII-shaped parameter names and email-like string values. This is a defense-in-depth guard, not permission to pass sensitive data. Event wiring should continue to use only generic product state.

Cloudflare Web Analytics or Insights may still be injected from the Cloudflare dashboard. Keep that separate from app-owned GTM/GA4 analytics and verify any dashboard-injected analytics are appropriate for the current production posture.

## CSP Allowlist

Cloudflare Pages serves the launch CSP from `public/_headers`. GTM/GA4 needs these narrow Google allowances:

- `script-src`: `https://www.googletagmanager.com`
- `frame-src`: `https://www.googletagmanager.com` for the GTM noscript iframe
- `connect-src`: `https://www.google-analytics.com`, `https://region1.google-analytics.com`, and `https://www.google.com` for GA4 collection paths used by the GTM container
- `img-src`: `https://www.google-analytics.com` and `https://www.googletagmanager.com` for beacon/image fallbacks

Do not replace these with broad Google wildcards. The current static export still permits inline scripts/styles for Next hydration, but the GTM fix should not add any new `unsafe-inline` or `unsafe-eval` allowances. Validate after deploy by opening production in a browser console and confirming `gtm.js` loads without CSP errors.

## Setup Checklist

1. Create or confirm the production GA4 property for `canyougeo.com`.
2. Create a production Google Tag Manager container if using GTM.
3. In GTM, configure GA4 page view and custom event forwarding for the `cgy_*` events.
4. Publish the GTM container before production launch. The current launch container is `GTM-5CQ22953`.
5. Set Cloudflare Pages Production env:
   - `NEXT_PUBLIC_SITE_URL=https://canyougeo.com`
   - `NEXT_PUBLIC_NO_INDEX=false`
   - `NEXT_PUBLIC_ANALYTICS_ENABLED=true`
   - `NEXT_PUBLIC_GTM_ID=GTM-5CQ22953`
   - leave `NEXT_PUBLIC_GA_MEASUREMENT_ID` unset because GA4 is already inside GTM
6. Keep Cloudflare Pages Preview env:
   - `NEXT_PUBLIC_SITE_URL=https://test.canyougeo.com`
   - `NEXT_PUBLIC_NO_INDEX=true`
   - `NEXT_PUBLIC_ANALYTICS_ENABLED=false`
   - `NEXT_PUBLIC_GTM_ID=GTM-5CQ22953` may be present, but the app will not load it while analytics is disabled/noindexed
7. Deploy production and confirm the script appears only on `https://canyougeo.com`.
8. Confirm no analytics script appears on `https://test.canyougeo.com`.
9. Use GA4 DebugView or GTM Preview on production only after launch approval.

## Canonical `www` Redirect

The canonical production host is `https://canyougeo.com`. A live probe on July 1, 2026 returned `403` for `https://www.canyougeo.com/`, so Cloudflare is not currently redirecting `www` to the apex host.

Add a Cloudflare Redirect Rule:

- Rule name: `Redirect www to apex`
- If incoming requests match: hostname equals `www.canyougeo.com`
- URL redirect type: Dynamic
- Expression target:
  ```text
  concat("https://canyougeo.com", http.request.uri.path, if(len(http.request.uri.query) > 0, concat("?", http.request.uri.query), ""))
  ```
- Status code: `301`
- Preserve path and query string: yes, through the expression above

Expected behavior after the rule:

```text
https://www.canyougeo.com/play/mystery-map/?x=1
→ 301 https://canyougeo.com/play/mystery-map/?x=1
```

Do not submit `test.canyougeo.com` or `www.canyougeo.com` as separate canonical properties in Google Search Console. Use the apex production property.
