/**
 * URL_State_Manager codec (pure, framework-free).
 *
 * The viewer's shareable state lives entirely in the URL query string
 * (`status`, `plot`, `zone`, `view`, `tab`). This module is the single source
 * of truth for translating between a typed {@link ViewerState} and
 * `URLSearchParams`, and for reconciling a decoded state against the project's
 * actual data. It performs no I/O — the applied state is written back to the
 * URL with `history.replaceState` (via the router) by the caller, so there is
 * never any page navigation (Req 3.1).
 *
 * Requirements:
 * - 3.1 — shareable state is captured in the `status`/`plot`/`zone`/`view`/`tab`
 *         query parameters via history replacement.
 * - 3.2 — a `status` parameter selects a Status_Group filter.
 * - 3.3 — a `plot` parameter opens the Plot_Detail_Sheet.
 * - 3.4 — a `zone` parameter applies a Zone filter.
 * - 3.5 — `view=3d` renders the map in 3D.
 * - 3.6 — `tab=gallery` opens the Gallery_Panel.
 * - 3.7 — parameter values that do not match an existing Plot, Zone, or
 *         Status_Group are ignored (default view rendered).
 * - 5.4 / 5.5 — enabling 3D sets `view=3d`; disabling it removes `view`.
 * - 8.4 — clicking a Plot sets `plot` to its identifier.
 * - 13.3 — applying a Status_Group sets `status` to its identifier.
 * - 14.3 — selecting a search result sets `plot` to its identifier.
 * - 15.2 — opening the Gallery tab sets `tab=gallery`.
 * - 16.3 — closing the Plot_Detail_Sheet removes `plot`.
 */

import type { Plot, StatusGroup, ViewerState, Zone } from "@/lib/types";

/** The only meaningful value of the `view` parameter (Req 3.5, 5.4). */
const VIEW_3D = "3d" as const;

/** The only meaningful value of the `tab` parameter (Req 3.6, 15.2). */
const TAB_GALLERY = "gallery" as const;

/**
 * The set of existing identifiers a decoded {@link ViewerState} is resolved
 * against. References (`plot`, `zone`, `status`) that are not present here are
 * dropped by {@link resolveViewerState} (Req 3.7).
 *
 * Each collection is an `Iterable<string>`, so callers may pass either arrays
 * (e.g. mapped from Firestore docs) or `Set`s. Use {@link buildProjectIndex}
 * to construct one from loaded Plot/Zone/StatusGroup collections.
 */
export interface ProjectIndex {
  /** Identifiers of every Plot in the project (matched against `plot`). */
  plotIds: Iterable<string>;
  /** Identifiers of every Zone in the project (matched against `zone`). */
  zoneIds: Iterable<string>;
  /** Identifiers of every Status_Group in the project (matched against `status`). */
  statusGroupIds: Iterable<string>;
}

/**
 * Serialize a {@link ViewerState} into `URLSearchParams`, omitting every key
 * whose value is `undefined` (Req 3.1, 5.5, 16.3).
 *
 * A field that is absent from the state therefore produces no corresponding
 * query-parameter key: disabling 3D removes `view`, closing the plot sheet
 * removes `plot`, and so on. Empty-string references are treated as absent
 * because they are not meaningful identifiers. The `view` and `tab` keys are
 * only written when they hold their single meaningful value.
 */
export function encodeViewerState(state: ViewerState): URLSearchParams {
  const params = new URLSearchParams();

  appendIfPresent(params, "status", state.status);
  appendIfPresent(params, "plot", state.plot);
  appendIfPresent(params, "zone", state.zone);

  if (state.view === VIEW_3D) {
    params.set("view", VIEW_3D);
  }
  if (state.tab === TAB_GALLERY) {
    params.set("tab", TAB_GALLERY);
  }

  return params;
}

/**
 * Parse `URLSearchParams` into a typed {@link ViewerState}, dropping unknown
 * and invalid values (Req 3.1).
 *
 * - `status`, `plot`, and `zone` are kept verbatim when present and non-empty;
 *   their existence as actual references is verified later by
 *   {@link resolveViewerState} (Req 3.7).
 * - `view` is kept only when it equals `3d`; any other value is ignored
 *   (Req 3.5).
 * - `tab` is kept only when it equals `gallery`; any other value is ignored
 *   (Req 3.6).
 * - Any other query parameter is ignored entirely.
 */
export function decodeViewerState(params: URLSearchParams): ViewerState {
  const state: ViewerState = {};

  const status = cleanValue(params.get("status"));
  if (status !== undefined) state.status = status;

  const plot = cleanValue(params.get("plot"));
  if (plot !== undefined) state.plot = plot;

  const zone = cleanValue(params.get("zone"));
  if (zone !== undefined) state.zone = zone;

  if (params.get("view") === VIEW_3D) state.view = VIEW_3D;
  if (params.get("tab") === TAB_GALLERY) state.tab = TAB_GALLERY;

  return state;
}

/**
 * Reconcile a decoded {@link ViewerState} against the project's actual data,
 * dropping any `plot`, `zone`, or `status` reference that does not match an
 * existing Plot, Zone, or Status_Group (Req 3.7).
 *
 * References that do exist are retained, and the non-reference fields (`view`,
 * `tab`) are always left unchanged. The input state is not mutated; a new
 * object is returned.
 */
export function resolveViewerState(
  state: ViewerState,
  project: ProjectIndex,
): ViewerState {
  const plotIds = toSet(project.plotIds);
  const zoneIds = toSet(project.zoneIds);
  const statusGroupIds = toSet(project.statusGroupIds);

  const resolved: ViewerState = {};

  if (state.status !== undefined && statusGroupIds.has(state.status)) {
    resolved.status = state.status;
  }
  if (state.plot !== undefined && plotIds.has(state.plot)) {
    resolved.plot = state.plot;
  }
  if (state.zone !== undefined && zoneIds.has(state.zone)) {
    resolved.zone = state.zone;
  }

  // `view` and `tab` are not references to project data; preserve them as-is.
  if (state.view !== undefined) resolved.view = state.view;
  if (state.tab !== undefined) resolved.tab = state.tab;

  return resolved;
}

/**
 * Build a {@link ProjectIndex} from loaded project collections.
 *
 * Convenience factory so callers can pass their in-memory Plot/Zone/
 * StatusGroup lists directly without assembling the id sets themselves.
 */
export function buildProjectIndex(
  plots: readonly Pick<Plot, "id">[],
  zones: readonly Pick<Zone, "id">[],
  statusGroups: readonly Pick<StatusGroup, "id">[],
): ProjectIndex {
  return {
    plotIds: new Set(plots.map((p) => p.id)),
    zoneIds: new Set(zones.map((z) => z.id)),
    statusGroupIds: new Set(statusGroups.map((g) => g.id)),
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Sets `key` only when `value` is a non-empty string (omits undefined keys). */
function appendIfPresent(
  params: URLSearchParams,
  key: string,
  value: string | undefined,
): void {
  if (value !== undefined && value !== "") {
    params.set(key, value);
  }
}

/** Normalizes a raw param to a non-empty string, or `undefined` when absent/empty. */
function cleanValue(value: string | null): string | undefined {
  if (value === null || value === "") return undefined;
  return value;
}

/** Normalizes any `Iterable<string>` into a `Set` for O(1) membership tests. */
function toSet(ids: Iterable<string>): Set<string> {
  return ids instanceof Set ? ids : new Set(ids);
}
