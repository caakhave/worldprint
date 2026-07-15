import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const sourceAppIconPath = join(root, "assets/mobile/ios/source/app-icon.png");
const sourceLaunchPath = join(root, "assets/mobile/ios/source/launch-screen.png");
const sourceLaunchPreparedPath = join(root, "assets/mobile/ios/source/launch-screen-2732.png");
const generatedAppIconPath = join(root, "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png");
const appIconCatalogPath = join(root, "ios/App/App/Assets.xcassets/AppIcon.appiconset/Contents.json");
const splashCatalogPath = join(root, "ios/App/App/Assets.xcassets/Splash.imageset/Contents.json");
const launchStoryboardPath = join(root, "ios/App/App/Base.lproj/LaunchScreen.storyboard");
const generatorPath = join(root, "tools/mobile/generateIosBrandAssets.mjs");
const iosDocsPath = join(root, "docs/mobile/IOS_CAPACITOR_POC.md");
const splashPaths = [
  join(root, "ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732-2.png"),
  join(root, "ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732-1.png"),
  join(root, "ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732.png")
];

const approvedHashes = {
  appIcon: "aa6cc894b2f5bf615f5f502bc300a6e0d4f74cbbe088610c1e8535cd9d001858",
  launchSource: "fee1b9c2ee67fb061839ca62b35f060e990e386a67c86f762dcfcae7a917835a",
  launchPrepared: "d8f6d6fbfae76753f157a17f0fabb5bb2a696a7cbeee981318c0b90fd49c451c"
};

type PngMetadata = {
  bitDepth: number;
  colorType: number;
  data: Buffer;
  hasTransparencyChunk: boolean;
  height: number;
  interlaceMethod: number;
  width: number;
};

function readPngMetadata(path: string): PngMetadata {
  const data = readFileSync(path);
  expect(data.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlaceMethod = 0;
  let hasTransparencyChunk = false;

  while (offset < data.length) {
    const chunkLength = data.readUInt32BE(offset);
    const chunkType = data.subarray(offset + 4, offset + 8).toString("ascii");
    const chunk = data.subarray(offset + 8, offset + 8 + chunkLength);

    if (chunkType === "IHDR") {
      width = chunk.readUInt32BE(0);
      height = chunk.readUInt32BE(4);
      bitDepth = chunk[8];
      colorType = chunk[9];
      interlaceMethod = chunk[12];
    } else if (chunkType === "tRNS") {
      hasTransparencyChunk = true;
    } else if (chunkType === "IEND") {
      break;
    }

    offset += chunkLength + 12;
  }

  return { bitDepth, colorType, data, hasTransparencyChunk, height, interlaceMethod, width };
}

function sha256(path: string) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function expectOpaqueRgbPng(path: string, width: number, height: number) {
  const metadata = readPngMetadata(path);
  expect(metadata.width).toBe(width);
  expect(metadata.height).toBe(height);
  expect(metadata.bitDepth).toBe(8);
  expect(metadata.colorType).toBe(2);
  expect(metadata.hasTransparencyChunk).toBe(false);
  expect(metadata.interlaceMethod).toBe(0);
}

describe("iOS brand assets", () => {
  it("uses the checked-in approved iOS source assets rather than the web favicon", () => {
    expect(sha256(sourceAppIconPath)).toBe(approvedHashes.appIcon);
    expect(sha256(sourceLaunchPath)).toBe(approvedHashes.launchSource);
    expect(sha256(sourceLaunchPreparedPath)).toBe(approvedHashes.launchPrepared);

    expectOpaqueRgbPng(sourceAppIconPath, 1024, 1024);
    expectOpaqueRgbPng(sourceLaunchPath, 1254, 1254);
    expectOpaqueRgbPng(sourceLaunchPreparedPath, 2732, 2732);

    const generator = readFileSync(generatorPath, "utf8");
    expect(generator).toContain("assets/mobile/ios/source/app-icon.png");
    expect(generator).toContain("assets/mobile/ios/source/launch-screen.png");
    expect(generator).toContain("assets/mobile/ios/source/launch-screen-2732.png");
    expect(generator).not.toContain("public/favicon.svg");
    expect(generator).not.toContain("@playwright/test");
  });

  it("installs the exact approved globe-only iOS AppIcon", () => {
    const catalog = JSON.parse(readFileSync(appIconCatalogPath, "utf8")) as { images: Array<{ filename?: string; size?: string }> };
    expect(catalog.images).toEqual([
      expect.objectContaining({
        filename: "AppIcon-512@2x.png",
        size: "1024x1024"
      })
    ]);

    expectOpaqueRgbPng(generatedAppIconPath, 1024, 1024);
    expect(sha256(generatedAppIconPath)).toBe(approvedHashes.appIcon);
  });

  it("installs the approved full-logo launch artwork in every Splash image slot", () => {
    const catalog = JSON.parse(readFileSync(splashCatalogPath, "utf8")) as { images: Array<{ filename?: string }> };
    expect(catalog.images.map((image) => image.filename)).toEqual([
      "splash-2732x2732-2.png",
      "splash-2732x2732-1.png",
      "splash-2732x2732.png"
    ]);

    for (const path of splashPaths) {
      expectOpaqueRgbPng(path, 2732, 2732);
      expect(sha256(path)).toBe(approvedHashes.launchPrepared);
    }
  });

  it("keeps the launch screen aspect-fit so the full wordmark is not cropped", () => {
    const storyboard = readFileSync(launchStoryboardPath, "utf8");
    expect(storyboard).toContain('image="Splash"');
    expect(storyboard).toContain('contentMode="scaleAspectFit"');
    expect(storyboard).not.toContain('contentMode="scaleAspectFill"');
    expect(storyboard).toContain('red="0.0" green="0.0078431372549019607" blue="0.066666666666666666"');
    expect(storyboard).not.toMatch(/Capacitor/u);
  });

  it("documents the approved assets without claiming physical visual QA has passed", () => {
    const docs = readFileSync(iosDocsPath, "utf8");
    expect(docs).toContain("approved globe-only image is the iOS app icon");
    expect(docs).toContain("approved full globe-plus-wordmark image is the launch-screen artwork");
    expect(docs).toContain("`public/favicon.svg` source was incorrect and has been replaced");
    expect(docs).toContain("LaunchScreen.storyboard` uses `scaleAspectFit`");
    expect(docs).toContain("Physical visual QA must be repeated after a clean reinstall");
    expect(docs).toContain("Frame-by-frame screen recording is the recommended inspection method");
    expect(docs).toContain("No archive or TestFlight upload has occurred");
    expect(docs).not.toContain("Physical-device visual QA passed");
  });
});
