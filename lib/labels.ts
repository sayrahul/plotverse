/**
 * Plot label formatting (pure, framework-free).
 *
 * Produces the text the Map_Renderer renders on each plot, driven by the label
 * format configured for the Project (Req 7.1). The format selects which plot
 * attributes are composed into the label:
 *
 * - `number`        → exactly the plot number (Req 7.2).
 * - `number+area`   → the plot number and its area formatted in the active
 *                     Unit_Preference (Req 7.3).
 * - `number+price`  → the plot number and its price (Req 7.4).
 * - `custom`        → exactly the plot's custom label text (Req 7.5).
 *
 * Areas are formatted by `lib/units.ts` so that the displayed unit always
 * matches the viewer's selected Unit_Preference. This module performs no I/O
 * and is the target of Property 5 (plot label formatting).
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */

import { formatArea } from "@/lib/units";
import type { LabelFormat, Plot, Unit } from "@/lib/types";

/** Separator placed between the plot number and an appended attribute. */
const SEPARATOR = " · ";

/**
 * Formats the label for a single plot according to the configured label
 * format and the active area unit.
 *
 * The `unit` argument only affects the `number+area` format; the other formats
 * ignore it. When a plot is missing the attribute a format would append
 * (an absent price, or an absent custom label), the function degrades
 * gracefully: `number+price` falls back to the bare plot number and `custom`
 * falls back to an empty string.
 *
 * @param plot   The plot whose label is being produced.
 * @param format The label format configured for the Project (Req 7.1).
 * @param unit   The active Unit_Preference used to format area (Req 7.3).
 * @returns The label text to render on the plot.
 */
export function formatPlotLabel(plot: Plot, format: LabelFormat, unit: Unit): string {
  switch (format) {
    case "number":
      // Req 7.2 — exactly the plot number.
      return plot.number;

    case "number+area":
      // Req 7.3 — the plot number plus its area in the active unit.
      return `${plot.number}${SEPARATOR}${formatArea(plot.areaSqm, unit)}`;

    case "number+price":
      // Req 7.4 — the plot number plus its price. With no price configured,
      // there is nothing to append, so fall back to the bare number.
      return plot.price === undefined
        ? plot.number
        : `${plot.number}${SEPARATOR}${formatPrice(plot.price)}`;

    case "custom":
      // Req 7.5 — exactly the plot's custom label text.
      return plot.customLabel ?? "";

    default:
      // Exhaustiveness guard: a new LabelFormat must be handled above.
      return assertNever(format);
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Renders a numeric price as a grouped decimal string (e.g. `1,250,000`).
 *
 * Uses a fixed `en-US` grouping so the output is deterministic regardless of
 * the host locale, which keeps the label stable across environments and tests.
 */
function formatPrice(price: number): string {
  return price.toLocaleString("en-US");
}

/** Compile-time exhaustiveness guard for the {@link LabelFormat} switch. */
function assertNever(value: never): never {
  throw new Error(`Unhandled label format: ${String(value)}`);
}
