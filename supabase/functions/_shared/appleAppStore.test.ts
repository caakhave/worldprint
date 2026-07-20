import { describe, expect, it } from "vitest";
import {
  APPLE_ANNUAL_PRODUCT_ID,
  APPLE_BUNDLE_ID,
  APPLE_MONTHLY_PRODUCT_ID,
  APPLE_PURCHASE_VERIFICATION_RPC_ARG_KEYS,
  APPLE_SERVER_NOTIFICATION_RPC_ARG_KEYS,
  AppleAppStoreError,
  appleAppAccountTokenForUser,
  appleIdentifierFingerprint,
  appleNotificationTransitionInput,
  appleProductIds,
  applePurchaseVerificationTransitionInput,
  appleProviderProductRef,
  normalizeAppleSubscription,
  parseApplePurchaseVerifyBody,
  processApplePurchaseVerification,
  processAppleServerNotification,
  providerStatusForAppleState,
  verifyAppleSignedJws,
  type AppleNotificationTransitionRow,
  type ApplePurchaseVerificationRow,
  type AppleServerConfig
} from "./appleAppStore";

const USER_ID = "11111111-2222-4333-8444-555555555555";

const config: Pick<AppleServerConfig, "bundleId" | "appAppleId" | "environment"> = {
  bundleId: APPLE_BUNDLE_ID,
  appAppleId: "6791248782",
  environment: "sandbox"
};

const processedRow: ApplePurchaseVerificationRow = {
  result: "processed",
  provider_environment: "sandbox",
  event_type: "purchase_verification",
  event_subtype: null,
  processed: true,
  already_processed: false,
  provider_subscription_changed: true,
  compatibility_refreshed: true,
  reconciliation_required: false,
  retryable: false
};

