export const APPLE_BUNDLE_ID = "com.canyougeo.app";
export const APPLE_APP_ID = "6791248782";
export const APPLE_MONTHLY_PRODUCT_ID = "com.canyougeo.pro.monthly";
export const APPLE_ANNUAL_PRODUCT_ID = "com.canyougeo.pro.annual";
export const APPLE_PROVIDER = "apple";
export const APPLE_JWS_MAX_BYTES = 128 * 1024;

export const APPLE_ROOT_CA_SHA256_FINGERPRINTS = [
  "63343abfb89a6a03ebb57e9b3f5fa7be7c4f5c756f3017b3a8c488c3653e9179",
  "c2b9b042dd57830e7d117dac55ac8ae19407d38e41d88f3215bc3a890444a050",
  "b0b1730ecbc7ff4505142c49f1295e6eda6bcaed7e2c68c5be91b5a11001f024"
] as const;

export type AppleEnvironment = "sandbox" | "production";
export type AppleDeploymentMode = "staging" | "production";
export type AppleEntitlementScope = "live" | "native_review" | "none";

export type AppleProductId = typeof APPLE_MONTHLY_PRODUCT_ID | typeof APPLE_ANNUAL_PRODUCT_ID;

export type AppleProviderSubscriptionStatus =
  | "active"
  | "cancelled_active_until_period_end"
  | "grace_period"
  | "billing_retry"
  | "expired"
  | "refunded"
  | "revoked"
  | "unknown_needs_reconciliation";

export type AppleServerConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
  issuerId: string;
  keyId: string;
  privateKey: string;
  bundleId: string;
  appAppleId: string;
  allowedEnvironments: AppleEnvironment[];
  deploymentMode: AppleDeploymentMode;
};

export type ApplePurchaseContextConfig = Pick<
  AppleServerConfig,
  "supabaseUrl" | "supabaseAnonKey" | "bundleId" | "appAppleId" | "allowedEnvironments" | "deploymentMode"
>;

export type AppleTransactionDecodedPayload = {
  transactionId?: unknown;
  originalTransactionId?: unknown;
  webOrderLineItemId?: unknown;
  bundleId?: unknown;
  appAppleId?: unknown;
  productId?: unknown;
  environment?: unknown;
  appAccountToken?: unknown;
  type?: unknown;
  purchaseDate?: unknown;
  originalPurchaseDate?: unknown;
  expiresDate?: unknown;
  revocationDate?: unknown;
  signedDate?: unknown;
  inAppOwnershipType?: unknown;
};

export type AppleRenewalInfoDecodedPayload = {
  originalTransactionId?: unknown;
  productId?: unknown;
  autoRenewProductId?: unknown;
  environment?: unknown;
  appAccountToken?: unknown;
  autoRenewStatus?: unknown;
  expirationIntent?: unknown;
  gracePeriodExpiresDate?: unknown;
  isInBillingRetryPeriod?: unknown;
  renewalDate?: unknown;
  signedDate?: unknown;
};

export type AppleNotificationDecodedPayload = {
  notificationType?: unknown;
  subtype?: unknown;
  notificationUUID?: unknown;
  version?: unknown;
  signedDate?: unknown;
  data?: unknown;
};

export type AppleNotificationData = {
  appAppleId?: unknown;
  bundleId?: unknown;
  environment?: unknown;
  signedTransactionInfo?: unknown;
  signedRenewalInfo?: unknown;
  status?: unknown;
};

export type AppleStatusResponse = {
  environment?: unknown;
  appAppleId?: unknown;
  bundleId?: unknown;
  data?: Array<{
    subscriptionGroupIdentifier?: unknown;
    lastTransactions?: Array<{
      originalTransactionId?: unknown;
      status?: unknown;
      signedTransactionInfo?: unknown;
      signedRenewalInfo?: unknown;
    }>;
  }>;
};

export type NormalizedAppleSubscription = {
  providerEnvironment: AppleEnvironment;
  bundleId: string;
  appAppleId: string;
  productId: AppleProductId;
  providerProductRef: string;
  originalTransactionId: string;
  originalTransactionIdFingerprint: string;
  transactionId: string;
  transactionIdFingerprint: string;
  webOrderLineItemIdFingerprint: string | null;
  appAccountToken: string | null;
  providerStatus: AppleProviderSubscriptionStatus;
  autoRenews: boolean | null;
  purchaseDate: string | null;
  originalPurchaseDate: string | null;
  currentPeriodEnd: string | null;
  gracePeriodEndsAt: string | null;
  billingRetryStartedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  refundedAt: string | null;
  signedDate: string | null;
  testPurchase: boolean;
  reconciliationStatus: "current" | "needs_verification" | "manual_review";
};

export type ApplePurchaseVerifyBody = {
  signedTransactionInfo: string;
  signedRenewalInfo: string | null;
};

export type ApplePurchaseVerificationRow = {
  result: string;
  provider_environment: string;
  event_type: string;
  event_subtype: string | null;
  processed: boolean;
  already_processed: boolean;
  provider_subscription_changed: boolean;
  compatibility_refreshed: boolean;
  native_review_entitlement_refreshed: boolean;
  entitlement_scope: AppleEntitlementScope;
  reconciliation_required: boolean;
  retryable: boolean;
};

export type AppleNotificationTransitionRow = ApplePurchaseVerificationRow & {
  unsupported_ignored: boolean;
};

type AppleSubscriptionTransitionRpcArgsBase = {
  p_provider_environment: AppleEnvironment;
  p_deployment_mode: AppleDeploymentMode;
  p_provider_event_ref: string;
  p_event_type: string;
  p_event_subtype: string | null;
  p_event_time: string;
  p_payload_hash: string;
  p_bundle_id: string;
  p_app_apple_id: string;
  p_product_id: AppleProductId | null;
  p_provider_product_ref: string | null;
  p_original_transaction_id_fingerprint: string | null;
  p_original_transaction_id: string | null;
  p_transaction_id_fingerprint: string | null;
  p_app_account_token: string | null;
  p_provider_status: AppleProviderSubscriptionStatus | null;
  p_auto_renews: boolean | null;
  p_start_time: string | null;
  p_current_period_end: string | null;
  p_grace_period_ends_at: string | null;
  p_billing_retry_started_at: string | null;
  p_expires_at: string | null;
  p_revoked_at: string | null;
  p_refunded_at: string | null;
  p_test_purchase: boolean;
  p_as_of: string;
};

export type AppleServerNotificationRpcArgs = AppleSubscriptionTransitionRpcArgsBase;

export type ApplePurchaseVerificationRpcArgs = AppleSubscriptionTransitionRpcArgsBase & {
  p_user_id: string;
  p_user_ref_fingerprint: string;
  p_product_id: AppleProductId;
  p_provider_product_ref: string;
  p_original_transaction_id_fingerprint: string;
  p_original_transaction_id: string;
  p_transaction_id_fingerprint: string;
  p_provider_status: AppleProviderSubscriptionStatus;
};

export const APPLE_SERVER_NOTIFICATION_RPC_ARG_KEYS = [
  "p_provider_environment",
  "p_deployment_mode",
  "p_provider_event_ref",
  "p_event_type",
  "p_event_subtype",
  "p_event_time",
  "p_payload_hash",
  "p_bundle_id",
  "p_app_apple_id",
  "p_product_id",
  "p_provider_product_ref",
  "p_original_transaction_id_fingerprint",
  "p_original_transaction_id",
  "p_transaction_id_fingerprint",
  "p_app_account_token",
  "p_provider_status",
  "p_auto_renews",
  "p_start_time",
  "p_current_period_end",
  "p_grace_period_ends_at",
  "p_billing_retry_started_at",
  "p_expires_at",
  "p_revoked_at",
  "p_refunded_at",
  "p_test_purchase",
  "p_as_of"
] as const satisfies readonly (keyof AppleServerNotificationRpcArgs)[];

