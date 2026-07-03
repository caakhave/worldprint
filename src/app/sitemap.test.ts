import { afterEach, describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("sitemap metadata route", () => {
  it("emits no sitemap entries for noindexed staging builds", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://test.canyougeo.com";
    process.env.CF_PAGES_BRANCH = "staging";
    expect(sitemap()).toEqual([]);
  });

  it("emits production canonical public routes only", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://canyougeo.com";
    process.env.CF_PAGES_BRANCH = "main";
    process.env.NEXT_PUBLIC_NO_INDEX = "";

    const urls = sitemap().map((entry) => entry.url);
    expect(urls).toContain("https://canyougeo.com/");
    expect(urls).toContain("https://canyougeo.com/play/");
    expect(urls).toContain("https://canyougeo.com/play/mystery-map/");
    expect(urls).toContain("https://canyougeo.com/play/pattern-atlas/");
    expect(urls).toContain("https://canyougeo.com/how-to-play/");
    expect(urls).toContain("https://canyougeo.com/sources/");
    expect(urls).toContain("https://canyougeo.com/about/");
    expect(urls).not.toContain("https://canyougeo.com/account/");
    expect(urls).not.toContain("https://canyougeo.com/sign-in/");
  });
});
