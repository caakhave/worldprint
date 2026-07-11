# Can You Geo Analytics Guide

Last updated: July 10, 2026

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

Only high-level, non-PII product events are pushed to `window.dataLayer`. GTM listens for the `cgy_*` app event names and forwards them to clean GA4 event names.

| App dataLayer event | GA4 event forwarded by GTM | Fires when | Parameters |
| --- | --- | --- | --- |
| `cgy_game_start` | `game_start` | A new playable run starts, not on page load or resume. | `game_slug`, `mode`, `round_count`, `signed_in`, `plan` |
| `cgy_round_answered` | `round_submit` | A player submits an answer for a round. Repeated already-rejected answers are ignored. | `game_slug`, `mode`, `round_number`, `correct`, `difficulty`, `score_band`, `signed_in`, `plan` |
| `cgy_game_complete` | `game_complete` | A run transitions to complete. | `game_slug`, `mode`, `round_count`, `final_score`, `score_band`, `perfect_run`, `signed_in`, `plan` |
| `cgy_select_content` | `select_content` | A player selects a major game card, mode card, plan option, auth link, or CTA. | `content_type`, `item_id`, optional `game_slug`, optional `mode` |
| `cgy_signup_complete` | `sign_up` or ad-platform signup conversion | A new account is successfully created through a confirmed new-user path. | `method` |
| `cgy_sign_up` | `sign_up` | A new account is successfully created. | `method` |
| `cgy_login` | `login` | A sign-in succeeds. | `method` |
| `cgy_share` | `share` | A challenge/result link is copied, natively shared, sent by server email, or opened as mailto. | `method`, `content_type`, `game_slug`, `mode` |
| `cgy_upgrade_click` | ad-platform upgrade intent conversion | A player clicks a Pro upgrade CTA or checkout CTA before any Stripe redirect. | `currency`, `value`, `plan`, `signed_in`, `source` |
| `cgy_begin_checkout` | `begin_checkout` | A signed-in player receives a Stripe checkout URL and is about to leave for secure checkout. | `currency`, `value`, `plan` |
| `cgy_marketing_consent_granted` | marketing consent grant trigger | A visitor accepts marketing cookies in the Can You Geo cookie settings UI. | none |

`purchase` is intentionally not emitted from the frontend yet. The current app does not have a refresh-proof, single source of truth with a stable transaction ID on the browser return path, so a frontend `purchase` event could double-count. Add this later only from a reliable billing success source.

`cgy_play_page_view` is not emitted by the app. GTM can use ordinary page-view or history-change triggers for `/play/` and game route visits without adding another app event.

Allowed event parameters are generic low-cardinality fields such as game slug, public mode, score band, plan, CTA ID, method, CTA source, and boolean state. Do not send account emails, user IDs, recipient emails, auth tokens, payment details, precise location, answer countries, hidden indicators, data source labels, raw challenge codes, or free-text notes.

## Privacy Notes

The analytics helper rejects PII-shaped parameter names and email-like string values. It also drops `undefined` and `null` values before pushing to `window.dataLayer`. This is a defense-in-depth guard, not permission to pass sensitive data. Event wiring should continue to use only generic product state.

Recommended GA4 key events after GTM forwarding is configured:

- `game_complete`
- `sign_up` or `cgy_signup_complete`, but avoid double-counting both in the same reporting view
- `share`
- `cgy_upgrade_click` for paid-plan intent, especially ad-platform optimization
- `begin_checkout`
- `purchase` only after it is safely implemented

Consider `game_start` later if activation becomes a core acquisition metric. Do not mark `round_submit` as a key event.

Cloudflare Web Analytics or Insights may still be injected from the Cloudflare dashboard. Keep that separate from app-owned GTM/GA4 analytics and verify any dashboard-injected analytics are appropriate for the current production posture.

## Reddit Pixel / Paid Media Notes

Reddit Pixel and similar paid-media tags should be added through GTM, not as hard-coded vendor scripts in the app. The app provides neutral first-party `cgy_*` dataLayer events that GTM can map to Reddit, Meta, GA4, or other measurement destinations.

Suggested Reddit/GTM mapping:

- Use GTM page-view triggers for page visits and `/play/` visits.
- Trigger signup conversion tags from `cgy_signup_complete`.
- Trigger upper-funnel upgrade-intent tags from `cgy_upgrade_click`.
- Trigger engagement tags from `cgy_game_start` and `cgy_game_complete` where useful.
- Do not pass emails, user IDs, recipient emails, challenge codes, hidden indicators, answer countries, free-text notes, or payment identifiers into ad-platform tags.

The current app-owned CSP allows GTM/GA4 and Cloudflare analytics sources. Before publishing a Reddit Pixel tag, validate in GTM Preview and the browser console whether additional narrow Reddit script/beacon/image/connect sources are required in `public/_headers`. Add only the exact endpoints needed by the published tag and verify there are no CSP violations.

## Meta Pixel / Paid Media Readiness

Meta Pixel should also be installed through the existing GTM container rather than as app-owned vendor script code. The production Meta Pixel / Dataset ID is:

