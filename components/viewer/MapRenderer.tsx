"use client";

/**
 * Map_Renderer — full implementation (tasks 14.1, 14.2, 14.3).
 *
 * Owns the Mapbox GL map for the Project_Viewer. Initializes on satellite
 * style, builds the full layer stack (zones behind plots), wires all
 * interactions (hover, click-to-select, filter, 3D, style-switch, GPS dot,
 * dimension labels, fit-bounds, fly-to), and exposes an imperative handle
 * for real-time plot/zone updates from the parent.
 *
 * Requirements: 4.1–4.4, 5.1–5.3, 6.1–6.7, 7.1, 8.1–8.4, 9.1–9.3,
 *               12.3–12.5, 24.2, 24.3, 26, 27, 29.
 */

import mapboxgl, {
  type GeoJSONSource,
  type Map as MapboxMap,
  type LngLatBoundsLike,
} from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";

import { GeoJSON } from "@/lib/geojson";
import { applyDelta, featureId, type PlotDelta } from "@/lib/mapSource";
import {
  buildPlotsFeatureCollection,
  buildZonesFeatureCollection,
  plotToLabeledFeature,
} from "@/lib/map/features";
import {
  buildLayerStack,
  buildBuildingExtrusionLayer,
  DEFAULT_MAP_STYLE,
  FILTERABLE_PLOT_LAYER_IDS,
  LAYER_IDS,
  MAP_STYLES,
  PITCH_2D,
  PITCH_3D,
  PLOTS_SOURCE_ID,
  ZONES_SOURCE_ID,
  buildPlotFilter,
  plotFillColorExpression,
} from "@/lib/map/layers";
import type { LabelFormat, Plot, Project, Unit, Zone } from "@/lib/types";
import type { StatusFilter } from "@/lib/filters";
import { edgeDimensions } from "@/lib/geo/turfUtils";
import type { UserLocation } from "@/hooks/useUserLocation";

// ─── Public API ─────────────────────────────────────────────────────────────

export interface MapRendererHandle {
  applyPlotDelta(delta: PlotDelta): void;
  upsertPlot(plot: Plot): void;
  removePlot(plotId: string): void;
  setPlots(plots: readonly Plot[]): void;
  setZones(zones: readonly Zone[]): void;
  getMap(): MapboxMap | null;
  /** Fly to a plot's centroid and highlight it. */
  flyToPlot(plot: Plot): void;
  /** Clear the current plot selection. */
  clearSelection(): void;
  /** Apply a status/zone filter to the plot layers. */
  applyFilter(status: StatusFilter, zoneId?: string | null): void;
  /** Toggle 3D view on/off. */
  toggle3D(enable: boolean): void;
  /** Switch between satellite and street map style. */
  switchStyle(style: "satellite" | "street"): void;
  /** Fly back to the project center. */
  flyToCenter(): void;
  /** Fit map bounds to show all plots. */
  fitBounds(): void;
  /** Update the GPS user-location dot. */
  setUserLocation(loc: UserLocation | null): void;
  /** Toggle status color shading on plots. */
  setStatusColorsEnabled(enable: boolean): void;
}

export interface MapRendererProps {
  project: Pick<Project, "center" | "defaultZoom" | "labelFormat" | "imageOverlay">;
  plots:   readonly Plot[];
  zones:   readonly Zone[];
  unit:    Unit;
  className?: string;
  onPlotClick?(plotId: string): void;
}

function readMapboxToken(): string {
  return process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
}

// ─── Component ──────────────────────────────────────────────────────────────

