# Android Internal Release

Checkpoint 5D-1C prepares the first Google Play internal-testing bundle for package `com.canyougeo.app`. The source of truth is the staging branch after PR #29.

## Version

- Package: `com.canyougeo.app`
- Version code: `1`
- Version name: `1.0.0`
- Minimum SDK: `24`
- Compile SDK: `36`
- Target SDK: `36`

Version code `1` is valid only for the first Play artifact. If Play Console shows any prior accepted artifact, use an integer greater than the greatest uploaded version code before building the final AAB.

## Native Export Boundary

`pnpm build:native` sets:

```text
NEXT_PUBLIC_CGY_NATIVE_APP=1
NEXT_PUBLIC_CGY_NATIVE_HOSTED_ORIGIN=https://canyougeo.com
NEXT_PUBLIC_BILLING_MODE=disabled
NEXT_PUBLIC_ANALYTICS_ENABLED=false
```

Native exports must not configure a Capacitor `server.url`. The bundled app should keep Stripe checkout, Stripe customer portal, Google Play Billing, GTM, GA4, and marketing pixels unavailable until their dedicated release checkpoints.

The internal-testing AAB must use a verified nonproduction backend before upload. Provide only approved public Supabase staging values through existing public env vars:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_SITE_URL
```

Do not bundle service-role keys, database URLs, database passwords, Stripe secrets, or any server-only credential.

## Upload Signing

Google Play App Signing should manage the distributed app-signing key. The local Can You Geo key is only the upload key.

Release signing is read from environment variables at build time:

```text
CGY_ANDROID_UPLOAD_STORE_FILE
CGY_ANDROID_UPLOAD_STORE_PASSWORD
CGY_ANDROID_UPLOAD_KEY_ALIAS
CGY_ANDROID_UPLOAD_KEY_PASSWORD
```

Release Gradle tasks fail if any signing input is missing. Debug builds remain unchanged. Do not use the Android debug keystore for release signing.

Keep the upload keystore outside the repository in a user-private config or secrets directory. The directory should be owner-only, and the keystore should be owner-read/write only. Keep an encrypted primary backup and an encrypted secondary backup. Store passwords in the user's password manager, never alongside an unencrypted keystore.

Do not commit:

- keystores
- exported certificates
- signing-property files
- signing passwords
- absolute private-machine paths
- AAB/APK/APKS artifacts
- Play Console evidence
- tester email lists

## Build Commands

From the exact staging-based release commit:

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm lint
pnpm typecheck
pnpm build
pnpm build:native
pnpm mobile:sync:android
pnpm exec cap doctor android
git diff --check
cd android
./gradlew clean bundleRelease
```

Expected local artifact:

```text
android/app/build/outputs/bundle/release/app-release.aab
```

The AAB is a local artifact and must not be committed.

## Play Console Gates

Before upload, manually confirm:

- Play Console developer registration is active.
- App creation is permitted for the account.
- No duplicate app record exists for `com.canyougeo.app`.
- The app name is `Can You Geo`.
- The app is a free game download.
- Play App Signing is enabled or ready to enroll.
- The upload certificate shown by Play matches the local upload key certificate.

Upload only a signed AAB to internal testing. Do not upload a debug APK. Do not start closed testing, open testing, or production rollout in this checkpoint.

## App Links Follow-Up

The production Android App Links association will later need the Google Play App Signing certificate SHA-256 fingerprint, not only the local upload-key fingerprint. Capture the Play App Signing fingerprint privately after Play enrollment, but do not update production `assetlinks.json` in this checkpoint.

## Current Status

PR #29 promoted the Android foundation and runtime-hardening work to staging. Release-signing support is source-controlled, but the final signed AAB and Play upload remain gated on:

- verified staging backend public env
- secure upload-key creation or approved reuse
- user-controlled Play Console app-record verification
- Play App Signing enrollment
- internal-testing upload and processing
