import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "supabase/functions/google-play-rtdn/index.ts"), "utf8");
const oidcSource = readFileSync(join(process.cwd(), "supabase/functions/_shared/googlePlayOidc.ts"), "utf8");
const publisherSource = readFileSync(join(process.cwd(), "supabase/functions/_shared/googlePlayPublisher.ts"), "utf8");
const processorSource = readFileSync(join(process.cwd(), "supabase/functions/_shared/googlePlayRtdnProcessor.ts"), "utf8");
const config = readFileSync(join(process.cwd(), "supabase/config.toml"), "utf8");
const compactSource = source.replace(/\s+/g, " ");

describe("google-play-rtdn Edge Function structure", () => {
  it("is public at the Supabase JWT boundary but requires Google Pub/Sub OIDC internally", () => {
    expect(config).toContain("[functions.google-play-rtdn]");
    expect(config).toContain("verify_jwt = false");
    expect(source).toContain("verifyGooglePubSubOidc");
    expect(source).toContain("extractBearerToken(request.headers.get(\"authorization\"))");
    expect(source).toContain("serviceAccountEmail: config.pushServiceAccountEmail");
    expect(source).toContain("audience: config.audience");
    expect(compactSource.indexOf("verifyGooglePubSubOidc")).toBeLessThan(compactSource.indexOf("parsePubSubEnvelope"));
    expect(source).not.toMatch(/getUser|supabase\.auth|SUPABASE_ANON_KEY|optionsResponse|Access-Control-Allow-Origin/i);
  });

  it("uses a maintained Deno-compatible JWT/OIDC verifier and Google JWKS with strict claims", () => {
    expect(oidcSource).toContain("https://esm.sh/jose@");
    expect(oidcSource).toContain("createRemoteJWKSet(new URL(\"https://www.googleapis.com/oauth2/v3/certs\"))");
    expect(oidcSource).toContain("jwtVerify");
    expect(oidcSource).toContain("algorithms: [\"RS256\"]");
    expect(oidcSource).toContain("issuer: [\"https://accounts.google.com\", \"accounts.google.com\"]");
    expect(oidcSource).toContain("validateGoogleOidcClaims");
    expect(oidcSource).not.toMatch(/decodeJwt|JSON\.parse\(.*payload|split\(["']\.["']\)/i);
  });

  it("validates Pub/Sub and Play notification shape before any subscription refresh", () => {
    const envelopeIndex = source.indexOf("parsePubSubEnvelope(bodyText, config)");
    const notificationIndex = source.indexOf("parseDeveloperNotification(envelopeResult.envelope.dataText, config)");
    const fetchIndex = source.indexOf("purchase = await fetchSubscriptionPurchaseV2");
    const normalizedTransitionIndex = source.indexOf("const transitionInput: GooglePlayRtdnTransitionInput");
    expect(envelopeIndex).toBeGreaterThan(0);
    expect(notificationIndex).toBeGreaterThan(envelopeIndex);
    expect(fetchIndex).toBeGreaterThan(notificationIndex);
    expect(normalizedTransitionIndex).toBeGreaterThan(fetchIndex);
    expect(source).toContain("requestContentLengthTooLarge");
    expect(source).toContain("bodyTextTooLarge");
  });

  it("calls subscriptionsv2.get read-only and never purchase mutation APIs", () => {
    expect(publisherSource).toContain("purchases/subscriptionsv2/tokens/");
    expect(publisherSource).toContain("method: \"GET\"");
    expect(publisherSource).toContain("https://www.googleapis.com/auth/androidpublisher");
    expect(publisherSource).not.toMatch(/\b(acknowledge|cancel|refund|revoke|defer)\b/i);
    expect(source).not.toMatch(/launchBillingFlow|BillingClient|raw_purchase_token|acknowledgePurchase|cancelPurchase|refundPurchase|revokePurchase|deferPurchase/i);
  });

  it("records only fingerprinted purchase and order references through the RPC adapter", () => {
    expect(source).toContain("purchaseTokenFingerprint(notification.purchaseToken)");
    expect(source).toContain("purchase.linkedPurchaseToken ? await purchaseTokenFingerprint(purchase.linkedPurchaseToken) : null");
    expect(source).toContain("providerTransactionRef: normalized.normalized.latestOrderRefHash");
    expect(processorSource).toContain("p_purchase_token_fingerprint");
    expect(source).not.toMatch(/console\.(log|warn|error)\([^)]*(purchaseToken|accessToken|serviceAccount|authorization|bearer|jwt)/i);
  });

  it("processes test notifications without Android Publisher calls or entitlement mutation inputs", () => {
    const testBlock = source.match(/if \(notification\.kind === "test_notification"\) \{([\s\S]*?)return jsonResponse\(\{ received: true, disposition: row\.result \}\);/)?.[1];
    expect(testBlock).toBeTruthy();
    expect(testBlock).toContain("eventType: notification.eventType");
    expect(testBlock).toContain("purchaseTokenFingerprint: null");
    expect(testBlock).toContain("providerStatus: null");
    expect(testBlock).not.toContain("fetchSubscriptionPurchaseV2");
  });
});
