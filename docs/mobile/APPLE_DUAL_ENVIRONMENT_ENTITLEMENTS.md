# Apple Dual-Environment Entitlements

Checkpoint 5D-2A2 replaces the single Apple environment switch with a dual-environment server foundation. The same Apple backend can verify sandbox transactions for TestFlight and App Review, then verify production transactions for live App Store customers without changing the submitted binary.

## Configuration

Required server-only Apple configuration:

- `APPLE_ALLOWED_ENVIRONMENTS`: comma-separated allowlist using only `sandbox` and `production`.
- `APPLE_DEPLOYMENT_MODE`: `staging` or `production`.
- `APPLE_APP_STORE_ISSUER_ID`, `APPLE_APP_STORE_KEY_ID`, `APPLE_APP_STORE_PRIVATE_KEY`, `APPLE_BUNDLE_ID`, and `APPLE_APP_ID`.

`APPLE_ENVIRONMENT` is deprecated for Apple purchase verification and notifications. It no longer represents the verified transaction environment and should not be used for release switching.

## Environment Policy

| Deployment | Apple payload | Result |
| --- | --- | --- |
| Staging | Sandbox | Provider rows are written and staging QA may refresh `public.entitlements`. |
| Staging | Production | Fails closed as an invalid deployment/environment combination. |
| Production | Sandbox | Provider rows are written, but live `public.entitlements` is not updated. A private Apple sandbox review entitlement projection is updated instead. |
| Production | Production | Provider rows are written and live `public.entitlements` is refreshed. |

The server derives the Apple environment from verified Apple-signed transaction, renewal, notification, and status payloads. The client never supplies the trusted environment.

## TestFlight and App Review

TestFlight and App Review purchases use Apple sandbox transactions. In production deployment mode, a verified sandbox purchase can unlock Pro only inside the signed native iOS app through the native review entitlement lane.

That access:

- is bound to the authenticated Can You Geo user and verified Apple transaction chain;
- is activated in the app only after backend verification;
- survives in-app navigation through a memory-only native entitlement overlay;
- is recovered on a fresh launch only when StoreKit `Transaction.currentEntitlements` or Restore supplies Apple-signed state that the backend verifies again;
- expires or clears when Apple no longer reports an active sandbox entitlement.

It does not:

- write the normal live `public.entitlements` row in production;
- grant Pro on canyougeo.com;
- grant Pro to a live App Store runtime without StoreKit production verification;
- require manual provider-row or entitlement cleanup before release.

## Notifications

The App Store Server Notifications V2 endpoint accepts sandbox and production notifications after JWS verification. Configure the Sandbox Server URL during TestFlight/App Review validation. Configure the Production Server URL only after the dual-environment production migration, secrets, and functions are deployed.

TEST notifications create provider-event evidence only. They do not create provider subscriptions, transaction chains, reconciliation candidates, or entitlement changes.

## Rollout Order

1. Merge the source through protected staging.
2. Apply the dual-environment migration to staging only.
3. Deploy `apple-purchase-context`, `apple-purchase-verify`, and `apple-app-store-notifications` to staging.
4. Set staging Apple secrets with `APPLE_ALLOWED_ENVIRONMENTS=sandbox` and `APPLE_DEPLOYMENT_MODE=staging`.
5. Validate sandbox purchase verification, Restore/current-entitlement resync, and notifications on staging.
6. Promote source through protected main.
7. Stop before production migration/function/secret deployment until the Apple-only production rollout checkpoint.

## Production Prerequisites

Before iOS App Review or live release, production must receive only the Apple production backend rollout:

- Apply the Apple dual-environment migration.
- Deploy the three Apple functions.
- Set `APPLE_ALLOWED_ENVIRONMENTS=sandbox,production`.
- Set `APPLE_DEPLOYMENT_MODE=production`.
- Configure Apple Sandbox Server URL to the production notification endpoint for App Review.
- Configure Apple Production Server URL before manual live release.

Google Play production billing remains deferred and must not be included in the immediate iOS production rollout.

## Rollback

If production Apple rollout is paused before live release, leave production App Store Server Notification URL blank and do not submit/ship a build that depends on Apple production purchases. If the dual-environment functions must be rolled back, disable Apple purchase entry points first so StoreKit transactions are not initiated without a compatible verifier.
