/**
 * Pure load/save helpers for the persisted Unit_Preference (Req 28.3–28.4).
 *
 * The selected area unit is stored in `localStorage` under the
 * `plotverse.unit` key. These helpers are intentionally framework-free so the
 * `useUnitPreference` hook (and tests) can reuse them. Both functions are
 * SSR-safe: when `window` is unavailable they degrade gracefully instead of
 * throwing.
 *
 * Persisting then loading a unit returns the same unit (Property 10), provided
 * the stored value is a recognized {@link Unit}. Unknown or corrupt values are
 * treated as "no preference" and surface as `null` from {@link loadUnitPreference}.
 *
 * Requirements:
 * - 28.3 — persist the selected Unit_Preference to localStorage.
 * - 28.4 — apply the persisted Unit_Preference when the viewer loads.
 */

import type { Unit } from "@/lib/types";

/** localStorage key holding the persisted Unit_Preference (see design.md). */
export const UNIT_PREFERENCE_STORAGE_KEY = "plotverse.unit";

/** All recognized units; mirrors the {@link Unit} union for runtime validation. */
const KNOWN_UNITS: readonly Unit[] = [
  "sqft",
  "sqm",
  "sqyd",
  "acre",
  "gunta",
];

/** Narrowing type guard: is `value` one of the known {@link Unit} strings? */
export function isUnit(value: unknown): value is Unit {
  return typeof value === "string" && (KNOWN_UNITS as readonly string[]).includes(value);
}

/** True when running in a browser with a usable `localStorage`. */
function hasLocalStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

/**
 * Read the persisted Unit_Preference from `localStorage` (Req 28.4).
 *
 * @returns the stored {@link Unit}, or `null` when nothing valid is stored,
 *          when the value is unrecognized, or when `localStorage` is
 *          unavailable (e.g. during SSR or when access is blocked).
 */
export function loadUnitPreference(): Unit | null {
  if (!hasLocalStorage()) {
    return null;
  }
  try {
    const stored = window.localStorage.getItem(UNIT_PREFERENCE_STORAGE_KEY);
    return isUnit(stored) ? stored : null;
  } catch {
    // Access can throw (private mode, disabled storage); treat as no preference.
    return null;
  }
}

/**
 * Persist the selected Unit_Preference to `localStorage` (Req 28.3).
 *
 * No-ops when `localStorage` is unavailable so callers can invoke it safely
 * during SSR. Storage write failures (e.g. quota exceeded) are swallowed.
 */
export function saveUnitPreference(unit: Unit): void {
  if (!hasLocalStorage()) {
    return;
  }
  try {
    window.localStorage.setItem(UNIT_PREFERENCE_STORAGE_KEY, unit);
  } catch {
    // Best-effort persistence; ignore write failures.
  }
}
