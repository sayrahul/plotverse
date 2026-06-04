// Zones management section (Req 33.1, 37.1). Renders the ZonesManager
// (task 17.3), which provides create/edit/delete over a project's zones.
import { ZonesManager } from "@/components/admin/zones/ZonesManager";

export default function ZonesPage() {
  return <ZonesManager />;
}