export const APPLE_PURCHASE_VERIFICATION_RPC_ARG_KEYS = [
  "p_provider_environment",
  "p_deployment_mode",
  "p_user_id",
  "p_user_ref_fingerprint",
  "p_provider_event_ref",
  "p_event_type",
  "p_event_subtype",
  "p_event_time",
  "p_payload_hash",
  "p_bundle_id",
  "p_app_apple_id",
  "p_product_id",
  "p_provider_product_ref",
  "p_original_transaction_id_fingerprint",
  "p_original_transaction_id",
  "p_transaction_id_fingerprint",
  "p_app_account_token",
  "p_provider_status",
  "p_auto_renews",
  "p_start_time",
  "p_current_period_end",
  "p_grace_period_ends_at",
  "p_billing_retry_started_at",
  "p_expires_at",
  "p_revoked_at",
  "p_refunded_at",
  "p_test_purchase",
  "p_as_of"
] as const satisfies readonly (keyof ApplePurchaseVerificationRpcArgs)[];

export class AppleAppStoreError extends Error {
  readonly result: string;
  readonly retryable: boolean;
  readonly status: number;

  constructor(result: string, retryable: boolean, status = 400) {
    super(`Apple App Store operation failed: ${result}`);
    this.name = "AppleAppStoreError";
    this.result = result;
    this.retryable = retryable;
    this.status = status;
  }
}

type FetchLike = typeof fetch;

type VerifiedAppleSignedPayloads = {
  transaction: AppleTransactionDecodedPayload;
  renewalInfo: AppleRenewalInfoDecodedPayload | null;
};

type AppleJwsHeader = {
  alg?: unknown;
  x5c?: unknown;
  kid?: unknown;
};

type ParsedCertificate = {
  der: Uint8Array;
  tbsCertificate: Uint8Array;
  signatureAlgorithmOid: string;
  signatureValue: Uint8Array;
  subjectPublicKeyInfo: Uint8Array;
  publicKeyAlgorithmOid: string;
  namedCurveOid: string | null;
  notBefore: Date;
  notAfter: Date;
};

type DerNode = {
  tag: number;
  headerStart: number;
  contentStart: number;
  contentEnd: number;
  end: number;
};

export function readApplePurchaseContextConfig(): { config: ApplePurchaseContextConfig | null; error: string | null; missing: string[] } {
  const allowedEnvironments = parseAllowedAppleEnvironments(Deno.env.get("APPLE_ALLOWED_ENVIRONMENTS"));
  const config: ApplePurchaseContextConfig = {
    supabaseUrl: Deno.env.get("SUPABASE_URL") ?? "",
    supabaseAnonKey: Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    bundleId: Deno.env.get("APPLE_BUNDLE_ID") ?? "",
    appAppleId: Deno.env.get("APPLE_APP_ID") ?? "",
    allowedEnvironments,
    deploymentMode: (Deno.env.get("APPLE_DEPLOYMENT_MODE") ?? "") as AppleDeploymentMode
  };
  const missing = [
    ["SUPABASE_URL", config.supabaseUrl],
    ["SUPABASE_ANON_KEY", config.supabaseAnonKey],
    ["APPLE_BUNDLE_ID", config.bundleId],
    ["APPLE_APP_ID", config.appAppleId],
    ["APPLE_ALLOWED_ENVIRONMENTS", allowedEnvironments.length ? "configured" : ""],
    ["APPLE_DEPLOYMENT_MODE", config.deploymentMode]
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);
  if (missing.length) return { config: null, error: `Missing server env: ${missing.join(", ")}`, missing };
  const validationError = validateAppleBaseConfig(config);
  if (validationError) return { config: null, error: validationError, missing: [] };
  return { config, error: null, missing: [] };
}

export function readAppleServerConfig(): { config: AppleServerConfig | null; error: string | null; missing: string[] } {
  const allowedEnvironments = parseAllowedAppleEnvironments(Deno.env.get("APPLE_ALLOWED_ENVIRONMENTS"));
  const config: AppleServerConfig = {
    supabaseUrl: Deno.env.get("SUPABASE_URL") ?? "",
    supabaseAnonKey: Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    supabaseServiceRoleKey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    issuerId: Deno.env.get("APPLE_APP_STORE_ISSUER_ID") ?? "",
    keyId: Deno.env.get("APPLE_APP_STORE_KEY_ID") ?? "",
    privateKey: Deno.env.get("APPLE_APP_STORE_PRIVATE_KEY") ?? "",
    bundleId: Deno.env.get("APPLE_BUNDLE_ID") ?? "",
    appAppleId: Deno.env.get("APPLE_APP_ID") ?? "",
    allowedEnvironments,
    deploymentMode: (Deno.env.get("APPLE_DEPLOYMENT_MODE") ?? "") as AppleDeploymentMode
  };
  const missing = [
    ["SUPABASE_URL", config.supabaseUrl],
    ["SUPABASE_ANON_KEY", config.supabaseAnonKey],
    ["SUPABASE_SERVICE_ROLE_KEY", config.supabaseServiceRoleKey],
    ["APPLE_APP_STORE_ISSUER_ID", config.issuerId],
    ["APPLE_APP_STORE_KEY_ID", config.keyId],
    ["APPLE_APP_STORE_PRIVATE_KEY", config.privateKey],
    ["APPLE_BUNDLE_ID", config.bundleId],
    ["APPLE_APP_ID", config.appAppleId],
    ["APPLE_ALLOWED_ENVIRONMENTS", allowedEnvironments.length ? "configured" : ""],
    ["APPLE_DEPLOYMENT_MODE", config.deploymentMode]
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);
  if (missing.length) return { config: null, error: `Missing server env: ${missing.join(", ")}`, missing };
  const validationError = validateAppleBaseConfig(config);
  if (validationError) return { config: null, error: validationError, missing: [] };
  if (!config.privateKey.includes("BEGIN PRIVATE KEY")) return { config: null, error: "APPLE_APP_STORE_PRIVATE_KEY is invalid.", missing: [] };
  return { config, error: null, missing: [] };
}

export function appleProductIds(): AppleProductId[] {
  return [APPLE_MONTHLY_PRODUCT_ID, APPLE_ANNUAL_PRODUCT_ID];
}

export function appleProductPlan(productId: string): "pro" | null {
  return appleProductIds().includes(productId as AppleProductId) ? "pro" : null;
}

export function appleProviderProductRef(productId: AppleProductId): string {
  return `${APPLE_BUNDLE_ID}:${productId}`;
}

export function appleAppAccountTokenForUser(userId: string): string {
  if (!isUuid(userId)) throw new AppleAppStoreError("invalid_user", false, 401);
  return userId;
}

export async function appleUserRefFingerprint(userId: string): Promise<string> {
  return `user_uuid_sha256_${await sha256Hex(userId)}`;
}

export function requestBodyTooLarge(bodyText: string, maxBytes = APPLE_JWS_MAX_BYTES): boolean {
  return new TextEncoder().encode(bodyText).byteLength > maxBytes;
}

