/**
 * Project_Viewer server shell — `/[projectId]` (Req 1.1, 1.2, 31.1, 31.2).
 *
 * This is a React Server Component shell. It (a) loads the Project document on
 * the server to produce per-project Open Graph / SEO metadata for social link
 * previews via `generateMetadata` (Req 31.1, 31.2), (b) renders a not-found
 * state when the Project_ID does not match an existing Project (Req 1.2), and
 * (c) mounts the client `<ProjectViewer>` that owns the map and overlay panels
 * when the Project exists (Req 1.1). The heavy Mapbox/viewer bundle lives in the
 * client component, keeping this shell server-only.
 *
 * The server read (`getProjectById`) never throws — a missing document, a
 * Firestore error, or missing admin env all resolve to `null` — so both
 * `generateMetadata` and the page render degrade to a not-found state instead
 * of crashing the request or the build.
 *
 * Requirements: 1.1, 1.2, 31.1, 31.2
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProjectViewer } from "@/components/viewer/ProjectViewer";
import { getProjectById } from "@/lib/firebase/serverReads";
import { deriveOgMetadata } from "@/lib/ogMetadata";

/** Route params for the dynamic `/[projectId]` segment. */
interface ProjectViewerPageProps {
  params: { projectId: string };
}

/**
 * Produces the per-project OG_Metadata for a Project_Viewer page (Req 31.1).
 *
 * Loads the Project on the server and derives a non-empty title, description,
 * and image from its stored data via {@link deriveOgMetadata} (Req 31.2),
 * emitting both the page title/description and the OpenGraph block used for
 * social previews. When the Project does not exist (or cannot be read), it
 * returns minimal not-found metadata rather than throwing.
 */
export async function generateMetadata({
  params,
}: ProjectViewerPageProps): Promise<Metadata> {
  const project = await getProjectById(params.projectId);

  if (!project) {
    return {
      title: "Project not found",
      description: "The requested project could not be found.",
    };
  }

  const { title, description, image } = deriveOgMetadata(project);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: image }],
    },
  };
}

/**
 * Renders the Project_Viewer for the requested Project_ID.
 *
 * Loads the Project on the server: when absent, invokes Next's `notFound()` to
 * render the not-found state for the path (Req 1.2); when present, mounts the
 * client `<ProjectViewer>` seeded with the Project_ID and the server-loaded
 * project so the map experience renders on a single page (Req 1.1).
 */
export default async function ProjectViewerPage({
  params,
}: ProjectViewerPageProps) {
  const project = await getProjectById(params.projectId);

  if (!project) {
    notFound();
  }

  return <ProjectViewer projectId={params.projectId} initialProject={project} />;
}
