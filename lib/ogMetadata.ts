/**
 * Open Graph / SEO metadata derivation for the Project_Viewer (pure, framework-free).
 *
 * Given a Project document, this module derives the social-preview metadata
 * that the App Router's `generateMetadata` will emit for a Project_Viewer page
 * (Req 31.1). The title and description are derived from the Project's stored
 * `name` and `description` (Req 31.2), and the image comes from the Project's
 * stored `ogImageUrl`.
 *
 * Every returned field is guaranteed non-empty even when the corresponding
 * stored field is blank or whitespace-only: titles and descriptions fall back
 * to values derived from the Project itself (its name or id), and the image
 * falls back to a default platform asset. This guarantee is the target of
 * Property 24 (OG metadata derivation). The module performs no I/O so it can be
 * called directly from `generateMetadata`.
 *
 * Requirements: 31.1, 31.2
 */

import type { Project } from "@/lib/types";

/** Derived social/SEO metadata for a Project_Viewer page (Req 31.1). */
export interface OgMetadata {
  title: string;
  description: string;
  image: string;
}

/**
 * Default OG image used when a Project has no `ogImageUrl` configured.
 *
 * A non-empty image is required by Req 31.1, so this platform asset stands in
 * whenever a Project has not supplied its own preview image.
 */
export const DEFAULT_OG_IMAGE = "/og-default.png";

/**
 * Derives the Open Graph metadata for `project` (Req 31.1, 31.2).
 *
 * The title and description are taken from the Project's stored `name` and
 * `description` when present, satisfying the "derived from stored data"
 * requirement (Req 31.2). When a stored field is missing or blank, a non-empty
 * fallback derived from the Project is substituted so that all three fields are
 * always non-empty (Property 24):
 *
 * - `title`       → the trimmed project name, else `Project {id}`.
 * - `description` → the trimmed project description, else the derived title.
 * - `image`       → the trimmed `ogImageUrl`, else {@link DEFAULT_OG_IMAGE}.
 *
 * @param project The project whose social metadata is being produced.
 * @returns Metadata with a non-empty title, description, and image.
 */
export function deriveOgMetadata(project: Project): OgMetadata {
  const title = nonEmpty(project.name) ?? `Project ${project.id}`;
  const description = nonEmpty(project.description) ?? title;
  const image = nonEmpty(project.ogImageUrl) ?? DEFAULT_OG_IMAGE;

  return { title, description, image };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Returns the trimmed value when it contains non-whitespace characters, or
 * `undefined` when the value is absent, empty, or whitespace-only.
 *
 * This lets callers treat blank stored fields the same as missing ones when
 * choosing a fallback, keeping every derived field genuinely non-empty.
 */
function nonEmpty(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