export function parseApplePurchaseVerifyBody(input: {
  contentType: string | null;
  bodyText: string;
}): { body: ApplePurchaseVerifyBody | null; error: string | null } {
  if (!input.contentType?.toLowerCase().includes("application/json")) return { body: null, error: "invalid_content_type" };
  let parsed: unknown;
  try {
    parsed = JSON.parse(input.bodyText);
  } catch {
    return { body: null, error: "invalid_json" };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { body: null, error: "invalid_request" };
  const record = parsed as Record<string, unknown>;
  const signedTransactionInfo = typeof record.signedTransactionInfo === "string" ? record.signedTransactionInfo.trim() : "";
  const signedRenewalInfo = typeof record.signedRenewalInfo === "string" ? record.signedRenewalInfo.trim() : null;
  if (!validJwsShape(signedTransactionInfo)) return { body: null, error: "invalid_signed_transaction" };
  if (signedRenewalInfo !== null && !validJwsShape(signedRenewalInfo)) return { body: null, error: "invalid_signed_renewal_info" };
  return { body: { signedTransactionInfo, signedRenewalInfo }, error: null };
}

export async function verifyAppleSignedTransactionSet(input: {
  signedTransactionInfo: string;
  signedRenewalInfo?: string | null;
  config: Pick<AppleServerConfig, "bundleId" | "appAppleId" | "allowedEnvironments">;
}): Promise<VerifiedAppleSignedPayloads> {
  const transaction = await verifyAppleSignedJws<AppleTransactionDecodedPayload>(input.signedTransactionInfo);
  validateAppleTransactionPayload(transaction, input.config);
  const renewalInfo = input.signedRenewalInfo ? await verifyAppleSignedJws<AppleRenewalInfoDecodedPayload>(input.signedRenewalInfo) : null;
  if (renewalInfo) validateAppleRenewalInfoPayload(renewalInfo, input.config, transaction);
  return { transaction, renewalInfo };
}

export async function verifyAppleNotificationPayload(input: {
  signedPayload: string;
  config: Pick<AppleServerConfig, "bundleId" | "appAppleId" | "allowedEnvironments">;
}): Promise<{
  notification: AppleNotificationDecodedPayload;
  transaction: AppleTransactionDecodedPayload | null;
  renewalInfo: AppleRenewalInfoDecodedPayload | null;
  status: number | null;
}> {
  const notification = await verifyAppleSignedJws<AppleNotificationDecodedPayload>(input.signedPayload);
  validateAppleNotificationPayload(notification, input.config);
  if (notification.notificationType === "TEST") return { notification, transaction: null, renewalInfo: null, status: null };
  const data = notification.data as AppleNotificationData;
  const signedTransactionInfo = typeof data.signedTransactionInfo === "string" ? data.signedTransactionInfo : "";
  const signedRenewalInfo = typeof data.signedRenewalInfo === "string" ? data.signedRenewalInfo : null;
  if (!validJwsShape(signedTransactionInfo)) throw new AppleAppStoreError("missing_signed_transaction", false);
  const verified = await verifyAppleSignedTransactionSet({
    signedTransactionInfo,
    signedRenewalInfo,
    config: input.config
  });
  const status = typeof data.status === "number" && Number.isInteger(data.status) ? data.status : null;
  return { notification, transaction: verified.transaction, renewalInfo: verified.renewalInfo, status };
}

export async function normalizeAppleSubscription(input: {
  transaction: AppleTransactionDecodedPayload;
  renewalInfo: AppleRenewalInfoDecodedPayload | null;
  status: number | null;
  notificationType?: string | null;
  config: Pick<AppleServerConfig, "bundleId" | "appAppleId" | "allowedEnvironments">;
  asOfIso: string;
}): Promise<{ normalized: NormalizedAppleSubscription | null; error: string | null }> {
  const transactionId = requiredString(input.transaction.transactionId);
  const originalTransactionId = requiredString(input.transaction.originalTransactionId);
  const productId = requiredString(input.transaction.productId);
  const bundleId = requiredString(input.transaction.bundleId);
  const environment = appleEnvironmentFromPayload(input.transaction.environment);
  const appAppleId = stringFromUnknown(input.transaction.appAppleId) ?? input.config.appAppleId;
  const appAccountToken = stringFromUnknown(input.transaction.appAccountToken);
  if (!transactionId || !validAppleIdentifier(transactionId)) return { normalized: null, error: "invalid_transaction_id" };
  if (!originalTransactionId || !validAppleIdentifier(originalTransactionId)) return { normalized: null, error: "invalid_original_transaction_id" };
  if (!isAppleProductId(productId)) return { normalized: null, error: "unsupported_product" };
  if (bundleId !== input.config.bundleId) return { normalized: null, error: "bundle_mismatch" };
  if (!environment || !appleEnvironmentAllowed(input.config, environment)) return { normalized: null, error: "environment_mismatch" };
  if (environment === "production" && appAppleId !== input.config.appAppleId) return { normalized: null, error: "app_id_mismatch" };
  if (appAccountToken !== null && !isUuid(appAccountToken)) return { normalized: null, error: "invalid_app_account_token" };

  const signedDate = millisToIso(input.transaction.signedDate) ?? millisToIso(input.renewalInfo?.signedDate) ?? input.asOfIso;
  const purchaseDate = millisToIso(input.transaction.purchaseDate);
  const originalPurchaseDate = millisToIso(input.transaction.originalPurchaseDate);
  const expiresDate = millisToIso(input.transaction.expiresDate) ?? millisToIso(input.renewalInfo?.renewalDate);
  const revocationDate = millisToIso(input.transaction.revocationDate);
  const gracePeriodExpiresDate = millisToIso(input.renewalInfo?.gracePeriodExpiresDate);
  const autoRenewStatus = numberFromUnknown(input.renewalInfo?.autoRenewStatus);
  const inBillingRetry = input.renewalInfo?.isInBillingRetryPeriod === true;
  const statusMap = providerStatusForAppleState({
    appleStatus: input.status,
    notificationType: input.notificationType ?? null,
    autoRenewStatus,
    expiresDate,
    revocationDate,
    gracePeriodExpiresDate,
    inBillingRetry,
    asOfIso: input.asOfIso
  });
  if (!statusMap) return { normalized: null, error: "unknown_subscription_state" };
  if (requiresPeriodEnd(statusMap.status) && !statusMap.currentPeriodEnd && !statusMap.gracePeriodEndsAt) {
    return { normalized: null, error: "missing_period_end" };
  }

  return {
    normalized: {
      providerEnvironment: environment,
      bundleId,
      appAppleId,
      productId,
      providerProductRef: appleProviderProductRef(productId),
      originalTransactionId,
      originalTransactionIdFingerprint: await appleIdentifierFingerprint(originalTransactionId, "apple_original_transaction_sha256"),
      transactionId,
      transactionIdFingerprint: await appleIdentifierFingerprint(transactionId, "apple_transaction_sha256"),
      webOrderLineItemIdFingerprint: await optionalAppleIdentifierFingerprint(input.transaction.webOrderLineItemId, "apple_web_order_line_item_sha256"),
      appAccountToken,
      providerStatus: statusMap.status,
      autoRenews: autoRenewStatus === 0 || autoRenewStatus === 1 ? autoRenewStatus === 1 : null,
      purchaseDate,
      originalPurchaseDate,
      currentPeriodEnd: statusMap.currentPeriodEnd,
      gracePeriodEndsAt: statusMap.gracePeriodEndsAt,
      billingRetryStartedAt: statusMap.billingRetryStartedAt,
      expiresAt: statusMap.expiresAt,
      revokedAt: statusMap.revokedAt,
      refundedAt: statusMap.refundedAt,
      signedDate,
      testPurchase: environment === "sandbox",
      reconciliationStatus: statusMap.reconciliationStatus
    },
    error: null
  };
}

export function providerStatusForAppleState(input: {
  appleStatus: number | null;
  notificationType: string | null;
  autoRenewStatus: number | null;
  expiresDate: string | null;
  revocationDate: string | null;
  gracePeriodExpiresDate: string | null;
  inBillingRetry: boolean;
  asOfIso: string;
}):
  | {
      status: AppleProviderSubscriptionStatus;
      reconciliationStatus: "current" | "needs_verification" | "manual_review";
      currentPeriodEnd: string | null;
      gracePeriodEndsAt: string | null;
      billingRetryStartedAt: string | null;
      expiresAt: string | null;
      revokedAt: string | null;
      refundedAt: string | null;
    }
  | null {
  if (input.notificationType === "REFUND") {
    return inactiveState("refunded", input.revocationDate ?? input.asOfIso, input.revocationDate ?? input.asOfIso);
  }
  if (input.notificationType === "REVOKE" || input.appleStatus === 5 || input.revocationDate) {
    return inactiveState("revoked", input.expiresDate, input.revocationDate ?? input.asOfIso);
  }
  if (input.notificationType === "GRACE_PERIOD_EXPIRED" || input.notificationType === "EXPIRED" || input.appleStatus === 2) {
    return inactiveState("expired", input.expiresDate ?? input.asOfIso, null);
  }
  if (input.appleStatus === 4 || input.gracePeriodExpiresDate) {
    return {
      status: "grace_period",
      reconciliationStatus: "current",
      currentPeriodEnd: input.expiresDate ?? input.gracePeriodExpiresDate,
      gracePeriodEndsAt: input.gracePeriodExpiresDate,
      billingRetryStartedAt: null,
      expiresAt: null,
      revokedAt: null,
      refundedAt: null
    };
  }
  if (input.appleStatus === 3 || input.inBillingRetry || input.notificationType === "DID_FAIL_TO_RENEW") {
    return {
      status: "billing_retry",
      reconciliationStatus: "needs_verification",
      currentPeriodEnd: input.expiresDate,
      gracePeriodEndsAt: null,
      billingRetryStartedAt: input.asOfIso,
      expiresAt: null,
      revokedAt: null,
      refundedAt: null
    };
  }
  if (
    input.appleStatus === 1 ||
    input.notificationType === "SUBSCRIBED" ||
    input.notificationType === "DID_RENEW" ||
    input.notificationType === "DID_CHANGE_RENEWAL_STATUS" ||
    input.notificationType === "DID_CHANGE_RENEWAL_PREF" ||
    input.notificationType === "RENEWAL_EXTENDED" ||
    input.notificationType === "RENEWAL_EXTENSION"
  ) {
    const currentPeriodEnd = input.expiresDate;
    return {
      status: input.autoRenewStatus === 0 ? "cancelled_active_until_period_end" : "active",
      reconciliationStatus: "current",
      currentPeriodEnd,
      gracePeriodEndsAt: null,
      billingRetryStartedAt: null,
      expiresAt: null,
      revokedAt: null,
      refundedAt: null
    };
  }
  return {
    status: "unknown_needs_reconciliation",
    reconciliationStatus: "manual_review",
    currentPeriodEnd: null,
    gracePeriodEndsAt: null,
    billingRetryStartedAt: null,
    expiresAt: null,
    revokedAt: null,
    refundedAt: null
  };
}

export async function normalizeVerifiedAppleStatusResponse(input: {
  response: AppleStatusResponse;
  originalTransactionId: string;
  expectedEnvironment: AppleEnvironment;
  config: Pick<AppleServerConfig, "bundleId" | "appAppleId" | "allowedEnvironments">;
  asOfIso: string;
}): Promise<{ normalized: NormalizedAppleSubscription | null; error: string | null }> {
  if (appleEnvironmentFromPayload(input.response.environment) !== input.expectedEnvironment) {
    return { normalized: null, error: "status_environment_mismatch" };
  }
  if (requiredString(input.response.bundleId) !== input.config.bundleId) return { normalized: null, error: "status_bundle_mismatch" };
  if (input.expectedEnvironment === "production" && stringFromUnknown(input.response.appAppleId) !== input.config.appAppleId) {
    return { normalized: null, error: "status_app_id_mismatch" };
  }
  const candidates: Array<{ transaction: AppleTransactionDecodedPayload; renewalInfo: AppleRenewalInfoDecodedPayload | null; status: number | null }> = [];
  for (const group of input.response.data ?? []) {
    for (const item of group.lastTransactions ?? []) {
      if (item.originalTransactionId !== input.originalTransactionId) continue;
      const signedTransactionInfo = typeof item.signedTransactionInfo === "string" ? item.signedTransactionInfo : "";
      if (!validJwsShape(signedTransactionInfo)) continue;
      const signedRenewalInfo = typeof item.signedRenewalInfo === "string" ? item.signedRenewalInfo : null;
      const verified = await verifyAppleSignedTransactionSet({ signedTransactionInfo, signedRenewalInfo, config: input.config });
      if (appleEnvironmentFromPayload(verified.transaction.environment) !== input.expectedEnvironment) continue;
      candidates.push({
        transaction: verified.transaction,
        renewalInfo: verified.renewalInfo,
        status: Number.isInteger(item.status) ? (item.status as number) : null
      });
    }
  }
  if (!candidates.length) return { normalized: null, error: "status_transaction_not_found" };
  candidates.sort((a, b) => signedTime(b.transaction, b.renewalInfo) - signedTime(a.transaction, a.renewalInfo));
  return normalizeAppleSubscription({
    transaction: candidates[0].transaction,
    renewalInfo: candidates[0].renewalInfo,
    status: candidates[0].status,
    config: input.config,
    asOfIso: input.asOfIso
  });
}

export async function fetchAppleSubscriptionStatuses(input: {
  config: Pick<AppleServerConfig, "issuerId" | "keyId" | "privateKey" | "bundleId">;
  environment: AppleEnvironment;
  originalTransactionId: string;
  fetchImpl?: FetchLike;
}): Promise<AppleStatusResponse> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const accessToken = await createAppleAppStoreApiJwt(input.config);
  const baseUrl = input.environment === "production" ? "https://api.storekit.apple.com" : "https://api.storekit-sandbox.apple.com";
  const response = await fetchImpl(`${baseUrl}/inApps/v1/subscriptions/${encodeURIComponent(input.originalTransactionId)}`, {
    method: "GET",
    headers: {
      authorization: `Bearer ${accessToken}`,
      accept: "application/json"
    }
  });
  if (!response.ok) throw new AppleAppStoreError(classifyAppleApiStatus(response.status), isRetryableAppleApiStatus(response.status), response.status);
  const json = await response.json().catch(() => null);
  if (!json || typeof json !== "object" || Array.isArray(json)) {
    throw new AppleAppStoreError("invalid_status_response", true, response.status);
  }
  return json as AppleStatusResponse;
}

