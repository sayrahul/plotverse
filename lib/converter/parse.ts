/**
 * File_Converter — format detection and multi-format parsing (task 7.1).
 *
 * Converts uploaded geospatial files (GeoJSON, JSON, KML, KMZ, SHP ZIP, DXF,
 * CSV) into a common in-memory GeoJSON {@link GeoJSON.FeatureCollection}
 * (Req 34.1). Enrichment (task 7.3) and validation (task 7.5) run on the
 * result of this stage.
 *
 * Parser failures are caught and re-thrown as a typed {@link ParseError} that
 * names the failing format and, where known, the offending sub-file or feature
 * so the Admin_Panel can report exactly what went wrong (Req 34.1).
 *
 * Note on async: `parseToGeoJSON` returns a `Promise`. KMZ (JSZip) and SHP ZIP
 * (shpjs) decompression are inherently asynchronous, so a synchronous signature
 * cannot faithfully parse those formats. Text formats resolve immediately.
 *
 * Requirements: 34.1
 */

import { kml as kmlToGeoJSON } from "@tmcw/togeojson";
import { DOMParser } from "@xmldom/xmldom";
import JSZip from "jszip";
import Papa from "papaparse";
import DxfParser, {
  type IEntity,
  type ILwpolylineEntity,
  type IPolylineEntity,
} from "dxf-parser";

import type { GeoJSON } from "@/lib/geojson";
import { ParseError, type SourceFormat } from "@/lib/converter/types";

// ---------------------------------------------------------------------------
// Format detection (Req 34.1)
// ---------------------------------------------------------------------------

/** Lowercased file extension (without the dot), or "" when none is present. */
function extensionOf(name: string): string {
  const match = /\.([^.\\/]+)$/.exec(name.toLowerCase().trim());
  return match ? match[1]! : "";
}

/** Maps a MIME type to a SourceFormat where the mapping is unambiguous. */
function formatFromMime(mime: string): SourceFormat | null {
  switch (mime.toLowerCase().split(";")[0]!.trim()) {
    case "application/geo+json":
      return "geojson";
    case "application/json":
    case "text/json":
      return "json";
    case "application/vnd.google-earth.kml+xml":
      return "kml";
    case "application/vnd.google-earth.kmz":
      return "kmz";
    case "application/dxf":
    case "application/x-dxf":
    case "image/vnd.dxf":
    case "image/x-dxf":
      return "dxf";
    case "text/csv":
    case "application/csv":
      return "csv";
    case "application/zip":
    case "application/x-zip-compressed":
    case "application/x-zip":
      return "shp-zip";
    default:
      return null;
  }
}

/**
 * Detects the source format of an uploaded file from its filename extension,
 * falling back to its MIME type (Req 34.1).
 *
 * The filename extension is the strongest signal (a `.geojson` and a `.json`
 * file may share the `application/json` MIME type), so it is checked first; the
 * MIME type resolves cases where the extension is missing or ambiguous (a
 * generic `.json`/`.zip` whose MIME identifies it as geo+json/kmz). Returns
 * `null` when the format cannot be determined.
 */
export function detectFormat(file: { name: string; type: string }): SourceFormat | null {
  const ext = extensionOf(file.name ?? "");
  const mime = file.type ?? "";

  switch (ext) {
    case "geojson":
      return "geojson";
    case "json":
      // A .json file may actually be GeoJSON; trust an explicit geo+json MIME.
      return formatFromMime(mime) === "geojson" ? "geojson" : "json";
    case "kml":
      return "kml";
    case "kmz":
      return "kmz";
    case "zip":
      return "shp-zip";
    case "dxf":
      return "dxf";
    case "csv":
      return "csv";
    default:
      // No usable extension — fall back to the MIME type entirely.
      return formatFromMime(mime);
  }
}

// ---------------------------------------------------------------------------
// Parsing (Req 34.1)
// ---------------------------------------------------------------------------

