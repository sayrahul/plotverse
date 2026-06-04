/**
 * Placeholder for an Admin_Panel section not yet implemented.
 *
 * The AdminShell and its navigation across all sections ship in task 17.1; the
 * individual section managers (Projects, Plots, Zones, Status Groups, Gallery,
 * CRM, File Converter, GeoJSON History) are built in tasks 17.2–17.6. Each
 * section route renders this placeholder so the navigation is complete and
 * routable today, and later tasks replace the placeholder with the real
 * manager UI.
 *
 * Requirements: 33.1
 */

export interface SectionPlaceholderProps {
  /** Section title shown in the heading. */
  title: string;
  /** Short description of what the section will do. */
  description: string;
}

export function SectionPlaceholder({
  title,
  description,
}: SectionPlaceholderProps) {
  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </header>
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
        This section is coming soon.
      </div>
    </div>
  );
}
