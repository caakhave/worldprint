import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const headers = readFileSync("public/_headers", "utf8");
const cspLine = headers
  .split("\n")
  .find((line) => line.trim().startsWith("Content-Security-Policy:"));

function directive(name: string): string[] {
  if (!cspLine) return [];
  const csp = cspLine.replace(/^\s*Content-Security-Policy:\s*/, "");
  const match = csp
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name} `));
  return match ? match.split(/\s+/).slice(1) : [];
}

describe("static security headers", () => {
  it("allows only the GTM/GA/Reddit/Meta origins needed by launch analytics", () => {
    expect(directive("script-src")).toEqual(
      expect.arrayContaining([
        "'self'",
        "'unsafe-inline'",
        "https://static.cloudflareinsights.com",
        "https://www.googletagmanager.com",
        "https://www.redditstatic.com",
        "https://connect.facebook.net"
      ])
    );
    expect(directive("connect-src")).toEqual(
      expect.arrayContaining([
        "'self'",
        "https://*.supabase.co",
        "wss://*.supabase.co",
        "https://www.google-analytics.com",
        "https://region1.google-analytics.com",
        "https://www.google.com",
        "https://alb.reddit.com",
        "https://www.facebook.com"
      ])
    );
    expect(directive("img-src")).toEqual(
      expect.arrayContaining([
        "'self'",
        "data:",
        "blob:",
        "https://www.google-analytics.com",
        "https://www.googletagmanager.com",
        "https://www.redditstatic.com",
        "https://alb.reddit.com",
        "https://www.facebook.com"
      ])
    );
    expect(directive("frame-src")).toEqual(["https://www.googletagmanager.com"]);
  });

  it("does not add broad Google, Reddit, Meta, or script-eval CSP allowances", () => {
    const csp = cspLine ?? "";
    expect(csp).not.toContain("https://*.google");
    expect(csp).not.toContain("https://*.googletagmanager.com");
    expect(csp).not.toContain("https://*.google-analytics.com");
    expect(csp).not.toContain("https://*.reddit");
    expect(csp).not.toContain("https://*.redditstatic.com");
    expect(csp).not.toContain("https://*.facebook.com");
    expect(csp).not.toContain("https://*.facebook.net");
    expect(csp).not.toContain("'unsafe-eval'");
  });
});
