import { describe, expect, it } from "vitest";
import { billingReturnUrls, resolveBillingSiteOrigin } from "./returnUrls";

describe("billing return URLs", () => {
  it("builds production Checkout and Portal return URLs", () => {
    expect(billingReturnUrls("https://canyougeo.com")).toEqual({
      successUrl: "https://canyougeo.com/account?billing=success",
      cancelUrl: "https://canyougeo.com/upgrade?billing=cancelled",
      portalReturnUrl: "https://canyougeo.com/account"
    });
  });

  it("accepts the production Can You Geo origin", () => {
    expect(
      resolveBillingSiteOrigin({
        configuredSiteUrl: "https://canyougeo.com",
        supabaseUrl: "https://jquebthneczqdxagagof.supabase.co"
      })
    ).toEqual({ origin: "https://canyougeo.com", error: null });
  });

  it("rejects localhost returns for deployed Supabase projects", () => {
    expect(
      resolveBillingSiteOrigin({
        configuredSiteUrl: "http://localhost:3000",
        supabaseUrl: "https://jquebthneczqdxagagof.supabase.co"
      })
    ).toEqual({
      origin: null,
      error: "NEXT_PUBLIC_SITE_URL cannot be localhost for deployed billing. Set it to https://canyougeo.com."
    });
  });

  it("allows localhost only with a local Supabase URL", () => {
    expect(
      resolveBillingSiteOrigin({
        configuredSiteUrl: "http://localhost:3000",
        supabaseUrl: "http://127.0.0.1:54321"
      })
    ).toEqual({ origin: "http://localhost:3000", error: null });
  });

  it("requires https outside local development", () => {
    expect(
      resolveBillingSiteOrigin({
        configuredSiteUrl: "http://canyougeo.com",
        supabaseUrl: "https://jquebthneczqdxagagof.supabase.co"
      })
    ).toEqual({ origin: null, error: "NEXT_PUBLIC_SITE_URL must use https outside local development." });
  });

  it("allows Cloudflare preview URLs only when explicitly enabled", () => {
    const input = {
      configuredSiteUrl: "https://abc123.canyougeo.pages.dev",
      supabaseUrl: "https://jquebthneczqdxagagof.supabase.co"
    };
    expect(resolveBillingSiteOrigin(input)).toEqual({
      origin: null,
      error: "NEXT_PUBLIC_SITE_URL host is not allowed for billing returns. Use https://canyougeo.com."
    });
    expect(resolveBillingSiteOrigin({ ...input, allowPreviewUrls: true })).toEqual({
      origin: "https://abc123.canyougeo.pages.dev",
      error: null
    });
  });

  it("rejects URLs with paths or query strings", () => {
    expect(
      resolveBillingSiteOrigin({
        configuredSiteUrl: "https://canyougeo.com/account?next=https://evil.example",
        supabaseUrl: "https://jquebthneczqdxagagof.supabase.co"
      })
    ).toEqual({ origin: null, error: "NEXT_PUBLIC_SITE_URL must be an origin only, such as https://canyougeo.com." });
  });
});
