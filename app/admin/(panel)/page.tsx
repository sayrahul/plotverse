/**
 * Admin_Panel dashboard landing (Req 33.1).
 *
 * The `/admin` index rendered inside the gated layout (and therefore the
 * AdminShell). It presents an overview grid of the management sections so an
 * Admin_User can jump into Projects, Plots, Zones, Status Groups, Gallery, CRM,
 * the File Converter, or GeoJSON History. The section managers themselves are
 * implemented by tasks 17.2–17.6; this page only links into them.
 *
 * Requirements: 33.1
 */

import Link from "next/link";

import { ADMIN_SECTIONS } from "@/components/admin/sections";

export default function AdminDashboardPage() {
  // Skip the "Overview" entry — that is this page.
  const sections = ADMIN_SECTIONS.filter((section) => section.id !== "overview");

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage your projects and their contents.
        </p>
      </header>

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => (
          <li key={section.id}>
            <Link
              href={section.href}
              className="block h-full rounded-lg border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-sm"
            >
              <h2 className="text-base font-semibold text-slate-900">
                {section.label}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {section.description}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