export async function createAppleAppStoreApiJwt(input: Pick<AppleServerConfig, "issuerId" | "keyId" | "privateKey" | "bundleId">): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlJson({ alg: "ES256", kid: input.keyId, typ: "JWT" });
  const claims = base64UrlJson({
    iss: input.issuerId,
    iat: now,
    exp: now + 1200,
    aud: "appstoreconnect-v1",
    bid: input.bundleId
  });
  const signingInput = `${header}.${claims}`;
  const signature = await signEs256(signingInput, input.privateKey);
  return `${signingInput}.${base64UrlBytes(signature)}`;
}

export async function applePurchaseVerificationTransitionInput(input: {
  normalized: NormalizedAppleSubscription;
  deploymentMode: AppleDeploymentMode;
  userId: string;
  sourceEventRef: string;
  payloadHash: string;
  asOfIso: string;
}): Promise<ApplePurchaseVerificationRpcArgs> {
  if (input.normalized.appAccountToken !== input.userId) {
    throw new AppleAppStoreError("app_account_token_mismatch", false, 403);
  }
  return appleTransitionArgs({
    normalized: input.normalized,
    deploymentMode: input.deploymentMode,
    userId: input.userId,
    userRefFingerprint: await appleUserRefFingerprint(input.userId),
    eventType: "purchase_verification",
    eventSubtype: null,
    providerEventRef: input.sourceEventRef,
    payloadHash: input.payloadHash,
    asOfIso: input.asOfIso
  });
}

