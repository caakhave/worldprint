import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

const approvedAssets = {
  appIcon: {
    path: join(root, "assets/mobile/ios/source/app-icon.png"),
    sha256: "aa6cc894b2f5bf615f5f502bc300a6e0d4f74cbbe088610c1e8535cd9d001858",
    width: 1024,
    height: 1024
  },
  launchSource: {
    path: join(root, "assets/mobile/ios/source/launch-screen.png"),
    sha256: "fee1b9c2ee67fb061839ca62b35f060e990e386a67c86f762dcfcae7a917835a",
    width: 1254,
    height: 1254
  },
  launchPrepared: {
    path: join(root, "assets/mobile/ios/source/launch-screen-2732.png"),
    sha256: "d8f6d6fbfae76753f157a17f0fabb5bb2a696a7cbeee981318c0b90fd49c451c",
    width: 2732,
    height: 2732
  }
};

const appIconPath = join(root, "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png");
const splashPaths = [
  join(root, "ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732-2.png"),
  join(root, "ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732-1.png"),
  join(root, "ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732.png")
];

function readPngMetadata(path) {
  const data = readFileSync(path);
  if (data.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") {
    throw new Error(`${path} is not a PNG file.`);
  }

  let offset = 8;
  let metadata;
  let hasTransparencyChunk = false;

  while (offset < data.length) {
    const chunkLength = data.readUInt32BE(offset);
    const chunkType = data.subarray(offset + 4, offset + 8).toString("ascii");
    const chunk = data.subarray(offset + 8, offset + 8 + chunkLength);

    if (chunkType === "IHDR") {
      metadata = {
        width: chunk.readUInt32BE(0),
        height: chunk.readUInt32BE(4),
        bitDepth: chunk[8],
        colorType: chunk[9],
        interlaceMethod: chunk[12]
      };
    } else if (chunkType === "tRNS") {
      hasTransparencyChunk = true;
    } else if (chunkType === "IEND") {
      break;
    }

    offset += chunkLength + 12;
  }

  if (!metadata) {
    throw new Error(`${path} is missing PNG IHDR metadata.`);
  }

  return { data, hasTransparencyChunk, ...metadata };
}

function sha256(data) {
  return createHash("sha256").update(data).digest("hex");
}

function assertApprovedPng(name, asset) {
  const metadata = readPngMetadata(asset.path);
  if (sha256(metadata.data) !== asset.sha256) {
    throw new Error(`${name} does not match the approved SHA-256.`);
  }
  if (metadata.width !== asset.width || metadata.height !== asset.height) {
    throw new Error(`${name} must be ${asset.width}x${asset.height}; found ${metadata.width}x${metadata.height}.`);
  }
  if (metadata.bitDepth !== 8 || metadata.colorType !== 2 || metadata.hasTransparencyChunk || metadata.interlaceMethod !== 0) {
    throw new Error(`${name} must be an opaque, non-interlaced, 8-bit RGB PNG.`);
  }
}

for (const [name, asset] of Object.entries(approvedAssets)) {
  assertApprovedPng(name, asset);
}

mkdirSync(dirname(appIconPath), { recursive: true });
copyFileSync(approvedAssets.appIcon.path, appIconPath);

for (const destination of splashPaths) {
  mkdirSync(dirname(destination), { recursive: true });
  copyFileSync(approvedAssets.launchPrepared.path, destination);
}

console.log("Installed approved iOS AppIcon and launch artwork from assets/mobile/ios/source.");
