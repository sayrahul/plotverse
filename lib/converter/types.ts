/**
 * Shared types for the File_Converter (`lib/converter/*`).
 *
 * These are deliberately framework-free so the parsing, enrichment, and
 * validation stages can all import the same error/result shapes. `parse.ts`
 * (task 7.1) and `validate.ts` (task 7.5) both depend on {@link ValidationError}.
 *
 * Requirements: 34.1 (multi-format conversion), 34.3–34.4 (validation/error
 * reporting), 36.1 (serialization round-trip).
 */

import type { GeoJSON } from "@/lib/geojson";

/** Supported upload formats converted into GeoJSON (Req 34.1). */
export type SourceFormat =
  | "geojson"
  | "json"
  | "kml"
  | "kmz"
  | "shp-zip"
  | "dxf"
  | "csv";

/**
 * Categorizes a validation or conversion failure so the Admin_Panel can group
 * and present errors, and so saving can be withheld until they are resolved
 * (Req 34.4).
 */
export type ValidationErrorKind =
  | "parse-error" // the source file could not be parsed at all
  | "unsupported-format" // the detected/declared format is not supported
  | "empty" // parsing succeeded but produced no usable features
  | "invalid-geometry" // a feature's geometry is malformed
  | "out-of-bounds" // a coordinate falls outside WGS84 bounds (Req 34.3)
  | "open-ring"; // a polygon ring is not closed (Req 34.3)

/**
 * A single, human-presentable problem with an uploaded file or a converted
 * feature. `featureIndex` and `source` pinpoint which feature/file failed so
 * the error can be reported precisely to the Admin_User (Req 34.1, 34.4).
 */
export interface ValidationError {
  kind: ValidationErrorKind;
  /** Human-readable description shown to the Admin_User. */
  message: string;
  /** Index of the offending feature in the FeatureCollection, when applicable. */
  featureIndex?: number;
  /** Name of the source file or sub-file (e.g. an entry inside a KMZ/SHP ZIP). */
  source?: string;
}

/**
 * The result of converting an uploaded file: the produced FeatureCollection
 * together with any validation errors. Saving is withheld while `errors` is
 * non-empty (Req 34.4).
 */
export interface ConversionResult {
  featureCollection: GeoJSON.FeatureCollection;
  errors: ValidationError[];
}

/**
 * Typed error thrown when a source file cannot be parsed into GeoJSON. Carries
 * the format and, where known, the specific file/sub-file or feature that
 * failed so the caller can report exactly what went wrong (Req 34.1).
 */
export class ParseError extends Error {
  readonly kind: ValidationErrorKind;
  readonly format: SourceFormat;
  readonly source?: string;
  readonly featureIndex?: number;

  constructor(
    message: string,
    options: {
      format: SourceFormat;
      kind?: ValidationErrorKind;
      source?: string;
      featureIndex?: number;
      cause?: unknown;
    },
  ) {
    super(message);
    this.name = "ParseError";
    this.kind = options.kind ?? "parse-error";
    this.format = options.format;
    this.source = options.source;
    this.featureIndex = options.featureIndex;
    if (options.cause !== undefined) {
      // Preserve the underlying parser error for debugging.
      (this as { cause?: unknown }).cause = options.cause;
    }
  }

  /** Projects this error into a {@link ValidationError} for aggregated reporting. */
  toValidationError(): ValidationError {
    return {
      kind: this.kind,
      message: this.message,
      featureIndex: this.featureIndex,
      source: this.source,
    };
  }
}
