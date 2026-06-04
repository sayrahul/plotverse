"use client";
import { useEffect, useState } from "react";
import type { Project } from "@/lib/types";

export function useProject(
  projectId: string,
  initialProject: Project | null,
): Project | null {
  const [project, setProject] = useState<Project | null>(initialProject);

  useEffect(() => {
    fetch("/data/plot-data.json")
      .then((res) => res.json())
      .then((data) => {
        if (data.project) {
          setProject(data.project);
        }
      })
      .catch((err) => {
        console.error("Failed to load project data", err);
      });
  }, [projectId]);

  return project;
}
