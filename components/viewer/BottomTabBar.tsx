"use client";
/**
 * BottomTabBar — glassmorphism fixed bottom bar with three tabs:
 * Gallery, Info, Locate. Tapping the active tab closes the panel.
 */
import { Images, Info, Navigation } from "lucide-react";

export type ActiveTab = "gallery" | "info" | "locate" | null;

interface BottomTabBarProps {
  activeTab: ActiveTab;
  onTabChange(tab: ActiveTab): void;
}

const TABS = [
  { id: "gallery", label: "Gallery", Icon: Images      },
  { id: "info",    label: "Info",    Icon: Info         },
  { id: "locate",  label: "Locate",  Icon: Navigation   },
] as const;

export function BottomTabBar({ activeTab, onTabChange }: BottomTabBarProps) {
  return (
    <div className="w-full flex items-center justify-center gap-3 px-4 pb-2 pointer-events-auto">
      {TABS.map(({ id, label, Icon }) => {
        const isActive = activeTab === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onTabChange(isActive ? null : (id as ActiveTab))}
            className="flex items-center gap-2 px-5 py-3 rounded-full transition-colors flex-1 justify-center"
            style={{
              color: isActive ? "#fff" : "var(--text-secondary)",
              background: isActive ? "rgba(255,255,255,0.15)" : "rgba(30, 30, 30, 0.8)",
              border: isActive ? "1px solid rgba(255,255,255,0.3)" : "none",
            }}
            aria-label={label}
            aria-pressed={isActive}
          >
            <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
            <span className="text-[13px] font-medium">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
