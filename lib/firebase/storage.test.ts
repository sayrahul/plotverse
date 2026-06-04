/**
 * Unit tests for the Firebase Storage client (`lib/firebase/storage.ts`).
 *
 * These tests mock the modular `firebase/storage` SDK and the client app
 * singleton so the upload/list/download/save logic is exercised in isolation
 * (no emulator, no network). Emulator-backed integration coverage lives in task
 * 12.5.
 *
 * Requirements: 35.1, 36.2, 39.1
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import { serializeGeoJSON } from "@/lib/converter/serialize";
import { GeoJSON } from "@/lib/geojson";
import type { GeojsonVersion, Plot } from "@/lib/types";

// --- SDK + client mocks -----------------------------------------------------

const uploadStringMock = vi.fn();
const uploadBytesMock = vi.fn();
const getDownloadURLMock = vi.fn();
const getMetadataMock = vi.fn();
const listAllMock = vi.fn();

// `ref` returns a lightweight stand-in carrying the resolved path so assertions
// can read it back; `name`/`fullPath` mirror the SDK's StorageReference shape.
function makeRef(path: string) {
  const segments = path.split("/");
  return { fullPath: path, name: segments[segments.length - 1] };
}

vi.mock("firebase/storage", () => ({
  ref: (_storage: unknown, path: string) => makeRef(path),
  uploadString: (...args: unknown[]) => uploadStringMock(...args),
  uploadBytes: (...args: unknown[]) => uploadBytesMock(...args),
  getDownloadURL: (...args: unknown[]) => getDownloadURLMock(...args),
  getMetadata: (...args: unknown[]) => getMetadataMock(...args),
  listAll: (...args: unknown[]) => listAllMock(...args),
}));

const fakeStorage = { __brand: "fake-storage" } as unknown;

vi.mock("@/lib/firebase/client", () => ({
  getClientStorage: () => fakeStorage,
}));

// Import after mocks are registered.
import { storageClient, storagePaths, type SaveGeoJSONRepos } from "@/lib/firebase/storage";

// --- Fixtures ---------------------------------------------------------------

function sampleFc(): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        id: "P1",
        properties: { id: "P1", number: "1", status: "available" },
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [77.0, 12.0],
              [77.001, 12.0],
              [77.001, 12.001],
              [77.0, 12.001],
              [77.0, 12.0],
            ],
          ],
        },
      },
    ],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  uploadStringMock.mockResolvedValue(undefined);
  uploadBytesMock.mockResolvedValue(undefined);
  getDownloadURLMock.mockResolvedValue("https://example.com/download");
  listAllMock.mockResolvedValue({ items: [], prefixes: [] });
});

// --- storagePaths -----------------------------------------------------------

describe("storagePaths", () => {
  it("derives versioned geojson and media paths under the project", () => {
    expect(storagePaths.geojsonDir("abc12")).toBe("projects/abc12/geojson");
    expect(storagePaths.geojsonVersion("abc12", 1700)).toBe(
      "projects/abc12/geojson/1700.geojson",
    );
    expect(storagePaths.mediaDir("abc12")).toBe("projects/abc12/media");
    expect(storagePaths.media("abc12", 1700, "Front View.jpg")).toBe(
      "projects/abc12/media/1700-Front_View.jpg",
    );
  });
});

// --- uploadGeoJSON ----------------------------------------------------------

describe("storageClient.uploadGeoJSON", () => {
  it("uploads deterministic serialized content to a versioned path and returns the version", async () => {
    const fc = sampleFc();
    const version = await storageClient.uploadGeoJSON("abc12", fc, "admin@x.io", {
      savedAt: 1700,
    });

    expect(version).toEqual<GeojsonVersion>({
      storagePath: "projects/abc12/geojson/1700.geojson",
      savedAt: 1700,
      savedBy: "admin@x.io",
    });

    expect(uploadStringMock).toHaveBeenCalledTimes(1);
    const [objectRef, content, format, metadata] = uploadStringMock.mock.calls[0]!;
    expect(objectRef).toMatchObject({ fullPath: "projects/abc12/geojson/1700.geojson" });
    expect(content).toBe(serializeGeoJSON(fc));
    expect(format).toBe("raw");
    expect(metadata).toMatchObject({
      contentType: "application/geo+json",
      customMetadata: { savedBy: "admin@x.io", savedAt: "1700" },
    });
  });
});

// --- uploadMedia ------------------------------------------------------------

describe("storageClient.uploadMedia", () => {
  it("uploads a media blob to a timestamped, sanitized path and returns it", async () => {
    const file = new File([new Uint8Array([1, 2, 3])], "My Photo!.png", {
      type: "image/png",
    });

    const path = await storageClient.uploadMedia("abc12", file, { savedAt: 42 });

    expect(path).toBe("projects/abc12/media/42-My_Photo_.png");
    expect(uploadBytesMock).toHaveBeenCalledTimes(1);
    const [objectRef, blob, metadata] = uploadBytesMock.mock.calls[0]!;
    expect(objectRef).toMatchObject({ fullPath: path });
    expect(blob).toBe(file);
    expect(metadata).toEqual({ contentType: "image/png" });
  });
});

// --- getDownloadUrl ---------------------------------------------------------

describe("storageClient.getDownloadUrl", () => {
  it("resolves the download URL for a storage path", async () => {
    getDownloadURLMock.mockResolvedValue("https://cdn.example.com/file.geojson");
    const url = await storageClient.getDownloadUrl("projects/abc12/geojson/1.geojson");

    expect(url).toBe("https://cdn.example.com/file.geojson");
    const [objectRef] = getDownloadURLMock.mock.calls[0]!;
    expect(objectRef).toMatchObject({ fullPath: "projects/abc12/geojson/1.geojson" });
  });
});

// --- listVersions -----------------------------------------------------------

describe("storageClient.listVersions", () => {
  it("reconstructs versions from metadata, sorted oldest-first", async () => {
    listAllMock.mockResolvedValue({
      items: [
        makeRef("projects/abc12/geojson/300.geojson"),
        makeRef("projects/abc12/geojson/100.geojson"),
        makeRef("projects/abc12/geojson/200.geojson"),
      ],
      prefixes: [],
    });
    getMetadataMock.mockImplementation((item: { name: string }) => {
      const savedAt = item.name.replace(".geojson", "");
      return Promise.resolve({
        customMetadata: { savedAt, savedBy: `user-${savedAt}` },
      });
    });

    const versions = await storageClient.listVersions("abc12");

    expect(versions.map((v) => v.savedAt)).toEqual([100, 200, 300]);
    expect(versions[0]).toEqual<GeojsonVersion>({
      storagePath: "projects/abc12/geojson/100.geojson",
      savedAt: 100,
      savedBy: "user-100",
    });
  });

  it("falls back to the timestamp in the name when metadata is unavailable", async () => {
    listAllMock.mockResolvedValue({
      items: [makeRef("projects/abc12/geojson/555.geojson")],
      prefixes: [],
    });
    getMetadataMock.mockRejectedValue(new Error("permission denied"));

    const versions = await storageClient.listVersions("abc12");

    expect(versions).toEqual<GeojsonVersion[]>([
      { storagePath: "projects/abc12/geojson/555.geojson", savedAt: 555, savedBy: "" },
    ]);
  });
});

// --- saveGeoJSON (coordination seam) ---------------------------------------

describe("storageClient.saveGeoJSON", () => {
  function plot(id: string): Plot {
    const geometry = sampleFc().features[0]!.geometry as GeoJSON.Polygon;
    return {
      id,
      projectId: "abc12",
      number: id,
      status: "available",
      geometry,
      areaSqm: 100,
      centroid: [77.0005, 12.0005],
    };
  }

  it("uploads, upserts plots, and appends a trimmed history version", async () => {
    const order: string[] = [];
    const derivedPlots = [plot("P1")];
    const existingHistory: GeojsonVersion[] = [
      { storagePath: "projects/abc12/geojson/1.geojson", savedAt: 1, savedBy: "old" },
    ];

    const repos: SaveGeoJSONRepos = {
      loadHistory: vi.fn(async () => {
        order.push("loadHistory");
        return existingHistory;
      }),
      featuresToPlots: vi.fn(async () => {
        order.push("featuresToPlots");
        return derivedPlots;
      }),
      upsertPlots: vi.fn(async () => {
        order.push("upsertPlots");
      }),
      saveProjectVersion: vi.fn(async () => {
        order.push("saveProjectVersion");
      }),
    };

    const result = await storageClient.saveGeoJSON("abc12", sampleFc(), "admin", repos, {
      savedAt: 2000,
    });

    // Upload happens before the Firestore writes.
    expect(order[0]).toBe("featuresToPlots");
    expect(uploadStringMock).toHaveBeenCalledTimes(1);
    expect(order).toEqual([
      "featuresToPlots",
      "upsertPlots",
      "loadHistory",
      "saveProjectVersion",
    ]);

    expect(result.version.storagePath).toBe("projects/abc12/geojson/2000.geojson");
    expect(result.plots).toBe(derivedPlots);
    expect(result.history).toEqual([
      existingHistory[0],
      result.version,
    ]);

    expect(repos.upsertPlots).toHaveBeenCalledWith("abc12", derivedPlots);
    expect(repos.saveProjectVersion).toHaveBeenCalledWith("abc12", {
      geojsonStoragePath: "projects/abc12/geojson/2000.geojson",
      geojsonHistory: result.history,
    });
  });

  it("trims the persisted history to the most recent 5 versions", async () => {
    const existingHistory: GeojsonVersion[] = [10, 20, 30, 40, 50].map((t) => ({
      storagePath: `projects/abc12/geojson/${t}.geojson`,
      savedAt: t,
      savedBy: "old",
    }));

    const repos: SaveGeoJSONRepos = {
      loadHistory: vi.fn(async () => existingHistory),
      featuresToPlots: vi.fn(async () => []),
      upsertPlots: vi.fn(async () => {}),
      saveProjectVersion: vi.fn(async () => {}),
    };

    const result = await storageClient.saveGeoJSON("abc12", sampleFc(), "admin", repos, {
      savedAt: 60,
    });

    expect(result.history).toHaveLength(5);
    expect(result.history.map((v) => v.savedAt)).toEqual([20, 30, 40, 50, 60]);
  });
});
