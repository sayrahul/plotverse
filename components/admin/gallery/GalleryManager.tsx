/**
 * GalleryManager — Admin_Panel gallery media management (Req 39).
 *
 * Lets an Admin_User manage a single Project's gallery (`Project.gallery`,
 * an ordered {@link MediaItem}[]). All three Req 39 operations are wired here,
 * each persisting the new gallery to Firestore via {@link projectRepo.update}:
 *
 * - Image/video upload (Req 39.1): the chosen `File` is uploaded to Firebase
 *   Storage with {@link storageClient.uploadMedia}, then a `MediaItem`
 *   (`type` derived from the file's MIME type, `storagePath` set to the
 *   returned path) is appended to the gallery and persisted.
 * - YouTube reference (Req 39.2): the entered id/URL is normalized to a bare
 *   video id and appended via the pure {@link addYoutubeReference}, then
 *   persisted.
 * - Media removal (Req 39.3): the selected item is dropped via the pure
 *   {@link removeMediaById}, then persisted.
 *
 * The mutation *shapes* live in the framework-free `lib/gallery.ts` (so they
 * stay property-testable, Property 29); this component owns only the I/O —
 * Storage upload, Firestore persistence, and resolving download URLs for
 * thumbnails/links via {@link storageClient.getDownloadUrl}.
 *
 * A project context is required. When a `projectId` prop is supplied the
 * manager operates on that project directly; otherwise it renders a picker
 * backed by {@link projectRepo.list}. Controls are gated through the access
 * policy (`media.upload` / `media.delete`) as a UI affordance — Firestore
 * Security Rules remain the authoritative boundary.
 *
 * Requirements: 39.1, 39.2, 39.3
 */

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useCan } from "@/components/admin/RoleContext";
import { addYoutubeReference, removeMediaById } from "@/lib/gallery";
import { projectRepo } from "@/lib/firebase/repos";
import { storageClient } from "@/lib/firebase/storage";
import type { MediaItem, Project } from "@/lib/types";

/** Props for {@link GalleryManager}. */
export interface GalleryManagerProps {
  /**
   * When supplied, the manager operates on this Project directly and skips the
   * picker. Otherwise the Admin_User chooses a project from the list.
   */
  projectId?: string;
}

/**
 * Derives the {@link MediaItem} media type from an uploaded file's MIME type.
 * A `video/*` type maps to `"video"`; anything else (incl. missing type) is
 * treated as an `"image"`, matching the image/video split in Req 39.1.
 */
function mediaTypeForFile(file: File): "image" | "video" {
  return file.type.startsWith("video/") ? "video" : "image";
}

/**
 * Normalizes a user-entered YouTube id or URL to a bare 11-character video id.
 *
 * Accepts a raw id, a `watch?v=` URL, a `youtu.be/<id>` short link, or an
 * `/embed/<id>` / `/shorts/<id>` URL. Returns `null` when no id can be
 * extracted so the caller can surface a validation message rather than storing
 * a malformed reference.
 */
export function parseYoutubeId(input: string): string | null {
  const trimmed = input.trim();
  if (trimmed === "") return null;

  // Bare id (the canonical stored form): 11 url-safe base64 chars.
  if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) return trimmed;

  // Try to pull an id out of any of the common YouTube URL shapes.
  const patterns = [
    /[?&]v=([A-Za-z0-9_-]{11})/, // watch?v=ID
    /youtu\.be\/([A-Za-z0-9_-]{11})/, // youtu.be/ID
    /\/embed\/([A-Za-z0-9_-]{11})/, // /embed/ID
    /\/shorts\/([A-Za-z0-9_-]{11})/, // /shorts/ID
  ];
  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match && match[1]) return match[1];
  }
  return null;
}

