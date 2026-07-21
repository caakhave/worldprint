export const GOOGLE_PLAY_RTDN_MAX_BYTES = 64 * 1024;

export const GOOGLE_PLAY_RTDN_GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"] as const;

export type GooglePlayRtdnEnvironment = "test" | "production";

export type GooglePlayRtdnConfig = {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  packageName: string;
  subscriptionProductId: string;
  monthlyBasePlanId: string;
  annualBasePlanId: string;
  serviceAccountJson: string;
  pushServiceAccountEmail: string;
  audience: string;
  topic: string;
  subscription: string;
  environment: GooglePlayRtdnEnvironment;
};

export type GoogleOidcClaims = {
  iss?: unknown;
  aud?: unknown;
  exp?: unknown;
  iat?: unknown;
  nbf?: unknown;
  email?: unknown;
  email_verified?: unknown;
};

export type PubSubEnvelope = {
  messageId: string;
  subscription: string;
  dataText: string;
};

export type ParsedDeveloperNotification =
  | {
      kind: "test_notification";
      eventType: "test_notification";
      eventSubtype: "test";
      eventTime: string;
    }
  | {
      kind: "subscription_notification";
      eventType: "subscription_notification";
      eventSubtype: string;
      notificationType: number;
      eventTime: string;
      purchaseToken: string;
    }
  | {
      kind: "unsupported_notification";
      eventType:
        | "one_time_product_notification"
        | "voided_purchase_notification"
        | "pending_refund_review_notification"
        | "unsupported_notification";
      eventSubtype: string;
      eventTime: string;
    };

export type GoogleSubscriptionPurchaseV2 = {
  startTime?: string;
  subscriptionState?: string;
  linkedPurchaseToken?: string;
  acknowledgementState?: string;
  externalAccountIdentifiers?: {
    obfuscatedExternalAccountId?: string;
    obfuscatedExternalProfileId?: string;
  };
  testPurchase?: Record<string, unknown>;
  lineItems?: Array<{
    productId?: string;
    expiryTime?: string;
    latestSuccessfulOrderId?: string;
    autoRenewingPlan?: {
      autoRenewEnabled?: boolean;
    };
    offerDetails?: {
      basePlanId?: string;
      offerId?: string;
    };
  }>;
};

export type NormalizedGoogleSubscription = {
  providerStatus: ProviderSubscriptionStatus;
  reconciliationStatus: "current" | "needs_verification" | "manual_review";
  providerProductRef: string;
  basePlanId: string;
  acknowledgementState: string | null;
  autoRenews: boolean | null;
  startTime: string | null;
  currentPeriodEnd: string | null;
  gracePeriodEndsAt: string | null;
  billingRetryStartedAt: string | null;
  expiresAt: string | null;
  pausedAt: string | null;
  testPurchase: boolean;
  latestOrderRefHash: string | null;
};

export type ProviderSubscriptionStatus =
  | "active"
  | "cancelled_active_until_period_end"
  | "grace_period"
  | "billing_retry"
  | "pending"
  | "expired"
  | "paused"
  | "unknown_needs_reconciliation";

