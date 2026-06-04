/**
 * Real-time Firestore subscription helpers (Project_Viewer live inventory).
 *
 * Thin wrappers over the modular client SDK's `onSnapshot` that subscribe to a
 * project's `plots`, `zones`, and `statusGroups` subcollections and deliver the
 * full, freshly-mapped domain array to the caller on every snapshot (Req 24.1).
 * The typed converters in `lib/firebase/converters.ts` merge each document id
 * back onto the domain object, so callers always receive fully-formed
 * {@link Plot}, {@link Zone}, and {@link StatusGroup} values.
 *
 * Error handling is non-blocking: a listener error is never thrown to the
 * caller. Instead the optional `onError` callback is invoked (its own throws
 * are swallowed) and the error is logged, after which the subscription is
 * automatically re-established on an exponential backoff. A successful snapshot
 * resets the backoff. The returned {@link Unsubscribe} tears down the active
 * listener and cancels any pending retry, so it is always safe to call.
 *
 * Requirements: 24.1
 */

import {
  onSnapshot,
  type CollectionReference,
  type FirestoreError,
  type QuerySnapshot,
  type Unsubscribe,
} from "firebase/firestore";

import { getClientFirestore } from "@/lib/firebase/client";
import {
  plotsCollection,
  statusGroupsCollection,
  zonesCollection,
} from "@/lib/firebase/converters";
import type { Plot, StatusGroup, Zone } from "@/lib/types";

// ---------------------------------------------------------------------------
// Retry policy
// ---------------------------------------------------------------------------

/** Delay before the first reconnection attempt after a listener error (ms). */
const INITIAL_RETRY_DELAY_MS = 1_000;

/** Upper bound on the exponential backoff between reconnection attempts (ms). */
const MAX_RETRY_DELAY_MS = 30_000;

/** Callback invoked with the full domain array on every snapshot. */
export type SnapshotHandler<T> = (items: T[]) => void;

/** Optional, non-blocking listener-error callback. */
export type SubscriptionErrorHandler = (error: FirestoreError) => void;

// ---------------------------------------------------------------------------
// Generic subscription with non-blocking errors + auto-retry
// ---------------------------------------------------------------------------

/**
 * Subscribes to a typed collection, delivering the full mapped array on each
 * snapshot. Listener errors are reported (never thrown) and the subscription is
 * automatically retried on an exponential backoff that resets after a healthy
 * snapshot. The collection reference is resolved lazily via `getRef` on every
 * (re)connect so a transient Firestore handle is never captured stale.
 *
 * @param getRef Resolves the typed collection reference to listen on.
 * @param onData Receives the full domain array for each snapshot.
 * @param onError Optional non-blocking error callback.
 * @returns An unsubscribe function that also cancels any pending retry.
 */
function subscribeCollection<T>(
  getRef: () => CollectionReference<T>,
  onData: SnapshotHandler<T>,
  onError?: SubscriptionErrorHandler,
): Unsubscribe {
  let cancelled = false;
  let firestoreUnsubscribe: Unsubscribe | undefined;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let retryDelay = INITIAL_RETRY_DELAY_MS;

  const scheduleRetry = (): void => {
    if (cancelled || retryTimer !== undefined) {
      return;
    }
    const delay = retryDelay;
    retryDelay = Math.min(retryDelay * 2, MAX_RETRY_DELAY_MS);
    retryTimer = setTimeout(() => {
      retryTimer = undefined;
      start();
    }, delay);
  };

  const start = (): void => {
    if (cancelled) {
      return;
    }
    firestoreUnsubscribe = onSnapshot(
      getRef(),
      (snapshot: QuerySnapshot<T>) => {
        // A healthy snapshot resets the backoff window.
        retryDelay = INITIAL_RETRY_DELAY_MS;
        onData(snapshot.docs.map((d) => d.data()));
      },
      (error: FirestoreError) => {
        // The SDK tears down the failed listener on error; drop our handle so
        // we never double-unsubscribe.
        firestoreUnsubscribe = undefined;
        // Non-blocking: surface the error without throwing to the caller, and
        // never let a listener throw disrupt retry scheduling.
        if (onError) {
          try {
            onError(error);
          } catch {
            // Intentionally ignored — caller callbacks must not break retries.
          }
        }
        console.error(
          "[subscriptions] snapshot listener error; scheduling retry",
          error,
        );
        scheduleRetry();
      },
    );
  };

  start();

  return () => {
    cancelled = true;
    if (retryTimer !== undefined) {
      clearTimeout(retryTimer);
      retryTimer = undefined;
    }
    if (firestoreUnsubscribe) {
      firestoreUnsubscribe();
      firestoreUnsubscribe = undefined;
    }
  };
}

// ---------------------------------------------------------------------------
// Public subscription helpers (Req 24.1)
// ---------------------------------------------------------------------------

/**
 * Subscribes to real-time updates of a project's plots (Req 24.1). The handler
 * receives the complete plot inventory on every change so derived UI (map
 * source, status counts) can re-derive from a single source of truth.
 *
 * @param projectId The owning Project_ID.
 * @param onData Receives the full {@link Plot} array on each snapshot.
 * @param onError Optional non-blocking error callback.
 * @returns An unsubscribe function that also cancels any pending retry.
 */
export function subscribePlots(
  projectId: string,
  onData: SnapshotHandler<Plot>,
  onError?: SubscriptionErrorHandler,
): Unsubscribe {
  return subscribeCollection<Plot>(
    () => plotsCollection(getClientFirestore(), projectId),
    onData,
    onError,
  );
}

/**
 * Subscribes to real-time updates of a project's zones (Req 24.1).
 *
 * @param projectId The owning Project_ID.
 * @param onData Receives the full {@link Zone} array on each snapshot.
 * @param onError Optional non-blocking error callback.
 * @returns An unsubscribe function that also cancels any pending retry.
 */
export function subscribeZones(
  projectId: string,
  onData: SnapshotHandler<Zone>,
  onError?: SubscriptionErrorHandler,
): Unsubscribe {
  return subscribeCollection<Zone>(
    () => zonesCollection(getClientFirestore(), projectId),
    onData,
    onError,
  );
}

/**
 * Subscribes to real-time updates of a project's status groups (Req 24.1).
 *
 * @param projectId The owning Project_ID.
 * @param onData Receives the full {@link StatusGroup} array on each snapshot.
 * @param onError Optional non-blocking error callback.
 * @returns An unsubscribe function that also cancels any pending retry.
 */
export function subscribeStatusGroups(
  projectId: string,
  onData: SnapshotHandler<StatusGroup>,
  onError?: SubscriptionErrorHandler,
): Unsubscribe {
  return subscribeCollection<StatusGroup>(
    () => statusGroupsCollection(getClientFirestore(), projectId),
    onData,
    onError,
  );
}
