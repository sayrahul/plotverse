"use client";
/**
 * TopBar — glassmorphism top bar overlay for the Project Viewer.
 * Position: absolute, top-0, full width, z-index 20.
 * Left: project name (Syne) + compass indicator.
 * Right: icon pill (Share, 3D toggle, Home/Locate, Presentation mode).
 */
import { Share2, Box, Home, Eye } from "lucide-react";

interface TopBarProps {
  projectName: string;
  is3D: boolean;
  isPresentation: boolean;
  onShare(): void;
  onToggle3D(): void;
  onLocate(): void;
  onTogglePresentation(): void;
}

export function TopBar({
  projectName,
  is3D,
  isPresentation,
  onShare,
  onToggle3D,
  onLocate,
  onTogglePresentation,
}: TopBarProps) {
  return (
    <div
      className="ui-overlay absolute top-0 left-0 right-0 z-20 flex items-start justify-between px-4 pt-4 pb-2 pointer-events-none"
    >
      {/* Left: project name + compass */}
      <div className="pointer-events-auto glass-pill px-4 py-2 flex items-center gap-3 max-w-[55vw]">
        <span
          className="text-sm font-bold text-white truncate"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {projectName}
        </span>
        <span className="text-xs text-white/50 shrink-0">N↑</span>
      </div>

      {/* Right: action buttons */}
      <div className="pointer-events-auto glass-pill flex items-center gap-1 px-2 py-2">
        <button
          type="button"
          aria-label="Share"
          onClick={onShare}
          className="icon-btn"
        >
          <Share2 size={16} />
        </button>
        <button
          type="button"
          aria-label={is3D ? "Disable 3D view" : "Enable 3D view"}
          onClick={onToggle3D}
          className={`icon-btn${is3D ? " active" : ""}`}
        >
          <Box size={16} />
        </button>
        <button
          type="button"
          aria-label="Go to project center"
          onClick={onLocate}
          className="icon-btn"
        >
          <Home size={16} />
        </button>
        <button
          type="button"
          aria-label={isPresentation ? "Exit presentation mode" : "Presentation mode"}
          onClick={onTogglePresentation}
          className={`icon-btn${isPresentation ? " active" : ""}`}
        >
          <Eye size={16} />
        </button>
      </div>
    </div>
  );
}
