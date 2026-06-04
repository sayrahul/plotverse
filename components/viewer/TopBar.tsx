"use client";
/**
 * TopBar — glassmorphism top bar overlay for the Project Viewer.
 * Position: absolute, top-0, full width, z-index 20.
 * Left: project name (Syne) + compass indicator.
 * Right: icon pill (Share, 3D toggle, Home/Locate, Presentation mode).
 */
import { Share2, Box, Home, Eye } from "lucide-react";

interface TopBarProps {
  onLogoClick?: () => void;
}

export function TopBar({ onLogoClick }: TopBarProps) {
  return (
    <div className="w-full flex flex-col pointer-events-none px-4 pt-4">
      {/* Header Row */}
      <div className="flex items-center justify-between w-full">
        {/* Left: Nakshatra Logo */}
        <button 
          onClick={onLogoClick}
          className="flex items-center gap-3 pointer-events-auto hover:opacity-80 transition-opacity"
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 10l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
          <span 
            className="text-2xl font-bold tracking-wider" 
            style={{ color: "#f97316", fontFamily: "var(--font-display)" }}
          >
            NAKSHATRA
          </span>
        </button>
        
        {/* Right: Spacer/Company Logo */}
        <div className="w-10 h-10 bg-white/10 rounded flex items-center justify-center backdrop-blur-md">
           <svg width="20" height="20" viewBox="0 0 24 24" fill="#22c55e">
             <rect x="3" y="3" width="7" height="7" transform="rotate(45 6.5 6.5)" />
             <rect x="14" y="14" width="7" height="7" transform="rotate(45 17.5 17.5)" />
             <rect x="3" y="14" width="7" height="7" transform="rotate(45 6.5 17.5)" />
           </svg>
        </div>
      </div>

      {/* Compass below logo */}
      <div className="w-10 h-10 rounded-full bg-black/60 border border-white/10 flex items-center justify-center backdrop-blur mt-4 pointer-events-auto">
        <span className="text-white font-bold italic text-sm">N</span>
      </div>
    </div>
  );
}
