import type { MetadataRoute } from "next";

/**
 * Web App Manifest for PlotVerse (Req 40.1).
 *
 * Next.js App Router serves this at `/manifest.webmanifest` and automatically
 * injects the corresponding `<link rel="manifest">` into every page's `<head>`,
 * so no manual linking is required in `app/layout.tsx`.
 *
 * `display: "standalone"` plus a `start_url`, `name`/`short_name`, theme/
 * background colors and an icon set are what browsers require to offer
 * "Add to Home Screen" / "Install app", enabling installation to the device
 * home screen.
 *
 * NOTE: the referenced icon assets (`/icon-192.png`, `/icon-512.png`) must be
 * added to the `public/` directory as real PNG binaries before installability
 * works in production. They are referenced here by their conventional paths;
 * the manifest itself is correct and complete.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PlotVerse",
    short_name: "PlotVerse",
    description:
      "Explore real-estate land plots on an interactive satellite map.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#0a0a0a",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
