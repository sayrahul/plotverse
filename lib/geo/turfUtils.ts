/**
 * Geo utilities — thin wrappers over @turf/turf.
 * All geometry is WGS84 (EPSG:4326) GeoJSON (Req 34.3).
 * Areas are returned in canonical square meters (Req 34.2).
 *
 * Uses the local GeoJSON namespace types from @/lib/geojson to stay compatible
 * with the rest of the codebase.
 */
import * as turf from "@turf/turf";

export { turf };

/** Calculates the area of a polygon geometry in square meters. */
export function areaSqm(coordinates: number[][][]): number {
  return turf.area(turf.polygon(coordinates));
}

/** Returns the centroid of a polygon as [lng, lat]. */
export function centroid(coordinates: number[][][]): [number, number] {
  const c = turf.centroid(turf.polygon(coordinates));
  return c.geometry.coordinates as [number, number];
}

/** Returns the bounding box of a polygon as [minLng, minLat, maxLng, maxLat]. */
export function bbox(coordinates: number[][][]): [number, number, number, number] {
  return turf.bbox(turf.polygon(coordinates)) as [number, number, number, number];
}

/** Haversine distance in meters between two [lng, lat] positions. */
export function distanceM(a: number[], b: number[]): number {
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;
  return turf.distance(turf.point([lng1!, lat1!]), turf.point([lng2!, lat2!]), { units: "meters" });
}

/** Returns true when [lng, lat] falls inside the given polygon. */
export function pointInPolygon(lngLat: number[], coordinates: number[][][]): boolean {
  const [lng, lat] = lngLat;
  return turf.booleanPointInPolygon(turf.point([lng!, lat!]), turf.polygon(coordinates));
}

/**
 * Returns edge midpoints, lengths (m), and compass bearings of a polygon.
 * Used to render dimension labels on plot edges.
 */
export interface EdgeDimension {
  /** Start [lng, lat] of the edge. */
  start: [number, number];
  /** End [lng, lat] of the edge. */
  end: [number, number];
  /** Midpoint [lng, lat] of the edge. */
  mid: [number, number];
  /** Length of the edge in metres. */
  lengthM: number;
  /** Compass bearing of the edge (degrees). */
  bearing: number;
}

export function edgeDimensions(geometry: { coordinates: number[][][] }): EdgeDimension[] {
  const ring = geometry.coordinates[0];
  if (!ring || ring.length < 3) return [];
  const dims: EdgeDimension[] = [];
  for (let i = 0; i < ring.length - 1; i++) {
    const a = ring[i] as [number, number];
    const b = ring[i + 1] as [number, number];
    const line = turf.lineString([a, b]);
    const lengthM = turf.length(line, { units: "meters" });
    const mid = turf.midpoint(turf.point(a), turf.point(b)).geometry.coordinates as [number, number];
    const bear = turf.bearing(turf.point(a), turf.point(b));
    dims.push({ start: a, end: b, mid, lengthM, bearing: bear });
  }
  return dims;
}
