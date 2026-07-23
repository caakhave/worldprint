export type GooglePlayVerifyStage =
  | "request_parsing"
  | "supabase_user_authentication"
  | "service_account_secret_loading"
  | "google_oauth_access_token"
  | "subscriptionsv2_get"
  | "google_response_parsing_state_validation"
  | "product_base_plan_mapping"
  | "ownership_binding"
  | "provider_subscription_persistence"
  | "entitlement_persistence"
  | "purchase_acknowledgement"
  | "unexpected";

export type GooglePlayVerifyDiagnosticContext = {
  stage?: GooglePlayVerifyStage;
  providerEnvironment?: string | null;
  productId?: string | null;
  basePlanId?: string | null;
  purchaseStatePresent?: boolean | null;
  acknowledgementStatePresent?: boolean | null;
};

export type GooglePlayVerifyDiagnostic = {
  stage: GooglePlayVerifyStage;
  result: string;
  status: number;
  retryable: boolean;
  errorName: string;
  errorMessage: string;
  providerEnvironment?: string;
  productId?: string;
  basePlanId?: string;
  purchaseStatePresent?: boolean;
  acknowledgementStatePresent?: boolean;
  httpStatus?: number;
  googleApi?: {
    code?: number;
    status?: string;
    message?: string;
  };
  supabase?: {
    code?: string;
    message?: string;
    details?: string;
    hint?: string;
  };
  rpcRow?: Record<string, unknown>;
};

type GooglePlayKnownError = {
  name?: unknown;
  message?: unknown;
  result?: unknown;
  retryable?: unknown;
  status?: unknown;
  stage?: unknown;
  googleApiError?: unknown;
  supabaseError?: unknown;
  rpcRow?: unknown;
};

const CLIENT_ERROR_BY_STAGE: Record<GooglePlayVerifyStage, string> = {
  request_parsing: "invalid_request",
  supabase_user_authentication: "authentication_required",
  service_account_secret_loading: "google_play_configuration_error",
  google_oauth_access_token: "google_play_authorization_error",
  subscriptionsv2_get: "google_play_subscription_lookup_failed",
  google_response_parsing_state_validation: "google_play_subscription_state_invalid",
  product_base_plan_mapping: "google_play_product_mismatch",
  ownership_binding: "google_play_account_binding_mismatch",
  provider_subscription_persistence: "google_play_provider_persistence_failed",
  entitlement_persistence: "google_play_entitlement_persistence_failed",
  purchase_acknowledgement: "google_play_acknowledgement_failed",
  unexpected: "google_play_verification_unexpected_error"
};

export function buildGooglePlayVerifyDiagnostic(error: unknown, context: GooglePlayVerifyDiagnosticContext = {}): GooglePlayVerifyDiagnostic {
  const stageError = error instanceof GooglePlayVerifyStageError ? error : null;
  const known = toKnownError(stageError?.cause ?? error);
  const result = typeof known.result === "string" && known.result ? known.result : "unexpected_error";
  const stage = googlePlayVerifyStage(known, stageError?.stage ?? context.stage);
  const status = safeStatus(known.status, known.retryable);
  const diagnostic: GooglePlayVerifyDiagnostic = {
    stage,
    result: sanitizeLogText(result),
    status,
    retryable: typeof known.retryable === "boolean" ? known.retryable : status >= 500,
    errorName: sanitizeLogText(typeof known.name === "string" ? known.name : "Error"),
    errorMessage: sanitizeLogText(typeof known.message === "string" ? known.message : String(result))
  };

  if (context.providerEnvironment) diagnostic.providerEnvironment = sanitizeEnum(context.providerEnvironment);
  if (context.productId) diagnostic.productId = sanitizeProductRef(context.productId);
  if (context.basePlanId) diagnostic.basePlanId = sanitizeProductRef(context.basePlanId);
  if (typeof context.purchaseStatePresent === "boolean") diagnostic.purchaseStatePresent = context.purchaseStatePresent;
  if (typeof context.acknowledgementStatePresent === "boolean") diagnostic.acknowledgementStatePresent = context.acknowledgementStatePresent;
  if (typeof known.status === "number") diagnostic.httpStatus = known.status;

  const googleApi = sanitizeGoogleApiError(known.googleApiError);
  if (googleApi) diagnostic.googleApi = googleApi;
  const supabase = sanitizeSupabaseError(known.supabaseError);
  if (supabase) diagnostic.supabase = supabase;
  const rpcRow = sanitizeRpcRow(known.rpcRow);
  if (rpcRow) diagnostic.rpcRow = rpcRow;

  return diagnostic;
}

export function googlePlayVerifyClientError(diagnostic: Pick<GooglePlayVerifyDiagnostic, "stage" | "status" | "retryable">): {
  error: string;
  code: string;
  retryable: boolean;
} {
  return {
    error: diagnostic.status >= 500 ? "Google Play purchase verification is unavailable." : "Google Play purchase could not be verified.",
    code: CLIENT_ERROR_BY_STAGE[diagnostic.stage],
    retryable: diagnostic.retryable
  };
}

export async function withGooglePlayVerifyStage<T>(stage: GooglePlayVerifyStage, operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const known = toKnownError(error);
    if (typeof known.stage !== "string") {
      try {
        Object.defineProperty(error as object, "stage", { value: stage, configurable: true });
      } catch {
        throw new GooglePlayVerifyStageError(stage, error);
      }
    }
    throw error;
  }
}

