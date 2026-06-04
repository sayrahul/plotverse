/**
 * Geospatial math utilities (pure, framework-free).
 *
 * Thin wrappers over Turf.js that operate on WGS84 (EPSG:4326) GeoJSON. All
 * lengths/distances are returned in meters and areas in square meters, which is
 * the platform's canonical unit (see `lib/units.ts`).
 *
 * Requirements:
 * - 14.4 — distance from a viewer location to a plot (search results).
 * - 26.1 — detect when a device location falls within a plot polygon.
 * - 27.2 — compute each edge dimension label from the edge's measured length
 *          and midpoint.
 */

import {
  area,
  centroid as turfCentroid,
  distance,
  booleanPointInPolygon,
} from "@turf/turf";

import type { GeoJSON } from "@/lib/geojson";
import type { Plot } from "@/lib/types";

/** A single edge dimension label: the edge midpoint and its measured length. */
export interface EdgeDimension {
  /** Arithmetic average of the edge's two endpoints (Req 27.2). */
  midpoint: GeoJSON.Position;
  /** Great-circle length of the edge in meters (Req 27.2). */
  lengthMeters: number;
}

/**
 * Geodesic area of a feature's geometry in square meters.
 *
 * Returns 0 for geometries with no area (points, lines).
 */
export function areaSqm(feature: GeoJSON.Feature): number {
  // Turf's structural GeoJSON types match the local namespace shapes.
  return area(feature as never);
}

/**
 * Centroid (mean of all vertices) of a feature's geometry.
 *
 * For a convex polygon the centroid lies inside the polygon, which makes it a
 * reliable interior point for point-in-polygon checks (Req 26.1, 34.2).
 */
export function centroid(feature: GeoJSON.Feature): GeoJSON.Position {
  return turfCentroid(feature as never).geometry.coordinates;
}

/**
 * Edge dimension labels for every edge of a (multi)polygon feature (Req 27.2).
 *
 * One entry is produced per polygon edge. For each edge the midpoint is the
 * arithmetic average of its two endpoints and the length is the great-circle
 * distance between them in meters. Non-polygon geometries yield no edges.
 */
export function edgeDimensions(feature: GeoJSON.Feature): EdgeDimension[] {
  const result: EdgeDimension[] = [];
  for (const ring of polygonRings(feature.geometry)) {
    for (let i = 0; i + 1 < ring.length; i++) {
      const start = ring[i];
      const end = ring[i + 1];
      if (!start || !end) continue;
      result.push({
        midpoint: midpointOf(start, end),
        lengthMeters: distance(start, end, { units: "meters" }),
      });
    }
  }
  return result;
}

/**
 * True when `point` lies inside the plot's polygon geometry (Req 26.1).
 *
 * The polygon may be convex or concave and holes are respected.
 */
export function pointInPlot(point: GeoJSON.Position, plot: Plot): boolean {
  return booleanPointInPolygon(point, plot.geometry as never);
}

/**
 * Great-circle distance between two coordinates in meters (Req 14.4).
 *
 * Symmetric and non-negative; identical coordinates yield 0.
 */
export function distanceMeters(a: GeoJSON.Position, b: GeoJSON.Position): number {
  return distance(a, b, { units: "meters" });
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Extracts the coordinate rings from a Polygon or MultiPolygon geometry. */
function polygonRings(geometry: GeoJSON.Geometry | null): GeoJSON.Position[][] {
  if (!geometry) return [];
  if (geometry.type === "Polygon") return geometry.coordinates;
  if (geometry.type === "MultiPolygon") return geometry.coordinates.flat();
  return [];
}

/** Element-wise arithmetic mean of two positions (Req 27.2 midpoint). */
function midpointOf(a: GeoJSON.Position, b: GeoJSON.Position): GeoJSON.Position {
  const length = Math.min(a.length, b.length);
  const mid: number[] = [];
  for (let i = 0; i < length; i++) {
    mid.push((a[i]! + b[i]!) / 2);
  }
  return mid;
}
