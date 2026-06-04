/**
 * Gated Admin_Panel layout (Req 32.1, 32.2, 32.4).
 *
 * This Server Component is the trusted authentication boundary for the panel.
 * Edge `middleware.ts` only checks that a session cookie is *present* (the Edge
 * runtime cannot run `firebase-admin`); the authoritative, full cryptographic
 * verification happens here, on the Node.js runtime, before any admin content
 * renders (Req 32.4).
 *
 * Flow:
 *   1. Read the `__session` cookie via `next/headers`.
 *   2. `verifySession` decodes + verifies it (signature, expiry, revocation).
 *   3. An invalid/missing session redirects to `/admin/login` (Req 32.1).
 *   4. The verified `role` custom claim (Req 32.2) is provided to client
 *      components through {@link RoleProvider} and drives superadmin-only
 *      gating in the shell (Req 32.3).
 *
 * It lives in the `(panel)` route group so `/admin/login` — which sits outside
 * the group — is NOT wrapped by this gate; otherwise an unauthenticated user
 * would be redirected away from the very page that lets them sign in. The URL
 * for pages in this group is still `/admin/...` (route groups do not affect the
 * path).
 *
 * Requirements: 32.1, 32.2, 32.4
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AdminShell } from "@/components/admin/AdminShell";
import { RoleProvider } from "@/components/admin/RoleContext";
import {
  SESSION_COOKIE_NAME,
  getRoleFromClaims,
  verifySession,
} from "@/lib/auth/session";

// firebase-admin needs Node.js APIs; the Edge runtime is unsupported.
export const runtime = "nodejs";
// Auth state is request-specific — never statically cache the panel.
export const dynamic = "force-dynamic";

/** Where unauthenticated requests are sent (mirrors `middleware.ts`). */
const LOGIN_PATH = "/admin/login";

export default async function AdminPanelLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  // Authoritative verification: middleware only proved the cookie exists.
  const sessionCookie = cookies().get(SESSION_COOKIE_NAME)?.value;
  const claims = await verifySession(sessionCookie);
  const role = getRoleFromClaims(claims);

  // No valid session, or a session without a recognized admin role: deny and
  // send the user to sign in (Req 32.1).
  if (role === null) {
    redirect(LOGIN_PATH);
  }

  return (
    <RoleProvider role={role}>
      <AdminShell>{children}</AdminShell>
    </RoleProvider>
  );
}