describe("Apple App Store server helpers", () => {
  it("uses the approved Can You Geo product allowlist and backend-issued UUID appAccountToken", () => {
    expect(appleProductIds()).toEqual([APPLE_MONTHLY_PRODUCT_ID, APPLE_ANNUAL_PRODUCT_ID]);
    expect(appleProviderProductRef(APPLE_MONTHLY_PRODUCT_ID)).toBe("com.canyougeo.app:com.canyougeo.pro.monthly");
    expect(appleProviderProductRef(APPLE_ANNUAL_PRODUCT_ID)).toBe("com.canyougeo.app:com.canyougeo.pro.annual");
    expect(appleAppAccountTokenForUser(USER_ID)).toBe(USER_ID);
    expect(() => appleAppAccountTokenForUser("support@canyougeo.com")).toThrow(AppleAppStoreError);
  });

  it("accepts only signed transaction material from the future StoreKit client", () => {
    const signedTransactionInfo = fakeCompactJws({ productId: APPLE_MONTHLY_PRODUCT_ID });
    const signedRenewalInfo = fakeCompactJws({ productId: APPLE_MONTHLY_PRODUCT_ID });
    expect(
      parseApplePurchaseVerifyBody({
        contentType: "application/json",
        bodyText: JSON.stringify({ signedTransactionInfo, signedRenewalInfo })
      })
    ).toMatchObject({ body: { signedTransactionInfo, signedRenewalInfo }, error: null });

    expect(
      parseApplePurchaseVerifyBody({
        contentType: "application/json",
        bodyText: JSON.stringify({ transactionId: "2000000000000000", clientProductId: APPLE_MONTHLY_PRODUCT_ID })
      })
    ).toMatchObject({ body: null, error: "invalid_signed_transaction" });
  });

  it("fails closed when a JWS has no Apple certificate chain", async () => {
    await expect(verifyAppleSignedJws(fakeCompactJws({ productId: APPLE_MONTHLY_PRODUCT_ID }))).rejects.toMatchObject({
      result: "missing_jws_certificate_chain"
    });
  });

  it("normalizes active, canceled, grace, retry, expired, refunded, and revoked Apple states", () => {
    const asOf = "2026-07-18T20:00:00.000Z";
    const future = "2026-08-18T20:00:00.000Z";

    expect(providerStatusForAppleState({ appleStatus: 1, notificationType: "SUBSCRIBED", autoRenewStatus: 1, expiresDate: future, revocationDate: null, gracePeriodExpiresDate: null, inBillingRetry: false, asOfIso: asOf })).toMatchObject({
      status: "active",
      currentPeriodEnd: future
    });
    expect(providerStatusForAppleState({ appleStatus: 1, notificationType: "DID_CHANGE_RENEWAL_STATUS", autoRenewStatus: 0, expiresDate: future, revocationDate: null, gracePeriodExpiresDate: null, inBillingRetry: false, asOfIso: asOf })).toMatchObject({
      status: "cancelled_active_until_period_end",
      currentPeriodEnd: future
    });
    expect(providerStatusForAppleState({ appleStatus: 4, notificationType: "DID_FAIL_TO_RENEW", autoRenewStatus: 1, expiresDate: future, revocationDate: null, gracePeriodExpiresDate: future, inBillingRetry: false, asOfIso: asOf })).toMatchObject({
      status: "grace_period",
      gracePeriodEndsAt: future
    });
    expect(providerStatusForAppleState({ appleStatus: 3, notificationType: "DID_FAIL_TO_RENEW", autoRenewStatus: 1, expiresDate: future, revocationDate: null, gracePeriodExpiresDate: null, inBillingRetry: true, asOfIso: asOf })).toMatchObject({
      status: "billing_retry",
      reconciliationStatus: "needs_verification"
    });
    expect(providerStatusForAppleState({ appleStatus: 2, notificationType: "EXPIRED", autoRenewStatus: 0, expiresDate: future, revocationDate: null, gracePeriodExpiresDate: null, inBillingRetry: false, asOfIso: asOf })).toMatchObject({
      status: "expired",
      expiresAt: future
    });
    expect(providerStatusForAppleState({ appleStatus: null, notificationType: "REFUND", autoRenewStatus: null, expiresDate: null, revocationDate: asOf, gracePeriodExpiresDate: null, inBillingRetry: false, asOfIso: asOf })).toMatchObject({
      status: "refunded",
      refundedAt: asOf
    });
    expect(providerStatusForAppleState({ appleStatus: 5, notificationType: "REVOKE", autoRenewStatus: null, expiresDate: null, revocationDate: asOf, gracePeriodExpiresDate: null, inBillingRetry: false, asOfIso: asOf })).toMatchObject({
      status: "revoked",
      revokedAt: asOf
    });
    expect(providerStatusForAppleState({ appleStatus: null, notificationType: "RENEWAL_EXTENDED", autoRenewStatus: 1, expiresDate: future, revocationDate: null, gracePeriodExpiresDate: null, inBillingRetry: false, asOfIso: asOf })).toMatchObject({
      status: "active",
      currentPeriodEnd: future
    });
  });

  it("builds sanitized Apple provider transition args and rejects account-token conflicts", async () => {
    const normalized = await normalizeAppleSubscription({
      transaction: transactionPayload({ productId: APPLE_MONTHLY_PRODUCT_ID, appAccountToken: USER_ID }),
      renewalInfo: renewalPayload({ autoRenewStatus: 1 }),
      status: 1,
      config,
      asOfIso: "2026-07-18T20:00:00.000Z"
    });

    expect(normalized.error).toBeNull();
    const args = await applePurchaseVerificationTransitionInput({
      normalized: normalized.normalized!,
      userId: USER_ID,
      sourceEventRef: "verify:synthetic",
      payloadHash: "a".repeat(64),
      asOfIso: "2026-07-18T20:00:00.000Z"
    });

    expect(args).toMatchObject({
      p_provider_environment: "sandbox",
      p_user_id: USER_ID,
      p_user_ref_fingerprint: expect.stringMatching(/^user_uuid_sha256_[a-f0-9]{64}$/),
      p_provider_product_ref: "com.canyougeo.app:com.canyougeo.pro.monthly",
      p_provider_status: "active",
      p_original_transaction_id_fingerprint: expect.stringMatching(/^apple_original_transaction_sha256_[a-f0-9]{64}$/),
      p_transaction_id_fingerprint: expect.stringMatching(/^apple_transaction_sha256_[a-f0-9]{64}$/)
    });
    expect(args.p_provider_event_ref).not.toContain("2000000000000000");
    expect(args.p_provider_event_ref).not.toContain(USER_ID);
    expect(args.p_original_transaction_id_fingerprint).not.toContain("2000000000000000");
    expect(sortedKeys(args)).toEqual(sortedKeys(APPLE_PURCHASE_VERIFICATION_RPC_ARG_KEYS));
    expectNoUndefinedRpcArgs(args);

    const conflict = await normalizeAppleSubscription({
      transaction: transactionPayload({ productId: APPLE_MONTHLY_PRODUCT_ID, appAccountToken: "22222222-2222-4333-8444-555555555555" }),
      renewalInfo: renewalPayload({ autoRenewStatus: 1 }),
      status: 1,
      config,
      asOfIso: "2026-07-18T20:00:00.000Z"
    });
    await expect(
      applePurchaseVerificationTransitionInput({
        normalized: conflict.normalized!,
        userId: USER_ID,
        sourceEventRef: "verify:synthetic",
        payloadHash: "a".repeat(64),
        asOfIso: "2026-07-18T20:00:00.000Z"
      })
    ).rejects.toMatchObject({ result: "app_account_token_mismatch" });
  });

  it("builds exact TEST Apple server-notification RPC args without purchase-only user fields", async () => {
    const signedDate = 1784404800000;
    const args = await appleNotificationTransitionInput({
      normalized: null,
      notification: {
        notificationType: "TEST",
        notificationUUID: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
        signedDate
      },
      payloadHash: "b".repeat(64),
      asOfIso: "2026-07-18T20:00:00.000Z"
    });

    expect(sortedKeys(args)).toEqual(sortedKeys(APPLE_SERVER_NOTIFICATION_RPC_ARG_KEYS));
    expect(args).not.toHaveProperty("p_user_id");
    expect(args).not.toHaveProperty("p_user_ref_fingerprint");
    expectNoUndefinedRpcArgs(args);
    expect(args).toMatchObject({
      p_provider_environment: "sandbox",
      p_provider_event_ref: "notification:aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
      p_event_type: "TEST",
      p_event_subtype: null,
      p_event_time: new Date(signedDate).toISOString(),
      p_product_id: null,
      p_provider_status: null,
      p_test_purchase: true
    });
  });

  it("builds exact EXPIRED VOLUNTARY Apple server-notification RPC args without purchase-only user fields", async () => {
    const asOfIso = "2026-07-18T20:00:00.000Z";
    const notificationSignedDate = 1784404900000;
    const normalized = await normalizeAppleSubscription({
      transaction: transactionPayload({ productId: APPLE_MONTHLY_PRODUCT_ID, appAccountToken: USER_ID }),
      renewalInfo: renewalPayload({ autoRenewStatus: 0 }),
      status: 2,
      notificationType: "EXPIRED",
      config,
      asOfIso
    });

    expect(normalized.error).toBeNull();
    const args = await appleNotificationTransitionInput({
      normalized: normalized.normalized!,
      notification: {
        notificationType: "EXPIRED",
        subtype: "VOLUNTARY",
        notificationUUID: "bbbbbbbb-cccc-4ddd-8eee-ffffffffffff",
        signedDate: notificationSignedDate
      },
      payloadHash: "c".repeat(64),
      asOfIso
    });

    expect(sortedKeys(args)).toEqual(sortedKeys(APPLE_SERVER_NOTIFICATION_RPC_ARG_KEYS));
    expect(args).not.toHaveProperty("p_user_id");
    expect(args).not.toHaveProperty("p_user_ref_fingerprint");
    expectNoUndefinedRpcArgs(args);
    expect(args).toMatchObject({
      p_provider_environment: "sandbox",
      p_provider_event_ref: "notification:bbbbbbbb-cccc-4ddd-8eee-ffffffffffff",
      p_event_type: "EXPIRED",
      p_event_subtype: "VOLUNTARY",
      p_event_time: new Date(1784404800000).toISOString(),
      p_product_id: APPLE_MONTHLY_PRODUCT_ID,
      p_provider_product_ref: "com.canyougeo.app:com.canyougeo.pro.monthly",
      p_provider_status: "expired",
      p_auto_renews: false,
      p_current_period_end: null,
      p_expires_at: new Date(1786996800000).toISOString(),
      p_test_purchase: true
    });
  });

  it("calls service-role-only RPC bridges and never places signed payloads or API credentials in RPC names", async () => {
    const calls: Array<{ functionName: string; args: Record<string, unknown> }> = [];
    await expect(
      processApplePurchaseVerification(
        {
          rpc: async (functionName, args) => {
            calls.push({ functionName, args });
            return { data: [processedRow], error: null };
          }
        },
        { p_original_transaction_id_fingerprint: await appleIdentifierFingerprint("2000000000000000", "apple_original_transaction_sha256") }
      )
    ).resolves.toBe(processedRow);
    expect(calls[0]?.functionName).toBe("process_apple_purchase_verification");
    expect(calls[0]?.functionName).not.toContain("billing.");

    const notificationRow: AppleNotificationTransitionRow = { ...processedRow, event_type: "DID_RENEW", unsupported_ignored: false };
    await expect(
      processAppleServerNotification(
        {
          rpc: async (functionName, args) => {
            calls.push({ functionName, args });
            return { data: [notificationRow], error: null };
          }
        },
        { p_provider_event_ref: "notification:synthetic" }
      )
    ).resolves.toBe(notificationRow);
    expect(calls[1]?.functionName).toBe("process_apple_server_notification_event");
    expect(JSON.stringify(calls)).not.toMatch(/signedPayload|signedTransactionInfo|private_key|access_token|APPLE_APP_STORE_PRIVATE_KEY/);
  });
});

