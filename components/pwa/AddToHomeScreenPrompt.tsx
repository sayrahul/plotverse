"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * The `beforeinstallprompt` event is not yet in the standard DOM lib types, so
 * we model the slice we use. Browsers that support installability fire this
 * event and let us defer it, then trigger the native install UI later.
 */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  prompt: () => Promise<void>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** Delay before the Add-to-Home-Screen prompt appears (Req 40.2). */
const PROMPT_DELAY_MS = 30_000;

/** Heuristic for "mobile device" so the prompt only targets phones/tablets. */
function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }
  const ua = navigator.userAgent;
  return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua);
}

/**
 * Add-to-Home-Screen prompt for the Project_Viewer (Req 40.2).
 *
 * On a mobile device, after 30 seconds have elapsed on the viewer, this shows
 * an unobtrusive, dismissible banner inviting the user to install the app. It
 * captures the browser's `beforeinstallprompt` event and, when the user accepts
 * the banner, triggers the native install prompt via the deferred event.
 *
 * Renders nothing unless all conditions are met (mobile + 30s elapsed + a
 * deferred install prompt is available + not already dismissed/installed).
 */
export function AddToHomeScreenPrompt() {
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [hasInstallPrompt, setHasInstallPrompt] = useState(false);
  const [delayElapsed, setDelayElapsed] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Capture the deferred install prompt and prevent the browser's default
  // mini-infobar so we control when the prompt is shown.
  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      deferredPromptRef.current = event as BeforeInstallPromptEvent;
      setHasInstallPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    const onInstalled = () => {
      deferredPromptRef.current = null;
      setHasInstallPrompt(false);
      setDismissed(true);
    };
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // Start the 30-second timer once, only on mobile devices.
  useEffect(() => {
    if (!isMobileDevice()) {
      return;
    }
    const timer = window.setTimeout(() => setDelayElapsed(true), PROMPT_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  const handleInstall = useCallback(async () => {
    const deferred = deferredPromptRef.current;
    if (!deferred) {
      setDismissed(true);
      return;
    }
    await deferred.prompt();
    await deferred.userChoice;
    deferredPromptRef.current = null;
    setHasInstallPrompt(false);
    setDismissed(true);
  }, []);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
  }, []);

  const visible = delayElapsed && hasInstallPrompt && !dismissed;
  if (!visible) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-label="Install PlotVerse"
      className="fixed inset-x-3 bottom-3 z-50 flex items-center gap-3 rounded-xl bg-neutral-900/95 px-4 py-3 text-sm text-white shadow-lg backdrop-blur"
    >
      <span className="flex-1">Add PlotVerse to your home screen for quick access.</span>
      <button
        type="button"
        onClick={handleInstall}
        className="rounded-lg bg-white px-3 py-1.5 font-medium text-neutral-900"
      >
        Install
      </button>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss install prompt"
        className="rounded-lg px-2 py-1.5 text-neutral-300"
      >
        Not now
      </button>
    </div>
  );
}

export default AddToHomeScreenPrompt;
