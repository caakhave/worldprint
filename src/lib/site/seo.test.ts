import { describe, expect, it } from "vitest";
import {
  canonicalPath,
  canonicalUrl,
  homeFaqJsonLd,
  HOME_FAQ_ITEMS,
  NON_INDEXED_ROUTE_PREFIXES,
  pageMetadata,
  PUBLIC_INDEXED_ROUTES,
  siteJsonLd
} from "@/lib/site/seo";

describe("site SEO helpers", () => {
  it("keeps canonical paths trailing-slash compatible", () => {
    expect(canonicalPath("/")).toBe("/");
    expect(canonicalPath("play/mystery-map")).toBe("/play/mystery-map/");
    expect(canonicalUrl("/sources", "https://canyougeo.com")).toBe("https://canyougeo.com/sources/");
  });

  it("keeps public sitemap routes focused on indexable public pages", () => {
    const indexedPaths = PUBLIC_INDEXED_ROUTES.map((route) => route.path);
    expect(indexedPaths).toContain("/");
    expect(indexedPaths).toContain("/play/mystery-map/");
    expect(indexedPaths).toContain("/play/pattern-atlas/");
    expect(indexedPaths).toContain("/play/order-atlas/");
    expect(indexedPaths).toContain("/sources/");
    expect(indexedPaths).not.toContain("/internal/order-atlas-review/");
    expect(indexedPaths).not.toContain("/sign-in/");
    expect(indexedPaths).not.toContain("/account/");
    expect(NON_INDEXED_ROUTE_PREFIXES).toContain("/internal/");
    expect(NON_INDEXED_ROUTE_PREFIXES).toContain("/challenge/");
  });

  it("adds noindex robots only when a route asks for it", () => {
    const indexed = pageMetadata({ title: "Sources", description: "Data sources.", path: "/sources/" });
    const noindexed = pageMetadata({ title: "Account", description: "Account.", path: "/account/", noIndex: true });
    expect(indexed).not.toHaveProperty("robots");
    expect(noindexed.robots).toMatchObject({ index: false, follow: false });
  });

  it("describes Can You Geo as a website, app, organization, and three public games", () => {
    const graph = siteJsonLd("https://canyougeo.com")["@graph"];
    expect(graph.map((entry) => entry["@type"])).toEqual(["Organization", "WebSite", "WebApplication", "VideoGame", "VideoGame", "VideoGame"]);
    expect(graph[1]).toMatchObject({
      alternateName: ["Can You Geo", "Mystery Map", "Pattern Atlas", "Order Atlas"]
    });
    expect(graph[3]).toMatchObject({
      name: "Can You Geo? Mystery Map",
      gamePlatform: "Web browser",
      isAccessibleForFree: true
    });
    expect(graph[4]).toMatchObject({
      name: "Can You Geo? Pattern Atlas",
      url: "https://canyougeo.com/play/pattern-atlas/"
    });
    expect(graph[5]).toMatchObject({
      name: "Can You Geo? Order Atlas",
      url: "https://canyougeo.com/play/order-atlas/",
      description: expect.stringContaining("Sample Run, Free Daily, and Pro Practice")
    });
  });

  it("only emits FAQ structured data for the visible homepage quick answers", () => {
    const faq = homeFaqJsonLd("https://canyougeo.com");
    expect(faq["@type"]).toBe("FAQPage");
    expect(faq.mainEntity.map((item) => item.name)).toEqual(HOME_FAQ_ITEMS.map((item) => item.name));
    expect(faq.mainEntity[0].acceptedAnswer.text).toContain("geography game site");
    expect(faq.mainEntity[0].acceptedAnswer.text).toContain("Mystery Map, Pattern Atlas, and Order Atlas have Sample and Daily play");
    expect(faq.mainEntity[0].acceptedAnswer.text).toContain("Pro adds supported practice modes");
    expect(faq.mainEntity[2].acceptedAnswer.text).toContain("current featured game");
    expect(faq.mainEntity[3].acceptedAnswer.text).toContain("Order Atlas is the country-ordering game with Sample Run, Free Daily, and Pro Practice");
    expect(faq.mainEntity[4].acceptedAnswer.text).toContain("Order Atlas reuses approved Mystery Map indicator artifacts");
    expect(JSON.stringify(faq)).not.toMatch(/intro-only|Daily and Pro modes coming next|playable intro sample/i);
  });
});
