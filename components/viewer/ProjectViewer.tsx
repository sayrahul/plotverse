"use client";

/**
 * ProjectViewer — the entire project SPA on a single page (Req 1.1).
 *
 * This client component:
 * - Subscribes to live plots/zones/statusGroups via Firestore onSnapshot.
 * - Reads/writes URL state (status, plot, zone, view, tab) via replaceState.
 * - Manages all overlay state (selected plot, active filter, panels, modals).
 * - Renders the full-screen Mapbox map with all overlay components on top.
 * - Never navigates away from /[projectId] — all panels slide up as overlays.
 *
 * Requirements: 1.1–1.5, 3, 5, 6, 8, 9, 12–16, 20, 21, 24–27, 28–29, 40.
 */

import dynamic from "next/dynamic";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "react-hot-toast";

import type { Project, Plot, Zone, StatusGroup, PlotStatus } from "@/lib/types";
import type { StatusFilter } from "@/lib/filters";
import { decodeViewerState } from "@/lib/urlState";
import { usePlots }        from "@/hooks/usePlots";
import { useProject }      from "@/hooks/useProject";
import { useUserLocation } from "@/hooks/useUserLocation";
import { pointInPolygon }  from "@/lib/geo/turfUtils";

import { TopBar }             from "@/components/viewer/TopBar";
import { FilterPills }        from "@/components/viewer/FilterPills";
import { SearchPlot }         from "@/components/viewer/SearchPlot";
import { BottomTabBar, type ActiveTab } from "@/components/viewer/BottomTabBar";
import { PlotDetailSheet }    from "@/components/viewer/PlotDetailSheet";
import { GalleryPanel }       from "@/components/viewer/GalleryPanel";
import { ProjectInfoPanel }   from "@/components/viewer/ProjectInfoPanel";
import { ShareModal }         from "@/components/viewer/ShareModal";
import { WhatsAppFAB }        from "@/components/viewer/WhatsAppFAB";
import { AddToHomeScreenPrompt } from "@/components/pwa/AddToHomeScreenPrompt";

import type { MapRendererHandle } from "@/components/viewer/MapRenderer";

// Dynamic import for Mapbox (no SSR)
const MapRenderer = dynamic(
  () => import("@/components/viewer/MapRenderer").then((m) => m.MapRenderer),
  { ssr: false, loading: () => <div style={{ width: "100%", height: "100%", background: "#000" }} /> },
);

const APP_DOMAIN =
  process.env.NEXT_PUBLIC_APP_DOMAIN ?? "https://yourdomain.com";

// ── Helpers ──────────────────────────────────────────────────────────────────

function updateURLParam(key: string, value: string | undefined) {
  const params = new URLSearchParams(window.location.search);
  if (value === undefined || value === "") params.delete(key);
  else params.set(key, value);
  const qs = params.toString();
  window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
}

function computeFilterValue(
  filter: string,
  plots: Plot[],
  zones: Zone[],
  statusGroups: StatusGroup[],
): { statusFilter: StatusFilter; zoneId: string | null } {
  const STATUSES: PlotStatus[] = ["available", "sold", "reserved", "blocked"];
  if (filter === "all" || !filter) return { statusFilter: "all", zoneId: null };
  if ((STATUSES as string[]).includes(filter)) return { statusFilter: filter as StatusFilter, zoneId: null };
  const zone = zones.find((z) => z.id === filter);
  if (zone) return { statusFilter: "all", zoneId: zone.id };
  const sg = statusGroups.find((g) => g.id === filter);
  if (sg) return { statusFilter: sg.statuses[0] ?? "all", zoneId: null };
  return { statusFilter: "all", zoneId: null };
}

// ── Component ─────────────────────────────────────────────────────────────────

export interface ProjectViewerProps {
  projectId:      string;
  initialProject: Project;
}

