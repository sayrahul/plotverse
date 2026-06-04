/**
 * ProjectsManager — the Admin_Panel Projects management section (Req 33.1,
 * 33.2).
 *
 * Lists every Project in the projects collection and provides create, update,
 * and delete operations, each persisted through `projectRepo` (Req 33.2):
 *  - Create mints a unique 5–6 character Project_ID via the repository
 *    (Req 2.1) and stores the document under that id (Req 2.2).
 *  - Update applies a partial patch to the editable metadata fields.
 *  - Delete is destructive and reserved for the superadmin role; the control is
 *    hidden behind {@link RequireSuperadmin}, mirroring the `project.delete`
 *    superadmin-only access policy (Req 32.3). Create/update controls are gated
 *    by {@link Can} so editors see only what they may perform.
 *
 * Complex Project fields that are owned by other sections (gallery media,
 * GeoJSON storage path and version history) are given sensible defaults on
 * create and preserved untouched on update — those are managed by the Gallery
 * and File Converter sections, not here.
 *
 * Requirements: 2.1, 2.2, 32.3, 33.1, 33.2
 */

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Can, RequireSuperadmin } from "@/components/admin/RoleContext";
import { projectRepo, type ProjectInput } from "@/lib/firebase/repos";
import type { LabelFormat, Project } from "@/lib/types";

/** The selectable plot label formats (Req 7), in display order. */
const LABEL_FORMATS: readonly LabelFormat[] = [
  "number",
  "number+area",
  "number+price",
  "custom",
];

/** Named social links surfaced as discrete inputs to keep the form typed. */
const SOCIAL_FIELDS = [
  { key: "website", label: "Website" },
  { key: "facebook", label: "Facebook" },
  { key: "instagram", label: "Instagram" },
  { key: "youtube", label: "YouTube" },
] as const;

/**
 * String-backed form state. Numeric and list fields are captured as text and
 * parsed/validated on submit so partial input never crashes the controlled
 * inputs.
 */
interface ProjectFormValues {
  name: string;
  description: string;
  centerLng: string;
  centerLat: string;
  defaultZoom: string;
  labelFormat: LabelFormat;
  contactPhone: string;
  amenities: string;
  social: Record<string, string>;
}

/** A blank form for creating a new Project, with sensible defaults. */
function emptyForm(): ProjectFormValues {
  return {
    name: "",
    description: "",
    centerLng: "",
    centerLat: "",
    defaultZoom: "15",
    labelFormat: "number",
    contactPhone: "",
    amenities: "",
    social: {},
  };
}

/** Pre-fills the form from an existing Project for editing. */
function formFromProject(project: Project): ProjectFormValues {
  const social: Record<string, string> = {};
  for (const { key } of SOCIAL_FIELDS) {
    if (project.socialLinks[key]) social[key] = project.socialLinks[key];
  }
  const [lng, lat] = project.center;
  return {
    name: project.name,
    description: project.description,
    centerLng: lng === undefined ? "" : String(lng),
    centerLat: lat === undefined ? "" : String(lat),
    defaultZoom: String(project.defaultZoom),
    labelFormat: project.labelFormat,
    contactPhone: project.contactPhone,
    amenities: project.amenities.join(", "),
    social,
  };
}

