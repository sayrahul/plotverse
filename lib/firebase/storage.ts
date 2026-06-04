/**
 * Firebase Storage client for GeoJSON persistence and gallery media.
 *
 * The Admin_Panel stores each saved GeoJSON file and every gallery image/video
 * in Firebase Storage (Req 35.1, 39.1). This module wraps the modular
 * `firebase/storage` SDK (`ref`, `uploadString`, `uploadBytes`,
 * `getDownloadURL`, `listAll`, `getMetadata`) behind a small, typed
 * `storageClient` so the upload/list/download surface lives in one place.
 *
 * Responsibilities owned here (pure-ish I/O against Storage):
 * - `uploadGeoJSON` — serialize a FeatureCollection deterministically (Req
 *   36.1/36.2) and write it to a *versioned* Storage path so each save is its
 *   own immutable object, returning a {@link GeojsonVersion}.
 * - `uploadMedia` — upload an image/video blob and return its Storage path
 *   (Req 39.1).
 * - `getDownloadUrl` — resolve the public download URL for a stored object.
 * - `listVersions` — enumerate the GeoJSON versions stored for a project,
 *   reconstructing {@link GeojsonVersion} entries from object names + custom
 *   metadata.
 *
 * Responsibilities *coordinated* (not owned) here:
 * On save, the platform must also create/update the corresponding Plot
 * documents and append the new version to the Project's `geojsonHistory`,
 * trimmed to the most recent 5 (Req 35.1, 35.2). Those writes belong to the
 * Firestore repositories (task 12.1) and the File_Converter enrich step (task
 * 17.4), which are not importable from here yet. Rather than hard-coupling to a
 * `repos.ts` that may not exist, {@link saveGeoJSON} performs the Storage
 * upload itself and delegates the Firestore/derivation work through an injected
 * {@link SaveGeoJSONRepos} seam. Task 17.4 wires the real repo functions in.
 *
 * Requirements: 35.1, 36.2, 39.1
 */

import {
  getDownloadURL,
  getMetadata,
  listAll,
  ref,
  uploadBytes,
  uploadString,
  type FirebaseStorage,
  type StorageReference,
} from "firebase/storage";

import { getClientStorage } from "@/lib/firebase/client";
import { serializeGeoJSON } from "@/lib/converter/serialize";
import { GeoJSON } from "@/lib/geojson";
import { DEFAULT_RETAINED_VERSIONS, retainRecentVersions } from "@/lib/history";
import type { GeojsonVersion, Plot } from "@/lib/types";

// ---------------------------------------------------------------------------
// Storage path helpers
// ---------------------------------------------------------------------------

/** MIME type used for stored GeoJSON objects. */
const GEOJSON_CONTENT_TYPE = "application/geo+json";

/** File extension (incl. dot) used for stored GeoJSON version objects. */
const GEOJSON_EXTENSION = ".geojson";

/**
 * Storage path conventions for a project. Centralized so the upload, list, and
 * download code can never disagree about where objects live, and so the layout
 * is documented in one place.
 *
 * - GeoJSON versions: `projects/{projectId}/geojson/{savedAt}.geojson`
 *   (one immutable object per save; the filename encodes the save timestamp).
 * - Gallery media: `projects/{projectId}/media/{savedAt}-{safeName}`.
 */
export const storagePaths = {
  /** Folder containing every stored GeoJSON version for a project. */
  geojsonDir: (projectId: string) => `projects/${projectId}/geojson`,
  /** Path for a single GeoJSON version keyed by its save timestamp. */
  geojsonVersion: (projectId: string, savedAt: number) =>
    `projects/${projectId}/geojson/${savedAt}${GEOJSON_EXTENSION}`,
  /** Folder containing gallery media for a project. */
  mediaDir: (projectId: string) => `projects/${projectId}/media`,
  /** Path for a single media object, timestamped to avoid name collisions. */
  media: (projectId: string, savedAt: number, fileName: string) =>
    `projects/${projectId}/media/${savedAt}-${sanitizeFileName(fileName)}`,
} as const;

