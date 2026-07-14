import { describe, expect, it } from "vitest";
import { encodeChallenge } from "@/lib/game/challenge";
import {
  nativeDeepLinkDedupeKey,
  parseNativeDeepLinkUrl,
  type NativeDeepLinkRejectedReason,
  type NativeDeepLinkResult
} from "@/lib/mobile/nativeDeepLink";

function validChallengeCode() {
  return encodeChallenge({
    kind: "daily",
    contentVersion: "test-content",
    tier: "explorer",
    roundIds: ["round-one"],
    dateKey: "2026-07-14"
  });
}

function expectAccepted(url: string, destination: string, options: Partial<Extract<NativeDeepLinkResult, { accepted: true }>> = {}) {
  expect(parseNativeDeepLinkUrl(url)).toEqual({
    accepted: true,
    destination,
    navigation: options.navigation ?? "push",
    category: options.category ?? "public"
  });
}

function expectRejected(url: string, reason: NativeDeepLinkRejectedReason) {
  const result = parseNativeDeepLinkUrl(url);
  expect(result).toEqual({ accepted: false, reason });
  expect(JSON.stringify(result)).not.toMatch(/secret-token|auth-code|challenge-secret|evil\.example|player@example\.com/);
}

describe("parseNativeDeepLinkUrl", () => {
  it("accepts current production public routes with normalized trailing slashes", () => {
    expectAccepted("https://canyougeo.com", "/");
    expectAccepted("https://canyougeo.com/play", "/play/");
    expectAccepted("https://canyougeo.com/play/mystery-map", "/play/mystery-map/");
    expectAccepted("https://canyougeo.com/play/pattern-atlas/", "/play/pattern-atlas/");
    expectAccepted("https://canyougeo.com/play/order-atlas/", "/play/order-atlas/");
    expectAccepted("https://canyougeo.com/about/", "/about/");
    expectAccepted("https://canyougeo.com/how-to-play/", "/how-to-play/");
    expectAccepted("https://canyougeo.com/sources/", "/sources/");
    expectAccepted("https://canyougeo.com/past-games/", "/past-games/");
    expectAccepted("https://canyougeo.com/support/", "/support/");
    expectAccepted("https://canyougeo.com/legal/", "/legal/");
    expectAccepted("https://canyougeo.com/privacy/", "/privacy/");
    expectAccepted("https://canyougeo.com/terms/", "/terms/");
    expectAccepted("https://canyougeo.com/map-quiz/", "/map-quiz/");
    expectAccepted("https://canyougeo.com/country-guessing-game/", "/country-guessing-game/");
    expectAccepted("https://canyougeo.com/daily-geography-game/", "/daily-geography-game/");
    expectAccepted("https://canyougeo.com/choropleth-map-game/", "/choropleth-map-game/");
  });

  it("accepts dated Mystery Map routes and supported game fragments", () => {
    expectAccepted("https://canyougeo.com/play/mystery-map/2026-07-14/", "/play/mystery-map/2026-07-14/");
    expectAccepted(
      "https://canyougeo.com/play/mystery-map/2026-07-14/?review=1#past-game-result",
      "/play/mystery-map/2026-07-14/?review=1#past-game-result"
    );
    expectAccepted("https://canyougeo.com/play/mystery-map/#practice-atlas", "/play/mystery-map/#practice-atlas");
    expectAccepted("https://canyougeo.com/account/stats/#saved-stats", "/account/stats/#saved-stats", { category: "auth" });
  });

  it("accepts valid challenge and upgrade links", () => {
    const code = validChallengeCode();
    expectAccepted(`https://canyougeo.com/challenge/mystery-map/?c=${code}`, `/challenge/mystery-map/?c=${code}`, {
      category: "challenge"
    });
    expectAccepted("https://canyougeo.com/upgrade/?plan=monthly", "/upgrade/?plan=monthly");
    expectAccepted("https://canyougeo.com/upgrade/?plan=yearly", "/upgrade/?plan=yearly");
  });

  it("accepts auth entry routes with sanitized return values", () => {
    expectAccepted("https://canyougeo.com/sign-in/", "/sign-in/", { category: "auth" });
    expectAccepted("https://canyougeo.com/sign-in/?signedOut=1", "/sign-in/?signedOut=1", { category: "auth" });
    expectAccepted("https://canyougeo.com/sign-in/?next=%2Fupgrade%3Fplan%3Dyearly", "/sign-in/?next=%2Fupgrade%3Fplan%3Dyearly", {
      category: "auth"
    });
    expectAccepted("https://canyougeo.com/sign-up/", "/sign-up/", {
      category: "auth"
    });
    expectAccepted("https://canyougeo.com/sign-up/?next=%2Faccount%2Fstats", "/sign-up/?next=%2Faccount%2Fstats", {
      category: "auth"
    });
    expectAccepted("https://canyougeo.com/forgot-password/", "/forgot-password/", { category: "auth" });
    expectAccepted("https://canyougeo.com/reset-password/", "/reset-password/", { category: "auth" });
    expectAccepted("https://canyougeo.com/account/", "/account/", { category: "auth" });
  });

  it("accepts supported Supabase callback formats with replace navigation", () => {
    expectAccepted("https://canyougeo.com/auth/callback/?token_hash=secret-token&type=signup", "/auth/callback/?token_hash=secret-token&type=signup", {
      category: "auth",
      navigation: "replace"
    });
    expectAccepted("https://canyougeo.com/auth/callback/?code=auth-code", "/auth/callback/?code=auth-code", {
      category: "auth",
      navigation: "replace"
    });
    expectAccepted("https://canyougeo.com/auth/callback/#token_hash=secret-token&type=recovery", "/auth/callback/#token_hash=secret-token&type=recovery", {
      category: "auth",
      navigation: "replace"
    });
    expectAccepted(
      "https://canyougeo.com/auth/callback/#access_token=secret-token&refresh_token=auth-code&expires_in=3600&token_type=bearer",
      "/auth/callback/#access_token=secret-token&refresh_token=auth-code&expires_in=3600&token_type=bearer",
      { category: "auth", navigation: "replace" }
    );
  });

  it("normalizes only approved legacy public routes", () => {
    const code = validChallengeCode();
    expectAccepted("https://canyougeo.com/play/worldprint/", "/play/mystery-map/");
    expectAccepted("https://canyougeo.com/play/worldprint/2026-07-14/?review=1#past-game-result", "/play/mystery-map/2026-07-14/?review=1#past-game-result");
    expectAccepted(`https://canyougeo.com/challenge/worldprint/?c=${code}`, `/challenge/mystery-map/?c=${code}`, {
      category: "challenge"
    });
    expectAccepted("https://canyougeo.com/archive/worldprint/", "/past-games/");
    expectAccepted("https://canyougeo.com/beta/worldprint/", "/play/mystery-map/");
  });

  it("rejects untrusted origins, unsafe schemes, credentials, ports, and protocol-relative input", () => {
    expectRejected("https://evil.example/play", "untrusted-origin");
    expectRejected("https://www.canyougeo.com/play", "untrusted-origin");
    expectRejected("https://test.canyougeo.com/play", "untrusted-origin");
    expectRejected("http://canyougeo.com/play", "unsupported-scheme");
    expectRejected("https://localhost/play", "untrusted-origin");
    expectRejected("https://player@example.com@canyougeo.com/play", "credentials-not-allowed");
    expectRejected("https://canyougeo.com:444/play", "untrusted-origin");
    expectRejected("javascript:alert(1)", "unsupported-scheme");
    expectRejected("data:text/html,hello", "unsupported-scheme");
    expectRejected("file:///tmp/index.html", "unsupported-scheme");
    expectRejected("blob:https://canyougeo.com/id", "unsupported-scheme");
    expectRejected("intent://play#Intent;scheme=https;end", "unsupported-scheme");
    expectRejected("//canyougeo.com/play", "unsupported-scheme");
  });

  it("rejects internal, build, asset, unknown, malformed, and traversal paths", () => {
    expectRejected("https://canyougeo.com/internal/worldprint-review/", "path-not-allowed");
    expectRejected("https://canyougeo.com/_next/static/app.js", "path-not-allowed");
    expectRejected("https://canyougeo.com/favicon.ico", "path-not-allowed");
    expectRejected("https://canyougeo.com/404/", "path-not-allowed");
    expectRejected("https://canyougeo.com/_not-found/", "path-not-allowed");
    expectRejected("https://canyougeo.com/unknown-route/", "path-not-allowed");
    expectRejected("https://canyougeo.com/play/mystery-map/not-a-date/", "path-not-allowed");
    expectRejected("https://canyougeo.com/play/mystery-map/2026-02-31/", "path-not-allowed");
    expectRejected("https://canyougeo.com/play/../account/", "path-not-allowed");
    expectRejected("https://canyougeo.com/play/%2e%2e/account/", "path-not-allowed");
    expectRejected("https://canyougeo.com/play/%E0%A4%A", "invalid-url");
    expectRejected(`https://canyougeo.com/play/?padding=${"x".repeat(9000)}`, "too-long");
  });

  it("rejects unsupported query parameters and fragments", () => {
    expectRejected("https://canyougeo.com/challenge/mystery-map/", "query-not-allowed");
    expectRejected("https://canyougeo.com/challenge/mystery-map/?c=not-a-real-challenge", "query-not-allowed");
    expectRejected(`https://canyougeo.com/challenge/mystery-map/?c=${"x".repeat(3601)}`, "query-not-allowed");
    expectRejected("https://canyougeo.com/upgrade/?plan=price_123", "query-not-allowed");
    expectRejected("https://canyougeo.com/upgrade/?plan=monthly&utm_source=tiktok", "query-not-allowed");
    expectRejected("https://canyougeo.com/sign-in/?next=https%3A%2F%2Fevil.example%2Faccount", "query-not-allowed");
    expectRejected("https://canyougeo.com/sign-up/?next=%2Fplay%2Fmystery-map", "query-not-allowed");
    expectRejected("https://canyougeo.com/auth/callback/?token_hash=secret-token&type=unknown", "query-not-allowed");
    expectRejected("https://canyougeo.com/auth/callback/?token_hash=secret-token&type=signup&redirect=https%3A%2F%2Fevil.example", "query-not-allowed");
    expectRejected("https://canyougeo.com/play/#random", "fragment-not-allowed");
    expectRejected("https://canyougeo.com/account/stats/#random", "fragment-not-allowed");
  });

  it("supports an explicit future allowed origin without changing production defaults", () => {
    expect(parseNativeDeepLinkUrl("https://test.canyougeo.com/play/", { allowedOrigins: ["https://test.canyougeo.com"] })).toEqual({
      accepted: true,
      destination: "/play/",
      navigation: "push",
      category: "public"
    });
    expectRejected("https://test.canyougeo.com/play/", "untrusted-origin");
  });

  it("uses non-raw dedupe keys for sensitive accepted destinations", () => {
    const result = parseNativeDeepLinkUrl("https://canyougeo.com/auth/callback/?token_hash=secret-token&type=signup");
    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    expect(nativeDeepLinkDedupeKey(result)).not.toContain("secret-token");
  });
});