export class GooglePlayVerifyStageError extends Error {
  readonly stage: GooglePlayVerifyStage;
  readonly cause: unknown;

  constructor(stage: GooglePlayVerifyStage, cause: unknown) {
    super(`Google Play verification failed at ${stage}`);
    this.name = "GooglePlayVerifyStageError";
    this.stage = stage;
    this.cause = cause;
  }
}

function googlePlayVerifyStage(error: GooglePlayKnownError, fallback: GooglePlayVerifyStage | undefined): GooglePlayVerifyStage {
  if (isGooglePlayVerifyStage(error.stage)) return error.stage;
  if (error.name === "GooglePlayVerifyStageError" && isGooglePlayVerifyStage((error as { stage?: unknown }).stage)) {
    return (error as { stage: GooglePlayVerifyStage }).stage;
  }
  if (typeof error.result === "string") return stageForResult(error.result);
  return fallback ?? "unexpected";
}

function stageForResult(result: string): GooglePlayVerifyStage {
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
  if (result === "invalid_service_account_json") return "service_account_secret_loading";
  if (result === "token_exchange_failed") return "google_oauth_access_token";
  if (
    result === "invalid_purchase_request" ||
    result === "publisher_unauthenticated" ||
    result === "publisher_permission_denied" ||
    result === "purchase_not_found" ||
    result === "publisher_concurrent_update" ||
    result === "purchase_token_no_longer_valid" ||
    result === "publisher_unavailable" ||
    result === "publisher_read_failed"
  ) {
    return "subscriptionsv2_get";
  }
  if (
    result === "invalid_subscription_response" ||
    result === "invalid_subscription_state" ||
    result === "unknown_subscription_state" ||
    result === "missing_period_end"
  ) {
    return "google_response_parsing_state_validation";
  }
  if (result === "unexpected_product_or_base_plan" || result === "base_plan_mismatch") return "product_base_plan_mapping";
  if (result === "account_binding_mismatch" || result === "ownership_conflict" || result === "linked_token_ownership_conflict") return "ownership_binding";
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

function safeStatus(status: unknown, retryable: unknown): number {
  if (typeof status === "number" && Number.isInteger(status) && status >= 400 && status <= 599) return status;
  return retryable === false ? 400 : 500;
}

function toKnownError(error: unknown): GooglePlayKnownError {
  if (error && typeof error === "object") return error as GooglePlayKnownError;
  return { name: typeof error, message: String(error), result: "unexpected_error", retryable: true, status: 500 };
}

function isGooglePlayVerifyStage(value: unknown): value is GooglePlayVerifyStage {
  return (
    value === "request_parsing" ||
    value === "supabase_user_authentication" ||
    value === "service_account_secret_loading" ||
    value === "google_oauth_access_token" ||
    value === "subscriptionsv2_get" ||
    value === "google_response_parsing_state_validation" ||
    value === "product_base_plan_mapping" ||
    value === "ownership_binding" ||
    value === "provider_subscription_persistence" ||
    value === "entitlement_persistence" ||
    value === "purchase_acknowledgement" ||
    value === "unexpected"
  );
}

function sanitizeGoogleApiError(value: unknown): GooglePlayVerifyDiagnostic["googleApi"] | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  const result: NonNullable<GooglePlayVerifyDiagnostic["googleApi"]> = {};
  if (typeof source.code === "number") result.code = source.code;
  if (typeof source.status === "string") result.status = sanitizeLogText(source.status);
  if (typeof source.message === "string") result.message = sanitizeLogText(source.message);
  return Object.keys(result).length ? result : null;
}

function sanitizeSupabaseError(value: unknown): GooglePlayVerifyDiagnostic["supabase"] | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  const result: NonNullable<GooglePlayVerifyDiagnostic["supabase"]> = {};
  if (typeof source.code === "string") result.code = sanitizeLogText(source.code);
  if (typeof source.message === "string") result.message = sanitizeLogText(source.message);
  if (typeof source.details === "string") result.details = sanitizeLogText(source.details);
  if (typeof source.hint === "string") result.hint = sanitizeLogText(source.hint);
  return Object.keys(result).length ? result : null;
}

function sanitizeRpcRow(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const allowed = [
    "result",
    "provider_environment",
    "event_type",
    "event_subtype",
    "processed",
    "already_processed",
    "provider_subscription_changed",
    "compatibility_refreshed",
    "acknowledgement_required",
    "reconciliation_required",
    "retryable",
    "acknowledged"
  ];
  const source = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const key of allowed) {
    const entry = source[key];
    if (typeof entry === "string") result[key] = sanitizeLogText(entry);
    else if (typeof entry === "boolean") result[key] = entry;
    else if (entry === null) result[key] = null;
  }
  return Object.keys(result).length ? result : null;
}

function sanitizeEnum(value: string): string {
  return value.replace(/[^a-z0-9_-]/gi, "").slice(0, 64);
}

function sanitizeProductRef(value: string): string {
  return value.replace(/[^a-zA-Z0-9._:-]/g, "").slice(0, 128);
}

function sanitizeLogText(value: string): string {
  return value
    .replace(/-----BEGIN[\s\S]*?-----END [A-Z ]+-----/g, "[redacted]")
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
    .replace(/"(private_key|purchaseToken|purchase_token|access_token|assertion)"\s*:\s*"[^"]*"/gi, '"$1":"[redacted]"')
    .replace(/\b(?:eyJ|ya29\.|sha256_)?[A-Za-z0-9._~+/=-]{48,}\b/g, "[redacted]")
    .slice(0, 500);
}
