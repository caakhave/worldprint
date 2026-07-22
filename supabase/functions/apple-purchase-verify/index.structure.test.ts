import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "supabase/functions/apple-purchase-verify/index.ts"), "utf8");
const config = readFileSync(join(process.cwd(), "supabase/config.toml"), "utf8");

describe("apple-purchase-verify Edge Function structure", () => {
  it("is JWT protected and verifies Apple state before the private RPC bridge", () => {
    expect(config).toContain("[functions.apple-purchase-verify]");
    expect(config).toContain("verify_jwt = true");
    expect(source).toContain("getSignedInUser(request, config)");
    expect(source).toContain("verifyAppleSignedTransactionSet");
    expect(source).toContain("appleEnvironmentFromPayload(clientVerified.transaction.environment)");
    expect(source).toContain("fetchAppleSubscriptionStatuses");
    expect(source).toContain("environment: transactionEnvironment");
    expect(source).toContain("normalizeVerifiedAppleStatusResponse");
    expect(source).toContain("expectedEnvironment: transactionEnvironment");
    expect(source).toContain("deploymentMode: config.deploymentMode");
    expect(source).toContain("applePurchaseVerificationTransitionInput");
    expect(source).toContain("processApplePurchaseVerification");
    expect(source).toContain("applePurchaseVerificationDisposition(row)");
    expect(source.indexOf("const statusResponse = await fetchAppleSubscriptionStatuses")).toBeLessThan(
      source.indexOf("const row = await processApplePurchaseVerification")
    );
    expect(source.indexOf("const disposition = applePurchaseVerificationDisposition(row)")).toBeLessThan(source.indexOf("ok: true"));
  });

  it("does not return signed payloads, transaction ids, account tokens, credentials, or user ids", () => {
    expect(source).toContain("clientMayFinishTransaction");
    expect(source).toContain("nativeReviewEntitlement");
    expect(source).not.toMatch(/json\([^)]*signedTransactionInfo|json\([^)]*originalTransactionId|json\([^)]*transactionId|json\([^)]*appAccountToken|json\([^)]*privateKey|json\([^)]*user\.id/is);
    expect(source).not.toMatch(/console\.(?:log|warn|error)\([^)]*signedTransactionInfo|console\.(?:log|warn|error)\([^)]*transactionId|console\.(?:log|warn|error)\([^)]*privateKey/is);
  });

  it("prevents reconciliation-required rows from reaching success or native-review entitlement responses", () => {
    expect(source).toContain("if (!disposition.accepted)");
    expect(source).toContain("disposition.httpStatus");
    expect(source).not.toContain("if (!row.processed && !row.already_processed)");
    expect(source).not.toContain("clientMayFinishTransaction: row.processed || row.already_processed");
    expect(source).toContain("row.native_review_entitlement_refreshed");
    expect(source.indexOf("if (!disposition.accepted)")).toBeLessThan(source.indexOf("nativeReviewEntitlement:"));
  });

  it("separates StoreKit verification retry attempts without exposing raw Apple identifiers", () => {
    const eventRefTemplate = source.match(/sourceEventRef:\s*`([^`]+)`/u)?.[1] ?? "";
    expect(source).toContain("payloadHash.slice(0, 16)");
    expect(eventRefTemplate).toContain("originalTransactionIdFingerprint");
    expect(eventRefTemplate).toContain("transactionIdFingerprint.slice(-16)");
    expect(eventRefTemplate).toContain("payloadHash.slice(0, 16)");
    expect(eventRefTemplate).not.toMatch(/originalTransactionId\}|transactionId\}|signedTransactionInfo|signedRenewalInfo|user\.id|appAccountToken/u);
  });
});
