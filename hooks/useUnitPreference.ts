/**
 * React hook for the persisted Unit_Preference (Req 28.3–28.4).
 *
 * Wraps the pure {@link loadUnitPreference} / {@link saveUnitPreference}
 * helpers so any client component can read and update the user's selected area
 * unit with `localStorage` persistence. The hook:
 *   - renders with a deterministic default unit so server and first client
 *     render agree (avoids hydration mismatch), then
 *   - reads the persisted preference on mount and applies it (Req 28.4), and
 *   - writes every change back to `localStorage` (Req 28.3).
 *
 * Requirements: 28.3, 28.4
 */

"use client";

import { useCallback, useEffect, useState } from "react";

import type { Unit } from "@/lib/types";
import { loadUnitPreference, saveUnitPreference } from "@/lib/unitPreference";

/** Unit applied when nothing is persisted yet. */
export const DEFAULT_UNIT: Unit = "sqft";

/** Tuple returned by {@link useUnitPreference}: current unit + setter. */
export type UseUnitPreferenceResult = [Unit, (unit: Unit) => void];

/**
 * Reads the persisted Unit_Preference on mount and persists changes.
 *
 * @param defaultUnit unit used before a persisted value is loaded
 *                    (defaults to {@link DEFAULT_UNIT}).
 * @returns `[unit, setUnit]` — the current unit and a setter that also writes
 *          the value to `localStorage`.
 */
export function useUnitPreference(
  defaultUnit: Unit = DEFAULT_UNIT,
): UseUnitPreferenceResult {
  const [unit, setUnitState] = useState<Unit>(defaultUnit);

  // Apply the persisted preference after mount (Req 28.4). Running in an
  // effect keeps the initial render SSR-safe and hydration-consistent.
  useEffect(() => {
    const persisted = loadUnitPreference();
    if (persisted !== null) {
      setUnitState(persisted);
    }
  }, []);

  // Update state and persist the new selection (Req 28.3).
  const setUnit = useCallback((next: Unit) => {
    setUnitState(next);
    saveUnitPreference(next);
  }, []);

  return [unit, setUnit];
}
