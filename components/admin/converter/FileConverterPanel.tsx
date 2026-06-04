/**
 * FileConverterPanel — upload → convert → enrich → validate → preview → save.
 *
 * The Admin_Panel's File_Converter front end (Req 34, 35.1–35.2). It wires the
 * pure converter pipeline (`lib/converter/*`) to the Storage save seam:
 *
 *  1. The Admin_User picks a target project and uploads a file.
 *  2. {@link detectFormat} identifies the format and {@link parseToGeoJSON}
 *     converts it to GeoJSON (Req 34.1). Parse failures name the failing
 *     file/feature (ParseError) and are reported, withholding the rest of the
 *     flow.
 *  3. {@link enrichFeatures} adds area (sqft/sqm/sqyd) + centroid to every
 *     feature (Req 34.2).
 *  4. {@link validateGeoJSON} checks WGS84 bounds + closed rings (Req 34.3),
 *     producing per-feature errors. While any error exists, saving is withheld
 *     (Req 34.4).
 *  5. A preview of the converted GeoJSON is shown (Req 34.5), and feature
 *     properties are editable before saving (Req 34.6).
 *  6. On save (only when valid), {@link storageClient.saveGeoJSON} uploads the
 *     GeoJSON to Storage, upserts the derived Plot documents, and appends the
 *     version to the project's history (Req 35.1, 35.2), using the real
 *     repositories via {@link createSaveGeoJSONRepos}.
 *
 * Requirements: 34.1, 34.2, 34.3, 34.4, 34.5, 34.6, 35.1, 35.2
 */

"use client";

import { useMemo, useRef, useState } from "react";

import { ProjectPicker } from "@/components/admin/ProjectPicker";
import { detectFormat, parseToGeoJSON } from "@/lib/converter/parse";
import { enrichFeatures } from "@/lib/converter/enrich";
import { validateGeoJSON } from "@/lib/converter/validate";
import { ParseError, type ValidationError } from "@/lib/converter/types";
import { getClientAuth } from "@/lib/firebase/client";
import { createSaveGeoJSONRepos } from "@/lib/firebase/saveGeojsonRepos";
import { storageClient } from "@/lib/firebase/storage";
import type { GeoJSON } from "@/lib/geojson";
import type { Project } from "@/lib/types";

/** Where the panel is in the upload→save lifecycle. */
type Phase = "idle" | "converting" | "ready" | "saving" | "saved";

/** Resolves an identifier for the signed-in Admin_User for `savedBy`. */
function currentAdminId(): string {
  try {
    const user = getClientAuth().currentUser;
    return user?.email ?? user?.uid ?? "admin";
  } catch {
    return "admin";
  }
}

