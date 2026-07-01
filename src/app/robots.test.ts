import { afterEach, describe, expect, it } from "vitest";
import robots from "@/app/robots";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("robots metadata route", () => {
  it("disallows staging and test origins", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://test.canyougeo.com";
    process.env.NEXT_PUBLIC_NO_INDEX = "";
    process.env.CF_PAGES_BRANCH = "";

    expect(robots()).toEqual({
      rules: {
        userAgent: "*",
        disallow: "/"
      }
    });
  });

  it("allows production public pages but blocks account and auth surfaces", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://canyougeo.com";
    process.env.NEXT_PUBLIC_NO_INDEX = "";
    process.env.CF_PAGES_BRANCH = "main";

    const result = robots();
    expect(result.sitemap).toBe("https://canyougeo.com/sitemap.xml");
    expect(result.rules).toMatchObject({
      userAgent: "*",
      allow: "/"
    });
    expect(result.rules).toHaveProperty("disallow");
    expect(JSON.stringify(result.rules)).toContain("/account/");
    expect(JSON.stringify(result.rules)).toContain("/challenge/");
  });
});
