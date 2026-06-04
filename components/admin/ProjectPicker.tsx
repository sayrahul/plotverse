/**
 * ProjectPicker — shared Admin_Panel project selector.
 *
 * Several admin sections operate on one project at a time (the File_Converter
 * saves converted GeoJSON to a chosen project; the GeoJSON history panel lists
 * and rolls back a chosen project's versions — Req 35.1–35.3). This component
 * loads the project inventory via {@link projectRepo.list} and renders a
 * `<select>` so the Admin_User can pick the target project.
 *
 * It is a controlled component: the parent owns the selected `projectId` and is
 * notified through {@link ProjectPickerProps.onChange}. The list is fetched
 * once on mount; load failures surface a non-blocking message rather than
 * crashing the section.
 *
 * Requirements: 33.1
 */

"use client";

import { useEffect, useMemo, useState } from "react";

import { projectRepo } from "@/lib/firebase/repos";
import type { Project } from "@/lib/types";

export function useProjectSelection() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    projectRepo
      .list()
      .then((list) => {
        if (!active) return;
        setProjects(list);
        setError(null);
        if (list.length > 0) setSelectedId(list[0]!.id);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : "Failed to load projects.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedId) ?? null,
    [projects, selectedId]
  );

  return { projects, loading, error, selectedId, setSelectedId, selectedProject };
}

/** Props for {@link ProjectPicker}. */
export interface ProjectPickerProps {
  /** The currently selected Project_ID, or empty string/null when none is chosen. */
  value: string | null;
  /** Called with the newly selected Project_ID (or "" when cleared). */
  onChange: (projectId: string, project: Project | null) => void;
  /** Optional label shown above the select. */
  label?: string;
  projects?: Project[];
  loading?: boolean;
}

/** Renders a controlled project `<select>`. */
export function ProjectPicker({ value, onChange, label = "Project", projects: propProjects, loading: propLoading }: ProjectPickerProps) {
  const [internalProjects, setInternalProjects] = useState<Project[]>([]);
  const [internalLoading, setInternalLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isControlled = propProjects !== undefined;
  const projects = isControlled ? propProjects : internalProjects;
  const loading = isControlled ? (propLoading ?? false) : internalLoading;

  useEffect(() => {
    if (isControlled) return;
    let active = true;
    setInternalLoading(true);
    projectRepo
      .list()
      .then((list) => {
        if (!active) return;
        setInternalProjects(list);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : "Failed to load projects.");
      })
      .finally(() => {
        if (active) setInternalLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isControlled]);

  function handleSelect(nextId: string) {
    const project = projects.find((p) => p.id === nextId) ?? null;
    onChange(nextId, project);
  }

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="project-picker" className="text-sm font-medium text-slate-700">
        {label}
      </label>
      <select
        id="project-picker"
        value={value ?? ""}
        onChange={(event) => handleSelect(event.target.value)}
        disabled={loading}
        className="w-full max-w-md rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
      >
        <option value="">
          {loading ? "Loading projects…" : "Select a project…"}
        </option>
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name} ({project.id})
          </option>
        ))}
      </select>
      {!isControlled && error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
