// @vitest-environment node
//
// Runs in the Node environment (not jsdom) because `lib/auth/session.ts`
// transitively imports the server-only `lib/firebase/server.ts`, which throws
// if `window` is defined. The functions under test perform no Firebase I/O.

/**
 * Unit tests for the pure, I/O-free parts of the admin session module:
 * role custom-claim parsing/extraction and session-cookie attribute building.
 *
 * The Firebase-backed functions (createSessionCookie/verifySession) are
 * exercised by emulator integration tests; here we cover the deterministic
 * logic that gates authorization (Req 32.2) and cookie security (Req 32.4).
 */

import { describe, it, expect } from "vitest";
import type { DecodedIdToken } from "firebase-admin/auth";

import {
  SESSION_COOKIE_NAME,
  SESSION_EXPIRES_IN_MS,
  buildSessionCookieOptions,
  getRoleFromClaims,
  parseAdminRole,
} from "@/lib/auth/session";

/** Builds a minimal decoded-token stand-in carrying the given `role` claim. */
function claimsWithRole(role: unknown): DecodedIdToken {
  return { role } as unknown as DecodedIdToken;
}

describe("parseAdminRole", () => {
  it("accepts the two known roles", () => {
    expect(parseAdminRole("superadmin")).toBe("superadmin");
    expect(parseAdminRole("editor")).toBe("editor");
  });

  it("rejects unknown or non-string values as null", () => {
    expect(parseAdminRole("admin")).toBeNull();
    expect(parseAdminRole("")).toBeNull();
    expect(parseAdminRole(undefined)).toBeNull();
    expect(parseAdminRole(null)).toBeNull();
    expect(parseAdminRole(42)).toBeNull();
    expect(parseAdminRole({ role: "superadmin" })).toBeNull();
  });
});

describe("getRoleFromClaims", () => {
  it("returns null when claims are null", () => {
    expect(getRoleFromClaims(null)).toBeNull();
  });

  it("extracts a valid role claim", () => {
    expect(getRoleFromClaims(claimsWithRole("editor"))).toBe("editor");
    expect(getRoleFromClaims(claimsWithRole("superadmin"))).toBe("superadmin");
  });

  it("returns null when the role claim is missing or unknown", () => {
    expect(getRoleFromClaims(claimsWithRole(undefined))).toBeNull();
    expect(getRoleFromClaims(claimsWithRole("viewer"))).toBeNull();
  });
});

describe("buildSessionCookieOptions", () => {
  it("sets security flags: httpOnly, sameSite=lax, path=/", () => {
    const opts = buildSessionCookieOptions();
    expect(opts.name).toBe(SESSION_COOKIE_NAME);
    expect(opts.httpOnly).toBe(true);
    expect(opts.sameSite).toBe("lax");
    expect(opts.path).toBe("/");
  });

  it("derives maxAge in seconds from the millisecond lifetime", () => {
    const opts = buildSessionCookieOptions(SESSION_EXPIRES_IN_MS);
    expect(opts.maxAge).toBe(Math.floor(SESSION_EXPIRES_IN_MS / 1000));
  });

  it("produces a clearing cookie (maxAge 0) when given 0", () => {
    expect(buildSessionCookieOptions(0).maxAge).toBe(0);
  });
});
