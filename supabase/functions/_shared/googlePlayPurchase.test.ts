import { describe, expect, it } from "vitest";
import {
  googlePlayObfuscatedAccountId,
  parseGooglePlayVerifyBody,
  processGooglePlayPurchaseVerification,
  recordGooglePlayPurchaseAcknowledgement,
  verifiedPurchaseTransitionInput,
  type GooglePlayPurchaseConfig,
  type GooglePlayPurchaseVerificationRow
} from "./googlePlayPurchase";

const GOOGLE_PLAY_PRODUCT_ID = "canyougeo_pro";
const GOOGLE_PLAY_MONTHLY_BASE_PLAN_ID = "monthly";

const config: GooglePlayPurchaseConfig = {
  supabaseUrl: "https://hsgpjtyysbremrokkoym.supabase.co",
  supabaseAnonKey: "anon-not-real",
  supabaseServiceRoleKey: "service-role-not-real",
  packageName: "com.canyougeo.app",
  subscriptionProductId: "canyougeo_pro",
  monthlyBasePlanId: "monthly",
  annualBasePlanId: "annual",
  serviceAccountJson: "{}",
  accountBindingSecret: "not-a-real-secret-value-for-tests-only",
  environment: "test"
};

const processedRow: GooglePlayPurchaseVerificationRow = {
  result: "processed",
  provider_environment: "test",
  event_type: "purchase_verification",
  event_subtype: null,
  processed: true,
  already_processed: false,
  provider_subscription_changed: true,
  compatibility_refreshed: true,
  acknowledgement_required: true,
  reconciliation_required: false,
  retryable: false
};

describe("Google Play purchase helpers", () => {
  it("creates a stable opaque account binding without exposing the user id", async () => {
    const userId = "11111111-2222-4333-8444-555555555555";
    const first = await googlePlayObfuscatedAccountId({ userId, accountBindingSecret: config.accountBindingSecret });
    const second = await googlePlayObfuscatedAccountId({ userId, accountBindingSecret: config.accountBindingSecret });

    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(first).toBe(second);
    expect(first).not.toContain(userId);
  });

  it("accepts known products and allows restore verification without a client-known base plan", async () => {
    await expect(
      parseGooglePlayVerifyBody({
        contentType: "application/json",
        bodyText: JSON.stringify({
          purchaseToken: "opaque-token-not-real",
          productId: GOOGLE_PLAY_PRODUCT_ID,
          basePlanId: GOOGLE_PLAY_MONTHLY_BASE_PLAN_ID
        }),
        config
      })
    ).resolves.toMatchObject({
      body: {
        productId: "canyougeo_pro",
        basePlanId: "monthly"
      },
      error: null
    });

    await expect(
      parseGooglePlayVerifyBody({
        contentType: "application/json",
        bodyText: JSON.stringify({
          purchaseToken: "opaque-token-not-real",
          productId: GOOGLE_PLAY_PRODUCT_ID
        }),
        config
      })
    ).resolves.toMatchObject({ body: { basePlanId: null }, error: null });
  });

  it("builds RPC args with only token fingerprints in provider refs and verifies account binding", async () => {
    const userId = "11111111-2222-4333-8444-555555555555";
    const obfuscatedAccountId = await googlePlayObfuscatedAccountId({ userId, accountBindingSecret: config.accountBindingSecret });
    const transition = await verifiedPurchaseTransitionInput({
      purchaseToken: "opaque-token-not-real",
      purchase: purchaseV2({ obfuscatedAccountId }),
      userId,
      config,
      expectedBasePlanId: "monthly",
      expectedObfuscatedAccountId: obfuscatedAccountId,
      asOfIso: "2026-07-18T16:00:00.000Z"
    });

    expect(transition?.tokenFingerprint).toMatch(/^sha256_[a-f0-9]{64}$/);
    expect(transition?.transitionArgs).toMatchObject({
      p_provider_environment: "test",
      p_package_name: "com.canyougeo.app",
      p_provider_product_ref: "com.canyougeo.app:canyougeo_pro:monthly",
      p_provider_status: "active",
      p_acknowledgement_state: "ACKNOWLEDGEMENT_STATE_PENDING"
    });
    expect(String(transition?.transitionArgs.p_provider_event_ref)).toMatch(/^verify:sha256_[a-f0-9]{64}:[a-f0-9]{16}$/);
    expect(transition?.transitionArgs.p_provider_event_ref).not.toContain("opaque-token-not-real");

    await expect(
      verifiedPurchaseTransitionInput({
        purchaseToken: "opaque-token-not-real",
        purchase: purchaseV2({ obfuscatedAccountId: "0".repeat(64) }),
        userId,
        config,
        expectedBasePlanId: "monthly",
        expectedObfuscatedAccountId: obfuscatedAccountId,
        asOfIso: "2026-07-18T16:00:00.000Z"
      })
    ).rejects.toMatchObject({ result: "account_binding_mismatch" });
  });

  it("calls only public service-role RPC bridges and keeps raw credentials out of RPC names", async () => {
    const calls: Array<{ functionName: string; args: Record<string, unknown> }> = [];
    await expect(
      processGooglePlayPurchaseVerification(
        {
          rpc: async (functionName, args) => {
            calls.push({ functionName, args });
            return { data: [processedRow], error: null };
          }
        },
        { p_purchase_token_fingerprint: "sha256_" + "a".repeat(64), p_purchase_token: "opaque-token-not-real" }
      )
    ).resolves.toBe(processedRow);
    expect(calls[0]?.functionName).toBe("process_google_play_purchase_verification");
    expect(calls[0]?.functionName).not.toContain("billing.");

    await expect(
      recordGooglePlayPurchaseAcknowledgement(
        {
          rpc: async (functionName, args) => {
            calls.push({ functionName, args });
            return { data: { result: "acknowledged", provider_environment: "test", acknowledged: true, retryable: false }, error: null };
          }
        },
        {
          providerEnvironment: "test",
          purchaseTokenFingerprint: "sha256_" + "a".repeat(64),
          acknowledgedAt: "2026-07-18T16:05:00.000Z"
        }
      )
    ).resolves.toMatchObject({ acknowledged: true });
    expect(calls[1]?.functionName).toBe("record_google_play_purchase_acknowledgement");
  });
});

function purchaseV2(input: { obfuscatedAccountId: string }) {
  return {
    startTime: "2026-07-18T16:00:00Z",
    subscriptionState: "SUBSCRIPTION_STATE_ACTIVE",
    acknowledgementState: "ACKNOWLEDGEMENT_STATE_PENDING",
    externalAccountIdentifiers: {
      obfuscatedExternalAccountId: input.obfuscatedAccountId
    },
    testPurchase: {},
    lineItems: [
      {
        productId: "canyougeo_pro",
        expiryTime: "2026-08-18T16:00:00Z",
        latestSuccessfulOrderId: "GPA.synthetic-order-not-real",
        autoRenewingPlan: { autoRenewEnabled: true },
        offerDetails: { basePlanId: "monthly" }
      }
    ]
  };
}
