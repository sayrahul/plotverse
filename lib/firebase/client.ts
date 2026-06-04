/**
 * Client-side Firebase initialization (browser / React client components).
 *
 * Uses the Firebase modular SDK (v10+). The app is initialized lazily and
 * guarded against re-initialization so that Next.js Fast Refresh and multiple
 * imports reuse a single `FirebaseApp` instance. Exposes Firestore, Auth, and
 * Storage handles for the data-access layer and real-time subscriptions
 * (Req 24.1).
 *
 * Configuration is read from `NEXT_PUBLIC_FIREBASE_*` environment variables so
 * the values are inlined into the client bundle at build time. When
 * `NEXT_PUBLIC_USE_FIREBASE_EMULATOR` is truthy, the handles connect to the
 * local Firebase Emulator Suite (ports mirror `firebase.json`).
 *
 * Requirements: 2.2, 24.1, 32.4
 */

import {
  getApp,
  getApps,
  initializeApp,
  type FirebaseApp,
  type FirebaseOptions,
} from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import {
  connectFirestoreEmulator,
  getFirestore,
  type Firestore,
} from "firebase/firestore";
import {
  connectStorageEmulator,
  getStorage,
  type FirebaseStorage,
} from "firebase/storage";

/** Reads the public Firebase web config from the environment. */
function readClientConfig(): FirebaseOptions {
  const config: FirebaseOptions = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  const measurementId = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;
  if (measurementId) {
    config.measurementId = measurementId;
  }

  return config;
}

/** True when the client should connect to the local emulator suite. */
function useEmulator(): boolean {
  const flag = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR;
  return flag === "true" || flag === "1";
}

/**
 * Returns the singleton client `FirebaseApp`, initializing it on first use and
 * guarding against duplicate initialization.
 */
export function getClientApp(): FirebaseApp {
  return getApps().length ? getApp() : initializeApp(readClientConfig());
}

// Module-level singletons so each SDK handle is created (and wired to the
// emulator) exactly once.
let firestoreInstance: Firestore | undefined;
let authInstance: Auth | undefined;
let storageInstance: FirebaseStorage | undefined;

/** Returns the Firestore handle for the client app (Req 24.1). */
export function getClientFirestore(): Firestore {
  if (!firestoreInstance) {
    const db = getFirestore(getClientApp());
    if (useEmulator()) {
      const host = emulatorHost();
      connectFirestoreEmulator(db, host, 8080);
    }
    firestoreInstance = db;
  }
  return firestoreInstance;
}

/** Returns the Auth handle for the client app (Req 32.4). */
export function getClientAuth(): Auth {
  if (!authInstance) {
    const auth = getAuth(getClientApp());
    if (useEmulator()) {
      const host = emulatorHost();
      connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
    }
    authInstance = auth;
  }
  return authInstance;
}

/** Returns the Storage handle for the client app. */
export function getClientStorage(): FirebaseStorage {
  if (!storageInstance) {
    const storage = getStorage(getClientApp());
    if (useEmulator()) {
      const host = emulatorHost();
      connectStorageEmulator(storage, host, 9199);
    }
    storageInstance = storage;
  }
  return storageInstance;
}

/** Resolves the emulator host, defaulting to loopback. */
function emulatorHost(): string {
  return process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST ?? "127.0.0.1";
}
