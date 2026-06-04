/**
 * Geojson_History retention (pure, framework-free).
 *
 * When an Admin_User saves converted GeoJSON, the new version is appended to
 * the Project's Geojson_History and the history is trimmed so that only the
 * most recent 5 versions are retained (Req 35.2). This module owns that
 * trimming rule and performs no I/O.
 *
 * Ordering convention: history is stored **most-recent-last**. A new version is
 * appended to the end of the list, then the list is trimmed from the front so
 * the surviving entries are the `keep` most recent ones, preserving their
 * relative order. This is the target of Property 22 (GeoJSON history retention).
 *
 * Requirements: 35.2
 */

/** Default number of versions retained in the Geojson_History (Req 35.2). */
export const DEFAULT_RETAINED_VERSIONS = 5;

/**
 * Appends `next` to `history` and returns a new array containing only the most
 * recent `keep` versions, in order (most-recent-last).
 *
 * The input array is never mutated; a new array is always returned. When the
 * combined length is at or below `keep`, every version is retained. When it
 * exceeds `keep`, the oldest entries (at the front) are dropped so exactly
 * `keep` entries remain — the `keep` most recently saved versions in their
 * original relative order.
 *
 * @typeParam T - The version entry type (e.g. `GeojsonVersion`); the function
 *   is generic and never inspects the entries it retains.
 * @param history - The existing history, ordered most-recent-last.
 * @param next - The newly saved version to append.
 * @param keep - Maximum number of versions to retain. Defaults to
 *   {@link DEFAULT_RETAINED_VERSIONS} (5). Non-positive values retain nothing.
 * @returns A new array of at most `keep` versions, the most recent in order.
 */
export function retainRecentVersions<T>(
  history: T[],
  next: T,
  keep: number = DEFAULT_RETAINED_VERSIONS,
): T[] {
  // Append the new version without mutating the caller's array.
  const appended = [...history, next];

  // A non-positive cap retains nothing; guard before slicing.
  if (keep <= 0) {
    return [];
  }

  // Trim from the front so the surviving entries are the `keep` most recent,
  // preserving their relative (most-recent-last) order. When `appended` is
  // already within the cap, slice returns a full copy.
  return appended.slice(-keep);
}
