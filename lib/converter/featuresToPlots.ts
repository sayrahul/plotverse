/**
 * File_Converter — derive Plot documents from converted GeoJSON (task 17.4).
 *
 * This is the derivation seam declared by {@link import("@/lib/firebase/storage").SaveGeoJSONRepos.featuresToPlots}
 * (left open by task 12.3). When an Admin_User saves converted, enriched, and
 * validated GeoJSON, each feature must be turned into a {@link Plot} document so
 * the platform's inventory (map color, search, status counts) is driven by
 * Firestore rather than the raw file (Req 35.1).
 *
 * The mapping is pure and framework-free:
 * - `geometry` is the feature's polygon (a `MultiPolygon` collapses to its
 *   first polygon; non-polygon features cannot form a plot and are skipped).
 * - `areaSqm` / `centroid` are taken from the enrichment step's properties
 *   (`enrichFeatures`, Req 34.2) and fall back to a fresh geodesic computation
 *   when absent, so the function is correct even on un-enriched input.
 * - `number` and `status` come from feature properties when present, otherwise
 *   from sensible defaults (a generated number; `"available"` status).
 * - optional `price`, `facing`, `amenities`, `zoneId`, and `customLabel` are
 *   carried over when the corresponding property is present and well-typed.
 *
 * Plot ids are stable and unique: an explicit `id` / `plotId` property is used
 * when supplied, otherwise a positional `plot-{n}` id is generated so an upsert
 * (`plotRepo.upsertMany`) never silently collapses two features into one
 * document.
 *
 * Requirements: 34.2 (enriched area/centroid), 35.1 (create/update Plot docs).
 */

import { areaSqm as geodesicAreaSqm, centroid as geodesicCentroid } from "@/lib/geo";
import type { GeoJSON } from "@/lib/geojson";
import type { Plot, PlotStatus } from "@/lib/types";

/** The four permitted plot statuses (Req 6). */
const PLOT_STATUSES: readonly PlotStatus[] = [
  "available",
  "sold",
  "reserved",
  "blocked",
];

/** Status applied when a feature carries no recognizable status (Req 6.1). */
const DEFAULT_STATUS: PlotStatus = "available";

/** Property keys searched, in order, for a plot's display number. */
const NUMBER_KEYS = ["number", "plotNumber", "plot_no", "plotNo", "no", "name"];

/**
 * Derives the {@link Plot} documents represented by a converted, enriched
 * FeatureCollection (Req 35.1). Features without polygon geometry are skipped
 * because a plot is a polygon boundary; every polygon/multipolygon feature
 * yields exactly one plot.
 *
 * @param projectId the owning Project_ID, stamped onto each derived plot.
 * @param fc        the converted FeatureCollection (typically post-enrichment).
 * @returns the derived plots, in feature order, with stable unique ids.
 */
export function featuresToPlots(
  projectId: string,
  fc: GeoJSON.FeatureCollection,
): Plot[] {
  const plots: Plot[] = [];

  fc.features.forEach((feature, index) => {
    const polygon = toPolygon(feature.geometry);
    if (!polygon) return; // not a boundary — cannot become a plot

    const props: Record<string, unknown> = (feature.properties ??
      {}) as Record<string, unknown>;

    const id = derivePlotId(feature, props, index);
    const plot: Plot = {
      id,
      projectId,
      number: deriveNumber(props, index),
      status: deriveStatus(props),
      geometry: polygon,
      areaSqm: deriveArea(feature, props),
      centroid: deriveCentroid(feature, props),
    };

    const price = toFiniteNumber(props.price);
    if (price !== undefined) plot.price = price;

    if (typeof props.facing === "string" && props.facing.trim() !== "") {
      plot.facing = props.facing;
    }

    const amenities = toStringArray(props.amenities);
    if (amenities) plot.amenities = amenities;

    if (typeof props.zoneId === "string" && props.zoneId.trim() !== "") {
      plot.zoneId = props.zoneId;
    }

    if (typeof props.customLabel === "string" && props.customLabel.trim() !== "") {
      plot.customLabel = props.customLabel;
    }

    plots.push(plot);
  });

  return plots;
}

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

