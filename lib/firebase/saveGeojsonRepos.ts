/**
 * Concrete {@link SaveGeoJSONRepos} wiring for the File_Converter (task 17.4).
 *
 * `lib/firebase/storage.ts` deliberately left the Firestore/derivation side of
 * a GeoJSON save behind the {@link SaveGeoJSONRepos} seam so the Storage module
 * stays decoupled from the repositories (task 12.1) and the converter's plot
 * derivation (task 12.3). This module supplies the real implementation, wiring:
 *
 * - `loadHistory`        → {@link projectRepo.get} (reads `geojsonHistory`).
 * - `featuresToPlots`    → the pure {@link featuresToPlots} derivation.
 * - `upsertPlots`        → {@link plotRepo.upsertMany}.
 * - `saveProjectVersion` → {@link projectRepo.update}.
 *
 * Keeping this wiring in one tiny module lets the FileConverterPanel build a
 * ready-to-use seam with a single call, and keeps the I/O dependencies out of
 * the otherwise-pure derivation code.
 *
 * Requirements: 35.1, 35.2
 */

import { featuresToPlots } from "@/lib/converter/featuresToPlots";
import { plotRepo, projectRepo } from "@/lib/firebase/repos";
import type { SaveGeoJSONRepos } from "@/lib/firebase/storage";

/**
 * Builds the {@link SaveGeoJSONRepos} seam backed by the live Firestore
 * repositories and the pure {@link featuresToPlots} derivation, for use with
 * {@link import("@/lib/firebase/storage").storageClient.saveGeoJSON}.
 */
export function createSaveGeoJSONRepos(): SaveGeoJSONRepos {
  return {
    async loadHistory(projectId) {
      const project = await projectRepo.get(projectId);
      return project?.geojsonHistory ?? [];
    },
    featuresToPlots(projectId, fc) {
      return featuresToPlots(projectId, fc);
    },
    async upsertPlots(projectId, plots) {
      await plotRepo.upsertMany(projectId, plots);
    },
    async saveProjectVersion(projectId, patch) {
      await projectRepo.update(projectId, patch);
    },
  };
}