/**
 * Parses any supported format into a GeoJSON FeatureCollection (Req 34.1).
 *
 * @param format  the source format, typically from {@link detectFormat}.
 * @param content the file contents: a `string` for text formats, or an
 *                `ArrayBuffer` for binary formats (KMZ, SHP ZIP). Text formats
 *                also accept an `ArrayBuffer`, which is UTF-8 decoded.
 * @returns a Promise resolving to the converted FeatureCollection.
 * @throws  {@link ParseError} naming the format and failing source on failure.
 */
export async function parseToGeoJSON(
  format: SourceFormat,
  content: ArrayBuffer | string,
): Promise<GeoJSON.FeatureCollection> {
  switch (format) {
    case "geojson":
    case "json":
      return parseGeoJSONText(format, toText(content));
    case "kml":
      return parseKML(toText(content));
    case "kmz":
      return parseKMZ(toArrayBuffer(content, "kmz"));
    case "shp-zip":
      return parseShapefileZip(toArrayBuffer(content, "shp-zip"));
    case "dxf":
      return parseDXF(toText(content));
    case "csv":
      return parseCSV(toText(content));
    default:
      throw new ParseError(`Unsupported format: ${String(format)}`, {
        format,
        kind: "unsupported-format",
      });
  }
}

// ---------------------------------------------------------------------------
// GeoJSON / JSON
// ---------------------------------------------------------------------------

/** Parses GeoJSON/JSON text and normalizes it into a FeatureCollection. */
function parseGeoJSONText(
  format: SourceFormat,
  text: string,
): GeoJSON.FeatureCollection {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (cause) {
    throw new ParseError("File is not valid JSON.", { format, cause });
  }
  return normalizeToFeatureCollection(parsed, format);
}

/**
 * Coerces an arbitrary parsed GeoJSON value into a FeatureCollection. Accepts a
 * FeatureCollection, a single Feature, a bare Geometry, or an array of any of
 * these. Throws a {@link ParseError} when no features can be derived.
 */
function normalizeToFeatureCollection(
  value: unknown,
  format: SourceFormat,
): GeoJSON.FeatureCollection {
  if (value === null || typeof value !== "object") {
    throw new ParseError("File does not contain GeoJSON.", {
      format,
      kind: "empty",
    });
  }

  const obj = value as { type?: unknown; features?: unknown };

  if (obj.type === "FeatureCollection" && Array.isArray(obj.features)) {
    return value as GeoJSON.FeatureCollection;
  }
  if (obj.type === "Feature") {
    return featureCollection([value as GeoJSON.Feature]);
  }
  if (typeof obj.type === "string" && isGeometryType(obj.type)) {
    return featureCollection([toFeature(value as GeoJSON.Geometry)]);
  }
  if (Array.isArray(value)) {
    const features = (value as unknown[]).map((item, index) => {
      const entry = item as { type?: unknown };
      if (entry && entry.type === "Feature") return item as GeoJSON.Feature;
      if (entry && typeof entry.type === "string" && isGeometryType(entry.type)) {
        return toFeature(item as GeoJSON.Geometry);
      }
      throw new ParseError("Array contains a non-GeoJSON element.", {
        format,
        kind: "invalid-geometry",
        featureIndex: index,
      });
    });
    return featureCollection(features);
  }

  throw new ParseError("Unrecognized GeoJSON structure.", {
    format,
    kind: "empty",
  });
}

// ---------------------------------------------------------------------------
// KML / KMZ
// ---------------------------------------------------------------------------

