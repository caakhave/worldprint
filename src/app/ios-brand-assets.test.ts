import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const capacitorConfigPath = join(root, "capacitor.config.ts");
const packageJsonPath = join(root, "package.json");
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

function readPackageJson() {
  return JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
    dependencies?: Record<string, string>;
  };
}

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
  it("installs and configures the official Capacitor Splash Screen plugin", () => {
    const packageJson = readPackageJson();
    const splashScreenVersion = packageJson.dependencies?.["@capacitor/splash-screen"];
    expect(splashScreenVersion).toBe("8.0.2");
    expect(splashScreenVersion?.split(".")[0]).toBe("8");

    const capacitorConfig = readFileSync(capacitorConfigPath, "utf8");
    expect(capacitorConfig).toContain("SplashScreen");
    expect(capacitorConfig).toContain('backgroundColor: "#000211"');
    expect(capacitorConfig).toContain("launchAutoHide: true");
    expect(capacitorConfig).toContain("launchShowDuration: 1000");
    expect(capacitorConfig).toContain("showSpinner: false");
    expect(capacitorConfig).not.toContain("setTimeout");
    expect(capacitorConfig).not.toContain("Thread.sleep");
  });

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

  it("keeps a conventional launch-screen hierarchy so Splash can render", () => {
    const storyboard = readFileSync(launchStoryboardPath, "utf8");
    expect(storyboard).toContain('<view key="view" contentMode="scaleToFill" id="snD-IY-ifK">');
    expect(storyboard).not.toContain("<imageView key=\"view\"");
    expect(storyboard).toContain('image="Splash"');
    expect(storyboard).toContain('<imageView userInteractionEnabled="NO" contentMode="scaleAspectFit"');
    expect(storyboard).toContain('translatesAutoresizingMaskIntoConstraints="NO"');
    expect(storyboard).toContain('contentMode="scaleAspectFit"');
    expect(storyboard).not.toContain('contentMode="scaleAspectFill"');
    expect(storyboard).toContain('red="0.0" green="0.0078431372549019607" blue="0.066666666666666666"');
    expect(storyboard).toContain('firstAttribute="top" secondItem="snD-IY-ifK" secondAttribute="top"');
    expect(storyboard).toContain('firstAttribute="leading" secondItem="snD-IY-ifK" secondAttribute="leading"');
    expect(storyboard).toContain('firstAttribute="trailing" secondItem="fAa-oH-mn2" secondAttribute="trailing"');
    expect(storyboard).toContain('firstAttribute="bottom" secondItem="fAa-oH-mn2" secondAttribute="bottom"');
    expect(storyboard).not.toContain("safeArea");
    expect(storyboard).not.toMatch(/Capacitor/u);
  });

  it("documents the approved assets and physical iPhone QA pass", () => {
    const docs = readFileSync(iosDocsPath, "utf8");
    expect(docs).toContain("approved globe-only image is the iOS app icon");
    expect(docs).toContain("approved full globe-plus-wordmark image is the launch-screen artwork");
    expect(docs).toContain("`public/favicon.svg` source was incorrect and has been replaced");
    expect(docs).toContain("LaunchScreen.storyboard` uses `scaleAspectFit`");
    expect(docs).toContain("root `UIView` with a child `UIImageView`");
    expect(docs).toContain("official Capacitor Splash Screen plugin");
    expect(docs).toContain("approximately one second");
    expect(docs).toContain("No spinner is shown");
    expect(docs).toContain("xcrun assetutil --info");
    expect(docs).toContain("simulator visual validation remains blocked");
    expect(docs).not.toContain("simulator held-launch validation confirmed");
    expect(docs).not.toContain("Root cause: the launch storyboard used");
    expect(docs).toContain("Checkpoint 4H-5C physical iPhone 14 visual check passed");
    expect(docs).toContain("approved full globe plus `Can You Geo?` splash artwork appeared correctly");
    expect(docs).toContain("Checkpoint 4H-6 physical iPhone 14 QA passed for Can You Geo `1.0.0 (1)`");
    expect(docs).toContain("Home Screen showed the approved globe-only icon with no wordmark inside the icon");
    expect(docs).toContain("passed in portrait, landscape left, and landscape right");
    expect(docs).toContain("The Play hub opened, at least one sample or preview game opened");
    expect(docs).toContain("cold relaunch, warm relaunch, background/foreground, and app-switch return all passed");
    expect(docs).toContain("a normal non-sensitive `canyougeo.com` link opened the installed app");
    expect(docs).toContain("the intended reset/recovery route was reached");
    expect(docs).toContain("Do not record the QA email, password, callback URL, token, code, user id, or session values");
    expect(docs).toContain("Additional defects or observations: none");
    expect(docs).toContain("none of the requested physical iPhone 14 QA items were left untested");
    expect(docs).toContain("Frame-by-frame screen recording is the recommended inspection method");
    expect(docs).toContain("No TestFlight upload or App Store Connect upload has occurred");
    expect(docs).toContain("No archive, IPA export, TestFlight upload, App Store action");
    expect(docs).toContain("Checkpoint 4H-7 created the first local Release archive");
    expect(docs).toContain("Raw archive signing classification: Apple Development signing");
    expect(docs).toContain("The raw archived app had `get-task-allow = true`");
    expect(docs).toContain("App Store export result: `EXPORT SUCCEEDED`");
    expect(docs).toContain("the exported IPA was re-signed as Apple Distribution");
    expect(docs).toContain("iOS Team Store Provisioning Profile");
    expect(docs).toContain("`beta-reports-active = true`, and `get-task-allow = false`");
    expect(docs).toContain("Strict code-sign verification passed for the exported app");
    expect(docs).toContain("active `capacitor.config.json` had no `server` block");
    expect(docs).toContain("did not block the App Store export from re-signing the app correctly");
    expect(docs).toContain("No IPA upload, TestFlight upload, App Store Connect action");
  });
});
