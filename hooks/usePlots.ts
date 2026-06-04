"use client";
import { useEffect, useState } from "react";
import type { Plot, Zone, StatusGroup, PlotStatus } from "@/lib/types";

export interface PlotCounts {
  total:     number;
  available: number;
  sold:      number;
  reserved:  number;
  blocked:   number;
}

export interface PlotsHook {
  plots:        Plot[];
  zones:        Zone[];
  statusGroups: StatusGroup[];
  counts:       PlotCounts;
  loading:      boolean;
}

function calcCounts(plots: Plot[]): PlotCounts {
  const counts: PlotCounts = { total: plots.length, available: 0, sold: 0, reserved: 0, blocked: 0 };
  for (const p of plots) {
    const key = p.status as PlotStatus;
    if (key in counts) counts[key]++;
  }
  return counts;
}

export function usePlots(projectId: string): PlotsHook {
  const [plots,        setPlots]        = useState<Plot[]>([]);
  const [zones,        setZones]        = useState<Zone[]>([]);
  const [statusGroups, setStatusGroups] = useState<StatusGroup[]>([]);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch("/data/plot-data.json")
      .then((res) => res.json())
      .then((data) => {
        setPlots(data.plots || []);
        setZones(data.zones || []);
        setStatusGroups(data.statusGroups || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load plot data", err);
        setLoading(false);
      });
  }, [projectId]);

  return {
    plots,
    zones,
    statusGroups,
    counts: calcCounts(plots),
    loading,
  };
}
