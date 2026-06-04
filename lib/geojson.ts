/**
 * Minimal local GeoJSON type definitions (RFC 7946 subset).
 *
 * These mirror the shape of the `@types/geojson` package so that domain code
 * can reference `GeoJSON.Position`, `GeoJSON.Polygon`, `GeoJSON.Feature`, and
 * `GeoJSON.FeatureCollection`. They are defined locally to avoid adding an npm
 * dependency. If `@types/geojson` is installed later, importers of this
 * namespace continue to compile and can be migrated to the package types.
 *
 * Requirements: 34.3 (WGS84 GeoJSON storage) and the data models in design.md.
 */

// eslint-disable-next-line
export namespace GeoJSON {
  /** A coordinate: [longitude, latitude] (optionally with elevation). */
  export type Position = number[];

  export type GeoJsonGeometryTypes =
    | "Point"
    | "MultiPoint"
    | "LineString"
    | "MultiLineString"
    | "Polygon"
    | "MultiPolygon"
    | "GeometryCollection";

  export type GeoJsonTypes = GeoJsonGeometryTypes | "Feature" | "FeatureCollection";

  /** Bounding box: [west, south, east, north] (optionally 3D). */
  export type BBox =
    | [number, number, number, number]
    | [number, number, number, number, number, number];

  export interface GeoJsonObject {
    type: GeoJsonTypes;
    bbox?: BBox;
  }

  export interface Point extends GeoJsonObject {
    type: "Point";
    coordinates: Position;
  }

  export interface MultiPoint extends GeoJsonObject {
    type: "MultiPoint";
    coordinates: Position[];
  }

  export interface LineString extends GeoJsonObject {
    type: "LineString";
    coordinates: Position[];
  }

  export interface MultiLineString extends GeoJsonObject {
    type: "MultiLineString";
    coordinates: Position[][];
  }

  export interface Polygon extends GeoJsonObject {
    type: "Polygon";
    coordinates: Position[][];
  }

  export interface MultiPolygon extends GeoJsonObject {
    type: "MultiPolygon";
    coordinates: Position[][][];
  }

  export interface GeometryCollection extends GeoJsonObject {
    type: "GeometryCollection";
    geometries: Geometry[];
  }

  export type Geometry =
    | Point
    | MultiPoint
    | LineString
    | MultiLineString
    | Polygon
    | MultiPolygon
    | GeometryCollection;

  // eslint-disable-next-line
  export type GeoJsonProperties = { [name: string]: any } | null;

  export interface Feature<
    G extends Geometry | null = Geometry,
    P = GeoJsonProperties,
  > extends GeoJsonObject {
    type: "Feature";
    geometry: G;
    id?: string | number;
    properties: P;
  }

  export interface FeatureCollection<
    G extends Geometry | null = Geometry,
    P = GeoJsonProperties,
  > extends GeoJsonObject {
    type: "FeatureCollection";
    features: Array<Feature<G, P>>;
  }
}
