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

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, { cache: "force-cache" });
  if (!response.ok) {
    throw new Error(`Could not load ${url}: ${response.status}`);
  }
  return response.json();
}

export async function loadManifest(): Promise<Manifest> {
  return ManifestSchema.parse(await fetchJson("/data/v1/manifest.json"));
}

export async function loadRounds(): Promise<RoundsArtifact> {
  return RoundsArtifactSchema.parse(await fetchJson("/data/v1/rounds.json"));
}

export async function loadDailyIndex(path = "/data/v1/dailies/index.json"): Promise<DailyIndex> {
  return DailyIndexSchema.parse(await fetchJson(path));
}

export async function loadDailyManifest(dateKey: string): Promise<DailyManifest | null> {
  const response = await fetch(`/data/v1/dailies/${dateKey}.json`, { cache: "force-cache" });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Could not load Daily manifest ${dateKey}: ${response.status}`);
  }
  return DailyManifestSchema.parse(await response.json());
}

export async function loadEntityRegistry(path = "/data/v1/entity-registry.json"): Promise<EntityRegistry> {
  return EntityRegistrySchema.parse(await fetchJson(path));
}

export async function loadIndicator(path: string): Promise<IndicatorArtifact> {
  return IndicatorArtifactSchema.parse(await fetchJson(path));
}

export async function loadMap(path: string): Promise<MapFeatureCollection> {
  return (await fetchJson(path)) as MapFeatureCollection;
}

export async function loadSources(path = "/data/v1/sources.json"): Promise<SourceRegistry> {
  return SourceRegistrySchema.parse(await fetchJson(path));
}
