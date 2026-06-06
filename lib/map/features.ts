/**
 * Pure builders that turn domain Plots/Zones into the GeoJSON feature
 * collections bound to the Map_Renderer's `plots` and `zones` sources.
 *
 * These are framework-free and do no I/O, so they can be unit-tested directly.
 * Plot features reuse `plotToFeature` from `lib/mapSource.ts` (so feature ids
 * line up with the real-time delta merge, Req 24.2) and additionally precompute
 * the plot `label` property using the Project's configured label format
 * (Req 7.1) via `formatPlotLabel`. Doing the formatting once in TypeScript
 * keeps the label layer's `text-field` a simple `["get", "label"]` lookup.
 *
 * Requirements: 6.1, 7.1, 9.1, 9.2, 24.2.
 */

import { GeoJSON } from "@/lib/geojson";
import { formatPlotLabel } from "@/lib/labels";
import { plotToFeature } from "@/lib/mapSource";
import { formatArea } from "@/lib/units";
import type { LabelFormat, Plot, Unit, Zone } from "@/lib/types";

/**
 * Converts a single {@link Plot} into a plot-source feature with its display
 * `label` precomputed for the given format and unit (Req 7.1).
 *
 * The geometry, id, and base properties come from {@link plotToFeature}; this
 * adds a `label` property so the `plot-label` layer can render it via a plain
 * `["get", "label"]` expression.
 */
export function plotToLabeledFeature(
  plot: Plot,
  format: LabelFormat,
  unit: Unit,
): GeoJSON.Feature<GeoJSON.Polygon> {
  const feature = plotToFeature(plot);
  return {
    ...feature,
    properties: {
      ...feature.properties,
      label: formatPlotLabel(plot, format, unit),
      area_yd: formatArea(plot.areaSqm, "sqyd").replace("sq yd", "yd²"),
      area_m: formatArea(plot.areaSqm, "sqm").replace("sq m", "m²"),
    },
  };
}

/**
 * Builds the `plots` source FeatureCollection from the current plot inventory,
 * labeling each feature with the configured format and active unit (Req 6.1,
 * 7.1). Feeding the result to `source.setData(...)` updates the existing source
 * in place rather than recreating it (Req 24.2).
 */
export function buildPlotsFeatureCollection(
  plots: readonly Plot[],
  format: LabelFormat,
  unit: Unit,
): GeoJSON.FeatureCollection<GeoJSON.Polygon> {
  return {
    type: "FeatureCollection",
    features: plots.map((plot) => plotToLabeledFeature(plot, format, unit)),
  };
}

/**
 * Converts a single {@link Zone} into a zone-source feature. The zone `name`
 * is carried in `properties` so the `zone-label` layer can render it (Req 9.2),
 * and the feature id is the zone id.
 */
export function zoneToFeature(zone: Zone): GeoJSON.Feature<GeoJSON.Polygon> {
  return {
    type: "Feature",
    id: zone.id,
    geometry: zone.geometry,
    properties: {
      id: zone.id,
      name: zone.name,
    },
  };
}

/**
 * Builds the `zones` source FeatureCollection from the project's zones
 * (Req 9.1, 9.2).
 */
export function buildZonesFeatureCollection(
  zones: readonly Zone[],
): GeoJSON.FeatureCollection<GeoJSON.Polygon> {
  return {
    type: "FeatureCollection",
    features: zones.map(zoneToFeature),
  };
}
