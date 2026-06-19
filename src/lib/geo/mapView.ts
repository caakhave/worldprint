export type MapViewTransform = {
  k: number;
  x: number;
  y: number;
};

export const DEFAULT_MAP_VIEW: MapViewTransform = { k: 1, x: 0, y: 0 };

const WIDTH = 960;
const HEIGHT = 520;
const MIN_ZOOM = 1;
const MAX_ZOOM = 6;

export function clampMapView(view: MapViewTransform): MapViewTransform {
  const k = clamp(view.k, MIN_ZOOM, MAX_ZOOM);
  const minX = WIDTH - WIDTH * k;
  const minY = HEIGHT - HEIGHT * k;
  return {
    k,
    x: clamp(view.x, minX, 0),
    y: clamp(view.y, minY, 0)
  };
}

export function zoomMapView(view: MapViewTransform, factor: number, anchor = { x: WIDTH / 2, y: HEIGHT / 2 }): MapViewTransform {
  const nextK = clamp(view.k * factor, MIN_ZOOM, MAX_ZOOM);
  const scale = nextK / view.k;
  return clampMapView({
    k: nextK,
    x: anchor.x - (anchor.x - view.x) * scale,
    y: anchor.y - (anchor.y - view.y) * scale
  });
}

export function panMapView(view: MapViewTransform, dx: number, dy: number): MapViewTransform {
  return clampMapView({ ...view, x: view.x + dx, y: view.y + dy });
}

export function isDefaultMapView(view: MapViewTransform): boolean {
  return view.k === DEFAULT_MAP_VIEW.k && view.x === DEFAULT_MAP_VIEW.x && view.y === DEFAULT_MAP_VIEW.y;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
