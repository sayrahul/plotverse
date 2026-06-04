/**
 * Admin_Panel navigation sections (Req 33.1).
 *
 * Single source of truth for the management sections the AdminShell renders in
 * its navigation. Keeping the list here (rather than inline in the shell) lets
 * section pages reuse the same metadata and keeps routing consistent.
 *
 * The required sections per Req 33.1 are: Projects, Plots, Zones, Status
 * Groups, gallery media, the CRM, and share links — here surfaced as the eight
 * functional areas below (the File_Converter and GeoJSON history back the
 * geospatial upload/versioning flows of Req 34/35).
 *
 * A section MAY be reserved for the superadmin role by setting
 * {@link AdminSection.requiredAction}; the shell consults `lib/access.ts` to
 * hide it from editors (Req 32.3). The eight base sections are available to any
 * authenticated Admin_User (Req 32.2).
 *
 * Requirements: 32.2, 32.3, 33.1
 */

import type { AdminAction } from "@/lib/access";

/** A single navigable management section in the Admin_Panel. */
export interface AdminSection {
  /** Stable identifier, also used as a React key. */
  id: string;
  /** Human-readable nav label. */
  label: string;
  /** Route the nav item links to (under `/admin`). */
  href: string;
  /** Short description shown on the dashboard landing. */
  description: string;
  /**
   * When set, the section is only shown to roles permitted this action per the
   * access policy. Omitted means available to every authenticated Admin_User.
   */
  requiredAction?: AdminAction;
}

/**
 * The Admin_Panel sections, in nav order (Req 33.1). The first entry is the
 * dashboard overview; the rest are the management sections implemented by
 * tasks 17.2–17.6 and the geospatial panels (17.4).
 */
export const ADMIN_SECTIONS: readonly AdminSection[] = [
  {
    id: "overview",
    label: "Overview",
    href: "/admin",
    description: "Dashboard summary of the Admin_Panel.",
  },
  {
    id: "projects",
    label: "Projects",
    href: "/admin/projects",
    description: "Create, update, and delete projects.",
  },
  {
    id: "plots",
    label: "Plots",
    href: "/admin/plots",
    description: "Edit plots, assign zones, and set label formats.",
  },
  {
    id: "zones",
    label: "Zones",
    href: "/admin/zones",
    description: "Create and manage project zones.",
  },
  {
    id: "status-groups",
    label: "Status Groups",
    href: "/admin/status-groups",
    description: "Define status groups used for filtering.",
  },
  {
    id: "gallery",
    label: "Gallery",
    href: "/admin/gallery",
    description: "Upload media and add YouTube references.",
  },
  {
    id: "crm",
    label: "CRM",
    href: "/admin/crm",
    description: "Manage leads, pipeline, and notes.",
  },
  {
    id: "converter",
    label: "File Converter",
    href: "/admin/converter",
    description: "Upload and convert geospatial files to GeoJSON.",
  },
  {
    id: "geojson-history",
    label: "GeoJSON History",
    href: "/admin/geojson-history",
    description: "Review saved versions and roll back.",
  },
];
