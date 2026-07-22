import type { ApplePurchaseVerificationRow } from "./appleAppStore.ts";

export type ApplePurchaseVerificationDispositionKind =
  | "accepted"
  | "account_conflict"
  | "permanent_rejection"
  | "retryable_failure";

export type ApplePurchaseVerificationDisposition = {
  kind: ApplePurchaseVerificationDispositionKind;
  accepted: boolean;
  httpStatus: number;
  error: string | null;
  code: string | null;
  clientMayFinishTransaction: boolean;
};

type ApplePurchaseVerificationDispositionInput = Pick<
  ApplePurchaseVerificationRow,
  | "result"
  | "processed"
  | "already_processed"
  | "provider_subscription_changed"
  | "compatibility_refreshed"
  | "native_review_entitlement_refreshed"
  | "entitlement_scope"
  | "reconciliation_required"
  | "retryable"
>;

const ACCOUNT_CONFLICT_RESULTS = new Set([
  "account_conflict",
  "app_account_token_mismatch",
  "deleted_account_original_transaction_conflict",
  "ownership_conflict"
]);

const PERMANENT_REJECTION_RESULTS = new Set([
  "app_id_mismatch",
  "bundle_mismatch",
  "environment_conflict",
  "environment_mismatch",
  "invalid_app_account_token",
  "invalid_deployment_environment",
  "invalid_original_transaction_id",
  "invalid_provider_environment",
  "invalid_subscription_notification",
  "invalid_subscription_state",
  "invalid_transaction_id",
  "missing_normalized_subscription",
  "missing_original_transaction_id",
  "payload_conflict",
  "product_conflict",
  "provider_environment_conflict",
  "renewal_environment_mismatch",
  "renewal_original_transaction_mismatch",
  "renewal_product_unsupported",
  "unsupported_product",
  "unknown_subscription_state"
]);

export function applePurchaseVerificationDisposition(
  row: ApplePurchaseVerificationDispositionInput
): ApplePurchaseVerificationDisposition {
  const result = normalizeResult(row.result);

  if (isAccountConflictResult(result)) {
    return accountConflict();
  }
  if (row.retryable) {
    return retryableFailure();
  }
  if (row.reconciliation_required) {
    return permanentRejection("apple_purchase_reconciliation_required");
  }
  if (isPermanentRejectionResult(result)) {
    return permanentRejection("apple_purchase_rejected");
  }
  if (!row.processed && !row.already_processed) {
    return permanentRejection("apple_purchase_rejected");
  }
  if (row.already_processed && !row.processed && !hasIdempotentAcceptanceSignal(row)) {
    return permanentRejection("apple_purchase_rejected");
  }

  return {
    kind: "accepted",
    accepted: true,
    httpStatus: 200,
    error: null,
    code: null,
    clientMayFinishTransaction: true
  };
}

function hasIdempotentAcceptanceSignal(row: ApplePurchaseVerificationDispositionInput): boolean {
  return (
    row.provider_subscription_changed ||
    row.compatibility_refreshed ||
    row.native_review_entitlement_refreshed ||
    row.entitlement_scope === "live" ||
    row.entitlement_scope === "native_review"
  );
}

function normalizeResult(result: string): string {
  return result.trim().toLowerCase();
}

function isAccountConflictResult(result: string): boolean {
  return ACCOUNT_CONFLICT_RESULTS.has(result) || result.endsWith("_ownership_conflict") || result.endsWith("_account_conflict");
}

function isPermanentRejectionResult(result: string): boolean {
  if (PERMANENT_REJECTION_RESULTS.has(result)) return true;
  return (
    result.includes("payload_conflict") ||
    result.includes("environment_mismatch") ||
    result.includes("environment_conflict") ||
    result.includes("invalid_deployment") ||
    result.includes("invalid_subscription") ||
    result.includes("product_conflict")
  );
}

function accountConflict(): ApplePurchaseVerificationDisposition {
  return {
    kind: "account_conflict",
    accepted: false,
    httpStatus: 409,
    error: "This Apple subscription is linked to another Can You Geo account.",
    code: "apple_purchase_account_conflict",
    clientMayFinishTransaction: false
  };
}

function permanentRejection(code: string): ApplePurchaseVerificationDisposition {
  return {
    kind: "permanent_rejection",
    accepted: false,
    httpStatus: 409,
    error: "Apple purchase could not be verified.",
    code,
    clientMayFinishTransaction: false
  };
}

function retryableFailure(): ApplePurchaseVerificationDisposition {
  return {
    kind: "retryable_failure",
    accepted: false,
    httpStatus: 503,
    error: "Apple purchase verification is unavailable.",
    code: "apple_purchase_retryable_failure",
    clientMayFinishTransaction: false
  };
}
