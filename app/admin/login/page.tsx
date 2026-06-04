/**
 * Admin sign-in page (Req 32.1, 32.4).
 *
 * Lives at `/admin/login`, deliberately OUTSIDE the gated `(panel)` route group
 * and excluded from the Edge middleware matcher, so an unauthenticated user can
 * always reach it. It signs in with the Firebase client SDK and exchanges the
 * ID token for an HTTP-only session cookie via `signIn` (`lib/auth/client.ts`).
 * On success it navigates to the originally requested path (the `next` query
 * param set by the middleware redirect) or the dashboard.
 *
 * Requirements: 32.1, 32.4
 */

"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";

import { signIn } from "@/lib/auth/client";

/** Default destination after a successful sign-in. */
const DEFAULT_REDIRECT = "/admin";

/**
 * Restricts the post-login redirect to in-app, same-origin paths so a crafted
 * `next` value cannot bounce the user to an external site (open-redirect
 * defense). Only paths under `/admin` (but not back to `/admin/login`) are
 * honored; anything else falls back to the dashboard.
 */
function safeRedirect(next: string | null): string {
  if (
    next &&
    next.startsWith("/admin") &&
    !next.startsWith("//") &&
    !next.startsWith("/admin/login")
  ) {
    return next;
  }
  return DEFAULT_REDIRECT;
}

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email, password);
      const destination = safeRedirect(searchParams.get("next"));
      router.replace(destination);
      router.refresh();
    } catch {
      setError("Sign-in failed. Check your email and password.");
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          Admin sign in
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Sign in to manage your PlotVerse projects.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-slate-700"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-slate-700"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>

          {error ? (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}

/**
 * Wraps the form in a Suspense boundary because {@link useSearchParams} opts
 * the route into client-side rendering on demand; without the boundary Next.js
 * 14 errors during static generation of `/admin/login`.
 */
export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <AdminLoginForm />
    </Suspense>
  );
}