/** Parses KML text into a FeatureCollection using a server-safe XML DOM. */
function parseKML(text: string): GeoJSON.FeatureCollection {
  let doc: Document;
  try {
    // @xmldom/xmldom provides a DOM in non-browser (server/test) environments.
    doc = new DOMParser().parseFromString(text, "text/xml") as unknown as Document;
  } catch (cause) {
    throw new ParseError("KML is not well-formed XML.", { format: "kml", cause });
  }
  try {
    const fc = kmlToGeoJSON(doc) as unknown as GeoJSON.FeatureCollection;
    if (!fc || !Array.isArray(fc.features)) {
      throw new ParseError("KML produced no features.", {
        format: "kml",
        kind: "empty",
      });
    }
    return fc;
  } catch (cause) {
    if (cause instanceof ParseError) throw cause;
    throw new ParseError("Failed to convert KML to GeoJSON.", {
      format: "kml",
      cause,
    });
  }
}

/** Unzips a KMZ archive, locates its KML document, and parses it. */
async function parseKMZ(buffer: ArrayBuffer): Promise<GeoJSON.FeatureCollection> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch (cause) {
    throw new ParseError("KMZ is not a readable ZIP archive.", {
      format: "kmz",
      cause,
    });
  }

  // Prefer the conventional doc.kml; otherwise use the first .kml entry found.
  const kmlEntry =
    zip.file(/(^|\/)doc\.kml$/i)[0] ?? zip.file(/\.kml$/i)[0] ?? null;
  if (!kmlEntry) {
    throw new ParseError("KMZ archive contains no .kml document.", {
      format: "kmz",
      kind: "empty",
    });
  }

  let kmlText: string;
  try {
    kmlText = await kmlEntry.async("string");
  } catch (cause) {
    throw new ParseError("Failed to read KML from KMZ archive.", {
      format: "kmz",
      source: kmlEntry.name,
      cause,
    });
  }

  try {
    return parseKML(kmlText);
  } catch (cause) {
    if (cause instanceof ParseError) {
      // Re-stamp with the KMZ format and the failing entry name.
      throw new ParseError(cause.message, {
        format: "kmz",
        kind: cause.kind,
        source: kmlEntry.name,
        cause,
      });
    }
    throw cause;
  }
}

// ---------------------------------------------------------------------------
// Shapefile ZIP
// ---------------------------------------------------------------------------

/**
 * Parses a zipped shapefile (.shp/.dbf/.prj bundle) into a FeatureCollection.
 *
 * `shpjs` is imported dynamically because its ESM bundle references the
 * browser-only `self` global at module-evaluation time; loading it lazily keeps
 * this module importable in plain Node (e.g. type-checking) while still working
 * in the browser where the File_Converter runs.
 */
async function parseShapefileZip(
  buffer: ArrayBuffer,
): Promise<GeoJSON.FeatureCollection> {
  let shp: (b: ArrayBuffer) => Promise<unknown>;
  try {
    const mod = (await import("shpjs")) as unknown as {
      default: (b: ArrayBuffer) => Promise<unknown>;
    };
    shp = mod.default;
  } catch (cause) {
    throw new ParseError("Could not load the shapefile parser.", {
      format: "shp-zip",
      cause,
    });
  }

  let result: unknown;
  try {
    result = await shp(buffer);
  } catch (cause) {
    throw new ParseError("Failed to parse shapefile ZIP.", {
      format: "shp-zip",
      cause,
    });
  }

  // shpjs returns a FeatureCollection, or an array of them (one per layer).
  const collections = (
    Array.isArray(result) ? result : [result]
  ) as Array<GeoJSON.FeatureCollection & { fileName?: string }>;

  const features: GeoJSON.Feature[] = [];
  for (const collection of collections) {
    if (!collection || !Array.isArray(collection.features)) {
      throw new ParseError("Shapefile produced no features.", {
        format: "shp-zip",
        kind: "empty",
        source: collection?.fileName,
      });
    }
    features.push(...collection.features);
  }

  if (features.length === 0) {
    throw new ParseError("Shapefile ZIP contained no geometry.", {
      format: "shp-zip",
      kind: "empty",
    });
  }
  return featureCollection(features);
}

// ---------------------------------------------------------------------------
// DXF
// ---------------------------------------------------------------------------

