/**
 * Pure Mapbox layer-style and source spec builders (framework-free).
 *
 * This module holds the *declarative* pieces of the Map_Renderer's layer stack
 * so they can be unit-tested with a mock map without booting Mapbox GL or a
 * browser (task 14.4). It contains no I/O and never touches a live map — every
 * function returns a plain spec object or a Mapbox expression array.
 *
 * The layer stack is ordered so Zone layers render *behind* Plot layers
 * (Req 9.3). Plot fill color is data-driven by the `status` feature property
 * (Req 6.2–6.5) via a Mapbox `match`/`get` expression, and the fill opacity
 * reads the `hover` feature-state so a hovered plot brightens (Req 8.1, 8.2).
 * The plot outline width reads the `selected` feature-state so a selected
 * plot's outline is drawn thicker than unselected plots (Req 6.7). This module
 * also builds the status/zone layer `filter` expression (Req 12.3–12.5) and the
 * 3D `building-extrusions` fill-extrusion layer (Req 5.3). The interactions
 * that toggle feature-state, apply filters, and switch on 3D are wired in the
 * Map_Renderer (task 14.2); this module only provides the declarative pieces.
 *
 * Requirements: 4.1, 5.3, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 7.1, 8.1, 8.2,
 * 9.1, 9.2, 9.3, 12.3, 12.4, 12.5.
 */

import type {
  ExpressionSpecification,
  FillExtrusionLayerSpecification,
  FillLayerSpecification,
  FilterSpecification,
  LineLayerSpecification,
  SymbolLayerSpecification,
} from "mapbox-gl";
import type { StatusFilter } from "@/lib/filters";
import type { PlotStatus } from "@/lib/types";

// ---------------------------------------------------------------------------
// Base map styles (Req 4.1–4.3)
// ---------------------------------------------------------------------------

/**
 * Base map style URLs. The Project_Viewer loads on the satellite style by
 * default (Req 4.1); task 14.2 wires the satellite/street toggle (Req 4.2–4.3)
 * using these same constants.
 */
export const MAP_STYLES = {
  /** Satellite imagery with road/place labels. */
  satellite: "mapbox://styles/mapbox/satellite-streets-v12",
  /** Dark style used for the plain default map view. */
  dark: "mapbox://styles/mapbox/dark-v11",
} as const;

/** The base map style shown on first load. */
export const DEFAULT_MAP_STYLE = MAP_STYLES.satellite;

// ---------------------------------------------------------------------------
// Source and layer identifiers
// ---------------------------------------------------------------------------

/** GeoJSON source id backing every plot layer. */
export const PLOTS_SOURCE_ID = "plots";
/** GeoJSON source id backing every zone layer. */
export const ZONES_SOURCE_ID = "zones";

/** Stable ids for each layer in the stack, ordered zones-behind-plots. */
export const LAYER_IDS = {
  buildingExtrusion: "building-extrusions",
  zoneFill: "zone-fill",
  zoneOutline: "zone-outline",
  zoneLabel: "zone-label",
  plotFill: "plot-fill",
  plotOutline: "plot-outline",
  plotLabel: "plot-label",
} as const;

// ---------------------------------------------------------------------------
// Status -> color mapping (Req 6.2–6.5)
// ---------------------------------------------------------------------------

/**
 * Plot fill color per Plot_Status. These mirror the `status.*` palette defined
 * in `tailwind.config.ts` so the map and the UI chrome stay visually in sync:
 *
 * - available → green (Req 6.2)
 * - sold      → red   (Req 6.3)
 * - reserved  → amber (Req 6.4)
 * - blocked   → gray  (Req 6.5)
 */
export const STATUS_COLORS: Record<PlotStatus, string> = {
  available: "#16a34a", // green  (Req 6.2)
  sold: "#dc2626", // red    (Req 6.3)
  reserved: "#f59e0b", // amber  (Req 6.4)
  blocked: "#6b7280", // gray   (Req 6.5)
};

/** Fallback fill color for an unrecognized/missing status. */
export const UNKNOWN_STATUS_COLOR = "#9ca3af";

