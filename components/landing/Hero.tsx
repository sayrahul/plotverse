"use client";
// Marketing hero for the Landing_Page (Req 30.1).
// Premium dark hero with animated gradient headline and mesh grid background.

import Link from "next/link";

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden min-h-[100dvh] flex items-center landing-gradient mesh-grid">
      {/* Ambient blobs */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div
          className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full opacity-20"
          style={{
            background:
              "radial-gradient(ellipse, rgba(99,102,241,0.6) 0%, transparent 70%)",
            filter: "blur(80px)",
          }}
        />
        <div
          className="absolute bottom-0 right-0 w-[500px] h-[400px] rounded-full opacity-10"
          style={{
            background:
              "radial-gradient(ellipse, rgba(16,185,129,0.8) 0%, transparent 70%)",
            filter: "blur(80px)",
          }}
        />
      </div>

      <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center gap-8 px-6 py-28 text-center">
        {/* Badge */}
        <span
          className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium"
          style={{
            borderColor: "rgba(255,255,255,0.15)",
            background: "rgba(255,255,255,0.06)",
            color: "rgba(255,255,255,0.8)",
          }}
        >
          <span
            className="inline-block w-2 h-2 rounded-full animate-pulse"
            style={{ background: "#22c55e" }}
          />
          Live inventory · Real-time satellite view
        </span>

        {/* Headline */}
        <h1
          className="text-5xl sm:text-7xl font-bold tracking-tight leading-[1.05]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          <span className="gradient-text">Next Gen</span>
          <br />
          <span className="text-white">Plot Viewer</span>
        </h1>

        {/* Subheadline */}
        <p className="max-w-2xl text-lg sm:text-xl leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
          Replace static PDFs with a full-screen satellite map experience.
          Color-coded plots, real-time availability, one shareable link per project.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 mt-2">
          <a
            href="#features"
            className="px-8 py-3.5 rounded-xl font-semibold text-base transition-all duration-200 hover:opacity-90 active:scale-95"
            style={{ background: "#fff", color: "#000" }}
          >
            See how it works
          </a>
          <Link
            href="/admin/login"
            className="px-8 py-3.5 rounded-xl font-semibold text-base transition-all duration-200 hover:bg-white/10"
            style={{
              border: "1px solid rgba(255,255,255,0.20)",
              color: "#fff",
            }}
          >
            Admin login →
          </Link>
        </div>

        {/* Stats row */}
        <div
          className="flex flex-wrap justify-center gap-6 mt-6 pt-8"
          style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
        >
          {[
            { value: "10,000+", label: "Plots mapped" },
            { value: "250+",    label: "Projects live" },
            { value: "40+",     label: "Cities" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div
                className="text-2xl font-bold"
                style={{ fontFamily: "var(--font-display)", color: "#fff" }}
              >
                {s.value}
              </div>
              <div className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce">
        <div className="w-px h-10" style={{ background: "rgba(255,255,255,0.2)" }} />
        <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>Scroll</span>
      </div>
    </section>
  );
}