/**
 * Makes a user-supplied file name safe for use as a Storage object segment by
 * collapsing anything outside `[A-Za-z0-9._-]` to a single underscore. Empty or
 * all-unsafe names fall back to a generic `"upload"` so the path stays valid.
 */
function sanitizeFileName(name: string): string {
  const cleaned = name.trim().replace(/[^A-Za-z0-9._-]+/g, "_").replace(/^_+/, "");
  return cleaned.length > 0 ? cleaned : "upload";
}

/** Resolves the storage handle, defaulting to the shared client singleton. */
function resolveStorage(storage?: FirebaseStorage): FirebaseStorage {
  return storage ?? getClientStorage();
}

// ---------------------------------------------------------------------------
// GeoJSON upload + listing
// ---------------------------------------------------------------------------

/**
 * Serializes `fc` and uploads it to a new versioned Storage path, returning the
 * {@link GeojsonVersion} that identifies it (Req 35.1, 36.2).
 *
 * The content is produced by {@link serializeGeoJSON}, which is deterministic
 * (sorted object keys, preserved coordinate order) so the stored bytes
 * round-trip exactly into the Map_Renderer (Req 36.1/36.2). The save timestamp
 * (`savedAt`) is encoded both in the object name and in the object's
 * `customMetadata`, and `savedBy` is recorded in `customMetadata` so
 * {@link listVersions} can reconstruct the full version record from Storage
 * alone.
 *
 * @param projectId the owning Project_ID.
 * @param fc        the converted FeatureCollection to persist.
 * @param savedBy   identifier of the Admin_User performing the save.
 * @param options   optional overrides (custom storage handle, fixed timestamp).
 * @returns the {@link GeojsonVersion} describing the stored object.
 */
async function uploadGeoJSON(
  projectId: string,
  fc: GeoJSON.FeatureCollection,
  savedBy: string,
  options?: { storage?: FirebaseStorage; savedAt?: number },
): Promise<GeojsonVersion> {
  const storage = resolveStorage(options?.storage);
  const savedAt = options?.savedAt ?? Date.now();
  const storagePath = storagePaths.geojsonVersion(projectId, savedAt);

  const objectRef = ref(storage, storagePath);
  await uploadString(objectRef, serializeGeoJSON(fc), "raw", {
    contentType: GEOJSON_CONTENT_TYPE,
    customMetadata: { savedBy, savedAt: String(savedAt) },
  });

  return { storagePath, savedAt, savedBy };
}

/**
 * Lists the GeoJSON versions stored for a project, ordered oldest-first
 * (most-recent-last) to match the {@link GeojsonVersion} history convention in
 * `lib/history.ts`.
 *
 * Each entry is reconstructed from the object name (the embedded save
 * timestamp) and its `customMetadata` (`savedBy`, and `savedAt` when present).
 * If metadata is unavailable for an object, the entry still resolves with the
 * timestamp parsed from the name and an empty `savedBy`. The authoritative
 * history (with guaranteed `savedBy`) also lives on the Project document; this
 * listing reflects exactly what currently exists in Storage.
 *
 * @param projectId the owning Project_ID.
 * @param options   optional override for the storage handle.
 */
async function listVersions(
  projectId: string,
  options?: { storage?: FirebaseStorage },
): Promise<GeojsonVersion[]> {
  const storage = resolveStorage(options?.storage);
  const dirRef = ref(storage, storagePaths.geojsonDir(projectId));

  const listing = await listAll(dirRef);
  const versions = await Promise.all(
    listing.items.map((item) => describeVersion(item)),
  );

  // Oldest-first so the tail is the most recent save (history convention).
  return versions.sort((a, b) => a.savedAt - b.savedAt);
}

/**
 * Builds a {@link GeojsonVersion} for a single stored GeoJSON object, preferring
 * `customMetadata` and falling back to the timestamp encoded in the name.
 */