/**
 * Reduces a feature geometry to a single {@link GeoJSON.Polygon}, or `null`
 * when it has no polygonal boundary. A `MultiPolygon` collapses to its first
 * polygon so a plot always stores a single polygon (per the {@link Plot} model).
 */
function toPolygon(geometry: GeoJSON.Geometry | null): GeoJSON.Polygon | null {
  if (!geometry) return null;
  if (geometry.type === "Polygon") return geometry;
  if (geometry.type === "MultiPolygon") {
    const first = geometry.coordinates[0];
    if (first && first.length > 0) {
      return { type: "Polygon", coordinates: first };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Property derivation
// ---------------------------------------------------------------------------

/**
 * Resolves a stable, unique plot id. Prefers the feature's top-level `id`, then
 * an explicit `id` / `plotId` property; failing that, generates a positional
 * `plot-{index+1}` id so distinct features never collide on upsert.
 */
function derivePlotId(
  feature: GeoJSON.Feature,
  props: Record<string, unknown>,
  index: number,
): string {
  const candidate =
    nonEmptyString(feature.id) ??
    nonEmptyString(props.id) ??
    nonEmptyString(props.plotId);
  return candidate ?? `plot-${index + 1}`;
}

/**
 * Resolves the plot's display number from the first matching property key
 * ({@link NUMBER_KEYS}); falls back to the 1-based feature position when none is
 * present, so the number is always a non-empty string.
 */
function deriveNumber(props: Record<string, unknown>, index: number): string {
  for (const key of NUMBER_KEYS) {
    const value = nonEmptyString(props[key]);
    if (value !== undefined) return value;
  }
  return String(index + 1);
}

/** Reads a valid {@link PlotStatus} from properties, defaulting to available. */
function deriveStatus(props: Record<string, unknown>): PlotStatus {
  const raw = typeof props.status === "string" ? props.status.toLowerCase() : "";
  return (PLOT_STATUSES as readonly string[]).includes(raw)
    ? (raw as PlotStatus)
    : DEFAULT_STATUS;
}

/**
 * Resolves the canonical area in square meters: prefers the enriched `areaSqm`
 * property (Req 34.2) and falls back to a geodesic computation on the feature.
 */
function deriveArea(
  feature: GeoJSON.Feature,
  props: Record<string, unknown>,
): number {
  const enriched = toFiniteNumber(props.areaSqm);
  return enriched ?? geodesicAreaSqm(feature);
}

/**
 * Resolves the centroid: prefers the enriched `centroid` property (Req 34.2)
 * and falls back to a geodesic centroid computed from the feature geometry.
 */
function deriveCentroid(
  feature: GeoJSON.Feature,
  props: Record<string, unknown>,
): GeoJSON.Position {
  const enriched = toPosition(props.centroid);
  return enriched ?? geodesicCentroid(feature);
}

// ---------------------------------------------------------------------------
// Coercion helpers
// ---------------------------------------------------------------------------

/** Returns a trimmed, non-empty string view of a value, or `undefined`. */
function nonEmptyString(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return undefined;
}

/** Parses a finite number from a number/string value, else `undefined`. */
function toFiniteNumber(value: unknown): number | undefined {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

/** Narrows a value to a 2+ component finite-number Position, else `undefined`. */
function toPosition(value: unknown): GeoJSON.Position | undefined {
  if (!Array.isArray(value) || value.length < 2) return undefined;
  const coords = value.slice(0, value.length).map((n) => Number(n));
  if (coords.some((n) => !Number.isFinite(n))) return undefined;
  return coords;
}

/** Returns an array of the value's string members, or `undefined` if not an array. */
function toStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const strings = value.filter((v): v is string => typeof v === "string");
  return strings;
}