export async function appleNotificationTransitionInput(input: {
  normalized: NormalizedAppleSubscription | null;
  notification: AppleNotificationDecodedPayload;
  deploymentMode: AppleDeploymentMode;
  payloadHash: string;
  asOfIso: string;
}): Promise<AppleServerNotificationRpcArgs> {
  const notificationType = requiredString(input.notification.notificationType);
  const notificationUuid = requiredString(input.notification.notificationUUID);
  if (!notificationType || !notificationUuid || !validAppleEventRef(notificationUuid)) {
    throw new AppleAppStoreError("invalid_notification", false);
  }
  if (notificationType === "TEST") {
    const environment = appleNotificationEnvironment(input.notification);
    if (!environment) throw new AppleAppStoreError("missing_test_notification_environment", false);
    return {
      p_provider_environment: environment,
      p_deployment_mode: input.deploymentMode,
      p_provider_event_ref: `notification:${notificationUuid}`,
      p_event_type: "TEST",
      p_event_subtype: null,
      p_event_time: millisToIso(input.notification.signedDate) ?? input.asOfIso,
      p_payload_hash: input.payloadHash,
      p_bundle_id: APPLE_BUNDLE_ID,
      p_app_apple_id: APPLE_APP_ID,
      p_product_id: null,
      p_provider_product_ref: null,
      p_original_transaction_id_fingerprint: null,
      p_original_transaction_id: null,
      p_transaction_id_fingerprint: null,
      p_app_account_token: null,
      p_provider_status: null,
      p_auto_renews: null,
      p_start_time: null,
      p_current_period_end: null,
      p_grace_period_ends_at: null,
      p_billing_retry_started_at: null,
      p_expires_at: null,
      p_revoked_at: null,
      p_refunded_at: null,
      p_test_purchase: true,
      p_as_of: input.asOfIso
    };
  }
  if (!input.normalized) throw new AppleAppStoreError("missing_normalized_subscription", true, 500);
  return appleServerNotificationTransitionArgs({
    normalized: input.normalized,
    deploymentMode: input.deploymentMode,
    eventType: notificationType,
    eventSubtype: stringFromUnknown(input.notification.subtype),
    providerEventRef: `notification:${notificationUuid}`,
    payloadHash: input.payloadHash,
    asOfIso: input.asOfIso
  });
}

export async function processApplePurchaseVerification(
  supabase: { rpc: (functionName: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }> },
  args: ApplePurchaseVerificationRpcArgs
): Promise<ApplePurchaseVerificationRow> {
  const { data, error } = await supabase.rpc("process_apple_purchase_verification", args);
  if (error) throw new AppleAppStoreError("rpc_failed", true, 500);
  const row = normalizePurchaseRow(data);
  if (!row) throw new AppleAppStoreError("invalid_rpc_result", true, 500);
  if (row.retryable && !row.processed && !row.already_processed) throw new AppleAppStoreError(row.result || "verification_failed", true, 500);
  return row;
}

export async function processAppleServerNotification(
  supabase: { rpc: (functionName: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }> },
  args: AppleServerNotificationRpcArgs
): Promise<AppleNotificationTransitionRow> {
  const { data, error } = await supabase.rpc("process_apple_server_notification_event", args);
  if (error) throw new AppleAppStoreError("rpc_failed", true, 500);
  const row = normalizeNotificationRow(data);
  if (!row) throw new AppleAppStoreError("invalid_rpc_result", true, 500);
  if (row.retryable && !row.processed && !row.already_processed && !row.unsupported_ignored && row.result !== "unbound_original_transaction") {
    throw new AppleAppStoreError(row.result || "notification_failed", true, 500);
  }
  return row;
}

export async function verifyAppleSignedJws<T>(jws: string): Promise<T> {
  const parsed = parseCompactJws(jws);
  const header = parsed.header as AppleJwsHeader;
  if (header.alg !== "ES256") throw new AppleAppStoreError("unsupported_jws_algorithm", false);
  if (!Array.isArray(header.x5c) || header.x5c.length < 3 || !header.x5c.every((entry) => typeof entry === "string" && entry.length > 0)) {
    throw new AppleAppStoreError("missing_jws_certificate_chain", false);
  }
  const payload = decodeBase64UrlJson(parsed.payload) as Record<string, unknown>;
  const effectiveDate = dateFromMillis(payload.signedDate) ?? new Date();
  const certificates = (header.x5c as string[]).map((cert) => parseCertificate(base64ToBytes(cert)));
  await verifyAppleCertificateChain(certificates, effectiveDate);
  const leaf = certificates[0];
  if (leaf.publicKeyAlgorithmOid !== "1.2.840.10045.2.1" || leaf.namedCurveOid !== "1.2.840.10045.3.1.7") {
    throw new AppleAppStoreError("invalid_jws_leaf_key", false);
  }
  const key = await globalThis.crypto.subtle.importKey(
    "spki",
    leaf.subjectPublicKeyInfo,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["verify"]
  );
  const verified = await globalThis.crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    parsed.signature,
    new TextEncoder().encode(parsed.signingInput)
  );
  if (!verified) throw new AppleAppStoreError("invalid_jws_signature", false);
  return payload as T;
}

