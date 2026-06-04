import { Suspense } from "react";
import { ProjectViewer } from "@/components/viewer/ProjectViewer";

export default function HomePage() {
  return (
    <Suspense fallback={<div style={{ width: "100%", height: "100%", background: "#000" }} />}>
      <ProjectViewer projectId="single" initialProject={null as any} />
    </Suspense>
  );
}
