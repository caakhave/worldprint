import { googleProviderProductRef, normalizeGoogleSubscriptionPurchase, purchaseTokenFingerprint, sha256Hex, type GoogleSubscriptionPurchaseV2 } from "./googlePlayRtdn.ts";

export type GooglePlayPurchaseConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
  packageName: string;
  subscriptionProductId: string;
  monthlyBasePlanId: string;
  annualBasePlanId: string;
  serviceAccountJson: string;
  accountBindingSecret: string;
  environment: "test" | "production";
};

export type GooglePlayVerifyBody = {
  purchaseToken: string;
  productId: string;
  basePlanId: string | null;
};

export type GooglePlayPurchaseVerificationRow = {
  result: string;
  provider_environment: string;
  event_type: string;
  event_subtype: string | null;
  processed: boolean;
  already_processed: boolean;
  provider_subscription_changed: boolean;
  compatibility_refreshed: boolean;
  acknowledgement_required: boolean;
  reconciliation_required: boolean;
  retryable: boolean;
};

export type GooglePlayAcknowledgementRow = {
  result: string;
  provider_environment: string;
  acknowledged: boolean;
  retryable: boolean;
};

type GooglePlayPurchaseStage =
  | "request_parsing"
  | "supabase_user_authentication"
  | "google_response_parsing_state_validation"
  | "product_base_plan_mapping"
  | "ownership_binding"
  | "provider_subscription_persistence"
  | "entitlement_persistence"
  | "purchase_acknowledgement";

export class GooglePlayPurchaseError extends Error {
  readonly result: string;
  readonly retryable: boolean;
  readonly status: number;
  readonly stage: GooglePlayPurchaseStage;
  readonly supabaseError: unknown;
  readonly rpcRow: Partial<GooglePlayPurchaseVerificationRow | GooglePlayAcknowledgementRow> | null;

  constructor(
    result: string,
    retryable: boolean,
    status = 400,
    options: {
      stage?: GooglePlayPurchaseStage;
      supabaseError?: unknown;
      rpcRow?: Partial<GooglePlayPurchaseVerificationRow | GooglePlayAcknowledgementRow> | null;
    } = {}
  ) {
    super(`Google Play purchase verification failed: ${result}`);
    this.name = "GooglePlayPurchaseError";
    this.result = result;
    this.retryable = retryable;
    this.status = status;
    this.stage = options.stage ?? googlePlayPurchaseStageForResult(result);
    this.supabaseError = options.supabaseError ?? null;
    this.rpcRow = options.rpcRow ?? null;
  }
}

export function readGooglePlayPurchaseConfig(): { config: GooglePlayPurchaseConfig | null; error: string | null; missing: string[] } {
  const config: GooglePlayPurchaseConfig = {
    supabaseUrl: Deno.env.get("SUPABASE_URL") ?? "",
    supabaseAnonKey: Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    supabaseServiceRoleKey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    packageName: Deno.env.get("GOOGLE_PLAY_PACKAGE_NAME") ?? "",
    subscriptionProductId: Deno.env.get("GOOGLE_PLAY_SUBSCRIPTION_PRODUCT_ID") ?? "",
    monthlyBasePlanId: Deno.env.get("GOOGLE_PLAY_MONTHLY_BASE_PLAN_ID") ?? "",
    annualBasePlanId: Deno.env.get("GOOGLE_PLAY_ANNUAL_BASE_PLAN_ID") ?? "",
    serviceAccountJson: Deno.env.get("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON") ?? "",
    accountBindingSecret: Deno.env.get("GOOGLE_PLAY_ACCOUNT_BINDING_SECRET") ?? "",
    environment: (Deno.env.get("GOOGLE_PLAY_PROVIDER_ENVIRONMENT") ?? "test") as "test" | "production"
  };
  const missing = [
    ["SUPABASE_URL", config.supabaseUrl],
    ["SUPABASE_ANON_KEY", config.supabaseAnonKey],
    ["SUPABASE_SERVICE_ROLE_KEY", config.supabaseServiceRoleKey],
    ["GOOGLE_PLAY_PACKAGE_NAME", config.packageName],
    ["GOOGLE_PLAY_SUBSCRIPTION_PRODUCT_ID", config.subscriptionProductId],
    ["GOOGLE_PLAY_MONTHLY_BASE_PLAN_ID", config.monthlyBasePlanId],
    ["GOOGLE_PLAY_ANNUAL_BASE_PLAN_ID", config.annualBasePlanId],
    ["GOOGLE_PLAY_SERVICE_ACCOUNT_JSON", config.serviceAccountJson],
    ["GOOGLE_PLAY_ACCOUNT_BINDING_SECRET", config.accountBindingSecret]
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);
  if (missing.length) return { config: null, error: `Missing server env: ${missing.join(", ")}`, missing };
  if (config.environment !== "test" && config.environment !== "production") {
    return { config: null, error: "GOOGLE_PLAY_PROVIDER_ENVIRONMENT must be test or production.", missing: [] };
  }
  if (config.packageName !== "com.canyougeo.app") return { config: null, error: "Google Play package is not configured for Can You Geo.", missing: [] };
  if (config.subscriptionProductId !== "canyougeo_pro") return { config: null, error: "Google Play subscription product is not configured.", missing: [] };
  if (config.monthlyBasePlanId !== "monthly" || config.annualBasePlanId !== "annual") {
    return { config: null, error: "Google Play base plans are not configured.", missing: [] };
  }
  if (config.accountBindingSecret.length < 32) {
    return { config: null, error: "GOOGLE_PLAY_ACCOUNT_BINDING_SECRET must be at least 32 characters.", missing: [] };
  }
  return { config, error: null, missing: [] };
}