export function readGooglePlayRtdnConfig(): { config: GooglePlayRtdnConfig | null; error: string | null; missing: string[] } {
  const configuredSubscription =
    Deno.env.get("GOOGLE_PLAY_RTDN_SUBSCRIPTION") ?? Deno.env.get("GOOGLE_PLAY_RTDN_STAGING_SUBSCRIPTION") ?? "";
  const config: GooglePlayRtdnConfig = {
    supabaseUrl: Deno.env.get("SUPABASE_URL") ?? "",
    supabaseServiceRoleKey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    packageName: Deno.env.get("GOOGLE_PLAY_PACKAGE_NAME") ?? "",
    subscriptionProductId: Deno.env.get("GOOGLE_PLAY_SUBSCRIPTION_PRODUCT_ID") ?? "",
    monthlyBasePlanId: Deno.env.get("GOOGLE_PLAY_MONTHLY_BASE_PLAN_ID") ?? "",
    annualBasePlanId: Deno.env.get("GOOGLE_PLAY_ANNUAL_BASE_PLAN_ID") ?? "",
    serviceAccountJson: Deno.env.get("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON") ?? "",
    pushServiceAccountEmail: Deno.env.get("GOOGLE_PLAY_RTDN_PUSH_SERVICE_ACCOUNT_EMAIL") ?? "",
    audience: Deno.env.get("GOOGLE_PLAY_RTDN_AUDIENCE") ?? "",
    topic: Deno.env.get("GOOGLE_PLAY_RTDN_TOPIC") ?? "",
    subscription: configuredSubscription,
    environment: (Deno.env.get("GOOGLE_PLAY_PROVIDER_ENVIRONMENT") ?? "test") as GooglePlayRtdnEnvironment
  };

  const missing = [
    ["SUPABASE_URL", config.supabaseUrl],
    ["SUPABASE_SERVICE_ROLE_KEY", config.supabaseServiceRoleKey],
    ["GOOGLE_PLAY_PACKAGE_NAME", config.packageName],
    ["GOOGLE_PLAY_SUBSCRIPTION_PRODUCT_ID", config.subscriptionProductId],
    ["GOOGLE_PLAY_MONTHLY_BASE_PLAN_ID", config.monthlyBasePlanId],
    ["GOOGLE_PLAY_ANNUAL_BASE_PLAN_ID", config.annualBasePlanId],
    ["GOOGLE_PLAY_SERVICE_ACCOUNT_JSON", config.serviceAccountJson],
    ["GOOGLE_PLAY_RTDN_PUSH_SERVICE_ACCOUNT_EMAIL", config.pushServiceAccountEmail],
    ["GOOGLE_PLAY_RTDN_AUDIENCE", config.audience],
    ["GOOGLE_PLAY_RTDN_TOPIC", config.topic],
    ["GOOGLE_PLAY_RTDN_SUBSCRIPTION", config.subscription]
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length) return { config: null, error: `Missing server env: ${missing.join(", ")}`, missing };
  if (config.environment !== "test" && config.environment !== "production") {
    return { config: null, error: "GOOGLE_PLAY_PROVIDER_ENVIRONMENT must be test or production.", missing: [] };
  }
  if (!config.audience.startsWith("https://")) return { config: null, error: "GOOGLE_PLAY_RTDN_AUDIENCE must be HTTPS.", missing: [] };
  return { config, error: null, missing: [] };
}

export function requestContentLengthTooLarge(contentLength: string | null, maxBytes = GOOGLE_PLAY_RTDN_MAX_BYTES): boolean {
  if (!contentLength) return false;
  const parsed = Number.parseInt(contentLength, 10);
  return Number.isFinite(parsed) && parsed > maxBytes;
}

export function bodyTextTooLarge(bodyText: string, maxBytes = GOOGLE_PLAY_RTDN_MAX_BYTES): boolean {
  return new TextEncoder().encode(bodyText).byteLength > maxBytes;
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store"
    }
  });
}

export function extractBearerToken(authorization: string | null): { token: string | null; error: string | null } {
  if (!authorization) return { token: null, error: "missing_bearer_token" };
  const match = authorization.match(/^Bearer\s+([A-Za-z0-9._~+/-]+=*)$/);
  if (!match?.[1]) return { token: null, error: "malformed_bearer_token" };
  return { token: match[1], error: null };
}

export function validateGoogleOidcClaims(input: {
  claims: GoogleOidcClaims;
  audience: string;
  serviceAccountEmail: string;
  nowSeconds?: number;
  maxFutureIatSeconds?: number;
}): { ok: true } | { ok: false; error: string } {
  const now = input.nowSeconds ?? Math.floor(Date.now() / 1000);
  const maxFutureIat = input.maxFutureIatSeconds ?? 300;
  const { claims } = input;

  if (!GOOGLE_PLAY_RTDN_GOOGLE_ISSUERS.includes(claims.iss as (typeof GOOGLE_PLAY_RTDN_GOOGLE_ISSUERS)[number])) {
    return { ok: false, error: "invalid_issuer" };
  }
  if (claims.aud !== input.audience) return { ok: false, error: "invalid_audience" };
  if (claims.email !== input.serviceAccountEmail) return { ok: false, error: "invalid_email" };
  if (claims.email_verified !== true) return { ok: false, error: "email_not_verified" };
  if (typeof claims.exp !== "number" || claims.exp <= now) return { ok: false, error: "token_expired" };
  if (typeof claims.iat !== "number" || claims.iat > now + maxFutureIat) return { ok: false, error: "invalid_iat" };
  if (typeof claims.nbf === "number" && claims.nbf > now + maxFutureIat) return { ok: false, error: "invalid_nbf" };
  return { ok: true };
}

