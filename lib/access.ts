/**
 * Admin access policy matrix (pure, framework-free).
 *
 * The Admin_Panel grants coarse access to any authenticated Admin_User at the
 * middleware/layout layer, then gates individual operations by Admin_Role
 * (Req 32.2). A subset of operations is reserved for the superadmin role —
 * notably destructive project deletes and user role changes — and an editor
 * MUST be denied every one of them (Req 32.3).
 *
 * This module is the single source of truth for that decision. It performs no
 * I/O and holds no state: given a role and an action it returns a boolean. The
 * data-access layer and UI consult {@link can} to hide or block controls, while
 * Firestore Security Rules enforce the same boundary as defense-in-depth.
 *
 * The decision rule (Property 23):
 *   - superadmin is permitted ALL actions;
 *   - editor is permitted every action EXCEPT those reserved for superadmin.
 *
 * Requirements: 32.2, 32.3
 */

import type { AdminRole } from "@/lib/types";

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/**
 * Every operation the Admin_Panel can perform, expressed as a
 * `domain.operation` string. The union is closed so the policy matrix below is
 * exhaustive and a newly added action must be classified before it compiles.
 */
export type AdminAction =
  // Projects (Req 2)
  | "project.create"
  | "project.update"
  | "project.delete" // superadmin only — destructive (Req 32.3)
  // Plots & inventory (Req 6)
  | "plot.update"
  | "plot.statusChange"
  // Zones & status groups (Req 9, 13)
  | "zone.update"
  | "statusGroup.update"
  // GeoJSON conversion & version history (Req 35)
  | "geojson.upload"
  | "geojson.rollback"
  // Gallery media (Req 21, 39)
  | "media.upload"
  | "media.delete"
  // Leads / CRM (Req 20, 38)
  | "lead.update"
  | "lead.delete"
  // User & role administration — superadmin only (Req 32.3)
  | "user.invite"
  | "user.remove"
  | "user.role.change";

/**
 * Actions reserved for the superadmin Admin_Role. An editor is denied every
 * action in this set and permitted everything outside it (Req 32.3). This set
 * is the single knob that defines the privilege boundary; the {@link POLICY}
 * matrix and {@link can} are both derived from it so they cannot drift apart.
 */
export const SUPERADMIN_ONLY_ACTIONS = [
  "project.delete", // destructive (Req 32.3)
  "user.invite", // user administration (Req 32.3)
  "user.remove", // user administration (Req 32.3)
  "user.role.change", // role changes (Req 32.3)
] as const satisfies readonly AdminAction[];

/** Membership-test helper for the superadmin-only set. */
const superadminOnly = new Set<AdminAction>(SUPERADMIN_ONLY_ACTIONS);

/** Every action the Admin_Panel recognizes, in declaration order. */
export const ADMIN_ACTIONS = [
  "project.create",
  "project.update",
  "project.delete",
  "plot.update",
  "plot.statusChange",
  "zone.update",
  "statusGroup.update",
  "geojson.upload",
  "geojson.rollback",
  "media.upload",
  "media.delete",
  "lead.update",
  "lead.delete",
  "user.invite",
  "user.remove",
  "user.role.change",
] as const satisfies readonly AdminAction[];

// ---------------------------------------------------------------------------
// Policy matrix
// ---------------------------------------------------------------------------

/**
 * The role/action policy matrix: for each action, the set of roles allowed to
 * perform it. superadmin appears for every action; editor appears only for
 * actions outside {@link SUPERADMIN_ONLY_ACTIONS}.
 *
 * The matrix is derived from the action list and the superadmin-only set so it
 * stays consistent with {@link can} by construction. It is exposed primarily
 * for inspection, UI rendering, and tests.
 */
export const POLICY: Readonly<Record<AdminAction, readonly AdminRole[]>> =
  buildPolicy();

/**
 * Builds the {@link POLICY} matrix with an action-keyed accumulator so the
 * result is typed as `Record<AdminAction, readonly AdminRole[]>` directly,
 * without an unsafe cast from a string-keyed `Object.fromEntries` result.
 */
function buildPolicy(): Record<AdminAction, readonly AdminRole[]> {
  const policy = {} as Record<AdminAction, readonly AdminRole[]>;
  for (const action of ADMIN_ACTIONS) {
    policy[action] = superadminOnly.has(action)
      ? (["superadmin"] as const)
      : (["superadmin", "editor"] as const);
  }
  return policy;
}

// ---------------------------------------------------------------------------
// Decision function
// ---------------------------------------------------------------------------

/**
 * Decides whether an Admin_Role may perform an action (Req 32.2, 32.3).
 *
 * - superadmin is permitted ALL actions.
 * - editor is permitted every action EXCEPT those in
 *   {@link SUPERADMIN_ONLY_ACTIONS}.
 *
 * The decision is total over the {@link AdminRole} union and equivalent to
 * membership in the {@link POLICY} matrix (Property 23).
 *
 * @param role   The Admin_User's role.
 * @param action The operation being attempted.
 * @returns `true` if the role is permitted to perform the action.
 */
export function can(role: AdminRole, action: AdminAction): boolean {
  switch (role) {
    case "superadmin":
      // Superadmin is permitted every action (Req 32.2).
      return true;

    case "editor":
      // Editor is denied every superadmin-only action, allowed the rest (Req 32.3).
      return !superadminOnly.has(action);

    default:
      // Exhaustiveness guard: a new AdminRole must be classified above.
      return assertNever(role);
  }
}

/**
 * Convenience predicate: `true` when an action is reserved for superadmin and
 * therefore denied to editors. Useful for hiding controls in the UI.
 */
export function isSuperadminOnly(action: AdminAction): boolean {
  return superadminOnly.has(action);
}

/** Compile-time exhaustiveness guard for the {@link AdminRole} switch. */
function assertNever(value: never): never {
  throw new Error(`Unhandled admin role: ${String(value)}`);
}
