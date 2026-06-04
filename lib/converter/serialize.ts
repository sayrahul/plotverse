/**
 * File_Converter — stable, deterministic GeoJSON serialization (task 7.7).
 *
 * Provides a canonical round-trip between a {@link GeoJSON.FeatureCollection}
 * and its on-disk string form used for Firebase Storage (Req 36.1).
 *
 * `serializeGeoJSON` is *deterministic*: object keys are sorted recursively so
 * the same FeatureCollection always serializes to the byte-for-byte identical
 * string, regardless of the insertion order of its properties. This makes
 * stored documents content-addressable and diff-friendly, and lets equality
 * checks (e.g. "did the geometry change?") compare serialized strings directly.
 *
 * Crucially, *array order is preserved*. GeoJSON coordinates are arrays
 * (`Position`, rings, polygons), and their order is semantically significant —
 * reordering them would corrupt the geometry. Only object (map) keys are
 * sorted; arrays pass through untouched.
 *
 * Round-trip integrity (Property 21): for any FeatureCollection `fc`,
 * `deserializeGeoJSON(serializeGeoJSON(fc))` yields a FeatureCollection whose
 * geometry coordinates are exactly equal to those of `fc`.
 *
 * Requirements: 36.1
 */

import type { GeoJSON } from "@/lib/geojson";

/** A JSON value, used internally while building the canonical form. */
type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

/**
 * Recursively produces a canonical copy of a JSON-compatible value with the
 * keys of every plain object sorted lexicographically. Arrays are copied in
 * place with their order preserved (critical for GeoJSON coordinates), and
 * primitives are returned unchanged.
 *
 * `undefined`-valued object properties are dropped, mirroring `JSON.stringify`
 * semantics so the canonical form matches what a normal stringify would emit.
 */
function canonicalize(value: unknown): JsonValue {
  // Primitives (and null) serialize as-is.
  if (value === null || typeof value !== "object") {
    return value as JsonValue;
  }

  // Arrays: preserve order, canonicalize each element. Coordinate arrays
  // (Position, rings, polygons) must keep their original ordering.
  if (Array.isArray(value)) {
    return value.map((element) => canonicalize(element));
  }

  // Plain objects: emit keys in sorted order for deterministic output.
  const source = value as Record<string, unknown>;
  const sortedKeys = Object.keys(source).sort();
  const result: { [key: string]: JsonValue } = {};
  for (const key of sortedKeys) {
    const child = source[key];
    if (child === undefined) continue; // match JSON.stringify: drop undefined
    result[key] = canonicalize(child);
  }
  return result;
}

/**
 * Serializes a GeoJSON FeatureCollection into a stable, deterministic string
 * suitable for Storage (Req 36.1).
 *
 * Object keys are sorted recursively so identical collections always produce an
 * identical string; array order — including all coordinate arrays — is
 * preserved exactly. The output is compact (no extra whitespace).
 *
 * @param fc the FeatureCollection to serialize.
 * @returns a canonical JSON string.
 */
export function serializeGeoJSON(fc: GeoJSON.FeatureCollection): string {
  return JSON.stringify(canonicalize(fc));
}

/**
 * Parses a serialized GeoJSON string back into a FeatureCollection (Req 36.1).
 *
 * This is the inverse of {@link serializeGeoJSON} for the data it cares about:
 * `deserializeGeoJSON(serializeGeoJSON(fc))` reproduces `fc`'s geometry
 * coordinates exactly (Property 21).
 *
 * @param text a JSON string produced by {@link serializeGeoJSON} (or any valid
 *             GeoJSON FeatureCollection JSON).
 * @returns the parsed FeatureCollection.
 * @throws  {SyntaxError} if `text` is not valid JSON.
 */
export function deserializeGeoJSON(text: string): GeoJSON.FeatureCollection {
  return JSON.parse(text) as GeoJSON.FeatureCollection;
}
