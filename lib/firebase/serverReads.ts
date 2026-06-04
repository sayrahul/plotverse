/**
 * Server-side Firestore reads for React Server Components, route handlers, and
 * middleware.
 *
 * These helpers run only on the server (RSC / `generateMetadata`) and use the
 * `firebase-admin` SDK via {@link getAdminFirestore} together with the typed
 * {@link adminProjectDoc} reference helper, so callers receive fully-formed
 * domain objects without scattering casts (Req 2.2, 24.1).
 *
 * Every read is wrapped in try/catch and returns `null` on any failure —
 * including a missing document, a transient Firestore error, or missing admin
 * credentials/env in the current environment. This lets the Project_Viewer
 * shell render a not-found state rather than crashing the request or the build
 * when a project does not exist (Req 1.2).
 *
 * Requirements: 1.2, 2.2, 24.1
 */

import { adminProjectDoc } from "@/lib/firebase/converters";
import { getAdminFirestore } from "@/lib/firebase/server";
import type { Project } from "@/lib/types";

/**
 * Loads a Project by its Project_ID using the admin SDK, or returns `null` when
 * the project does not exist or cannot be read.
 *
 * The read never throws: a missing document, a Firestore failure, or missing
 * admin credentials all resolve to `null` so the caller (e.g. the
 * `/[projectId]` server shell and its `generateMetadata`) can fall back to a
 * not-found state (Req 1.2).
 *
 * @param projectId The Project_ID (equals the Firestore document id, Req 2.2).
 * @returns The Project document, or `null` when absent or unreadable.
 */
export async function getProjectById(projectId: string): Promise<Project | null> {
  try {
    const snapshot = await adminProjectDoc(getAdminFirestore(), projectId).get();
    return snapshot.exists ? (snapshot.data() ?? null) : null;
  } catch {
    // Missing env/credentials or a transient read error: treat as not-found so
    // the viewer shell renders a not-found state instead of crashing (Req 1.2).
    return null;
  }
}
