import type React from "react";
import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AnalyticsScripts } from "@/components/AnalyticsScripts";

vi.mock("next/script", () => ({
  default: ({ children, ...props }: React.ScriptHTMLAttributes<HTMLScriptElement>) => <script {...props}>{children}</script>
}));

describe("AnalyticsScripts", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("renders no analytics scripts when disabled", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://canyougeo.com");
    vi.stubEnv("NEXT_PUBLIC_ANALYTICS_ENABLED", "false");
    vi.stubEnv("NEXT_PUBLIC_GTM_ID", "GTM-CANYOUGEO");

    const { container } = render(<AnalyticsScripts />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders GTM only when analytics is enabled and a GTM ID exists", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://canyougeo.com");
    vi.stubEnv("NEXT_PUBLIC_NO_INDEX", "false");
    vi.stubEnv("NEXT_PUBLIC_ANALYTICS_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_GTM_ID", "GTM-CANYOUGEO");
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "G-ABC1234567");

    const { container } = render(<AnalyticsScripts />);

    expect(container.innerHTML).toContain("cgy-gtm-init");
    expect(container.innerHTML).toContain("GTM-CANYOUGEO");
    expect(container.innerHTML).not.toContain("cgy-ga4-init");
  });

  it("sets advertising consent defaults to denied before GTM loads", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://canyougeo.com");
    vi.stubEnv("NEXT_PUBLIC_NO_INDEX", "false");
    vi.stubEnv("NEXT_PUBLIC_ANALYTICS_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_GTM_ID", "GTM-CANYOUGEO");

    const { container } = render(<AnalyticsScripts />);
    const markup = container.innerHTML;

    expect(markup).toContain("window.gtag('consent', 'default'");
    expect(markup).toContain('"ad_storage":"denied"');
    expect(markup).toContain('"ad_personalization":"denied"');
    expect(markup).toContain('"ad_user_data":"denied"');
    expect(markup.indexOf("window.gtag('consent', 'default'")).toBeLessThan(markup.indexOf("gtm.start"));
  });

  it("renders direct GA4 when enabled and GTM is absent", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://canyougeo.com");
    vi.stubEnv("NEXT_PUBLIC_NO_INDEX", "false");
    vi.stubEnv("NEXT_PUBLIC_ANALYTICS_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "G-ABC1234567");

    const { container } = render(<AnalyticsScripts />);

    expect(container.innerHTML).toContain("cgy-ga4-src");
    expect(container.innerHTML).toContain("cgy-ga4-init");
    expect(container.innerHTML).toContain("G-ABC1234567");
  });

  it("does not render analytics scripts for noindexed staging domains", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://test.canyougeo.com");
    vi.stubEnv("NEXT_PUBLIC_NO_INDEX", "false");
    vi.stubEnv("NEXT_PUBLIC_ANALYTICS_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_GTM_ID", "GTM-CANYOUGEO");

    const { container } = render(<AnalyticsScripts />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders no browser analytics loaders in native app builds", () => {
    vi.stubEnv("NEXT_PUBLIC_CGY_NATIVE_APP", "1");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://canyougeo.com");
    vi.stubEnv("NEXT_PUBLIC_NO_INDEX", "false");
    vi.stubEnv("NEXT_PUBLIC_ANALYTICS_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_GTM_ID", "GTM-CANYOUGEO");
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "G-ABC1234567");

    const { container } = render(<AnalyticsScripts />);

    expect(container).toBeEmptyDOMElement();
    expect(container.innerHTML).not.toContain("googletagmanager.com");
    expect(container.innerHTML).not.toContain("cgy-gtm-init");
    expect(container.innerHTML).not.toContain("cgy-ga4-src");
    expect(container.querySelector("iframe")).toBeNull();
  });
});
