import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

type Attributes = Record<string, string>;

type IntentFilter = {
  attributes: Attributes;
  actions: Set<string>;
  categories: Set<string>;
  data: Attributes[];
};

const EXPECTED_EXACT_PATHS = new Set([
  "/",
  "/challenge/mystery-map/",
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
  "/auth/callback/",
  "/reset-password/",
  "/account/",
  "/account/stats/"
]);
const EXPECTED_PREFIX_PATHS = new Set(["/play/"]);

const manifest = readFileSync(join(process.cwd(), "android/app/src/main/AndroidManifest.xml"), "utf8");
const appBuildGradle = readFileSync(join(process.cwd(), "android/app/build.gradle"), "utf8");

function attributesFrom(value: string): Attributes {
  return Object.fromEntries(Array.from(value.matchAll(/\s([\w:.-]+)="([^"]*)"/g)).map((match) => [match[1], match[2]]));
}

function tagAttributes(block: string, tagName: string): Attributes[] {
  return Array.from(block.matchAll(new RegExp(`<${tagName}\\b([^>]*)/?>`, "g"))).map((match) => attributesFrom(match[1] ?? ""));
}

function mainActivityBlock() {
  const match = manifest.match(/<activity\b(?=[^>]*android:name="\.MainActivity")([^>]*)>([\s\S]*?)<\/activity>/);
  expect(match).not.toBeNull();
  return {
    attributes: attributesFrom(match?.[1] ?? ""),
    body: match?.[2] ?? ""
  };
}

function intentFilters(): IntentFilter[] {
  return Array.from(mainActivityBlock().body.matchAll(/<intent-filter\b([^>]*)>([\s\S]*?)<\/intent-filter>/g)).map((match) => {
    const body = match[2] ?? "";
    return {
      attributes: attributesFrom(match[1] ?? ""),
      actions: new Set(tagAttributes(body, "action").map((attributes) => attributes["android:name"]).filter(Boolean)),
      categories: new Set(tagAttributes(body, "category").map((attributes) => attributes["android:name"]).filter(Boolean)),
      data: tagAttributes(body, "data")
    };
  });
}

function isAppLinkFilter(filter: IntentFilter): boolean {
  return (
    filter.actions.has("android.intent.action.VIEW") &&
    filter.categories.has("android.intent.category.DEFAULT") &&
    filter.categories.has("android.intent.category.BROWSABLE")
  );
}

describe("Android App Link manifest contract", () => {
  it("keeps MainActivity exported, singleTask, and launchable", () => {
    const activity = mainActivityBlock();
    expect(activity.attributes["android:exported"]).toBe("true");
    expect(activity.attributes["android:launchMode"]).toBe("singleTask");

    const launcherFilters = intentFilters().filter(
      (filter) => filter.actions.has("android.intent.action.MAIN") && filter.categories.has("android.intent.category.LAUNCHER")
    );
    expect(launcherFilters).toHaveLength(1);
    expect(launcherFilters[0]?.data).toHaveLength(0);
  });

  it("keeps the app package and namespace on com.canyougeo.app", () => {
    expect(appBuildGradle).toMatch(/namespace\s*=\s*"com\.canyougeo\.app"/);
    expect(appBuildGradle).toMatch(/applicationId\s+"com\.canyougeo\.app"/);
  });

  it("claims only apex HTTPS App Link paths approved for this checkpoint", () => {
    const appLinkFilters = intentFilters().filter(isAppLinkFilter);
    const expectedClaimCount = EXPECTED_EXACT_PATHS.size + EXPECTED_PREFIX_PATHS.size;
    expect(appLinkFilters).toHaveLength(expectedClaimCount);

    const exactPaths = new Set<string>();
    const prefixPaths = new Set<string>();

    for (const filter of appLinkFilters) {
      expect(filter.attributes["android:autoVerify"]).toBe("true");
      expect(filter.data).toHaveLength(1);

      const data = filter.data[0];
      expect(data?.["android:scheme"]).toBe("https");
      expect(data?.["android:host"]).toBe("canyougeo.com");
      expect(data?.["android:port"]).toBeUndefined();
      expect(data?.["android:mimeType"]).toBeUndefined();
      expect(data?.["android:pathPattern"]).toBeUndefined();
      expect(data?.["android:pathAdvancedPattern"]).toBeUndefined();

      const path = data?.["android:path"];
      const pathPrefix = data?.["android:pathPrefix"];
      expect([path, pathPrefix].filter(Boolean)).toHaveLength(1);
      if (path) exactPaths.add(path);
      if (pathPrefix) prefixPaths.add(pathPrefix);
    }

    expect(exactPaths).toEqual(EXPECTED_EXACT_PATHS);
    expect(prefixPaths).toEqual(EXPECTED_PREFIX_PATHS);
  });

  it("does not intentionally claim http, alternate hosts, custom schemes, or internal asset paths", () => {
    const claimedData = intentFilters().flatMap((filter) => filter.data);
    const claimedValues = claimedData.flatMap((attributes) => Object.values(attributes));

    expect(claimedValues).not.toContain("http");
    expect(claimedValues).not.toContain("www.canyougeo.com");
    expect(claimedValues).not.toContain("test.canyougeo.com");
    expect(claimedValues).not.toContain("com.canyougeo.app");

    for (const attributes of claimedData) {
      expect(attributes["android:pathPrefix"]).not.toBe("/");
      const claimedPath = attributes["android:path"] ?? attributes["android:pathPrefix"] ?? "";
      expect(claimedPath).not.toMatch(/^\/(?:internal|_next)\b/);
      expect(claimedPath).not.toMatch(/\.(?:js|json|css|png|ico)$/);
    }
  });
});
