"use client";
/**
 * WhatsAppFAB — fixed bottom-right green floating action button.
 * Always visible (z-index 50). Opens WhatsApp with a pre-filled greeting.
 */
import { MessageCircle } from "lucide-react";
import type { Project } from "@/lib/types";

interface WhatsAppFABProps {
  project: Project;
}

export function WhatsAppFAB({ project }: WhatsAppFABProps) {
  function handleClick() {
    const msg = `Hi! I found your project "${project.name}" on PlotVerse. I'd like to know more about available plots.`;
    window.open(
      `https://wa.me/${project.contactPhone}?text=${encodeURIComponent(msg)}`,
      "_blank",
    );
  }

  if (!project.contactPhone) return null;

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Enquire on WhatsApp"
      className="ui-overlay fixed right-6 z-50 flex items-center justify-center rounded-full transition-transform duration-200 hover:scale-110 active:scale-95"
      style={{
        bottom: "90px",
        width: "56px",
        height: "56px",
        background: "var(--color-whatsapp)",
        boxShadow: "0 4px 20px rgba(37,211,102,0.45)",
      }}
    >
      <MessageCircle size={24} fill="white" color="white" />
    </button>
  );
}
