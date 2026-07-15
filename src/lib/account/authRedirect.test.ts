import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { authEmailCallbackUrl, validateNativeHostedAuthOrigin } from "@/lib/account/authRedirect";
import { parseNativeDeepLinkUrl } from "@/lib/mobile/nativeDeepLink";

describe("validateNativeHostedAuthOrigin", () => {
  it("accepts the production apex HTTPS origin", () => {
    expect(validateNativeHostedAuthOrigin("https://canyougeo.com")).toEqual({
      ok: true,
      origin: "https://canyougeo.com"
    });
  });

  it("rejects missing and malformed origins without exposing the supplied value", () => {
    expect(validateNativeHostedAuthOrigin("")).toEqual({ ok: false, issue: "missing-origin" });
    expect(validateNativeHostedAuthOrigin(" https://canyougeo.com ")).toEqual({ ok: false, issue: "invalid-url" });
    expect(validateNativeHostedAuthOrigin("not a url")).toEqual({ ok: false, issue: "invalid-url" });
  });

  it("rejects unsafe or non-production origins under production defaults", () => {
    expect(validateNativeHostedAuthOrigin("http://canyougeo.com")).toEqual({ ok: false, issue: "unsupported-scheme" });
    expect(validateNativeHostedAuthOrigin("https://www.canyougeo.com")).toEqual({ ok: false, issue: "untrusted-origin" });
    expect(validateNativeHostedAuthOrigin("https://test.canyougeo.com")).toEqual({ ok: false, issue: "untrusted-origin" });
    expect(validateNativeHostedAuthOrigin("https://localhost:3000")).toEqual({ ok: false, issue: "untrusted-origin" });
    expect(validateNativeHostedAuthOrigin("capacitor://localhost")).toEqual({ ok: false, issue: "unsupported-scheme" });
  });

  it("rejects credentials, non-default ports, paths, query strings, and fragments", () => {
    expect(validateNativeHostedAuthOrigin("https://player:secret@canyougeo.com")).toEqual({
      ok: false,
      issue: "credentials-not-allowed"
    });
    expect(validateNativeHostedAuthOrigin("https://canyougeo.com:444")).toEqual({ ok: false, issue: "untrusted-origin" });
    expect(validateNativeHostedAuthOrigin("https://canyougeo.com/auth/callback")).toEqual({ ok: false, issue: "path-not-allowed" });
    expect(validateNativeHostedAuthOrigin("https://canyougeo.com?next=/account")).toEqual({ ok: false, issue: "query-not-allowed" });
    expect(validateNativeHostedAuthOrigin("https://canyougeo.com#auth")).toEqual({ ok: false, issue: "fragment-not-allowed" });
  });

  it("supports an explicit future staging allowlist without changing production defaults", () => {
    expect(validateNativeHostedAuthOrigin("https://test.canyougeo.com")).toEqual({ ok: false, issue: "untrusted-origin" });
    expect(
      validateNativeHostedAuthOrigin("https://test.canyougeo.com", {
        allowedOrigins: ["https://test.canyougeo.com"]
      })
    ).toEqual({
      ok: true,
      origin: "https://test.canyougeo.com"
    });
  });

  it("does not log raw invalid origins", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(validateNativeHostedAuthOrigin("https://secret.example.com")).toEqual({ ok: false, issue: "untrusted-origin" });

    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });
});

describe("authEmailCallbackUrl", () => {
  it("preserves web browser origin behavior", () => {
    expect(authEmailCallbackUrl(undefined, { browserOrigin: "https://branch-preview.pages.dev" })).toEqual({
      ok: true,
      mode: "web",
      url: "https://branch-preview.pages.dev/auth/callback"
    });
  });

  it("preserves local browser origins for web development", () => {
    expect(authEmailCallbackUrl(undefined, { browserOrigin: "http://localhost:3000" })).toEqual({
      ok: true,
      mode: "web",
      url: "http://localhost:3000/auth/callback"
    });
  });

  it("does not force canyougeo.com for ordinary web builds", () => {
    expect(
      authEmailCallbackUrl(undefined, {
        browserOrigin: null,
        configuredSiteOrigin: "https://test.canyougeo.com"
      })
    ).toEqual({
      ok: true,
      mode: "web",
      url: "https://test.canyougeo.com/auth/callback"
    });
  });

  it("uses the hosted production callback and ignores local WebView origins for native builds", () => {
    expect(
      authEmailCallbackUrl(undefined, {
        nativeApp: true,
        browserOrigin: "https://localhost",
        nativeHostedOrigin: "https://canyougeo.com"
      })
    ).toEqual({
      ok: true,
      mode: "native",
      url: "https://canyougeo.com/auth/callback"
    });
  });

  it("fails closed when native hosted origin configuration is missing or invalid", () => {
    expect(authEmailCallbackUrl(undefined, { nativeApp: true, nativeHostedOrigin: undefined })).toEqual({
      ok: false,
      issue: "missing-origin"
    });
    expect(authEmailCallbackUrl(undefined, { nativeApp: true, nativeHostedOrigin: "https://localhost" })).toEqual({
      ok: false,
      issue: "untrusted-origin"
    });
  });

  it("generates callbacks accepted by the strict native deep-link parser", () => {
    const callback = authEmailCallbackUrl(undefined, {
      nativeApp: true,
      nativeHostedOrigin: "https://canyougeo.com"
    });
    expect(callback).toMatchObject({ ok: true, url: "https://canyougeo.com/auth/callback" });
    if (!callback.ok) throw new Error("expected callback");

    expect(parseNativeDeepLinkUrl(`${callback.url}?token_hash=secret-token&type=signup`)).toMatchObject({
      accepted: true,
      category: "auth",
      navigation: "replace"
    });
    expect(parseNativeDeepLinkUrl(`${callback.url}?code=auth-code`)).toMatchObject({
      accepted: true,
      category: "auth",
      navigation: "replace"
    });
    expect(parseNativeDeepLinkUrl(`${callback.url}#token_hash=secret-token&type=recovery`)).toMatchObject({
      accepted: true,
      category: "auth",
      navigation: "replace"
    });
  });

  it("uses direct NEXT_PUBLIC env access for client compile-time substitution", () => {
    const source = readFileSync(join(process.cwd(), "src/lib/account/authRedirect.ts"), "utf8");

    expect(source).toContain("process.env.NEXT_PUBLIC_CGY_NATIVE_HOSTED_ORIGIN");
    expect(source).toContain("process.env.NEXT_PUBLIC_CGY_NATIVE_APP");
    expect(source).not.toContain("const env = process.env");
    expect(source).not.toContain("process.env[");
  });
});
