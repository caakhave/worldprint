import { describe, expect, it } from "vitest";
import {
  allowedCorsOrigin,
  billingCorsHeaders,
  configuredProPriceIds,
  hasConfiguredProPriceId,
  matchingConfiguredProPriceId,
  parseCheckoutPlanBody,
  requestContentLengthTooLarge,
  subscriptionPriceIds
} from "./security";

const priceConfig = {
  stripeProMonthlyPriceId: "price_monthly",
  stripeProYearlyPriceId: "price_yearly",
  stripeProPriceId: "price_fallback"
};

describe("billing security helpers", () => {
  it("parses only explicit monthly/yearly checkout JSON requests", () => {
    expect(parseCheckoutPlanBody({ contentType: "application/json", bodyText: '{"plan":"monthly"}' })).toEqual({
      plan: "monthly",
      error: null
    });
    expect(parseCheckoutPlanBody({ contentType: "application/json; charset=utf-8", bodyText: '{"plan":"yearly"}' })).toEqual({
      plan: "yearly",
      error: null
    });
    expect(parseCheckoutPlanBody({ contentType: "text/plain", bodyText: '{"plan":"monthly"}' })).toEqual({
      plan: null,
      error: "Checkout requests must be JSON."
    });
    expect(parseCheckoutPlanBody({ contentType: "application/json", bodyText: '{"plan":"weekly"}' })).toEqual({
      plan: null,
      error: "Choose monthly or yearly Pro billing."
    });
    expect(parseCheckoutPlanBody({ contentType: "application/json", bodyText: '{"plan":"price_test_123"}' })).toEqual({
      plan: null,
      error: "Choose monthly or yearly Pro billing."
    });
    expect(parseCheckoutPlanBody({ contentType: "application/json", bodyText: '{"priceId":"price_test_123"}' })).toEqual({
      plan: null,
      error: "Invalid checkout request."
    });
    expect(parseCheckoutPlanBody({ contentType: "application/json", bodyText: '{"plan":"monthly","role":"pro"}' })).toEqual({
      plan: null,
      error: "Invalid checkout request."
    });
  });

  it("rejects oversized JSON and webhook payloads by content length", () => {
    expect(parseCheckoutPlanBody({ contentType: "application/json", bodyText: '{"plan":"monthly"}', maxBytes: 4 })).toEqual({
      plan: null,
      error: "Checkout request is too large."
    });
    expect(requestContentLengthTooLarge("1048577", 1024 * 1024)).toBe(true);
    expect(requestContentLengthTooLarge("512", 1024 * 1024)).toBe(false);
    expect(requestContentLengthTooLarge(null, 1024 * 1024)).toBe(false);
  });

  it("limits browser CORS to production, configured local, and explicit previews", () => {
    expect(allowedCorsOrigin("https://canyougeo.com", { siteOrigin: "https://canyougeo.com" })).toBe("https://canyougeo.com");
    expect(allowedCorsOrigin("https://www.canyougeo.com", { siteOrigin: "https://canyougeo.com" })).toBe("https://www.canyougeo.com");
    expect(allowedCorsOrigin("https://test.canyougeo.com", { siteOrigin: "https://test.canyougeo.com" })).toBe(
      "https://test.canyougeo.com"
    );
    expect(allowedCorsOrigin("https://evil.example", { siteOrigin: "https://canyougeo.com" })).toBeNull();
    expect(allowedCorsOrigin("http://localhost:3000", { siteOrigin: "https://canyougeo.com" })).toBeNull();
    expect(allowedCorsOrigin("http://localhost:3000", { siteOrigin: "http://localhost:3000" })).toBe("http://localhost:3000");
    expect(allowedCorsOrigin("https://abc.canyougeo.pages.dev", { siteOrigin: "https://canyougeo.com" })).toBeNull();
    expect(
      allowedCorsOrigin("https://abc.canyougeo.pages.dev", { siteOrigin: "https://canyougeo.com", allowPreviewUrls: true })
    ).toBe("https://abc.canyougeo.pages.dev");
  });

  it("supports challenge-email preview and localhost CORS without wildcard origins", () => {
    const config = { siteOrigin: "https://test.canyougeo.com", allowPreviewUrls: true, allowLocalOrigins: true };
    expect(allowedCorsOrigin("https://66ceb54b.canyougeo.pages.dev", config)).toBe("https://66ceb54b.canyougeo.pages.dev");
    expect(allowedCorsOrigin("https://canyougeo.pages.dev", config)).toBe("https://canyougeo.pages.dev");
    expect(allowedCorsOrigin("http://localhost:3000", config)).toBe("http://localhost:3000");
    expect(allowedCorsOrigin("http://127.0.0.1:3000", config)).toBe("http://127.0.0.1:3000");
    expect(allowedCorsOrigin("https://evil.example.com", config)).toBeNull();
  });

  it("keeps Cloudflare preview CORS scoped to exact Can You Geo Pages hosts", () => {
    const config = { siteOrigin: "https://test.canyougeo.com", allowPreviewUrls: true, allowLocalOrigins: true };
    expect(allowedCorsOrigin("https://325e0252.canyougeo.pages.dev", config)).toBe("https://325e0252.canyougeo.pages.dev");
    expect(allowedCorsOrigin("https://nested.preview.canyougeo.pages.dev", config)).toBeNull();
    expect(allowedCorsOrigin("https://canyougeo.pages.dev.evil.example.com", config)).toBeNull();
    expect(allowedCorsOrigin("http://325e0252.canyougeo.pages.dev", config)).toBeNull();
  });

  it("echoes only allowed challenge-email origins in preflight headers", () => {
    const headers = billingCorsHeaders("https://66ceb54b.canyougeo.pages.dev", {
      siteOrigin: "https://test.canyougeo.com",
      allowPreviewUrls: true,
      allowLocalOrigins: true
    });
    expect(headers["Access-Control-Allow-Origin"]).toBe("https://66ceb54b.canyougeo.pages.dev");
    expect(headers["Access-Control-Allow-Methods"]).toContain("POST");
    expect(headers["Access-Control-Allow-Methods"]).toContain("OPTIONS");
    expect(headers["Access-Control-Allow-Headers"]).toContain("authorization");
    expect(headers["Access-Control-Allow-Headers"]).toContain("x-client-info");
    expect(headers["Access-Control-Allow-Headers"]).toContain("apikey");
    expect(headers["Access-Control-Allow-Headers"]).toContain("content-type");

    expect(
      billingCorsHeaders("https://evil.example.com", {
        siteOrigin: "https://test.canyougeo.com",
        allowPreviewUrls: true,
        allowLocalOrigins: true
      })["Access-Control-Allow-Origin"]
    ).not.toBe("https://evil.example.com");
  });

  it("returns a nonmatching CORS origin for rejected browser origins", () => {
    expect(billingCorsHeaders("https://evil.example", { siteOrigin: "https://canyougeo.com" })["Access-Control-Allow-Origin"]).toBe(
      "https://canyougeo.com"
    );
  });

  it("extracts and validates only configured Pro price ids", () => {
    expect([...configuredProPriceIds(priceConfig)]).toEqual(["price_monthly", "price_yearly", "price_fallback"]);
    const subscription = {
      items: {
        data: [{ price: { id: "price_other" } }, { price: { id: "price_yearly" } }]
      }
    };
    expect(subscriptionPriceIds(subscription)).toEqual(["price_other", "price_yearly"]);
    expect(hasConfiguredProPriceId(priceConfig, subscriptionPriceIds(subscription))).toBe(true);
    expect(matchingConfiguredProPriceId(priceConfig, subscriptionPriceIds(subscription))).toBe("price_yearly");
    expect(hasConfiguredProPriceId(priceConfig, ["price_other"])).toBe(false);
  });
});
