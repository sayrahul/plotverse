/**
 * External link builders for the Project_Viewer (pure, framework-free).
 *
 * These functions assemble the outbound URLs used by the Plot_Detail_Sheet and
 * share actions: turn-by-turn directions in Google/Apple Maps, a pre-filled
 * WhatsApp enquiry, and a deep-link share URL for a project (optionally a
 * specific plot). Every builder returns a string that parses as a valid URL.
 *
 * Coordinates follow GeoJSON convention: `GeoJSON.Position` is `[lng, lat]`.
 * Both maps providers expect `lat,lng`, so the order is swapped here.
 *
 * Requirements:
 * - 17.1 — Google Maps directions link targeting the plot location.
 * - 17.2 — Apple Maps directions link targeting the plot location.
 * - 18.1 — shareable URL whose `plot` query parameter is the plot id.
 * - 19.1 — WhatsApp conversation with a pre-filled, URL-encoded message.
 */

import type { GeoJSON } from "@/lib/geojson";

/**
 * Builds a Google Maps directions URL targeting `dest` (Req 17.1).
 *
 * Uses the Google Maps URLs API (`maps/dir/?api=1`). The `destination`
 * parameter carries the latitude/longitude in Google's expected `lat,lng`
 * order; the comma is percent-encoded by {@link URLSearchParams}.
 */
export function googleMapsDirections(dest: GeoJSON.Position): string {
  const { lat, lng } = toLatLng(dest);
  const url = new URL("https://www.google.com/maps/dir/");
  url.searchParams.set("api", "1");
  url.searchParams.set("destination", `${lat},${lng}`);
  return url.toString();
}

/**
 * Builds an Apple Maps directions URL targeting `dest` (Req 17.2).
 *
 * The `daddr` (destination address) parameter carries the latitude/longitude in
 * Apple's expected `lat,lng` order.
 */
export function appleMapsDirections(dest: GeoJSON.Position): string {
  const { lat, lng } = toLatLng(dest);
  const url = new URL("https://maps.apple.com/");
  url.searchParams.set("daddr", `${lat},${lng}`);
  return url.toString();
}

/**
 * Builds a WhatsApp click-to-chat URL for `phone` with a pre-filled `message`
 * (Req 19.1).
 *
 * The phone number is normalized to digits only (the international format
 * `wa.me` expects). The message is percent-encoded with
 * {@link encodeURIComponent} so that decoding the `text` parameter — whether
 * via `decodeURIComponent` or `URLSearchParams.get` — recovers the original
 * message exactly.
 */
export function whatsappEnquiryUrl(phone: string, message: string): string {
  const normalizedPhone = phone.replace(/[^0-9]/g, "");
  const encodedMessage = encodeURIComponent(message);
  // Round-trip through URL to guarantee a well-formed result. The query is
  // already fully percent-encoded, so the parser leaves it untouched.
  return new URL(`https://wa.me/${normalizedPhone}?text=${encodedMessage}`).toString();
}

/**
 * Builds a shareable Project_Viewer URL for `projectId`, optionally deep-linking
 * to a specific plot via the `plot` query parameter (Req 18.1).
 *
 * The project id is appended to the path of `base` (any trailing slashes on the
 * base path are collapsed). When `plotId` is supplied, the resulting URL's
 * `plot` parameter equals it exactly; when omitted, no `plot` parameter is
 * added.
 *
 * @param base - An absolute base URL, e.g. `https://plotverse.app`.
 * @param projectId - The project identifier to place in the path.
 * @param plotId - Optional plot identifier for the `plot` query parameter.
 */
export function buildShareUrl(base: string, projectId: string, plotId?: string): string {
  const url = new URL(base);
  const basePath = url.pathname.replace(/\/+$/, "");
  url.pathname = `${basePath}/${projectId}`;
  if (plotId !== undefined) {
    url.searchParams.set("plot", plotId);
  }
  return url.toString();
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Extracts `lat`/`lng` from a GeoJSON position (`[lng, lat]`), throwing if the
 * position does not contain at least a longitude and latitude.
 */
function toLatLng(dest: GeoJSON.Position): { lat: number; lng: number } {
  const lng = dest[0];
  const lat = dest[1];
  if (lng === undefined || lat === undefined) {
    throw new Error("Destination position must contain at least [longitude, latitude].");
  }
  return { lat, lng };
}
