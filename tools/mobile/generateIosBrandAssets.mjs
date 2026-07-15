import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const sourceSvgPath = join(root, "public/favicon.svg");
const appIconPath = join(root, "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png");
const splashPaths = [
  join(root, "ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732-2.png"),
  join(root, "ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732-1.png"),
  join(root, "ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732.png")
];

function extractBrandMark(source) {
  const background = source.match(/<rect\b[^>]*\bfill="(?<color>#[0-9a-fA-F]{6})"/u)?.groups?.color;
  const geometry = Array.from(source.matchAll(/^\s*(<(?:circle|path)\b[^>]*\/>)\s*$/gmu))
    .map((match) => match[1])
    .join("\n");

  if (!background || !geometry.includes("#89e3d4") || !geometry.includes("#d6a747")) {
    throw new Error("public/favicon.svg does not contain the expected Can You Geo brand mark.");
  }

  return { background, geometry };
}

function brandSvg({ background, geometry, size, glyphSize }) {
  const offset = (size - glyphSize) / 2;
  const scale = glyphSize / 48;

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      html,
      body {
        width: ${size}px;
        height: ${size}px;
        margin: 0;
        overflow: hidden;
        background: ${background};
      }

      svg {
        display: block;
        width: ${size}px;
        height: ${size}px;
        background: ${background};
      }
    </style>
  </head>
  <body>
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" shape-rendering="geometricPrecision">
      <rect width="${size}" height="${size}" fill="${background}" />
      <g transform="translate(${offset} ${offset}) scale(${scale})">
        ${geometry}
      </g>
    </svg>
  </body>
</html>`;
}

async function renderPng(browser, html, outputPath, size) {
  mkdirSync(dirname(outputPath), { recursive: true });
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: "load" });
  await page.screenshot({ path: outputPath, fullPage: false, omitBackground: false });
  await page.close();
}

const brandMark = extractBrandMark(readFileSync(sourceSvgPath, "utf8"));
const browser = await chromium.launch({ headless: true });

try {
  await renderPng(
    browser,
    brandSvg({ ...brandMark, size: 1024, glyphSize: 760 }),
    appIconPath,
    1024
  );

  await renderPng(
    browser,
    brandSvg({ ...brandMark, size: 2732, glyphSize: 900 }),
    splashPaths[0],
    2732
  );
} finally {
  await browser.close();
}

for (const destination of splashPaths.slice(1)) {
  copyFileSync(splashPaths[0], destination);
}

console.log("Generated branded iOS AppIcon and launch artwork from public/favicon.svg.");
