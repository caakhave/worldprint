import { describe, expect, test } from "vitest";
import { resolveSiteOrigin } from "@/lib/supabase/env";

describe("resolveSiteOrigin", () => {
  test("uses the active browser origin before configured production origin", () => {
    expect(resolveSiteOrigin("https://branch-preview.pages.dev", "https://canyougeo.com")).toBe("https://branch-preview.pages.dev");
  });

  test("uses the configured site origin outside the browser", () => {
    expect(resolveSiteOrigin(null, "https://canyougeo.com")).toBe("https://canyougeo.com");
  });

  test("falls back to localhost when no origin is configured", () => {
    expect(resolveSiteOrigin(null, undefined)).toBe("http://localhost:3000");
  });
});
