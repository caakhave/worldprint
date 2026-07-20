import { describe, expect, it } from "vitest";
import {
  GooglePlayRtdnTransitionError,
  processGooglePlayRtdnTransition,
  type GooglePlayRtdnTransitionInput,
  type GooglePlayRtdnTransitionRow
} from "./googlePlayRtdnProcessor";

const processedRow: GooglePlayRtdnTransitionRow = {
  result: "processed",
  provider_environment: "test",
  event_type: "subscription_notification",
  event_subtype: "subscription_notification_2",
  processed: true,
  already_processed: false,
  provider_subscription_changed: true,
  compatibility_refreshed: true,
  reconciliation_required: false,
  unsupported_ignored: false,
  retryable: false
};

describe("Google Play RTDN transition adapter", () => {
  it("calls the public service bridge with token fingerprints only", async () => {
    const calls: Array<{ functionName: string; args: Record<string, unknown> }> = [];
    const row = await processGooglePlayRtdnTransition(
      {
        rpc: async (functionName, args) => {
          calls.push({ functionName, args });
          return { data: [processedRow], error: null };
        }
      },
      minimalInput()
    );

    expect(row).toBe(processedRow);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.functionName).toBe("process_google_play_rtdn_event");
    expect(calls[0]?.functionName).not.toContain("billing.");
    expect(calls[0]?.args).toMatchObject({
      p_provider_environment: "test",
      p_pubsub_message_id: "message-1",
      p_event_type: "subscription_notification",
      p_purchase_token_fingerprint: "sha256_" + "a".repeat(64),
      p_linked_purchase_token_fingerprint: null
    });
    expect(Object.keys(calls[0]?.args ?? {})).not.toEqual(
      expect.arrayContaining(["purchaseToken", "raw_purchase_token", "bearer", "jwt", "access_token", "service_account_json"])
    );
  });

  it("treats unbound token and duplicate events as durable non-retry outcomes", async () => {
    await expect(
      processGooglePlayRtdnTransition({ rpc: async () => ({ data: { ...processedRow, result: "unbound_purchase_token", processed: true, reconciliation_required: true }, error: null }) }, minimalInput())
    ).resolves.toMatchObject({ result: "unbound_purchase_token", reconciliation_required: true });

    await expect(
      processGooglePlayRtdnTransition(
        { rpc: async () => ({ data: { ...processedRow, result: "already_processed", processed: false, already_processed: true }, error: null }) },
        minimalInput()
      )
    ).resolves.toMatchObject({ result: "already_processed", already_processed: true });
  });

  it("throws sanitized retryable errors for RPC failures and invalid rows", async () => {
    await expect(processGooglePlayRtdnTransition({ rpc: async () => ({ data: null, error: { message: "db secret detail" } }) }, minimalInput())).rejects.toEqual(
      new GooglePlayRtdnTransitionError("rpc_failed", true)
    );
    await expect(processGooglePlayRtdnTransition({ rpc: async () => ({ data: [], error: null }) }, minimalInput())).rejects.toEqual(
      new GooglePlayRtdnTransitionError("invalid_rpc_result", true)
    );
  });
});

function minimalInput(): GooglePlayRtdnTransitionInput {
  return {
    providerEnvironment: "test",
    pubsubMessageId: "message-1",
    eventType: "subscription_notification",
    eventSubtype: "subscription_notification_2",
    eventTime: "2026-07-18T14:40:00.000Z",
    payloadHash: "b".repeat(64),
    packageName: "com.canyougeo.app",
    providerProductRef: "com.canyougeo.app:canyougeo_pro:monthly",
    purchaseTokenFingerprint: "sha256_" + "a".repeat(64),
    linkedPurchaseTokenFingerprint: null,
    providerTransactionRef: "gpa_order_sha256_" + "c".repeat(64),
    providerStatus: "active",
    acknowledgementState: "ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED",
    autoRenews: true,
    startTime: "2026-07-18T14:40:00.000Z",
    currentPeriodEnd: "2026-08-18T14:40:00.000Z",
    gracePeriodEndsAt: null,
    billingRetryStartedAt: null,
    expiresAt: null,
    pausedAt: null,
    testPurchase: true
  };
}
