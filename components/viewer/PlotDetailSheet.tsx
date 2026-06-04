"use client";
/**
 * PlotDetailSheet — bottom sheet that slides up when a plot is selected.
 * Height: 50dvh (expandable to 85dvh). Dismiss: swipe down or close button.
 * Saves enquiry leads to Firestore. Updates ?plot= URL param.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Navigation, Share2, MessageCircle, ChevronDown } from "lucide-react";
import { toast } from "react-hot-toast";
import type { Plot, Project, Unit } from "@/lib/types";
import { formatArea } from "@/lib/units";
import { leadRepo } from "@/lib/firebase/repos";

const STATUS_COLORS: Record<string, string> = {
  available: "var(--color-available)",
  sold:      "var(--color-sold)",
  reserved:  "var(--color-reserved)",
  blocked:   "var(--color-blocked)",
};

const UNITS: Unit[] = ["sqft", "sqyd", "sqm", "acre", "gunta"];

interface PlotDetailSheetProps {
  plot:       Plot;
  project:    Project;
  zoneName?:  string;
  onClose():  void;
  onShare():  void;
}

function formatPrice(price: number | undefined): string {
  if (!price) return "Price on Request";
  if (price >= 1e7) return `₹${(price / 1e7).toFixed(2)} Cr`;
  if (price >= 1e5) return `₹${(price / 1e5).toFixed(2)} L`;
  return `₹${price.toLocaleString("en-IN")}`;
}

function openDirections(lat: number, lng: number) {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const url = isIOS
    ? `maps://maps.apple.com/?daddr=${lat},${lng}`
    : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  window.open(url, "_blank");
}

export function PlotDetailSheet({
  plot,
  project,
  zoneName,
  onClose,
  onShare,
}: PlotDetailSheetProps) {
  const [unit,       setUnit]       = useState<Unit>("sqft");
  const [expanded,   setExpanded]   = useState(false);
  const [showForm,   setShowForm]   = useState(false);
  const [name,       setName]       = useState("");
  const [phone,      setPhone]      = useState("");
  const [submitting, setSubmitting] = useState(false);

  const height = expanded ? "85dvh" : "50dvh";
  const centroid = plot.centroid as [number, number];

  function handleWhatsApp() {
    const msg = `Hi, I'm interested in Plot ${plot.number} (${formatArea(plot.areaSqm, "sqft")}, ${plot.status}) at ${project.name}. Please share more details.`;
    window.open(
      `https://wa.me/${project.contactPhone}?text=${encodeURIComponent(msg)}`,
      "_blank",
    );
  }

  async function handleEnquiry() {
    if (!name.trim() || !phone.trim()) {
      toast.error("Please enter your name and phone.");
      return;
    }
    setSubmitting(true);
    try {
      await leadRepo.create({
        projectId: plot.projectId,
        plotId:    plot.id,
        name:      name.trim(),
        contact:   phone.trim(),
        message:   `Enquiry from plot detail sheet for ${plot.number}.`,
      });
      toast.success("Enquiry sent! We'll contact you soon.");
      setName(""); setPhone(""); setShowForm(false);
    } catch {
      toast.error("Failed to send enquiry. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        className="absolute bottom-0 left-0 right-0 z-30 glass-dark overflow-hidden"
        style={{
          height,
          borderRadius: "20px 20px 0 0",
          transition: "height 0.3s ease",
        }}
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        onDragEnd={(_, info) => {
          if (info.offset.y > 80)       onClose();
          else if (info.offset.y < -80) setExpanded(true);
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 cursor-grab">
          <div className="drag-handle" />
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto h-full pb-8 px-5">
          {/* Header row */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2
                className="text-2xl font-bold text-white"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Plot {plot.number}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className="status-badge"
                  style={{ color: STATUS_COLORS[plot.status] }}
                >
                  {plot.status}
                </span>
                {zoneName && (
                  <span className="text-xs text-white/50">{zoneName}</span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setExpanded((e) => !e)}
                className="icon-btn"
                aria-label={expanded ? "Collapse sheet" : "Expand sheet"}
              >
                <ChevronDown
                  size={16}
                  style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
                />
              </button>
              <button type="button" onClick={onClose} className="icon-btn" aria-label="Close">
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: "rgba(255,255,255,0.08)", marginBottom: 16 }} />

          {/* Area + unit toggle */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-xs text-white/50 mb-0.5">Area</div>
              <div className="text-lg font-semibold text-white">
                {formatArea(plot.areaSqm, unit)}
              </div>
            </div>
            <div className="unit-group">
              {UNITS.map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUnit(u)}
                  className={`unit-btn${unit === u ? " active" : ""}`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>

          {/* Facing + price row */}
          <div className="grid grid-cols-2 gap-4 mb-3">
            {plot.facing && (
              <div>
                <div className="text-xs text-white/50 mb-0.5">Facing</div>
                <div className="text-sm font-semibold text-white capitalize">{plot.facing}</div>
              </div>
            )}
            <div>
              <div className="text-xs text-white/50 mb-0.5">Price</div>
              <div className="text-sm font-semibold text-white">{formatPrice(plot.price)}</div>
            </div>
          </div>

          {/* Amenities */}
          {plot.amenities && plot.amenities.length > 0 && (
            <div className="mb-4">
              <div className="text-xs text-white/50 mb-2">Amenities</div>
              <div className="flex flex-wrap gap-2">
                {plot.amenities.map((a) => (
                  <span
                    key={a}
                    className="text-xs px-2.5 py-1 rounded-full font-medium"
                    style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.75)" }}
                  >
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Divider */}
          <div style={{ height: 1, background: "rgba(255,255,255,0.08)", marginBottom: 16 }} />

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <button
              type="button"
              onClick={() => openDirections(centroid[1], centroid[0])}
              className="btn-ghost text-sm flex items-center justify-center gap-2"
            >
              <Navigation size={14} /> Directions
            </button>
            <button type="button" onClick={onShare} className="btn-ghost text-sm flex items-center justify-center gap-2">
              <Share2 size={14} /> Share Plot
            </button>
          </div>

          <button
            type="button"
            onClick={handleWhatsApp}
            className="btn-whatsapp w-full mb-3"
          >
            <MessageCircle size={16} /> Enquire on WhatsApp
          </button>

          {/* Enquiry form toggle */}
          {!showForm ? (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="btn-ghost w-full text-sm"
            >
              Submit Enquiry Form
            </button>
          ) : (
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm text-white bg-white/5 border border-white/10 placeholder:text-white/30 outline-none focus:border-white/25"
              />
              <input
                type="tel"
                placeholder="Phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm text-white bg-white/5 border border-white/10 placeholder:text-white/30 outline-none focus:border-white/25"
              />
              <button
                type="button"
                onClick={handleEnquiry}
                disabled={submitting}
                className="btn-primary w-full disabled:opacity-50"
              >
                {submitting ? "Sending…" : "Send Enquiry"}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
