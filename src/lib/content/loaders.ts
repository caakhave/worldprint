import {
  DailyIndexSchema,
  DailyManifestSchema,
  EntityRegistrySchema,
  IndicatorArtifactSchema,
  ManifestSchema,
  RoundsArtifactSchema,
  SourceRegistrySchema,
  type DailyIndex,
  type DailyManifest,
  type EntityRegistry,
  type IndicatorArtifact,
  type Manifest,
  type RoundsArtifact,
  type SourceRegistry,
  type MapFeatureCollection
} from "@/lib/content/schemas";
import { z } from "zod";

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, { cache: "no-cache" });
  if (!response.ok) {
    throw new Error(`Could not load ${url}: ${response.status}`);
  }
  return response.json();
}

function formatPath(path: PropertyKey[]) {
  return path.length ? path.map(String).join(".") : "root";
}

function parseContent<T>(schema: z.ZodType<T>, value: unknown, label: string): T {
  const result = schema.safeParse(value);
  if (result.success) return result.data;

  const issues = result.error.issues.slice(0, 5).map((issue) => `${formatPath(issue.path)}: ${issue.message}`);
  const suffix = result.error.issues.length > issues.length ? `; plus ${result.error.issues.length - issues.length} more issue(s)` : "";
  throw new Error(`${label} is not compatible with this app build. ${issues.join("; ")}${suffix}`);
}

export async function loadManifest(): Promise<Manifest> {
  return parseContent(ManifestSchema, await fetchJson("/data/v1/manifest.json"), "Manifest");
}

export async function loadRounds(): Promise<RoundsArtifact> {
  return parseContent(RoundsArtifactSchema, await fetchJson("/data/v1/rounds.json"), "Round definitions");
}

export async function loadDailyIndex(path = "/data/v1/dailies/index.json"): Promise<DailyIndex> {
  return parseContent(DailyIndexSchema, await fetchJson(path), "Daily index");
}

export async function loadDailyManifest(dateKey: string): Promise<DailyManifest | null> {
  const response = await fetch(`/data/v1/dailies/${dateKey}.json`, { cache: "no-cache" });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Could not load Daily manifest ${dateKey}: ${response.status}`);
  }
  return parseContent(DailyManifestSchema, await response.json(), `Daily manifest ${dateKey}`);
}

export async function loadEntityRegistry(path = "/data/v1/entity-registry.json"): Promise<EntityRegistry> {
  return parseContent(EntityRegistrySchema, await fetchJson(path), "Entity registry");
}

export async function loadIndicator(path: string): Promise<IndicatorArtifact> {
  return parseContent(IndicatorArtifactSchema, await fetchJson(path), "Indicator artifact");
}

export async function loadMap(path: string): Promise<MapFeatureCollection> {
  return (await fetchJson(path)) as MapFeatureCollection;
}

export async function loadSources(path = "/data/v1/sources.json"): Promise<SourceRegistry> {
  return parseContent(SourceRegistrySchema, await fetchJson(path), "Source registry");
}
