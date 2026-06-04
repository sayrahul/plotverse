"use client";
/**
 * useProject — subscribes to a single project document for live updates.
 * Falls back to the server-loaded `initialProject` seed until the first
 * snapshot arrives so the UI is never blank.
 */
import { useEffect, useState } from "react";
import { onSnapshot, doc } from "firebase/firestore";
import { getClientFirestore } from "@/lib/firebase/client";
import { projectsCollection } from "@/lib/firebase/converters";
import type { Project } from "@/lib/types";

export function useProject(
  projectId: string,
  initialProject: Project,
): Project {
  const [project, setProject] = useState<Project>(initialProject);

  useEffect(() => {
    const db  = getClientFirestore();
    const ref = doc(projectsCollection(db), projectId);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setProject(snap.data());
      }
    });
    return unsub;
  }, [projectId]);

  return project;
}
