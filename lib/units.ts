/**
 * Area unit conversion and formatting (pure, framework-free).
 *
 * Square meters is the platform's canonical storage unit (Req 28, 16). Every
 * conversion is expressed in terms of a single "square meters per unit" factor,
 * so `toSquareMeters` and `fromSquareMeters` are exact inverses of one another
 * and unit-to-unit conversions (sqm -> A -> sqm -> B) compose consistently
 * within floating-point tolerance.
 *
 * Requirements:
 * - 16.2 — display a plot's area in the selected unit preference.
 * - 28.1 — support sqft, sqm, sqyd, acre, and gunta.
 * - 28.2 — display all plot areas in the selected unit.
 *
 * Persistence to/from `localStorage` lives in the `useUnitPreference` hook,
 * which wraps these pure functions (Req 28.3–28.4).
 */

import type { Unit } from "@/lib/types";

/**
 * Square meters contained in one of each unit.
 *
 * The imperial factors are derived from the exact international definition of
 * the foot (1 ft = 0.3048 m), which keeps the system internally consistent:
 *   - 1 sq ft  = 0.3048²            = 0.09290304 m²
 *   - 1 sq yd  = 9 sq ft            = 0.83612736 m²
 *   - 1 acre   = 4840 sq yd         = 4046.8564224 m²
 * 1 gunta is a traditional South Asian land unit of 1089 sq ft ≈ 101.171 m².
 *
 * Because both conversion directions read the same constant, round-tripping a
 * value through a unit recovers the original exactly (modulo IEEE-754 rounding).
 */
const SQM_PER_UNIT: Record<Unit, number> = {
  sqm: 1,
  sqft: 0.09290304,
  sqyd: 0.83612736,
  acre: 4046.8564224,
  gunta: 101.171,
};

/** Human-readable suffix used by {@link formatArea}. */
const UNIT_LABEL: Record<Unit, string> = {
  sqm: "sq m",
  sqft: "sq ft",
  sqyd: "sq yd",
  acre: "acre",
  gunta: "gunta",
};

/** Fractional digits shown per unit; larger units warrant more precision. */
const UNIT_DECIMALS: Record<Unit, number> = {
  sqm: 2,
  sqft: 0,
  sqyd: 2,
  acre: 3,
  gunta: 2,
};

/** Throws for a value that is not a recognized {@link Unit}. */
function assertKnownUnit(unit: Unit): void {
  if (!Object.prototype.hasOwnProperty.call(SQM_PER_UNIT, unit)) {
    throw new RangeError(`Unknown area unit: ${String(unit)}`);
  }
}

/**
 * Convert an area in square meters (canonical) to the target unit (Req 28.2).
 *
 * Inverse of {@link toSquareMeters}.
 */
export function fromSquareMeters(areaSqm: number, unit: Unit): number {
  assertKnownUnit(unit);
  return areaSqm / SQM_PER_UNIT[unit];
}

/**
 * Convert a value expressed in `unit` back to square meters (Req 28.1).
 *
 * Inverse of {@link fromSquareMeters}.
 */
export function toSquareMeters(value: number, unit: Unit): number {
  assertKnownUnit(unit);
  return value * SQM_PER_UNIT[unit];
}

/**
 * Format an area (stored in square meters) for display in `unit` (Req 16.2).
 *
 * The numeric value is converted via {@link fromSquareMeters}, rounded to a
 * unit-appropriate number of fractional digits, grouped with thousands
 * separators, and suffixed with the unit label, e.g. `"1,234.56 sq m"`.
 */
export function formatArea(areaSqm: number, unit: Unit): string {
  assertKnownUnit(unit);
  const value = fromSquareMeters(areaSqm, unit);
  const decimals = UNIT_DECIMALS[unit];
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
  return `${formatted} ${UNIT_LABEL[unit]}`;
}
