/**
 * ZonesManager — create, edit, and delete a project's zones (Req 37.1).
 *
 * A Zone is a named GeoJSON polygon used to group plots and render a dashed
 * area behind them (Req 9). This manager provides full CRUD over the project's
 * zones subcollection, persisting every change via `zoneRepo` (Req 37.1):
 *
 * - create  → `zoneRepo.create`
 * - rename / re-shape → `zoneRepo.update`
 * - delete  → `zoneRepo.remove`
 *
 * Geometry is edited as raw GeoJSON Polygon JSON in a textarea. That keeps the
 * editor functional without pulling in a map-drawing dependency here; the text
 * is parsed and shape-validated (a `Polygon` with a coordinates array) before
 * it can be saved, so malformed input is rejected with a clear message rather
 * than corrupting the document.
 *
 * Requirements: 37.1, 9.2
 */

"use client";

import { useCallback, useEffect, useState } from "react";

import {
  ProjectPicker,
  useProjectSelection,
} from "@/components/admin/ProjectPicker";
import { GeoJSON } from "@/lib/geojson";
import { zoneRepo } from "@/lib/firebase/repos";
import type { Zone } from "@/lib/types";

/** A starter polygon offered when creating a new zone. */
const SAMPLE_POLYGON = `{
  "type": "Polygon",
  "coordinates": [
    [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 0],
      [0, 0]
    ]
  ]
}`;

/** The in-progress edit/create form state. */
interface ZoneForm {
  /** The zone id being edited, or `null` for a new zone. */
  id: string | null;
  name: string;
  geometryText: string;
}

/** Parsed-and-validated geometry, or an error message. */
type GeometryResult =
  | { ok: true; geometry: GeoJSON.Polygon }
  | { ok: false; error: string };

/**
 * Parses the textarea contents into a GeoJSON Polygon, validating that it is
 * an object of `type: "Polygon"` with a non-empty `coordinates` array. Returns
 * a discriminated result so the caller can surface a precise message.
 */
function parseGeometry(text: string): GeometryResult {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { ok: false, error: "Geometry is not valid JSON." };
  }
  if (typeof value !== "object" || value === null) {
    return { ok: false, error: "Geometry must be a JSON object." };
  }
  const candidate = value as { type?: unknown; coordinates?: unknown };
  if (candidate.type !== "Polygon") {
    return { ok: false, error: 'Geometry "type" must be "Polygon".' };
  }
  if (!Array.isArray(candidate.coordinates) || candidate.coordinates.length === 0) {
    return {
      ok: false,
      error: 'Geometry "coordinates" must be a non-empty array of rings.',
    };
  }
  return { ok: true, geometry: value as GeoJSON.Polygon };
}

