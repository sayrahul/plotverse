/**
 * Gallery media add/remove operations (pure, framework-free).
 *
 * A Project's gallery is an ordered list of {@link MediaItem}s. These helpers
 * implement the two mutation shapes the Admin_Panel needs — adding a YouTube
 * video reference and removing a media item by id — as pure functions that
 * return a brand-new array and never mutate their inputs. Keeping them I/O free
 * makes them straightforward to property-test (Property 29) while the
 * data-access layer owns persistence to Firestore.
 *
 * Requirements:
 * - 39.2 — add a YouTube video reference to a Project gallery.
 * - 39.3 — remove a media item from a Project gallery.
 */

import type { MediaItem } from "@/lib/types";

/**
 * Appends a single YouTube media item carrying `youtubeId` to `media`
 * (Req 39.2).
 *
 * The returned list is a new array containing every existing item, in order,
 * followed by exactly one new item with `type: "youtube"` and the given
 * `youtubeId`. The input `media` array and its items are left untouched.
 *
 * When `id` is omitted a fresh, unused identifier is generated so repeated
 * additions of the same `youtubeId` remain distinct items.
 *
 * @param media - The current gallery list.
 * @param youtubeId - The YouTube video id to reference.
 * @param id - Optional explicit id for the new item; generated when absent.
 * @returns A new gallery list with the YouTube reference appended.
 */
export function addYoutubeReference(
  media: MediaItem[],
  youtubeId: string,
  id?: string,
): MediaItem[] {
  const item: MediaItem = {
    id: id ?? generateMediaId(media),
    type: "youtube",
    youtubeId,
  };
  return [...media, item];
}

/**
 * Removes the media item whose id equals `id` from `media` (Req 39.3).
 *
 * The returned list is a new array containing every item whose id differs from
 * `id`, preserving their original relative order. If no item matches, the
 * result is a new array with the same contents. The input `media` array is left
 * untouched.
 *
 * @param media - The current gallery list.
 * @param id - The id of the media item to remove.
 * @returns A new gallery list without the identified item.
 */
export function removeMediaById(media: MediaItem[], id: string): MediaItem[] {
  return media.filter((item) => item.id !== id);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Generates an id for a new media item that does not collide with any id
 * already present in `existing`.
 *
 * The id combines a stable prefix with a random suffix; on the rare chance of a
 * collision a new suffix is drawn until the id is free. This keeps generated
 * ids unique within a gallery without requiring a shared counter or external
 * dependency.
 */
function generateMediaId(existing: MediaItem[]): string {
  const taken = new Set(existing.map((item) => item.id));
  let candidate = randomMediaId();
  while (taken.has(candidate)) {
    candidate = randomMediaId();
  }
  return candidate;
}

/** Builds a candidate media id from a prefix and a random base-36 suffix. */
function randomMediaId(): string {
  const suffix = Math.random().toString(36).slice(2, 10);
  return `media_${suffix}`;
}
