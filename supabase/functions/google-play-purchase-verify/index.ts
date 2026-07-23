/* eslint-disable */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.108.2";
import { billingCorsHeaders } from "../_shared/security.ts";
import { acknowledgeSubscriptionPurchase, fetchSubscriptionPurchaseV2 } from "../_shared/googlePlayPublisher.ts";
import {
  GooglePlayPurchaseError,
  googlePlayPurchaseStageForVerificationRow,
  googlePlayObfuscatedAccountId,
  parseGooglePlayVerifyBody,
  processGooglePlayPurchaseVerification,
  readGooglePlayPurchaseConfig,
  recordGooglePlayPurchaseAcknowledgement,
  verifiedPurchaseTransitionInput,
  type GooglePlayPurchaseConfig
} from "../_shared/googlePlayPurchase.ts";
import {
  buildGooglePlayVerifyDiagnostic,
  googlePlayVerifyClientError,
  withGooglePlayVerifyStage,
  type GooglePlayVerifyDiagnostic,
  type GooglePlayVerifyDiagnosticContext
} from "../_shared/googlePlayVerifyDiagnostics.ts";

Deno.serve(async (request) => {
  const diagnosticContext: GooglePlayVerifyDiagnosticContext = {};
  try {
    return await handleVerifyRequest(request, diagnosticContext);
  } catch (error) {
    const diagnostic = buildGooglePlayVerifyDiagnostic(error, diagnosticContext);
    logVerificationFailure(diagnostic);
    return json(googlePlayVerifyClientError(diagnostic), diagnostic.status, request);
  }
});

async function handleVerifyRequest(request: Request, diagnosticContext: GooglePlayVerifyDiagnosticContext): Promise<Response> {
  if (request.method === "OPTIONS") return optionsResponse(request);
  if (request.method !== "POST") return json({ error: "Method not allowed.", code: "method_not_allowed", retryable: false }, 405, request);

  const { config, error } = readGooglePlayPurchaseConfig();
  if (!config) {
    return json(
      {
        error: error ?? "Google Play purchases are not configured.",
        code: "google_play_configuration_error",
        retryable: true
      },
      503,
      request
    );
  }
  diagnosticContext.providerEnvironment = config.environment;

  const { user, error: userError } = await withGooglePlayVerifyStage("supabase_user_authentication", () => getSignedInUser(request, config));
  if (!user) return json({ error: userError ?? "Sign in before upgrading.", code: "authentication_required", retryable: false }, 401, request, config);

  const bodyText = await withGooglePlayVerifyStage("request_parsing", () => request.text());
  if (new TextEncoder().encode(bodyText).byteLength > 8192) {
    return json({ error: "Google Play purchase request is too large.", code: "invalid_request", retryable: false }, 413, request, config);
  }
  const parsed = await withGooglePlayVerifyStage("request_parsing", () =>
    parseGooglePlayVerifyBody({
      contentType: request.headers.get("content-type"),
      bodyText,
      config
    })
  );
  if (!parsed.body) {
    return json({ error: "Google Play purchase request is invalid.", code: parsed.error ?? "invalid_request", retryable: false }, 400, request, config);
  }
  diagnosticContext.productId = parsed.body.productId;
  diagnosticContext.basePlanId = parsed.body.basePlanId;

  const obfuscatedAccountId = await withGooglePlayVerifyStage("ownership_binding", () =>
    googlePlayObfuscatedAccountId({
      userId: user.id,
      accountBindingSecret: config.accountBindingSecret
    })
  );
  const purchase = await withGooglePlayVerifyStage("subscriptionsv2_get", () =>
    fetchSubscriptionPurchaseV2({
      serviceAccountJson: config.serviceAccountJson,
      packageName: config.packageName,
      purchaseToken: parsed.body.purchaseToken
    })
  );
  diagnosticContext.purchaseStatePresent = typeof purchase.subscriptionState === "string";
  diagnosticContext.acknowledgementStatePresent = typeof purchase.acknowledgementState === "string";
  const transition = await withGooglePlayVerifyStage("google_response_parsing_state_validation", () =>
    verifiedPurchaseTransitionInput({
      purchaseToken: parsed.body.purchaseToken,
      purchase,
      userId: user.id,
      config,
      expectedBasePlanId: parsed.body.basePlanId,
      expectedObfuscatedAccountId: obfuscatedAccountId,
      asOfIso: new Date().toISOString()
    })
  );
  if (!transition) throw new GooglePlayPurchaseError("invalid_transition", true, 500, { stage: "google_response_parsing_state_validation" });

  const supabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { persistSession: false }
  });
  const row = await withGooglePlayVerifyStage("provider_subscription_persistence", () =>
    processGooglePlayPurchaseVerification(supabase, transition.transitionArgs)
  );
  if (!row.processed && !row.already_processed) {
    const diagnostic = buildGooglePlayVerifyDiagnostic(
      new GooglePlayPurchaseError(row.result, row.retryable, row.retryable ? 503 : 409, {
        stage: googlePlayPurchaseStageForVerificationRow(row),
        rpcRow: row
      }),
      diagnosticContext
    );
    logVerificationFailure(diagnostic);
    return json(googlePlayVerifyClientError(diagnostic), diagnostic.status, request, config);
  }

  if (row.acknowledgement_required) {
    await withGooglePlayVerifyStage("purchase_acknowledgement", () =>
      acknowledgeSubscriptionPurchase({
        serviceAccountJson: config.serviceAccountJson,
        packageName: config.packageName,
        subscriptionId: config.subscriptionProductId,
        purchaseToken: parsed.body.purchaseToken,
        obfuscatedAccountId
      })
    );
    await withGooglePlayVerifyStage("purchase_acknowledgement", () =>
      recordGooglePlayPurchaseAcknowledgement(supabase, {
        providerEnvironment: config.environment,
        purchaseTokenFingerprint: transition.tokenFingerprint,
        acknowledgedAt: new Date().toISOString()
      })
    );
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

function logVerificationFailure(diagnostic: GooglePlayVerifyDiagnostic) {
  console.error(`[google-play-purchase] verification failed ${JSON.stringify(diagnostic)}`);
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
