/* eslint-disable */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.108.2";
import { billingCorsHeaders } from "../_shared/security.ts";
import { acknowledgeSubscriptionPurchase, fetchSubscriptionPurchaseV2, GooglePlayPublisherError } from "../_shared/googlePlayPublisher.ts";
import {
  GooglePlayPurchaseError,
  googlePlayObfuscatedAccountId,
  parseGooglePlayVerifyBody,
  processGooglePlayPurchaseVerification,
  readGooglePlayPurchaseConfig,
  recordGooglePlayPurchaseAcknowledgement,
  verifiedPurchaseTransitionInput,
  type GooglePlayPurchaseConfig
} from "../_shared/googlePlayPurchase.ts";

Deno.serve(async (request) => {
  try {
    return await handleVerifyRequest(request);
  } catch (error) {
    const status = error instanceof GooglePlayPurchaseError ? error.status : error instanceof GooglePlayPublisherError && !error.retryable ? 400 : 500;
    const safeResult = error instanceof GooglePlayPurchaseError || error instanceof GooglePlayPublisherError ? error.result : "unexpected_error";
    console.error(`[google-play-purchase] verification failed: ${safeResult}`);
    return json({ error: status >= 500 ? "Google Play purchase verification is unavailable." : "Google Play purchase could not be verified." }, status, request);
  }
});

async function handleVerifyRequest(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") return optionsResponse(request);
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405, request);

  const { config, error } = readGooglePlayPurchaseConfig();
  if (!config) return json({ error: error ?? "Google Play purchases are not configured." }, 503, request);

  const { user, error: userError } = await getSignedInUser(request, config);
  if (!user) return json({ error: userError ?? "Sign in before upgrading." }, 401, request, config);

  const bodyText = await request.text();
  if (new TextEncoder().encode(bodyText).byteLength > 8192) {
    return json({ error: "Google Play purchase request is too large." }, 413, request, config);
  }
  const parsed = await parseGooglePlayVerifyBody({
    contentType: request.headers.get("content-type"),
    bodyText,
    config
  });
  if (!parsed.body) return json({ error: "Google Play purchase request is invalid." }, 400, request, config);

  const obfuscatedAccountId = await googlePlayObfuscatedAccountId({
    userId: user.id,
    accountBindingSecret: config.accountBindingSecret
  });
  const purchase = await fetchSubscriptionPurchaseV2({
    serviceAccountJson: config.serviceAccountJson,
    packageName: config.packageName,
    purchaseToken: parsed.body.purchaseToken
  });
  const transition = await verifiedPurchaseTransitionInput({
    purchaseToken: parsed.body.purchaseToken,
    purchase,
    userId: user.id,
    config,
    expectedBasePlanId: parsed.body.basePlanId,
    expectedObfuscatedAccountId: obfuscatedAccountId,
    asOfIso: new Date().toISOString()
  });
  if (!transition) throw new GooglePlayPurchaseError("invalid_transition", true, 500);

  const supabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { persistSession: false }
  });
  const row = await processGooglePlayPurchaseVerification(supabase, transition.transitionArgs);
  if (!row.processed && !row.already_processed) {
    return json({ error: "Google Play purchase could not be verified." }, row.retryable ? 503 : 409, request, config);
  }

  if (row.acknowledgement_required) {
    await acknowledgeSubscriptionPurchase({
      serviceAccountJson: config.serviceAccountJson,
      packageName: config.packageName,
      subscriptionId: config.subscriptionProductId,
      purchaseToken: parsed.body.purchaseToken,
      obfuscatedAccountId
    });
    await recordGooglePlayPurchaseAcknowledgement(supabase, {
      providerEnvironment: config.environment,
      purchaseTokenFingerprint: transition.tokenFingerprint,
      acknowledgedAt: new Date().toISOString()
    });
  }

  return json({ ok: true, status: row.already_processed ? "already_verified" : "verified" }, 200, request, config);
}

async function getSignedInUser(request: Request, config: GooglePlayPurchaseConfig) {
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

function json(body: unknown, status = 200, request: Request, config?: Pick<GooglePlayPurchaseConfig, "supabaseUrl">): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeadersFor(request, config),
      "content-type": "application/json",
      "cache-control": "no-store"
    }
  });
}

function corsHeadersFor(request: Request, _config?: Pick<GooglePlayPurchaseConfig, "supabaseUrl">): Record<string, string> {
  return billingCorsHeaders(request.headers.get("origin"), {
    siteOrigin: Deno.env.get("NEXT_PUBLIC_SITE_URL") ?? Deno.env.get("SITE_URL") ?? null,
    allowPreviewUrls: true,
    allowLocalOrigins: true
  });
}
