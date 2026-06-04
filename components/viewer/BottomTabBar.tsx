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
    <div
      className="w-full glass-dark px-4"
      style={{ borderTop: "var(--glass-border)", borderRadius: "20px 20px 0 0" }}
    >
      <div className="flex items-center justify-around py-2">
        {TABS.map(({ id, label, Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onTabChange(isActive ? null : (id as ActiveTab))}
              className="flex flex-col items-center gap-1 px-6 py-2 rounded-xl transition-colors"
              style={{
                color: isActive ? "#fff" : "var(--text-secondary)",
                background: isActive ? "rgba(255,255,255,0.08)" : "transparent",
              }}
              aria-label={label}
              aria-pressed={isActive}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
              <span className="text-[11px] font-semibold">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
