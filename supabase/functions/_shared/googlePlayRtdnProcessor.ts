import type { GooglePlayRtdnEnvironment, ProviderSubscriptionStatus } from "./googlePlayRtdn.ts";

export type GooglePlayRtdnTransitionInput = {
  providerEnvironment: GooglePlayRtdnEnvironment;
  pubsubMessageId: string;
  eventType: string;
  eventSubtype: string;
  eventTime: string;
  payloadHash: string;
  packageName: string;
  providerProductRef: string | null;
  purchaseTokenFingerprint: string | null;
  linkedPurchaseTokenFingerprint: string | null;
  providerTransactionRef: string | null;
  providerStatus: ProviderSubscriptionStatus | null;
  acknowledgementState: string | null;
  autoRenews: boolean | null;
  startTime: string | null;
  currentPeriodEnd: string | null;
  gracePeriodEndsAt: string | null;
  billingRetryStartedAt: string | null;
  expiresAt: string | null;
  pausedAt: string | null;
  testPurchase: boolean;
};

export type GooglePlayRtdnTransitionRow = {
  result: string;
  provider_environment: string;
  event_type: string;
  event_subtype: string | null;
  processed: boolean;
  already_processed: boolean;
  provider_subscription_changed: boolean;
  compatibility_refreshed: boolean;
  reconciliation_required: boolean;
  unsupported_ignored: boolean;
  retryable: boolean;
};

export class GooglePlayRtdnTransitionError extends Error {
  readonly result: string;
  readonly retryable: boolean;

  constructor(result: string, retryable: boolean) {
    super(`Google Play RTDN transition failed: ${result}`);
    this.name = "GooglePlayRtdnTransitionError";
    this.result = result;
    this.retryable = retryable;
  }
}

export async function processGooglePlayRtdnTransition(
  supabase: { rpc: (functionName: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }> },
  input: GooglePlayRtdnTransitionInput
): Promise<GooglePlayRtdnTransitionRow> {
  const { data, error } = await supabase.rpc("process_google_play_rtdn_event", {
    p_provider_environment: input.providerEnvironment,
    p_pubsub_message_id: input.pubsubMessageId,
    p_event_type: input.eventType,
    p_event_subtype: input.eventSubtype,
    p_event_time: input.eventTime,
    p_payload_hash: input.payloadHash,
    p_package_name: input.packageName,
    p_provider_product_ref: input.providerProductRef,
    p_purchase_token_fingerprint: input.purchaseTokenFingerprint,
    p_linked_purchase_token_fingerprint: input.linkedPurchaseTokenFingerprint,
    p_provider_transaction_ref: input.providerTransactionRef,
    p_provider_status: input.providerStatus,
    p_acknowledgement_state: input.acknowledgementState,
    p_auto_renews: input.autoRenews,
    p_start_time: input.startTime,
    p_current_period_end: input.currentPeriodEnd,
    p_grace_period_ends_at: input.gracePeriodEndsAt,
    p_billing_retry_started_at: input.billingRetryStartedAt,
    p_expires_at: input.expiresAt,
    p_paused_at: input.pausedAt,
    p_test_purchase: input.testPurchase
  });
  if (error) throw new GooglePlayRtdnTransitionError("rpc_failed", true);
  const row = normalizeTransitionRow(data);
  if (!row) throw new GooglePlayRtdnTransitionError("invalid_rpc_result", true);
  if (row.retryable && !row.processed && !row.already_processed && !row.unsupported_ignored && row.result !== "unbound_purchase_token") {
    throw new GooglePlayRtdnTransitionError(row.result || "failed", true);
  }
  return row;
}

function normalizeTransitionRow(data: unknown): GooglePlayRtdnTransitionRow | null {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") return null;
  const candidate = row as Record<string, unknown>;
  if (typeof candidate.result !== "string") return null;
  if (typeof candidate.provider_environment !== "string") return null;
  if (typeof candidate.event_type !== "string") return null;
  if (typeof candidate.processed !== "boolean") return null;
  if (typeof candidate.retryable !== "boolean") return null;
  return candidate as GooglePlayRtdnTransitionRow;
}
