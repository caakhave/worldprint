import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

type AppleAppSiteAssociation = {
  applinks?: {
    details?: Array<{
      appID?: string;
      appIDs?: string[];
      paths?: string[];
    }>;
  };
};

const APP_ID = "G5N5U6QFS8.com.canyougeo.app";
const ENTITLEMENTS_PATH = "ios/App/App/App.entitlements";
const CODE_SIGN_ENTITLEMENTS = "App/App.entitlements";
const AASA_PATH = "public/.well-known/apple-app-site-association";

const aasaText = readFileSync(join(process.cwd(), AASA_PATH), "utf8");
const aasa = JSON.parse(aasaText) as AppleAppSiteAssociation;
const headers = readFileSync(join(process.cwd(), "public/_headers"), "utf8");
const entitlements = readFileSync(join(process.cwd(), ENTITLEMENTS_PATH), "utf8");
const xcodeProject = readFileSync(join(process.cwd(), "ios/App/App.xcodeproj/project.pbxproj"), "utf8");

function appLinkPaths(): string[] {
  const details = aasa.applinks?.details ?? [];
  expect(details).toHaveLength(1);
  const detail = details[0];
  expect(detail?.appID).toBe(APP_ID);
  expect(detail?.appIDs).toBeUndefined();
  return detail?.paths ?? [];
}

function pathPatternToRegExp(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/gu, "\\$&").replace(/\*/gu, ".*").replace(/\?/gu, ".");
  return new RegExp(`^${escaped}$`, "u");
}

function aasaClaimsPath(pathname: string): boolean {
  for (const rawPattern of appLinkPaths()) {
    const excluded = rawPattern.startsWith("NOT ");
    const pattern = excluded ? rawPattern.slice(4) : rawPattern;
    if (pathPatternToRegExp(pattern).test(pathname)) return !excluded;
  }
  return false;
}

function appTargetBuildSettings(configurationName: "Debug" | "Release") {
  const configList = xcodeProject.match(
    /504EC3161FED79650016851F \/\* Build configuration list for PBXNativeTarget "App" \*\/ = \{[\s\S]*?buildConfigurations = \((?<configs>[\s\S]*?)\);/u
  );
  expect(configList?.groups?.configs).toContain(configurationName);
  const configIdMatch = configList?.groups?.configs.match(new RegExp(`\\s(?<id>[A-Z0-9]+) /\\* ${configurationName} \\*/`, "u"));
  expect(configIdMatch?.groups?.id).toBeTruthy();

  const block = xcodeProject.match(new RegExp(`${configIdMatch?.groups?.id} /\\* ${configurationName} \\*/ = \\{[\\s\\S]*?buildSettings = \\{(?<settings>[\\s\\S]*?)\\n\\s*\\};`, "u"));
  expect(block?.groups?.settings).toBeTruthy();
  return block?.groups?.settings ?? "";
}

describe("iOS Universal Link association contract", () => {
  it("serves a strict, extensionless AASA JSON file for the production app identifier", () => {
    expect(() => JSON.parse(aasaText)).not.toThrow();
    expect(Object.keys(aasa).sort()).toEqual(["applinks"]);

    const paths = appLinkPaths();
    expect(paths).toContain("/");
    expect(paths).not.toContain("/*");
    expect(paths).not.toContain("*");
    expect(aasaText).not.toMatch(/webcredentials|activitycontinuation|appclips/u);
  });

  it("claims supported public, game, auth, callback, and account routes", () => {
    const supportedPaths = [
      "/",
      "/play",
      "/play/",
      "/play/mystery-map",
      "/play/mystery-map/",
      "/play/mystery-map/2026-07-15",
      "/play/mystery-map/2026-07-15/",
      "/play/pattern-atlas",
      "/play/pattern-atlas/",
      "/play/order-atlas",
      "/play/order-atlas/",
      "/challenge/mystery-map",
      "/challenge/mystery-map/",
      "/upgrade",
      "/upgrade/",
      "/about/",
      "/how-to-play/",
      "/sources/",
      "/past-games/",
      "/support/",
      "/legal/",
      "/privacy/",
      "/terms/",
      "/choropleth-map-game/",
      "/country-guessing-game/",
      "/daily-geography-game/",
      "/map-quiz/",
      "/sign-in/",
      "/sign-up/",
      "/forgot-password/",
      "/auth/callback",
      "/auth/callback/",
      "/reset-password/",
      "/account/",
      "/account/stats/"
    ];

    for (const pathname of supportedPaths) {
      expect(aasaClaimsPath(pathname), pathname).toBe(true);
    }
  });

  it("does not claim internal, Next, data, asset, or arbitrary unknown routes", () => {
    const rejectedPaths = [
      "/internal/order-atlas-review/",
      "/_next/static/chunks/app.js",
      "/data/v1/dailies/index.json",
      "/favicon.ico",
      "/apple-touch-icon.png",
      "/unknown-route/",
      "/play/not-real/",
      "/play/mystery-map/not-a-date/"
    ];

    for (const pathname of rejectedPaths) {
      expect(aasaClaimsPath(pathname), pathname).toBe(false);
    }
  });

  it("does not include alternate hosts, IP addresses, local origins, or custom schemes", () => {
    expect(aasaText).not.toMatch(/www\.canyougeo\.com|test\.canyougeo\.com|localhost|127\.0\.0\.1|0\.0\.0\.0/u);
    expect(aasaText).not.toMatch(/capacitor:|com\.canyougeo\.app:\/\/|http:|file:|intent:/u);
  });

  it("adds a narrow Cloudflare Pages JSON header rule without changing Android assetlinks behavior", () => {
    const aasaHeaderRule = headers.match(/\/\.well-known\/apple-app-site-association\n(?<headers>(?:  .+\n?)+)/u);
    expect(aasaHeaderRule?.groups?.headers).toContain("Content-Type: application/json");
    expect(aasaHeaderRule?.groups?.headers).toContain("Cache-Control: public, max-age=3600, must-revalidate");

    expect(headers).not.toMatch(/\/\.well-known\/\*\n/u);
    expect(headers).not.toMatch(/\/\*\n\s+Content-Type: application\/json/u);
  });

  it("keeps iOS entitlements limited to the apex Universal Link domain", () => {
    expect(entitlements).toContain("<key>com.apple.developer.associated-domains</key>");
    expect(Array.from(entitlements.matchAll(/<string>([^<]+)<\/string>/gu)).map((match) => match[1])).toEqual(["applinks:canyougeo.com"]);
    expect(entitlements).not.toMatch(/webcredentials|activitycontinuation|aps-environment|com\.apple\.developer\.icloud|game-center/u);
    expect(entitlements).not.toMatch(/www\.canyougeo\.com|test\.canyougeo\.com|localhost|127\.0\.0\.1/u);
  });

  it("keeps Debug and Release App target signing automatic with the paid team and entitlements file", () => {
    for (const configuration of ["Debug", "Release"] as const) {
      const settings = appTargetBuildSettings(configuration);
      expect(settings).toContain(`CODE_SIGN_ENTITLEMENTS = ${CODE_SIGN_ENTITLEMENTS};`);
      expect(settings).toContain("CODE_SIGN_STYLE = Automatic;");
      expect(settings).toContain("DEVELOPMENT_TEAM = G5N5U6QFS8;");
      expect(settings).toContain("PRODUCT_BUNDLE_IDENTIFIER = com.canyougeo.app;");
      expect(settings).not.toMatch(/PROVISIONING_PROFILE|PROVISIONING_PROFILE_SPECIFIER|CODE_SIGN_IDENTITY =/u);
    }
  });
});