export function expectedSubscriptionName(config: Pick<GooglePlayRtdnConfig, "topic" | "subscription">): string {
  if (config.subscription.startsWith("projects/")) return config.subscription;
  const match = config.topic.match(/^projects\/([^/]+)\/topics\/[^/]+$/);
  const project = match?.[1] ?? "";
  return `projects/${project}/subscriptions/${config.subscription}`;
}

export function parsePubSubEnvelope(
  bodyText: string,
  config: Pick<GooglePlayRtdnConfig, "topic" | "subscription">
): { envelope: PubSubEnvelope | null; error: string | null } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    return { envelope: null, error: "malformed_pubsub_json" };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { envelope: null, error: "invalid_pubsub_envelope" };
  const body = parsed as Record<string, unknown>;
  if (typeof body.subscription !== "string" || body.subscription !== expectedSubscriptionName(config)) {
    return { envelope: null, error: "wrong_subscription" };
  }
  const message = body.message;
  if (!message || typeof message !== "object" || Array.isArray(message)) return { envelope: null, error: "missing_message" };
  const messageRecord = message as Record<string, unknown>;
  const messageId = messageRecord.messageId ?? messageRecord.message_id;
  if (typeof messageId !== "string" || !messageId.trim()) return { envelope: null, error: "missing_message_id" };
  if (typeof messageRecord.data !== "string" || !messageRecord.data.trim()) return { envelope: null, error: "missing_message_data" };
  const dataText = decodeBase64Utf8(messageRecord.data);
  if (dataText === null) return { envelope: null, error: "invalid_message_data_base64" };
  return { envelope: { messageId: messageId.trim(), subscription: body.subscription, dataText }, error: null };
}

export function parseDeveloperNotification(
  dataText: string,
  config: Pick<GooglePlayRtdnConfig, "packageName">
): { notification: ParsedDeveloperNotification | null; error: string | null } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(dataText);
  } catch {
    return { notification: null, error: "malformed_developer_notification" };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { notification: null, error: "invalid_developer_notification" };
  const notification = parsed as Record<string, unknown>;
  if (notification.packageName !== config.packageName) return { notification: null, error: "wrong_package" };
  if (typeof notification.version !== "string" || !notification.version.trim()) return { notification: null, error: "missing_notification_version" };
  const eventTime = eventTimeMillisToIso(notification.eventTimeMillis);
  if (!eventTime) return { notification: null, error: "invalid_event_time" };

  const notificationFields = [
    "subscriptionNotification",
    "testNotification",
    "oneTimeProductNotification",
    "voidedPurchaseNotification",
    "pendingRefundReviewNotification"
  ].filter((field) => Object.prototype.hasOwnProperty.call(notification, field));
  if (notificationFields.length !== 1) return { notification: null, error: "invalid_notification_union" };

  if (notificationFields[0] === "testNotification") {
    return { notification: { kind: "test_notification", eventType: "test_notification", eventSubtype: "test", eventTime }, error: null };
  }

  if (notificationFields[0] === "subscriptionNotification") {
    const subscription = notification.subscriptionNotification;
    if (!subscription || typeof subscription !== "object" || Array.isArray(subscription)) {
      return { notification: null, error: "invalid_subscription_notification" };
    }
    const record = subscription as Record<string, unknown>;
    if (typeof record.version !== "string" || !record.version.trim()) return { notification: null, error: "invalid_subscription_version" };
    const notificationType = record.notificationType;
    if (!Number.isInteger(notificationType)) return { notification: null, error: "invalid_subscription_notification_type" };
    if (typeof record.purchaseToken !== "string" || !record.purchaseToken.trim()) return { notification: null, error: "missing_purchase_token" };
    return {
      notification: {
        kind: "subscription_notification",
        eventType: "subscription_notification",
        eventSubtype: `subscription_notification_${notificationType}`,
        notificationType,
        eventTime,
        purchaseToken: record.purchaseToken
      },
      error: null
    };
  }

  const unsupportedType =
    notificationFields[0] === "oneTimeProductNotification"
      ? "one_time_product_notification"
      : notificationFields[0] === "voidedPurchaseNotification"
        ? "voided_purchase_notification"
        : notificationFields[0] === "pendingRefundReviewNotification"
          ? "pending_refund_review_notification"
          : "unsupported_notification";
  return {
    notification: {
      kind: "unsupported_notification",
      eventType: unsupportedType,
      eventSubtype: "unsupported",
      eventTime
    },
    error: null
  };
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function purchaseTokenFingerprint(purchaseToken: string): Promise<string> {
  return `sha256_${await sha256Hex(purchaseToken)}`;
}

export async function optionalHashRef(value: string | null | undefined, prefix: string): Promise<string | null> {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed) return null;
  return `${prefix}_${await sha256Hex(trimmed)}`;
}

