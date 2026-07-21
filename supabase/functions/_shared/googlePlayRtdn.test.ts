import { describe, expect, it } from "vitest";
import {
  expectedSubscriptionName,
  extractBearerToken,
  googleProviderProductRef,
  normalizeGoogleSubscriptionPurchase,
  parseDeveloperNotification,
  parsePubSubEnvelope,
  providerStatusForGoogleState,
  purchaseTokenFingerprint,
  validateGoogleOidcClaims,
  type GooglePlayRtdnConfig
} from "./googlePlayRtdn";

const config: GooglePlayRtdnConfig = {
  supabaseUrl: "https://hsgpjtyysbremrokkoym.supabase.co",
  supabaseServiceRoleKey: "test-service-role-not-real",
  packageName: "com.canyougeo.app",
  subscriptionProductId: "canyougeo_pro",
  monthlyBasePlanId: "monthly",
  annualBasePlanId: "annual",
  serviceAccountJson: "{}",
  pushServiceAccountEmail: "cgy-rtdn-push@can-you-geo-play-billing.iam.gserviceaccount.com",
  audience: "https://hsgpjtyysbremrokkoym.supabase.co/functions/v1/google-play-rtdn",
  topic: "projects/can-you-geo-play-billing/topics/cgy-google-play-rtdn",
  subscription: "cgy-google-play-rtdn-staging-push",
  environment: "test"
};

