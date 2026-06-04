"use client";
/**
 * ProjectInfoPanel — slides up from bottom (80dvh).
 * Shows project logo, name, developer, stats, description, QR code, social links.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin, MessageCircle, Camera, Share2, Download } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import type { Project } from "@/lib/types";
import type { PlotCounts } from "@/hooks/usePlots";

const APP_DOMAIN =
  process.env.NEXT_PUBLIC_APP_DOMAIN ?? "https://yourdomain.com";

interface ProjectInfoPanelProps {
  project: Project;
  counts:  PlotCounts;
  onClose(): void;
}

function openDirections(lat: number, lng: number) {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const url = isIOS
    ? `maps://maps.apple.com/?daddr=${lat},${lng}`
    : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  window.open(url, "_blank");
}

function downloadQR(projectId: string) {
  const svg = document.getElementById("project-qr-code");
  if (!svg) return;
  const serializer = new XMLSerializer();
  const svgStr = serializer.serializeToString(svg);
  const canvas = document.createElement("canvas");
  canvas.width = 512; canvas.height = 512;
  const img = new Image();
  const blob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  img.onload = () => {
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, 512, 512);
    ctx.drawImage(img, 0, 0, 512, 512);
    URL.revokeObjectURL(url);
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `plotverse-${projectId}-qr.png`;
    a.click();
  };
  img.src = url;
}

const STATUS_LABELS = [
  { key: "available" as const, label: "Available", color: "var(--color-available)" },
  { key: "sold"      as const, label: "Sold",      color: "var(--color-sold)"      },
  { key: "reserved"  as const, label: "Reserved",  color: "var(--color-reserved)"  },
  { key: "blocked"   as const, label: "Blocked",   color: "var(--color-blocked)"   },
];

export function ProjectInfoPanel({ project, counts, onClose }: ProjectInfoPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const projectUrl = `${APP_DOMAIN}/${project.id}`;
  const [lng, lat]  = project.center as [number, number];

  async function handleShare() {
    try {
      if (navigator.share) {
        await navigator.share({ title: project.name, url: projectUrl });
      } else {
        await navigator.clipboard.writeText(projectUrl);
        // toast shown by parent
      }
    } catch { /* user cancelled */ }
  }

  const desc = project.description ?? "";
  const descShort = desc.length > 180 ? desc.slice(0, 180) + "…" : desc;

  return (
    <AnimatePresence>
      <motion.div
        className="absolute bottom-0 left-0 right-0 z-30 glass-dark overflow-hidden"
        style={{ height: "80dvh", borderRadius: "20px 20px 0 0" }}
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
            Project Info
          </h2>
          <button type="button" onClick={onClose} className="icon-btn" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div style={{ height: 1, background: "rgba(255,255,255,0.08)" }} />

        {/* Scrollable content */}
        <div className="overflow-y-auto h-full pb-16 px-5 pt-4 space-y-5">
          {/* Project header */}
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-2xl shrink-0"
              style={{ background: "rgba(255,255,255,0.08)" }}
            >
              🏗️
            </div>
            <div className="min-w-0">
              <h3
                className="text-lg font-bold text-white truncate"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {project.name}
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <MapPin size={12} color="var(--text-secondary)" />
                <span className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>
                  {/* Location not in current Project type — use coordinates */}
                  {lat.toFixed(4)}, {lng.toFixed(4)}
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          {desc && (
            <div>
              <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.75)" }}>
                {expanded ? desc : descShort}
              </p>
              {desc.length > 180 && (
                <button
                  type="button"
                  onClick={() => setExpanded((e) => !e)}
                  className="text-xs mt-1 font-semibold"
                  style={{ color: "var(--color-available)" }}
                >
                  {expanded ? "Show less" : "Read more"}
                </button>
              )}
            </div>
          )}

          {/* Live stats */}
          <div
            className="rounded-2xl p-4"
            style={{ background: "rgba(255,255,255,0.05)" }}
          >
            <div className="flex justify-between mb-3">
              <span className="text-xs font-semibold text-white/60 uppercase tracking-wide">Live Inventory</span>
              <span className="text-sm font-bold text-white">{counts.total} plots</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {STATUS_LABELS.map(({ key, label, color }) => (
                <div key={key} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                    <span className="text-xs text-white/70">{label}</span>
                  </div>
                  <span className="text-sm font-semibold text-white">{counts[key]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Social + share buttons */}
          <div className="grid grid-cols-3 gap-3">
            {project.contactPhone && (
              <a
                href={`https://wa.me/${project.contactPhone}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-1.5 py-3 rounded-2xl text-xs font-semibold"
                style={{ background: "rgba(37,211,102,0.15)", color: "var(--color-whatsapp)" }}
              >
                <MessageCircle size={20} />
                WhatsApp
              </a>
            )}
            {project.socialLinks?.["instagram"] && (
              <a
                href={project.socialLinks["instagram"]}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-1.5 py-3 rounded-2xl text-xs font-semibold"
                style={{ background: "rgba(225,48,108,0.15)", color: "var(--color-instagram)" }}
              >
                <Camera size={20} />
                Instagram
              </a>
            )}
            <button
              type="button"
              onClick={handleShare}
              className="flex flex-col items-center gap-1.5 py-3 rounded-2xl text-xs font-semibold"
              style={{ background: "rgba(59,130,246,0.15)", color: "var(--color-blue)" }}
            >
              <Share2 size={20} />
              Share
            </button>
          </div>

          {/* QR code */}
          <div
            className="rounded-2xl p-5 flex flex-col items-center gap-4"
            style={{ background: "rgba(255,255,255,0.05)" }}
          >
            <div className="text-xs font-semibold text-white/60 uppercase tracking-wide">
              Scan to open project
            </div>
            <div className="p-3 rounded-xl bg-white">
              <QRCodeSVG
                id="project-qr-code"
                value={projectUrl}
                size={160}
                bgColor="#fff"
                fgColor="#000"
              />
            </div>
            <button
              type="button"
              onClick={() => downloadQR(project.id)}
              className="btn-ghost text-sm flex items-center gap-2"
            >
              <Download size={14} /> Download QR
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
