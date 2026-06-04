/**
 * Server-side Firebase Admin initialization (RSC, route handlers, middleware).
 *
 * Initializes a single `firebase-admin` app from service-account environment
 * variables, guarding against re-initialization across hot reloads and module
 * re-evaluation. Exposes admin Firestore, Auth, and Storage handles used by:
 *   - `generateMetadata` and server-side project reads (Req 24.1),
 *   - session-cookie verification in `middleware.ts` (Req 32.4),
 *   - admin/superadmin server operations.
 *
 * This module is server-only. Importing it from a client component will throw
 * to prevent leaking service-account credentials into the browser bundle.
 *
 * Configuration:
 *   - FIREBASE_ADMIN_PROJECT_ID
 *   - FIREBASE_ADMIN_CLIENT_EMAIL
 *   - FIREBASE_ADMIN_PRIVATE_KEY            (PEM; literal "\n" sequences are
 *                                            normalized to newlines)
 *   - FIREBASE_ADMIN_STORAGE_BUCKET         (optional; defaults to
 *                                            "<projectId>.appspot.com")
 *   - FIREBASE_USE_EMULATOR / NEXT_PUBLIC_USE_FIREBASE_EMULATOR (optional)
 *
 * Requirements: 2.2, 24.1, 32.4
 */

import {
  cert,
  getApps,
  initializeApp,
  type App,
  type AppOptions,
} from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage, type Storage } from "firebase-admin/storage";

const ADMIN_APP_NAME = "plotverse-admin";

// Guard against importing this server-only module into a browser bundle, which
// would leak service-account credentials. Next.js marks client code with
// `typeof window !== "undefined"` at runtime.
if (typeof window !== "undefined") {
  throw new Error(
    "lib/firebase/server.ts is server-only and must not be imported from client code.",
  );
}

/** Normalizes a PEM private key whose newlines were escaped in the env var. */
function normalizePrivateKey(raw: string): string {
  // Values stored in .env files commonly escape newlines as literal "\n".
  return raw.includes("\\n") ? raw.replace(/\\n/g, "\n") : raw;
}

/** True when the admin SDK should target the local emulator suite. */
function shouldUseEmulator(): boolean {
  const flag =
    process.env.FIREBASE_USE_EMULATOR ??
    process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR;
  return flag === "true" || flag === "1";
}

/** Builds admin app options from the service-account environment variables. */
function readAdminOptions(): AppOptions {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  const storageBucket =
    process.env.FIREBASE_ADMIN_STORAGE_BUCKET ??
    (projectId ? `${projectId}.appspot.com` : undefined);

  // When pointed at the emulators, the SDK does not require real credentials;
  // a project id is enough to route requests. The emulator host variables
  // (FIRESTORE_EMULATOR_HOST, FIREBASE_AUTH_EMULATOR_HOST,
  // FIREBASE_STORAGE_EMULATOR_HOST) are honored automatically by the SDK.
  if (shouldUseEmulator()) {
    return { projectId, storageBucket };
  }

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase Admin credentials. Set FIREBASE_ADMIN_PROJECT_ID, " +
        "FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY.",
    );
  }

  return {
    credential: cert({
      projectId,
      clientEmail,
      privateKey: normalizePrivateKey(privateKey),
    }),
    projectId,
    storageBucket,
  };
}

/**
 * Returns the singleton admin `App`, initializing it on first use and guarding
 * against duplicate initialization (named app so it never collides with any
 * default app another library might create).
 */
export function getAdminApp(): App {
  const existing = getApps().find((app) => app.name === ADMIN_APP_NAME);
  return existing ?? initializeApp(readAdminOptions(), ADMIN_APP_NAME);
}

let firestoreInstance: Firestore | undefined;
let authInstance: Auth | undefined;
let storageInstance: Storage | undefined;

/** Returns the admin Firestore handle for server-side reads (Req 24.1). */
export function getAdminFirestore(): Firestore {
  if (!firestoreInstance) {
    firestoreInstance = getFirestore(getAdminApp());
  }
  return firestoreInstance;
}

/** Returns the admin Auth handle for session verification (Req 32.4). */
export function getAdminAuth(): Auth {
  if (!authInstance) {
    authInstance = getAuth(getAdminApp());
  }
  return authInstance;
}

/** Returns the admin Storage handle. */
export function getAdminStorage(): Storage {
  if (!storageInstance) {
    storageInstance = getStorage(getAdminApp());
  }
  return storageInstance;
}
