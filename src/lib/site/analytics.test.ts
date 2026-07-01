import { afterEach, describe, expect, it, vi } from "vitest";
import { analyticsConfigFromEnv, sanitizeAnalyticsParams, trackCanYouGeoEvent } from "@/lib/site/analytics";

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

    expect(() => trackCanYouGeoEvent("cgy_game_start", { run_mode: "sample" })).not.toThrow();

    vi.stubGlobal("window", originalWindow);
  });

  it("does not throw when analytics globals are unavailable", () => {
    vi.stubEnv("NEXT_PUBLIC_ANALYTICS_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_GTM_ID", "GTM-CANYOUGEO");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://canyougeo.com");
    vi.stubEnv("NEXT_PUBLIC_NO_INDEX", "false");

    expect(() => trackCanYouGeoEvent("cgy_game_start", { run_mode: "sample" })).not.toThrow();
  });

  it("pushes safe events to GTM dataLayer when available", () => {
    vi.stubEnv("NEXT_PUBLIC_ANALYTICS_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_GTM_ID", "GTM-CANYOUGEO");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://canyougeo.com");
    vi.stubEnv("NEXT_PUBLIC_NO_INDEX", "false");
    const analyticsWindow = window as typeof window & { dataLayer: unknown[] };
    analyticsWindow.dataLayer = [];

    trackCanYouGeoEvent("cgy_share_clicked", {
      method: "copy_link",
      run_mode: "daily",
      recipient_email: "friend@example.com"
    });

    expect(analyticsWindow.dataLayer).toEqual([{ event: "cgy_share_clicked", method: "copy_link", run_mode: "daily" }]);
  });

  it("uses gtag when direct GA4 is available", () => {
    vi.stubEnv("NEXT_PUBLIC_ANALYTICS_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "G-ABC1234567");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://canyougeo.com");
    vi.stubEnv("NEXT_PUBLIC_NO_INDEX", "false");
    const gtag = vi.fn();
    (window as typeof window & { gtag: typeof gtag }).gtag = gtag;

    trackCanYouGeoEvent("cgy_upgrade_clicked", { source: "upgrade", plan: "monthly" });

    expect(gtag).toHaveBeenCalledWith("event", "cgy_upgrade_clicked", { source: "upgrade", plan: "monthly" });
  });
});
