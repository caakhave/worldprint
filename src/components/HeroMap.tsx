"use client";

import { useEffect, useState } from "react";
import { WorldMap } from "@/components/WorldMap";
import { loadIndicator, loadManifest, loadMap } from "@/lib/content/loaders";
import type { IndicatorArtifact, MapFeatureCollection } from "@/lib/content/schemas";

export function HeroMap() {
  const [map, setMap] = useState<MapFeatureCollection | null>(null);
  const [indicator, setIndicator] = useState<IndicatorArtifact | null>(null);
  const [demoIndex, setDemoIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const manifest = await loadManifest();
      const selected = manifest.indicators.find((item) => item.id === "internet-users") ?? manifest.indicators[0];
      const [loadedMap, loadedIndicator] = await Promise.all([loadMap(manifest.map.path), loadIndicator(selected.path)]);
      if (!cancelled) {
        setMap(loadedMap);
        setIndicator(loadedIndicator);
      }
    }
    load().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const demoSteps = [
    "Start with shape, not labels.",
    "Spend score to reveal country values.",
    "Guess the hidden indicator, then learn the pattern."
  ];

  return (
    <div className="hero-map-panel" aria-label="Worldprint demonstration">
      {map && indicator ? (
        <WorldMap map={map} indicator={indicator} interactive={false} zoomable={false} labelledBy="hero-map-title" />
      ) : (
        <div className="map-frame map-loading" />
      )}
      <div className="demo-strip">
        <p id="hero-map-title">{demoSteps[demoIndex]}</p>
        <div className="demo-controls" aria-label="Demonstration steps">
          {demoSteps.map((step, index) => (
            <button
              key={step}
              type="button"
              aria-label={step}
              aria-pressed={demoIndex === index}
              onClick={() => setDemoIndex(index)}
            >
              {index + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
