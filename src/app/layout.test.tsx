import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import RootLayout, { metadata, viewport } from "@/app/layout";

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

vi.mock("@/components/NativeDeepLinkBridge", () => ({
  NativeDeepLinkBridge: () => null
}));

vi.mock("@/features/account/AuthNavStatus", () => ({
  AuthNavStatus: () => (
    <div className="account-nav-signed-out-actions">
      <a href="/upgrade">Start Pro</a>
      <a href="/sign-in">Sign in</a>
    </div>
  )
}));

vi.mock("@/features/account/useSupabaseAccount", () => ({
  useSupabaseAccount: () => ({
    configured: true,
    loading: false,
    user: null
  })
}));

describe("RootLayout", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

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
    expect(markup).toContain("<div class=\"footer-account-area\" aria-label=\"Footer account\"><div class=\"account-nav-signed-out-actions\">");
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

  it("keeps ordinary web builds free of the native app shell marker", () => {
    const markup = renderToStaticMarkup(
      <RootLayout>
        <div>Page body</div>
      </RootLayout>
    );

    expect(markup).toContain("class=\"mock-font mock-font mock-font\"");
    expect(markup).not.toContain("cgy-native-app");
    expect(markup).not.toContain("data-native-app");
  });

  it("keeps the normal header structure and account actions available", () => {
    const markup = renderToStaticMarkup(
      <RootLayout>
        <div>Page body</div>
      </RootLayout>
    );

    expect(markup).toContain("<header class=\"site-header\">");
    expect(markup).toContain("class=\"brand-link\"");
    expect(markup).toContain("class=\"site-nav\"");
    expect(markup).toContain("Play");
    expect(markup).toContain("How it works");
    expect(markup).toContain("href=\"/upgrade\"");
    expect(markup).toContain("Start Pro");
    expect(markup).toContain("href=\"/sign-in\"");
    expect(markup).toContain("Sign in");
  });

  it("keeps ordinary web viewport behavior without native viewport-fit", () => {
    expect(viewport).toMatchObject({
      width: "device-width",
      initialScale: 1,
      colorScheme: "dark",
      themeColor: "#08181D"
    });
    expect(viewport).not.toHaveProperty("viewportFit");
  });

  it("marks native app builds and enables viewport-fit=cover", async () => {
    vi.stubEnv("NEXT_PUBLIC_CGY_NATIVE_APP", "1");
    vi.resetModules();
    const { default: NativeRootLayout, viewport: nativeViewport } = await import("@/app/layout");

    const markup = renderToStaticMarkup(
      <NativeRootLayout>
        <div>Page body</div>
      </NativeRootLayout>
    );

    expect(markup).toContain("cgy-native-app");
    expect(markup).toContain("data-native-app=\"true\"");
    expect(nativeViewport).toMatchObject({
      width: "device-width",
      initialScale: 1,
      viewportFit: "cover"
    });
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
