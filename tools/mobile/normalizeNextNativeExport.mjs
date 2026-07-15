import { copyFile, mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const GENERIC_PAGE_PAYLOAD = "__next.__PAGE__.txt";
const ROUTE_PAGE_PAYLOAD_PATTERN = /^__next\..+\.__PAGE__\.txt$/u;

async function isDirectory(filePath) {
  try {
    return (await stat(filePath)).isDirectory();
  } catch {
    return false;
  }
}

async function sameFileContents(leftPath, rightPath) {
  const [left, right] = await Promise.all([readFile(leftPath), readFile(rightPath)]);
  return left.equals(right);
}

async function walkDirectories(rootDir) {
  const dirs = [rootDir];
  for (let index = 0; index < dirs.length; index += 1) {
    const dir = dirs[index];
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) dirs.push(path.join(dir, entry.name));
    }
  }
  return dirs;
}

export async function normalizeNextNativeExport(rootDir = "out") {
  const resolvedRoot = path.resolve(rootDir);
  if (!(await isDirectory(resolvedRoot))) {
    throw new Error(`Native export normalization failed: ${resolvedRoot} is not a directory.`);
  }

  let created = 0;
  let unchanged = 0;
  const directories = await walkDirectories(resolvedRoot);

  for (const dir of directories) {
    const entries = await readdir(dir, { withFileTypes: true });
    const files = entries.filter((entry) => entry.isFile()).map((entry) => entry.name);
    const candidates = files
      .filter((file) => ROUTE_PAGE_PAYLOAD_PATTERN.test(file))
      .filter((file) => file !== GENERIC_PAGE_PAYLOAD);

    if (candidates.length === 0) continue;
    if (candidates.length > 1) {
      throw new Error(
        `Native export normalization failed: ${path.relative(resolvedRoot, dir) || "."} has multiple page payloads: ${candidates.join(", ")}`
      );
    }

    const source = path.join(dir, candidates[0]);
    const target = path.join(dir, GENERIC_PAGE_PAYLOAD);
    if (files.includes(GENERIC_PAGE_PAYLOAD)) {
      if (!(await sameFileContents(source, target))) {
        throw new Error(
          `Native export normalization failed: ${path.relative(resolvedRoot, target)} already exists with different contents.`
        );
      }
      unchanged += 1;
      continue;
    }

    await copyFile(source, target);
    created += 1;
  }

  return { created, unchanged };
}

async function main() {
  const rootDir = process.argv[2] ?? "out";
  const result = await normalizeNextNativeExport(rootDir);
  console.log(`Normalized native Next export page payloads: ${result.created} created, ${result.unchanged} unchanged.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

export async function createTempNativeExportFixture() {
  return mkdtemp(path.join(tmpdir(), "cgy-native-export-"));
}

export async function removeTempNativeExportFixture(fixturePath) {
  await rm(fixturePath, { force: true, recursive: true });
}

export async function writeFixtureFile(filePath, contents = "payload") {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, contents);
}