async function describeVersion(item: StorageReference): Promise<GeojsonVersion> {
  const storagePath = item.fullPath;
  const savedAtFromName = parseSavedAt(item.name);

  try {
    const metadata = await getMetadata(item);
    const custom = metadata.customMetadata ?? {};
    const savedAt = toFiniteNumber(custom.savedAt) ?? savedAtFromName;
    return { storagePath, savedAt, savedBy: custom.savedBy ?? "" };
  } catch {
    // Metadata read failed (e.g. permissions/offline); the name still carries
    // the timestamp, so return a best-effort record rather than failing the
    // whole listing.
    return { storagePath, savedAt: savedAtFromName, savedBy: "" };
  }
}

/**
 * Extracts the save timestamp from a GeoJSON version object name of the form
 * `{savedAt}.geojson`. Returns `0` when the name does not encode a number, so
 * unrecognised objects sort to the front rather than throwing.
 */
function parseSavedAt(name: string): number {
  const base = name.endsWith(GEOJSON_EXTENSION)
    ? name.slice(0, -GEOJSON_EXTENSION.length)
    : name;
  return toFiniteNumber(base) ?? 0;
}

/** Parses a finite number from a string, returning `undefined` otherwise. */
function toFiniteNumber(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

// ---------------------------------------------------------------------------
// Media upload + download URLs
// ---------------------------------------------------------------------------

/**
 * Uploads a gallery image/video blob to Storage and returns its Storage path
 * (Req 39.1). The path is timestamped and the original (sanitized) file name is
 * preserved as the trailing segment so stored objects remain human-readable.
 *
 * The caller is responsible for associating the returned path with the Project
 * (e.g. appending a {@link import("@/lib/types").MediaItem} to the project's
 * gallery); that Firestore write belongs to the gallery manager / repo wiring.
 *
 * @param projectId the owning Project_ID.
 * @param file      the image/video to upload (a `File` or `Blob`).
 * @param options   optional overrides (storage handle, fixed timestamp).
 * @returns the Storage path of the uploaded object.
 */
async function uploadMedia(
  projectId: string,
  file: File,
  options?: { storage?: FirebaseStorage; savedAt?: number },
): Promise<string> {
  const storage = resolveStorage(options?.storage);
  const savedAt = options?.savedAt ?? Date.now();
  const fileName = typeof file.name === "string" ? file.name : "upload";
  const storagePath = storagePaths.media(projectId, savedAt, fileName);

  const objectRef = ref(storage, storagePath);
  await uploadBytes(objectRef, file, file.type ? { contentType: file.type } : undefined);

  return storagePath;
}

/**
 * Resolves the public download URL for a stored object given its Storage path
 * (e.g. a {@link GeojsonVersion.storagePath} or a media item's `storagePath`).
 *
 * @param storagePath the full Storage path of the object.
 * @param options     optional override for the storage handle.
 */
async function getDownloadUrl(
  storagePath: string,
  options?: { storage?: FirebaseStorage },
): Promise<string> {
  const storage = resolveStorage(options?.storage);
  return getDownloadURL(ref(storage, storagePath));
}

// ---------------------------------------------------------------------------
// Save coordination seam (Storage upload + Firestore writes)
// ---------------------------------------------------------------------------

/**
 * Repository/derivation seam used by {@link saveGeoJSON} to perform the
 * Firestore-side work of a save without this module importing the (not-yet
 * present) `repos.ts` or the File_Converter enrich step directly.
 *
 * Task 17.4 supplies a concrete implementation wired to:
 * - `projectRepo.get` / `projectRepo.update` (task 12.1) for the history,
 * - the File_Converter enrich output (task 17.4) for deriving Plot documents,
 * - `plotRepo.upsertMany` (task 12.1) for persisting them.
 */
export interface SaveGeoJSONRepos {
  /**
   * Returns the project's current Geojson_History (ordered most-recent-last),
   * or `[]` when the project has none yet. Backed by `projectRepo.get`.
   */
  loadHistory(projectId: string): Promise<GeojsonVersion[]>;

  /**
   * Derives the Plot documents represented by the saved FeatureCollection.
   * Backed by the File_Converter enrich step (areaSqm/centroid/etc.).
   */
  featuresToPlots(
    projectId: string,
    fc: GeoJSON.FeatureCollection,
  ): Plot[] | Promise<Plot[]>;

  /**
   * Creates or updates the derived Plot documents in the `plots` collection
   * (Req 35.1). Backed by `plotRepo.upsertMany`.
   */
  upsertPlots(projectId: string, plots: Plot[]): Promise<void>;

  /**
   * Persists the new current GeoJSON path and the trimmed history on the
   * Project document (Req 35.1, 35.2). Backed by `projectRepo.update`.
   */
  saveProjectVersion(
    projectId: string,
    patch: { geojsonStoragePath: string; geojsonHistory: GeojsonVersion[] },
  ): Promise<void>;
}

/** Outcome of a {@link saveGeoJSON} call. */
export interface SaveGeoJSONResult {
  /** The version that was uploaded and made current. */
  version: GeojsonVersion;
  /** The project's history after appending + trimming (most-recent-last). */
  history: GeojsonVersion[];
  /** The Plot documents that were upserted. */
  plots: Plot[];
}

/**
 * Saves converted GeoJSON end-to-end: uploads the file to Storage, upserts the
 * corresponding Plot documents, and appends the new version to the project's
 * history (trimmed to the most recent {@link DEFAULT_RETAINED_VERSIONS}) —
 * satisfying Req 35.1 and 35.2 together.
 *
 * Storage is owned here; the Firestore/derivation steps are delegated through
 * the {@link SaveGeoJSONRepos} seam so this module stays decoupled from the
 * repositories (task 12.1) and the File_Converter (task 17.4). The upload runs
 * first so that, even if a downstream Firestore write fails, the immutable
 * version object already exists in Storage and can be retried or rolled back.
 *
 * Order of operations:
 * 1. Upload the serialized GeoJSON to a new versioned path.
 * 2. Derive and upsert the Plot documents from the FeatureCollection.
 * 3. Append the version to the loaded history (trim to the most recent 5) and
 *    persist `geojsonStoragePath` + `geojsonHistory` on the Project.
 *
 * @param projectId the owning Project_ID.
 * @param fc        the converted FeatureCollection to persist.
 * @param savedBy   identifier of the Admin_User performing the save.
 * @param repos     the Firestore/derivation seam (see {@link SaveGeoJSONRepos}).
 * @param options   optional overrides (storage handle, fixed timestamp,
 *                  retained-versions cap).
 * @returns the uploaded {@link GeojsonVersion}, the trimmed history, and the
 *          upserted plots.
 */
async function saveGeoJSON(
  projectId: string,
  fc: GeoJSON.FeatureCollection,
  savedBy: string,
  repos: SaveGeoJSONRepos,
  options?: { storage?: FirebaseStorage; savedAt?: number; keep?: number },
): Promise<SaveGeoJSONResult> {
  // 1. Upload the immutable version object first (Req 35.1, 36.2).
  const version = await uploadGeoJSON(projectId, fc, savedBy, {
    storage: options?.storage,
    savedAt: options?.savedAt,
  });

  // 2. Derive and upsert the Plot documents for the saved geometry (Req 35.1).
  const plots = await repos.featuresToPlots(projectId, fc);
  await repos.upsertPlots(projectId, plots);

  // 3. Append to history (most-recent-last) and trim to the retained cap
  //    (Req 35.2), then persist the new current path + history on the Project.
  const existing = await repos.loadHistory(projectId);
  const history = retainRecentVersions(
    existing,
    version,
    options?.keep ?? DEFAULT_RETAINED_VERSIONS,
  );
  await repos.saveProjectVersion(projectId, {
    geojsonStoragePath: version.storagePath,
    geojsonHistory: history,
  });

  return { version, history, plots };
}

// ---------------------------------------------------------------------------
// Public client
// ---------------------------------------------------------------------------

/**
 * The Firebase Storage client surface used by the Admin_Panel data-access layer
 * (design.md "Data Access Layer"). Methods default to the shared client Storage
 * singleton; an explicit handle can be injected via each method's `options` for
 * tests or alternate apps.
 */
export const storageClient = {
  uploadGeoJSON,
  uploadMedia,
  getDownloadUrl,
  listVersions,
  /** Storage upload + Firestore coordination seam (see {@link saveGeoJSON}). */
  saveGeoJSON,
} as const;

export type StorageClient = typeof storageClient;