export function ProjectViewer({ projectId, initialProject }: ProjectViewerProps) {
  const searchParams   = useSearchParams();
  const mapRef         = useRef<MapRendererHandle | null>(null);
  const notifiedRef    = useRef<Set<string>>(new Set());

  // Live data
  const project = useProject(projectId, initialProject);
  const { plots, zones, statusGroups, counts, loading } = usePlots(projectId);
  const userLoc = useUserLocation();

  // UI state
  const [selectedPlot,     setSelectedPlot]     = useState<Plot | null>(null);
  const [activeFilter,     setActiveFilter]      = useState<string>("all");
  const [activeTab,        setActiveTab]         = useState<ActiveTab>(null);
  const [is3D,             setIs3D]              = useState(false);
  const [isPresentation,   setIsPresentation]    = useState(false);
  const [showShareModal,   setShowShareModal]    = useState(false);
  const [mapStyleKey,      setMapStyleKey]       = useState<"satellite" | "street">("satellite");

  // ── Initial URL params ───────────────────────────────────────────────────

  useEffect(() => {
    const state = decodeViewerState(searchParams);
    if (state.status) setActiveFilter(state.status);
    if (state.view === "3d") { setIs3D(true); mapRef.current?.toggle3D(true); }
    if (state.tab === "gallery") setActiveTab("gallery");
    // Plot param handled after plots load (below)
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  // ── Open plot from URL param once plots loaded ───────────────────────────

  useEffect(() => {
    if (loading || plots.length === 0) return;
    const state = decodeViewerState(searchParams);
    if (state.plot) {
      const plot = plots.find((p) => p.id === state.plot || p.number === state.plot);
      if (plot) { selectPlot(plot); }
    }
    // Fit bounds on first load
    mapRef.current?.fitBounds();
  }, [loading]);  // eslint-disable-line react-hooks/exhaustive-deps

  // ── Apply filter to map when it changes ─────────────────────────────────

  useEffect(() => {
    const { statusFilter, zoneId } = computeFilterValue(activeFilter, plots, zones, statusGroups);
    mapRef.current?.applyFilter(statusFilter, zoneId);
  }, [activeFilter, plots, zones, statusGroups]);

  // ── Real-time plot updates → map source ─────────────────────────────────

  useEffect(() => {
    mapRef.current?.setPlots(plots);
  }, [plots]);

  useEffect(() => {
    mapRef.current?.setZones(zones);
  }, [zones]);

  // ── GPS user location → map dot ─────────────────────────────────────────

  useEffect(() => {
    mapRef.current?.setUserLocation(userLoc.location);
    // Near-plot notification
    if (userLoc.location) {
      for (const plot of plots) {
        if (notifiedRef.current.has(plot.id)) continue;
        const inside = pointInPolygon(
          [userLoc.location.lng, userLoc.location.lat],
          plot.geometry.coordinates,
        );
        if (inside) {
          toast(`📍 You are near Plot ${plot.number}`);
          notifiedRef.current.add(plot.id);
        }
      }
    }
  }, [userLoc.location, plots]);

  // ── Presentation mode ───────────────────────────────────────────────────

  useEffect(() => {
    if (isPresentation) document.body.classList.add("presentation-mode");
    else                document.body.classList.remove("presentation-mode");
    return () => document.body.classList.remove("presentation-mode");
  }, [isPresentation]);

  // ── Keyboard: Escape exits presentation mode ────────────────────────────

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape" && isPresentation) setIsPresentation(false);
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isPresentation]);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const selectPlot = useCallback((plot: Plot) => {
    setSelectedPlot(plot);
    mapRef.current?.flyToPlot(plot);
    updateURLParam("plot", plot.id);
  }, []);

  const deselectPlot = useCallback(() => {
    setSelectedPlot(null);
    updateURLParam("plot", undefined);
  }, []);

  const handleFilterSelect = useCallback((value: string) => {
    setActiveFilter(value);
    // If value is a statusGroup id, set status= param; else clear it
    const sg = statusGroups.find((g) => g.id === value);
    if (sg) updateURLParam("status", value);
    else    updateURLParam("status", undefined);
    updateURLParam("zone", undefined);
  }, [statusGroups]);

  const handleTabChange = useCallback((tab: ActiveTab) => {
    setActiveTab(tab);
    updateURLParam("tab", tab === "gallery" ? "gallery" : undefined);
    if (tab === "locate") {
      userLoc.startWatching();
      mapRef.current?.setUserLocation(userLoc.location);
      if (userLoc.location) {
        mapRef.current?.getMap()?.flyTo({
          center: [userLoc.location.lng, userLoc.location.lat],
          zoom: 18,
          duration: 800,
        });
      }
    }
  }, [userLoc]);

  const handleToggle3D = useCallback(() => {
    const next = !is3D;
    setIs3D(next);
    mapRef.current?.toggle3D(next);
    updateURLParam("view", next ? "3d" : undefined);
  }, [is3D]);

  function handlePlotClick(plotId: string) {
    const plot = plots.find((p) => p.id === plotId);
    if (plot) selectPlot(plot);
  }

  const zoneName = selectedPlot?.zoneId
    ? zones.find((z) => z.id === selectedPlot.zoneId)?.name
    : undefined;

  const activeStatusGroupId = statusGroups.find((g) => g.id === activeFilter)?.id;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <main
      className="viewer-root"
      data-project-id={projectId}
      onClick={() => { if (isPresentation) setIsPresentation(false); }}
    >
      {/* SEO accessible heading */}
      <h1 className="sr-only">{project.name} | PlotVerse</h1>

      {/* z-0: Map (full screen) */}
      <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
        <MapRenderer
          ref={mapRef}
          project={project}
          plots={plots}
          zones={zones}
          unit="sqft"
          className="w-full h-full"
          onPlotClick={handlePlotClick}
        />
      </div>

      {/* Top Header Overlay (Notch Safe / No overlap) */}
      <div className="ui-overlay absolute top-0 left-0 right-0 z-20 flex flex-col pointer-events-none pt-safe">
        <TopBar
          projectName={project.name}
          is3D={is3D}
          isPresentation={isPresentation}
          onShare={() => setShowShareModal(true)}
          onToggle3D={handleToggle3D}
          onLocate={() => mapRef.current?.flyToCenter()}
          onTogglePresentation={() => setIsPresentation((p) => !p)}
        />
        <FilterPills
          counts={counts}
          zones={zones}
          statusGroups={statusGroups}
          active={activeFilter}
          onSelect={handleFilterSelect}
        />
      </div>

      {/* Bottom Controls Container (Home-Indicator Safe / No overlap) */}
      <div className="ui-overlay absolute bottom-0 left-0 right-0 z-20 flex flex-col pointer-events-none pb-safe">
        <SearchPlot
          plots={plots}
          userLocation={userLoc.location}
          onSelect={selectPlot}
        />
        <BottomTabBar activeTab={activeTab} onTabChange={handleTabChange} />
      </div>

      {/* z-50: WhatsApp FAB (Hidden when sheets are open to avoid overlap) */}
      {!selectedPlot && !activeTab && <WhatsAppFAB project={project} />}

      {/* z-30: Plot detail sheet */}
      {selectedPlot && (
        <div style={{ position: "absolute", inset: 0, zIndex: 30, pointerEvents: "none" }}>
          <div style={{ position: "absolute", inset: 0, pointerEvents: "auto" }}>
            <PlotDetailSheet
              plot={selectedPlot}
              project={project}
              zoneName={zoneName}
              onClose={deselectPlot}
              onShare={() => setShowShareModal(true)}
            />
          </div>
        </div>
      )}

      {/* z-30: Gallery panel */}
      {activeTab === "gallery" && !selectedPlot && (
        <div style={{ position: "absolute", inset: 0, zIndex: 30, pointerEvents: "none" }}>
          <div style={{ position: "absolute", inset: 0, pointerEvents: "auto" }}>
            <GalleryPanel project={project} onClose={() => setActiveTab(null)} />
          </div>
        </div>
      )}

      {/* z-30: Project info panel */}
      {activeTab === "info" && !selectedPlot && (
        <div style={{ position: "absolute", inset: 0, zIndex: 30, pointerEvents: "none" }}>
          <div style={{ position: "absolute", inset: 0, pointerEvents: "auto" }}>
            <ProjectInfoPanel
              project={project}
              counts={counts}
              onClose={() => setActiveTab(null)}
            />
          </div>
        </div>
      )}

      {/* z-40: Share modal */}
      {showShareModal && (
        <div style={{ position: "absolute", inset: 0, zIndex: 40, pointerEvents: "auto" }}>
          <ShareModal
            project={project}
            activeStatusId={activeStatusGroupId}
            activePlotNum={selectedPlot?.number}
            onClose={() => setShowShareModal(false)}
          />
        </div>
      )}

      {/* PWA "Add to Home Screen" banner after 30s on mobile (Req 40.2) */}
      <AddToHomeScreenPrompt />
    </main>
  );
}

export default ProjectViewer;
