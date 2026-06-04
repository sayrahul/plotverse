"use client";
/**
 * ShareModal — z-index 40 modal for sharing the project or a filtered view.
 * Includes copy-link, QR code, WhatsApp share, and a "share filtered view" toggle.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, Check, MessageCircle } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "react-hot-toast";
import type { Project } from "@/lib/types";

const APP_DOMAIN = "https://plotverse.proventure.in";

interface ShareModalProps {
  project:         Project;
  activeStatusId?: string;
  activePlotNum?:  string;
  onClose():       void;
}

export function ShareModal({
  project,
  activeStatusId,
  activePlotNum,
  onClose,
}: ShareModalProps) {
  const [includeFilter, setIncludeFilter] = useState(!!activeStatusId);
  const [copied, setCopied]               = useState(false);

  const baseUrl = APP_DOMAIN;
  const params  = new URLSearchParams();
  if (includeFilter && activeStatusId) params.set("status", activeStatusId);
  if (activePlotNum) params.set("plot", activePlotNum);
  const shareUrl = params.toString() ? `${baseUrl}?${params}` : baseUrl;

  async function handleCopy() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  }

  function handleWhatsApp() {
    const msg = `Check out ${project.name} on PlotVerse: ${shareUrl}`;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(msg)}`,
      "_blank",
    );
  }

  async function handleNativeShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title: project.name, url: shareUrl });
      } catch { /* user cancelled */ }
    } else {
      await handleCopy();
    }
  }

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 z-40 flex items-end sm:items-center justify-center"
        style={{ background: "rgba(0,0,0,0.6)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        {/* Modal */}
        <motion.div
          className="glass-dark w-full sm:max-w-sm mx-4 mb-4 mb-safe sm:mb-0 rounded-2xl overflow-hidden"
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0,  opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ type: "spring", damping: 30 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
            <h2 className="text-base font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
              Share
            </h2>
            <button type="button" onClick={onClose} className="icon-btn" aria-label="Close">
              <X size={16} />
            </button>
          </div>

          <div className="px-5 py-5 space-y-5">
            {/* QR code */}
            <div className="flex justify-center">
              <div className="p-3 rounded-xl bg-white">
                <QRCodeSVG value={shareUrl} size={140} bgColor="#fff" fgColor="#000" />
              </div>
            </div>

            {/* URL display */}
            <div
              className="flex items-center gap-2 rounded-xl px-3 py-2"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <span className="text-xs flex-1 truncate" style={{ color: "rgba(255,255,255,0.55)" }}>
                {shareUrl}
              </span>
              <button type="button" onClick={handleCopy} className="icon-btn shrink-0" aria-label="Copy link">
                {copied ? <Check size={14} color="var(--color-available)" /> : <Copy size={14} />}
              </button>
            </div>

            {/* Filter toggle */}
            {activeStatusId && (
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-white/70">Include active filter in link</span>
                <div
                  className="relative w-10 h-5 rounded-full transition-colors duration-200 cursor-pointer"
                  style={{ background: includeFilter ? "var(--color-available)" : "rgba(255,255,255,0.15)" }}
                  onClick={() => setIncludeFilter((v) => !v)}
                >
                  <div
                    className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200"
                    style={{ transform: includeFilter ? "translateX(20px)" : "translateX(2px)" }}
                  />
                </div>
              </label>
            )}

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={handleWhatsApp} className="btn-whatsapp flex items-center justify-center gap-2 text-sm">
                <MessageCircle size={14} /> WhatsApp
              </button>
              <button type="button" onClick={handleNativeShare} className="btn-ghost flex items-center justify-center gap-2 text-sm">
                Share…
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
