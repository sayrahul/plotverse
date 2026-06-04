/**
 * QR code generation for the Project_Viewer share URL (pure-ish, framework-free).
 *
 * Thin wrappers over the `qrcode` library that encode a viewer URL into a QR
 * code. The module is intentionally limited to *generation*: producing a PNG
 * data URL, drawing onto a canvas for display, and producing a downloadable PNG
 * Blob. Triggering the actual browser download is the responsibility of the
 * Info_Panel UI (task 16.7); this module only supplies the artifacts it needs.
 *
 * Requirements:
 * - 23.1 — generate a QR code that encodes the Project_Viewer URL.
 * - 23.2 — provide the QR as a downloadable PNG image.
 */

import { toCanvas, toDataURL } from "qrcode";

/** Options that tune QR rendering. All fields are optional. */
export interface QrOptions {
  /**
   * Output image edge length in pixels. Takes precedence over the library's
   * module-scale heuristic so callers get a predictable size.
   * @default 512
   */
  width?: number;
  /** Width of the quiet zone (border), in modules. @default 4 */
  margin?: number;
  /**
   * Error correction level. Higher levels tolerate more damage/obstruction at
   * the cost of denser codes. @default "M"
   */
  errorCorrectionLevel?: "L" | "M" | "Q" | "H";
  /** Foreground (dark) color in hex RGBA, e.g. `#000000ff`. @default "#000000ff" */
  darkColor?: string;
  /** Background (light) color in hex RGBA, e.g. `#ffffffff`. @default "#ffffffff" */
  lightColor?: string;
}

const DEFAULT_WIDTH = 512;
const DEFAULT_MARGIN = 4;
const DEFAULT_ECL = "M" as const;

/**
 * Maps the module's friendly {@link QrOptions} onto the `qrcode` renderer
 * options shape, applying the platform defaults for any omitted field.
 */
function toRendererOptions(options: QrOptions = {}) {
  return {
    width: options.width ?? DEFAULT_WIDTH,
    margin: options.margin ?? DEFAULT_MARGIN,
    errorCorrectionLevel: options.errorCorrectionLevel ?? DEFAULT_ECL,
    color: {
      dark: options.darkColor ?? "#000000ff",
      light: options.lightColor ?? "#ffffffff",
    },
  };
}

/**
 * Encodes `url` as a QR code and returns it as a PNG `data:` URL (Req 23.1).
 *
 * The returned string is a fully self-contained `data:image/png;base64,...`
 * URL suitable for an `<img src>` or for triggering a download via an anchor's
 * `download` attribute.
 */
export function qrPngDataUrl(url: string, options?: QrOptions): Promise<string> {
  return toDataURL(url, { type: "image/png", ...toRendererOptions(options) });
}

/**
 * Draws the QR code for `url` onto an existing `<canvas>` element for display
 * (Req 23.1).
 *
 * Useful when the Info_Panel renders the QR live (e.g. to read pixels back or
 * re-export). Resolves once the canvas has been painted.
 */
export function drawQrToCanvas(
  canvas: HTMLCanvasElement,
  url: string,
  options?: QrOptions,
): Promise<void> {
  return toCanvas(canvas, url, toRendererOptions(options));
}

/**
 * Encodes `url` as a QR code and returns it as a PNG {@link Blob} ready for
 * download (Req 23.2).
 *
 * The UI can create an object URL from this Blob (`URL.createObjectURL`) and
 * trigger a download. Generation happens via the PNG data URL so the result is
 * identical to {@link qrPngDataUrl}, just in binary form.
 */
export async function qrPngBlob(url: string, options?: QrOptions): Promise<Blob> {
  const dataUrl = await qrPngDataUrl(url, options);
  return dataUrlToBlob(dataUrl);
}

/**
 * Converts a base64 `data:` URL into a {@link Blob}.
 *
 * Implemented with `atob` + `Uint8Array` so it works in the browser without a
 * network round-trip through `fetch`. Throws if the input is not a base64
 * `data:` URL.
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const match = /^data:([^;,]+);base64,(.*)$/s.exec(dataUrl);
  if (!match) {
    throw new Error("Expected a base64-encoded data: URL");
  }
  const mimeType = match[1]!;
  const base64 = match[2]!;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}
