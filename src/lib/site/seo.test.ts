import { describe, expect, it } from "vitest";
import {
  breadcrumbJsonLd,
  canonicalPath,
  canonicalUrl,
  NON_INDEXED_ROUTE_PREFIXES,
  organizationJsonLd,
  pageMetadata,
  PUBLIC_INDEXED_ROUTES,
  siteJsonLd,
  webApplicationJsonLd,
  websiteJsonLd
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

  it("describes Can You Geo with lean organization and website schema", () => {
    const graph = siteJsonLd("https://canyougeo.com")["@graph"];
    expect(graph.map((entry) => entry["@type"])).toEqual(["Organization", "WebSite"]);
    expect(graph[0]).toMatchObject({
      logo: "https://canyougeo.com/cgy-logo-icon-512.png"
    });
    expect(graph[1]).toMatchObject({
      alternateName: "Can You Geo",
      publisher: { "@id": "https://canyougeo.com/#organization" }
    });
    expect(JSON.stringify(graph)).not.toMatch(/VideoGame|FAQPage|Product|Offer|aggregateRating|review/i);
  });

  it("emits separate reusable JSON-LD helpers for organization, website, web app, and breadcrumbs", () => {
    expect(organizationJsonLd("https://canyougeo.com")).toMatchObject({
      "@type": "Organization",
      "@id": "https://canyougeo.com/#organization",
      url: "https://canyougeo.com"
    });
    expect(websiteJsonLd("https://canyougeo.com")).toMatchObject({
      "@type": "WebSite",
      "@id": "https://canyougeo.com/#website",
      publisher: { "@id": "https://canyougeo.com/#organization" }
    });
    expect(webApplicationJsonLd("https://canyougeo.com")).toMatchObject({
      "@type": "WebApplication",
      "@id": "https://canyougeo.com/#web-application",
      url: "https://canyougeo.com/play/",
      applicationCategory: "GameApplication",
      operatingSystem: "Web",
      isAccessibleForFree: true
    });
    expect(
      breadcrumbJsonLd([
        { name: "Can You Geo?", path: "/" },
        { name: "Mystery Map", path: "/play/mystery-map/" }
      ], "https://canyougeo.com")
    ).toMatchObject({
      "@type": "BreadcrumbList",
      itemListElement: [
        { position: 1, name: "Can You Geo?", item: "https://canyougeo.com/" },
        { position: 2, name: "Mystery Map", item: "https://canyougeo.com/play/mystery-map/" }
      ]
    });
  });
});