export async function googlePlayObfuscatedAccountId(input: { userId: string; accountBindingSecret: string }): Promise<string> {
  const key = await globalThis.crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(input.accountBindingSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await globalThis.crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`cgy-google-play-account-v1:${input.userId}`));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function allowedBasePlanIds(config: Pick<GooglePlayPurchaseConfig, "monthlyBasePlanId" | "annualBasePlanId">): string[] {
  return [config.monthlyBasePlanId, config.annualBasePlanId];
}

export async function parseGooglePlayVerifyBody(input: {
  contentType: string | null;
  bodyText: string;
  config: Pick<GooglePlayPurchaseConfig, "subscriptionProductId" | "monthlyBasePlanId" | "annualBasePlanId">;
}): Promise<{ body: GooglePlayVerifyBody | null; error: string | null }> {
  if (!input.contentType?.toLowerCase().includes("application/json")) return { body: null, error: "invalid_content_type" };
  let parsed: unknown;
  try {
    parsed = JSON.parse(input.bodyText);
  } catch {
    return { body: null, error: "invalid_json" };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { body: null, error: "invalid_request" };
  const record = parsed as Record<string, unknown>;
  const purchaseToken = typeof record.purchaseToken === "string" ? record.purchaseToken.trim() : "";
  const productId = typeof record.productId === "string" ? record.productId.trim() : "";
  const basePlanId = typeof record.basePlanId === "string" ? record.basePlanId.trim() : null;
  if (!validPurchaseTokenShape(purchaseToken)) return { body: null, error: "invalid_purchase_token" };
  if (productId !== input.config.subscriptionProductId) return { body: null, error: "invalid_product" };
  if (basePlanId !== null && !allowedBasePlanIds(input.config).includes(basePlanId)) return { body: null, error: "invalid_base_plan" };
  return { body: { purchaseToken, productId, basePlanId }, error: null };
}

export function validPurchaseTokenShape(purchaseToken: string): boolean {
  return purchaseToken.length >= 10 && purchaseToken.length <= 4096 && !/\s/.test(purchaseToken);
}

export function externalAccountIdFromPurchase(purchase: GoogleSubscriptionPurchaseV2): string | null {
  const identifiers = purchase.externalAccountIdentifiers;
  return typeof identifiers?.obfuscatedExternalAccountId === "string" ? identifiers.obfuscatedExternalAccountId : null;
}

export async function verifiedPurchaseTransitionInput(input: {
  purchaseToken: string;
  purchase: GoogleSubscriptionPurchaseV2;
  userId: string;
  config: GooglePlayPurchaseConfig;
  expectedBasePlanId: string | null;
  expectedObfuscatedAccountId: string;
  asOfIso: string;
}): Promise<{
  tokenFingerprint: string;
  acknowledgementState: string | null;
  transitionArgs: Record<string, unknown>;
} | null> {
  const externalAccountId = externalAccountIdFromPurchase(input.purchase);
  if (externalAccountId !== input.expectedObfuscatedAccountId) {
    throw new GooglePlayPurchaseError("account_binding_mismatch", false, 403, { stage: "ownership_binding" });
  }
  const normalized = await normalizeGoogleSubscriptionPurchase({
    purchase: input.purchase,
    config: input.config,
    asOfIso: input.asOfIso
  });
  if (!normalized.normalized) {
    throw new GooglePlayPurchaseError(normalized.error ?? "invalid_subscription_state", false, 409, {
      stage: normalized.error === "unexpected_product_or_base_plan" ? "product_base_plan_mapping" : "google_response_parsing_state_validation"
    });
  }
  if (input.expectedBasePlanId !== null && normalized.normalized.basePlanId !== input.expectedBasePlanId) {
    throw new GooglePlayPurchaseError("base_plan_mismatch", false, 409, { stage: "product_base_plan_mapping" });
  }
  const tokenFingerprint = await purchaseTokenFingerprint(input.purchaseToken);
  const linkedFingerprint = input.purchase.linkedPurchaseToken ? await purchaseTokenFingerprint(input.purchase.linkedPurchaseToken) : null;
  const payloadHash = await verificationPayloadHash({
    tokenFingerprint,
    linkedFingerprint,
    providerProductRef: normalized.normalized.providerProductRef,
    providerTransactionRef: normalized.normalized.latestOrderRefHash,
    providerStatus: normalized.normalized.providerStatus,
    acknowledgementState: normalized.normalized.acknowledgementState,
    currentPeriodEnd: normalized.normalized.currentPeriodEnd
  });
  return {
    tokenFingerprint,
    acknowledgementState: normalized.normalized.acknowledgementState,
    transitionArgs: {
      p_provider_environment: input.config.environment,
      p_user_id: input.userId,
      p_provider_event_ref: `verify:${tokenFingerprint}:${payloadHash.slice(0, 16)}`,
      p_event_time: input.asOfIso,
      p_payload_hash: payloadHash,
      p_package_name: input.config.packageName,
      p_provider_product_ref: normalized.normalized.providerProductRef,
      p_purchase_token_fingerprint: tokenFingerprint,
      p_purchase_token: input.purchaseToken,
      p_linked_purchase_token_fingerprint: linkedFingerprint,
      p_provider_transaction_ref: normalized.normalized.latestOrderRefHash,
      p_provider_status: normalized.normalized.providerStatus,
      p_acknowledgement_state: normalized.normalized.acknowledgementState,
      p_auto_renews: normalized.normalized.autoRenews,
      p_start_time: normalized.normalized.startTime,
      p_current_period_end: normalized.normalized.currentPeriodEnd,
      p_grace_period_ends_at: normalized.normalized.gracePeriodEndsAt,
      p_billing_retry_started_at: normalized.normalized.billingRetryStartedAt,
      p_expires_at: normalized.normalized.expiresAt,
      p_paused_at: normalized.normalized.pausedAt,
      p_test_purchase: normalized.normalized.testPurchase,
      p_as_of: input.asOfIso
    }
  };
}

export async function processGooglePlayPurchaseVerification(
  supabase: { rpc: (functionName: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }> },
  args: Record<string, unknown>
): Promise<GooglePlayPurchaseVerificationRow> {
  const { data, error } = await supabase.rpc("process_google_play_purchase_verification", args);
  if (error) throw new GooglePlayPurchaseError("rpc_failed", true, 500, { stage: "provider_subscription_persistence", supabaseError: error });
  const row = normalizeVerificationRow(data);
  if (!row) throw new GooglePlayPurchaseError("invalid_rpc_result", true, 500, { stage: "provider_subscription_persistence" });
  if (row.retryable && !row.processed && !row.already_processed) {
    throw new GooglePlayPurchaseError(row.result || "verification_failed", true, 500, {
      stage: googlePlayPurchaseStageForVerificationRow(row),
      rpcRow: sanitizedVerificationRow(row)
    });
  }
  return row;
}

export async function recordGooglePlayPurchaseAcknowledgement(
  supabase: { rpc: (functionName: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }> },
  input: { providerEnvironment: string; purchaseTokenFingerprint: string; acknowledgedAt: string }
): Promise<GooglePlayAcknowledgementRow> {
  const { data, error } = await supabase.rpc("record_google_play_purchase_acknowledgement", {
    p_provider_environment: input.providerEnvironment,
    p_purchase_token_fingerprint: input.purchaseTokenFingerprint,
    p_acknowledged_at: input.acknowledgedAt
  });
  if (error) {
    throw new GooglePlayPurchaseError("acknowledgement_record_failed", true, 500, {
      stage: "purchase_acknowledgement",
      supabaseError: error
    });
  }
  const row = normalizeAcknowledgementRow(data);
  if (!row) throw new GooglePlayPurchaseError("invalid_acknowledgement_result", true, 500, { stage: "purchase_acknowledgement" });
  if (row.retryable && !row.acknowledged) {
    throw new GooglePlayPurchaseError(row.result || "acknowledgement_record_failed", true, 500, {
      stage: "purchase_acknowledgement",
      rpcRow: {
        result: row.result,
        provider_environment: row.provider_environment,
        acknowledged: row.acknowledged,
        retryable: row.retryable
      }
    });
  }
  return row;
}

export function productRefForBasePlan(input: {
  packageName: string;
  productId: string;
  basePlanId: string;
}): string {
  return googleProviderProductRef(input);
}

async function verificationPayloadHash(input: {
  tokenFingerprint: string;
  linkedFingerprint: string | null;
  providerProductRef: string;
  providerTransactionRef: string | null;
  providerStatus: string;
  acknowledgementState: string | null;
  currentPeriodEnd: string | null;
}): Promise<string> {
  return sha256Hex(JSON.stringify(input));
}

function normalizeVerificationRow(data: unknown): GooglePlayPurchaseVerificationRow | null {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") return null;
  const candidate = row as Record<string, unknown>;
  if (typeof candidate.result !== "string") return null;
  if (typeof candidate.provider_environment !== "string") return null;
  if (typeof candidate.processed !== "boolean") return null;
  if (typeof candidate.retryable !== "boolean") return null;
  if (typeof candidate.acknowledgement_required !== "boolean") return null;
  return candidate as GooglePlayPurchaseVerificationRow;
}

function normalizeAcknowledgementRow(data: unknown): GooglePlayAcknowledgementRow | null {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") return null;
  const candidate = row as Record<string, unknown>;
  if (typeof candidate.result !== "string") return null;
  if (typeof candidate.provider_environment !== "string") return null;
  if (typeof candidate.acknowledged !== "boolean") return null;
  if (typeof candidate.retryable !== "boolean") return null;
  return candidate as GooglePlayAcknowledgementRow;
}

export function googlePlayPurchaseStageForVerificationRow(row: Pick<
  GooglePlayPurchaseVerificationRow,
  "result" | "provider_subscription_changed" | "compatibility_refreshed"
>): GooglePlayPurchaseStage {
  if (row.result === "summary_refresh_failed" || row.result === "entitlement_persistence_failed") return "entitlement_persistence";
  if (row.provider_subscription_changed && !row.compatibility_refreshed) return "entitlement_persistence";
  return "provider_subscription_persistence";
}

function googlePlayPurchaseStageForResult(result: string): GooglePlayPurchaseStage {
  if (
    result === "invalid_content_type" ||
    result === "invalid_json" ||
    result === "invalid_request" ||
    result === "invalid_purchase_token" ||
    result === "invalid_product" ||
    result === "invalid_base_plan"
  ) {
    return "request_parsing";
  }
  if (result === "account_binding_mismatch" || result === "ownership_conflict" || result === "linked_token_ownership_conflict") {
    return "ownership_binding";
  }
  if (result === "base_plan_mismatch" || result === "unexpected_product_or_base_plan") return "product_base_plan_mapping";
  if (result === "invalid_subscription_state" || result === "unknown_subscription_state" || result === "missing_period_end") {
    return "google_response_parsing_state_validation";
  }
  if (result === "summary_refresh_failed" || result === "entitlement_persistence_failed") return "entitlement_persistence";
  if (
    result === "provider_subscription_write_failed" ||
    result === "purchase_token_persistence_failed" ||
    result === "linked_subscription_supersede_failed" ||
    result === "provider_subscription_persistence_failed"
  ) {
    return "provider_subscription_persistence";
  }
  if (result.includes("acknowledgement")) return "purchase_acknowledgement";
  return "provider_subscription_persistence";
}

function sanitizedVerificationRow(row: GooglePlayPurchaseVerificationRow): Partial<GooglePlayPurchaseVerificationRow> {
  return {
    result: row.result,
    provider_environment: row.provider_environment,
    event_type: row.event_type,
    event_subtype: row.event_subtype,
    processed: row.processed,
    already_processed: row.already_processed,
    provider_subscription_changed: row.provider_subscription_changed,
    compatibility_refreshed: row.compatibility_refreshed,
    acknowledgement_required: row.acknowledgement_required,
    reconciliation_required: row.reconciliation_required,
    retryable: row.retryable
  };
}
