# Native Black-Box QA Baseline

Can You Geo native black-box QA lives in `canyougeo-blackbox/native/maestro`. It complements the browser black-box suite by exercising installed Capacitor iOS and Android builds through device UI automation.

## Scope

- Runs locally with Maestro CLI only.
- Does not use Maestro Cloud, accounts, uploads, GTM Preview, or platform admin dashboards.
- Uses installed native builds with bundle/application ID `com.canyougeo.app`.
- Uses native-only `CGY_NATIVE_*` credentials from uncommitted local env files or the shell.
- Fails before Maestro when an installed app identity or version/build differs from protected source.

## Baseline Commands

```bash
pnpm qa:native:android:preflight
pnpm qa:native:android:smoke
pnpm qa:native:android:interaction
pnpm qa:native:android:back
pnpm qa:native:android:deep-link
pnpm qa:native:android:auth
pnpm qa:native:android:guardrails
pnpm qa:native:android:billing
pnpm qa:native:android:release
pnpm qa:native:ios:preflight
pnpm qa:native:ios:smoke
pnpm qa:native:ios:interaction
pnpm qa:native:ios:auth
pnpm qa:native:ios:guardrails
pnpm qa:native:ios:billing
pnpm qa:native:ios:release
pnpm qa:native:ios:release-with-universal-link
pnpm qa:native:ios:universal-link
```

Use `pnpm qa:native:android:all` or `pnpm qa:native:ios:all` only after the individual flows are healthy. `android:all` is a compatibility alias for the Android complete release suite. `ios:all` is a compatibility alias for the local iOS release suite without Universal Links.

## Credential Handling

The native runner accepts only:

- `CGY_NATIVE_FREE_EMAIL` / `CGY_NATIVE_FREE_PASSWORD`
- `CGY_NATIVE_PRO_EMAIL` / `CGY_NATIVE_PRO_PASSWORD`

It maps the selected pair to Maestro-only environment variables and never passes secret values in command-line arguments. The runner does not fall back to `CGY_FREE_*`, `CGY_PRO_*`, or `CGY_PROD_*` browser credentials. Auth and billing-discovery suites do not request Maestro screenshot/debug artifact directories. If auth fails, investigate manually before rerunning with a credential-bearing flow.

## Device And Version Preflight

Android resolves devices from explicit `--device`, `CGY_ANDROID_DEVICE`, `ANDROID_SERIAL`, exactly one connected `adb devices` entry, then connected `emulator-5554` only when multiple devices are present and no explicit device was supplied.

iOS resolves simulators from explicit `--device`, `CGY_IOS_SIMULATOR_UDID`, then exactly one booted simulator from `xcrun simctl`.

The runner reads expected Android package/version metadata from `android/app/build.gradle` and expected iOS bundle/version/build metadata from `ios/App/App.xcodeproj/project.pbxproj`. It reads installed Android metadata with read-only `adb` package-manager commands and installed iOS metadata with `xcrun simctl get_app_container` plus `plutil`. A mismatch blocks execution before Maestro. This is an installed identity/version check only, not cryptographic artifact verification.

Every invocation writes ignored metadata to:

```text
canyougeo-blackbox/native/reports/<platform>-<suite>-<timestamp>/run-metadata.json
```

The combined local report index is generated with:

```bash
pnpm qa:report
```

and written to `canyougeo-blackbox/reports/index.html`.

## Platform Notes

Android has production HTTPS App Link filters, so the Android deep-link flow verifies OS-delivered links for `https://canyougeo.com/play/` and a tokenless `/auth/callback/`.

iOS has the app-side Universal Link entitlement and a prepared `pnpm qa:native:ios:universal-link` flow. Run that flow only after the AASA file is deployed at `https://canyougeo.com/.well-known/apple-app-site-association`, cache propagation is accounted for, and the test app has been reinstalled so iOS refreshes association state. The flow is intentionally not part of `ios:all` yet.

The guardrail suites cover Browser-plugin social links, internal navigation, safe-area-visible controls, native billing boundaries, consent absence, and Android offline/reconnect behavior. Android guardrails use `adb` to toggle airplane mode plus Wi-Fi/data on the target emulator/device and then restore connectivity; they do not alter host-machine networking. iOS offline runtime testing remains optional unless it can be isolated safely.

The Android complete release suite runs smoke, interaction, Back, App Links, auth persistence, guardrails, and Google Play billing discovery. The billing discovery flow requires an approved native Free or Pro QA credential pair, verifies signed-out purchase boundaries, verifies signed-in Free monthly/annual controls and Restore purchases are visible, reads localized Play plan prices when available, accepts a clear no-catalog state, and does not tap purchase or restore.

The local iOS release suite runs smoke, interaction, auth persistence, guardrails, and StoreKit billing discovery. iOS Universal Links remain separately gated because production AASA deployment and device association caching can make simulator-only results misleading; use `pnpm qa:native:ios:release-with-universal-link` only after those prerequisites are satisfied. StoreKit product discovery from a local StoreKit configuration is simulator-safe, but real TestFlight/App Store Connect product discovery must still be confirmed on a physical device and cannot be claimed from this simulator-only baseline.

## External Play Compliance Milestone

The Android developer account has been verified. `com.canyougeo.app` was automatically registered to the verified Play developer account on July 18, 2026. This is external Google Play Console compliance state, not an automated app black-box assertion. No outside-Play distribution key is currently in scope.

## Native billing QA impact map

Changes to these native billing bridge files require native black-box coverage updates in the same PR, or a short documented reason why black-box coverage does not need to change:

- `src/features/account/BillingActionsClient.tsx`
- `src/features/account/appleStoreKitActions.ts`
- `src/features/account/googlePlayPurchaseActions.ts`
- `src/lib/mobile/appleStoreKit.ts`
- `src/lib/mobile/googlePlayBilling.ts`
- `ios/App/App/AppleStoreKitPlugin.swift`
- `android/app/src/main/java/com/canyougeo/app/GooglePlayBillingPlugin.java`

The baseline billing flows are deliberately non-mutating. They may observe product labels, localized prices, safe unavailable states, sign-in boundaries, native store copy, and Stripe suppression. They must not tap purchase, restore, transaction finish, subscription management, Google Play acknowledgement, refund, revocation, cancellation, or any backend mutation path.

See [Native release guardrails](./NATIVE_RELEASE_GUARDRAILS.md) for the app policy behind these flows.

## Definition Of Done For Native QA Changes

- Maestro YAML syntax passes.
- Runner unit tests pass.
- Relevant native flows pass on installed Android and iOS builds, or a precise tooling/platform blocker is documented.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm build:native`, platform sync/build validation, and `git diff --check` pass before committing a baseline checkpoint.
