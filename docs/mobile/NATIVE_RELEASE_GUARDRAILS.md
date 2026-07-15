# Native Release Guardrails

Checkpoint 4G-1 hardens the private iOS and Android Capacitor apps before StoreKit or Google Play Billing work begins. The web app remains the product source of truth; native builds bundle the static export and should not point Capacitor at a remote `server.url`.

## Dependency

Native external links use Capacitor's official Browser plugin:

```text
@capacitor/browser 8.0.4
```

This is the only dependency added in the release-guardrails checkpoint. Capacitor core, CLI, Android, and iOS remain on the existing Capacitor 8 line.

## External Links

Browser builds keep normal anchor behavior. Native Android and iOS builds intercept only explicitly trusted social-profile links and open them with the Browser plugin:

- `https://www.tiktok.com/@canyougeo`
- `https://www.instagram.com/canyougeo`
- `https://www.facebook.com/canyougeo`

The trusted destination is selected by application-defined social link ID, not by accepting arbitrary runtime URLs. The validator rejects malformed or oversized URLs, non-HTTPS schemes, credentials, localhost, IP-literal hosts, internal Can You Geo hosts, and untrusted HTTPS hosts.

Internal routes stay inside the Capacitor WebView. This includes hosted auth callbacks, challenge links, support/legal pages, game routes, account routes, and upgrade routes. Stripe checkout and Stripe customer portal are never routed through the Browser plugin in the native apps.

External-open failures return sanitized reason codes and must not crash, blank, or navigate the WebView away from bundled content. Do not log complete incoming URLs, auth tokens, challenge codes, Stripe session identifiers, or other sensitive route values.

## Safe Areas

Native builds keep `viewport-fit=cover` and the `cgy-native-app` shell marker. CSS defines reusable native-only variables:

```css
--cgy-safe-area-top: env(safe-area-inset-top, 0px);
--cgy-safe-area-right: env(safe-area-inset-right, 0px);
--cgy-safe-area-bottom: env(safe-area-inset-bottom, 0px);
--cgy-safe-area-left: env(safe-area-inset-left, 0px);
```

Those variables are applied only to the shell, footer, key native overlays, gameplay action docks, bottom action rows, and landscape route shells where system bars or cutouts can obscure controls. Avoid adding global page padding or double-padding nested containers.

## Offline And Reconnect

Native offline handling is intentionally minimal and WebView-based. It uses `navigator.onLine` plus `online` and `offline` events, and native builds run a short HTTPS reachability probe against `https://canyougeo.com/robots.txt` when the browser still reports online. This avoids the observed Android WebView case where emulator networking was disabled but `navigator.onLine` stayed `true`. It does not add a Network plugin, service worker, offline database, background sync, or server-data cache.

When a native app is offline:

- bundled homepage and guest/sample navigation should still render
- a small accessible status message explains that account sync and purchases need a connection
- sign-in, signup, and password recovery fail fast with safe user copy
- account loading resolves instead of staying on "Checking your account"
- a locally restored Supabase session may identify the user, but profile and plan data are marked as deferred
- durable Supabase session storage is not erased merely because the network is unavailable

When the device reconnects, the offline status is dismissed and the account/session/profile hooks may retry normal sync. The app does not persist connectivity state.

## Billing Boundary

Native builds do not start Stripe checkout, open Stripe customer portal, redirect to Stripe, or complete purchases. Free users see the existing mobile-purchases-unavailable state. Already entitled Pro users can still see and use their Pro entitlement when the app can read the account state.

Web builds preserve the existing Stripe checkout, portal, and checkout analytics behavior. StoreKit and Google Play Billing remain deferred.

## Analytics And Consent Boundary

Native builds do not initialize GTM, GA4, Meta, TikTok, Reddit, marketing pixels, or the marketing-consent UI. Native app code still may call the neutral analytics helper, but the helper is disabled for native builds and must not deliver events to a live provider.

Website builds preserve the existing consent-gated GTM/GA4 setup and the neutral `dataLayer` event contract.

## Native QA

Run the release-guardrail flows against installed local builds after a fresh native sync:

```bash
pnpm qa:native:android:guardrails
pnpm qa:native:ios:guardrails
```

Android guardrails include a controlled emulator/device offline segment using `adb shell cmd connectivity airplane-mode enable` plus explicit Wi-Fi/data disable commands, then restore connectivity with `airplane-mode disable` and Wi-Fi/data enable before the reconnect flow. Package-scoped blocking was not reliable for WebView fetches because those requests may be attributed to provider processes. This must not alter host-machine networking.

iOS guardrails cover the online Browser-plugin, internal navigation, safe-area-visible controls, billing, and consent absence paths. Isolated iOS simulator offline testing is optional until it can be exercised without unsafe system-wide network changes; offline behavior remains covered by focused component and hook tests.

Generated Maestro reports stay under ignored `canyougeo-blackbox/native/reports/`. Do not commit reports, screenshots, recordings, APKs, AABs, build output, simulator/emulator state, signing material, credentials, or `.env` files.

## Troubleshooting

- If a social link leaves the WebView blank, check `src/lib/mobile/nativeExternalNavigation.ts` and confirm the destination ID is trusted and the Browser plugin is synced.
- If a Can You Geo route opens in a native browser, check that it is not using the external-navigation abstraction and that App Link/deep-link handling still treats it as internal.
- If account pages spin offline, check `useSupabaseAccount` and `useEntitlement` for native offline resolution.
- If the offline banner remains after reconnect, check browser `online`/`offline` events and the native reachability probe in the target runtime before adding a network plugin.
- If Stripe or marketing consent appears in native builds, stop release testing and inspect `isNativeAppBuild()` guards before changing store billing or analytics settings.
