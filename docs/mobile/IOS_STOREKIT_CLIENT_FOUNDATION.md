# Can You Geo iOS StoreKit Client Foundation

Checkpoint 5D-1D-IOS-STOREKIT adds the signed-in iOS StoreKit client foundation for the existing staging Apple server endpoints. It does not initiate a purchase, upload TestFlight, mutate App Store Connect, touch production Supabase, or change Stripe.

## Build Identity

- Bundle ID: `com.canyougeo.app`.
- Apple Team ID: `G5N5U6QFS8`.
- Marketing version: `1.0.0`.
- iOS build number: `2`.
- Android package/versioning is unchanged by this checkpoint.

## Products

The iOS client allows only these Apple subscription product IDs:

- `com.canyougeo.pro.monthly`
- `com.canyougeo.pro.annual`

Both products belong to the approved `Can You Geo Pro` subscription group. The local StoreKit configuration at `ios/App/App/CanYouGeo.storekit` contains only those two products, no offers, no trials, and no Family Sharing.

## Client Flow

1. The signed-in web UI requests a native StoreKit purchase or restore through the first-party Capacitor plugin `AppleStoreKit`.
2. The Swift plugin calls the authenticated staging `apple-purchase-context` endpoint and receives the backend-issued `appAccountToken` internally.
3. The Swift plugin starts StoreKit 2 with `Product.PurchaseOption.appAccountToken`.
4. The Swift plugin locally verifies the StoreKit transaction result.
5. The Swift plugin submits the signed transaction material directly to `apple-purchase-verify`.
6. JavaScript receives only a sanitized backend-verification status.
7. JavaScript refreshes the authoritative Supabase entitlement row.
8. Only after the entitlement row reads Pro does JavaScript call `finishVerifiedTransactions`.

The JavaScript bridge types do not expose signed JWS payloads, transaction IDs, original transaction IDs, StoreKit receipts, Apple account details, or app account tokens.

## Runtime Behavior

- Signed-out users are routed to sign in before any Apple purchase can begin.
- Product buttons use StoreKit localized display prices.
- `Transaction.updates`, `Transaction.unfinished`, and `Transaction.currentEntitlements` are observed or checked for update and restore recovery.
- Restore Purchases is signed-in and explicit.
- Apple subscription management is available only after an Apple purchase or restore has been verified in the current session.
- Existing Pro access remains backend-authoritative. StoreKit local verification never grants Pro directly.

## Boundaries

- iOS native builds use Apple In-App Purchase only.
- Android native builds continue to use Google Play Billing only.
- Browser builds continue to use Stripe.
- Native iOS does not open Stripe Checkout or Stripe Customer Portal.
- No Apple purchase, subscription, credential, notification, Supabase mutation, Stripe mutation, TestFlight upload, App Store Connect mutation, production rollout, trial, offer, or Family Sharing change is performed by this checkpoint.

## Validation Notes

Before TestFlight upload, rerun the native staging export, Capacitor iOS sync, Xcode build, StoreKit product-loading smoke, no-secret scan, and native no-Stripe guardrails from the exact protected staging merge commit.
