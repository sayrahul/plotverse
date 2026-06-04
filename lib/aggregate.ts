/**
 * Status-count and value-range aggregation (pure, framework-free).
 *
 * These helpers derive summary statistics from an in-memory collection of
 * plots (or leads). They are recomputed from the current collection on every
 * call, so callers that pass the live feature collection always get counts and
 * ranges that reflect the latest inventory (Req 11.2, 22.3, 24.3).
 *
 * Requirements:
 * - 11.1 — status summary bar shows a count of plots for each Plot_Status.
 * - 11.2 — counts reflect the current inventory when it changes.
 * - 22.1 — Info_Panel price range and area range.
 * - 22.3 — Info_Panel statistics reflect the current inventory.
 * - 24.3 — status-count / Info_Panel statistics update on inventory change.
 * - 38.6 — CRM statistics summarizing leads by Lead_Status.
 */

import type { Lead, LeadStatus, Plot, PlotStatus } from "@/lib/types";

// ---------------------------------------------------------------------------
// Status domains
// ---------------------------------------------------------------------------

/** Every Plot_Status, in display order (Req 11.1, 12.1). */
export const PLOT_STATUSES: readonly PlotStatus[] = [
  "available",
  "sold",
  "reserved",
  "blocked",
];

/** Every Lead_Status, in pipeline order (Req 38.2, 38.6). */
export const LEAD_STATUSES: readonly LeadStatus[] = [
  "New",
  "Contacted",
  "Interested",
  "Negotiating",
  "Closed",
  "Lost",
];

// ---------------------------------------------------------------------------
// Per-status counts
// ---------------------------------------------------------------------------

/**
 * A count for every status in the domain `S`.
 *
 * Every status key is always present (initialized to 0 when absent), so the
 * map is a total function over the status domain rather than a sparse map.
 */
export type StatusCounts<S extends string> = Record<S, number>;

/**
 * Counts the items of a collection grouped by their `status`, keyed by every
 * status in `domain` (Req 11.1, 38.6).
 *
 * The result includes a zero entry for statuses that no item has, so the
 * counts partition the collection: the sum of all counts equals the collection
 * length and each per-status count equals the number of items with that status
 * (Property 7). Items whose status is not part of `domain` are ignored, which
 * keeps the sum bounded by recognized statuses only.
 *
 * @param items  collection of items carrying a `status` field
 * @param domain the complete, ordered set of statuses to key the result by
 */
export function countByStatus<S extends string>(
  items: ReadonlyArray<{ status: S }>,
  domain: readonly S[],
): StatusCounts<S> {
  const counts = {} as StatusCounts<S>;
  for (const status of domain) {
    counts[status] = 0;
  }
  for (const item of items) {
    if (item.status in counts) {
      counts[item.status] += 1;
    }
  }
  return counts;
}

/**
 * Per-Plot_Status counts for a plot collection (Req 11.1, 11.2, 24.3).
 *
 * Always contains a key for each of the four plot statuses.
 */
export function countPlotsByStatus(
  plots: readonly Plot[],
): StatusCounts<PlotStatus> {
  return countByStatus(plots, PLOT_STATUSES);
}

/**
 * Per-Lead_Status counts for a lead collection (Req 38.6).
 *
 * Always contains a key for each of the six lead statuses.
 */
export function countLeadsByStatus(
  leads: readonly Lead[],
): StatusCounts<LeadStatus> {
  return countByStatus(leads, LEAD_STATUSES);
}

// ---------------------------------------------------------------------------
// Value ranges
// ---------------------------------------------------------------------------

/** An inclusive numeric range where `min` is guaranteed to be `<= max`. */
export interface Range {
  min: number;
  max: number;
}

/**
 * The min/max range of a numeric value selected from each item (Req 22.1).
 *
 * Only finite numeric values are considered; items whose selected value is
 * `undefined`, `null`, or `NaN` are skipped. When no item contributes a value
 * (including an empty collection), the range is `null`. Otherwise the returned
 * `min`/`max` equal the smallest/largest selected values present in the
 * dataset, so `min <= max` always holds (Property 8).
 *
 * @param items  collection to scan
 * @param select extracts the numeric value to range over, or a nullish value
 *               to exclude the item
 */
export function rangeOf<T>(
  items: readonly T[],
  select: (item: T) => number | null | undefined,
): Range | null {
  let min: number | undefined;
  let max: number | undefined;
  for (const item of items) {
    const value = select(item);
    if (value === null || value === undefined || Number.isNaN(value)) {
      continue;
    }
    if (min === undefined || value < min) min = value;
    if (max === undefined || value > max) max = value;
  }
  if (min === undefined || max === undefined) {
    return null;
  }
  return { min, max };
}

/**
 * Price range across the plots that carry a price (Req 22.1).
 *
 * Plots without a `price` are excluded. Returns `null` when no plot has a
 * price (including an empty collection).
 */
export function priceRange(plots: readonly Plot[]): Range | null {
  return rangeOf(plots, (plot) => plot.price);
}

/**
 * Area range (in canonical square meters) across a plot collection (Req 22.1).
 *
 * Every plot carries a canonical `areaSqm`, so the range spans all plots.
 * Returns `null` for an empty collection.
 */
export function areaRange(plots: readonly Plot[]): Range | null {
  return rangeOf(plots, (plot) => plot.areaSqm);
}
