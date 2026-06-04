"use client";
/**
 * FilterPills — horizontal scrollable row of status/zone/status-group filter pills.
 * Position: absolute, below top bar, z-index 20.
 * Active pill: white bg + black text. Live counts shown.
 */
import type { PlotStatus, StatusGroup, Zone } from "@/lib/types";
import type { PlotCounts } from "@/hooks/usePlots";

const STATUS_COLORS: Record<PlotStatus, string> = {
  available: "var(--color-available)",
  sold:      "var(--color-sold)",
  reserved:  "var(--color-reserved)",
  blocked:   "var(--color-blocked)",
};

type FilterValue = "all" | PlotStatus | string; // "all" | status | zoneId | statusGroupId

interface FilterPillsProps {
  counts:       PlotCounts;
  zones:        Zone[];
  statusGroups: StatusGroup[];
  active:       FilterValue;
  onSelect(value: FilterValue): void;
}

interface Pill {
  value:  FilterValue;
  label:  string;
  count?: number;
  color?: string;
}

export function FilterPills({
  counts,
  zones,
  statusGroups,
  active,
  onSelect,
}: FilterPillsProps) {
  const pills: Pill[] = [
    { value: "all",       label: "All",      count: counts.total },
    { value: "available", label: "Available", count: counts.available, color: STATUS_COLORS.available },
    { value: "sold",      label: "Sold",      count: counts.sold,      color: STATUS_COLORS.sold      },
    { value: "reserved",  label: "Reserved",  count: counts.reserved,  color: STATUS_COLORS.reserved  },
    { value: "blocked",   label: "Blocked",   count: counts.blocked,   color: STATUS_COLORS.blocked   },
    ...zones.map<Pill>((z) => ({ value: z.id, label: z.name })),
    ...statusGroups.map<Pill>((g) => ({ value: g.id, label: g.name })),
  ];

  return (
    <div
      className="w-full flex items-center gap-2 px-4 py-2 overflow-x-auto no-scrollbar pointer-events-auto"
    >
      {pills.map((p) => (
        <button
          key={p.value}
          type="button"
          onClick={() => onSelect(p.value)}
          className={`filter-pill${active === p.value ? " active" : ""}`}
          style={{ flexShrink: 0 }}
        >
          {p.color && (
            <span
              className="dot"
              style={{ background: active === p.value ? "#000" : p.color }}
            />
          )}
          {p.label}
          {p.count !== undefined && (
            <span
              className="text-xs ml-0.5"
              style={{ opacity: 0.7 }}
            >
              {p.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
