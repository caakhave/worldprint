# Native Black-Box QA Baseline

Can You Geo native black-box QA lives in `canyougeo-blackbox/native/maestro`. It complements the browser black-box suite by exercising installed Capacitor iOS and Android builds through device UI automation.

## Scope

- Runs locally with Maestro CLI only.
- Does not use Maestro Cloud, accounts, uploads, GTM Preview, or platform admin dashboards.
- Uses installed native builds with bundle/application ID `com.canyougeo.app`.
- Reuses existing local QA credentials from `canyougeo-blackbox/.env.local`, `canyougeo-blackbox/.env`, or the shell.

## Baseline Commands

```bash
pnpm qa:native:android:smoke
pnpm qa:native:android:interaction
pnpm qa:native:android:back
pnpm qa:native:android:deep-link
pnpm qa:native:android:auth
pnpm qa:native:android:guardrails
pnpm qa:native:ios:smoke
pnpm qa:native:ios:interaction
pnpm qa:native:ios:auth
pnpm qa:native:ios:guardrails
```

Use `pnpm qa:native:android:all` or `pnpm qa:native:ios:all` only after the individual flows are healthy.

## Credential Handling

The native runner accepts only:

- `CGY_FREE_EMAIL` / `CGY_FREE_PASSWORD`
- `CGY_PRO_EMAIL` / `CGY_PRO_PASSWORD`

It maps the selected pair to Maestro-only environment variables and never passes secret values in command-line arguments. Auth suites do not request Maestro screenshot/debug artifact directories. If auth fails, investigate manually before rerunning with a credential-bearing flow.

## Platform Notes

Android has production HTTPS App Link filters, so the Android deep-link flow verifies OS-delivered links for `https://canyougeo.com/play/` and a tokenless `/auth/callback/`.

iOS does not have Universal Link association or entitlement configuration yet. iOS flows use normal visible app navigation and auth persistence checks until that platform work exists.

The guardrail suites cover Browser-plugin social links, internal navigation, safe-area-visible controls, native billing boundaries, consent absence, and Android offline/reconnect behavior. Android guardrails use `adb` to toggle airplane mode plus Wi-Fi/data on the target emulator/device and then restore connectivity; they do not alter host-machine networking. iOS offline runtime testing remains optional unless it can be isolated safely.

See [Native release guardrails](./NATIVE_RELEASE_GUARDRAILS.md) for the app policy behind these flows.

## Definition Of Done For Native QA Changes

- Maestro YAML syntax passes.
- Runner unit tests pass.
- Relevant native flows pass on installed Android and iOS builds, or a precise tooling/platform blocker is documented.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm build:native`, platform sync/build validation, and `git diff --check` pass before committing a baseline checkpoint.
