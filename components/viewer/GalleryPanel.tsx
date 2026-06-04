"use client";
/**
 * GalleryPanel — slides up from bottom (70dvh) showing project media.
 * Supports images, videos, and YouTube thumbnails.
 * Tapping opens a fullscreen lightbox (yet-another-react-lightbox).
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Play } from "lucide-react";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import type { MediaItem, Project } from "@/lib/types";

function getYoutubeThumbnail(id: string): string {
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
}

function getMediaUrl(item: MediaItem, project: Project): string {
  if (item.type === "youtube" && item.youtubeId) return `https://www.youtube.com/watch?v=${item.youtubeId}`;
  return item.thumbnailUrl ?? "";
}

interface GalleryPanelProps {
  project: Project;
  onClose(): void;
}

export function GalleryPanel({ project, onClose }: GalleryPanelProps) {
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const gallery = project.gallery ?? [];

  const lightboxSlides = gallery.map((item) => {
    if (item.type === "youtube" && item.youtubeId) {
      return { src: getYoutubeThumbnail(item.youtubeId) };
    }
    return { src: item.thumbnailUrl ?? "" };
  });

  return (
    <AnimatePresence>
      <motion.div
        className="absolute bottom-0 left-0 right-0 z-30 glass-dark overflow-hidden"
        style={{ height: "70dvh", borderRadius: "20px 20px 0 0" }}
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        onDragEnd={(_, info) => { if (info.offset.y > 80) onClose(); }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <div className="drag-handle mx-0" />
          <h2
            className="text-base font-bold text-white"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Gallery
          </h2>
          <button type="button" onClick={onClose} className="icon-btn" aria-label="Close gallery">
            <X size={16} />
          </button>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "rgba(255,255,255,0.08)" }} />

        {/* Grid */}
        <div className="overflow-y-auto h-full pb-8 px-4 pt-4">
          {gallery.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <span className="text-4xl">🖼️</span>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                No gallery media added yet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {gallery.map((item, i) => {
                const thumb =
                  item.type === "youtube" && item.youtubeId
                    ? getYoutubeThumbnail(item.youtubeId)
                    : (item.thumbnailUrl ?? "");
                const isVideo = item.type === "video" || item.type === "youtube";
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setLightboxIndex(i)}
                    className="relative rounded-xl overflow-hidden aspect-square"
                    style={{ background: "var(--bg-card)" }}
                    aria-label={`Open ${item.type} ${i + 1}`}
                  >
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumb}
                        alt={`Gallery item ${i + 1}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-3xl">📷</span>
                      </div>
                    )}
                    {isVideo && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <div className="w-10 h-10 rounded-full bg-black/60 flex items-center justify-center">
                          <Play size={18} fill="white" color="white" />
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Lightbox */}
        {lightboxIndex >= 0 && (
          <Lightbox
            open={lightboxIndex >= 0}
            close={() => setLightboxIndex(-1)}
            index={lightboxIndex}
            slides={lightboxSlides}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}