export async function sha256Hex(value: string | Uint8Array): Promise<string> {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function appleIdentifierFingerprint(value: string, prefix: string): Promise<string> {
  return `${prefix}_${await sha256Hex(value)}`;
}

function validateAppleBaseConfig(
  config: Pick<AppleServerConfig, "bundleId" | "appAppleId" | "allowedEnvironments" | "deploymentMode">
): string | null {
  if (config.bundleId !== APPLE_BUNDLE_ID) return "Apple bundle ID is not configured for Can You Geo.";
  if (config.appAppleId !== APPLE_APP_ID) return "Apple app ID is not configured for Can You Geo.";
  if (!config.allowedEnvironments.length) return "APPLE_ALLOWED_ENVIRONMENTS must include sandbox or production.";
  if (!config.allowedEnvironments.every((environment) => environment === "sandbox" || environment === "production")) {
    return "APPLE_ALLOWED_ENVIRONMENTS must include only sandbox or production.";
  }
  if (new Set(config.allowedEnvironments).size !== config.allowedEnvironments.length) {
    return "APPLE_ALLOWED_ENVIRONMENTS must not contain duplicates.";
  }
  if (config.deploymentMode !== "staging" && config.deploymentMode !== "production") {
    return "APPLE_DEPLOYMENT_MODE must be staging or production.";
  }
  if (config.deploymentMode === "staging" && config.allowedEnvironments.some((environment) => environment !== "sandbox")) {
    return "Staging Apple deployments may only allow sandbox transactions.";
  }
  return null;
}

function validateAppleTransactionPayload(
  payload: AppleTransactionDecodedPayload,
  config: Pick<AppleServerConfig, "bundleId" | "appAppleId" | "allowedEnvironments">
): void {
  const environment = appleEnvironmentFromPayload(payload.environment);
  if (payload.bundleId !== config.bundleId) throw new AppleAppStoreError("bundle_mismatch", false);
  if (!environment || !appleEnvironmentAllowed(config, environment)) throw new AppleAppStoreError("environment_mismatch", false);
  if (environment === "production" && stringFromUnknown(payload.appAppleId) !== config.appAppleId) throw new AppleAppStoreError("app_id_mismatch", false);
  if (!isAppleProductId(payload.productId)) throw new AppleAppStoreError("unsupported_product", false);
  if (!requiredString(payload.originalTransactionId) || !requiredString(payload.transactionId)) {
    throw new AppleAppStoreError("missing_transaction_identity", false);
  }
}

function validateAppleRenewalInfoPayload(
  payload: AppleRenewalInfoDecodedPayload,
  config: Pick<AppleServerConfig, "bundleId" | "appAppleId" | "allowedEnvironments">,
  transaction: AppleTransactionDecodedPayload
): void {
  const transactionEnvironment = appleEnvironmentFromPayload(transaction.environment);
  if (!transactionEnvironment || !appleEnvironmentAllowed(config, transactionEnvironment)) throw new AppleAppStoreError("environment_mismatch", false);
  if (appleEnvironmentFromPayload(payload.environment) !== transactionEnvironment) throw new AppleAppStoreError("renewal_environment_mismatch", false);
  const renewalOriginal = requiredString(payload.originalTransactionId);
  if (renewalOriginal && renewalOriginal !== transaction.originalTransactionId) throw new AppleAppStoreError("renewal_original_transaction_mismatch", false);
  const productId = requiredString(payload.productId) || requiredString(payload.autoRenewProductId);
  if (productId && !isAppleProductId(productId)) throw new AppleAppStoreError("renewal_product_unsupported", false);
}

function validateAppleNotificationPayload(
  payload: AppleNotificationDecodedPayload,
  config: Pick<AppleServerConfig, "bundleId" | "appAppleId" | "allowedEnvironments">
): void {
  const notificationType = requiredString(payload.notificationType);
  const notificationUuid = requiredString(payload.notificationUUID);
  if (!notificationType || !notificationUuid) throw new AppleAppStoreError("invalid_notification_payload", false);
  if (!APPLE_NOTIFICATION_TYPES.has(notificationType)) throw new AppleAppStoreError("unsupported_notification_type", false);
  if (!payload.data || typeof payload.data !== "object" || Array.isArray(payload.data)) {
    throw new AppleAppStoreError("missing_notification_data", false);
  }
  const data = payload.data as AppleNotificationData;
  if (data.bundleId !== config.bundleId) throw new AppleAppStoreError("notification_bundle_mismatch", false);
  const environment = appleEnvironmentFromPayload(data.environment);
  if (!environment || !appleEnvironmentAllowed(config, environment)) throw new AppleAppStoreError("notification_environment_mismatch", false);
  if (environment === "production" && stringFromUnknown(data.appAppleId) !== config.appAppleId) {
    throw new AppleAppStoreError("notification_app_id_mismatch", false);
  }
}

const APPLE_NOTIFICATION_TYPES = new Set([
  "SUBSCRIBED",
  "DID_RENEW",
  "DID_CHANGE_RENEWAL_STATUS",
  "DID_CHANGE_RENEWAL_PREF",
  "DID_FAIL_TO_RENEW",
  "GRACE_PERIOD_EXPIRED",
  "EXPIRED",
  "REFUND",
  "REVOKE",
  "RENEWAL_EXTENDED",
  "RENEWAL_EXTENSION",
  "TEST"
]);

async function optionalAppleIdentifierFingerprint(value: unknown, prefix: string): Promise<string | null> {
  const text = stringFromUnknown(value);
  return text ? appleIdentifierFingerprint(text, prefix) : null;
}

function appleSubscriptionTransitionBaseArgs(input: {
  normalized: NormalizedAppleSubscription;
  deploymentMode: AppleDeploymentMode;
  eventType: string;
  eventSubtype: string | null;
  providerEventRef: string;
  payloadHash: string;
  asOfIso: string;
}): AppleSubscriptionTransitionRpcArgsBase {
  return {
    p_provider_environment: input.normalized.providerEnvironment,
    p_deployment_mode: input.deploymentMode,
    p_provider_event_ref: input.providerEventRef,
    p_event_type: input.eventType,
    p_event_subtype: input.eventSubtype,
    p_event_time: input.normalized.signedDate ?? input.asOfIso,
    p_payload_hash: input.payloadHash,
    p_bundle_id: input.normalized.bundleId,
    p_app_apple_id: input.normalized.appAppleId,
    p_product_id: input.normalized.productId,
    p_provider_product_ref: input.normalized.providerProductRef,
    p_original_transaction_id_fingerprint: input.normalized.originalTransactionIdFingerprint,
    p_original_transaction_id: input.normalized.originalTransactionId,
    p_transaction_id_fingerprint: input.normalized.transactionIdFingerprint,
    p_app_account_token: input.normalized.appAccountToken,
    p_provider_status: input.normalized.providerStatus,
    p_auto_renews: input.normalized.autoRenews,
    p_start_time: input.normalized.originalPurchaseDate ?? input.normalized.purchaseDate,
    p_current_period_end: input.normalized.currentPeriodEnd,
    p_grace_period_ends_at: input.normalized.gracePeriodEndsAt,
    p_billing_retry_started_at: input.normalized.billingRetryStartedAt,
    p_expires_at: input.normalized.expiresAt,
    p_revoked_at: input.normalized.revokedAt,
    p_refunded_at: input.normalized.refundedAt,
    p_test_purchase: input.normalized.testPurchase,
    p_as_of: input.asOfIso
  };
}

function appleTransitionArgs(input: {
  normalized: NormalizedAppleSubscription;
  deploymentMode: AppleDeploymentMode;
  userId: string;
  userRefFingerprint: string;
  eventType: string;
  eventSubtype: string | null;
  providerEventRef: string;
  payloadHash: string;
  asOfIso: string;
}): ApplePurchaseVerificationRpcArgs {
  return {
    ...appleSubscriptionTransitionBaseArgs(input),
    p_user_id: input.userId,
    p_user_ref_fingerprint: input.userRefFingerprint
  };
}

function appleServerNotificationTransitionArgs(input: {
  normalized: NormalizedAppleSubscription;
  deploymentMode: AppleDeploymentMode;
  eventType: string;
  eventSubtype: string | null;
  providerEventRef: string;
  payloadHash: string;
  asOfIso: string;
}): AppleServerNotificationRpcArgs {
  return appleSubscriptionTransitionBaseArgs(input);
}

function normalizePurchaseRow(data: unknown): ApplePurchaseVerificationRow | null {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") return null;
  const candidate = row as Record<string, unknown>;
  if (typeof candidate.result !== "string") return null;
  if (typeof candidate.provider_environment !== "string") return null;
  if (typeof candidate.event_type !== "string") return null;
  if (candidate.event_subtype !== null && typeof candidate.event_subtype !== "string") return null;
  if (typeof candidate.processed !== "boolean") return null;
  if (typeof candidate.already_processed !== "boolean") return null;
  if (typeof candidate.provider_subscription_changed !== "boolean") return null;
  if (typeof candidate.compatibility_refreshed !== "boolean") return null;
  if (typeof candidate.native_review_entitlement_refreshed !== "boolean") return null;
  if (
    candidate.entitlement_scope !== "live" &&
    candidate.entitlement_scope !== "native_review" &&
    candidate.entitlement_scope !== "none"
  ) {
    return null;
  }
  if (typeof candidate.reconciliation_required !== "boolean") return null;
  if (typeof candidate.retryable !== "boolean") return null;
  return candidate as ApplePurchaseVerificationRow;
}

function normalizeNotificationRow(data: unknown): AppleNotificationTransitionRow | null {
  const row = normalizePurchaseRow(data);
  if (!row) return null;
  const raw = Array.isArray(data) ? data[0] : data;
  if (!raw || typeof raw !== "object" || typeof (raw as Record<string, unknown>).unsupported_ignored !== "boolean") return null;
  return raw as AppleNotificationTransitionRow;
}

function inactiveState(status: "expired" | "refunded" | "revoked", expiresAt: string | null, effectiveAt: string | null) {
  return {
    status,
    reconciliationStatus: "current" as const,
    currentPeriodEnd: null,
    gracePeriodEndsAt: null,
    billingRetryStartedAt: null,
    expiresAt: status === "expired" ? expiresAt : null,
    revokedAt: status === "revoked" ? effectiveAt : null,
    refundedAt: status === "refunded" ? effectiveAt : null
  };
}

function requiresPeriodEnd(status: AppleProviderSubscriptionStatus): boolean {
  return status === "active" || status === "cancelled_active_until_period_end" || status === "grace_period";
}

function classifyAppleApiStatus(status: number): string {
  if (status === 400) return "invalid_apple_api_request";
  if (status === 401) return "apple_api_unauthorized";
  if (status === 403) return "apple_api_permission_denied";
  if (status === 404) return "apple_transaction_not_found";
  if (status === 429) return "apple_api_rate_limited";
  if (status >= 500) return "apple_api_unavailable";
  return "apple_api_failed";
}

function isRetryableAppleApiStatus(status: number): boolean {
  return status === 429 || status >= 500 || status === 0;
}

function isAppleProductId(value: unknown): value is AppleProductId {
  return value === APPLE_MONTHLY_PRODUCT_ID || value === APPLE_ANNUAL_PRODUCT_ID;
}

function parseAllowedAppleEnvironments(value: string | null | undefined): AppleEnvironment[] {
  if (!value) return [];
  return value
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
    .flatMap((entry) => (entry === "sandbox" || entry === "production" ? [entry] : [entry as AppleEnvironment]));
}

function appleEnvironmentAllowed(
  config: Pick<AppleServerConfig, "allowedEnvironments">,
  environment: AppleEnvironment
): boolean {
  return config.allowedEnvironments.includes(environment);
}

function appleNotificationEnvironment(notification: AppleNotificationDecodedPayload): AppleEnvironment | null {
  if (!notification.data || typeof notification.data !== "object" || Array.isArray(notification.data)) return null;
  return appleEnvironmentFromPayload((notification.data as AppleNotificationData).environment);
}

export function appleEnvironmentFromPayload(value: unknown): AppleEnvironment | null {
  if (value === "Sandbox" || value === "sandbox") return "sandbox";
  if (value === "Production" || value === "production") return "production";
  return null;
}

function validJwsShape(value: string): boolean {
  return value.length > 20 && value.length <= APPLE_JWS_MAX_BYTES && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value);
}

