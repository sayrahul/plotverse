// Gallery management section (Req 33.1, 39). Renders the GalleryManager, which
// owns project selection, media upload to Storage, YouTube references, and
// media removal — persisting each change to the project's gallery.
import { GalleryManager } from "@/components/admin/gallery/GalleryManager";

export default function GalleryPage() {
  return <GalleryManager />;
}
