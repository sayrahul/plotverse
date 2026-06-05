/**
 * Core domain models and types for the PlotVerse platform.
 *
 * All geometry is stored as WGS84 (EPSG:4326) GeoJSON (Req 34.3). Areas are
 * stored in canonical square meters and converted for display (Req 28, 34.2).
 *
 * Requirements: 2.1, 6.1, 9.2, 13.1, 21.1, 32.2, 38.2
 */

import { GeoJSON } from "@/lib/geojson";

// ---------------------------------------------------------------------------
// Enumerations
// ---------------------------------------------------------------------------

/** Plot lifecycle status driving map color and filtering (Req 6). */
export type PlotStatus = "available" | "sold" | "reserved" | "blocked";

/** Lead pipeline status; a new lead starts as "New" (Req 38.2, 20.4). */
export type LeadStatus =
  | "New"
  | "Contacted"
  | "Interested"
  | "Negotiating"
  | "Closed"
  | "Lost";

/** Admin authorization roles (Req 32). */
export type AdminRole = "superadmin" | "editor";

/** Plot label rendering format (Req 7). */
export type LabelFormat = "number" | "number+area" | "number+price" | "custom";

/** Area display units; square meters is the canonical store (Req 28, 16). */
export type Unit = "sqft" | "sqm" | "sqyd" | "acre" | "gunta";

// ---------------------------------------------------------------------------
// Media & gallery (Req 21, 39)
// ---------------------------------------------------------------------------

export interface MediaItem {
  id: string;
  type: "image" | "video" | "youtube"; // Req 21.1
  storagePath?: string; // image/video in Storage (Req 39.1)
  youtubeId?: string; // Req 39.2
  thumbnailUrl?: string;
}

// ---------------------------------------------------------------------------
// GeoJSON version history (Req 35)
// ---------------------------------------------------------------------------

export interface GeojsonVersion {
  storagePath: string;
  savedAt: number;
  savedBy: string;
}

// ---------------------------------------------------------------------------
// Project (Req 2.1)
// ---------------------------------------------------------------------------

export interface Project {
  id: string; // 5–6 char alphanumeric (Req 2.1)
  name: string;
  description: string;
  center: GeoJSON.Position;
  defaultZoom: number;
  labelFormat: LabelFormat; // Req 7
  contactPhone: string; // WhatsApp (Req 19)
  socialLinks: Record<string, string>;
  amenities: string[];
  gallery: MediaItem[]; // Req 21, 39
  geojsonStoragePath: string; // current GeoJSON in Storage (Req 35.1)
  geojsonHistory: GeojsonVersion[]; // most recent 5 (Req 35.2)
  ogImageUrl?: string; // Req 31
  imageOverlay?: {
    url: string;
    coordinates: [
      [number, number], // Top Left
      [number, number], // Top Right
      [number, number], // Bottom Right
      [number, number]  // Bottom Left
    ]
  };
  createdAt: number;
  updatedAt: number;
}

// ---------------------------------------------------------------------------
// Plot (Req 6.1)
// ---------------------------------------------------------------------------

export interface Plot {
  id: string;
  projectId: string;
  number: string; // search key (Req 14.1)
  status: PlotStatus;
  geometry: GeoJSON.Polygon; // WGS84 (Req 34.3)
  areaSqm: number; // canonical (Req 34.2)
  centroid: GeoJSON.Position; // Req 34.2
  price?: number;
  facing?: string;
  amenities?: string[];
  zoneId?: string; // Req 37.3
  customLabel?: string; // Req 7.5
}

// ---------------------------------------------------------------------------
// Zone (Req 9.2)
// ---------------------------------------------------------------------------

export interface Zone {
  id: string;
  projectId: string;
  name: string; // Req 9.2
  geometry: GeoJSON.Polygon;
}

// ---------------------------------------------------------------------------
// Status group (Req 13.1)
// ---------------------------------------------------------------------------

export interface StatusGroup {
  id: string; // referenced by `status` URL param (Req 13.3)
  projectId: string;
  name: string; // Req 13.1
  statuses: PlotStatus[]; // selected criteria
}

// ---------------------------------------------------------------------------
// Leads & CRM (Req 20, 38)
// ---------------------------------------------------------------------------

export interface LeadTimelineEntry {
  type: "status_change" | "note"; // Req 38.3–38.4
  at: number;
  by?: string;
  fromStatus?: LeadStatus;
  toStatus?: LeadStatus;
  note?: string;
}

export interface Lead {
  id: string;
  projectId: string; // Req 20.2
  plotId?: string;
  name: string;
  contact: string;
  message: string;
  status: LeadStatus; // starts "New" (Req 20.4)
  timeline: LeadTimelineEntry[];
  createdAt: number;
}

// ---------------------------------------------------------------------------
// Shareable viewer state (Req 3, 5, 8, 12, 15, 16)
// ---------------------------------------------------------------------------

export interface ViewerState {
  status?: string; // status group id
  plot?: string; // plot id
  zone?: string; // zone id
  view?: "3d"; // only "3d" is meaningful
  tab?: "gallery"; // only "gallery" is meaningful
}
