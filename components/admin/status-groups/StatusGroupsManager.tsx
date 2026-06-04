/**
 * StatusGroupsManager — create, edit, and delete status presets (Req 13.1, 37.2).
 *
 * A Status_Group is an admin-defined named filter preset that selects a subset
 * of plot statuses (Req 13.1). A buyer can open a link with the group's id in
 * the `status` query parameter to pre-filter the map to that curated selection
 * (Req 13.2–13.3). This manager provides full CRUD over the project's
 * statusGroups subcollection, persisting every change via `statusGroupRepo`
 * (Req 37.2):
 *
 * - create → `statusGroupRepo.create`
 * - rename / re-select statuses → `statusGroupRepo.update`
 * - delete → `statusGroupRepo.remove`
 *
 * The statuses are a subset of {@link PLOT_STATUSES}, chosen via checkboxes; a
 * group must select at least one status to be saveable.
 *
 * Requirements: 13.1, 37.2
 */

"use client";

import { useCallback, useEffect, useState } from "react";

import {
  ProjectPicker,
  useProjectSelection,
} from "@/components/admin/ProjectPicker";
import { PLOT_STATUSES } from "@/lib/aggregate";
import { statusGroupRepo } from "@/lib/firebase/repos";
import type { PlotStatus, StatusGroup } from "@/lib/types";

/** The in-progress edit/create form state. */
interface GroupForm {
  /** The group id being edited, or `null` for a new group. */
  id: string | null;
  name: string;
  statuses: PlotStatus[];
}

/** Toggles a status in a selection set, preserving canonical order. */
function toggleStatus(statuses: PlotStatus[], status: PlotStatus): PlotStatus[] {
  const next = statuses.includes(status)
    ? statuses.filter((s) => s !== status)
    : [...statuses, status];
  return PLOT_STATUSES.filter((s) => next.includes(s));
}

export function StatusGroupsManager() {
  const {
    projects,
    loading: projectsLoading,
    error: projectsError,
    selectedId,
    setSelectedId,
  } = useProjectSelection();

  const [groups, setGroups] = useState<StatusGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<GroupForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadGroups = useCallback(async (projectId: string) => {
    setLoading(true);
    setError(null);
    try {
      const list = await statusGroupRepo.list(projectId);
      list.sort((a, b) => a.name.localeCompare(b.name));
      setGroups(list);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load status groups.",
      );
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedId === null) {
      setGroups([]);
      return;
    }
    setForm(null);
    setFormError(null);
    void loadGroups(selectedId);
  }, [selectedId, loadGroups]);

  function startCreate() {
    setForm({ id: null, name: "", statuses: [] });
    setFormError(null);
  }

  function startEdit(group: StatusGroup) {
    setForm({ id: group.id, name: group.name, statuses: [...group.statuses] });
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
      setFormError("Status group name is required.");
      return;
    }
    if (form.statuses.length === 0) {
      setFormError("Select at least one status.");
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      if (form.id === null) {
        const id = await statusGroupRepo.create({
          projectId: selectedId,
          name,
          statuses: form.statuses,
        });
        setGroups((current) =>
          [
            ...current,
            { id, projectId: selectedId, name, statuses: form.statuses },
          ].sort((a, b) => a.name.localeCompare(b.name)),
        );
      } else {
        const groupId = form.id;
        await statusGroupRepo.update(selectedId, groupId, {
          name,
          statuses: form.statuses,
        });
        setGroups((current) =>
          current
            .map((g) =>
              g.id === groupId
                ? { ...g, name, statuses: form.statuses }
                : g,
            )
            .sort((a, b) => a.name.localeCompare(b.name)),
        );
      }
      cancelForm();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Failed to save status group.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteGroup(group: StatusGroup) {
    if (selectedId === null) {
      return;
    }
    if (
      typeof window !== "undefined" &&
      !window.confirm(
        `Delete status group "${group.name}"? This cannot be undone.`,
      )
    ) {
      return;
    }
    setBusyId(group.id);
    setError(null);
    try {
      await statusGroupRepo.remove(selectedId, group.id);
      setGroups((current) => current.filter((g) => g.id !== group.id));
      if (form?.id === group.id) {
        cancelForm();
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete status group.",
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Status Groups</h1>
          <p className="mt-1 text-sm text-slate-500">
            Define named status presets used to pre-filter the map.
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
              : "Create a project before managing status groups."
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
              New status group
            </button>
          </div>

          {form !== null && (
            <GroupFormCard
              form={form}
              saving={saving}
              error={formError}
              onChange={setForm}
              onSave={() => void saveForm()}
              onCancel={cancelForm}
            />
          )}

          {loading ? (
            <EmptyState message="Loading status groups…" />
          ) : groups.length === 0 ? (
            <EmptyState message="No status groups yet. Create one to offer a curated filter link." />
          ) : (
            <ul className="space-y-2">
              {groups.map((group) => (
                <li
                  key={group.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">{group.name}</p>
                    <p className="text-xs capitalize text-slate-500">
                      {group.statuses.join(", ") || "no statuses"}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(group)}
                      className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteGroup(group)}
                      disabled={busyId === group.id}
                      className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                    >
                      {busyId === group.id ? "Deleting…" : "Delete"}
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

interface GroupFormCardProps {
  form: GroupForm;
  saving: boolean;
  error: string | null;
  onChange: (form: GroupForm) => void;
  onSave: () => void;
  onCancel: () => void;
}

function GroupFormCard({
  form,
  saving,
  error,
  onChange,
  onSave,
  onCancel,
}: GroupFormCardProps) {
  return (
    <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-slate-900">
        {form.id === null ? "New status group" : "Edit status group"}
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
        <fieldset>
          <legend className="mb-1 block text-sm font-medium text-slate-700">
            Statuses
          </legend>
          <div className="flex flex-wrap gap-3">
            {PLOT_STATUSES.map((status) => (
              <label
                key={status}
                className="flex items-center gap-2 rounded-md border border-slate-300 px-3 py-1.5 text-sm capitalize"
              >
                <input
                  type="checkbox"
                  checked={form.statuses.includes(status)}
                  onChange={() =>
                    onChange({
                      ...form,
                      statuses: toggleStatus(form.statuses, status),
                    })
                  }
                />
                {status}
              </label>
            ))}
          </div>
        </fieldset>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save status group"}
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
