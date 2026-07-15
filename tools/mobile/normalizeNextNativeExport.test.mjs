import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  GENERIC_PAGE_PAYLOAD,
  createTempNativeExportFixture,
  normalizeNextNativeExport,
  removeTempNativeExportFixture,
  writeFixtureFile
} from "./normalizeNextNativeExport.mjs";

describe("native export build wiring", () => {
  it("runs normalization only from the native build script", async () => {
    const packageJson = JSON.parse(await readFile(path.resolve("package.json"), "utf8"));

    expect(packageJson.scripts.build).toBe("next build");
    expect(packageJson.scripts["build:native"]).toContain("normalizeNextNativeExport.mjs out");
  });
});

describe("normalizeNextNativeExport", () => {
  let fixturePath;

  beforeEach(async () => {
    fixturePath = await createTempNativeExportFixture();
  });

  afterEach(async () => {
    await removeTempNativeExportFixture(fixturePath);
  });

  it("creates a generic page payload alias for a representative top-level route", async () => {
    await writeFixtureFile(path.join(fixturePath, "account", "index.html"), "<html></html>");
    await writeFixtureFile(path.join(fixturePath, "account", "__next.account.__PAGE__.txt"), "account payload");

    await expect(normalizeNextNativeExport(fixturePath)).resolves.toEqual({ created: 1, unchanged: 0 });

    await expect(readFile(path.join(fixturePath, "account", GENERIC_PAGE_PAYLOAD), "utf8")).resolves.toBe("account payload");
  });

  it("creates a generic page payload alias for a representative nested route", async () => {
    await writeFixtureFile(path.join(fixturePath, "account", "stats", "index.html"), "<html></html>");
    await writeFixtureFile(path.join(fixturePath, "account", "stats", "__next.account.stats.__PAGE__.txt"), "stats payload");

    await normalizeNextNativeExport(fixturePath);

    await expect(readFile(path.join(fixturePath, "account", "stats", GENERIC_PAGE_PAYLOAD), "utf8")).resolves.toBe("stats payload");
  });

  it("leaves an existing representative root payload unchanged", async () => {
    await writeFixtureFile(path.join(fixturePath, "index.html"), "<html></html>");
    await writeFixtureFile(path.join(fixturePath, GENERIC_PAGE_PAYLOAD), "root payload");

    await expect(normalizeNextNativeExport(fixturePath)).resolves.toEqual({ created: 0, unchanged: 0 });
    await expect(readFile(path.join(fixturePath, GENERIC_PAGE_PAYLOAD), "utf8")).resolves.toBe("root payload");
  });

  it("is idempotent when run repeatedly", async () => {
    await writeFixtureFile(path.join(fixturePath, "play", "mystery-map", "index.html"), "<html></html>");
    await writeFixtureFile(
      path.join(fixturePath, "play", "mystery-map", "__next.play.mystery-map.__PAGE__.txt"),
      "game payload"
    );

    await expect(normalizeNextNativeExport(fixturePath)).resolves.toEqual({ created: 1, unchanged: 0 });
    await expect(normalizeNextNativeExport(fixturePath)).resolves.toEqual({ created: 0, unchanged: 1 });
  });

  it("does not modify unrelated assets", async () => {
    await writeFixtureFile(path.join(fixturePath, "worldprint", "hero-poster.jpg"), "image-bytes");
    await writeFixtureFile(path.join(fixturePath, "play", "__next.play.txt"), "layout payload");

    await normalizeNextNativeExport(fixturePath);

    await expect(readFile(path.join(fixturePath, "worldprint", "hero-poster.jpg"), "utf8")).resolves.toBe("image-bytes");
    await expect(readdir(path.join(fixturePath, "play"))).resolves.toEqual(["__next.play.txt"]);
  });

  it("fails loudly when a route has ambiguous page payloads", async () => {
    await writeFixtureFile(path.join(fixturePath, "ambiguous", "__next.one.__PAGE__.txt"), "one");
    await writeFixtureFile(path.join(fixturePath, "ambiguous", "__next.two.__PAGE__.txt"), "two");

    await expect(normalizeNextNativeExport(fixturePath)).rejects.toThrow("multiple page payloads");
  });

  it("fails loudly when an existing generic alias has different contents", async () => {
    await writeFixtureFile(path.join(fixturePath, "account", "__next.account.__PAGE__.txt"), "account payload");
    await writeFixtureFile(path.join(fixturePath, "account", GENERIC_PAGE_PAYLOAD), "different payload");

    await expect(normalizeNextNativeExport(fixturePath)).rejects.toThrow("already exists with different contents");
  });
});
