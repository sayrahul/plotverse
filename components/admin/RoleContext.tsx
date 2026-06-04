/**
 * Admin role context for client components (Req 32.2, 32.3).
 *
 * The trusted Admin_Role is resolved on the server in the gated admin layout
 * (Node.js runtime, `verifySession` + `role` custom claim) and handed to this
 * provider. Client components read it via {@link useRole} and decide which
 * controls to render. Authorization decisions are delegated to the single
 * source of truth — {@link can} / {@link isSuperadminOnly} in `lib/access.ts` —
 * so the UI gate can never drift from the policy enforced by the data-access
 * layer and Firestore Security Rules.
 *
 * This context is purely a UI affordance: hiding a control here is convenience,
 * not security. Every superadmin-only operation is independently denied at the
 * data-access layer and by Firestore rules (defense-in-depth, Req 32.3).
 *
 * Requirements: 32.2, 32.3
 */

"use client";

import { createContext, useContext, type ReactNode } from "react";

import { can, type AdminAction } from "@/lib/access";
import type { AdminRole } from "@/lib/types";

/**
 * Holds the current Admin_Role. `null` means "no provider above me", which is
 * a developer error rather than an unauthenticated state — the server layout
 * never renders the panel without a role.
 */
const RoleContext = createContext<AdminRole | null>(null);

/** Props for {@link RoleProvider}. */
export interface RoleProviderProps {
  /** The trusted role resolved server-side from the session cookie. */
  role: AdminRole;
  children: ReactNode;
}

/**
 * Provides the current {@link AdminRole} to the admin component tree. Rendered
 * by the gated admin layout once the session has been cryptographically
 * verified server-side.
 */
export function RoleProvider({ role, children }: RoleProviderProps) {
  return <RoleContext.Provider value={role}>{children}</RoleContext.Provider>;
}

/**
 * Returns the current Admin_Role.
 *
 * @throws If called outside a {@link RoleProvider}, signalling a wiring bug.
 */
export function useRole(): AdminRole {
  const role = useContext(RoleContext);
  if (role === null) {
    throw new Error("useRole must be used within a RoleProvider.");
  }
  return role;
}

/**
 * Returns whether the current role may perform `action`, delegating to the
 * access policy in `lib/access.ts` (Req 32.2, 32.3).
 */
export function useCan(action: AdminAction): boolean {
  return can(useRole(), action);
}

/** Props for the {@link Can} gate. */
export interface CanProps {
  /** The action the wrapped UI would perform. */
  action: AdminAction;
  /** Rendered when the current role is permitted the action. */
  children: ReactNode;
  /** Rendered when the role is denied. Defaults to nothing (hidden). */
  fallback?: ReactNode;
}

/**
 * Renders `children` only when the current role is permitted `action` per the
 * access policy; otherwise renders `fallback` (nothing by default). Use this to
 * hide or disable controls for operations the Admin_User cannot perform.
 */
export function Can({ action, children, fallback = null }: CanProps) {
  return <>{useCan(action) ? children : fallback}</>;
}

/** Props for the {@link RequireSuperadmin} gate. */
export interface RequireSuperadminProps {
  /** Rendered only for the superadmin role. */
  children: ReactNode;
  /** Rendered for non-superadmin roles. Defaults to nothing (hidden). */
  fallback?: ReactNode;
}

/**
 * Renders `children` only for the superadmin role, otherwise `fallback`.
 *
 * A convenience over {@link Can} for blocks that are wholesale reserved for
 * superadmins (e.g. destructive or user-administration controls) rather than
 * tied to one specific {@link AdminAction} (Req 32.3).
 */
export function RequireSuperadmin({
  children,
  fallback = null,
}: RequireSuperadminProps) {
  const role = useRole();
  return <>{role === "superadmin" ? children : fallback}</>;
}
