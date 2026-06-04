/**
 * Session cookie Route Handler.
 *
 * Bridges client sign-in (Firebase ID token) to the server session cookie used
 * by `middleware.ts` to gate `/admin/**` (Req 32.1, 32.4):
 *
 *   - POST   { idToken }  -> verify the ID token, mint an HTTP-only session
 *                            cookie via the Admin SDK, and Set-Cookie it.
 *   - DELETE              -> clear the session cookie (sign-out).
 *
 * Runtime: this handler uses `firebase-admin`, which depends on Node.js APIs
 * (crypto, streams) that are unavailable in the Edge runtime, so it is pinned
 * to the Node.js runtime below.
 *
 * Security: the cookie is written `httpOnly` + `secure` (prod) +
 * `sameSite=lax` (see `buildSessionCookieOptions`) so it is invisible to client
 * JS and withheld from cross-site requests, mitigating XSS theft and CSRF.
 *
 * Requirements: 32.1, 32.2, 32.4
 */

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  SESSION_COOKIE_NAME,
  SESSION_EXPIRES_IN_MS,
  buildSessionCookieOptions,
  createSessionCookie,
} from "@/lib/auth/session";

// firebase-admin requires Node.js APIs; the Edge runtime is not supported.
export const runtime = "nodejs";
// Never cache auth responses.
export const dynamic = "force-dynamic";

interface SessionRequestBody {
  idToken?: unknown;
}

/**
 * POST: exchange a Firebase ID token for an HTTP-only session cookie.
 */
export async function POST(request: Request): Promise<NextResponse> {
  let body: SessionRequestBody;
  try {
    body = (await request.json()) as SessionRequestBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const idToken = body.idToken;
  if (typeof idToken !== "string" || idToken.length === 0) {
    return NextResponse.json(
      { error: "Missing idToken." },
      { status: 400 },
    );
  }

  try {
    const sessionCookie = await createSessionCookie(
      idToken,
      SESSION_EXPIRES_IN_MS,
    );
    cookies().set({
      ...buildSessionCookieOptions(SESSION_EXPIRES_IN_MS),
      value: sessionCookie,
    });
    return NextResponse.json({ status: "ok" });
  } catch {
    // A rejected token is an authentication failure, not a server error.
    return NextResponse.json(
      { error: "Invalid or expired ID token." },
      { status: 401 },
    );
  }
}

/**
 * DELETE: clear the session cookie (sign-out). Overwrites the cookie with an
 * immediately-expiring value so the browser drops it.
 */
export async function DELETE(): Promise<NextResponse> {
  cookies().set({
    ...buildSessionCookieOptions(0),
    name: SESSION_COOKIE_NAME,
    value: "",
  });
  return NextResponse.json({ status: "ok" });
}
