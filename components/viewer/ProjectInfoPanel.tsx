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

const APP_DOMAIN = "https://plotverse.proventure.in";

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
  const projectUrl = APP_DOMAIN;
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
    <div className="absolute inset-0 z-30 pointer-events-auto flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      
      <motion.div
        className="relative w-full max-w-sm glass-dark rounded-2xl overflow-hidden p-6"
        style={{ background: "#222" }}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
      >
        <button 
          type="button" 
          onClick={onClose} 
          className="absolute top-4 right-4 text-white/50 hover:text-white"
        >
          <X size={20} />
        </button>

        {/* PlotVerse Header */}
        <div className="flex items-center gap-3 mb-6">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 10l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
          <span className="text-xl font-bold tracking-wider" style={{ color: "#f97316", fontFamily: "var(--font-display)" }}>
            PLOTVERSE
          </span>
        </div>

        {/* Description */}
        <p className="text-[15px] text-white/80 leading-relaxed mb-6">
          PlotVerse offers well-planned 109 residential plots in a peaceful setting. The Lifestyle you deserve
        </p>

        {/* Instagram button */}
        <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center mb-6 hover:bg-white/5">
          <Camera size={20} className="text-white/70" />
        </a>

        <div className="w-full h-px bg-white/10 mb-6" />

        {/* Other projects */}
        <h4 className="text-sm font-semibold text-white/90 mb-4">Other projects by same developer :</h4>
        
        <a href="#" className="relative rounded-xl overflow-hidden border border-white/10 bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] p-4 flex items-center justify-center h-28 cursor-pointer hover:border-white/20 transition-colors block w-full">
          <button className="absolute top-2 right-2 text-white/50"><Share2 size={14} /></button>
          
          <div className="flex flex-col items-center">
            {/* Tatva Homes Logo Mock */}
            <div className="text-xl font-serif text-[#d4af37] tracking-widest mb-1">
              T A T V A
            </div>
            <div className="text-[10px] text-[#d4af37]/80 tracking-[0.3em]">HOMES</div>
          </div>

          <div className="absolute bottom-3 left-4 flex items-center gap-1.5">
            <div className="w-4 h-4 bg-[#22c55e] rounded-sm transform rotate-45" />
            <span className="text-[10px] font-bold tracking-widest">SPACER</span>
          </div>
          <div className="absolute bottom-3 right-4 text-[8px] text-white/40 text-right leading-tight">
            NEXT GEN<br/>PLOT VIEWING
          </div>
        </a>

        <div className="mt-8 text-[11px] text-white/40">
          Powered by Spacer Engine | SKILLHOUSE
        </div>
      </motion.div>
    </div>
  );
}