export function FileConverterPanel() {
  const [projectId, setProjectId] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");

  // The working (editable) converted + enriched collection, and its errors.
  const [featureCollection, setFeatureCollection] =
    useState<GeoJSON.FeatureCollection | null>(null);
  const [errors, setErrors] = useState<ValidationError[]>([]);

  // Top-level file/parse error (Req 34.1) and save outcome messaging.
  const [conversionError, setConversionError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasErrors = errors.length > 0;
  const canSave =
    phase === "ready" &&
    !hasErrors &&
    featureCollection !== null &&
    projectId !== "";

  /** Resets everything tied to a specific uploaded file. */
  function resetConversion() {
    setFeatureCollection(null);
    setErrors([]);
    setConversionError(null);
    setSaveError(null);
    setSaveMessage(null);
  }

  async function handleFile(file: File) {
    resetConversion();
    setFileName(file.name);
    setPhase("converting");

    const format = detectFormat({ name: file.name, type: file.type });
    if (format === null) {
      setConversionError(
        `Unsupported file: "${file.name}". Supported formats are GeoJSON, JSON, KML, KMZ, SHP ZIP, DXF, and CSV.`,
      );
      setPhase("idle");
      return;
    }

    try {
      // Read as ArrayBuffer so binary formats (KMZ, SHP ZIP) work; the parser
      // decodes text formats from the buffer internally.
      const buffer = await file.arrayBuffer();
      const parsed = await parseToGeoJSON(format, buffer); // Req 34.1
      const enriched = enrichFeatures(parsed); // Req 34.2
      const validationErrors = validateGeoJSON(enriched); // Req 34.3

      setFeatureCollection(enriched);
      setErrors(validationErrors); // saving withheld while non-empty (Req 34.4)
      setPhase("ready");
    } catch (cause) {
      setConversionError(describeConversionError(cause, file.name));
      setPhase("idle");
    }
  }

  function onInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) void handleFile(file);
  }

  /** Applies an edited property value to a feature and re-validates (Req 34.6). */
  function updateFeatureProperty(
    featureIndex: number,
    key: string,
    rawValue: string,
    originalType: "number" | "boolean" | "string",
  ) {
    setFeatureCollection((current) => {
      if (!current) return current;
      const features = current.features.map((feature, index) => {
        if (index !== featureIndex) return feature;
        const properties = { ...(feature.properties ?? {}) };
        properties[key] = coerceValue(rawValue, originalType);
        return { ...feature, properties };
      });
      const next: GeoJSON.FeatureCollection = { ...current, features };
      // Geometry is unchanged by property edits, but re-validate so the error
      // list always reflects the current working collection (Req 34.4).
      setErrors(validateGeoJSON(next));
      return next;
    });
    setSaveMessage(null);
  }

  async function handleSave() {
    if (!canSave || !featureCollection) return;
    setPhase("saving");
    setSaveError(null);
    setSaveMessage(null);
    try {
      const result = await storageClient.saveGeoJSON(
        projectId,
        featureCollection,
        currentAdminId(),
        createSaveGeoJSONRepos(),
      );
      setSaveMessage(
        `Saved ${result.plots.length} plot${
          result.plots.length === 1 ? "" : "s"
        } to project ${projectId}. History now holds ${result.history.length} version${
          result.history.length === 1 ? "" : "s"
        }.`,
      );
      setPhase("saved");
    } catch (cause) {
      setSaveError(
        cause instanceof Error ? cause.message : "Failed to save converted GeoJSON.",
      );
      setPhase("ready");
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">File Converter</h1>
        <p className="mt-1 text-sm text-slate-500">
          Upload a geospatial file, review the converted GeoJSON, edit feature
          properties, then save to the selected project.
        </p>
      </header>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <ProjectPicker
          value={projectId}
          onChange={(id: string, _project: Project | null) => {
            setProjectId(id);
            setSaveMessage(null);
          }}
          label="Save converted plots to project"
        />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <label htmlFor="converter-file" className="text-sm font-medium text-slate-700">
          Upload file
        </label>
        <input
          ref={fileInputRef}
          id="converter-file"
          type="file"
          accept=".geojson,.json,.kml,.kmz,.zip,.dxf,.csv"
          onChange={onInputChange}
          disabled={phase === "converting" || phase === "saving"}
          className="mt-2 block w-full text-sm text-slate-600 file:mr-4 file:rounded-md file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-700 disabled:opacity-60"
        />
        {fileName ? (
          <p className="mt-2 text-xs text-slate-500">
            Selected: <span className="font-medium">{fileName}</span>
            {phase === "converting" ? " — converting…" : null}
          </p>
        ) : null}
        {conversionError ? (
          <p role="alert" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {conversionError}
          </p>
        ) : null}
      </section>

      {featureCollection ? (
        <>
          <ValidationSummary
            errors={errors}
            featureCount={featureCollection.features.length}
          />
          <FeatureEditor
            featureCollection={featureCollection}
            errors={errors}
            onChange={updateFeatureProperty}
          />
          <GeoJSONPreview featureCollection={featureCollection} />
        </>
      ) : null}

      {featureCollection ? (
        <section className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={!canSave}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {phase === "saving" ? "Saving…" : "Save to project"}
          </button>
          <p className="text-xs text-slate-500">
            {projectId === ""
              ? "Select a project to enable saving."
              : hasErrors
                ? "Resolve all validation errors before saving."
                : "Saving uploads the GeoJSON, upserts plots, and records a history version."}
          </p>
        </section>
      ) : null}

      {saveError ? (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {saveError}
        </p>
      ) : null}
      {saveMessage ? (
        <p role="status" className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {saveMessage}
        </p>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Per-feature/per-file validation error report (Req 34.4). */
function ValidationSummary({
  errors,
  featureCount,
}: {
  errors: ValidationError[];
  featureCount: number;
}) {
  if (errors.length === 0) {
    return (
      <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        Conversion succeeded: {featureCount} feature{featureCount === 1 ? "" : "s"}{" "}
        valid. Review the preview, edit properties if needed, then save.
      </section>
    );
  }
  return (
    <section className="rounded-lg border border-red-200 bg-red-50 p-4">
      <h2 className="text-sm font-semibold text-red-800">
        {errors.length} validation error{errors.length === 1 ? "" : "s"} — saving
        is withheld until resolved
      </h2>
      <ul className="mt-2 space-y-1 text-sm text-red-700">
        {errors.map((error, index) => (
          <li key={`${error.kind}-${error.featureIndex ?? "x"}-${index}`}>
            <span className="font-medium">
              {error.featureIndex !== undefined
                ? `Feature #${error.featureIndex + 1}`
                : error.source
                  ? error.source
                  : "File"}
              :
            </span>{" "}
            {error.message}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Editable feature-properties grid (Req 34.6). */
function FeatureEditor({
  featureCollection,
  errors,
  onChange,
}: {
  featureCollection: GeoJSON.FeatureCollection;
  errors: ValidationError[];
  onChange: (
    featureIndex: number,
    key: string,
    value: string,
    originalType: "number" | "boolean" | "string",
  ) => void;
}) {
  const errorIndexes = useMemo(
    () => new Set(errors.map((e) => e.featureIndex).filter((i): i is number => i !== undefined)),
    [errors],
  );

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-800">
        Feature properties ({featureCollection.features.length})
      </h2>
      <p className="mt-1 text-xs text-slate-500">
        Edit primitive property values before saving. Geometry and derived
        objects (e.g. centroid) are read-only.
      </p>
      <div className="mt-4 space-y-4">
        {featureCollection.features.map((feature, featureIndex) => (
          <FeatureRow
            key={featureIndex}
            feature={feature}
            featureIndex={featureIndex}
            hasError={errorIndexes.has(featureIndex)}
            onChange={onChange}
          />
        ))}
      </div>
    </section>
  );
}

/** A single feature's editable properties. */
function FeatureRow({
  feature,
  featureIndex,
  hasError,
  onChange,
}: {
  feature: GeoJSON.Feature;
  featureIndex: number;
  hasError: boolean;
  onChange: (
    featureIndex: number,
    key: string,
    value: string,
    originalType: "number" | "boolean" | "string",
  ) => void;
}) {
  const properties = (feature.properties ?? {}) as Record<string, unknown>;
  const keys = Object.keys(properties);

  return (
    <div
      className={[
        "rounded-md border p-3",
        hasError ? "border-red-300 bg-red-50/40" : "border-slate-200 bg-slate-50/60",
      ].join(" ")}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Feature #{featureIndex + 1}
          {feature.geometry ? ` · ${feature.geometry.type}` : " · no geometry"}
        </span>
      </div>
      {keys.length === 0 ? (
        <p className="text-xs text-slate-400">No properties.</p>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {keys.map((key) => {
            const value = properties[key];
            const kind = primitiveKind(value);
            return (
              <label key={key} className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-600">{key}</span>
                {kind === null ? (
                  <input
                    type="text"
                    readOnly
                    value={stringify(value)}
                    className="cursor-not-allowed rounded border border-slate-200 bg-slate-100 px-2 py-1 text-sm text-slate-500"
                  />
                ) : (
                  <input
                    type={kind === "number" ? "number" : "text"}
                    defaultValue={stringify(value)}
                    onChange={(event) =>
                      onChange(featureIndex, key, event.target.value, kind)
                    }
                    className="rounded border border-slate-300 bg-white px-2 py-1 text-sm focus:border-slate-500 focus:outline-none"
                  />
                )}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Read-only JSON preview of the converted GeoJSON (Req 34.5). */
function GeoJSONPreview({
  featureCollection,
}: {
  featureCollection: GeoJSON.FeatureCollection;
}) {
  const json = useMemo(
    () => JSON.stringify(featureCollection, null, 2),
    [featureCollection],
  );
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-800">GeoJSON preview</h2>
      <pre className="mt-3 max-h-96 overflow-auto rounded-md bg-slate-900 p-4 text-xs leading-relaxed text-slate-100">
        <code>{json}</code>
      </pre>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Classifies a property value as an editable primitive kind, or null. */
function primitiveKind(value: unknown): "number" | "boolean" | "string" | null {
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "string") return "string";
  return null; // objects/arrays/null are not inline-editable
}

/** Renders a property value as a string for an input. */
function stringify(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/** Coerces an edited string back to the property's original primitive type. */
function coerceValue(
  raw: string,
  originalType: "number" | "boolean" | "string",
): number | boolean | string {
  if (originalType === "number") {
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : raw;
  }
  if (originalType === "boolean") {
    return raw.trim().toLowerCase() === "true";
  }
  return raw;
}

/** Builds a precise, human-readable message from a conversion failure (Req 34.1). */
function describeConversionError(cause: unknown, fileName: string): string {
  if (cause instanceof ParseError) {
    const where =
      cause.featureIndex !== undefined
        ? ` (feature #${cause.featureIndex + 1})`
        : cause.source
          ? ` (${cause.source})`
          : "";
    return `Could not convert "${fileName}"${where}: ${cause.message}`;
  }
  if (cause instanceof Error) {
    return `Could not convert "${fileName}": ${cause.message}`;
  }
  return `Could not convert "${fileName}".`;
}
