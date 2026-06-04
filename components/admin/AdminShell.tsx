/**
 * AdminShell — the Admin_Panel layout chrome (Req 32, 33.1).
 *
 * Renders the persistent navigation across every management section (Projects,
 * Plots, Zones, Status Groups, Gallery, CRM, File Converter, GeoJSON History —
 * Req 33.1) plus a header showing the signed-in Admin_Role and a sign-out
 * control. Section content is passed in as `children` so the shell wraps every
 * `/admin` page uniformly.
 *
 * Role gating (Req 32.2, 32.3): the trusted role comes from the server layout
 * via {@link RoleProvider}; this client component reads it through
 * {@link useRole}. Sections flagged with a `requiredAction` (e.g. superadmin-
 * only) are hidden from roles the access policy denies — the shell never makes
 * its own authorization decision, it always asks `lib/access.ts`.
 *
 * Requirements: 32.2, 32.3, 33.1
 */

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import { ADMIN_SECTIONS, type AdminSection } from "@/components/admin/sections";
import { useRole } from "@/components/admin/RoleContext";
import { can } from "@/lib/access";
import { signOut } from "@/lib/auth/client";

/** Props for {@link AdminShell}. */
export interface AdminShellProps {
  /** The active section's content. */
  children: ReactNode;
}

/**
 * Decides whether a section is visible to the current role. Sections without a
 * `requiredAction` are visible to any authenticated Admin_User (Req 32.2);
 * gated sections defer to the access policy (Req 32.3).
 */
function isSectionVisible(
  section: AdminSection,
  role: Parameters<typeof can>[0],
): boolean {
  return (
    section.requiredAction === undefined || can(role, section.requiredAction)
  );
}

/**
 * Determines whether a nav item is the active one for the current pathname.
 * The Overview (`/admin`) item matches only the exact root; deeper sections
 * match their prefix so nested routes keep the parent highlighted.
 */
function isActive(href: string, pathname: string): boolean {
  if (href === "/admin") {
    return pathname === "/admin";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminShell({ children }: AdminShellProps) {
  const role = useRole();
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const sections = ADMIN_SECTIONS.filter((section) =>
    isSectionVisible(section, role),
  );

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      router.replace("/admin/login");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] bg-slate-50 text-slate-900">
      <aside className="flex w-60 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <Link href="/admin" className="text-lg font-bold tracking-tight">
            PlotVerse Admin
          </Link>
        </div>
        <nav aria-label="Admin sections" className="flex-1 overflow-y-auto p-3">
          <ul className="space-y-1">
            {sections.map((section) => {
              const active = isActive(section.href, pathname);
              return (
                <li key={section.id}>
                  <Link
                    href={section.href}
                    aria-current={active ? "page" : undefined}
                    className={[
                      "block rounded-md px-3 py-2 text-sm font-medium transition",
                      active
                        ? "bg-slate-900 text-white"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                    ].join(" ")}
                  >
                    {section.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>Signed in as</span>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-slate-700">
              {role}
            </span>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </header>

        <main className="min-w-0 flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
