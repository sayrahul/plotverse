/**
 * Server-side admin session handling (session cookies + role claims).
 *
 * Firebase admin sign-in does not happen on the server. Instead the browser
 * authenticates with the Firebase client SDK (email/password), obtains a
 * short-lived ID token, and POSTs it here. This module exchanges that ID token
 * for a long-lived, HTTP-only **session cookie** using the Admin SDK
 * (`createSessionCookie`), verifies incoming session cookies
 * (`verifySessionCookie`), and reads the `role` custom claim that drives admin
 * authorization (Req 32.2).
 *
 * The session cookie is what `middleware.ts` checks on every `/admin/**`
 * request (Req 32.4) and what the AdminShell reads to render role-gated UI.
 *
 * Security: the resulting cookie MUST be set `httpOnly` (no JS access),
 * `secure` (HTTPS-only in production), and `sameSite` `lax`/`strict` (CSRF
 * defense). Those flags are applied where the cookie is written — see
 * {@link buildSessionCookieOptions} and `app/api/auth/session/route.ts`.
 *
 * This module is server-only: it pulls in `firebase-admin` via
 * `getAdminAuth()`, which throws if evaluated in a browser bundle.
 *
 * Requirements: 32.1, 32.2, 32.4
 */

import type { DecodedIdToken } from "firebase-admin/auth";

import { getAdminAuth } from "@/lib/firebase/server";
import type { AdminRole } from "@/lib/types";

// ---------------------------------------------------------------------------
// Cookie configuration
// ---------------------------------------------------------------------------

/**
 * Name of the admin session cookie. `__session` is intentional: when the app is
 * served behind Firebase Hosting, `__session` is the only cookie forwarded to
 * (and cacheable by) the backend, so using it keeps the same code working in
 * that environment.
 */
export const SESSION_COOKIE_NAME = "__session";

/**
 * Lifetime of the session cookie, in milliseconds (5 days). Firebase allows a
 * session cookie duration between 5 minutes and 14 days; 5 days balances
 * convenience against re-authentication frequency.
 */
export const SESSION_EXPIRES_IN_MS = 60 * 60 * 24 * 5 * 1000;

/** Options shared by every place that sets or clears the session cookie. */
export interface SessionCookieOptions {
  name: string;
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  path: "/";
  maxAge: number;
}

/**
 * Builds the cookie attributes used when writing the session cookie.
 *
 * - `httpOnly`: the cookie is never readable from client JavaScript, so a XSS
 *   bug cannot exfiltrate the session.
 * - `secure`: transmitted only over HTTPS in production. Disabled in
 *   development so the cookie still works over `http://localhost`.
 * - `sameSite: "lax"`: the cookie is withheld from cross-site sub-requests,
 *   mitigating CSRF while still allowing top-level navigations into `/admin`.
 *
 * @param maxAgeMs Cookie lifetime in milliseconds; defaults to
 *                 {@link SESSION_EXPIRES_IN_MS}. `0` clears the cookie.
 */
export function buildSessionCookieOptions(
  maxAgeMs: number = SESSION_EXPIRES_IN_MS,
): SessionCookieOptions {
  return {
    name: SESSION_COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    // `maxAge` is expressed in seconds for the Set-Cookie header.
    maxAge: Math.floor(maxAgeMs / 1000),
  };
}

// ---------------------------------------------------------------------------
// ID token -> session cookie exchange (Req 32.4)
// ---------------------------------------------------------------------------

/**
 * Exchanges a freshly minted Firebase ID token for a long-lived session cookie.
 *
 * Call this from a trusted server context (the session Route Handler) after the
 * browser signs in with the client SDK. The Admin SDK validates the ID token's
 * signature and freshness before issuing the cookie.
 *
 * @param idToken   The ID token produced by `getIdToken()` on the client.
 * @param expiresIn Session lifetime in milliseconds; defaults to
 *                  {@link SESSION_EXPIRES_IN_MS}.
 * @returns The opaque session cookie value to store via `Set-Cookie`.
 */
export async function createSessionCookie(
  idToken: string,
  expiresIn: number = SESSION_EXPIRES_IN_MS,
): Promise<string> {
  return getAdminAuth().createSessionCookie(idToken, { expiresIn });
}

// ---------------------------------------------------------------------------
// Session verification (Req 32.1, 32.4)
// ---------------------------------------------------------------------------

/**
 * Verifies a session cookie and returns its decoded claims, or `null` when the
 * cookie is missing, malformed, expired, or revoked.
 *
 * The second argument to `verifySessionCookie` is `true`, which additionally
 * checks the token against revoked refresh tokens (a signed-out or disabled
 * user is rejected). This is the single gate used by `middleware.ts` to decide
 * whether to allow or redirect an `/admin` request (Req 32.1, 32.4).
 *
 * Never throws: a `null` result means "not authenticated".
 *
 * @param cookie The raw session cookie value (may be `undefined`).
 */
export async function verifySession(
  cookie: string | undefined | null,
): Promise<DecodedIdToken | null> {
  if (!cookie) {
    return null;
  }

  try {
    return await getAdminAuth().verifySessionCookie(cookie, true);
  } catch {
    // Invalid / expired / revoked cookie — treated as unauthenticated.
    return null;
  }
}

// ---------------------------------------------------------------------------
// Role custom-claim reading (Req 32.2)
// ---------------------------------------------------------------------------

/**
 * Narrows an arbitrary claim value to a known {@link AdminRole}, returning
 * `null` for any value outside the union. Keeps a forged or stale `role` claim
 * from being treated as a valid role downstream.
 */
export function parseAdminRole(value: unknown): AdminRole | null {
  return value === "superadmin" || value === "editor" ? value : null;
}

/**
 * Extracts the `role` custom claim from a decoded session token (Req 32.2).
 *
 * @returns The {@link AdminRole}, or `null` if the claim is absent/unknown.
 */
export function getRoleFromClaims(
  claims: DecodedIdToken | null,
): AdminRole | null {
  if (!claims) {
    return null;
  }
  return parseAdminRole((claims as { role?: unknown }).role);
}

/**
 * Verifies a session cookie and returns the caller's {@link AdminRole}, or
 * `null` when the session is invalid or carries no recognized role.
 *
 * Convenience for callers that only need the role (e.g. the AdminShell deciding
 * which superadmin-only controls to render). For full claims use
 * {@link verifySession}.
 *
 * @param cookie The raw session cookie value (may be `undefined`).
 */
export async function getSessionRole(
  cookie: string | undefined | null,
): Promise<AdminRole | null> {
  const claims = await verifySession(cookie);
  return getRoleFromClaims(claims);
}