function validAppleIdentifier(value: string): boolean {
  return value.length >= 1 && value.length <= 256 && !/\s/.test(value);
}

function validAppleEventRef(value: string): boolean {
  return value.length >= 8 && value.length <= 128 && !/\s/.test(value);
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function requiredString(value: unknown): string {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function stringFromUnknown(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function numberFromUnknown(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function millisToIso(value: unknown): string | null {
  const number = typeof value === "number" ? value : typeof value === "string" && /^\d{10,17}$/.test(value) ? Number(value) : Number.NaN;
  if (!Number.isFinite(number)) return null;
  const date = new Date(number);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function dateFromMillis(value: unknown): Date | null {
  const iso = millisToIso(value);
  return iso ? new Date(iso) : null;
}

function signedTime(transaction: AppleTransactionDecodedPayload, renewalInfo: AppleRenewalInfoDecodedPayload | null): number {
  return (
    dateFromMillis(transaction.signedDate)?.getTime() ??
    dateFromMillis(renewalInfo?.signedDate)?.getTime() ??
    dateFromMillis(transaction.purchaseDate)?.getTime() ??
    0
  );
}

function parseCompactJws(jws: string): { header: Record<string, unknown>; payload: string; signature: Uint8Array; signingInput: string } {
  if (!validJwsShape(jws)) throw new AppleAppStoreError("invalid_jws", false);
  const [headerPart, payload, signaturePart] = jws.split(".");
  return {
    header: decodeBase64UrlJson(headerPart),
    payload,
    signature: base64UrlToBytes(signaturePart),
    signingInput: `${headerPart}.${payload}`
  };
}

function decodeBase64UrlJson(value: string): Record<string, unknown> {
  const text = new TextDecoder().decode(base64UrlToBytes(value));
  const parsed = JSON.parse(text) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new AppleAppStoreError("invalid_jws_json", false);
  return parsed as Record<string, unknown>;
}

async function verifyAppleCertificateChain(certificates: ParsedCertificate[], effectiveDate: Date): Promise<void> {
  if (certificates.length < 3) throw new AppleAppStoreError("incomplete_certificate_chain", false);
  const root = certificates[certificates.length - 1];
  const rootFingerprint = await sha256Hex(root.der);
  if (!APPLE_ROOT_CA_SHA256_FINGERPRINTS.includes(rootFingerprint as (typeof APPLE_ROOT_CA_SHA256_FINGERPRINTS)[number])) {
    throw new AppleAppStoreError("untrusted_apple_root", false);
  }
  for (const certificate of certificates) assertCertificateValidAt(certificate, effectiveDate);
  for (let index = 0; index < certificates.length - 1; index += 1) {
    const valid = await verifyCertificateSignature(certificates[index], certificates[index + 1]);
    if (!valid) throw new AppleAppStoreError("invalid_certificate_chain", false);
  }
  await verifyCertificateSignature(root, root);
}

async function verifyCertificateSignature(certificate: ParsedCertificate, issuer: ParsedCertificate): Promise<boolean> {
  const algorithm = webCryptoVerifyAlgorithm(certificate.signatureAlgorithmOid, issuer);
  const key = await globalThis.crypto.subtle.importKey("spki", issuer.subjectPublicKeyInfo, algorithm.importAlgorithm, false, ["verify"]);
  const signature =
    algorithm.kind === "ecdsa"
      ? ecdsaDerSignatureToRaw(certificate.signatureValue, algorithm.coordinateLength)
      : certificate.signatureValue;
  return globalThis.crypto.subtle.verify(algorithm.verifyAlgorithm, key, signature, certificate.tbsCertificate);
}

function webCryptoVerifyAlgorithm(
  signatureAlgorithmOid: string,
  issuer: ParsedCertificate
): {
  kind: "ecdsa" | "rsa";
  coordinateLength: number;
  importAlgorithm: RsaHashedImportParams | EcKeyImportParams;
  verifyAlgorithm: AlgorithmIdentifier | EcdsaParams;
} {
  if (signatureAlgorithmOid === "1.2.840.10045.4.3.2" || signatureAlgorithmOid === "1.2.840.10045.4.3.3") {
    const namedCurve = issuer.namedCurveOid === "1.3.132.0.34" ? "P-384" : "P-256";
    const hash = signatureAlgorithmOid === "1.2.840.10045.4.3.3" ? "SHA-384" : "SHA-256";
    return {
      kind: "ecdsa",
      coordinateLength: namedCurve === "P-384" ? 48 : 32,
      importAlgorithm: { name: "ECDSA", namedCurve },
      verifyAlgorithm: { name: "ECDSA", hash }
    };
  }
  if (signatureAlgorithmOid === "1.2.840.113549.1.1.11" || signatureAlgorithmOid === "1.2.840.113549.1.1.12") {
    return {
      kind: "rsa",
      coordinateLength: 0,
      importAlgorithm: {
        name: "RSASSA-PKCS1-v1_5",
        hash: signatureAlgorithmOid === "1.2.840.113549.1.1.12" ? "SHA-384" : "SHA-256"
      },
      verifyAlgorithm: { name: "RSASSA-PKCS1-v1_5" }
    };
  }
  throw new AppleAppStoreError("unsupported_certificate_algorithm", false);
}

function assertCertificateValidAt(certificate: ParsedCertificate, effectiveDate: Date): void {
  if (effectiveDate < certificate.notBefore || effectiveDate > certificate.notAfter) {
    throw new AppleAppStoreError("expired_or_not_yet_valid_certificate", false);
  }
}

function parseCertificate(der: Uint8Array): ParsedCertificate {
  const rootNode = readDerNode(der, 0);
  const rootChildren = readDerChildren(der, rootNode);
  if (rootChildren.length < 3) throw new AppleAppStoreError("invalid_certificate", false);
  const tbsNode = rootChildren[0];
  const signatureAlgorithmNode = rootChildren[1];
  const signatureNode = rootChildren[2];
  const tbsChildren = readDerChildren(der, tbsNode);
  let index = tbsChildren[0]?.tag === 0xa0 ? 1 : 0;
  const signatureAlgorithmOid = oidFromAlgorithmSequence(der, signatureAlgorithmNode);
  const validityNode = tbsChildren[index + 3];
  const spkiNode = tbsChildren[index + 5];
  if (!validityNode || !spkiNode) throw new AppleAppStoreError("invalid_certificate_tbs", false);
  const validityChildren = readDerChildren(der, validityNode);
  if (validityChildren.length !== 2) throw new AppleAppStoreError("invalid_certificate_validity", false);
  const spkiChildren = readDerChildren(der, spkiNode);
  const spkiAlgorithmChildren = readDerChildren(der, spkiChildren[0]);
  const publicKeyAlgorithmOid = oidFromNode(der, spkiAlgorithmChildren[0]);
  const namedCurveOid = spkiAlgorithmChildren[1]?.tag === 0x06 ? oidFromNode(der, spkiAlgorithmChildren[1]) : null;
  return {
    der,
    tbsCertificate: der.slice(tbsNode.headerStart, tbsNode.end),
    signatureAlgorithmOid,
    signatureValue: bitStringBytes(der, signatureNode),
    subjectPublicKeyInfo: der.slice(spkiNode.headerStart, spkiNode.end),
    publicKeyAlgorithmOid,
    namedCurveOid,
    notBefore: derTimeToDate(der, validityChildren[0]),
    notAfter: derTimeToDate(der, validityChildren[1])
  };
}

function readDerNode(bytes: Uint8Array, offset: number): DerNode {
  const headerStart = offset;
  const tag = bytes[offset];
  offset += 1;
  const lengthByte = bytes[offset];
  offset += 1;
  let length = lengthByte;
  if ((lengthByte & 0x80) !== 0) {
    const lengthBytes = lengthByte & 0x7f;
    if (lengthBytes === 0 || lengthBytes > 4) throw new AppleAppStoreError("invalid_der_length", false);
    length = 0;
    for (let i = 0; i < lengthBytes; i += 1) {
      length = (length << 8) | bytes[offset + i];
    }
    offset += lengthBytes;
  }
  const contentStart = offset;
  const contentEnd = contentStart + length;
  if (contentEnd > bytes.length) throw new AppleAppStoreError("invalid_der_bounds", false);
  return { tag, headerStart, contentStart, contentEnd, end: contentEnd };
}

function readDerChildren(bytes: Uint8Array, node: DerNode): DerNode[] {
  if (node.tag !== 0x30 && node.tag !== 0xa0) throw new AppleAppStoreError("invalid_der_sequence", false);
  const children: DerNode[] = [];
  let offset = node.contentStart;
  while (offset < node.contentEnd) {
    const child = readDerNode(bytes, offset);
    children.push(child);
    offset = child.end;
  }
  if (offset !== node.contentEnd) throw new AppleAppStoreError("invalid_der_children", false);
  return children;
}

function oidFromAlgorithmSequence(bytes: Uint8Array, node: DerNode): string {
  const children = readDerChildren(bytes, node);
  return oidFromNode(bytes, children[0]);
}

function oidFromNode(bytes: Uint8Array, node: DerNode): string {
  if (node.tag !== 0x06) throw new AppleAppStoreError("invalid_der_oid", false);
  const body = bytes.slice(node.contentStart, node.contentEnd);
  if (!body.length) throw new AppleAppStoreError("invalid_der_oid", false);
  const values = [Math.floor(body[0] / 40), body[0] % 40];
  let value = 0;
  for (let index = 1; index < body.length; index += 1) {
    value = (value << 7) | (body[index] & 0x7f);
    if ((body[index] & 0x80) === 0) {
      values.push(value);
      value = 0;
    }
  }
  return values.join(".");
}

function bitStringBytes(bytes: Uint8Array, node: DerNode): Uint8Array {
  if (node.tag !== 0x03 || bytes[node.contentStart] !== 0) throw new AppleAppStoreError("invalid_der_bit_string", false);
  return bytes.slice(node.contentStart + 1, node.contentEnd);
}

function derTimeToDate(bytes: Uint8Array, node: DerNode): Date {
  const value = new TextDecoder().decode(bytes.slice(node.contentStart, node.contentEnd));
  let year: number;
  let month: number;
  let day: number;
  let hour: number;
  let minute: number;
  let second: number;
  if (node.tag === 0x17) {
    const match = value.match(/^(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})Z$/);
    if (!match) throw new AppleAppStoreError("invalid_der_time", false);
    const shortYear = Number(match[1]);
    year = shortYear >= 50 ? 1900 + shortYear : 2000 + shortYear;
    month = Number(match[2]);
    day = Number(match[3]);
    hour = Number(match[4]);
    minute = Number(match[5]);
    second = Number(match[6]);
  } else if (node.tag === 0x18) {
    const match = value.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})Z$/);
    if (!match) throw new AppleAppStoreError("invalid_der_time", false);
    year = Number(match[1]);
    month = Number(match[2]);
    day = Number(match[3]);
    hour = Number(match[4]);
    minute = Number(match[5]);
    second = Number(match[6]);
  } else {
    throw new AppleAppStoreError("invalid_der_time", false);
  }
  return new Date(Date.UTC(year, month - 1, day, hour, minute, second));
}

function ecdsaDerSignatureToRaw(signature: Uint8Array, coordinateLength: number): Uint8Array {
  const sequence = readDerNode(signature, 0);
  const integers = readDerChildren(signature, sequence);
  if (integers.length !== 2 || integers[0].tag !== 0x02 || integers[1].tag !== 0x02) {
    throw new AppleAppStoreError("invalid_ecdsa_signature", false);
  }
  const r = derIntegerToFixed(signature.slice(integers[0].contentStart, integers[0].contentEnd), coordinateLength);
  const s = derIntegerToFixed(signature.slice(integers[1].contentStart, integers[1].contentEnd), coordinateLength);
  const raw = new Uint8Array(coordinateLength * 2);
  raw.set(r, 0);
  raw.set(s, coordinateLength);
  return raw;
}

function derIntegerToFixed(value: Uint8Array, length: number): Uint8Array {
  let trimmed = value;
  while (trimmed.length > 1 && trimmed[0] === 0) trimmed = trimmed.slice(1);
  if (trimmed.length > length) throw new AppleAppStoreError("invalid_ecdsa_integer", false);
  const result = new Uint8Array(length);
  result.set(trimmed, length - trimmed.length);
  return result;
}

async function signEs256(payload: string, privateKeyPem: string): Promise<Uint8Array> {
  const key = await globalThis.crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(privateKeyPem),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );
  return new Uint8Array(await globalThis.crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(payload)));
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const base64 = pem.replace(/-----BEGIN PRIVATE KEY-----/g, "").replace(/-----END PRIVATE KEY-----/g, "").replace(/\s+/g, "");
  return base64ToBytes(base64).buffer;
}

function base64UrlJson(value: unknown): string {
  return base64UrlBytes(new TextEncoder().encode(JSON.stringify(value)));
}

function base64UrlBytes(value: Uint8Array): string {
  return bytesToBase64(value).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return base64ToBytes(padded);
}

function base64ToBytes(value: string): Uint8Array {
  if (typeof atob === "function") {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
  }
  const maybeBuffer = (globalThis as unknown as { Buffer?: { from: (input: string, encoding: "base64") => Uint8Array } }).Buffer;
  const buffer = maybeBuffer?.from(value, "base64");
  if (!buffer) throw new AppleAppStoreError("base64_unavailable", true, 500);
  return new Uint8Array(buffer);
}

function bytesToBase64(value: Uint8Array): string {
  if (typeof btoa === "function") {
    let binary = "";
    for (const byte of value) binary += String.fromCharCode(byte);
    return btoa(binary);
  }
  const maybeBuffer = (globalThis as unknown as { Buffer?: { from: (input: Uint8Array) => { toString: (encoding: "base64") => string } } }).Buffer;
  const encoded = maybeBuffer?.from(value).toString("base64");
  if (!encoded) throw new AppleAppStoreError("base64_unavailable", true, 500);
  return encoded;
}