export function googleProviderProductRef(input: { packageName: string; productId: string; basePlanId: string }): string {
  return `${input.packageName}:${input.productId}:${input.basePlanId}`;
}

export async function normalizeGoogleSubscriptionPurchase(input: {
  purchase: GoogleSubscriptionPurchaseV2;
  config: Pick<GooglePlayRtdnConfig, "packageName" | "subscriptionProductId" | "monthlyBasePlanId" | "annualBasePlanId">;
  asOfIso: string;
}): Promise<{ normalized: NormalizedGoogleSubscription | null; error: string | null }> {
  const lineItems = Array.isArray(input.purchase.lineItems) ? input.purchase.lineItems : [];
  const allowedBasePlans = new Set([input.config.monthlyBasePlanId, input.config.annualBasePlanId]);
  const matching = lineItems.filter((item) => item?.productId === input.config.subscriptionProductId && allowedBasePlans.has(item.offerDetails?.basePlanId ?? ""));
  if (matching.length !== 1) return { normalized: null, error: "unexpected_product_or_base_plan" };

  const lineItem = matching[0];
  const basePlanId = lineItem.offerDetails?.basePlanId ?? "";
  const expiryTime = validIsoOrNull(lineItem.expiryTime);
  const startTime = validIsoOrNull(input.purchase.startTime);
  const state = input.purchase.subscriptionState ?? "SUBSCRIPTION_STATE_UNSPECIFIED";
  const stateMap = providerStatusForGoogleState(state, expiryTime, input.asOfIso);
  if (!stateMap) return { normalized: null, error: "unknown_subscription_state" };
  if (requiresPeriodEnd(stateMap.status) && !stateMap.currentPeriodEnd) {
    return { normalized: null, error: "missing_period_end" };
  }

  const providerProductRef = googleProviderProductRef({
    packageName: input.config.packageName,
    productId: input.config.subscriptionProductId,
    basePlanId
  });

  return {
    normalized: {
      providerStatus: stateMap.status,
      reconciliationStatus: stateMap.reconciliationStatus,
      providerProductRef,
      basePlanId,
      acknowledgementState: typeof input.purchase.acknowledgementState === "string" ? input.purchase.acknowledgementState : null,
      autoRenews: typeof lineItem.autoRenewingPlan?.autoRenewEnabled === "boolean" ? lineItem.autoRenewingPlan.autoRenewEnabled : null,
      startTime,
      currentPeriodEnd: stateMap.currentPeriodEnd,
      gracePeriodEndsAt: stateMap.gracePeriodEndsAt,
      billingRetryStartedAt: stateMap.billingRetryStartedAt,
      expiresAt: stateMap.expiresAt,
      pausedAt: stateMap.pausedAt,
      testPurchase: Boolean(input.purchase.testPurchase),
      latestOrderRefHash: await optionalHashRef(lineItem.latestSuccessfulOrderId, "gpa_order_sha256")
    },
    error: null
  };
}

