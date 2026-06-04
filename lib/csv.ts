/**
 * Lead CSV export encoding (pure, framework-free).
 *
 * Serializes a list of {@link Lead} records into a single CSV document for the
 * CRM lead export (Req 38.5). The encoder hand-writes RFC-4180 escaping rather
 * than delegating to a parsing library so the output is fully deterministic and
 * under our control:
 *
 * - Fields are separated by commas and records by CRLF (`\r\n`).
 * - A field is wrapped in double quotes when it contains a comma, a double
 *   quote, a carriage return, or a line feed.
 * - Embedded double quotes inside a quoted field are escaped by doubling them.
 *
 * The output is one header row followed by one row per lead, with a fixed,
 * deterministic column order ({@link CSV_COLUMNS}). This module performs no I/O
 * and is the target of Property 28 (lead CSV export round-trip): parsing the
 * emitted CSV back recovers each lead's exported field values, with special
 * characters (commas, quotes, newlines) surviving the escape/unescape cycle.
 *
 * Requirements: 38.5
 */

import type { Lead } from "@/lib/types";

/**
 * The exported columns, in output order. This set is stable: the order and
 * membership define the CSV schema, so changing it changes the export format.
 * `plotId` is optional on {@link Lead} and serializes to an empty field when
 * absent.
 */
export const CSV_COLUMNS = [
  "id",
  "projectId",
  "plotId",
  "name",
  "contact",
  "message",
  "status",
  "createdAt",
] as const;

/** Record separator mandated by RFC-4180 (Section 2.1). */
const RECORD_SEPARATOR = "\r\n";

/** Field separator. */
const FIELD_SEPARATOR = ",";

/**
 * Encodes a list of leads as an RFC-4180 CSV document.
 *
 * The result always begins with a header row naming the columns in
 * {@link CSV_COLUMNS} order, followed by one row per lead in the order given.
 * An empty input still produces the header row. Special characters within any
 * field are escaped so the document round-trips losslessly (Property 28).
 *
 * @param leads The leads to export, in the desired row order.
 * @returns The complete CSV document as a single string.
 */
export function leadsToCsv(leads: Lead[]): string {
  const header = CSV_COLUMNS.map(escapeField).join(FIELD_SEPARATOR);
  const rows = leads.map((lead) =>
    CSV_COLUMNS.map((column) => escapeField(fieldValue(lead, column))).join(FIELD_SEPARATOR),
  );
  return [header, ...rows].join(RECORD_SEPARATOR);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Extracts the raw string value for a single column of a lead.
 *
 * Absent optional fields (e.g. `plotId`) and any nullish value become the empty
 * string; numeric fields (e.g. `createdAt`) are rendered with the default
 * number-to-string conversion so they parse back to the same value.
 */
function fieldValue(lead: Lead, column: (typeof CSV_COLUMNS)[number]): string {
  const value = lead[column];
  if (value === undefined || value === null) {
    return "";
  }
  return String(value);
}

/**
 * Applies RFC-4180 escaping to a single field.
 *
 * Fields containing a comma, double quote, carriage return, or line feed are
 * wrapped in double quotes, and any embedded double quotes are doubled. Fields
 * without special characters are emitted verbatim.
 */
function escapeField(value: string): string {
  const needsQuoting =
    value.includes(FIELD_SEPARATOR) ||
    value.includes('"') ||
    value.includes("\r") ||
    value.includes("\n");

  if (!needsQuoting) {
    return value;
  }

  return `"${value.replace(/"/g, '""')}"`;
}
