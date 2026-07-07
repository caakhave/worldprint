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
    expect(markup).toContain("href=\"/play\"");
    expect(markup).not.toContain("href=\"/past-games\"");
    expect(markup).toContain("href=\"/support\"");
    expect(markup).not.toContain("href=\"/about\"");
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
