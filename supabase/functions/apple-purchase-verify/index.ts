/* eslint-disable */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.108.2";
import { billingCorsHeaders } from "../_shared/security.ts";
import {
  AppleAppStoreError,
  appleEnvironmentFromPayload,
  applePurchaseVerificationTransitionInput,
  fetchAppleSubscriptionStatuses,
  normalizeVerifiedAppleStatusResponse,
  parseApplePurchaseVerifyBody,
  processApplePurchaseVerification,
  readAppleServerConfig,
  requestBodyTooLarge,
  sha256Hex,
  verifyAppleSignedTransactionSet,
  type AppleServerConfig
} from "../_shared/appleAppStore.ts";

Deno.serve(async (request) => {
  try {
    return await handleVerifyRequest(request);
  } catch (error) {
    const status = error instanceof AppleAppStoreError ? error.status : 500;
    const safeResult = error instanceof AppleAppStoreError ? error.result : "unexpected_error";
    console.error(`[apple-purchase] verification failed: ${safeResult}`);
    return json({ error: status >= 500 ? "Apple purchase verification is unavailable." : "Apple purchase could not be verified." }, status, request);
  }
});

async function handleVerifyRequest(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") return optionsResponse(request);
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405, request);

  const { config, error } = readAppleServerConfig();
  if (!config) return json({ error: error ?? "Apple purchases are not configured." }, 503, request);

  const { user, error: userError } = await getSignedInUser(request, config);
  if (!user) return json({ error: userError ?? "Sign in before upgrading." }, 401, request, config);

  const bodyText = await request.text();
  if (requestBodyTooLarge(bodyText)) return json({ error: "Apple purchase request is too large." }, 413, request, config);
  const parsed = parseApplePurchaseVerifyBody({ contentType: request.headers.get("content-type"), bodyText });
  if (!parsed.body) return json({ error: "Apple purchase request is invalid." }, 400, request, config);

  const clientVerified = await verifyAppleSignedTransactionSet({
    signedTransactionInfo: parsed.body.signedTransactionInfo,
    signedRenewalInfo: parsed.body.signedRenewalInfo,
    config
  });
  const transactionEnvironment = appleEnvironmentFromPayload(clientVerified.transaction.environment);
  if (!transactionEnvironment) throw new AppleAppStoreError("environment_mismatch", false);
  const originalTransactionId = String(clientVerified.transaction.originalTransactionId ?? "");
  if (!originalTransactionId) throw new AppleAppStoreError("missing_original_transaction_id", false);

  const statusResponse = await fetchAppleSubscriptionStatuses({
    config,
    environment: transactionEnvironment,
    originalTransactionId
  });
  const normalized = await normalizeVerifiedAppleStatusResponse({
    response: statusResponse,
    originalTransactionId,
    expectedEnvironment: transactionEnvironment,
    config,
    asOfIso: new Date().toISOString()
  });
  if (!normalized.normalized) throw new AppleAppStoreError(normalized.error ?? "invalid_apple_subscription_state", false, 409);

  const payloadHash = await sha256Hex(`${parsed.body.signedTransactionInfo}.${parsed.body.signedRenewalInfo ?? ""}`);
  const transitionArgs = await applePurchaseVerificationTransitionInput({
    normalized: normalized.normalized,
    deploymentMode: config.deploymentMode,
    userId: user.id,
    sourceEventRef: `verify:${normalized.normalized.originalTransactionIdFingerprint}:${normalized.normalized.transactionIdFingerprint.slice(-16)}:${payloadHash.slice(0, 16)}`,
    payloadHash,
    asOfIso: new Date().toISOString()
  });

  const supabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { persistSession: false }
  });
  const row = await processApplePurchaseVerification(supabase, transitionArgs);
  if (!row.processed && !row.already_processed) {
    return json({ error: "Apple purchase could not be verified." }, row.retryable ? 503 : 409, request, config);
  }

  return json(
    {
      ok: true,
      status: row.already_processed ? "already_verified" : "verified",
      entitlementRefreshRecommended: row.compatibility_refreshed,
      entitlementScope: row.entitlement_scope,
      nativeReviewEntitlement:
        row.entitlement_scope === "native_review" && appleNativeReviewEntitlementGrantsPro(normalized.normalized)
          ? {
              providerEnvironment: "sandbox",
              plan: "pro",
              status: "active",
              currentPeriodEnd: normalized.normalized.currentPeriodEnd,
              cancelAtPeriodEnd: normalized.normalized.providerStatus === "cancelled_active_until_period_end",
              verifiedAt: new Date().toISOString()
            }
          : null,
      clientMayFinishTransaction: row.processed || row.already_processed
    },
    200,
    request,
    config
  );
}

function appleNativeReviewEntitlementGrantsPro(normalized: { providerStatus: string; currentPeriodEnd: string | null; gracePeriodEndsAt: string | null }): boolean {
  return (
    normalized.providerStatus === "active" ||
    normalized.providerStatus === "cancelled_active_until_period_end" ||
    normalized.providerStatus === "grace_period"
  );
}

async function getSignedInUser(request: Request, config: AppleServerConfig) {
  const authHeader = request.headers.get("authorization");
  const accessToken = authHeader?.replace(/^Bearer\s+/i, "").trim() ?? "";
  if (!accessToken) return { user: null, error: "Sign in before upgrading." };
  const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: { persistSession: false }
  });
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) return { user: null, error: "Sign in before upgrading." };
  return { user: data.user, error: null };
}

function optionsResponse(request: Request): Response {
  return new Response("ok", { headers: corsHeadersFor(request) });
}

function json(body: unknown, status = 200, request: Request, config?: Pick<AppleServerConfig, "supabaseUrl">): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeadersFor(request, config),
      "content-type": "application/json",
      "cache-control": "no-store"
    }
  });
}

function corsHeadersFor(request: Request, _config?: Pick<AppleServerConfig, "supabaseUrl">): Record<string, string> {
  return billingCorsHeaders(request.headers.get("origin"), {
    siteOrigin: Deno.env.get("NEXT_PUBLIC_SITE_URL") ?? Deno.env.get("SITE_URL") ?? null,
    allowPreviewUrls: true,
    allowLocalOrigins: true
  });
}