export function providerStatusForGoogleState(
  state: string,
  expiryTime: string | null,
  asOfIso: string
):
  | {
      status: ProviderSubscriptionStatus;
      reconciliationStatus: "current" | "needs_verification" | "manual_review";
      currentPeriodEnd: string | null;
      gracePeriodEndsAt: string | null;
      billingRetryStartedAt: string | null;
      expiresAt: string | null;
      pausedAt: string | null;
    }
  | null {
  if (state === "SUBSCRIPTION_STATE_ACTIVE") {
    return {
      status: "active",
      reconciliationStatus: "current",
      currentPeriodEnd: expiryTime,
      gracePeriodEndsAt: null,
      billingRetryStartedAt: null,
      expiresAt: null,
      pausedAt: null
    };
  }
  if (state === "SUBSCRIPTION_STATE_IN_GRACE_PERIOD") {
    return {
      status: "grace_period",
      reconciliationStatus: "current",
      currentPeriodEnd: expiryTime,
      gracePeriodEndsAt: expiryTime,
      billingRetryStartedAt: null,
      expiresAt: null,
      pausedAt: null
    };
  }
  if (state === "SUBSCRIPTION_STATE_ON_HOLD") {
    return {
      status: "billing_retry",
      reconciliationStatus: "current",
      currentPeriodEnd: expiryTime,
      gracePeriodEndsAt: null,
      billingRetryStartedAt: asOfIso,
      expiresAt: null,
      pausedAt: null
    };
  }
  if (state === "SUBSCRIPTION_STATE_CANCELED") {
    return {
      status: expiryTime && Date.parse(expiryTime) > Date.parse(asOfIso) ? "cancelled_active_until_period_end" : "expired",
      reconciliationStatus: "current",
      currentPeriodEnd: expiryTime,
      gracePeriodEndsAt: null,
      billingRetryStartedAt: null,
      expiresAt: expiryTime ?? asOfIso,
      pausedAt: null
    };
  }
  if (state === "SUBSCRIPTION_STATE_EXPIRED" || state === "SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED") {
    return {
      status: "expired",
      reconciliationStatus: "current",
      currentPeriodEnd: null,
      gracePeriodEndsAt: null,
      billingRetryStartedAt: null,
      expiresAt: expiryTime ?? asOfIso,
      pausedAt: null
    };
  }
  if (state === "SUBSCRIPTION_STATE_PAUSED") {
    return {
      status: "paused",
      reconciliationStatus: "current",
      currentPeriodEnd: expiryTime,
      gracePeriodEndsAt: null,
      billingRetryStartedAt: null,
      expiresAt: null,
      pausedAt: asOfIso
    };
  }
  if (state === "SUBSCRIPTION_STATE_PENDING") {
    return {
      status: "pending",
      reconciliationStatus: "needs_verification",
      currentPeriodEnd: null,
      gracePeriodEndsAt: null,
      billingRetryStartedAt: null,
      expiresAt: null,
      pausedAt: null
    };
  }
  if (state === "SUBSCRIPTION_STATE_UNSPECIFIED") {
    return {
      status: "unknown_needs_reconciliation",
      reconciliationStatus: "manual_review",
      currentPeriodEnd: null,
      gracePeriodEndsAt: null,
      billingRetryStartedAt: null,
      expiresAt: null,
      pausedAt: null
    };
  }
  return null;
}

function requiresPeriodEnd(status: ProviderSubscriptionStatus): boolean {
  return (
    status === "active" ||
    status === "cancelled_active_until_period_end" ||
    status === "grace_period" ||
    status === "billing_retry" ||
    status === "paused"
  );
}

function eventTimeMillisToIso(value: unknown): string | null {
  const text = typeof value === "number" ? String(value) : typeof value === "string" ? value : "";
  if (!/^\d{10,17}$/.test(text)) return null;
  const millis = Number(text);
  if (!Number.isFinite(millis)) return null;
  const date = new Date(millis);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function validIsoOrNull(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return null;
  return new Date(time).toISOString();
}

function decodeBase64Utf8(value: string): string | null {
  try {
    if (typeof atob === "function") {
      const binary = atob(value);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
      return new TextDecoder().decode(bytes);
    }
    const maybeBuffer = (globalThis as unknown as { Buffer?: { from: (input: string, encoding: "base64") => { toString: (encoding: "utf8") => string } } })
      .Buffer;
    return maybeBuffer?.from(value, "base64").toString("utf8") ?? null;
  } catch {
    return null;
  }
}
