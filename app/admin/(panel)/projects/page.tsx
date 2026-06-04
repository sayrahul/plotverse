// Projects management section (Req 33.1, 33.2). Renders the ProjectsManager,
// which lists projects and persists create/update/delete to the projects
// collection (Req 2.1, 2.2, 33.2).
import { ProjectsManager } from "@/components/admin/projects/ProjectsManager";

export default function ProjectsPage() {
  return <ProjectsManager />;
}
