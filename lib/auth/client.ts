/**
 * Client-side admin sign-in (browser).
 *
 * Runs in React client components on the `/admin/login` page. It authenticates
 * the Admin_User with Firebase Auth (email/password), obtains a short-lived ID
 * token, and hands that token to the server session endpoint, which exchanges
 * it for an HTTP-only session cookie (see `lib/auth/session.ts` and
 * `app/api/auth/session/route.ts`). After that, every `/admin` request is
 * gated by the session cookie in middleware (Req 32.1, 32.4).
 *
 * The Firebase ID token is only held transiently in memory and never written
 * to a JS-readable cookie or `localStorage`; the persistent credential is the
 * server-set HTTP-only cookie.
 *
 * Requirements: 32.1, 32.4
 */

"use client";

import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from "firebase/auth";

import { getClientAuth } from "@/lib/firebase/client";

/** Route Handler that sets/clears the server session cookie. */
const SESSION_ENDPOINT = "/api/auth/session";

/**
 * Signs the Admin_User in with email/password and returns a fresh Firebase ID
 * token to be exchanged for a session cookie.
 *
 * @param email    Admin_User email.
 * @param password Admin_User password.
 * @returns The ID token from `getIdToken()`.
 * @throws The underlying Firebase `AuthError` (e.g. `auth/invalid-credential`)
 *         so the caller can surface a field-level message.
 */
export async function signInWithEmail(
  email: string,
  password: string,
): Promise<string> {
  const auth = getClientAuth();
  const credential = await signInWithEmailAndPassword(auth, email, password);
  // `true` forces a refresh so the token carries the latest custom claims
  // (e.g. a `role` granted after the user was first created).
  return credential.user.getIdToken(true);
}

/**
 * Full client sign-in flow: authenticate, then exchange the ID token for an
 * HTTP-only session cookie via the server endpoint.
 *
 * On success the session cookie is set and the caller can navigate into the
 * admin panel. On failure it throws and leaves no session.
 *
 * @param email    Admin_User email.
 * @param password Admin_User password.
 */
export async function signIn(email: string, password: string): Promise<void> {
  const idToken = await signInWithEmail(email, password);

  const response = await fetch(SESSION_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to establish session (status ${response.status}).`,
    );
  }
}

/**
 * Signs the Admin_User out: clears the server session cookie and the local
 * Firebase Auth state. Best-effort — the local sign-out runs even if the
 * server request fails so the in-memory credential is always discarded.
 */
export async function signOut(): Promise<void> {
  try {
    await fetch(SESSION_ENDPOINT, { method: "DELETE" });
  } finally {
    await firebaseSignOut(getClientAuth());
  }
}
