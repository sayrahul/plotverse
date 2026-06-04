"use client";
/**
 * useURLParams — reads viewer state from the URL and writes updates back
 * via `window.history.replaceState` (Req 3.1 — never router.push).
 *
 * Returns `state` (the decoded ViewerState) and `updateParam` / `clearParam`
 * helpers. Callers never navigate away from the project page.
 */
import { useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { decodeViewerState } from "@/lib/urlState";
import type { ViewerState } from "@/lib/types";

export interface URLParamsHook {
  /** The current viewer state decoded from the URL search params. */
  state: ViewerState;
  /**
   * Sets or updates a single URL query parameter without page navigation (Req 3.1).
   * @param key  The parameter name.
   * @param value The value to set; pass `undefined` or empty-string to remove.
   */
  updateParam(key: string, value: string | undefined): void;
  /** Removes a query parameter without navigation. */
  clearParam(key: string): void;
  /** Replaces the entire query string with an encoded ViewerState (no navigation). */
  pushState(next: ViewerState): void;
}

export function useURLParams(): URLParamsHook {
  const searchParams = useSearchParams();
  const state = decodeViewerState(searchParams);

  const updateParam = useCallback(
    (key: string, value: string | undefined) => {
      const params = new URLSearchParams(window.location.search);
      if (value === undefined || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      const qs = params.toString();
      window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
    },
    [],
  );

  const clearParam = useCallback((key: string) => updateParam(key, undefined), [updateParam]);

  const pushState = useCallback((next: ViewerState) => {
    const params = new URLSearchParams();
    if (next.status) params.set("status", next.status);
    if (next.plot)   params.set("plot",   next.plot);
    if (next.zone)   params.set("zone",   next.zone);
    if (next.view === "3d")       params.set("view", "3d");
    if (next.tab  === "gallery")  params.set("tab",  "gallery");
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, []);

  return { state, updateParam, clearParam, pushState };
}
