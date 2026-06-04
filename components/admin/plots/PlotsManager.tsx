/**
 * PlotsManager — edit a project's plots (Req 33.3, 37.3).
 *
 * Lists every Plot in the selected Project and lets the Admin_User edit the
 * mutable plot fields: status, price, facing, the assigned Zone (`zoneId`,
 * Req 37.3), and the custom label text. The per-project label format lives on
 * the Project (`project.labelFormat`); this manager surfaces it read-only and,
 * when it is `custom`, lets the editor set each plot's `customLabel` (Req 7.5)
 * — the text the Map_Renderer will render.
 *
 * Geometry, area, and centroid are produced by the File_Converter pipeline and
 * are intentionally NOT editable here; this manager only edits the business
 * attributes. Each save persists a partial patch via `plotRepo.update`, which
 * writes to the project's plots subcollection (Req 33.3).
 *
 * Requirements: 33.3, 37.3, 7.5
 */

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  ProjectPicker,
  useProjectSelection,
} from "@/components/admin/ProjectPicker";
import { PLOT_STATUSES } from "@/lib/aggregate";
import { plotRepo, zoneRepo } from "@/lib/firebase/repos";
import type { LabelFormat, Plot, PlotStatus, Zone } from "@/lib/types";

/** The editable subset of a {@link Plot}, kept as form-friendly strings. */
interface PlotDraft {
  status: PlotStatus;
  price: string;
  facing: string;
  zoneId: string;
  customLabel: string;
}

/** Builds an editable draft from a persisted plot. */
function toDraft(plot: Plot): PlotDraft {
  return {
    status: plot.status,
    price: plot.price === undefined ? "" : String(plot.price),
    facing: plot.facing ?? "",
    zoneId: plot.zoneId ?? "",
    customLabel: plot.customLabel ?? "",
  };
}

/**
 * Converts a draft into a partial {@link Plot} patch. Optional fields that the
 * editor cleared are written as `undefined` so Firestore drops them, keeping
 * the document clean (e.g. unassigning a zone removes `zoneId`).
 */
function toPatch(draft: PlotDraft): Partial<Plot> {
  const trimmedPrice = draft.price.trim();
  const parsedPrice = trimmedPrice === "" ? undefined : Number(trimmedPrice);
  const facing = draft.facing.trim();
  const customLabel = draft.customLabel.trim();
  return {
    status: draft.status,
    price: parsedPrice,
    facing: facing === "" ? undefined : facing,
    zoneId: draft.zoneId === "" ? undefined : draft.zoneId,
    customLabel: customLabel === "" ? undefined : customLabel,
  };
}

/** Validates a draft, returning an error message or `null` when valid. */
function validateDraft(draft: PlotDraft): string | null {
  const trimmedPrice = draft.price.trim();
  if (trimmedPrice !== "") {
    const value = Number(trimmedPrice);
    if (!Number.isFinite(value) || value < 0) {
      return "Price must be a non-negative number.";
    }
  }
  return null;
}

/** Human-readable label for a label format. */
const LABEL_FORMAT_TEXT: Record<LabelFormat, string> = {
  number: "Number",
  "number+area": "Number + area",
  "number+price": "Number + price",
  custom: "Custom label",
};

