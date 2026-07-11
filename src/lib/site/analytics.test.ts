import { afterEach, describe, expect, it, vi } from "vitest";
import {
  analyticsConfigFromEnv,
  sanitizeAnalyticsParams,
  scoreBandForScore,
  trackAnalyticsEvent,
  trackCheckoutStarted,
  trackRegistrationComplete,
  trackUpgradeIntent
} from "@/lib/site/analytics";

describe("analytics helpers", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    delete (window as typeof window & { dataLayer?: unknown[]; gtag?: unknown }).dataLayer;
    delete (window as typeof window & { dataLayer?: unknown[]; gtag?: unknown }).gtag;
  });

  it("keeps analytics disabled by default", () => {
    expect(analyticsConfigFromEnv({ NEXT_PUBLIC_SITE_URL: "https://canyougeo.com" })).toMatchObject({
      enabled: false,
      provider: null
    });
  });

  it("uses GTM only when explicitly enabled on the production site", () => {
    expect(
      analyticsConfigFromEnv({
        NEXT_PUBLIC_ANALYTICS_ENABLED: "true",
        NEXT_PUBLIC_GTM_ID: "GTM-CANYOUGEO",
        NEXT_PUBLIC_GA_MEASUREMENT_ID: "G-ABC1234567",
        NEXT_PUBLIC_SITE_URL: "https://canyougeo.com",
        NEXT_PUBLIC_NO_INDEX: "false"
      })
    ).toMatchObject({
      enabled: true,
      provider: "gtm",
      gtmId: "GTM-CANYOUGEO"
    });
  });

  it("falls back to direct GA4 only when GTM is absent", () => {
    expect(
      analyticsConfigFromEnv({
        NEXT_PUBLIC_ANALYTICS_ENABLED: "true",
        NEXT_PUBLIC_GA_MEASUREMENT_ID: "G-ABC1234567",
        NEXT_PUBLIC_SITE_URL: "https://canyougeo.com",
        NEXT_PUBLIC_NO_INDEX: "false"
      })
    ).toMatchObject({
      enabled: true,
      provider: "ga4",
      gaMeasurementId: "G-ABC1234567"
    });
  });

  it("stays disabled on staging and test domains even with IDs present", () => {
    expect(
      analyticsConfigFromEnv({
        NEXT_PUBLIC_ANALYTICS_ENABLED: "true",
        NEXT_PUBLIC_GTM_ID: "GTM-CANYOUGEO",
        NEXT_PUBLIC_SITE_URL: "https://test.canyougeo.com",
        NEXT_PUBLIC_NO_INDEX: "false"
      })
    ).toMatchObject({ enabled: false });
  });

  it("drops PII-shaped keys and email-like values from event payloads", () => {
    expect(
      sanitizeAnalyticsParams({
        source: "header",
        plan: "yearly",
        score: 2400,
        email: "player@example.com",
        user_id: "11111111-2222-4333-8444-555555555555",
        label: "not-an-email",
        maybe_email: "friend@example.com"
      })
    ).toEqual({
      source: "header",
      plan: "yearly",
      score: 2400,
      label: "not-an-email"
    });
  });

  it("is a safe no-op when called without a browser window", () => {
    const originalWindow = window;
    vi.stubGlobal("window", undefined);

    expect(() =>
      trackAnalyticsEvent("cgy_game_start", {
        game_slug: "mystery-map",
        mode: "guest_sample",
        round_count: 5,
        signed_in: false,
        plan: "guest"
      })
    ).not.toThrow();

    vi.stubGlobal("window", originalWindow);
  });

  it("does not throw when analytics globals are unavailable", () => {
    vi.stubEnv("NEXT_PUBLIC_ANALYTICS_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_GTM_ID", "GTM-CANYOUGEO");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://canyougeo.com");
    vi.stubEnv("NEXT_PUBLIC_NO_INDEX", "false");

    expect(() =>
      trackAnalyticsEvent("cgy_game_start", {
        game_slug: "mystery-map",
        mode: "guest_sample",
        round_count: 5,
        signed_in: false,
        plan: "guest"
      })
    ).not.toThrow();
  });

  it("pushes safe events to the dataLayer", () => {
    vi.stubEnv("NEXT_PUBLIC_ANALYTICS_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_GTM_ID", "GTM-CANYOUGEO");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://canyougeo.com");
    vi.stubEnv("NEXT_PUBLIC_NO_INDEX", "false");
    const analyticsWindow = window as typeof window & { dataLayer: unknown[] };
    analyticsWindow.dataLayer = [];

    trackAnalyticsEvent("cgy_share", {
      method: "copy_link",
      content_type: "challenge_link",
      game_slug: "mystery-map",
      mode: "free_daily"
    });

    expect(analyticsWindow.dataLayer).toEqual([
      {
        event: "cgy_share",
        method: "copy_link",
        content_type: "challenge_link",
        game_slug: "mystery-map",
        mode: "free_daily"
      }
    ]);
  });

  it("initializes dataLayer even when direct GA4 is the configured provider", () => {
    vi.stubEnv("NEXT_PUBLIC_ANALYTICS_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "G-ABC1234567");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://canyougeo.com");
    vi.stubEnv("NEXT_PUBLIC_NO_INDEX", "false");
    const gtag = vi.fn();
    (window as typeof window & { gtag: typeof gtag }).gtag = gtag;

    trackAnalyticsEvent("cgy_begin_checkout", { currency: "USD", value: 3.99, plan: "pro_monthly" });

    expect(gtag).not.toHaveBeenCalled();
    expect((window as typeof window & { dataLayer?: unknown[] }).dataLayer).toEqual([
      { event: "cgy_begin_checkout", currency: "USD", value: 3.99, plan: "pro_monthly" }
    ]);
  });

  it("pushes signup and upgrade conversion events without vendor-specific fields", () => {
    vi.stubEnv("NEXT_PUBLIC_ANALYTICS_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_GTM_ID", "GTM-CANYOUGEO");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://canyougeo.com");
    vi.stubEnv("NEXT_PUBLIC_NO_INDEX", "false");

    trackRegistrationComplete();
    trackUpgradeIntent({
      currency: "USD",
      value: 29.99,
      plan: "pro_yearly",
      signed_in: false,
      source: "upgrade"
    });
    trackCheckoutStarted({
      currency: "USD",
      value: 29.99,
      plan: "pro_yearly"
    });

    expect((window as typeof window & { dataLayer?: unknown[] }).dataLayer).toEqual([
      { event: "cgy_sign_up", method: "email" },
      { event: "cgy_signup_complete", method: "email" },
      {
        event: "cgy_upgrade_click",
        currency: "USD",
        value: 29.99,
        plan: "pro_yearly",
        signed_in: false,
        source: "upgrade"
      },
      { event: "cgy_begin_checkout", currency: "USD", value: 29.99, plan: "pro_yearly" }
    ]);
    expect(JSON.stringify((window as typeof window & { dataLayer?: unknown[] }).dataLayer)).not.toMatch(
      /Meta|Facebook|fbp|fbc|pixel|reddit|tiktok|pinterest|user_id|player@example/i
    );
  });

  it("does not push conversion events on staging even if analytics IDs are present", () => {
    vi.stubEnv("NEXT_PUBLIC_ANALYTICS_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_GTM_ID", "GTM-CANYOUGEO");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://test.canyougeo.com");
    vi.stubEnv("NEXT_PUBLIC_NO_INDEX", "false");
    (window as typeof window & { dataLayer?: unknown[] }).dataLayer = [];

    trackRegistrationComplete();
    trackUpgradeIntent({
      currency: "USD",
      value: 3.99,
      plan: "pro_monthly",
      signed_in: true,
      source: "account"
    });
    trackCheckoutStarted({
      currency: "USD",
      value: 3.99,
      plan: "pro_monthly"
    });

    expect((window as typeof window & { dataLayer?: unknown[] }).dataLayer).toEqual([]);
  });

  it("omits undefined and null event params", () => {
    expect(
      sanitizeAnalyticsParams({
        content_type: "game_card",
        item_id: "play_mystery_map",
        game_slug: "mystery-map",
        mode: undefined,
        value: null
      })
    ).toEqual({
      content_type: "game_card",
      item_id: "play_mystery_map",
      game_slug: "mystery-map"
    });
  });

  it("uses stable score bands", () => {
    expect(scoreBandForScore(3000, 3000)).toBe("perfect");
    expect(scoreBandForScore(2400, 3000)).toBe("high");
    expect(scoreBandForScore(1500, 3000)).toBe("medium");
    expect(scoreBandForScore(1000, 3000)).toBe("low");
  });
});
