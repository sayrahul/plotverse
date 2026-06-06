"use client";
/**
 * PlotInfoOverlay — shows plot details directly on the map canvas when a plot
 * is selected, matching the spacer.land UX: plot number + area shown as a
 * floating overlay at the plot's centroid position. No bottom sheet.
 */
import { useEffect, useRef, useState, type RefObject } from "react";
import { X } from "lucide-react";
import type { Plot } from "@/lib/types";
import { formatArea } from "@/lib/units";
import type { MapRendererHandle } from "@/components/viewer/MapRenderer";
import type mapboxgl from "mapbox-gl";

interface PlotInfoOverlayProps {
  plot: Plot | null;
  mapRef: RefObject<MapRendererHandle | null>;
  onClose(): void;
  onMoreInfo(): void;
}

export function PlotInfoOverlay({ plot, mapRef, onClose, onMoreInfo }: PlotInfoOverlayProps) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!plot) { setPos(null); return; }

    // Get the underlying mapbox map instance
    const map = (mapRef.current as any)?.getMap?.() as mapboxgl.Map | undefined;
    if (!map) return;

    const [lng, lat] = plot.centroid as [number, number];

    function updatePos() {
      if (!map || !plot) return;
      const pt = map.project([lng, lat]);
      setPos({ x: pt.x, y: pt.y });
    }

    updatePos();
    map.on("move", updatePos);
    map.on("zoom", updatePos);
    map.on("pitch", updatePos);
    map.on("rotate", updatePos);

    return () => {
      map.off("move", updatePos);
      map.off("zoom", updatePos);
      map.off("pitch", updatePos);
      map.off("rotate", updatePos);
    };
  }, [plot, mapRef]);

  if (!plot || !pos) return null;

  return (
    <div
      style={{
        position: "absolute",
        left: pos.x,
        top: pos.y,
        transform: "translate(-50%, -110%)",
        zIndex: 20,
        pointerEvents: "auto",
      }}
    >
      {/* Floating card */}
      <div
        style={{
          background: "rgba(0,0,0,0.82)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.18)",
          borderRadius: 14,
          padding: "10px 14px",
          minWidth: 140,
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          color: "#fff",
          position: "relative",
        }}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          style={{
            position: "absolute",
            top: 6,
            right: 6,
            background: "rgba(255,255,255,0.1)",
            border: "none",
            borderRadius: "50%",
            width: 22,
            height: 22,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "#fff",
          }}
        >
          <X size={12} />
        </button>

        {/* Plot number */}
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 2 }}>Plot</div>
        <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1, marginBottom: 6 }}>
          {plot.number}
        </div>

        {/* Area row */}
        <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>
            {formatArea(plot.areaSqm, "sqft")}
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
            {formatArea(plot.areaSqm, "sqm")} &nbsp;·&nbsp; {formatArea(plot.areaSqm, "sqyd")}
          </div>
        </div>

        {/* Status pill */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "3px 9px",
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 600,
            background:
              plot.status === "available" ? "rgba(59,130,246,0.25)" :
              plot.status === "sold"      ? "rgba(239,68,68,0.25)"  :
              plot.status === "reserved"  ? "rgba(250,204,21,0.25)" :
                                            "rgba(107,114,128,0.25)",
            color:
              plot.status === "available" ? "#60a5fa" :
              plot.status === "sold"      ? "#f87171" :
              plot.status === "reserved"  ? "#fde047" :
                                            "#9ca3af",
            marginBottom: 8,
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor", display: "inline-block" }} />
          {plot.status.charAt(0).toUpperCase() + plot.status.slice(1)}
        </div>

        {/* More info button */}
        <div>
          <button
            type="button"
            onClick={onMoreInfo}
            style={{
              width: "100%",
              padding: "6px 0",
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 8,
              color: "#fff",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            More Details →
          </button>
        </div>

        {/* Arrow pointer */}
        <div style={{
          position: "absolute",
          bottom: -7,
          left: "50%",
          transform: "translateX(-50%)",
          width: 0,
          height: 0,
          borderLeft: "7px solid transparent",
          borderRight: "7px solid transparent",
          borderTop: "7px solid rgba(0,0,0,0.82)",
        }} />
      </div>
    </div>
  );
}
