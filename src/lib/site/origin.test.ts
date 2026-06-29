import { describe, expect, it } from "vitest";
import { normalizeSiteOrigin, publicSiteOrigin, robotsForSite, shouldNoIndexSite } from "@/lib/site/origin";

describe("site origin configuration", () => {
  it("normalizes clean site origins and rejects path-bearing values", () => {
    expect(normalizeSiteOrigin("https://test.canyougeo.com")).toBe("https://test.canyougeo.com");
    expect(normalizeSiteOrigin("https://canyougeo.com/")).toBe("https://canyougeo.com");
    expect(normalizeSiteOrigin("https://canyougeo.com/account")).toBe("https://canyougeo.com");
  });

  it("uses the public site URL for build-time metadata and share fallbacks", () => {
    expect(publicSiteOrigin("https://test.canyougeo.com")).toBe("https://test.canyougeo.com");
    expect(publicSiteOrigin(undefined, "https://branch.canyougeo.pages.dev")).toBe("https://branch.canyougeo.pages.dev");
    expect(publicSiteOrigin(undefined)).toBe("https://canyougeo.com");
  });

  it("keeps staging and preview hosts noindexed even without an explicit flag", () => {
    expect(shouldNoIndexSite("https://test.canyougeo.com", undefined)).toBe(true);
    expect(shouldNoIndexSite("https://branch.canyougeo.pages.dev", undefined)).toBe(true);
    expect(shouldNoIndexSite(undefined, undefined, "staging", "https://branch.canyougeo.pages.dev")).toBe(true);
    expect(shouldNoIndexSite("http://localhost:3000", undefined)).toBe(true);
  });

  it("lets production opt into indexing and supports explicit production noindex", () => {
    expect(shouldNoIndexSite("https://canyougeo.com", undefined)).toBe(false);
    expect(shouldNoIndexSite("https://canyougeo.com", "false")).toBe(false);
    expect(shouldNoIndexSite("https://canyougeo.com", "true")).toBe(true);
    expect(robotsForSite(true)).toMatchObject({ index: false, follow: false });
    expect(robotsForSite(false)).toMatchObject({ index: true, follow: true });
  });
});