function sortedKeys(value: object | readonly string[]) {
  return (Array.isArray(value) ? [...value] : Object.keys(value)).sort();
}

function expectNoUndefinedRpcArgs(args: object) {
  expect(Object.entries(args).filter(([, value]) => value === undefined)).toEqual([]);
}

function transactionPayload(input: { productId: string; appAccountToken: string }) {
  return {
    transactionId: "2000000000000001",
    originalTransactionId: "2000000000000000",
    webOrderLineItemId: "2000000000000999",
    bundleId: APPLE_BUNDLE_ID,
    appAppleId: "6791248782",
    productId: input.productId,
    environment: "Sandbox",
    appAccountToken: input.appAccountToken,
    type: "Auto-Renewable Subscription",
    purchaseDate: 1784404800000,
    originalPurchaseDate: 1784404800000,
    expiresDate: 1786996800000,
    signedDate: 1784404800000
  };
}

function renewalPayload(input: { autoRenewStatus: number }) {
  return {
    originalTransactionId: "2000000000000000",
    productId: APPLE_MONTHLY_PRODUCT_ID,
    autoRenewProductId: APPLE_MONTHLY_PRODUCT_ID,
    environment: "Sandbox",
    appAccountToken: USER_ID,
    autoRenewStatus: input.autoRenewStatus,
    renewalDate: 1786996800000,
    signedDate: 1784404800000
  };
}

function fakeCompactJws(payload: Record<string, unknown>) {
  return `${base64Url({ alg: "ES256" })}.${base64Url(payload)}.${"a".repeat(86)}`;
}

function base64Url(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}
