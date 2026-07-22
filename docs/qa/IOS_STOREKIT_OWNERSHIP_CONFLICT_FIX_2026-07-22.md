# iOS StoreKit Ownership Conflict Fix - 2026-07-22

This note records the sanitized ownership-conflict finding from the first controlled iOS monthly sandbox purchase on TestFlight build `1.0.0 (9)`.

## Finding

- The Apple sandbox monthly purchase completed successfully in Apple's purchase sheet.
- The selected Can You Geo account remained `free/free`.
- The backend correctly detected that the Apple original transaction chain was already bound to another Can You Geo account.
- No provider subscription, Apple transaction chain, native sandbox entitlement, or public entitlement was created for the selected account.
- No Stripe or Google Play state changed.
- The ownership boundary behaved correctly and must not be weakened.

## Response Defect

`apple-purchase-verify` used only `processed` and `already_processed` to decide whether to return success semantics to the native client. A durable ownership-conflict row can include processed evidence while also requiring reconciliation, so the endpoint could return success-style fields for a rejected transaction.

The incorrect success semantics were:

- HTTP `200`
- `ok: true`
- `clientMayFinishTransaction: true`
- possible native review entitlement guidance

Those fields are valid only after the durable processor accepts the transaction for the signed-in account.

## Corrected Contract

The purchase verification response now classifies each processor row before returning to the native client.

Accepted responses require all of the following:

- `processed = true` or `already_processed = true`
- `reconciliation_required = false`
- `retryable = false`
- no ownership, account-token, payload, product, subscription-state, or environment conflict result
- for idempotent `already_processed` rows, a same-account acceptance signal such as refreshed live/native entitlement scope or provider-subscription ownership

Rejected ownership conflicts return:

- HTTP `409`
- safe account-conflict error code
- no `ok: true`
- no native review entitlement
- no client transaction-finish permission

Retryable failures return HTTP `503` and no client transaction-finish permission.

Native-review entitlement guidance is returned only after the native-review entitlement projection was actually refreshed by the server-side processor and the verified Apple state grants active Pro access.

## Same-Transaction Regression Gate

After the protected source change is deployed to production, the already-existing unfinished/current sandbox transaction should be exercised once through the normal client path:

1. Keep the same Can You Geo QA account signed in.
2. Fully close Can You Geo.
3. Relaunch TestFlight build `1.0.0 (9)` once.
4. Allow normal unfinished/current-entitlement synchronization.

Expected result:

- `apple-purchase-verify` returns HTTP `409`.
- Swift maps the response to `accountConflict`.
- The app remains Free.
- The transaction is not finished.
- No provider subscription is created for the selected account.
- No native sandbox entitlement is granted.
- `public.entitlements` remains `free/free`.
- Stripe and Google Play state remain unchanged.

The checkpoint report and GitHub issue #41 should record the sanitized runtime result after the controlled re-verification. Do not include Apple transaction identifiers, app account tokens, signed material, user UUIDs, emails, sandbox tester identities, or raw provider rows.

## Remaining Clean Purchase Requirement

A later controlled continuation still requires a truly unused Apple Sandbox Account with no prior Can You Geo subscription history before attempting a clean monthly purchase. Do not clear the existing Sandbox Apple Account's purchase history automatically, and do not cancel, refund, revoke, reassign, or manually grant any entitlement for the conflict transaction.
