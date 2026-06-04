"use client";
/**
 * usePlots — subscribes to a project's plots via Firestore onSnapshot and
 * derives live status counts. Cleans up the subscription on unmount.
 */
import { useEffect, useRef, useState } from "react";
import {
  subscribePlots,
  subscribeZones,
  subscribeStatusGroups,
} from "@/lib/firebase/subscriptions";
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
  const firstRef = useRef(true);

  useEffect(() => {
    firstRef.current = true;
    setLoading(true);

    const unsubPlots = subscribePlots(projectId, (ps) => {
      setPlots(ps);
      if (firstRef.current) { firstRef.current = false; setLoading(false); }
    });
    const unsubZones  = subscribeZones(projectId, setZones);
    const unsubGroups = subscribeStatusGroups(projectId, setStatusGroups);

    return () => { unsubPlots(); unsubZones(); unsubGroups(); };
  }, [projectId]);

  return {
    plots,
    zones,
    statusGroups,
    counts: calcCounts(plots),
    loading,
  };
}
