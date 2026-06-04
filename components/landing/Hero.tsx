"use client";
// Marketing hero for the Landing_Page (Req 30.1).
// Premium dark hero with animated gradient headline, mesh grid background, and a highly-fidelity interactive map mockup.

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Check, Search, MessageSquare, Layers, Compass, MapPin, Share2 } from "lucide-react";

export function Hero() {
  return (
    <div className="relative overflow-hidden landing-gradient mesh-grid min-h-[100dvh] flex flex-col justify-between">
      {/* Ambient background glowing blobs */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-40 left-1/4 w-[600px] h-[500px] rounded-full opacity-20"
          style={{
            background: "radial-gradient(circle, rgba(99,102,241,0.6) 0%, transparent 70%)",
            filter: "blur(80px)",
          }}
        />
        <div
          className="absolute top-1/2 right-10 w-[500px] h-[400px] rounded-full opacity-15"
          style={{
            background: "radial-gradient(circle, rgba(16,185,129,0.5) 0%, transparent 70%)",
            filter: "blur(90px)",
          }}
        />
      </div>

      {/* Header / Navigation Bar */}
      <header className="relative z-20 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center font-black text-black text-lg tracking-wider shadow-lg shadow-white/5">
            PV
          </div>
          <span className="font-extrabold text-xl tracking-tight text-white" style={{ fontFamily: "var(--font-display)" }}>
            Plot<span className="text-emerald-500">Verse</span>
          </span>
        </div>
        
        <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-white/70">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#get-started" className="hover:text-white transition-colors">Setup Guide</a>
          <Link href="/admin" className="hover:text-white transition-colors">Admin Panel</Link>
        </nav>

        <div className="flex items-center gap-4">
          <Link
            href="/admin/login"
            className="px-5 py-2.5 rounded-xl font-bold text-xs bg-white/10 hover:bg-white/15 border border-white/10 text-white transition-all"
          >
            Login
          </Link>
          <a
            href="#features"
            className="hidden sm:inline-flex px-5 py-2.5 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
          >
            Explore Platform
          </a>
        </div>
      </header>

      {/* Hero Body Layout */}
      <main className="relative z-10 mx-auto max-w-7xl px-6 py-12 md:py-20 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center flex-grow">
        
        {/* Left Side: Headline & Copy */}
        <div className="lg:col-span-6 flex flex-col gap-6 text-left items-start">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 px-3.5 py-1.5 text-xs font-semibold text-emerald-400 bg-emerald-950/20 backdrop-blur-sm"
          >
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            Active Interactive Mode Available
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.1] text-white"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Say goodbye to <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-indigo-400">
              Confusing PDFs
            </span>
          </motion.h1>

          {/* Subtext */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="max-w-xl text-base sm:text-lg leading-relaxed text-white/60"
          >
            Present your real-estate layout on an interactive, 3D satellite map.
            Show real-time color-coded availability, capture premium leads, and close deals directly on WhatsApp.
          </motion.p>

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
          >
            <a
              href="#features"
              className="px-8 py-3.5 rounded-xl font-bold text-center text-sm transition-all duration-200 bg-white hover:bg-white/90 text-black shadow-xl shadow-white/5 active:scale-95"
            >
              See How It Works
            </a>
            <Link
              href="/admin/login"
              className="px-8 py-3.5 rounded-xl font-bold text-center text-sm transition-all duration-200 bg-white/5 hover:bg-white/10 border border-white/15 text-white active:scale-95"
            >
              Admin Dashboard →
            </Link>
          </motion.div>

          {/* Social Checklist */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3.5 mt-4 pt-6 border-t border-white/5 w-full max-w-md"
          >
            {[
              "Installable Mobile PWA",
              "Real-time Firestore Sync",
              "Import KML, Shapefile, DXF",
              "Instant 3D Terrain Pitch",
            ].map((text) => (
              <div key={text} className="flex items-center gap-2.5 text-xs text-white/70 font-medium">
                <div className="w-4 h-4 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                  <Check size={11} className="stroke-[3]" />
                </div>
                {text}
              </div>
            ))}
          </motion.div>
        </div>

        {/* Right Side: 3D Floating Interactive Map Mockup */}
        <div className="lg:col-span-6 w-full flex justify-center lg:justify-end">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="relative w-full max-w-lg aspect-[4/3] rounded-2xl glass-premium p-2 animate-float shadow-2xl border border-white/10"
          >
            {/* Inner Window Frame */}
            <div className="relative w-full h-full rounded-xl overflow-hidden bg-black flex flex-col">
              
              {/* Fake Satellite Background */}
              <div className="absolute inset-0 z-0">
                <Image
                  src="/mock_satellite_map.png"
                  alt="Satellite Map View"
                  fill
                  className="object-cover opacity-80"
                  priority
                  unoptimized
                />
                {/* Dark overlay to make UI elements readable */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/35" />
              </div>

              {/* Mock Plot Polygons (Styled absolute elements) */}
              <div className="absolute inset-0 z-10 pointer-events-none">
                {/* Plot 101 - Green Available */}
                <svg className="absolute w-full h-full">
                  {/* Plot A - Green */}
                  <polygon
                    points="80,120 180,110 170,180 70,190"
                    fill="rgba(34,197,94,0.35)"
                    stroke="#22c55e"
                    strokeWidth="2.5"
                    className="cursor-pointer pointer-events-auto transition-all hover:fill-emerald-500/60"
                  />
                  <text x="110" y="160" fill="white" fontSize="10" fontWeight="bold">P-101</text>

                  {/* Plot B - Red Sold */}
                  <polygon
                    points="180,110 270,105 260,170 170,180"
                    fill="rgba(239,68,68,0.35)"
                    stroke="#ef4444"
                    strokeWidth="2.5"
                    className="cursor-pointer pointer-events-auto transition-all hover:fill-red-500/60"
                  />
                  <text x="210" y="150" fill="white" fontSize="10" fontWeight="bold">P-102</text>

                  {/* Plot C - Amber Reserved */}
                  <polygon
                    points="70,190 170,180 160,250 60,260"
                    fill="rgba(245,158,11,0.35)"
                    stroke="#f59e0b"
                    strokeWidth="2.5"
                    className="cursor-pointer pointer-events-auto transition-all hover:fill-amber-500/60"
                  />
                  <text x="100" y="230" fill="white" fontSize="10" fontWeight="bold">P-103</text>
                </svg>

                {/* Pulsing GPS dot */}
                <div className="absolute top-[135px] left-[130px] -translate-x-1/2 -translate-y-1/2 user-location-dot" />
              </div>

              {/* Map UI Bar - Search & Title */}
              <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between gap-3">
                <div className="bg-black/75 backdrop-blur-md px-3.5 py-1.5 rounded-lg border border-white/10 flex items-center gap-2">
                  <Layers size={13} className="text-emerald-400" />
                  <span className="text-xs font-bold text-white">Greenwood Meadows</span>
                </div>
                
                <div className="bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2 max-w-[140px] sm:max-w-none">
                  <Search size={12} className="text-white/45" />
                  <span className="text-[10px] text-white/50 select-none">Search Plot #...</span>
                </div>
              </div>

              {/* Map Control Widget (Overlay bottom-right) */}
              <div className="absolute bottom-3 right-3 z-20 flex flex-col gap-2">
                <div className="w-8 h-8 rounded-lg bg-black/85 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/80 cursor-pointer hover:text-white transition-colors">
                  <Compass size={14} className="animate-spin-slow" />
                </div>
                <div className="px-2 py-1 rounded bg-black/85 backdrop-blur-md border border-white/10 text-[9px] font-bold text-white/90 select-none text-center">
                  3D
                </div>
              </div>

              {/* Floating Plot Details Popup (Overlay bottom-left) */}
              <div className="absolute bottom-3 left-3 z-20 w-48 bg-black/85 backdrop-blur-md border border-white/10 rounded-xl p-3 shadow-2xl flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-white/40 font-semibold tracking-wider uppercase">Active Select</span>
                    <span className="text-xs font-black text-white">Plot P-101</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Available
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-x-2 gap-y-1 py-1.5 border-y border-white/5 text-[10px]">
                  <div>
                    <span className="text-white/40 block">Area</span>
                    <span className="text-white font-medium">2,400 sq.ft</span>
                  </div>
                  <div>
                    <span className="text-white/40 block">Facing</span>
                    <span className="text-white font-medium">North-East</span>
                  </div>
                </div>

                <a
                  href="https://wa.me/#"
                  target="_blank"
                  className="bg-[#25D366] hover:bg-[#20ba56] transition-colors rounded-lg py-1.5 px-2 flex items-center justify-center gap-1.5 text-[10px] font-extrabold text-white no-underline"
                >
                  <MessageSquare size={11} className="fill-white stroke-none" />
                  Reserve via WhatsApp
                </a>
              </div>

            </div>
          </motion.div>
        </div>

      </main>

      {/* Scroll indicator & stats row bottom */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 pb-12 pt-6">
        <div
          className="flex flex-wrap justify-between items-center gap-6 pt-8 border-t border-white/5"
        >
          <div className="flex items-center gap-6">
            {[
              { value: "12,500+", label: "Plots mapped" },
              { value: "300+",    label: "Projects live" },
              { value: "50+",     label: "Cities covered" },
            ].map((s) => (
              <div key={s.label}>
                <div
                  className="text-lg sm:text-xl font-extrabold text-white"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {s.value}
                </div>
                <div className="text-xs text-white/50">
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs text-white/40">
            <span>Scroll to see detailed features</span>
            <div className="w-1.5 h-1.5 rounded-full bg-white/40 animate-ping" />
          </div>
        </div>
      </div>
    </div>
  );
}
