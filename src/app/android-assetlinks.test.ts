import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const ASSETLINKS_PATH = "public/.well-known/assetlinks.json";
const BUILT_ASSETLINKS_PATH = "out/.well-known/assetlinks.json";
const HEADERS_PATH = "public/_headers";
const PACKAGE_NAME = "com.canyougeo.app";
const DEBUG_SHA256 =
  "D4:95:77:E6:E5:D7:90:B1:64:2E:86:32:EC:DD:24:3E:1D:97:82:73:64:03:6A:2E:93:B9:17:88:96:36:99:37";
const SHA256_PATTERN = /^(?:[A-F0-9]{2}:){31}[A-F0-9]{2}$/;

function readAssetLinks(path = ASSETLINKS_PATH) {
  return JSON.parse(readFileSync(path, "utf8")) as unknown;
}

describe("Android Digital Asset Links association", () => {
  it("ships a strict public assetlinks.json association for the Android app", () => {
    expect(existsSync(ASSETLINKS_PATH)).toBe(true);

    const parsed = readAssetLinks();
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(1);

    const [statement] = parsed as Array<{
      relation?: unknown;
      target?: {
        namespace?: unknown;
        package_name?: unknown;
        sha256_cert_fingerprints?: unknown;
      };
    }>;

    expect(statement.relation).toEqual(["delegate_permission/common.handle_all_urls"]);
    expect(statement.target?.namespace).toBe("android_app");
    expect(statement.target?.package_name).toBe(PACKAGE_NAME);
    expect(statement.target?.sha256_cert_fingerprints).toEqual([DEBUG_SHA256]);
    expect(DEBUG_SHA256).toMatch(SHA256_PATTERN);
  });

  it("does not include unrelated package names, hosts, or invented fingerprints", () => {
    const source = readFileSync(ASSETLINKS_PATH, "utf8");

    expect(source).toContain(PACKAGE_NAME);
    expect(source).toContain(DEBUG_SHA256);
    expect(source).not.toContain("www.canyougeo.com");
    expect(source).not.toContain("test.canyougeo.com");
    expect(source).not.toContain("apple-app-site-association");
    expect(source).not.toContain("applinks:");
    expect(source).not.toContain("play_app_signing");
  });

  it("declares narrow Cloudflare Pages headers for the association file", () => {
    const headers = readFileSync(HEADERS_PATH, "utf8");
    const rule = headers
      .split(/\n(?=\/)/)
      .find((block) => block.startsWith("/.well-known/assetlinks.json"));

    expect(rule).toBeDefined();
    expect(rule).toContain("Content-Type: application/json");
    expect(rule).toContain(
      "Cache-Control: public, max-age=3600, must-revalidate"
    );
    expect(rule).not.toContain("Access-Control-Allow-Origin");
  });

  it("can be verified against the static export output after a build", () => {
    if (!existsSync(BUILT_ASSETLINKS_PATH)) {
      expect(BUILT_ASSETLINKS_PATH).toBe("out/.well-known/assetlinks.json");
      return;
    }

    expect(readFileSync(BUILT_ASSETLINKS_PATH, "utf8")).toBe(
      readFileSync(ASSETLINKS_PATH, "utf8")
    );
    expect(readAssetLinks(BUILT_ASSETLINKS_PATH)).toEqual(readAssetLinks());
  });
});