function MapRendererImpl(
  { project, plots, zones, unit, className, onPlotClick }: MapRendererProps,
  ref: React.Ref<MapRendererHandle>,
) {
  const containerRef  = useRef<HTMLDivElement | null>(null);
  const mapRef        = useRef<MapboxMap | null>(null);
  const styleReadyRef = useRef(false);
  const is3DRef       = useRef(false);
  const hoveredIdRef  = useRef<string | number | null>(null);
  const selectedIdRef = useRef<string | number | null>(null);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const dimMarkersRef = useRef<mapboxgl.Marker[]>([]);

  // Prop mirrors in refs so effects don't need deps
  const plotsRef  = useRef<readonly Plot[]>(plots);
  const zonesRef  = useRef<readonly Zone[]>(zones);
  const formatRef = useRef<LabelFormat>(project.labelFormat);
  const unitRef   = useRef<Unit>(unit);
  const centerRef = useRef(project.center);
  const projectRef = useRef(project);
  const onPlotClickRef = useRef(onPlotClick);

  const DIMENSIONS_SOURCE_ID = "dimensions-source";
  onPlotClickRef.current = onPlotClick;

  const plotsFcRef = useRef<GeoJSON.FeatureCollection<GeoJSON.Polygon>>({
    type: "FeatureCollection",
    features: [],
  });

  const token = readMapboxToken();

  // ── Source helpers ──────────────────────────────────────────────────────

  const writePlotsSource = (fc: GeoJSON.FeatureCollection<GeoJSON.Polygon>) => {
    plotsFcRef.current = fc;
    const map = mapRef.current;
    if (!map || !styleReadyRef.current) return;
    const src = map.getSource(PLOTS_SOURCE_ID) as GeoJSONSource | undefined;
    src?.setData(fc as unknown as GeoJSON.FeatureCollection);
  };

  const writeZonesSource = (fc: GeoJSON.FeatureCollection<GeoJSON.Polygon>) => {
    const map = mapRef.current;
    if (!map || !styleReadyRef.current) return;
    const src = map.getSource(ZONES_SOURCE_ID) as GeoJSONSource | undefined;
    src?.setData(fc as unknown as GeoJSON.FeatureCollection);
  };

  const rebuildSources = () => {
    writePlotsSource(buildPlotsFeatureCollection(plotsRef.current, formatRef.current, unitRef.current));
    writeZonesSource(buildZonesFeatureCollection(zonesRef.current));
  };

  // ── Dimension labels ────────────────────────────────────────────────────

  function clearDimLabels() {
    const map = mapRef.current;
    if (!map || !styleReadyRef.current) return;
    const src = map.getSource(DIMENSIONS_SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
    if (src) src.setData({ type: "FeatureCollection", features: [] });
  }

  function renderDimLabels() {
    const map = mapRef.current;
    if (!map || !styleReadyRef.current) return;
    
    if (map.getZoom() < 18 || selectedIdRef.current === null) {
      clearDimLabels();
      return;
    }
    
    const selectedPlot = plotsRef.current.find((p) => p.id === selectedIdRef.current);
    if (!selectedPlot) {
      clearDimLabels();
      return;
    }

    const dims = edgeDimensions(selectedPlot.geometry);
    const features: GeoJSON.Feature<GeoJSON.LineString>[] = dims.map((d) => ({
      type: "Feature",
      geometry: { type: "LineString", coordinates: [d.start, d.end] },
      properties: { lengthM: `${d.lengthM.toFixed(1)} m` },
    }));

    const src = map.getSource(DIMENSIONS_SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
    if (src) src.setData({ type: "FeatureCollection", features });
  }

  // ── User location dot ───────────────────────────────────────────────────

  function updateUserDot(loc: UserLocation | null) {
    const map = mapRef.current;
    if (!map) return;
    if (!loc) {
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      return;
    }
    if (!userMarkerRef.current) {
      const el = document.createElement("div");
      el.className = "user-location-dot";
      userMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: "center" }).addTo(map);
    }
    userMarkerRef.current.setLngLat([loc.lng, loc.lat]);
  }

  // ── Style load handler (re-adds layers after style switch) ──────────────

  function handleStyleLoad(map: MapboxMap) {
    if (!map.getSource(ZONES_SOURCE_ID)) {
      map.addSource(ZONES_SOURCE_ID, {
        type: "geojson",
        data: buildZonesFeatureCollection(zonesRef.current) as unknown as GeoJSON.FeatureCollection,
      });
    }
    if (!map.getSource(PLOTS_SOURCE_ID)) {
      map.addSource(PLOTS_SOURCE_ID, {
        type: "geojson",
        data: buildPlotsFeatureCollection(plotsRef.current, formatRef.current, unitRef.current) as unknown as GeoJSON.FeatureCollection,
      });
    }
    
    const currentProject = projectRef.current;
    if (currentProject.imageOverlay) {
      if (!map.getSource("project-overlay")) {
        map.addSource("project-overlay", {
          type: "image",
          url: currentProject.imageOverlay.url,
          coordinates: currentProject.imageOverlay.coordinates,
        });
      }
      if (!map.getLayer("project-overlay-layer")) {
        map.addLayer({
          id: "project-overlay-layer",
          type: "raster",
          source: "project-overlay",
          paint: {
            "raster-opacity": 1.0,
            "raster-fade-duration": 0,
          },
        });
      }
    }

    for (const layer of buildLayerStack()) {
      if (!map.getLayer(layer.id)) map.addLayer(layer);
    }

    if (!map.getSource(DIMENSIONS_SOURCE_ID)) {
      map.addSource(DIMENSIONS_SOURCE_ID, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] }
      });
    }

    if (!map.getLayer("dimension-lines")) {
      map.addLayer({
        id: "dimension-lines",
        type: "line",
        source: DIMENSIONS_SOURCE_ID,
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": "rgba(255,255,255,0.7)",
          "line-width": 1.5,
          "line-dasharray": [3, 3],
        }
      });
    }

    if (!map.getLayer("dimension-labels")) {
      map.addLayer({
        id: "dimension-labels",
        type: "symbol",
        source: DIMENSIONS_SOURCE_ID,
        layout: {
          "symbol-placement": "line",
          "text-field": ["get", "lengthM"],
          "text-size": 11,
          "text-offset": [0, -0.6],
          "text-anchor": "bottom",
          "text-keep-upright": true,
        },
        paint: {
          "text-color": "rgba(255,255,255,0.95)",
          "text-halo-color": "rgba(0,0,0,0.8)",
          "text-halo-width": 1,
        }
      });
    }

    styleReadyRef.current = true;
    rebuildSources();
    renderDimLabels();

    // Auto-fit to overlay on style load
    if (currentProject.imageOverlay) {
      const coords = currentProject.imageOverlay.coordinates;
      const lngs = coords.map((c: number[]) => c[0]!);
      const lats = coords.map((c: number[]) => c[1]!);
      map.fitBounds(
        [
          [Math.min(...lngs), Math.min(...lats)],
          [Math.max(...lngs), Math.max(...lats)],
        ],
        { padding: 40, duration: 600 },
      );
    }
  }

  // ── Imperative handle ───────────────────────────────────────────────────

  useImperativeHandle(ref, (): MapRendererHandle => ({
    applyPlotDelta(delta) {
      const next = applyDelta(plotsFcRef.current, delta);
      writePlotsSource(next as GeoJSON.FeatureCollection<GeoJSON.Polygon>);
    },
    upsertPlot(plot) {
      const feature = plotToLabeledFeature(plot, formatRef.current, unitRef.current);
      const delta: PlotDelta = {
        type: featureId(feature) ? "modify" : "add",
        plotId: plot.id,
        feature,
      };
      writePlotsSource(applyDelta(plotsFcRef.current, delta) as GeoJSON.FeatureCollection<GeoJSON.Polygon>);
    },
    removePlot(plotId) {
      writePlotsSource(applyDelta(plotsFcRef.current, { type: "remove", plotId }) as GeoJSON.FeatureCollection<GeoJSON.Polygon>);
    },
    setPlots(nextPlots) {
      plotsRef.current = nextPlots;
      writePlotsSource(buildPlotsFeatureCollection(nextPlots, formatRef.current, unitRef.current));
    },
    setZones(nextZones) {
      zonesRef.current = nextZones;
      writeZonesSource(buildZonesFeatureCollection(nextZones));
    },
    getMap() { return mapRef.current; },
    flyToPlot(plot) {
      const map = mapRef.current;
      if (!map) return;
      const [lng, lat] = plot.centroid as [number, number];
      map.flyTo({ center: [lng, lat], zoom: 19, duration: 800 });
      // Clear previous selection
      if (selectedIdRef.current !== null) {
        map.setFeatureState({ source: PLOTS_SOURCE_ID, id: selectedIdRef.current }, { selected: false });
      }
      selectedIdRef.current = plot.id;
      map.setFeatureState({ source: PLOTS_SOURCE_ID, id: plot.id }, { selected: true });
      renderDimLabels();
    },
    clearSelection() {
      const map = mapRef.current;
      if (!map) return;
      if (selectedIdRef.current !== null) {
        map.setFeatureState({ source: PLOTS_SOURCE_ID, id: selectedIdRef.current }, { selected: false });
        selectedIdRef.current = null;
        renderDimLabels();
      }
    },
    applyFilter(status, zoneId = null) {
      const map = mapRef.current;
      if (!map || !styleReadyRef.current) return;
      const filterExpr = buildPlotFilter(status, zoneId);
      for (const layerId of FILTERABLE_PLOT_LAYER_IDS) {
        if (filterExpr) map.setFilter(layerId, filterExpr);
        else            map.setFilter(layerId, null);
      }
    },
    toggle3D(enable) {
      const map = mapRef.current;
      if (!map) return;
      is3DRef.current = enable;
      map.easeTo({ pitch: enable ? PITCH_3D : PITCH_2D, bearing: enable ? -20 : 0, duration: 800 });
      if (styleReadyRef.current) {
        // Add extrusion layer when enabling 3D; it was added hidden in buildLayerStack
        const extrusionId = LAYER_IDS.buildingExtrusion;
        if (map.getLayer(extrusionId)) {
          map.setLayoutProperty(extrusionId, "visibility", enable ? "visible" : "none");
        } else if (enable) {
          map.addLayer(buildBuildingExtrusionLayer());
        }
      }
    },
    switchStyle(style) {
      const map = mapRef.current;
      if (!map) return;
      styleReadyRef.current = false;
      map.setStyle(style === "satellite" ? MAP_STYLES.satellite : MAP_STYLES.dark);
      map.once("style.load", () => handleStyleLoad(map));
    },
    flyToCenter() {
      const map = mapRef.current;
      if (!map) return;
      const [lng, lat] = centerRef.current as [number, number];
      map.flyTo({ center: [lng, lat], zoom: project.defaultZoom, duration: 800 });
    },
    fitBounds() {
      const map = mapRef.current;
      if (!map) return;
      let bounds: LngLatBoundsLike;
      
      const currentProject = projectRef.current;
      if (currentProject.imageOverlay) {
        const coords = currentProject.imageOverlay.coordinates;
        const lngs = coords.map((c: number[]) => c[0]!);
        const lats = coords.map((c: number[]) => c[1]!);
        bounds = [
          [Math.min(...lngs), Math.min(...lats)],
          [Math.max(...lngs), Math.max(...lats)]
        ];
        map.fitBounds(bounds, { padding: 40, duration: 800 });
      } else if (plotsRef.current.length > 0) {
        const lngs = plotsRef.current.map((p) => (p.centroid as [number, number])[0]);
        const lats  = plotsRef.current.map((p) => (p.centroid as [number, number])[1]);
        bounds = [
          [Math.min(...lngs) - 0.001, Math.min(...lats) - 0.001],
          [Math.max(...lngs) + 0.001, Math.max(...lats) + 0.001],
        ];
        map.fitBounds(bounds, { padding: 60, maxZoom: 18, duration: 800 });
      }
    },
    setUserLocation(loc) { updateUserDot(loc); },
    setStatusColorsEnabled(enable) {
      const map = mapRef.current;
      if (!map || !styleReadyRef.current) return;
      map.setPaintProperty(LAYER_IDS.plotFill, "fill-color", plotFillColorExpression(enable));
    },
  }));

  // ── Map initialization ──────────────────────────────────────────────────

  useEffect(() => {
    if (!token || !containerRef.current) return;

    mapboxgl.accessToken = token;
    const [lng, lat] = project.center as [number, number];
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: DEFAULT_MAP_STYLE,
      center: [lng, lat],
      zoom: project.defaultZoom,
      pitch: 0,
      attributionControl: false,
      antialias: true,
    });
    mapRef.current = map;
    // Override Mapbox default grab cursor
    map.getCanvas().style.cursor = "default";

    map.on("style.load", () => handleStyleLoad(map));

    // Hover state
    map.on("mousemove", LAYER_IDS.plotFill, (e) => {
      const feat = e.features?.[0];
      if (!feat) return;
      const id = feat.id;
      if (hoveredIdRef.current !== null && hoveredIdRef.current !== id) {
        map.setFeatureState({ source: PLOTS_SOURCE_ID, id: hoveredIdRef.current }, { hover: false });
      }
      hoveredIdRef.current = id ?? null;
      if (id !== undefined) {
        map.setFeatureState({ source: PLOTS_SOURCE_ID, id }, { hover: true });
      }
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", LAYER_IDS.plotFill, () => {
      if (hoveredIdRef.current !== null) {
        map.setFeatureState({ source: PLOTS_SOURCE_ID, id: hoveredIdRef.current }, { hover: false });
      }
      hoveredIdRef.current = null;
      map.getCanvas().style.cursor = "default";
    });

    // Pointer cursor on image overlay hover (for raster image interactivity)
    map.on("mousemove", (e) => {
      const vectorFeats = map.queryRenderedFeatures(e.point, { layers: [LAYER_IDS.plotFill] });
      if (vectorFeats.length > 0) return; // already handled above
      const { lng, lat } = e.lngLat;
      const plots = plotsRef.current;
      const hit = plots.some((plot) => {
        const ring = plot.geometry.coordinates[0];
        if (!ring) return false;
        const lngs = ring.map((c: number[]) => c[0]!);
        const lats  = ring.map((c: number[]) => c[1]!);
        return lng >= Math.min(...lngs) && lng <= Math.max(...lngs) &&
               lat >= Math.min(...lats) && lat <= Math.max(...lats);
      });
      map.getCanvas().style.cursor = hit ? "pointer" : "default";
    });

    // Click to select
    map.on("click", LAYER_IDS.plotFill, (e) => {
      const feat = e.features?.[0];
      if (!feat) return;
      const plotId = feat.properties?.["id"] as string | undefined;
      const id     = feat.id;
      // Deselect previous
      if (selectedIdRef.current !== null) {
        map.setFeatureState({ source: PLOTS_SOURCE_ID, id: selectedIdRef.current }, { selected: false });
      }
      selectedIdRef.current = id ?? null;
      if (id !== undefined) {
        map.setFeatureState({ source: PLOTS_SOURCE_ID, id }, { selected: true });
      }
      renderDimLabels();
      if (plotId) onPlotClickRef.current?.(plotId);
    });

    // Fallback click: hit-test plots by lngLat for the image overlay
    // (raster image layers don't emit feature events, so we do it manually)
    map.on("click", (e) => {
      // If we already handled a vector feature click above, skip
      const vectorFeats = map.queryRenderedFeatures(e.point, { layers: [LAYER_IDS.plotFill] });
      if (vectorFeats.length > 0) return;

      const { lng, lat } = e.lngLat;
      const plots = plotsRef.current;
      for (const plot of plots) {
        const ring = plot.geometry.coordinates[0];
        if (!ring) continue;
        const lngs = ring.map((c: number[]) => c[0]!);
        const lats  = ring.map((c: number[]) => c[1]!);
        if (
          lng >= Math.min(...lngs) && lng <= Math.max(...lngs) &&
          lat >= Math.min(...lats) && lat <= Math.max(...lats)
        ) {
          onPlotClickRef.current?.(plot.id);
          return;
        }
      }
    });

    // Zoom → dimension labels
    map.on("zoom", () => { renderDimLabels(); });

    return () => {
      styleReadyRef.current = false;
      clearDimLabels();
      userMarkerRef.current?.remove();
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // ── Prop → source sync ──────────────────────────────────────────────────

  useEffect(() => {
    plotsRef.current  = plots;
    formatRef.current = project.labelFormat;
    unitRef.current   = unit;
    writePlotsSource(buildPlotsFeatureCollection(plots, project.labelFormat, unit));
    projectRef.current = project;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plots, project.labelFormat, unit, project]);

  useEffect(() => {
    zonesRef.current = zones;
    writeZonesSource(buildZonesFeatureCollection(zones));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zones]);

  // ── Render ──────────────────────────────────────────────────────────────

  if (!token) {
    return (
      <div
        className={className}
        style={{
          width: "100%", height: "100%",
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "#0a0a0a", color: "rgba(255,255,255,0.4)", fontSize: 14,
        }}
        role="alert"
      >
        Map unavailable — set <code style={{ margin: "0 4px" }}>NEXT_PUBLIC_MAPBOX_TOKEN</code> to enable the map.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: "100%", height: "100%" }}
      data-testid="map-renderer"
    />
  );
}

export const MapRenderer = forwardRef<MapRendererHandle, MapRendererProps>(MapRendererImpl);
MapRenderer.displayName = "MapRenderer";
export default MapRenderer;
