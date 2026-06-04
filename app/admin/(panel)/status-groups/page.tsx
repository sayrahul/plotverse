// Status Groups management section (Req 33.1, 13.1, 37.2). Renders the
// StatusGroupsManager (task 17.3), which provides create/edit/delete over a
// project's status-group presets.
import { StatusGroupsManager } from "@/components/admin/status-groups/StatusGroupsManager";

export default function StatusGroupsPage() {
  return <StatusGroupsManager />;
}