/**
 * Parses a DXF drawing into a FeatureCollection. POLYLINE/LWPOLYLINE entities
 * become Polygons when closed and LineStrings when open; the source layer name
 * is preserved as a feature property. Other entity types are ignored.
 */
function parseDXF(text: string): GeoJSON.FeatureCollection {
  let dxf: ReturnType<DxfParser["parseSync"]>;
  try {
    dxf = new DxfParser().parseSync(text);
  } catch (cause) {
    throw new ParseError("Failed to parse DXF drawing.", {
      format: "dxf",
      cause,
    });
  }

  const entities = dxf?.entities ?? [];
  const features: GeoJSON.Feature[] = [];

  entities.forEach((entity: IEntity, index: number) => {
    if (entity.type !== "POLYLINE" && entity.type !== "LWPOLYLINE") return;

    const polyEntity = entity as IPolylineEntity | ILwpolylineEntity;
    const vertices = polyEntity.vertices ?? [];
    const ring: GeoJSON.Position[] = vertices
      .filter((v) => typeof v.x === "number" && typeof v.y === "number")
      .map((v) => [v.x, v.y] as GeoJSON.Position);

    if (ring.length < 2) return; // not enough points for a line or polygon

    const closed = isClosedPolyline(polyEntity);
    const properties = { layer: entity.layer, dxfType: entity.type };

    if (closed && ring.length >= 3) {
      features.push({
        type: "Feature",
        properties,
        geometry: { type: "Polygon", coordinates: [closeRing(ring)] },
      });
    } else {
      features.push({
        type: "Feature",
        properties,
        geometry: { type: "LineString", coordinates: ring },
      });
    }

    // `index` retained for parity with feature ordering / future diagnostics.
    void index;
  });

  if (features.length === 0) {
    throw new ParseError(
      "DXF contained no polyline geometry to convert.",
      { format: "dxf", kind: "empty" },
    );
  }
  return featureCollection(features);
}

/** True when a DXF polyline entity is flagged closed (shape bit set). */
function isClosedPolyline(entity: IPolylineEntity | ILwpolylineEntity): boolean {
  return Boolean((entity as { shape?: boolean }).shape);
}

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------

const LAT_KEYS = ["lat", "latitude", "y"];
const LNG_KEYS = ["lng", "lon", "long", "longitude", "x"];
const GEOMETRY_KEYS = ["geojson", "geometry", "geom"];

/**
 * Parses CSV into a FeatureCollection. Each row becomes one Feature. A row may
 * carry geometry either as latitude/longitude columns (→ Point) or as a column
 * containing inline GeoJSON geometry (→ that geometry). Remaining columns are
 * attached as feature properties.
 */
function parseCSV(text: string): GeoJSON.FeatureCollection {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });

  if (result.errors.length > 0) {
    const first = result.errors[0]!;
    throw new ParseError(`CSV parse error: ${first.message}`, {
      format: "csv",
      kind: "parse-error",
      featureIndex: typeof first.row === "number" ? first.row : undefined,
    });
  }

  const rows = result.data;
  if (rows.length === 0) {
    throw new ParseError("CSV contained no data rows.", {
      format: "csv",
      kind: "empty",
    });
  }

  const fields = result.meta.fields ?? Object.keys(rows[0] ?? {});
  const latKey = findKey(fields, LAT_KEYS);
  const lngKey = findKey(fields, LNG_KEYS);
  const geomKey = findKey(fields, GEOMETRY_KEYS);

  if (!geomKey && (!latKey || !lngKey)) {
    throw new ParseError(
      "CSV is missing geometry: expected latitude/longitude columns or a geometry column.",
      { format: "csv", kind: "invalid-geometry" },
    );
  }

  const features = rows.map((row, index) => {
    const geometry = geomKey
      ? parseGeometryCell(row[geomKey], index)
      : parsePointFromRow(row, latKey!, lngKey!, index);

    const properties: Record<string, unknown> = {};
    for (const key of fields) {
      if (key === latKey || key === lngKey || key === geomKey) continue;
      properties[key] = row[key];
    }
    return { type: "Feature", geometry, properties } as GeoJSON.Feature;
  });

  return featureCollection(features);
}

