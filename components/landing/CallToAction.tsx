// CallToAction — Landing_Page. Server Component.
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

export function CallToAction() {
  return (
    <section
      id="get-started"
      className="py-24 sm:py-32 relative overflow-hidden"
      style={{ background: "var(--bg-primary)" }}
    >
      {/* Background grid details */}
      <div className="absolute inset-0 z-0 opacity-20 mesh-grid" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-10 blur-[100px] pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(99,102,241,0.5) 0%, transparent 70%)" }}
      />

      <div className="mx-auto max-w-4xl px-6 relative z-10">
        <div className="relative rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.03] to-white/[0.01] p-8 sm:p-16 overflow-hidden shadow-2xl text-center">
          
          {/* Top subtle badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-white/80 mb-6">
            <Sparkles size={12} className="text-amber-400" />
            Ready in 5 minutes
          </div>

          <h2
            className="text-3xl sm:text-5xl font-extrabold text-white mb-6 tracking-tight leading-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Ready to deploy your <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-indigo-400">
              Interactive Site Map?
            </span>
          </h2>
          
          <p className="text-base sm:text-lg mb-10 max-w-xl mx-auto leading-relaxed text-white/60">
            Create your developer account, upload your GeoJSON or DXF file, and share your live interactive map immediately.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/admin/login"
              className="w-full sm:w-auto px-8 py-4 rounded-xl font-extrabold text-sm transition-all duration-200 bg-white hover:bg-white/90 text-black shadow-lg shadow-white/5 flex items-center justify-center gap-2 active:scale-95"
            >
              Get Started Free <ArrowRight size={16} />
            </Link>
            <a
              href="#features"
              className="w-full sm:w-auto px-8 py-4 rounded-xl font-bold text-sm transition-all duration-200 bg-white/5 hover:bg-white/10 border border-white/15 text-white flex items-center justify-center active:scale-95"
            >
              Explore Features
            </a>
          </div>

        </div>
      </div>
    </section>
  );
}
