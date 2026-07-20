/* eslint-disable */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.108.2";
import { verifyGooglePubSubOidc } from "../_shared/googlePlayOidc.ts";
import { fetchSubscriptionPurchaseV2, GooglePlayPublisherError } from "../_shared/googlePlayPublisher.ts";
import {
  bodyTextTooLarge,
  extractBearerToken,
  jsonResponse,
  normalizeGoogleSubscriptionPurchase,
  parseDeveloperNotification,
  parsePubSubEnvelope,
  purchaseTokenFingerprint,
  readGooglePlayRtdnConfig,
  requestContentLengthTooLarge,
  sha256Hex
} from "../_shared/googlePlayRtdn.ts";
import {
  GooglePlayRtdnTransitionError,
  processGooglePlayRtdnTransition,
  type GooglePlayRtdnTransitionInput
} from "../_shared/googlePlayRtdnProcessor.ts";

Deno.serve(async (request) => {
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);

  const { config, error: configError } = readGooglePlayRtdnConfig();
  if (!config) return jsonResponse({ error: configError ?? "Google Play RTDN is not configured." }, 503);

  if (requestContentLengthTooLarge(request.headers.get("content-length"))) {
    return jsonResponse({ error: "RTDN request is too large." }, 413);
  }

  const bearer = extractBearerToken(request.headers.get("authorization"));
  if (!bearer.token) return jsonResponse({ error: "Invalid Google Pub/Sub identity." }, 401);

  const oidc = await verifyGooglePubSubOidc({
    token: bearer.token,
    audience: config.audience,
    serviceAccountEmail: config.pushServiceAccountEmail
  });
  if (!oidc.ok) return jsonResponse({ error: "Invalid Google Pub/Sub identity." }, 401);

  const bodyText = await request.text();
  if (bodyTextTooLarge(bodyText)) return jsonResponse({ error: "RTDN request is too large." }, 413);

  const envelopeResult = parsePubSubEnvelope(bodyText, config);
  if (!envelopeResult.envelope) return jsonResponse({ error: "Invalid Pub/Sub envelope." }, 400);

  const notificationResult = parseDeveloperNotification(envelopeResult.envelope.dataText, config);
  if (!notificationResult.notification) return jsonResponse({ error: "Invalid Google Play notification." }, 400);

  const payloadHash = await sha256Hex(envelopeResult.envelope.dataText);
  const supabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { persistSession: false }
  });

  try {
    const notification = notificationResult.notification;
    if (notification.kind === "test_notification") {
      const row = await processGooglePlayRtdnTransition(supabase, {
        providerEnvironment: config.environment,
        pubsubMessageId: envelopeResult.envelope.messageId,
        eventType: notification.eventType,
        eventSubtype: notification.eventSubtype,
        eventTime: notification.eventTime,
        payloadHash,
        packageName: config.packageName,
        providerProductRef: null,
        purchaseTokenFingerprint: null,
        linkedPurchaseTokenFingerprint: null,
        providerTransactionRef: null,
        providerStatus: null,
        acknowledgementState: null,
        autoRenews: null,
        startTime: null,
        currentPeriodEnd: null,
        gracePeriodEndsAt: null,
        billingRetryStartedAt: null,
        expiresAt: null,
        pausedAt: null,
        testPurchase: false
      });
      return jsonResponse({ received: true, disposition: row.result });
    }

    if (notification.kind === "unsupported_notification") {
      const row = await processGooglePlayRtdnTransition(supabase, {
        providerEnvironment: config.environment,
        pubsubMessageId: envelopeResult.envelope.messageId,
        eventType: notification.eventType,
        eventSubtype: notification.eventSubtype,
        eventTime: notification.eventTime,
        payloadHash,
        packageName: config.packageName,
        providerProductRef: null,
        purchaseTokenFingerprint: null,
        linkedPurchaseTokenFingerprint: null,
        providerTransactionRef: null,
        providerStatus: null,
        acknowledgementState: null,
        autoRenews: null,
        startTime: null,
        currentPeriodEnd: null,
        gracePeriodEndsAt: null,
        billingRetryStartedAt: null,
        expiresAt: null,
        pausedAt: null,
        testPurchase: false
      });
      return jsonResponse({ received: true, disposition: row.result });
    }

    const tokenFingerprint = await purchaseTokenFingerprint(notification.purchaseToken);
    let purchase;
    try {
      purchase = await fetchSubscriptionPurchaseV2({
        serviceAccountJson: config.serviceAccountJson,
        packageName: config.packageName,
        purchaseToken: notification.purchaseToken
      });
    } catch (error) {
      if (error instanceof GooglePlayPublisherError && !error.retryable) {
        const row = await processGooglePlayRtdnTransition(supabase, {
          providerEnvironment: config.environment,
          pubsubMessageId: envelopeResult.envelope.messageId,
          eventType: "subscription_notification_api_error",
          eventSubtype: error.result,
          eventTime: notification.eventTime,
          payloadHash,
          packageName: config.packageName,
          providerProductRef: null,
          purchaseTokenFingerprint: tokenFingerprint,
          linkedPurchaseTokenFingerprint: null,
          providerTransactionRef: null,
          providerStatus: null,
          acknowledgementState: null,
          autoRenews: null,
          startTime: null,
          currentPeriodEnd: null,
          gracePeriodEndsAt: null,
          billingRetryStartedAt: null,
          expiresAt: null,
          pausedAt: null,
          testPurchase: false
        });
        return jsonResponse({ received: true, disposition: row.result });
      }
      throw error;
    }

    const linkedFingerprint = purchase.linkedPurchaseToken ? await purchaseTokenFingerprint(purchase.linkedPurchaseToken) : null;
    const normalized = await normalizeGoogleSubscriptionPurchase({
      purchase,
      config,
      asOfIso: new Date().toISOString()
    });
    if (!normalized.normalized) {
      const row = await processGooglePlayRtdnTransition(supabase, {
        providerEnvironment: config.environment,
        pubsubMessageId: envelopeResult.envelope.messageId,
        eventType: "subscription_notification_reconciliation_required",
        eventSubtype: normalized.error ?? "invalid_subscription_state",
        eventTime: notification.eventTime,
        payloadHash,
        packageName: config.packageName,
        providerProductRef: null,
        purchaseTokenFingerprint: tokenFingerprint,
        linkedPurchaseTokenFingerprint: linkedFingerprint,
        providerTransactionRef: null,
        providerStatus: "unknown_needs_reconciliation",
        acknowledgementState: null,
        autoRenews: null,
        startTime: null,
        currentPeriodEnd: null,
        gracePeriodEndsAt: null,
        billingRetryStartedAt: null,
        expiresAt: null,
        pausedAt: null,
        testPurchase: false
      });
      return jsonResponse({ received: true, disposition: row.result });
    }

    const transitionInput: GooglePlayRtdnTransitionInput = {
      providerEnvironment: config.environment,
      pubsubMessageId: envelopeResult.envelope.messageId,
      eventType: notification.eventType,
      eventSubtype: notification.eventSubtype,
      eventTime: notification.eventTime,
      payloadHash,
      packageName: config.packageName,
      providerProductRef: normalized.normalized.providerProductRef,
      purchaseTokenFingerprint: tokenFingerprint,
      linkedPurchaseTokenFingerprint: linkedFingerprint,
      providerTransactionRef: normalized.normalized.latestOrderRefHash,
      providerStatus: normalized.normalized.providerStatus,
      acknowledgementState: normalized.normalized.acknowledgementState,
      autoRenews: normalized.normalized.autoRenews,
      startTime: normalized.normalized.startTime,
      currentPeriodEnd: normalized.normalized.currentPeriodEnd,
      gracePeriodEndsAt: normalized.normalized.gracePeriodEndsAt,
      billingRetryStartedAt: normalized.normalized.billingRetryStartedAt,
      expiresAt: normalized.normalized.expiresAt,
      pausedAt: normalized.normalized.pausedAt,
      testPurchase: normalized.normalized.testPurchase
    };
    const row = await processGooglePlayRtdnTransition(supabase, transitionInput);
    return jsonResponse({ received: true, disposition: row.result });
  } catch (error) {
    const retryable =
      error instanceof GooglePlayPublisherError || error instanceof GooglePlayRtdnTransitionError ? error.retryable : true;
    if (!retryable) return jsonResponse({ error: "Google Play RTDN could not be processed." }, 400);
    return jsonResponse({ error: "Google Play RTDN processing failed." }, 500);
  }
});