export function GalleryManager({ projectId }: GalleryManagerProps) {
  const canUpload = useCan("media.upload");
  const canDelete = useCan("media.delete");

  // Project context ----------------------------------------------------------
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | undefined>(projectId);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Operation state ------------------------------------------------------------
  const [busy, setBusy] = useState(false);
  const [youtubeInput, setYoutubeInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load the project list for the picker when no fixed projectId is given.
  useEffect(() => {
    if (projectId !== undefined) return;
    let active = true;
    setProjects(null);
    projectRepo
      .list()
      .then((list) => {
        if (!active) return;
        setProjects(list);
        // Default the selection to the first project so the manager is usable
        // immediately when projects exist.
        setSelectedId((current) => current ?? list[0]?.id);
      })
      .catch((err) => {
        if (active) setError(messageFor(err));
      });
    return () => {
      active = false;
    };
  }, [projectId]);

  // Load the selected project's document (and its gallery) whenever it changes.
  const loadProject = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const loaded = await projectRepo.get(id);
      setProject(loaded);
      if (loaded === null) setError(`Project not found: ${id}`);
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedId === undefined) {
      setProject(null);
      return;
    }
    void loadProject(selectedId);
  }, [selectedId, loadProject]);

  const gallery = project?.gallery ?? [];
  const activeProjectId = project?.id;

  /**
   * Persists a new gallery for the active project and reflects it locally so
   * the grid updates without a full reload (Req 39.1–39.3 all funnel here).
   */
  const persistGallery = useCallback(
    async (next: MediaItem[]) => {
      if (activeProjectId === undefined) return;
      await projectRepo.update(activeProjectId, { gallery: next });
      setProject((current) =>
        current === null ? current : { ...current, gallery: next },
      );
    },
    [activeProjectId],
  );

  // Upload an image/video and associate it with the project (Req 39.1).
  async function handleUpload(file: File) {
    if (activeProjectId === undefined) return;
    setBusy(true);
    setError(null);
    try {
      const storagePath = await storageClient.uploadMedia(activeProjectId, file);
      const item: MediaItem = {
        id: `media_${Date.now().toString(36)}`,
        type: mediaTypeForFile(file),
        storagePath,
      };
      await persistGallery([...gallery, item]);
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  // Add a YouTube reference to the project gallery (Req 39.2).
  async function handleAddYoutube() {
    if (activeProjectId === undefined) return;
    const youtubeId = parseYoutubeId(youtubeInput);
    if (youtubeId === null) {
      setError("Enter a valid YouTube video id or URL.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await persistGallery(addYoutubeReference(gallery, youtubeId));
      setYoutubeInput("");
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setBusy(false);
    }
  }

  // Remove a media item's association with the project (Req 39.3).
  async function handleRemove(id: string) {
    if (activeProjectId === undefined) return;
    setBusy(true);
    setError(null);
    try {
      await persistGallery(removeMediaById(gallery, id));
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Gallery</h1>
        <p className="mt-1 text-sm text-slate-500">
          Upload images and videos or add YouTube references for a project.
        </p>
      </header>

      {projectId === undefined && (
        <ProjectPicker
          projects={projects}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      )}

      {error !== null && (
        <p
          role="alert"
          className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      {loading && <p className="text-sm text-slate-500">Loading project…</p>}

      {!loading && activeProjectId !== undefined && (
        <div className="space-y-6">
          {/* Upload + YouTube controls */}
          <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 sm:grid-cols-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-700">
                Upload image or video
              </h2>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                disabled={!canUpload || busy}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void handleUpload(file);
                }}
                className="mt-2 block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white disabled:cursor-not-allowed disabled:opacity-60"
              />
              {!canUpload && (
                <p className="mt-1 text-xs text-slate-400">
                  Your role cannot upload media.
                </p>
              )}
            </div>

            <div>
              <h2 className="text-sm font-semibold text-slate-700">
                Add YouTube reference
              </h2>
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={youtubeInput}
                  disabled={!canUpload || busy}
                  placeholder="Video id or URL"
                  onChange={(event) => setYoutubeInput(event.target.value)}
                  className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => void handleAddYoutube()}
                  disabled={!canUpload || busy || youtubeInput.trim() === ""}
                  className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Add
                </button>
              </div>
            </div>
          </section>

          {/* Media grid */}
          <section>
            <h2 className="mb-3 text-sm font-semibold text-slate-700">
              Media ({gallery.length})
            </h2>
            {gallery.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
                No media yet. Upload a file or add a YouTube reference.
              </p>
            ) : (
              <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {gallery.map((item) => (
                  <MediaCard
                    key={item.id}
                    item={item}
                    canDelete={canDelete}
                    busy={busy}
                    onRemove={() => void handleRemove(item.id)}
                  />
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {!loading &&
        projectId === undefined &&
        projects !== null &&
        projects.length === 0 && (
          <p className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            No projects yet. Create a project before managing its gallery.
          </p>
        )}
    </div>
  );
}

/** Props for {@link ProjectPicker}. */
interface ProjectPickerProps {
  projects: Project[] | null;
  selectedId: string | undefined;
  onSelect: (id: string) => void;
}

/** Dropdown that selects which project's gallery is being managed. */
function ProjectPicker({ projects, selectedId, onSelect }: ProjectPickerProps) {
  return (
    <div className="mb-6 max-w-sm">
      <label
        htmlFor="gallery-project"
        className="block text-sm font-medium text-slate-700"
      >
        Project
      </label>
      <select
        id="gallery-project"
        value={selectedId ?? ""}
        disabled={projects === null || projects.length === 0}
        onChange={(event) => onSelect(event.target.value)}
        className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
      >
        {projects === null && <option value="">Loading projects…</option>}
        {projects !== null && projects.length === 0 && (
          <option value="">No projects available</option>
        )}
        {projects?.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} ({p.id})
          </option>
        ))}
      </select>
    </div>
  );
}

/** Props for {@link MediaCard}. */
interface MediaCardProps {
  item: MediaItem;
  canDelete: boolean;
  busy: boolean;
  onRemove: () => void;
}

/**
 * Renders a single gallery item with a thumbnail/link and a remove control.
 * Storage-backed items resolve a download URL lazily via
 * {@link storageClient.getDownloadUrl}; YouTube items use the standard
 * thumbnail/watch URLs derived from the stored id.
 */
function MediaCard({ item, canDelete, busy, onRemove }: MediaCardProps) {
  const [url, setUrl] = useState<string | null>(item.thumbnailUrl ?? null);

  useEffect(() => {
    if (item.youtubeId !== undefined) {
      setUrl(`https://img.youtube.com/vi/${item.youtubeId}/hqdefault.jpg`);
      return;
    }
    if (item.thumbnailUrl !== undefined) {
      setUrl(item.thumbnailUrl);
      return;
    }
    if (item.storagePath === undefined) return;
    let active = true;
    storageClient
      .getDownloadUrl(item.storagePath)
      .then((resolved) => {
        if (active) setUrl(resolved);
      })
      .catch(() => {
        // A missing thumbnail is non-fatal; the card still shows a label and
        // the remove control.
        if (active) setUrl(null);
      });
    return () => {
      active = false;
    };
  }, [item.storagePath, item.thumbnailUrl, item.youtubeId]);

  const href = useMemo(() => {
    if (item.youtubeId !== undefined) {
      return `https://www.youtube.com/watch?v=${item.youtubeId}`;
    }
    return url ?? undefined;
  }, [item.youtubeId, url]);

  return (
    <li className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="flex aspect-video items-center justify-center bg-slate-100">
        {url !== null && item.type !== "video" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={`${item.type} media`}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
            {item.type}
          </span>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        {href !== undefined ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate text-xs text-slate-500 hover:text-slate-900 hover:underline"
          >
            {labelFor(item)}
          </a>
        ) : (
          <span className="truncate text-xs text-slate-500">{labelFor(item)}</span>
        )}
        {canDelete && (
          <button
            type="button"
            onClick={onRemove}
            disabled={busy}
            className="shrink-0 rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Remove
          </button>
        )}
      </div>
    </li>
  );
}

/** Builds a short human label for a media item used under its thumbnail. */
function labelFor(item: MediaItem): string {
  if (item.youtubeId !== undefined) return `YouTube · ${item.youtubeId}`;
  if (item.storagePath !== undefined) {
    const name = item.storagePath.split("/").pop();
    return name ?? item.type;
  }
  return item.type;
}

/** Extracts a human-readable message from an unknown thrown value. */
function messageFor(err: unknown): string {
  return err instanceof Error ? err.message : "Something went wrong.";
}