```text
1042037754988430
```

Treat the Pixel ID as public configuration, not a secret, but do not hard-code Meta's base snippet into the Next.js app. Use GTM and the neutral `cgy_*` dataLayer events instead.

Production-only targeting:

- Include hostnames: `canyougeo.com`, `www.canyougeo.com`
- Exclude: `test.canyougeo.com`, `localhost`, `127.0.0.1`, Cloudflare preview/Page URLs, and any noindexed build
- Keep Cloudflare Preview analytics disabled with `NEXT_PUBLIC_ANALYTICS_ENABLED=false`

Consent posture:

- Can You Geo sets default advertising consent to denied before GTM loads: `ad_storage=denied`, `ad_personalization=denied`, and `ad_user_data=denied`.
- The footer cookie settings UI lets visitors accept or decline marketing cookies and stores that choice locally.
- When marketing consent is accepted, the app updates ad consent to granted and pushes `cgy_marketing_consent_granted`.
- When marketing consent is declined or revoked, the app updates ad consent back to denied.
- In GTM, Meta PageView and conversion tags must require `ad_storage` and `ad_personalization`; use `ad_user_data` too where supported.
- Reddit Pixel tags should be brought under the same marketing consent gate. Do not let Reddit fire on Initialization or Container Loaded unless consent is already granted.
- If GTM consent checks are not configured yet, keep Meta and Reddit tags paused/unpublished except for manual Preview testing.

Suggested Meta/GTM mapping:

| Meta event | GTM trigger | App dataLayer event | Notes |
| --- | --- | --- | --- |
| `PageView` | Page View / Initialization on production hostnames only | GTM page view | Consent-gated. Do not fire on staging, previews, or localhost. |
| Consent-granted PageView replay | Custom Event | `cgy_marketing_consent_granted` | Use this trigger so Meta PageView can fire once after a visitor accepts marketing cookies during the same page view. |
| `CompleteRegistration` | Custom Event | `cgy_signup_complete` | Fires only after a confirmed new account creation path. Payload: `method`. |
| `InitiateCheckout` | Custom Event | `cgy_begin_checkout` | Fires only after the Stripe checkout URL is returned and the browser is about to leave for Checkout. Payload: `currency`, `value`, `plan`. |
| Upper-funnel upgrade intent | Custom Event | `cgy_upgrade_click` | Optional ad optimization signal before checkout starts. Payload: `currency`, `value`, `plan`, `signed_in`, `source`. |
| `StartSampleRun` / `StartDaily` custom events | Custom Event with mode filter | `cgy_game_start` | Use `mode=guest_sample`, `free_daily`, or `pro_daily`; payload stays generic. |
| `CompleteSampleRun` / `CompleteDaily` custom events | Custom Event with mode filter | `cgy_game_complete` | Use `mode=guest_sample`, `free_daily`, or `pro_daily`; do not pass answers or guesses. |
| `Purchase` | Deferred | Not emitted | Wait for a later server-side/CAPI or webhook-backed implementation with a stable transaction/subscription event id. The browser return path can be refreshed and may double-count. |

Never map or enrich Meta events with account emails, names, user IDs, auth tokens, recipient emails, challenge codes, exact location, hidden indicators, answer countries, guesses, payment identifiers, or free-text notes. Keep Meta payloads limited to the low-cardinality fields already emitted by the app.

If Meta tags are published through GTM, validate the production browser console for CSP violations. Add only the narrow Meta script/beacon/image/connect hosts required by the actual GTM tag in a separate CSP change; do not add broad wildcards.

## CSP Allowlist

Cloudflare Pages serves the launch CSP from `public/_headers`. GTM/GA4 and the GTM-managed Reddit Pixel base tag need these narrow allowances:

- `script-src`: `https://www.googletagmanager.com`
- `frame-src`: `https://www.googletagmanager.com` for the GTM noscript iframe
- `connect-src`: `https://www.google-analytics.com`, `https://region1.google-analytics.com`, and `https://www.google.com` for GA4 collection paths used by the GTM container
- `img-src`: `https://www.google-analytics.com` and `https://www.googletagmanager.com` for beacon/image fallbacks
- `script-src`: `https://www.redditstatic.com` for the Reddit Pixel script loaded by GTM
- `connect-src` and `img-src`: `https://alb.reddit.com` for Reddit Pixel collection beacons
- `img-src`: `https://www.redditstatic.com` for Reddit Pixel image fallback behavior

Do not replace these with broad Google or Reddit wildcards. The current static export still permits inline scripts/styles for Next hydration, but the GTM fix should not add any new `unsafe-inline` or `unsafe-eval` allowances. Validate after deploy by opening production in a browser console and confirming `gtm.js` and the GTM-managed Reddit Pixel tag load without CSP errors.

## Setup Checklist

1. Create or confirm the production GA4 property for `canyougeo.com`.
2. Create a production Google Tag Manager container if using GTM.
3. In GTM, configure GA4 page view and custom event forwarding for the `cgy_*` dataLayer events listed above.
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
