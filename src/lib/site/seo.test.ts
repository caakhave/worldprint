import { describe, expect, it } from "vitest";
import {
  canonicalPath,
  canonicalUrl,
  homeFaqJsonLd,
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
    expect(indexedPaths).toContain("/sources/");
    expect(indexedPaths).not.toContain("/sign-in/");
    expect(indexedPaths).not.toContain("/account/");
    expect(NON_INDEXED_ROUTE_PREFIXES).toContain("/challenge/");
  });

  it("adds noindex robots only when a route asks for it", () => {
    const indexed = pageMetadata({ title: "Sources", description: "Data sources.", path: "/sources/" });
    const noindexed = pageMetadata({ title: "Account", description: "Account.", path: "/account/", noIndex: true });
    expect(indexed).not.toHaveProperty("robots");
    expect(noindexed.robots).toMatchObject({ index: false, follow: false });
  });

  it("describes Can You Geo as a website, app, organization, and game", () => {
    const graph = siteJsonLd("https://canyougeo.com")["@graph"];
    expect(graph.map((entry) => entry["@type"])).toEqual(["Organization", "WebSite", "WebApplication", "VideoGame"]);
    expect(graph[3]).toMatchObject({
      name: "Can You Geo? Mystery Map",
      gamePlatform: "Web browser",
      isAccessibleForFree: true
    });
  });

  it("only emits FAQ structured data for the visible homepage quick answers", () => {
    const faq = homeFaqJsonLd("https://canyougeo.com");
    expect(faq["@type"]).toBe("FAQPage");
    expect(faq.mainEntity.map((item) => item.name)).toContain("What is Can You Geo?");
    expect(faq.mainEntity.map((item) => item.name)).toContain("Is Can You Geo free?");
  });
});
