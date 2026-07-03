import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import RootLayout from "@/app/layout";

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

describe("RootLayout", () => {
  it("renders the launch footer copy", () => {
    const markup = renderToStaticMarkup(
      <RootLayout>
        <div>Page body</div>
      </RootLayout>
    );

    expect(markup).toContain("Can You Geo? is a geography game library.");
    expect(markup).toContain("Open the game hub, replay Mystery Map Past Games, and check the data sources");
    expect(markup).toContain("href=\"/play\"");
    expect(markup).toContain("href=\"/support\"");
    expect(markup).not.toContain("href=\"/about\"");
  });
});
