"use client";
/**
 * SearchPlot — glassmorphism floating search bar above the bottom tab bar.
 * Client-side filters plots by number/status/area.
 * On result tap: flyTo plot + open detail sheet + update URL.
 */
import { useState, useRef } from "react";
import { Search } from "lucide-react";
import type { Plot } from "@/lib/types";
import { distanceM } from "@/lib/geo/turfUtils";
import type { UserLocation } from "@/hooks/useUserLocation";

const STATUS_COLORS: Record<string, string> = {
  available: "var(--color-available)",
  sold:      "var(--color-sold)",
  reserved:  "var(--color-reserved)",
  blocked:   "var(--color-blocked)",
};

function fmtArea(sqm: number): string {
  return `${(sqm * 10.764).toFixed(0)} sqft`;
}

function fmtDist(m: number): string {
  if (m < 1000) return `${m.toFixed(0)} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

interface SearchPlotProps {
  plots:        Plot[];
  userLocation: UserLocation | null;
  onSelect(plot: Plot): void;
}

export function SearchPlot({ plots, userLocation, onSelect }: SearchPlotProps) {
  const [query,    setQuery]    = useState("");
  const [focused,  setFocused]  = useState(false);
  const inputRef                = useRef<HTMLInputElement>(null);

  const q = query.trim().toLowerCase();
  const results = !q
    ? []
    : plots
        .filter(
          (p) =>
            p.number.toLowerCase().includes(q) ||
            p.status.toLowerCase().includes(q) ||
            String(Math.round(p.areaSqm * 10.764)).includes(q),
        )
        .slice(0, 8);

  function handleSelect(plot: Plot) {
    setQuery("");
    setFocused(false);
    inputRef.current?.blur();
    onSelect(plot);
  }

  return (
    <div
      className="w-full px-4 py-2 pointer-events-auto"
    >
      {/* Search input */}
      <div
        className="glass flex items-center gap-3 px-4 py-3"
        style={{ borderRadius: "14px" }}
      >
        <Search size={16} color="var(--text-secondary)" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search plot…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          className="flex-1 bg-transparent text-sm text-white placeholder:text-white/35 outline-none"
          style={{ fontFamily: "var(--font-body)" }}
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="text-white/40 hover:text-white text-xs"
          >
            ✕
          </button>
        )}
      </div>

      {/* Results dropdown */}
      {focused && results.length > 0 && (
        <div
          className="glass mt-2 overflow-y-auto"
          style={{ maxHeight: "280px", borderRadius: "14px" }}
        >
          {results.map((plot) => {
            const dist =
              userLocation
                ? distanceM(
                    [userLocation.lng, userLocation.lat],
                    plot.centroid,
                  )
                : null;
            return (
              <button
                key={plot.id}
                type="button"
                onMouseDown={() => handleSelect(plot)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors text-left"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div>
                  <div className="text-sm font-semibold text-white">{plot.number}</div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                    {fmtArea(plot.areaSqm)}
                    {plot.facing ? ` · ${plot.facing}` : ""}
                    {dist !== null ? ` · ${fmtDist(dist)} away` : ""}
                  </div>
                </div>
                <span
                  className="status-badge"
                  style={{ color: STATUS_COLORS[plot.status] }}
                >
                  {plot.status}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {focused && q && results.length === 0 && (
        <div className="glass mt-2 px-4 py-3 text-sm" style={{ color: "var(--text-secondary)", borderRadius: "14px" }}>
          No plots found for &ldquo;{query}&rdquo;
        </div>
      )}
    </div>
  );
}
