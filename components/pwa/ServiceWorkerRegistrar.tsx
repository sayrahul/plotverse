"use client";

import { useEffect } from "react";

/**
 * Registers the PlotVerse service worker on the client (Req 40.1).
 *
 * Registering a service worker is a browser prerequisite for offering the
 * "Add to Home Screen" / install prompt. This component renders nothing; it
 * just performs the registration once after mount, guarded by a feature check
 * so it is a no-op in environments without service worker support (and during
 * server rendering). Registration is deferred to the `load` event so it never
 * competes with first paint.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch((error) => {
        // Registration failures should never break the app; log for diagnostics.
        console.error("Service worker registration failed:", error);
      });
    };

    if (document.readyState === "complete") {
      register();
      return;
    }

    window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}

export default ServiceWorkerRegistrar;