describe("Google Play RTDN shared helpers", () => {
  it("validates the Pub/Sub OIDC identity claims after signature verification", () => {
    const now = 1_800_000_000;
    expect(
      validateGoogleOidcClaims({
        claims: {
          iss: "https://accounts.google.com",
          aud: config.audience,
          email: config.pushServiceAccountEmail,
          email_verified: true,
          exp: now + 600,
          iat: now - 10
        },
        audience: config.audience,
        serviceAccountEmail: config.pushServiceAccountEmail,
        nowSeconds: now
      })
    ).toEqual({ ok: true });

    for (const [claim, value, error] of [
      ["aud", "https://wrong.example/functions/v1/google-play-rtdn", "invalid_audience"],
      ["iss", "https://issuer.example", "invalid_issuer"],
      ["email", "other@can-you-geo-play-billing.iam.gserviceaccount.com", "invalid_email"],
      ["email_verified", false, "email_not_verified"],
      ["exp", now - 1, "token_expired"],
      ["iat", now + 3600, "invalid_iat"]
    ] as const) {
      const claims = {
        iss: "https://accounts.google.com",
        aud: config.audience,
        email: config.pushServiceAccountEmail,
        email_verified: true,
        exp: now + 600,
        iat: now - 10,
        [claim]: value
      };
      expect(
        validateGoogleOidcClaims({
          claims,
          audience: config.audience,
          serviceAccountEmail: config.pushServiceAccountEmail,
          nowSeconds: now
        })
      ).toEqual({ ok: false, error });
    }
  });

  it("extracts only a bearer token-shaped Authorization value", () => {
    expect(extractBearerToken("Bearer abc.def.ghi")).toEqual({ token: "abc.def.ghi", error: null });
    expect(extractBearerToken(null)).toEqual({ token: null, error: "missing_bearer_token" });
    expect(extractBearerToken("Basic abc")).toEqual({ token: null, error: "malformed_bearer_token" });
  });

  it("requires the exact configured Pub/Sub subscription envelope and decodes message data", () => {
    const body = JSON.stringify({
      message: {
        messageId: "message-1",
        data: Buffer.from(JSON.stringify(testNotification())).toString("base64")
      },
      subscription: "projects/can-you-geo-play-billing/subscriptions/cgy-google-play-rtdn-staging-push"
    });
    expect(expectedSubscriptionName(config)).toBe("projects/can-you-geo-play-billing/subscriptions/cgy-google-play-rtdn-staging-push");
    expect(parsePubSubEnvelope(body, config).envelope).toMatchObject({
      messageId: "message-1",
      subscription: "projects/can-you-geo-play-billing/subscriptions/cgy-google-play-rtdn-staging-push"
    });

    const wrongSubscription = JSON.stringify({
      message: { messageId: "message-1", data: Buffer.from("{}").toString("base64") },
      subscription: "projects/can-you-geo-play-billing/subscriptions/other"
    });
    expect(parsePubSubEnvelope(wrongSubscription, config)).toMatchObject({ envelope: null, error: "wrong_subscription" });
  });

  it("accepts a fully qualified Pub/Sub subscription resource path", () => {
    const fullSubscription = "projects/can-you-geo-play-billing/subscriptions/cgy-google-play-rtdn-staging-push";
    expect(expectedSubscriptionName({ ...config, subscription: fullSubscription })).toBe(fullSubscription);
  });

  it("parses test notifications without creating subscription inputs", () => {
    expect(parseDeveloperNotification(JSON.stringify(testNotification()), config).notification).toMatchObject({
      kind: "test_notification",
      eventType: "test_notification",
      eventSubtype: "test"
    });
  });

  it("parses subscription notifications while keeping raw purchase tokens out of durable refs", async () => {
    const parsed = parseDeveloperNotification(JSON.stringify(subscriptionNotification()), config).notification;
    expect(parsed).toMatchObject({
      kind: "subscription_notification",
      eventType: "subscription_notification",
      eventSubtype: "subscription_notification_4"
    });
    if (parsed?.kind !== "subscription_notification") throw new Error("expected subscription notification");

    const fingerprint = await purchaseTokenFingerprint(parsed.purchaseToken);
    expect(fingerprint).toMatch(/^sha256_[a-f0-9]{64}$/);
    expect(fingerprint).not.toContain(parsed.purchaseToken);
  });

  it("rejects wrong package, malformed JSON, missing message IDs, and invalid notification unions", () => {
    expect(parseDeveloperNotification(JSON.stringify({ ...testNotification(), packageName: "com.other.app" }), config)).toMatchObject({
      notification: null,
      error: "wrong_package"
    });
    expect(parseDeveloperNotification("{", config)).toMatchObject({ notification: null, error: "malformed_developer_notification" });
    expect(parseDeveloperNotification(JSON.stringify({ ...testNotification(), subscriptionNotification: {} }), config)).toMatchObject({
      notification: null,
      error: "invalid_notification_union"
    });
    expect(parsePubSubEnvelope(JSON.stringify({ message: { data: "%%%notbase64" }, subscription: expectedSubscriptionName(config) }), config)).toMatchObject({
      envelope: null,
      error: "missing_message_id"
    });
  });

  it("normalizes Google subscription states into the provider-neutral entitlement model", () => {
    const asOf = "2026-07-18T14:40:00.000Z";
    const future = "2026-08-18T14:40:00.000Z";
    expect(providerStatusForGoogleState("SUBSCRIPTION_STATE_ACTIVE", future, asOf)).toMatchObject({
      status: "active",
      currentPeriodEnd: future
    });
    expect(providerStatusForGoogleState("SUBSCRIPTION_STATE_IN_GRACE_PERIOD", future, asOf)).toMatchObject({
      status: "grace_period",
      gracePeriodEndsAt: future
    });
    expect(providerStatusForGoogleState("SUBSCRIPTION_STATE_ON_HOLD", future, asOf)).toMatchObject({
      status: "billing_retry",
      billingRetryStartedAt: asOf
    });
    expect(providerStatusForGoogleState("SUBSCRIPTION_STATE_CANCELED", future, asOf)).toMatchObject({
      status: "cancelled_active_until_period_end",
      currentPeriodEnd: future
    });
    expect(providerStatusForGoogleState("SUBSCRIPTION_STATE_EXPIRED", future, asOf)).toMatchObject({
      status: "expired",
      expiresAt: future
    });
    expect(providerStatusForGoogleState("SUBSCRIPTION_STATE_PAUSED", future, asOf)).toMatchObject({
      status: "paused",
      pausedAt: asOf
    });
    expect(providerStatusForGoogleState("SUBSCRIPTION_STATE_PENDING", null, asOf)).toMatchObject({
      status: "pending",
      reconciliationStatus: "needs_verification"
    });
    expect(providerStatusForGoogleState("FUTURE_STATE", future, asOf)).toBeNull();
  });

  it("normalizes only the approved Can You Geo product and base plans", async () => {
    await expect(
      normalizeGoogleSubscriptionPurchase({
        purchase: purchaseV2({ basePlanId: "monthly", state: "SUBSCRIPTION_STATE_ACTIVE" }),
        config,
        asOfIso: "2026-07-18T14:40:00.000Z"
      })
    ).resolves.toMatchObject({
      normalized: {
        providerStatus: "active",
        providerProductRef: googleProviderProductRef({
          packageName: "com.canyougeo.app",
          productId: "canyougeo_pro",
          basePlanId: "monthly"
        }),
        testPurchase: true
      },
      error: null
    });

    await expect(
      normalizeGoogleSubscriptionPurchase({
        purchase: purchaseV2({ productId: "other_product", basePlanId: "monthly", state: "SUBSCRIPTION_STATE_ACTIVE" }),
        config,
        asOfIso: "2026-07-18T14:40:00.000Z"
      })
    ).resolves.toMatchObject({ normalized: null, error: "unexpected_product_or_base_plan" });

    await expect(
      normalizeGoogleSubscriptionPurchase({
        purchase: purchaseV2({ basePlanId: "monthly", state: "SUBSCRIPTION_STATE_ACTIVE", expiryTime: "" }),
        config,
        asOfIso: "2026-07-18T14:40:00.000Z"
      })
    ).resolves.toMatchObject({ normalized: null, error: "missing_period_end" });
  });
});

function testNotification() {
  return {
    version: "1.0",
    packageName: "com.canyougeo.app",
    eventTimeMillis: "1784385600000",
    testNotification: { version: "1.0" }
  };
}

function subscriptionNotification() {
  return {
    version: "1.0",
    packageName: "com.canyougeo.app",
    eventTimeMillis: "1784385600000",
    subscriptionNotification: {
      version: "1.0",
      notificationType: 4,
      purchaseToken: "synthetic-token-not-real"
    }
  };
}

function purchaseV2(input: { productId?: string; basePlanId: string; state: string; expiryTime?: string }) {
  return {
    startTime: "2026-07-18T14:40:00Z",
    subscriptionState: input.state,
    acknowledgementState: "ACKNOWLEDGEMENT_STATE_PENDING",
    testPurchase: {},
    lineItems: [
      {
        productId: input.productId ?? "canyougeo_pro",
        expiryTime: input.expiryTime === undefined ? "2026-08-18T14:40:00Z" : input.expiryTime,
        latestSuccessfulOrderId: "GPA.synthetic-order-not-real",
        autoRenewingPlan: { autoRenewEnabled: true },
        offerDetails: { basePlanId: input.basePlanId }
      }
    ]
  };
}
