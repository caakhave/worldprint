export type StripeProviderEnvironment = "test" | "live";

export type StripeProviderTransitionConfig =
  | {
      enabled: false;
      environment: null;
      error: null;
    }
  | {
      enabled: true;
      environment: StripeProviderEnvironment;
      error: null;
    }
  | {
      enabled: true;
      environment: null;
      error: string;
    };

export type StripeProviderTransitionInput = {
  providerEnvironment: StripeProviderEnvironment;
  providerEventRef: string;
  eventType: string;
  eventSubtype: string;
  eventCreatedAt: string;
  userId: string;
  providerCustomerRef: string | null;
  providerSubscriptionRef: string;
  providerProductRef: string;
  providerStatus: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  payloadHash: string;
};

export type StripeProviderTransitionRow = {
  result: string;
  provider_environment: string;
  event_type: string;
  event_subtype: string | null;
  processed: boolean;
  provider_result: string;
  already_processed: boolean;
  legacy_fields_updated: boolean;
  provider_subscription_changed: boolean;
  compatibility_refreshed: boolean;
  reconciliation_required: boolean;
  stale_event_ignored: boolean;
  retryable: boolean;
};

export class StripeProviderTransitionError extends Error {
  readonly result: string;
  readonly retryable: boolean;

  constructor(result: string, retryable: boolean) {
    super(`Provider-neutral Stripe transition failed: ${result}`);
    this.name = "StripeProviderTransitionError";
    this.result = result;
    this.retryable = retryable;
  }
}

export function parseStripeProviderNeutralDualWriteConfig(input: {
  enabled: string | null | undefined;
  environment: string | null | undefined;
}): StripeProviderTransitionConfig {
  if (input.enabled !== "true") {
    return { enabled: false, environment: null, error: null };
  }

  if (input.environment === "test" || input.environment === "live") {
    return { enabled: true, environment: input.environment, error: null };
  }

  return {
    enabled: true,
    environment: null,
    error: "Stripe provider-neutral dual-write requires STRIPE_PROVIDER_ENVIRONMENT=test or live."
  };
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function stripeTimestampToIso(value: number | null | undefined): string | null {
  return value ? new Date(value * 1000).toISOString() : null;
}

export function stripeProviderEventSubtype(input: {
  priceId: string;
  monthlyPriceId: string | null;
  yearlyPriceId: string | null;
  legacyPriceId: string | null;
}): string {
  if (input.priceId === input.monthlyPriceId) return "monthly";
  if (input.priceId === input.yearlyPriceId) return "yearly";
  if (input.priceId === input.legacyPriceId) return "legacy_pro";
  return "pro";
}

export function stripeProviderTransitionSucceeded(row: StripeProviderTransitionRow): boolean {
  return row.result === "processed" || row.result === "already_processed";
}

export function stripeProviderTransitionIgnored(row: StripeProviderTransitionRow): boolean {
  return row.result === "stale_event_ignored";
}

export async function processStripeProviderTransition(
  supabase: { rpc: (functionName: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }> },
  input: StripeProviderTransitionInput
): Promise<StripeProviderTransitionRow> {
  const { data, error } = await supabase.rpc("process_stripe_webhook_transition_event", {
    p_provider_environment: input.providerEnvironment,
    p_provider_event_ref: input.providerEventRef,
    p_event_type: input.eventType,
    p_event_subtype: input.eventSubtype,
    p_event_created_at: input.eventCreatedAt,
    p_user_id: input.userId,
    p_provider_customer_ref: input.providerCustomerRef,
    p_provider_subscription_ref: input.providerSubscriptionRef,
    p_provider_product_ref: input.providerProductRef,
    p_provider_status: input.providerStatus,
    p_current_period_start: input.currentPeriodStart,
    p_current_period_end: input.currentPeriodEnd,
    p_cancel_at_period_end: input.cancelAtPeriodEnd,
    p_payload_hash: input.payloadHash
  });
  if (error) throw new StripeProviderTransitionError("rpc_failed", true);

  const row = normalizeTransitionRow(data);
  if (!row) throw new StripeProviderTransitionError("invalid_rpc_result", true);
  if (stripeProviderTransitionSucceeded(row) || stripeProviderTransitionIgnored(row)) return row;
  throw new StripeProviderTransitionError(row.result || "failed", row.retryable);
}

function normalizeTransitionRow(data: unknown): StripeProviderTransitionRow | null {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") return null;
  const candidate = row as Record<string, unknown>;
  if (typeof candidate.result !== "string") return null;
  if (typeof candidate.provider_result !== "string") return null;
  if (typeof candidate.processed !== "boolean") return null;
  if (typeof candidate.retryable !== "boolean") return null;
  return candidate as StripeProviderTransitionRow;
}
