// Plots management section (Req 33.1, 33.3, 37.3). Renders the PlotsManager
// (task 17.3), which lets an Admin_User edit plot fields — status, price,
// facing, zone assignment, and custom label — for a selected project.
import { PlotsManager } from "@/components/admin/plots/PlotsManager";

export default function PlotsPage() {
  return <PlotsManager />;
}
