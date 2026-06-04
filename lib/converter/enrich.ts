/**
 * File_Converter — feature enrichment (task 7.3).
 *
 * After a file has been parsed into a GeoJSON {@link GeoJSON.FeatureCollection}
 * (see `parse.ts`, task 7.1), every feature is enriched with derived geometry
 * facts so downstream code (plot upsert, the Map_Renderer, area display) does
 * not have to recompute them: the geodesic area in the platform's canonical
 * unit (square meters) plus its square-feet and square-yard equivalents, and a
 * centroid usable as an interior label/anchor point (Req 34.2).
 *
 * Enrichment is pure: it returns a brand-new FeatureCollection and never
 * mutates the input collection, its features, their properties, or geometry.
 *
 * Area conversions use exact, fixed ratios derived from the international
 * definitions of the foot (0.3048 m) and yard (0.9144 m). Because one yard is
 * exactly three feet, the square-foot value is exactly nine times the
 * square-yard value, satisfying the "correct fixed ratios" guarantee of
 * Property 19.
 *
 * Requirements: 34.2
 */

import { areaSqm as geodesicAreaSqm, centroid as geodesicCentroid } from "@/lib/geo";
import type { GeoJSON } from "@/lib/geojson";

// ---------------------------------------------------------------------------
// Area unit ratios (exact, from international foot/yard definitions)
// ---------------------------------------------------------------------------

/** Length of one foot in meters (international foot, exact). */
const METERS_PER_FOOT = 0.3048;
/** Length of one yard in meters (international yard, exact). */
const METERS_PER_YARD = 0.9144;

/** Square meters → square feet: 1 / 0.3048² = 10.763910416709722 (exact). */
const SQM_TO_SQFT = 1 / (METERS_PER_FOOT * METERS_PER_FOOT);
/** Square meters → square yards: 1 / 0.9144² = 1.1959900463010802 (exact). */
const SQM_TO_SQYD = 1 / (METERS_PER_YARD * METERS_PER_YARD);

/**
 * The derived properties added to every feature during enrichment (Req 34.2).
 *
 * `areaSqm` is the canonical area; `areaSqft`/`areaSqyd` are the same area
 * expressed in other units. `centroid` is an interior anchor point that lies
 * within the feature's bounding box.
 */
export interface EnrichedProperties {
  /** Geodesic area in square meters (canonical unit, Req 34.2). */
  areaSqm: number;
  /** Geodesic area in square feet (= areaSqm × {@link SQM_TO_SQFT}). */
  areaSqft: number;
  /** Geodesic area in square yards (= areaSqm × {@link SQM_TO_SQYD}). */
  areaSqyd: number;
  /** Centroid coordinate `[lng, lat]`, lying within the feature's bbox. */
  centroid: GeoJSON.Position;
}

/**
 * Enriches every feature in a FeatureCollection with area (sqft, sqm, sqyd) and
 * a centroid, merged into each feature's `properties` (Req 34.2).
 *
 * Returns a new FeatureCollection; the input and its contents are left
 * unmodified. Existing properties are preserved (the derived keys take
 * precedence on collision). Features whose geometry is `null` or has no
 * computable area/centroid (e.g. an empty geometry) receive zero areas and no
 * centroid, so they are passed through without throwing.
 *
 * @param fc the parsed FeatureCollection to enrich.
 * @returns a new, enriched FeatureCollection.
 */
export function enrichFeatures(
  fc: GeoJSON.FeatureCollection,
): GeoJSON.FeatureCollection {
  const features = fc.features.map(enrichFeature);
  const enriched: GeoJSON.FeatureCollection = {
    ...fc,
    type: "FeatureCollection",
    features,
  };
  return enriched;
}

/** Enriches a single feature, returning a new feature with merged properties. */
function enrichFeature(feature: GeoJSON.Feature): GeoJSON.Feature {
  const base = feature.properties ?? {};
  const derived = deriveProperties(feature);
  return {
    ...feature,
    type: "Feature",
    properties: { ...base, ...derived },
  };
}

/**
 * Computes the derived area/centroid properties for a feature.
 *
 * A feature without geometry has no area or centroid, so it gets zero areas and
 * the centroid key is omitted rather than fabricated.
 */
function deriveProperties(
  feature: GeoJSON.Feature,
): EnrichedProperties | { areaSqm: 0; areaSqft: 0; areaSqyd: 0 } {
  if (feature.geometry == null) {
    return { areaSqm: 0, areaSqft: 0, areaSqyd: 0 };
  }
  const sqm = geodesicAreaSqm(feature);
  return {
    areaSqm: sqm,
    areaSqft: sqm * SQM_TO_SQFT,
    areaSqyd: sqm * SQM_TO_SQYD,
    centroid: geodesicCentroid(feature),
  };
}