export function ZonesManager() {
  const {
    projects,
    loading: projectsLoading,
    error: projectsError,
    selectedId,
    setSelectedId,
  } = useProjectSelection();

  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<ZoneForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadZones = useCallback(async (projectId: string) => {
    setLoading(true);
    setError(null);
    try {
      const list = await zoneRepo.list(projectId);
      list.sort((a, b) => a.name.localeCompare(b.name));
      setZones(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load zones.");
      setZones([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedId === null) {
      setZones([]);
      return;
    }
    setForm(null);
    setFormError(null);
    void loadZones(selectedId);
  }, [selectedId, loadZones]);

  function startCreate() {
    setForm({ id: null, name: "", geometryText: SAMPLE_POLYGON });
    setFormError(null);
  }

  function startEdit(zone: Zone) {
    setForm({
      id: zone.id,
      name: zone.name,
      geometryText: JSON.stringify(zone.geometry, null, 2),
    });
    setFormError(null);
  }

  function cancelForm() {
    setForm(null);
    setFormError(null);
  }

  async function saveForm() {
    if (form === null || selectedId === null) {
      return;
    }
    const name = form.name.trim();
    if (name === "") {
      setFormError("Zone name is required.");
      return;
    }
    const parsed = parseGeometry(form.geometryText);
    if (!parsed.ok) {
      setFormError(parsed.error);
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      if (form.id === null) {
        const id = await zoneRepo.create({
          projectId: selectedId,
          name,
          geometry: parsed.geometry,
        });
        setZones((current) =>
          [...current, { id, projectId: selectedId, name, geometry: parsed.geometry }].sort(
            (a, b) => a.name.localeCompare(b.name),
          ),
        );
      } else {
        const zoneId = form.id;
        await zoneRepo.update(selectedId, zoneId, {
          name,
          geometry: parsed.geometry,
        });
        setZones((current) =>
          current
            .map((z) =>
              z.id === zoneId ? { ...z, name, geometry: parsed.geometry } : z,
            )
            .sort((a, b) => a.name.localeCompare(b.name)),
        );
      }
      cancelForm();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save zone.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteZone(zone: Zone) {
    if (selectedId === null) {
      return;
    }
    if (
      typeof window !== "undefined" &&
      !window.confirm(`Delete zone "${zone.name}"? This cannot be undone.`)
    ) {
      return;
    }
    setBusyId(zone.id);
    setError(null);
    try {
      await zoneRepo.remove(selectedId, zone.id);
      setZones((current) => current.filter((z) => z.id !== zone.id));
      if (form?.id === zone.id) {
        cancelForm();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete zone.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Zones</h1>
          <p className="mt-1 text-sm text-slate-500">
            Create and manage named polygon areas for the project.
          </p>
        </div>
        <ProjectPicker
          projects={projects}
          value={selectedId}
          onChange={setSelectedId}
          loading={projectsLoading}
        />
      </header>

      {projectsError && <ErrorBanner message={projectsError} />}
      {error && <ErrorBanner message={error} />}

      {selectedId === null ? (
        <EmptyState
          message={
            projectsLoading
              ? "Loading projects…"
              : "Create a project before managing zones."
          }
        />
      ) : (
        <>
          <div className="mb-4 flex justify-end">
            <button
              type="button"
              onClick={startCreate}
              disabled={form !== null && form.id === null}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
            >
              New zone
            </button>
          </div>

          {form !== null && (
            <ZoneFormCard
              form={form}
              saving={saving}
              error={formError}
              onChange={setForm}
              onSave={() => void saveForm()}
              onCancel={cancelForm}
            />
          )}

          {loading ? (
            <EmptyState message="Loading zones…" />
          ) : zones.length === 0 ? (
            <EmptyState message="No zones yet. Create one to group plots into areas." />
          ) : (
            <ul className="space-y-2">
              {zones.map((zone) => (
                <li
                  key={zone.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">{zone.name}</p>
                    <p className="truncate text-xs text-slate-500">
                      {zone.geometry.coordinates[0]?.length ?? 0} vertices
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(zone)}
                      className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteZone(zone)}
                      disabled={busyId === zone.id}
                      className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                    >
                      {busyId === zone.id ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

interface ZoneFormCardProps {
  form: ZoneForm;
  saving: boolean;
  error: string | null;
  onChange: (form: ZoneForm) => void;
  onSave: () => void;
  onCancel: () => void;
}

function ZoneFormCard({
  form,
  saving,
  error,
  onChange,
  onSave,
  onCancel,
}: ZoneFormCardProps) {
  return (
    <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-slate-900">
        {form.id === null ? "New zone" : "Edit zone"}
      </h2>
      <div className="space-y-3">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Name</span>
          <input
            type="text"
            className="w-full rounded-md border border-slate-300 px-3 py-2"
            value={form.name}
            onChange={(e) => onChange({ ...form, name: e.target.value })}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">
            Geometry (GeoJSON Polygon)
          </span>
          <textarea
            className="h-48 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs"
            value={form.geometryText}
            spellCheck={false}
            onChange={(e) => onChange({ ...form, geometryText: e.target.value })}
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save zone"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      </div>
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