export function PlotsManager() {
  const {
    projects,
    loading: projectsLoading,
    error: projectsError,
    selectedId,
    setSelectedId,
    selectedProject,
  } = useProjectSelection();

  const [plots, setPlots] = useState<Plot[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<PlotDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const labelFormat: LabelFormat = selectedProject?.labelFormat ?? "number";

  const loadPlots = useCallback(async (projectId: string) => {
    setLoading(true);
    setError(null);
    try {
      const [plotList, zoneList] = await Promise.all([
        plotRepo.list(projectId),
        zoneRepo.list(projectId),
      ]);
      plotList.sort((a, b) =>
        a.number.localeCompare(b.number, undefined, { numeric: true }),
      );
      setPlots(plotList);
      setZones(zoneList);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load plots.");
      setPlots([]);
      setZones([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedId === null) {
      setPlots([]);
      setZones([]);
      return;
    }
    setEditingId(null);
    setDraft(null);
    void loadPlots(selectedId);
  }, [selectedId, loadPlots]);

  const zoneName = useMemo(() => {
    const map = new Map<string, string>();
    for (const zone of zones) {
      map.set(zone.id, zone.name);
    }
    return map;
  }, [zones]);

  function startEdit(plot: Plot) {
    setEditingId(plot.id);
    setDraft(toDraft(plot));
    setSaveError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(null);
    setSaveError(null);
  }

  async function saveEdit(plot: Plot) {
    if (draft === null || selectedId === null) {
      return;
    }
    const validationError = validateDraft(draft);
    if (validationError !== null) {
      setSaveError(validationError);
      return;
    }
    const patch = toPatch(draft);
    setSaving(true);
    setSaveError(null);
    try {
      await plotRepo.update(selectedId, plot.id, patch);
      setPlots((current) =>
        current.map((p) => (p.id === plot.id ? { ...p, ...patch } : p)),
      );
      cancelEdit();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save plot.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Plots</h1>
          <p className="mt-1 text-sm text-slate-500">
            Edit plot status, price, facing, zone assignment, and labels.
          </p>
        </div>
        <ProjectPicker
          projects={projects}
          value={selectedId}
          onChange={setSelectedId}
          loading={projectsLoading}
        />
      </header>

      {selectedProject && (
        <p className="mb-4 text-sm text-slate-500">
          Label format for this project:{" "}
          <span className="font-medium text-slate-700">
            {LABEL_FORMAT_TEXT[labelFormat]}
          </span>
          {labelFormat === "custom"
            ? " — set each plot's custom label below."
            : " (configured on the project)."}
        </p>
      )}

      {projectsError && <ErrorBanner message={projectsError} />}
      {error && <ErrorBanner message={error} />}

      {selectedId === null ? (
        <EmptyState
          message={
            projectsLoading
              ? "Loading projects…"
              : "Create a project before editing plots."
          }
        />
      ) : loading ? (
        <EmptyState message="Loading plots…" />
      ) : plots.length === 0 ? (
        <EmptyState message="This project has no plots yet. Import plots via the File Converter." />
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Number</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Price</th>
                <th className="px-4 py-3 font-semibold">Facing</th>
                <th className="px-4 py-3 font-semibold">Zone</th>
                {labelFormat === "custom" && (
                  <th className="px-4 py-3 font-semibold">Custom label</th>
                )}
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {plots.map((plot) => {
                const isEditing = editingId === plot.id && draft !== null;
                return (
                  <tr key={plot.id} className="align-top">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {plot.number}
                    </td>
                    {isEditing ? (
                      <>
                        <td className="px-4 py-3">
                          <select
                            aria-label="Status"
                            className="w-full rounded-md border border-slate-300 px-2 py-1.5"
                            value={draft.status}
                            onChange={(e) =>
                              setDraft({
                                ...draft,
                                status: e.target.value as PlotStatus,
                              })
                            }
                          >
                            {PLOT_STATUSES.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            aria-label="Price"
                            type="number"
                            min={0}
                            className="w-28 rounded-md border border-slate-300 px-2 py-1.5"
                            value={draft.price}
                            onChange={(e) =>
                              setDraft({ ...draft, price: e.target.value })
                            }
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            aria-label="Facing"
                            type="text"
                            className="w-28 rounded-md border border-slate-300 px-2 py-1.5"
                            value={draft.facing}
                            onChange={(e) =>
                              setDraft({ ...draft, facing: e.target.value })
                            }
                          />
                        </td>
                        <td className="px-4 py-3">
                          <select
                            aria-label="Zone"
                            className="w-40 rounded-md border border-slate-300 px-2 py-1.5"
                            value={draft.zoneId}
                            onChange={(e) =>
                              setDraft({ ...draft, zoneId: e.target.value })
                            }
                          >
                            <option value="">— Unassigned —</option>
                            {zones.map((zone) => (
                              <option key={zone.id} value={zone.id}>
                                {zone.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        {labelFormat === "custom" && (
                          <td className="px-4 py-3">
                            <input
                              aria-label="Custom label"
                              type="text"
                              className="w-40 rounded-md border border-slate-300 px-2 py-1.5"
                              value={draft.customLabel}
                              onChange={(e) =>
                                setDraft({
                                  ...draft,
                                  customLabel: e.target.value,
                                })
                              }
                            />
                          </td>
                        )}
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => void saveEdit(plot)}
                              disabled={saving}
                              className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
                            >
                              {saving ? "Saving…" : "Save"}
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              disabled={saving}
                              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                            >
                              Cancel
                            </button>
                          </div>
                          {saveError && (
                            <p className="mt-1 text-right text-xs text-red-600">
                              {saveError}
                            </p>
                          )}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 capitalize text-slate-700">
                          {plot.status}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {plot.price === undefined
                            ? "—"
                            : plot.price.toLocaleString("en-US")}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {plot.facing ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {plot.zoneId
                            ? (zoneName.get(plot.zoneId) ?? plot.zoneId)
                            : "—"}
                        </td>
                        {labelFormat === "custom" && (
                          <td className="px-4 py-3 text-slate-700">
                            {plot.customLabel ?? "—"}
                          </td>
                        )}
                        <td className="px-4 py-3">
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => startEdit(plot)}
                              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                            >
                              Edit
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
    >
      {message}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}
