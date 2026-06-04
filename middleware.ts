/**
 * Admin auth gate (Edge middleware).
 *
 * Enforces access control for every `/admin/**` request at the request
 * middleware layer (Req 32.4): a request with no session cookie is denied and
 * redirected to the login page (Req 32.1), while a request that carries a
 * session cookie is allowed through to the Admin_Panel.
 *
 * ## Runtime constraint — why this only checks cookie *presence*
 *
 * Next.js middleware runs on the **Edge runtime**, which does not provide the
 * Node.js APIs (crypto, streams) that `firebase-admin` requires. The full
 * cryptographic verification of the session cookie lives in
 * `verifySession()` (`lib/auth/session.ts`), which is backed by
 * `firebase-admin` and therefore can only run in the **Node.js runtime**.
 *
 * Importing that module here would pull `firebase-admin` into the Edge bundle
 * and break the build, so this middleware deliberately performs only a cheap
 * presence check on the cookie. **Authoritative verification is enforced
 * server-side** in the Node.js runtime by the AdminShell (task 17.1), which
 * calls `verifySession()` / `getSessionRole()` and decodes the `role` custom
 * claim. The middleware is the coarse first gate; the server layout is the
 * trusted one. A forged or expired cookie passes this presence check but is
 * rejected the moment it reaches the server layout.
 *
 * Requirements: 32.1, 32.4
 */

import { NextResponse, type NextRequest } from "next/server";

/**
 * Name of the admin session cookie.
 *
 * This MUST stay in sync with `SESSION_COOKIE_NAME` in `lib/auth/session.ts`.
 * It is duplicated here instead of imported because that module transitively
 * imports `firebase-admin`, which is not supported in the Edge runtime this
 * middleware runs in (see the file header).
 */
const SESSION_COOKIE_NAME = "__session";

/** Login route that unauthenticated admin requests are redirected to. */
const LOGIN_PATH = "/admin/login";

/**
 * Header forwarded to downstream server components when a session cookie is
 * present. It is purely informational: it signals "a cookie reached the gate",
 * NOT a verified identity. Server code MUST still call `verifySession()` /
 * `getSessionRole()` to obtain a trusted role — this header must never be
 * treated as proof of authentication or used to derive authorization.
 */
const SESSION_PRESENT_HEADER = "x-plotverse-admin-session";

/**
 * Coarse admin auth gate.
 *
 * - When the session cookie is missing/empty, redirect to {@link LOGIN_PATH},
 *   preserving the originally requested path+query in a `next` query parameter
 *   so the user can be returned there after signing in (Req 32.1).
 * - When the cookie is present, allow the request and forward a non-trusted
 *   "session present" header for downstream visibility.
 */
export function middleware(request: NextRequest): NextResponse {
  const { nextUrl } = request;

  // Defense-in-depth: never gate the login route itself, even if the matcher
  // is later broadened. Without this, an unauthenticated user could never
  // reach the page that lets them authenticate.
  if (nextUrl.pathname === LOGIN_PATH) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionCookie) {
    // Deny + redirect to login, remembering where the user was headed.
    const loginUrl = nextUrl.clone();
    loginUrl.pathname = LOGIN_PATH;
    loginUrl.search = "";
    loginUrl.searchParams.set("next", `${nextUrl.pathname}${nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  // Cookie present: allow through. Authoritative verification + role decoding
  // happen server-side (Node.js runtime) in the AdminShell.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(SESSION_PRESENT_HEADER, "present");
  return NextResponse.next({ request: { headers: requestHeaders } });
}

/**
 * Scope the middleware to the admin surface only.
 *
 * `/admin/((?!login).*)` matches every path under `/admin` except the login
 * page, so unauthenticated users can always reach `/admin/login`. `/admin`
 * (the bare segment) is matched separately so the dashboard root is gated too.
 */
export const config = {
  matcher: ["/admin", "/admin/((?!login).*)"],
};
