"use client";
/**
 * StatusToggle — Toggle switch to show/hide status colors.
 */
import { Layers } from "lucide-react";

interface StatusToggleProps {
  showColors: boolean;
  onToggle(show: boolean): void;
}

export function StatusToggle({ showColors, onToggle }: StatusToggleProps) {
  return (
    <div className="flex flex-col gap-2 pointer-events-auto">
      {/* Legend shows when toggled on */}
      {showColors && (
        <div className="glass px-4 py-3 rounded-2xl flex flex-col gap-2 mb-2" style={{ background: "rgba(30, 30, 30, 0.8)", border: "none" }}>
          <div className="flex items-center justify-between text-xs font-semibold text-white">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--color-available)" }} />
              Available
            </div>
            <span>62</span>
          </div>
          <div className="flex items-center justify-between text-xs font-semibold text-white">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--color-reserved)" }} />
              Builder
            </div>
            <span>22</span>
          </div>
          <div className="flex items-center justify-between text-xs font-semibold text-white">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--color-sold)" }} />
              Sold
            </div>
            <span>25</span>
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <div 
        className="glass flex items-center justify-between px-5 py-4 w-[200px]"
        style={{ borderRadius: "18px", background: "rgba(30, 30, 30, 0.8)", border: "none" }}
      >
        <div className="flex items-center gap-2 text-white font-medium text-sm">
          <Layers size={18} />
          Status
        </div>
        <label className="toggle-switch">
          <input 
            type="checkbox" 
            checked={showColors} 
            onChange={(e) => onToggle(e.target.checked)} 
          />
          <span className="slider"></span>
        </label>
      </div>
    </div>
  );
}
