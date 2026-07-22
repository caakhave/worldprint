import { describe, expect, it } from "vitest";
import { applePurchaseVerificationDisposition } from "./applePurchaseVerificationDisposition";
import type { ApplePurchaseVerificationRow } from "./appleAppStore";

const acceptedNativeReviewRow: ApplePurchaseVerificationRow = {
  result: "processed",
  provider_environment: "sandbox",
  event_type: "purchase_verification",
  event_subtype: null,
  processed: true,
  already_processed: false,
  provider_subscription_changed: true,
  compatibility_refreshed: false,
  native_review_entitlement_refreshed: true,
  entitlement_scope: "native_review",
  reconciliation_required: false,
  retryable: false
};

describe("applePurchaseVerificationDisposition", () => {
  it("rejects processed ownership conflicts without client finish permission", () => {
    const disposition = applePurchaseVerificationDisposition({
      ...acceptedNativeReviewRow,
      result: "ownership_conflict",
      processed: true,
      reconciliation_required: true,
      native_review_entitlement_refreshed: false,
      entitlement_scope: "none"
    });

    expect(disposition).toMatchObject({
      kind: "account_conflict",
      accepted: false,
      httpStatus: 409,
      code: "apple_purchase_account_conflict",
      clientMayFinishTransaction: false
    });
  });

  it("rejects already-processed rows that remain reconciliation-required", () => {
    const disposition = applePurchaseVerificationDisposition({
      ...acceptedNativeReviewRow,
      result: "already_processed",
      processed: false,
      already_processed: true,
      reconciliation_required: true,
      native_review_entitlement_refreshed: false,
      entitlement_scope: "none"
    });

    expect(disposition).toMatchObject({
      kind: "permanent_rejection",
      accepted: false,
      httpStatus: 409,
      clientMayFinishTransaction: false
    });
  });

  it("keeps retryable failures unavailable without client finish permission", () => {
    expect(
      applePurchaseVerificationDisposition({
        ...acceptedNativeReviewRow,
        result: "rpc_failed",
        processed: false,
        retryable: true
      })
    ).toMatchObject({
      kind: "retryable_failure",
      accepted: false,
      httpStatus: 503,
      clientMayFinishTransaction: false
    });
  });

  it("accepts newly processed native-review purchases", () => {
    expect(applePurchaseVerificationDisposition(acceptedNativeReviewRow)).toMatchObject({
      kind: "accepted",
      accepted: true,
      httpStatus: 200,
      clientMayFinishTransaction: true
    });
  });

  it("accepts idempotent same-owner replays only when no reconciliation remains", () => {
    expect(
      applePurchaseVerificationDisposition({
        ...acceptedNativeReviewRow,
        result: "already_processed",
        processed: false,
        already_processed: true,
        provider_subscription_changed: false,
        reconciliation_required: false
      })
    ).toMatchObject({
      kind: "accepted",
      accepted: true,
      httpStatus: 200,
      clientMayFinishTransaction: true
    });
  });

  it("rejects already-processed rows that have no same-account acceptance signal", () => {
    expect(
      applePurchaseVerificationDisposition({
        ...acceptedNativeReviewRow,
        result: "already_processed",
        processed: false,
        already_processed: true,
        provider_subscription_changed: false,
        compatibility_refreshed: false,
        native_review_entitlement_refreshed: false,
        entitlement_scope: "none",
        reconciliation_required: false
      })
    ).toMatchObject({
      kind: "permanent_rejection",
      accepted: false,
      httpStatus: 409,
      clientMayFinishTransaction: false
    });
  });

  it("rejects permanent payload, environment, and subscription-state conflicts", () => {
    for (const result of ["payload_conflict", "invalid_deployment_environment", "invalid_subscription_state"]) {
      expect(
        applePurchaseVerificationDisposition({
          ...acceptedNativeReviewRow,
          result,
          processed: false
        })
      ).toMatchObject({
        kind: "permanent_rejection",
        accepted: false,
        httpStatus: 409,
        clientMayFinishTransaction: false
      });
    }
  });
});
