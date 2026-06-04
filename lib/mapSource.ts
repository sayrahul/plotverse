/**
 * In-memory Mapbox source delta application (pure, framework-free).
 *
 * The Project_Viewer subscribes to Firestore `onSnapshot` updates and feeds
 * single-plot changes to the Map_Renderer. Rather than rebuilding the whole
 * GeoJSON source on every change, the renderer applies the delta to the
 * existing in-memory feature collection and hands the merged result to
 * `source.setData(...)` (Req 24.2). These helpers implement that merge as pure
 * functions so the logic is testable in isolation.
 *
 * Key invariants (Property 17):
 * - The returned collection reflects the change (add/modify upsert, remove
 *   deletes by id).
 * - All other features are preserved unchanged.
 * - The result contains no duplicate feature ids.
 * - The input collection is never mutated; a NEW collection is returned that
 *   reuses the unaffected feature objects (minimal allocation, not a rebuild
 *   from unrelated state).
 *
 * Requirements: 24.2 (update the affected Plot in the existing map source
 * without recreating the source).
 */

import { GeoJSON } from "@/lib/geojson";
import type { Plot } from "@/lib/types";

// ---------------------------------------------------------------------------
// Delta model
// ---------------------------------------------------------------------------

/** The kind of single-plot change carried by a real-time snapshot delta. */
export type DeltaType = "add" | "modify" | "remove";

/**
 * A single-plot change to apply to the in-memory feature collection.
 *
 * - `add` / `modify` upsert the supplied `feature` by id (insert when absent,
 *   replace when present), so both behave identically and are idempotent.
 * - `remove` deletes the feature identified by `plotId`.
 *
 * `feature` is required for `add`/`modify` and ignored for `remove`.
 */
export interface PlotDelta {
  type: DeltaType;
  /** The plot id the delta targets (matches `feature.id` / `properties.id`). */
  plotId: string;
  /** The feature to upsert; required for `add`/`modify`, unused for `remove`. */
  feature?: GeoJSON.Feature;
}

// ---------------------------------------------------------------------------
// Id resolution
// ---------------------------------------------------------------------------

/**
 * Resolves the stable identity of a feature.
 *
 * Mapbox features may carry their id either as the top-level `feature.id`
 * (preferred, used by feature-state) or inside `properties.id`. We match on
 * the top-level `id` first and fall back to `properties.id` so collections
 * built either way de-duplicate correctly.
 *
 * Returns the id as a string for stable comparison, or `undefined` when the
 * feature carries no usable identity.
 */
export function featureId(feature: GeoJSON.Feature): string | undefined {
  if (feature.id !== undefined && feature.id !== null) {
    return String(feature.id);
  }
  const propId = feature.properties?.id;
  if (propId !== undefined && propId !== null) {
    return String(propId);
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Delta application
// ---------------------------------------------------------------------------

/**
 * Applies a single-plot `delta` to `fc`, returning a NEW feature collection.
 *
 * The input `fc` (and its features array) is never mutated. The result reuses
 * the existing feature objects that are unaffected by the delta, so unrelated
 * features are preserved by reference rather than rebuilt.
 *
 * Behaviour by delta type:
 * - `add` / `modify`: upsert `delta.feature` by id. If a feature with the same
 *   id already exists it is replaced in place; otherwise the feature is
 *   appended. Either way the result contains exactly one feature for that id.
 *   A delta without a `feature` is treated as a no-op (returns a shallow copy).
 * - `remove`: drop every feature whose id equals `delta.plotId`.
 *
 * The result never contains duplicate ids: existing duplicates of the target
 * id collapse to the single upserted feature (or are all removed), while other
 * ids are left exactly as they were in the input (Property 17).
 */
export function applyDelta(
  fc: GeoJSON.FeatureCollection,
  delta: PlotDelta,
): GeoJSON.FeatureCollection {
  if (delta.type === "remove") {
    return {
      ...fc,
      features: fc.features.filter((f) => featureId(f) !== delta.plotId),
    };
  }

  // add / modify — both upsert by id.
  const incoming = delta.feature;
  if (!incoming) {
    // Nothing to insert; return an unchanged shallow copy so callers still get
    // a new collection reference without mutating the input.
    return { ...fc, features: [...fc.features] };
  }

  const targetId = featureId(incoming) ?? delta.plotId;
  let replaced = false;
  const features: GeoJSON.Feature[] = [];

  for (const f of fc.features) {
    if (featureId(f) === targetId) {
      // Replace the first match with the incoming feature; skip any further
      // duplicates so the result holds exactly one feature for this id.
      if (!replaced) {
        features.push(incoming);
        replaced = true;
      }
      continue;
    }
    features.push(f);
  }

  if (!replaced) {
    features.push(incoming);
  }

  return { ...fc, features };
}

// ---------------------------------------------------------------------------
// Plot -> Feature conversion
// ---------------------------------------------------------------------------

/**
 * Converts a {@link Plot} into a GeoJSON polygon feature for the `plots`
 * source consumed by the Map_Renderer.
 *
 * The feature's `id` is the plot id (so Mapbox feature-state and
 * {@link applyDelta} de-duplication line up), and `properties` carries the
 * fields layer expressions need to drive color (Req 6), labels (Req 7), and
 * zone filters (Req 12): `id`, `status`, `number`, `zoneId`, plus optional
 * `price` and `customLabel` when present. The polygon geometry is taken
 * directly from the plot.
 */
export function plotToFeature(
  plot: Plot,
): GeoJSON.Feature<GeoJSON.Polygon> {
  const properties: Record<string, unknown> = {
    id: plot.id,
    status: plot.status,
    number: plot.number,
  };
  if (plot.zoneId !== undefined) properties.zoneId = plot.zoneId;
  if (plot.price !== undefined) properties.price = plot.price;
  if (plot.customLabel !== undefined) properties.customLabel = plot.customLabel;

  return {
    type: "Feature",
    id: plot.id,
    geometry: plot.geometry,
    properties,
  };
}
