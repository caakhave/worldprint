# iOS StoreKit Sandbox Reconciliation Race Fix

This note records the sanitized production TestFlight sandbox finding from Checkpoint 6C-1A-CLEAN and the database-only fix.

## Finding

The clean monthly Apple sandbox purchase on physical TestFlight build `1.0.0 (9)` verified successfully for the selected Free QA account:

- Apple sandbox purchase verification was accepted and processed.
- One monthly Apple sandbox provider subscription was active/current and auto-renewing.
- One Apple sandbox monthly transaction chain was bound to the same Can You Geo account.
- The native sandbox entitlement projection was `pro/active`.
- The normal public entitlement row intentionally remained `free/free`.
- Stripe and Google Play provider state remained unchanged.

Two follow-up issues were identified:

1. The Apple reconciliation candidate helper compared active production-project sandbox Apple subscriptions to `public.entitlements`. That produced a false `entitlement_inconsistent` candidate because TestFlight/App Review sandbox purchases are intentionally projected to `billing.apple_native_sandbox_entitlements`, not to public website Pro.
2. A genuine Apple sandbox `SUBSCRIBED / INITIAL_BUY` notification arrived before client purchase verification had created the original-transaction chain. The notification was durably parked as `reconciliation_required` with `unbound_original_transaction`. The later direct purchase verification created the correct provider subscription, transaction chain, and native sandbox entitlement, but the earlier notification row remained unresolved.

No account identifiers, Apple transaction identifiers, signed payloads, purchase tokens, receipts, or credentials are recorded here.

## Fix

The migration `20260722233000_fix_apple_sandbox_reconciliation_race.sql` adds:

- an explicit deployment-mode overload for `billing.apple_subscription_reconciliation_candidates`;
- production-sandbox reconciliation against `billing.apple_native_sandbox_entitlements`;
- live production and staging sandbox reconciliation against `public.entitlements`;
- a compatibility wrapper that requires an explicit session deployment mode instead of inferring from project or host identifiers;
- a service-role-only repair helper for verified notification-first races.

The repair helper only resolves an earlier Apple notification row when all of these are true:

- the authenticated purchase verification has already succeeded without reconciliation or retry;
- the provider environment and deployment mode are allowed;
- the same original-transaction fingerprint now has a same-user Apple transaction chain;
- the same-user Apple provider subscription is current;
- the parked event is an Apple `notification:%` row, not a purchase-verification or TEST row;
- the parked event is still `reconciliation_required` with `unbound_original_transaction`;
- the parked event has no provider subscription and has no conflicting related user.

It does not replay Apple signed material, reassign ownership, repair ownership conflicts, update malformed events, create subscriptions, edit entitlements directly, or alter public website entitlement behavior.

## Expected Runtime Result

After deployment, one normal same-transaction Apple purchase re-verification may safely resolve the previously parked notification row while preserving:

- one active monthly Apple sandbox provider subscription;
- one bound monthly Apple sandbox transaction chain;
- one active native sandbox Pro entitlement;
- `public.entitlements` as `free/free`;
- no Stripe or Google Play state change.

The final runtime verification result should be recorded in the checkpoint report and issue tracker without storing private identifiers in Git.
