/* eslint-disable */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.108.2";
import {
  AppleAppStoreError,
  appleEnvironmentFromPayload,
  appleNotificationTransitionInput,
  fetchAppleSubscriptionStatuses,
  normalizeVerifiedAppleStatusResponse,
  processAppleServerNotification,
  readAppleServerConfig,
  requestBodyTooLarge,
  sha256Hex,
  verifyAppleNotificationPayload
} from "../_shared/appleAppStore.ts";

Deno.serve(async (request) => {
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);

  const { config, error: configError } = readAppleServerConfig();
  if (!config) return jsonResponse({ error: configError ?? "Apple server notifications are not configured." }, 503);

  try {
    const bodyText = await request.text();
    if (requestBodyTooLarge(bodyText)) return jsonResponse({ error: "Apple notification request is too large." }, 413);

    const signedPayload = parseSignedPayload(bodyText);
    const payloadHash = await sha256Hex(signedPayload);
    const verified = await verifyAppleNotificationPayload({ signedPayload, config });

    let normalized = null;
    let notificationEnvironment = null;
    if (verified.notification.notificationType !== "TEST") {
      notificationEnvironment = appleEnvironmentFromPayload(verified.transaction?.environment);
      if (!notificationEnvironment) throw new AppleAppStoreError("environment_mismatch", false);
      const originalTransactionId = String(verified.transaction?.originalTransactionId ?? "");
      if (!originalTransactionId) throw new AppleAppStoreError("missing_original_transaction_id", false);
      const statusResponse = await fetchAppleSubscriptionStatuses({
        config,
        environment: notificationEnvironment,
        originalTransactionId
      });
      const status = await normalizeVerifiedAppleStatusResponse({
        response: statusResponse,
        originalTransactionId,
        expectedEnvironment: notificationEnvironment,
        config,
        asOfIso: new Date().toISOString()
      });
      if (!status.normalized) throw new AppleAppStoreError(status.error ?? "invalid_apple_subscription_state", true, 500);
      normalized = status.normalized;
    }

    const supabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
      auth: { persistSession: false }
    });
    const row = await processAppleServerNotification(
      supabase,
      await appleNotificationTransitionInput({
      normalized,
      notification: verified.notification,
      deploymentMode: config.deploymentMode,
      payloadHash,
        asOfIso: new Date().toISOString()
      })
    );
    return jsonResponse({ received: true, disposition: row.result });
  } catch (error) {
    const status = error instanceof AppleAppStoreError ? error.status : 500;
    const retryable = error instanceof AppleAppStoreError ? error.retryable : true;
    const safeResult = error instanceof AppleAppStoreError ? error.result : "unexpected_error";
    console.error(`[apple-notification] processing failed: ${safeResult}`);
    return jsonResponse({ error: retryable ? "Apple notification processing failed." : "Apple notification could not be verified." }, retryable ? 500 : status);
  }
});

function parseSignedPayload(bodyText: string): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    throw new AppleAppStoreError("invalid_json", false);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new AppleAppStoreError("invalid_request", false);
  const signedPayload = (parsed as Record<string, unknown>).signedPayload;
  if (typeof signedPayload !== "string" || !signedPayload.trim()) throw new AppleAppStoreError("missing_signed_payload", false);
  return signedPayload.trim();
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store"
    }
  });
}