/**
 * Resolves the fill color for a single status (Req 6.2–6.5).
 *
 * Exposed as a plain function so the status→color mapping can be asserted
 * directly in unit tests (task 14.4) without evaluating a Mapbox expression.
 * An unknown status resolves to {@link UNKNOWN_STATUS_COLOR}.
 */
export function statusFillColor(status: PlotStatus | string): string {
  return (STATUS_COLORS as Record<string, string>)[status] ?? UNKNOWN_STATUS_COLOR;
}

// ---------------------------------------------------------------------------
// Data-driven expressions
// ---------------------------------------------------------------------------

/**
 * Builds the data-driven `fill-color` expression that colors each plot by its
 * `status` property (Req 6.2–6.5).
 *
 * Produces a Mapbox `match` expression over `["get", "status"]` with one arm
 * per Plot_Status and {@link UNKNOWN_STATUS_COLOR} as the default, so the color
 * is computed per-feature by the GPU without recreating the source on changes.
 */
export function plotFillColorExpression(showStatusColors: boolean = true): ExpressionSpecification {
  const baseColors = showStatusColors ? [
    "match",
    ["get", "status"],
    "available",
    STATUS_COLORS.available,
    "sold",
    STATUS_COLORS.sold,
    "reserved",
    STATUS_COLORS.reserved,
    "blocked",
    STATUS_COLORS.blocked,
    UNKNOWN_STATUS_COLOR,
  ] : ["literal", "#e5ddc5"];

  return [
    "case",
    ["boolean", ["feature-state", "selected"], false],
    "#3b82f6", // Vivid blue for selected state
    baseColors
  ] as ExpressionSpecification;
}

/** Outline width (px) for an unselected plot. */
export const PLOT_OUTLINE_WIDTH = 1;
/** Outline width (px) for the selected plot — thicker than unselected (Req 6.7). */
export const PLOT_OUTLINE_WIDTH_SELECTED = 3;

/**
 * Builds the `line-width` expression for the plot outline (Req 6.6) that draws
 * the selected plot's outline thicker than unselected plots (Req 6.7).
 *
 * The width reads the `selected` feature-state: when truthy the outline uses
 * {@link PLOT_OUTLINE_WIDTH_SELECTED}, otherwise {@link PLOT_OUTLINE_WIDTH}.
 * Task 14.2 toggles that feature-state on click; this only sets up the
 * expression so the renderer responds to it.
 */
export function plotOutlineWidthExpression(): ExpressionSpecification {
  return [
    "case",
    ["boolean", ["feature-state", "selected"], false],
    PLOT_OUTLINE_WIDTH_SELECTED,
    PLOT_OUTLINE_WIDTH,
  ];
}

/** Base plot fill opacity for an unhovered plot. */
export const PLOT_FILL_OPACITY = 0.55;
/** Plot fill opacity while hovered — brighter to give hover feedback (Req 8.1). */
export const PLOT_FILL_OPACITY_HOVER = 0.8;

/**
 * Builds the `fill-opacity` expression that brightens a plot while the pointer
 * hovers over it (Req 8.1, 8.2).
 *
 * The opacity reads the `hover` feature-state: when truthy the fill uses
 * {@link PLOT_FILL_OPACITY_HOVER}, otherwise {@link PLOT_FILL_OPACITY}. Task
 * 14.2 sets/clears that feature-state on mouseenter/mousemove/mouseleave; this
 * only sets up the expression so the renderer responds to it.
 */
export function plotFillOpacityExpression(): ExpressionSpecification {
  return [
    "case",
    ["boolean", ["feature-state", "hover"], false],
    PLOT_FILL_OPACITY_HOVER,
    PLOT_FILL_OPACITY,
  ];
}

// ---------------------------------------------------------------------------
// Status / zone filter expressions (Req 12.3, 12.4, 12.5)
// ---------------------------------------------------------------------------

