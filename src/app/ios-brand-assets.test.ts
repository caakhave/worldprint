import { readFileSync } from "node:fs";
import { join } from "node:path";
import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const appIconPath = join(root, "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png");
const appIconCatalogPath = join(root, "ios/App/App/Assets.xcassets/AppIcon.appiconset/Contents.json");
const splashCatalogPath = join(root, "ios/App/App/Assets.xcassets/Splash.imageset/Contents.json");
const launchStoryboardPath = join(root, "ios/App/App/Base.lproj/LaunchScreen.storyboard");
const sourceSvgPath = join(root, "public/favicon.svg");
const iosDocsPath = join(root, "docs/mobile/IOS_CAPACITOR_POC.md");
const splashPaths = [
  join(root, "ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732-2.png"),
  join(root, "ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732-1.png"),
  join(root, "ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732.png")
];

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

function decodeRgbPng(metadata: PngMetadata) {
  expect(metadata.bitDepth).toBe(8);
  expect(metadata.colorType).toBe(2);
  expect(metadata.interlaceMethod).toBe(0);

  const idatChunks: Buffer[] = [];
  let offset = 8;
  while (offset < metadata.data.length) {
    const chunkLength = metadata.data.readUInt32BE(offset);
    const chunkType = metadata.data.subarray(offset + 4, offset + 8).toString("ascii");
    if (chunkType === "IDAT") {
      idatChunks.push(metadata.data.subarray(offset + 8, offset + 8 + chunkLength));
    } else if (chunkType === "IEND") {
      break;
    }
    offset += chunkLength + 12;
  }

  const source = inflateSync(Buffer.concat(idatChunks));
  const bytesPerPixel = 3;
  const stride = metadata.width * bytesPerPixel;
  const pixels = new Uint8Array(stride * metadata.height);
  let sourceOffset = 0;

  for (let y = 0; y < metadata.height; y += 1) {
    const filter = source[sourceOffset];
    sourceOffset += 1;

    for (let x = 0; x < stride; x += 1) {
      const raw = source[sourceOffset];
      sourceOffset += 1;

      const targetOffset = y * stride + x;
      const left = x >= bytesPerPixel ? pixels[targetOffset - bytesPerPixel] : 0;
      const up = y > 0 ? pixels[targetOffset - stride] : 0;
      const upLeft = y > 0 && x >= bytesPerPixel ? pixels[targetOffset - stride - bytesPerPixel] : 0;

      let value: number;
      if (filter === 0) {
        value = raw;
      } else if (filter === 1) {
        value = raw + left;
      } else if (filter === 2) {
        value = raw + up;
      } else if (filter === 3) {
        value = raw + Math.floor((left + up) / 2);
      } else if (filter === 4) {
        const predictor = left + up - upLeft;
        const leftDistance = Math.abs(predictor - left);
        const upDistance = Math.abs(predictor - up);
        const upLeftDistance = Math.abs(predictor - upLeft);
        value = raw + (leftDistance <= upDistance && leftDistance <= upLeftDistance ? left : upDistance <= upLeftDistance ? up : upLeft);
      } else {
        throw new Error(`Unsupported PNG row filter ${filter}.`);
      }

      pixels[targetOffset] = value & 0xff;
    }
  }

  return { pixels, stride };
}

function expectBrandColor(path: string, expected: [number, number, number], minMatches: number) {
  const metadata = readPngMetadata(path);
  const decoded = decodeRgbPng(metadata);
  let matches = 0;

  for (let offset = 0; offset < decoded.pixels.length; offset += 3) {
    if (
      Math.abs(decoded.pixels[offset] - expected[0]) <= 2 &&
      Math.abs(decoded.pixels[offset + 1] - expected[1]) <= 2 &&
      Math.abs(decoded.pixels[offset + 2] - expected[2]) <= 2
    ) {
      matches += 1;
      if (matches >= minMatches) {
        return;
      }
    }
  }

  throw new Error(`Expected ${path} to contain the Can You Geo brand color rgb(${expected.join(", ")}).`);
}

describe("iOS brand assets", () => {
  it("uses the repository Can You Geo vector mark as the source asset", () => {
    const sourceSvg = readFileSync(sourceSvgPath, "utf8");
    expect(sourceSvg).toContain("#061316");
    expect(sourceSvg).toContain("#89e3d4");
    expect(sourceSvg).toContain("#d6a747");
    expect(sourceSvg).toContain("<circle");
    expect(sourceSvg).toContain("<path");
  });

  it("installs an opaque 1024px iOS AppIcon with the Can You Geo brand colors", () => {
    const catalog = JSON.parse(readFileSync(appIconCatalogPath, "utf8")) as { images: Array<{ filename?: string; size?: string }> };
    expect(catalog.images).toEqual([
      expect.objectContaining({
        filename: "AppIcon-512@2x.png",
        size: "1024x1024"
      })
    ]);

    const metadata = readPngMetadata(appIconPath);
    expect(metadata.width).toBe(1024);
    expect(metadata.height).toBe(1024);
    expect(metadata.colorType).toBe(2);
    expect(metadata.hasTransparencyChunk).toBe(false);

    expectBrandColor(appIconPath, [6, 19, 22], 1000);
    expectBrandColor(appIconPath, [137, 227, 212], 1000);
    expectBrandColor(appIconPath, [214, 167, 71], 1000);
  });

  it("installs opaque branded launch-screen artwork and keeps the static launch image wiring", () => {
    const catalog = JSON.parse(readFileSync(splashCatalogPath, "utf8")) as { images: Array<{ filename?: string }> };
    expect(catalog.images.map((image) => image.filename)).toEqual([
      "splash-2732x2732-2.png",
      "splash-2732x2732-1.png",
      "splash-2732x2732.png"
    ]);

    for (const path of splashPaths) {
      const metadata = readPngMetadata(path);
      expect(metadata.width).toBe(2732);
      expect(metadata.height).toBe(2732);
      expect(metadata.colorType).toBe(2);
      expect(metadata.hasTransparencyChunk).toBe(false);
    }

    expectBrandColor(splashPaths[0], [6, 19, 22], 1000);
    expectBrandColor(splashPaths[0], [137, 227, 212], 1000);
    expectBrandColor(splashPaths[0], [214, 167, 71], 1000);

    const storyboard = readFileSync(launchStoryboardPath, "utf8");
    expect(storyboard).toContain('image="Splash"');
    expect(storyboard).toContain('contentMode="scaleAspectFill"');
    expect(storyboard).not.toMatch(/Capacitor/u);
  });

  it("documents the installed assets and remaining manual visual QA", () => {
    const docs = readFileSync(iosDocsPath, "utf8");
    expect(docs).toContain("Source vector asset: `public/favicon.svg`");
    expect(docs).toContain("Asset-generation command: `node tools/mobile/generateIosBrandAssets.mjs`");
    expect(docs).toContain("AppIcon is a 1024 x 1024 RGB PNG with no alpha channel");
    expect(docs).toContain("each launch image is a 2732 x 2732 RGB PNG with no alpha channel");
    expect(docs).toContain("No flash of Capacitor branding");
    expect(docs).toContain("TestFlight archive/export/upload after physical-device visual QA passes");
    expect(docs).not.toContain("the image is still the default Capacitor mark");
  });
});
