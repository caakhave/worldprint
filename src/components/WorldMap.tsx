"use client";

import { Minus, Plus, RotateCcw } from "lucide-react";
import { geoEqualEarth, geoGraticule10, geoPath } from "d3-geo";
import { useCallback, useMemo, useRef, useState, type PointerEvent, type WheelEvent } from "react";
import type { IndicatorArtifact, MapFeature, MapFeatureCollection } from "@/lib/content/schemas";
import { valueClass } from "@/lib/geo/bins";
import { DEFAULT_MAP_VIEW, isDefaultMapView, panMapView, zoomMapView, type MapViewTransform } from "@/lib/geo/mapView";
import { MISSING_DATA_FILL, paletteForIndicator, valueClassColor } from "@/lib/geo/palette";

type WorldMapProps = {
  map: MapFeatureCollection;
  indicator?: IndicatorArtifact;
  investigatedIso3?: string[];
  selectedIso3?: string | null;
  showHoverNames?: boolean;
  interactive?: boolean;
  zoomable?: boolean;
  onCountryClick?: (country: { iso3: string; name: string }) => void;
  labelledBy?: string;
};

export function WorldMap({
  map,
  indicator,
  investigatedIso3 = [],
  selectedIso3,
  showHoverNames = false,
  interactive = true,
  zoomable = true,
  onCountryClick,
  labelledBy
}: WorldMapProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const activePointers = useRef(new Map<number, { clientX: number; clientY: number }>());
  const panStart = useRef<{ clientX: number; clientY: number; view: MapViewTransform } | null>(null);
  const pinchStart = useRef<{ distance: number; center: { clientX: number; clientY: number } } | null>(null);
  const suppressClick = useRef(false);
  const [view, setView] = useState<MapViewTransform>(DEFAULT_MAP_VIEW);
  const [hovered, setHovered] = useState<{ mapId: string; name: string; value: number | null; x: number; y: number } | null>(null);
  const projection = useMemo(() => geoEqualEarth().fitExtent([[18, 14], [942, 506]], map as never), [map]);
  const path = useMemo(() => geoPath(projection), [projection]);
  const graticulePath = path(geoGraticule10() as never);
  const investigated = new Set(investigatedIso3);
  const isZoomed = !isDefaultMapView(view);
  const palette = paletteForIndicator(indicator);

  const svgPoint = useCallback((clientX: number, clientY: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 480, y: 260 };
    return {
      x: ((clientX - rect.left) / rect.width) * 960,
      y: ((clientY - rect.top) / rect.height) * 520
    };
  }, []);

  const panDelta = useCallback((startX: number, startY: number, endX: number, endY: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { dx: 0, dy: 0 };
    return {
      dx: ((endX - startX) / rect.width) * 960,
      dy: ((endY - startY) / rect.height) * 520
    };
  }, []);

  function zoomBy(factor: number, anchor = { x: 480, y: 260 }) {
    if (!zoomable) return;
    setView((current) => zoomMapView(current, factor, anchor));
  }

  function resetView() {
    setView(DEFAULT_MAP_VIEW);
    suppressClick.current = false;
  }

  function handleWheel(event: WheelEvent<SVGSVGElement>) {
    if (!zoomable) return;
    event.preventDefault();
    const factor = event.deltaY < 0 ? 1.22 : 1 / 1.22;
    zoomBy(factor, svgPoint(event.clientX, event.clientY));
  }

  function handlePointerDown(event: PointerEvent<SVGSVGElement>) {
    if (!zoomable) return;
    activePointers.current.set(event.pointerId, { clientX: event.clientX, clientY: event.clientY });
    if (activePointers.current.size === 1 && view.k > 1) {
      panStart.current = { clientX: event.clientX, clientY: event.clientY, view };
      suppressClick.current = false;
    }
    if (activePointers.current.size === 2) {
      const points = Array.from(activePointers.current.values());
      pinchStart.current = {
        distance: pointerDistance(points[0], points[1]),
        center: pointerCenter(points[0], points[1])
      };
    }
  }

  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    if (!zoomable || !activePointers.current.has(event.pointerId)) return;
    activePointers.current.set(event.pointerId, { clientX: event.clientX, clientY: event.clientY });
    if (activePointers.current.size === 2 && pinchStart.current) {
      const points = Array.from(activePointers.current.values());
      const nextDistance = pointerDistance(points[0], points[1]);
      const nextCenter = pointerCenter(points[0], points[1]);
      if (pinchStart.current.distance > 0) {
        const factor = nextDistance / pinchStart.current.distance;
        setView((current) => zoomMapView(current, factor, svgPoint(nextCenter.clientX, nextCenter.clientY)));
      }
      pinchStart.current = { distance: nextDistance, center: nextCenter };
      suppressClick.current = true;
      return;
    }
    if (panStart.current && view.k > 1) {
      const delta = panDelta(panStart.current.clientX, panStart.current.clientY, event.clientX, event.clientY);
      if (Math.abs(delta.dx) > 3 || Math.abs(delta.dy) > 3) suppressClick.current = true;
      setView(panMapView(panStart.current.view, delta.dx, delta.dy));
    }
  }

  function handlePointerUp(event: PointerEvent<SVGSVGElement>) {
    activePointers.current.delete(event.pointerId);
    panStart.current = null;
    pinchStart.current = null;
  }

  return (
    <div className="map-frame" data-palette={palette.name} data-zoomable={zoomable ? "true" : "false"} data-zoomed={isZoomed ? "true" : "false"}>
      <svg
        ref={svgRef}
        className="world-map"
        viewBox="0 0 960 520"
        role="img"
        aria-labelledby={labelledBy}
        onPointerLeave={() => setHovered(null)}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <defs>
          <pattern id="missing-hatch" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(35)">
            <rect width="8" height="8" fill={MISSING_DATA_FILL} />
            <line x1="0" x2="0" y1="0" y2="8" stroke="#f4f0e5" strokeOpacity="0.38" strokeWidth="2" />
          </pattern>
        </defs>
        <rect className="map-ocean" width="960" height="520" rx="0" />
        <g className="map-viewport" transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
          {graticulePath ? <path className="map-graticule" d={graticulePath} vectorEffect="non-scaling-stroke" /> : null}
          <g aria-hidden="true">
            {map.features.map((feature: MapFeature) => {
              const iso3 = feature.properties.iso3;
              const value = iso3 && indicator ? indicator.valuesByIso3[iso3] : undefined;
              const klass = valueClass(value, indicator?.stats.quantileBreaks ?? []);
              const d = path(feature as never);
              if (!d) return null;
              const isInvestigated = iso3 ? investigated.has(iso3) : false;
              const isSelected = iso3 && selectedIso3 === iso3;
              const isHovered = hovered?.mapId === feature.properties.mapId;
              return (
                <path
                  key={feature.properties.mapId}
                  d={d}
                  className="country-path"
                  data-iso3={iso3 ?? ""}
                  data-country-name={feature.properties.name}
                  data-value-class={klass ?? "missing"}
                  data-has-data={value === undefined ? "false" : "true"}
                  data-investigated={isInvestigated ? "true" : "false"}
                  data-selected={isSelected ? "true" : "false"}
                  data-hovered={isHovered ? "true" : "false"}
                  style={klass === null ? undefined : { fill: valueClassColor(klass, indicator) }}
                  vectorEffect="non-scaling-stroke"
                  tabIndex={-1}
                  role="presentation"
                  onPointerMove={(event) => {
                    const canShowName = showHoverNames || !interactive;
                    setHovered({
                      mapId: feature.properties.mapId,
                      name: canShowName ? feature.properties.name : "Country",
                      value: value ?? null,
                      x: event.clientX,
                      y: event.clientY
                    });
                  }}
                  onPointerLeave={() => setHovered(null)}
                  onClick={() => {
                    if (suppressClick.current) {
                      suppressClick.current = false;
                      return;
                    }
                    if (!interactive || !iso3 || !onCountryClick) return;
                    onCountryClick({ iso3, name: feature.properties.name });
                  }}
                />
              );
            })}
          </g>
        </g>
      </svg>
      {zoomable ? (
        <div className="map-controls" aria-label="Map zoom controls">
          <button type="button" aria-label="Zoom in" onClick={() => zoomBy(1.35)}>
            <Plus size={16} aria-hidden="true" />
          </button>
          <button type="button" aria-label="Zoom out" onClick={() => zoomBy(1 / 1.35)} disabled={view.k <= 1}>
            <Minus size={16} aria-hidden="true" />
          </button>
          <button type="button" aria-label="Reset map view" onClick={resetView} disabled={!isZoomed}>
            <RotateCcw size={16} aria-hidden="true" />
            <span>Reset</span>
          </button>
        </div>
      ) : null}
      {hovered ? (
        <div className="map-tooltip" style={{ left: hovered.x + 12, top: hovered.y + 12 }}>
          <strong>{hovered.name}</strong>
          {indicator ? (
            <span>{hovered.value === null ? "No data for this round" : interactive ? "Click to select" : "Mapped value"}</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function pointerDistance(left: { clientX: number; clientY: number }, right: { clientX: number; clientY: number }) {
  return Math.hypot(left.clientX - right.clientX, left.clientY - right.clientY);
}

function pointerCenter(left: { clientX: number; clientY: number }, right: { clientX: number; clientY: number }) {
  return {
    clientX: (left.clientX + right.clientX) / 2,
    clientY: (left.clientY + right.clientY) / 2
  };
}