/** Parses a comma-separated amenities string into a trimmed, non-empty list. */
function parseAmenities(raw: string): string[] {
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

/** Collects the non-empty named social links into a Record. */
function buildSocialLinks(social: Record<string, string>): Record<string, string> {
  const links: Record<string, string> = {};
  for (const { key } of SOCIAL_FIELDS) {
    const value = social[key]?.trim();
    if (value) links[key] = value;
  }
  return links;
}

/**
 * Validates and converts the form into the editable metadata fields shared by
 * create and update. Returns an error message string when validation fails.
 */
function parseForm(
  values: ProjectFormValues,
): { error: string } | { value: ProjectMetadata } {
  const name = values.name.trim();
  if (!name) return { error: "Name is required." };

  const lng = Number(values.centerLng);
  const lat = Number(values.centerLat);
  if (!values.centerLng.trim() || !Number.isFinite(lng)) {
    return { error: "Center longitude must be a number." };
  }
  if (!values.centerLat.trim() || !Number.isFinite(lat)) {
    return { error: "Center latitude must be a number." };
  }
  if (lng < -180 || lng > 180) {
    return { error: "Center longitude must be between -180 and 180." };
  }
  if (lat < -90 || lat > 90) {
    return { error: "Center latitude must be between -90 and 90." };
  }

  const defaultZoom = Number(values.defaultZoom);
  if (!values.defaultZoom.trim() || !Number.isFinite(defaultZoom)) {
    return { error: "Default zoom must be a number." };
  }

  return {
    value: {
      name,
      description: values.description.trim(),
      center: [lng, lat],
      defaultZoom,
      labelFormat: values.labelFormat,
      contactPhone: values.contactPhone.trim(),
      socialLinks: buildSocialLinks(values.social),
      amenities: parseAmenities(values.amenities),
    },
  };
}

/** The metadata fields editable from this manager (shared by create/update). */
type ProjectMetadata = Pick<
  Project,
  | "name"
  | "description"
  | "center"
  | "defaultZoom"
  | "labelFormat"
  | "contactPhone"
  | "socialLinks"
  | "amenities"
>;

export function ProjectsManager() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // null = create mode; a Project_ID = editing that project.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProjectFormValues>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const list = await projectRepo.list();
      list.sort((a, b) => a.name.localeCompare(b.name));
      setProjects(list);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load projects.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const isEditing = editingId !== null;
  const editingProject = useMemo(
    () => projects.find((p) => p.id === editingId) ?? null,
    [projects, editingId],
  );

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm());
    setFormError(null);
  }

  function startEdit(project: Project) {
    setEditingId(project.id);
    setForm(formFromProject(project));
    setFormError(null);
  }

  function updateField<K extends keyof ProjectFormValues>(
    key: K,
    value: ProjectFormValues[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateSocial(key: string, value: string) {
    setForm((prev) => ({ ...prev, social: { ...prev.social, [key]: value } }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = parseForm(form);
    if ("error" in parsed) {
      setFormError(parsed.error);
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      if (isEditing && editingId !== null) {
        await projectRepo.update(editingId, parsed.value);
      } else {
        // New projects start with empty media/GeoJSON state; those fields are
        // managed by the Gallery and File Converter sections (Req 35, 39).
        const input: ProjectInput = {
          ...parsed.value,
          gallery: [],
          geojsonStoragePath: "",
          geojsonHistory: [],
        };
        await projectRepo.create(input);
      }
      resetForm();
      await loadProjects();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save project.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(project: Project) {
    const confirmed = window.confirm(
      `Delete project "${project.name}" (${project.id})? This cannot be undone.`,
    );
    if (!confirmed) return;

    setDeletingId(project.id);
    try {
      await projectRepo.remove(project.id);
      if (editingId === project.id) resetForm();
      await loadProjects();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to delete project.");
    } finally {
      setDeletingId(null);
    }
  }

  const inputClass =
    "w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";
  const labelClass = "block text-sm font-medium text-slate-700";

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
        <p className="mt-1 text-sm text-slate-500">
          Create, update, and delete projects.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        {/* Project list */}
        <section
          aria-label="Existing projects"
          className="rounded-lg border border-slate-200 bg-white"
        >
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
            <h2 className="text-sm font-semibold text-slate-700">
              All projects{projects.length > 0 ? ` (${projects.length})` : ""}
            </h2>
            <button
              type="button"
              onClick={() => void loadProjects()}
              className="text-xs font-medium text-slate-500 hover:text-slate-900"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <p className="px-5 py-6 text-sm text-slate-500">Loading projects…</p>
          ) : loadError ? (
            <p className="px-5 py-6 text-sm text-red-600">{loadError}</p>
          ) : projects.length === 0 ? (
            <p className="px-5 py-6 text-sm text-slate-500">
              No projects yet. Create one using the form.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {projects.map((project) => (
                <li
                  key={project.id}
                  className="flex items-center justify-between gap-3 px-5 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {project.name}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      <span className="font-mono">{project.id}</span>
                      {project.description ? ` · ${project.description}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Can action="project.update">
                      <button
                        type="button"
                        onClick={() => startEdit(project)}
                        className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                      >
                        Edit
                      </button>
                    </Can>
                    <RequireSuperadmin>
                      <button
                        type="button"
                        onClick={() => void handleDelete(project)}
                        disabled={deletingId === project.id}
                        className="rounded-md border border-red-300 px-2.5 py-1 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deletingId === project.id ? "Deleting…" : "Delete"}
                      </button>
                    </RequireSuperadmin>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Create / edit form */}
        <Can
          action={isEditing ? "project.update" : "project.create"}
          fallback={
            <aside className="rounded-lg border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">
              You do not have permission to {isEditing ? "edit" : "create"} projects.
            </aside>
          }
        >
          <section
            aria-label={isEditing ? "Edit project" : "Create project"}
            className="rounded-lg border border-slate-200 bg-white"
          >
            <div className="border-b border-slate-200 px-5 py-3">
              <h2 className="text-sm font-semibold text-slate-700">
                {isEditing
                  ? `Edit project${editingProject ? ` · ${editingProject.id}` : ""}`
                  : "Create project"}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
              <div>
                <label htmlFor="project-name" className={labelClass}>
                  Name
                </label>
                <input
                  id="project-name"
                  type="text"
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <label htmlFor="project-description" className={labelClass}>
                  Description
                </label>
                <textarea
                  id="project-description"
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  rows={3}
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="project-lng" className={labelClass}>
                    Center longitude
                  </label>
                  <input
                    id="project-lng"
                    type="number"
                    step="any"
                    value={form.centerLng}
                    onChange={(e) => updateField("centerLng", e.target.value)}
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="project-lat" className={labelClass}>
                    Center latitude
                  </label>
                  <input
                    id="project-lat"
                    type="number"
                    step="any"
                    value={form.centerLat}
                    onChange={(e) => updateField("centerLat", e.target.value)}
                    className={inputClass}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="project-zoom" className={labelClass}>
                    Default zoom
                  </label>
                  <input
                    id="project-zoom"
                    type="number"
                    step="any"
                    value={form.defaultZoom}
                    onChange={(e) => updateField("defaultZoom", e.target.value)}
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="project-label-format" className={labelClass}>
                    Label format
                  </label>
                  <select
                    id="project-label-format"
                    value={form.labelFormat}
                    onChange={(e) =>
                      updateField("labelFormat", e.target.value as LabelFormat)
                    }
                    className={inputClass}
                  >
                    {LABEL_FORMATS.map((format) => (
                      <option key={format} value={format}>
                        {format}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="project-phone" className={labelClass}>
                  Contact phone (WhatsApp)
                </label>
                <input
                  id="project-phone"
                  type="tel"
                  value={form.contactPhone}
                  onChange={(e) => updateField("contactPhone", e.target.value)}
                  className={inputClass}
                  placeholder="+15551234567"
                />
              </div>

              <div>
                <label htmlFor="project-amenities" className={labelClass}>
                  Amenities
                </label>
                <input
                  id="project-amenities"
                  type="text"
                  value={form.amenities}
                  onChange={(e) => updateField("amenities", e.target.value)}
                  className={inputClass}
                  placeholder="Comma separated, e.g. Clubhouse, Park"
                />
              </div>

              <fieldset className="space-y-2">
                <legend className={labelClass}>Social links</legend>
                {SOCIAL_FIELDS.map(({ key, label }) => (
                  <div key={key}>
                    <label
                      htmlFor={`project-social-${key}`}
                      className="text-xs text-slate-500"
                    >
                      {label}
                    </label>
                    <input
                      id={`project-social-${key}`}
                      type="url"
                      value={form.social[key] ?? ""}
                      onChange={(e) => updateSocial(key, e.target.value)}
                      className={inputClass}
                    />
                  </div>
                ))}
              </fieldset>

              {formError ? (
                <p role="alert" className="text-sm text-red-600">
                  {formError}
                </p>
              ) : null}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "Saving…"
                    : isEditing
                      ? "Save changes"
                      : "Create project"}
                </button>
                {isEditing ? (
                  <button
                    type="button"
                    onClick={resetForm}
                    disabled={saving}
                    className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Cancel
                  </button>
                ) : null}
              </div>
            </form>
          </section>
        </Can>
      </div>
    </div>
  );
}