/**
 * Builds the Mapbox `filter` expression applied to the plot layers so only the
 * plots matching the active status and zone selection remain visible.
 *
 * - A `status` of `"all"` imposes no status restriction (Req 12.4); any
 *   concrete {@link PlotStatus} keeps only plots whose `status` property equals
 *   it (Req 12.3).
 * - A non-null `zoneId` keeps only plots whose `zoneId` property equals it
 *   (Req 12.5); `null` imposes no zone restriction.
 * - When neither restriction applies the function returns `null`, meaning the
 *   layer filter should be cleared so every plot is shown.
 *
 * When both restrictions apply they are combined with `all` (logical AND), so
 * the visible plots are exactly those satisfying both — mirroring the
 * intersection of {@link filterByStatus} and {@link filterByZone}.
 */
export function buildPlotFilter(
  status: StatusFilter = "all",
  zoneId: string | null = null,
): FilterSpecification | null {
  const clauses: ExpressionSpecification[] = [];
  if (status !== "all") {
    clauses.push(["==", ["get", "status"], status]);
  }
  if (zoneId !== null) {
    clauses.push(["==", ["get", "zoneId"], zoneId]);
  }
  if (clauses.length === 0) return null;
  if (clauses.length === 1) return clauses[0]!;
  return ["all", ...clauses];
}

/** Plot layer ids the status/zone filter is applied to (Req 12.3–12.5). */
export const FILTERABLE_PLOT_LAYER_IDS = [
  LAYER_IDS.plotFill,
  LAYER_IDS.plotOutline,
  LAYER_IDS.plotLabel,
] as const;

// ---------------------------------------------------------------------------
// Zone layer specs (Req 9.1, 9.2)
// ---------------------------------------------------------------------------

/** Neutral color used for zone fill, outline, and label rendering. */
export const ZONE_COLOR = "#38bdf8";
/** Dash pattern (in line-widths) for the dashed zone outline (Req 9.1). */
export const ZONE_DASH_ARRAY: [number, number] = [2, 2];

/** Builds the translucent zone fill layer (drawn behind plots, Req 9.3). */
export function buildZoneFillLayer(): FillLayerSpecification {
  return {
    id: LAYER_IDS.zoneFill,
    type: "fill",
    source: ZONES_SOURCE_ID,
    paint: {
      "fill-color": ZONE_COLOR,
      "fill-opacity": 0.06,
    },
  };
}

/** Builds the dashed zone outline layer (Req 9.1). */
export function buildZoneOutlineLayer(): LineLayerSpecification {
  return {
    id: LAYER_IDS.zoneOutline,
    type: "line",
    source: ZONES_SOURCE_ID,
    layout: {
      "line-join": "round",
    },
    paint: {
      "line-color": ZONE_COLOR,
      "line-width": 2,
      "line-dasharray": ZONE_DASH_ARRAY, // dashed (Req 9.1)
    },
  };
}

/** Builds the zone label layer rendering each zone's `name` (Req 9.2). */
export function buildZoneLabelLayer(): SymbolLayerSpecification {
  return {
    id: LAYER_IDS.zoneLabel,
    type: "symbol",
    source: ZONES_SOURCE_ID,
    layout: {
      "text-field": ["coalesce", ["get", "name"], ""],
      "text-size": 14,
      "symbol-placement": "point",
    },
    paint: {
      "text-color": "#e0f2fe",
      "text-halo-color": "#0c4a6e",
      "text-halo-width": 1.2,
    },
  };
}

// ---------------------------------------------------------------------------
// 3D building extrusions (Req 5.3)
// ---------------------------------------------------------------------------

/** Initial pitch (degrees) for the flat 2D view (Req 5.2). */
export const PITCH_2D = 0;
/** Pitch (degrees) applied when 3D view is enabled (Req 5.1). */
export const PITCH_3D = 60;

/**
 * Builds the fill-extrusion building layer rendered while 3D view is enabled
 * (Req 5.3).
 *
 * Mapbox's standard `composite` vector source exposes a `building` source-layer
 * with `height`/`min_height` attributes; this extrudes those footprints. The
 * layer is created with `visibility: "none"` so it stays hidden in 2D; task
 * 14.2 toggles visibility together with the pitch when 3D is enabled/disabled.
 */
