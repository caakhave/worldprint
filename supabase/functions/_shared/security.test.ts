import { describe, expect, it } from "vitest";
import {
  allowedCorsOrigin,
  billingCorsHeaders,
  configuredProPriceIds,
  hasConfiguredProPriceId,
  matchingConfiguredProPriceId,
  parseCheckoutIntervalBody,
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
    expect(parseCheckoutIntervalBody({ contentType: "application/json", bodyText: '{"interval":"monthly"}' })).toEqual({
      interval: "monthly",
      error: null
    });
    expect(parseCheckoutIntervalBody({ contentType: "application/json; charset=utf-8", bodyText: '{"interval":"yearly"}' })).toEqual({
      interval: "yearly",
      error: null
    });
    expect(parseCheckoutIntervalBody({ contentType: "text/plain", bodyText: '{"interval":"monthly"}' })).toEqual({
      interval: null,
      error: "Checkout requests must be JSON."
    });
    expect(parseCheckoutIntervalBody({ contentType: "application/json", bodyText: '{"interval":"weekly"}' })).toEqual({
      interval: null,
      error: "Choose monthly or yearly Pro billing."
    });
    expect(parseCheckoutIntervalBody({ contentType: "application/json", bodyText: '{"interval":"monthly","role":"pro"}' })).toEqual({
      interval: null,
      error: "Invalid checkout request."
    });
  });

  it("rejects oversized JSON and webhook payloads by content length", () => {
    expect(parseCheckoutIntervalBody({ contentType: "application/json", bodyText: '{"interval":"monthly"}', maxBytes: 4 })).toEqual({
      interval: null,
      error: "Checkout request is too large."
    });
    expect(requestContentLengthTooLarge("1048577", 1024 * 1024)).toBe(true);
    expect(requestContentLengthTooLarge("512", 1024 * 1024)).toBe(false);
    expect(requestContentLengthTooLarge(null, 1024 * 1024)).toBe(false);
  });

  it("limits browser CORS to production, configured local, and explicit previews", () => {
    expect(allowedCorsOrigin("https://canyougeo.com", { siteOrigin: "https://canyougeo.com" })).toBe("https://canyougeo.com");
    expect(allowedCorsOrigin("https://www.canyougeo.com", { siteOrigin: "https://canyougeo.com" })).toBe("https://www.canyougeo.com");
    expect(allowedCorsOrigin("https://evil.example", { siteOrigin: "https://canyougeo.com" })).toBeNull();
    expect(allowedCorsOrigin("http://localhost:3000", { siteOrigin: "https://canyougeo.com" })).toBeNull();
    expect(allowedCorsOrigin("http://localhost:3000", { siteOrigin: "http://localhost:3000" })).toBe("http://localhost:3000");
    expect(allowedCorsOrigin("https://abc.canyougeo.pages.dev", { siteOrigin: "https://canyougeo.com" })).toBeNull();
    expect(
      allowedCorsOrigin("https://abc.canyougeo.pages.dev", { siteOrigin: "https://canyougeo.com", allowPreviewUrls: true })
    ).toBe("https://abc.canyougeo.pages.dev");
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
