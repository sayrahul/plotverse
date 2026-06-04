/**
 * Lead status and timeline logic (pure, framework-free).
 *
 * This module owns the small set of rules that govern how a {@link Lead}
 * moves through the CRM pipeline:
 *
 * - `isLeadStatus`      → enum-membership guard accepting a value iff it is one
 *                         of the six permitted statuses (Req 38.2, Property 26).
 * - `createLead`        → builds a new Lead with status defaulted to `New` and
 *                         an empty timeline (Req 20.4).
 * - `appendStatusChange`→ records a status transition as a single timeline
 *                         entry and advances `lead.status` (Req 38.3).
 * - `appendNote`        → records a note as a single timeline entry (Req 38.4).
 *
 * Every append operation adds exactly one entry, preserves all prior entries in
 * order, and returns a new object without mutating its inputs. The timeline
 * length therefore always equals the number of operations applied
 * (Property 27).
 *
 * This module performs no I/O. Timestamps default to `Date.now()` only when a
 * caller omits the `at` argument; supplying `at` keeps the functions fully
 * deterministic.
 *
 * Requirements: 20.4, 38.2, 38.3, 38.4
 */

import type { Lead, LeadStatus, LeadTimelineEntry } from "@/lib/types";

// ---------------------------------------------------------------------------
// Lead status enumeration
// ---------------------------------------------------------------------------

/**
 * The six permitted lead pipeline statuses, in pipeline order (Req 38.2).
 *
 * `satisfies readonly LeadStatus[]` ensures every listed value is a valid
 * {@link LeadStatus}, and {@link _ExhaustiveLeadStatuses} below ensures no
 * status is missing — together they keep this list in lock-step with the type.
 */
export const LEAD_STATUSES = [
  "New",
  "Contacted",
  "Interested",
  "Negotiating",
  "Closed",
  "Lost",
] as const satisfies readonly LeadStatus[];

/**
 * Compile-time guard: errors if a {@link LeadStatus} is added to the type but
 * not to {@link LEAD_STATUSES}. The conditional resolves to `true` only when
 * every status is covered.
 */
type _ExhaustiveLeadStatuses =
  Exclude<LeadStatus, (typeof LEAD_STATUSES)[number]> extends never ? true : never;
// eslint-disable-next-line
const _exhaustiveLeadStatuses: _ExhaustiveLeadStatuses = true;

/** O(1) membership lookup backing {@link isLeadStatus}. */
const LEAD_STATUS_SET: ReadonlySet<string> = new Set(LEAD_STATUSES);

/**
 * Type guard that accepts a value if and only if it is one of the six
 * permitted lead statuses (Req 38.2, Property 26).
 *
 * Accepts `unknown` so it can validate values arriving from untrusted sources
 * (Firestore documents, request bodies) before they are treated as a
 * {@link LeadStatus}.
 *
 * @param value Candidate status value of any type.
 * @returns `true` iff `value` is a valid {@link LeadStatus}.
 */
export function isLeadStatus(value: unknown): value is LeadStatus {
  return typeof value === "string" && LEAD_STATUS_SET.has(value);
}

// ---------------------------------------------------------------------------
// Lead creation
// ---------------------------------------------------------------------------

/**
 * Fields a caller supplies when creating a Lead. The pipeline `status` and the
 * `timeline` are owned by {@link createLead} and so are omitted here.
 */
export type NewLeadInput = Omit<Lead, "status" | "timeline">;

/**
 * Builds a new {@link Lead} from the supplied fields, assigning the initial
 * {@link LeadStatus} `New` and an empty timeline (Req 20.4).
 *
 * The returned object is fresh; the input is never mutated.
 *
 * @param input The caller-provided lead fields (id, project, contact, etc.).
 * @returns A new Lead with `status: "New"` and an empty `timeline`.
 */
export function createLead(input: NewLeadInput): Lead {
  return {
    ...input,
    status: "New",
    timeline: [],
  };
}

// ---------------------------------------------------------------------------
// Timeline append operations
// ---------------------------------------------------------------------------

/**
 * Records a status transition on a lead (Req 38.3).
 *
 * Appends exactly one `status_change` timeline entry — capturing the lead's
 * current status as `fromStatus` and the requested `toStatus` — preserves all
 * prior entries in order, and advances `lead.status` to `toStatus`.
 *
 * Returns a new {@link Lead}; the input lead and its timeline are not mutated.
 *
 * @param lead     The lead to transition.
 * @param toStatus The status the lead is moving to.
 * @param by       Optional identifier of the actor performing the change.
 * @param at       Optional timestamp (ms); defaults to `Date.now()`.
 * @returns A new Lead with the updated status and appended timeline entry.
 */
export function appendStatusChange(
  lead: Lead,
  toStatus: LeadStatus,
  by?: string,
  at?: number,
): Lead {
  const entry: LeadTimelineEntry = {
    type: "status_change",
    at: at ?? Date.now(),
    fromStatus: lead.status,
    toStatus,
    ...(by !== undefined ? { by } : {}),
  };

  return {
    ...lead,
    status: toStatus,
    timeline: [...lead.timeline, entry],
  };
}

/**
 * Records a note on a lead (Req 38.4).
 *
 * Appends exactly one `note` timeline entry and preserves all prior entries in
 * order. The lead's `status` is unchanged.
 *
 * Returns a new {@link Lead}; the input lead and its timeline are not mutated.
 *
 * @param lead The lead to annotate.
 * @param note The note text to record.
 * @param by   Optional identifier of the actor adding the note.
 * @param at   Optional timestamp (ms); defaults to `Date.now()`.
 * @returns A new Lead with the appended timeline entry.
 */
export function appendNote(
  lead: Lead,
  note: string,
  by?: string,
  at?: number,
): Lead {
  const entry: LeadTimelineEntry = {
    type: "note",
    at: at ?? Date.now(),
    note,
    ...(by !== undefined ? { by } : {}),
  };

  return {
    ...lead,
    timeline: [...lead.timeline, entry],
  };
}