export function buildBuildingExtrusionLayer(): FillExtrusionLayerSpecification {
  return {
    id: LAYER_IDS.buildingExtrusion,
    type: "fill-extrusion",
    source: "composite",
    "source-layer": "building",
    minzoom: 14,
    filter: ["==", ["get", "extrude"], "true"],
    layout: {
      visibility: "none",
    },
    paint: {
      "fill-extrusion-color": "#aaa",
      "fill-extrusion-height": ["get", "height"],
      "fill-extrusion-base": ["get", "min_height"],
      "fill-extrusion-opacity": 0.6,
    },
  };
}

// ---------------------------------------------------------------------------
// Plot layer specs (Req 6.1, 6.6, 7.1)
// ---------------------------------------------------------------------------

/** Builds the plot fill layer with data-driven status color (Req 6.1–6.5). */
export function buildPlotFillLayer(): FillLayerSpecification {
  return {
    id: LAYER_IDS.plotFill,
    type: "fill",
    source: PLOTS_SOURCE_ID,
    paint: {
      "fill-color": plotFillColorExpression(true),
      "fill-opacity": plotFillOpacityExpression(),
    },
  };
}

/** Builds the plot outline layer with selection-aware width (Req 6.6, 6.7). */
export function buildPlotOutlineLayer(): LineLayerSpecification {
  return {
    id: LAYER_IDS.plotOutline,
    type: "line",
    source: PLOTS_SOURCE_ID,
    layout: {
      "line-join": "round",
    },
    paint: {
      "line-color": "#ffffff",
      "line-width": plotOutlineWidthExpression(),
    },
  };
}

/**
 * Builds the plot label layer.
 *
 * The label text is read from a precomputed `label` feature property so the
 * configured Project label format (Req 7.1) is applied once, in TypeScript,
 * via `formatPlotLabel` rather than reimplemented as a Mapbox expression.
 */
export function buildPlotLabelLayer(): SymbolLayerSpecification {
  return {
    id: LAYER_IDS.plotLabel,
    type: "symbol",
    source: PLOTS_SOURCE_ID,
    layout: {
      "text-field": [
        "case",
        ["boolean", ["feature-state", "selected"], false],
        [
          "format",
          ["to-string", ["get", "number"]], { "font-scale": 1.2 },
          "\n", {},
          ["to-string", ["get", "area_yd"]], { "font-scale": 0.8 },
          "\n", {},
          ["to-string", ["get", "area_m"]], { "font-scale": 0.8 }
        ],
        ["to-string", ["get", "number"]]
      ],
      "text-size": 14,
      "symbol-placement": "point",
    },
    paint: {
      "text-color": "#ffffff",
      "text-halo-color": "#111827",
      "text-halo-width": 1.2,
    },
  };
}

// ---------------------------------------------------------------------------
// Ordered layer stack (Req 9.3)
// ---------------------------------------------------------------------------

/** A layer spec accepted by `map.addLayer`. */
export type PlotVerseLayerSpec =
  | FillExtrusionLayerSpecification
  | FillLayerSpecification
  | LineLayerSpecification
  | SymbolLayerSpecification;

/**
 * Returns the full layer stack in render order. The 3D building-extrusion layer
 * is added first (it stays hidden until 3D is enabled, Req 5.3), then Zone
 * layers so they are drawn behind the plot layers (Req 9.3): zone fill, zone
 * outline (dashed), zone label, then plot fill (status color + hover opacity),
 * plot outline (selection width), and plot label.
 */
export function buildLayerStack(): PlotVerseLayerSpec[] {
  return [
    buildBuildingExtrusionLayer(),
    buildZoneFillLayer(),
    buildZoneOutlineLayer(),
    buildZoneLabelLayer(),
    buildPlotFillLayer(),
    buildPlotOutlineLayer(),
    buildPlotLabelLayer(),
  ];
}
