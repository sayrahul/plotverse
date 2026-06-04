/**
 * Unit tests for the GalleryManager's YouTube id normalization (Req 39.2).
 *
 * The component's I/O (Storage upload, Firestore persistence) is covered by the
 * storage client tests (`lib/firebase/storage.test.ts`) and the admin
 * integration tests (task 17.7); here we exercise the pure `parseYoutubeId`
 * helper that turns a user-entered id/URL into the bare video id stored on a
 * youtube MediaItem, including the validation/reject path.
 */

import { describe, expect, it } from "vitest";

import { parseYoutubeId } from "@/components/admin/gallery/GalleryManager";

describe("parseYoutubeId", () => {
  it("accepts a bare 11-character video id", () => {
    expect(parseYoutubeId("dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("trims surrounding whitespace before matching", () => {
    expect(parseYoutubeId("  dQw4w9WgXcQ  ")).toBe("dQw4w9WgXcQ");
  });

  it("extracts the id from a standard watch URL", () => {
    expect(
      parseYoutubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10s"),
    ).toBe("dQw4w9WgXcQ");
  });

  it("extracts the id from a youtu.be short link", () => {
    expect(parseYoutubeId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("extracts the id from an embed URL", () => {
    expect(
      parseYoutubeId("https://www.youtube.com/embed/dQw4w9WgXcQ"),
    ).toBe("dQw4w9WgXcQ");
  });

  it("extracts the id from a shorts URL", () => {
    expect(
      parseYoutubeId("https://www.youtube.com/shorts/dQw4w9WgXcQ"),
    ).toBe("dQw4w9WgXcQ");
  });

  it("returns null for empty or whitespace-only input", () => {
    expect(parseYoutubeId("")).toBeNull();
    expect(parseYoutubeId("   ")).toBeNull();
  });

  it("returns null when no valid id can be extracted", () => {
    expect(parseYoutubeId("not a youtube link")).toBeNull();
    expect(parseYoutubeId("https://example.com/watch?v=short")).toBeNull();
  });
});
