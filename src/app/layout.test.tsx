import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import RootLayout, { metadata } from "@/app/layout";

vi.mock("next/font/google", () => {
  const font = () => ({ variable: "mock-font" });
  return {
    IBM_Plex_Mono: font,
    IBM_Plex_Sans: font,
    Literata: font
  };
});

vi.mock("@/components/AnalyticsScripts", () => ({
  AnalyticsScripts: () => null
}));

vi.mock("@/features/account/AuthNavStatus", () => ({
  AuthNavStatus: () => <a href="/sign-in">Sign in</a>
}));

vi.mock("@/features/account/useSupabaseAccount", () => ({
  useSupabaseAccount: () => ({
    configured: true,
    loading: false,
    user: null
  })
}));

describe("RootLayout", () => {
  it("renders the launch footer copy", () => {
    const markup = renderToStaticMarkup(
      <RootLayout>
        <div>Page body</div>
      </RootLayout>
    );

    expect(markup).toContain("Can You Geo? is a geography game library.");
    expect(markup).toContain("Open the game hub and check the data sources any time.");
    expect(markup).toContain("cgy-logo-header-96.png");
    expect(markup).toContain("class=\"footer-copy\"");
    expect(markup).toContain("class=\"footer-nav-row\"");
    expect(markup).toContain("class=\"footer-utility-row\"");
    expect(markup).toContain("class=\"footer-account-area\"");
    expect(markup).toContain("aria-label=\"Footer account\"");
    expect(markup).toContain("<div class=\"footer-account-area\" aria-label=\"Footer account\"><a href=\"/sign-in\">Sign in</a></div>");
    expect(markup).toContain("href=\"/play\"");
    expect(markup).not.toContain("href=\"/past-games\"");
    expect(markup).toContain("href=\"/support\"");
    expect(markup).toContain("Follow Can You Geo on TikTok");
    expect(markup).toContain("href=\"https://www.tiktok.com/@canyougeo\"");
    expect(markup).toContain("Follow Can You Geo on Instagram");
    expect(markup).toContain("href=\"https://www.instagram.com/canyougeo\"");
    expect(markup).toContain("Follow Can You Geo on Facebook");
    expect(markup).toContain("href=\"https://www.facebook.com/canyougeo\"");
    expect(markup).not.toContain("href=\"/about\"");
    expect(markup).toContain("id=\"canyougeo-site-jsonld\"");
    expect(markup).toContain("\"@type\":\"Organization\"");
    expect(markup).toContain("\"@type\":\"WebSite\"");
    expect(markup).not.toContain("VideoGame");
    expect(markup).not.toContain("FAQPage");
    expect(markup).not.toContain("aggregateRating");
  });

  it("uses the final Can You Geo icon assets", () => {
    const icons = JSON.stringify(metadata.icons);

    expect(icons).toContain("/favicon.ico");
    expect(icons).toContain("/favicon-32x32.png");
    expect(icons).toContain("/favicon-16x16.png");
    expect(icons).toContain("/apple-touch-icon.png");
    expect(icons).toContain("/cgy-logo-icon-192.png");
    expect(icons).toContain("/cgy-logo-icon-512.png");
    expect(icons).not.toContain("/favicon.svg");
  });
});
