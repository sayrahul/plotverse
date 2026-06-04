/**
 * Plot filtering, status-group resolution, and client-side search (pure,
 * framework-free).
 *
 * Every resolver returns a NEW array containing exactly the plots that satisfy
 * its criterion, preserving the input order. None of these functions mutate
 * their inputs. This soundness-and-completeness guarantee (returned set =
 * exactly those plots satisfying the predicate) is what lets the Map_Renderer
 * and Filter_Pills derive a visible subset directly from the full inventory.
 *
 * Requirements:
 * - 12.3 — select a status pill shows only plots whose status matches.
 * - 12.4 — the "All" pill shows every plot regardless of status.
 * - 12.5 — select a zone pill shows only plots within that zone.
 * - 13.2 — selecting a Status_Group shows only plots matching its statuses.
 * - 14.1 — client-side search filters plots by plot number.
 */

import type { Plot, PlotStatus, StatusGroup } from "@/lib/types";

/**
 * A status filter pill value: either a single concrete {@link PlotStatus} or
 * the sentinel `"all"` meaning "no status restriction" (Req 12.4).
 */
export type StatusFilter = "all" | PlotStatus;

/**
 * Filter plots by status pill.
 *
 * - `"all"` returns the full list unchanged (Req 12.4).
 * - any concrete status returns exactly the plots whose `status` equals it
 *   (Req 12.3).
 */
export function filterByStatus(plots: Plot[], filter: StatusFilter): Plot[] {
  if (filter === "all") {
    return plots.slice();
  }
  return plots.filter((plot) => plot.status === filter);
}

/**
 * Filter plots by zone, returning exactly the plots whose `zoneId` equals the
 * given `zoneId` (Req 12.5). Plots without a `zoneId` never match.
 */
export function filterByZone(plots: Plot[], zoneId: string): Plot[] {
  return plots.filter((plot) => plot.zoneId === zoneId);
}

/**
 * Resolve a {@link StatusGroup} to the plots it selects: exactly the plots
 * whose `status` is a member of `group.statuses` (Req 13.2). An empty
 * `statuses` set selects no plots.
 */
export function resolveStatusGroup(plots: Plot[], group: StatusGroup): Plot[] {
  const statuses = new Set<PlotStatus>(group.statuses);
  return plots.filter((plot) => statuses.has(plot.status));
}

/**
 * Client-side plot search by number (Req 14.1).
 *
 * Matching criterion: a plot matches iff its `number`, normalized (trimmed and
 * lower-cased), contains the normalized `query` as a substring. A blank query
 * normalizes to the empty string, which every plot number contains, so a blank
 * query returns the full list.
 */
export function searchByNumber(plots: Plot[], query: string): Plot[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (normalizedQuery === "") {
    return plots.slice();
  }
  return plots.filter((plot) =>
    plot.number.trim().toLowerCase().includes(normalizedQuery),
  );
}
