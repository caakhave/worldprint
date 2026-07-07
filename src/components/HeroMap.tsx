"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { WorldMap } from "@/components/WorldMap";
import { loadIndicator, loadManifest, loadMap } from "@/lib/content/loaders";
import type { IndicatorArtifact, MapFeatureCollection } from "@/lib/content/schemas";

const demoSteps = [
  "Start with shape, not labels.",
  "Spend score to reveal country values.",
  "Guess what the map shows, then learn the pattern."
] as const;

export function HeroMap() {
  const [map, setMap] = useState<MapFeatureCollection | null>(null);
  const [indicator, setIndicator] = useState<IndicatorArtifact | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [demoIndex, setDemoIndex] = useState(0);
  const [motionKey, setMotionKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const manifest = await loadManifest();
      const selected = manifest.indicators.find((item) => item.id === "internet-users") ?? manifest.indicators[0];
      const [loadedMap, loadedIndicator] = await Promise.all([loadMap(manifest.map.path), loadIndicator(selected.path)]);
      if (!cancelled) {
        setMap(loadedMap);
        setIndicator(loadedIndicator);
        setLoadError(false);
      }
    }
    load().catch(() => {
      if (!cancelled) setLoadError(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function activateStep(index: number) {
    setDemoIndex(index);
    setMotionKey((current) => current + 1);
  }

  return (
    <div className="hero-map-panel" aria-label="Mystery Map demonstration">
      <div className="hero-map-stage" data-testid="hero-map-stage" data-demo-step={demoIndex + 1} data-motion-key={motionKey}>
        {map && indicator ? (
          <>
            <WorldMap map={map} indicator={indicator} interactive={false} zoomable={false} labelledBy="hero-map-title" />
            <HeroMotionOverlay activeStep={demoIndex} motionKey={motionKey} />
          </>
        ) : loadError ? (
          <div className="map-frame map-error" role="status">Map preview unavailable.</div>
        ) : (
          <div className="map-frame map-loading" />
        )}
      </div>
      <div className="demo-strip">
        <p id="hero-map-title">{demoSteps[demoIndex]}</p>
        <div className="demo-controls" aria-label="Demonstration steps">
          {demoSteps.map((step, index) => (
            <button
              key={step}
              type="button"
              aria-label={step}
              aria-pressed={demoIndex === index}
              onClick={() => activateStep(index)}
            >
              {index + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function HeroMotionOverlay({ activeStep, motionKey }: { activeStep: number; motionKey: number }) {
  return (
    <div className="hero-motion-overlay" aria-hidden="true" key={motionKey} data-active-step={activeStep + 1}>
      <svg className="hero-atlas-overlay" viewBox="0 0 960 520" preserveAspectRatio="none">
        <defs>
          <radialGradient id="hero-global-glow" cx="50%" cy="50%" r="58%">
            <stop offset="0%" stopColor="#8be0cf" stopOpacity="0.22" />
            <stop offset="54%" stopColor="#54c7b4" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#54c7b4" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="hero-reveal-glow" cx="58%" cy="42%" r="55%">
            <stop offset="0%" stopColor="#d7a84b" stopOpacity="0.24" />
            <stop offset="45%" stopColor="#8be0cf" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#8be0cf" stopOpacity="0" />
          </radialGradient>
        </defs>

        <g className="hero-step-layer hero-step-shape" data-active={activeStep === 0 ? "true" : "false"}>
          <ellipse className="hero-global-glow" cx="486" cy="260" rx="390" ry="182" fill="url(#hero-global-glow)" />
          <path className="hero-scan-line" d="M104 126 C258 190 386 198 540 174 C682 152 798 176 880 226" />
          <path className="hero-scan-line hero-scan-line-secondary" d="M94 352 C244 298 380 292 518 326 C638 356 760 336 874 284" />
        </g>

        <g className="hero-step-layer hero-step-investigate" data-active={activeStep === 1 ? "true" : "false"}>
          <HeroProbe x={312} y={238} value="72%" delay="0ms" />
          <HeroProbe x={480} y={344} value="46%" delay="120ms" />
          <HeroProbe x={690} y={250} value="91%" delay="240ms" />
        </g>

        <g className="hero-step-layer hero-step-resolve" data-active={activeStep === 2 ? "true" : "false"}>
          <ellipse className="hero-reveal-glow" cx="540" cy="256" rx="430" ry="206" fill="url(#hero-reveal-glow)" />
          <path className="hero-reveal-route" d="M158 322 C292 240 388 236 502 282 C604 324 716 296 830 196" />
          <circle className="hero-resolve-node" cx="158" cy="322" r="4.5" />
          <circle className="hero-resolve-node hero-resolve-node-mid" cx="502" cy="282" r="5.5" />
          <circle className="hero-resolve-node hero-resolve-node-final" cx="830" cy="196" r="6.5" />
        </g>
      </svg>
    </div>
  );
}

function HeroProbe({ x, y, value, delay }: { x: number; y: number; value: string; delay: string }) {
  return (
    <g className="hero-probe" style={{ "--probe-delay": delay } as CSSProperties}>
      <circle className="hero-probe-ring" cx={x} cy={y} r="26" />
      <circle className="hero-probe-ring hero-probe-ring-outer" cx={x} cy={y} r="40" />
      <circle className="hero-probe-dot" cx={x} cy={y} r="5.5" />
      <g className="hero-value-chip" transform={`translate(${x + 14} ${y - 42})`}>
        <rect width="54" height="25" rx="12.5" />
        <text x="27" y="17">
          {value}
        </text>
      </g>
    </g>
  );
}