/** Builds a Point geometry from a row's lat/lng cells, validating numbers. */
function parsePointFromRow(
  row: Record<string, string>,
  latKey: string,
  lngKey: string,
  index: number,
): GeoJSON.Point {
  const lat = Number(row[latKey]);
  const lng = Number(row[lngKey]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new ParseError("CSV row has non-numeric latitude/longitude.", {
      format: "csv",
      kind: "invalid-geometry",
      featureIndex: index,
    });
  }
  return { type: "Point", coordinates: [lng, lat] };
}

/** Parses an inline GeoJSON geometry from a CSV cell. */
function parseGeometryCell(
  cell: string | undefined,
  index: number,
): GeoJSON.Geometry {
  if (!cell || cell.trim() === "") {
    throw new ParseError("CSV row has an empty geometry cell.", {
      format: "csv",
      kind: "invalid-geometry",
      featureIndex: index,
    });
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(cell);
  } catch (cause) {
    throw new ParseError("CSV geometry cell is not valid GeoJSON.", {
      format: "csv",
      kind: "invalid-geometry",
      featureIndex: index,
      cause,
    });
  }
  const geom = parsed as { type?: unknown };
  if (!geom || typeof geom.type !== "string" || !isGeometryType(geom.type)) {
    throw new ParseError("CSV geometry cell is not a GeoJSON geometry.", {
      format: "csv",
      kind: "invalid-geometry",
      featureIndex: index,
    });
  }
  return parsed as GeoJSON.Geometry;
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const GEOMETRY_TYPES = new Set<string>([
  "Point",
  "MultiPoint",
  "LineString",
  "MultiLineString",
  "Polygon",
  "MultiPolygon",
  "GeometryCollection",
]);

/** Type guard: whether a string names a GeoJSON geometry type. */
function isGeometryType(type: string): boolean {
  return GEOMETRY_TYPES.has(type);
}

/** Wraps a bare geometry in a Feature with empty properties. */
function toFeature(geometry: GeoJSON.Geometry): GeoJSON.Feature {
  return { type: "Feature", geometry, properties: {} };
}

/** Builds a FeatureCollection from a list of features. */
function featureCollection(features: GeoJSON.Feature[]): GeoJSON.FeatureCollection {
  return { type: "FeatureCollection", features };
}

/** Ensures a polygon ring is explicitly closed (first point repeated at end). */
function closeRing(ring: GeoJSON.Position[]): GeoJSON.Position[] {
  const first = ring[0]!;
  const last = ring[ring.length - 1]!;
  if (first[0] === last[0] && first[1] === last[1]) return ring;
  return [...ring, [first[0]!, first[1]!]];
}

/** Case-insensitively finds the first field whose name matches a candidate. */
function findKey(fields: string[], candidates: string[]): string | undefined {
  const lowered = candidates.map((c) => c.toLowerCase());
  return fields.find((f) => lowered.includes(f.trim().toLowerCase()));
}

/** Decodes content to a UTF-8 string (passes strings through unchanged). */
function toText(content: ArrayBuffer | string): string {
  if (typeof content === "string") return content;
  return new TextDecoder("utf-8").decode(new Uint8Array(content));
}

/** Requires binary content for formats that cannot be parsed from text. */
function toArrayBuffer(
  content: ArrayBuffer | string,
  format: SourceFormat,
): ArrayBuffer {
  if (typeof content === "string") {
    throw new ParseError(
      `The ${format} format requires binary (ArrayBuffer) content.`,
      { format, kind: "parse-error" },
    );
  }
  return content;
}
