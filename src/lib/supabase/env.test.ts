import { describe, expect, test } from "vitest";
import { normalizeSupabaseProjectUrl, resolveSiteOrigin } from "@/lib/supabase/env";

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

describe("normalizeSupabaseProjectUrl", () => {
  test("keeps a root Supabase project URL", () => {
    expect(normalizeSupabaseProjectUrl("https://jquebthneczqdxagagof.supabase.co")).toEqual({
      ok: true,
      url: "https://jquebthneczqdxagagof.supabase.co",
      changed: false,
      removedPath: null
    });
  });

  test("normalizes accidental Supabase REST and Auth endpoint URLs to the project root", () => {
    expect(normalizeSupabaseProjectUrl("https://jquebthneczqdxagagof.supabase.co/rest/v1/")).toEqual({
      ok: true,
      url: "https://jquebthneczqdxagagof.supabase.co",
      changed: true,
      removedPath: "/rest/v1"
    });
    expect(normalizeSupabaseProjectUrl("https://jquebthneczqdxagagof.supabase.co/auth/v1")).toEqual({
      ok: true,
      url: "https://jquebthneczqdxagagof.supabase.co",
      changed: true,
      removedPath: "/auth/v1"
    });
  });

  test("rejects non-root Supabase URLs that are not known service endpoints", () => {
    expect(normalizeSupabaseProjectUrl("https://jquebthneczqdxagagof.supabase.co/project/settings")).toMatchObject({
      ok: false,
      issue: "unexpected-path"
    });
  });
});
