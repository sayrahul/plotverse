/**
 * Firestore typed converter scaffolding.
 *
 * Provides generic `FirestoreDataConverter` factories and typed collection /
 * document reference helpers so the data-access layer reads and writes the
 * domain models from `lib/types.ts` without scattering `as` casts. Both the
 * client modular SDK and the `firebase-admin` SDK are supported because the
 * viewer (client) and server (RSC / middleware) both touch Firestore (Req 24.1,
 * 32.4). Each `Project` document id equals its `Project_ID` (Req 2.2).
 *
 * The converters intentionally store the domain object as-is (minus any
 * client-managed `id` field, which is carried by the document id). Specialized
 * field-level transforms (e.g. server timestamps) can be layered on later by
 * the repositories that build on this scaffolding.
 *
 * Requirements: 2.2, 24.1, 32.4
 */

import {
  collection as clientCollection,
  doc as clientDoc,
  type CollectionReference,
  type DocumentData,
  type DocumentReference,
  type Firestore as ClientFirestore,
  type FirestoreDataConverter as ClientConverter,
  type QueryDocumentSnapshot,
  type SnapshotOptions,
} from "firebase/firestore";
import type {
  CollectionReference as AdminCollectionReference,
  DocumentReference as AdminDocumentReference,
  Firestore as AdminFirestore,
  FirestoreDataConverter as AdminConverter,
  QueryDocumentSnapshot as AdminQueryDocumentSnapshot,
} from "firebase-admin/firestore";

import type {
  Lead,
  Plot,
  Project,
  StatusGroup,
  Zone,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// Collection paths
// ---------------------------------------------------------------------------

/**
 * Canonical Firestore collection paths. Subcollections are expressed as
 * functions of their parent `projectId` so callers cannot mistype the path.
 * Mirrors the data model in design.md.
 */
export const collectionPaths = {
  projects: "projects",
  leads: "leads",
  adminUsers: "adminUsers",
  plots: (projectId: string) => `projects/${projectId}/plots`,
  zones: (projectId: string) => `projects/${projectId}/zones`,
  statusGroups: (projectId: string) => `projects/${projectId}/statusGroups`,
} as const;

// ---------------------------------------------------------------------------
// Generic converter factories
// ---------------------------------------------------------------------------

/**
 * Strips the `id` property from a domain object before it is written, since the
 * id is carried by the Firestore document id rather than a stored field.
 */
function stripId<T extends { id?: unknown }>(value: T): DocumentData {
  const { id: _id, ...rest } = value;
  void _id;
  return rest as DocumentData;
}

/**
 * Builds a client-SDK `FirestoreDataConverter` for a domain model `T` that owns
 * a string `id`. On read, the document id is merged back onto the object.
 */
export function createClientConverter<T extends { id: string }>(): ClientConverter<T> {
  return {
    toFirestore(model: T): DocumentData {
      return stripId(model);
    },
    fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): T {
      const data = snapshot.data(options) as Omit<T, "id">;
      return { ...(data as object), id: snapshot.id } as T;
    },
  };
}

/**
 * Builds an admin-SDK `FirestoreDataConverter` for a domain model `T` that owns
 * a string `id`. On read, the document id is merged back onto the object.
 */
export function createAdminConverter<T extends { id: string }>(): AdminConverter<T> {
  return {
    toFirestore(model: T): DocumentData {
      return stripId(model);
    },
    fromFirestore(snapshot: AdminQueryDocumentSnapshot): T {
      const data = snapshot.data() as Omit<T, "id">;
      return { ...(data as object), id: snapshot.id } as T;
    },
  };
}

// ---------------------------------------------------------------------------
// Per-model converters (shared shape; one instance per SDK + model)
// ---------------------------------------------------------------------------

export const clientConverters = {
  project: createClientConverter<Project>(),
  plot: createClientConverter<Plot>(),
  zone: createClientConverter<Zone>(),
  statusGroup: createClientConverter<StatusGroup>(),
  lead: createClientConverter<Lead>(),
};

export const adminConverters = {
  project: createAdminConverter<Project>(),
  plot: createAdminConverter<Plot>(),
  zone: createAdminConverter<Zone>(),
  statusGroup: createAdminConverter<StatusGroup>(),
  lead: createAdminConverter<Lead>(),
};

// ---------------------------------------------------------------------------
// Typed reference helpers (client SDK)
// ---------------------------------------------------------------------------

export function projectsCollection(db: ClientFirestore): CollectionReference<Project> {
  return clientCollection(db, collectionPaths.projects).withConverter(
    clientConverters.project,
  );
}

export function projectDoc(db: ClientFirestore, projectId: string): DocumentReference<Project> {
  return clientDoc(db, collectionPaths.projects, projectId).withConverter(
    clientConverters.project,
  );
}

export function plotsCollection(
  db: ClientFirestore,
  projectId: string,
): CollectionReference<Plot> {
  return clientCollection(db, collectionPaths.plots(projectId)).withConverter(
    clientConverters.plot,
  );
}

export function zonesCollection(
  db: ClientFirestore,
  projectId: string,
): CollectionReference<Zone> {
  return clientCollection(db, collectionPaths.zones(projectId)).withConverter(
    clientConverters.zone,
  );
}

export function statusGroupsCollection(
  db: ClientFirestore,
  projectId: string,
): CollectionReference<StatusGroup> {
  return clientCollection(db, collectionPaths.statusGroups(projectId)).withConverter(
    clientConverters.statusGroup,
  );
}

export function leadsCollection(db: ClientFirestore): CollectionReference<Lead> {
  return clientCollection(db, collectionPaths.leads).withConverter(clientConverters.lead);
}

// ---------------------------------------------------------------------------
// Typed reference helpers (admin SDK)
// ---------------------------------------------------------------------------

export function adminProjectsCollection(
  db: AdminFirestore,
): AdminCollectionReference<Project> {
  return db.collection(collectionPaths.projects).withConverter(adminConverters.project);
}

export function adminProjectDoc(
  db: AdminFirestore,
  projectId: string,
): AdminDocumentReference<Project> {
  return db.doc(`${collectionPaths.projects}/${projectId}`).withConverter(
    adminConverters.project,
  );
}

export function adminPlotsCollection(
  db: AdminFirestore,
  projectId: string,
): AdminCollectionReference<Plot> {
  return db.collection(collectionPaths.plots(projectId)).withConverter(adminConverters.plot);
}

export function adminLeadsCollection(db: AdminFirestore): AdminCollectionReference<Lead> {
  return db.collection(collectionPaths.leads).withConverter(adminConverters.lead);
}
