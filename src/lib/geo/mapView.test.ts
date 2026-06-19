import { describe, expect, it } from "vitest";
import { DEFAULT_MAP_VIEW, isDefaultMapView, panMapView, zoomMapView } from "@/lib/geo/mapView";

describe("map view transforms", () => {
  it("zooms around an anchor and reports non-default state", () => {
    const zoomed = zoomMapView(DEFAULT_MAP_VIEW, 2, { x: 480, y: 260 });
    expect(zoomed.k).toBe(2);
    expect(zoomed.x).toBeLessThan(0);
    expect(zoomed.y).toBeLessThan(0);
    expect(isDefaultMapView(zoomed)).toBe(false);
  });

  it("clamps pan so the map cannot leave the viewport", () => {
    const zoomed = zoomMapView(DEFAULT_MAP_VIEW, 3);
    expect(panMapView(zoomed, 9999, 9999).x).toBe(0);
    expect(panMapView(zoomed, -9999, -9999).x).toBeGreaterThanOrEqual(-1920);
  });

  it("recognizes the reset view", () => {
    expect(isDefaultMapView(DEFAULT_MAP_VIEW)).toBe(true);
  });
});
