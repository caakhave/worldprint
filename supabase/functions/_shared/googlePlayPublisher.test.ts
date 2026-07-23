import { describe, expect, it } from "vitest";
import { acknowledgeSubscriptionPurchase, GooglePlayPublisherError } from "./googlePlayPublisher";

describe("Google Play Publisher helpers", () => {
  it("acknowledges subscriptions with an empty body and no account identifier payload", async () => {
    const serviceAccountJson = await serviceAccountJsonFixture();
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = String(input);
      calls.push({ url, init });
      if (url === "https://oauth2.googleapis.com/token") {
        return new Response(JSON.stringify({ access_token: "synthetic-access-token" }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }
      return new Response(null, { status: 204 });
    };

    await acknowledgeSubscriptionPurchase({
      serviceAccountJson,
      packageName: "com.canyougeo.app",
      subscriptionId: "canyougeo_pro",
      purchaseToken: "synthetic-google-play-token-not-real",
      fetchImpl
    });

    expect(calls).toHaveLength(2);
    const acknowledgementCall = calls[1];
    expect(acknowledgementCall?.url).toContain("/purchases/subscriptions/canyougeo_pro/tokens/");
    expect(acknowledgementCall?.url).toContain(":acknowledge");
    expect(acknowledgementCall?.init?.method).toBe("POST");
    expect(acknowledgementCall?.init?.body).toBe("{}");
    expect(String(acknowledgementCall?.init?.body)).not.toContain("externalAccountIds");
    expect(String(acknowledgementCall?.init?.body)).not.toContain("obfuscatedAccountId");
    expect(String(acknowledgementCall?.init?.body)).not.toContain("synthetic-google-play-token-not-real");
  });

  it("preserves sanitized acknowledgement API errors without leaking purchase tokens", async () => {
    const serviceAccountJson = await serviceAccountJsonFixture();
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      if (url === "https://oauth2.googleapis.com/token") {
        return new Response(JSON.stringify({ access_token: "synthetic-access-token" }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }
      return new Response(
        JSON.stringify({
          error: {
            code: 400,
            status: "INVALID_ARGUMENT",
            message: "The acknowledgement request body is invalid."
          }
        }),
        {
          status: 400,
          headers: { "content-type": "application/json" }
        }
      );
    };

    let thrown: unknown;
    try {
      await acknowledgeSubscriptionPurchase({
        serviceAccountJson,
        packageName: "com.canyougeo.app",
        subscriptionId: "canyougeo_pro",
        purchaseToken: "synthetic-google-play-token-not-real",
        fetchImpl
      });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(GooglePlayPublisherError);
    expect(thrown).toMatchObject({
      result: "invalid_purchase_request",
      retryable: false,
      status: 400,
      stage: "purchase_acknowledgement",
      googleApiError: {
        code: 400,
        status: "INVALID_ARGUMENT",
        message: "The acknowledgement request body is invalid."
      }
    });
    expect(String((thrown as Error).message)).not.toContain("synthetic-google-play-token-not-real");
  });
});

async function serviceAccountJsonFixture(): Promise<string> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256"
    },
    true,
    ["sign", "verify"]
  );
  const privateKey = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
  const base64 = Buffer.from(new Uint8Array(privateKey)).toString("base64").replace(/(.{64})/g, "$1\n").trim();
  return JSON.stringify({
    type: "service_account",
    client_email: "google-play-publisher-test-principal",
    private_key: `-----BEGIN PRIVATE KEY-----\n${base64}\n-----END PRIVATE KEY-----`
  });
}
