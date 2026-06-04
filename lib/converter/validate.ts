/**
 * File_Converter — GeoJSON validation (task 7.5).
 *
 * Validates a converted {@link GeoJSON.FeatureCollection} against the two
 * structural rules the platform requires before plot data may be saved:
 *
 *  1. Every coordinate must lie within WGS84 (EPSG:4326) bounds — longitude in
 *     [-180, 180] and latitude in [-90, 90] (Req 34.3).
 *  2. Every polygon ring must be closed — its first coordinate must equal its
 *     last coordinate (Req 34.3).
 *
 * The result is a typed {@link ValidationError} array. An empty array means the
 * collection is valid; a non-empty array means saving must be withheld until
 * the Admin_User resolves the reported problems (Req 34.4). This module is pure
 * and framework-free so it can run in the browser preview and in tests alike.
 *
 * Requirements: 34.3, 34.4
 */

import type { GeoJSON } from "@/lib/geojson";
import type { ValidationError } from "@/lib/converter/types";

// ---------------------------------------------------------------------------
// WGS84 bounds (Req 34.3)
// ---------------------------------------------------------------------------

const LONGITUDE_MIN = -180;
const LONGITUDE_MAX = 180;
const LATITUDE_MIN = -90;
const LATITUDE_MAX = 90;

/**
 * Validates WGS84 coordinate bounds and closed polygon rings across every
 * feature in the collection (Req 34.3).
 *
 * Returns an empty array if and only if all coordinates are within WGS84 bounds
 * AND all polygon/multipolygon rings are closed. Otherwise it returns one entry
 * per problem found: an `"out-of-bounds"` error for each coordinate outside the
 * bounds and an `"open-ring"` error for each unclosed ring. Each error carries
 * the `featureIndex` of the offending feature so the Admin_Panel can pinpoint
 * and withhold saving until it is resolved (Req 34.4).
 */
export function validateGeoJSON(fc: GeoJSON.FeatureCollection): ValidationError[] {
  const errors: ValidationError[] = [];
  fc.features.forEach((feature, featureIndex) => {
    validateGeometry(feature?.geometry ?? null, featureIndex, errors);
  });
  return errors;
}

// ---------------------------------------------------------------------------
// Geometry traversal
// ---------------------------------------------------------------------------

/**
 * Walks a single geometry, accumulating bound and ring-closure errors. Polygon
 * and MultiPolygon rings are checked for both bounds and closure; all other
 * geometry types have their coordinate bounds checked. GeometryCollection is
 * traversed recursively.
 */
function validateGeometry(
  geometry: GeoJSON.Geometry | null,
  featureIndex: number,
  errors: ValidationError[],
): void {
  if (!geometry) return;

  switch (geometry.type) {
    case "Point":
      checkPosition(geometry.coordinates, featureIndex, errors);
      break;
    case "MultiPoint":
    case "LineString":
      geometry.coordinates.forEach((pos) =>
        checkPosition(pos, featureIndex, errors),
      );
      break;
    case "MultiLineString":
      geometry.coordinates.forEach((line) =>
        line.forEach((pos) => checkPosition(pos, featureIndex, errors)),
      );
      break;
    case "Polygon":
      validateRings(geometry.coordinates, featureIndex, errors);
      break;
    case "MultiPolygon":
      geometry.coordinates.forEach((polygon) =>
        validateRings(polygon, featureIndex, errors),
      );
      break;
    case "GeometryCollection":
      geometry.geometries.forEach((inner) =>
        validateGeometry(inner, featureIndex, errors),
      );
      break;
    default:
      break;
  }
}

/**
 * Checks every ring of a polygon for in-bounds coordinates (Req 34.3) and that
 * the ring is closed — its first coordinate equals its last (Req 34.3).
 */
function validateRings(
  rings: GeoJSON.Position[][],
  featureIndex: number,
  errors: ValidationError[],
): void {
  for (const ring of rings) {
    ring.forEach((pos) => checkPosition(pos, featureIndex, errors));
    if (!isRingClosed(ring)) {
      errors.push({
        kind: "open-ring",
        message:
          "Polygon ring is not closed: its first coordinate must equal its last coordinate.",
        featureIndex,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Coordinate checks
// ---------------------------------------------------------------------------

/**
 * Records an `"out-of-bounds"` error when a position's longitude/latitude fall
 * outside WGS84 bounds (Req 34.3). Non-finite components (NaN/Infinity) are
 * treated as out of bounds because they cannot satisfy the bounds.
 */
function checkPosition(
  position: GeoJSON.Position,
  featureIndex: number,
  errors: ValidationError[],
): void {
  const [longitude, latitude] = position;
  if (!isWithinBounds(longitude, latitude)) {
    errors.push({
      kind: "out-of-bounds",
      message: `Coordinate [${formatNumber(longitude)}, ${formatNumber(
        latitude,
      )}] is outside WGS84 bounds (longitude must be within [${LONGITUDE_MIN}, ${LONGITUDE_MAX}], latitude within [${LATITUDE_MIN}, ${LATITUDE_MAX}]).`,
      featureIndex,
    });
  }
}

/** True when both longitude and latitude lie within WGS84 bounds. */
function isWithinBounds(longitude: unknown, latitude: unknown): boolean {
  return (
    typeof longitude === "number" &&
    typeof latitude === "number" &&
    Number.isFinite(longitude) &&
    Number.isFinite(latitude) &&
    longitude >= LONGITUDE_MIN &&
    longitude <= LONGITUDE_MAX &&
    latitude >= LATITUDE_MIN &&
    latitude <= LATITUDE_MAX
  );
}

/**
 * True when a ring is closed: its first and last coordinates are equal in
 * longitude and latitude. An empty ring has no endpoints to compare and is not
 * reported as open by this check.
 */
function isRingClosed(ring: GeoJSON.Position[]): boolean {
  if (ring.length === 0) return true;
  const first = ring[0]!;
  const last = ring[ring.length - 1]!;
  return first[0] === last[0] && first[1] === last[1];
}

/** Renders a possibly-missing coordinate component for an error message. */
function formatNumber(value: number | undefined): string {
  return value === undefined ? "undefined" : String(value);
}
