# Android Play 1.0.2 Code 4 Provenance

Last updated: 2026-07-22

## Audited Local Intended Closed-Testing Artifact

- Package ID: `com.canyougeo.app`
- Version name: `1.0.2`
- Version code: `4`
- AAB filename: `app-release.aab`
- AAB SHA-256: `a7fdcf07f2604d8d27ddd566f49dc7aa22d05cf5fc40b27e283066ca582d12bc`
- Signing certificate SHA-256: `7E:32:86:C0:69:2D:8C:DE:98:CC:20:05:93:79:7B:3C:6A:DD:D6:F9:4F:D7:94:4C:A6:E5:4E:26:3B:C4:4E:0E`
- Original recorded source HEAD: `16d7ed41`
- Reconciliation commit SHA: `461ccce414a897389cbb7385e22bdb86ed64f020`
- Google Play bundle-library status: not yet accepted into the Google Play bundle library.
- Play upload status: upload blocked pending reset-certificate activation at `2026-07-23T16:11:28Z`.
- Intended track: Closed testing after the upload is accepted and the release is explicitly submitted.

## Reconciliation Note

The audited local Android App Bundle is recorded as `1.0.2` with `versionCode` 4, while its release receipt referenced source HEAD `16d7ed41`, which still declared `versionCode` 3. The artifact therefore appears to have been built with an uncommitted metadata-only `versionCode` 4 bump.

This receipt records the protected-source reconciliation so the repository metadata matches the intended closed-testing artifact without rebuilding, re-signing, replacing, or uploading an Android bundle.

## Current Play Evidence

Manual Play Console evidence on 2026-07-22 established that the app-bundle
library currently contains only:

- `versionCode` 1 / `versionName` 1.0
- `versionCode` 2 / `versionName` 1.0.1

The code-4 artifact has not been accepted into Google Play, is not available
through Internal testing or Closed testing, and must be retried manually after
the replacement upload certificate is active.
