// Stats section — Landing_Page. Server Component.
import { Compass, Users, CheckCircle, Smartphone } from "lucide-react";

const STATS = [
  { value: "12,500+", label: "Plots mapped",   desc: "Across all projects", icon: Compass },
  { value: "300+",    label: "Projects live",   desc: "In production today", icon: CheckCircle },
  { value: "50+",     label: "Cities covered",  desc: "And growing fast", icon: Users },
  { value: "100%",    label: "Mobile-first",    desc: "PWA installable", icon: Smartphone },
];

export function Stats() {
  return (
    <section
      className="py-24 sm:py-32 relative overflow-hidden"
      style={{ background: "rgba(10, 10, 10, 0.5)" }}
    >
      {/* Background glow overlay */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full opacity-10"
          style={{
            background: "radial-gradient(circle, rgba(99,102,241,0.3) 0%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />
      </div>

      <div className="mx-auto max-w-5xl px-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {STATS.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.label}
                className="relative rounded-2xl border border-white/5 bg-white/[0.02] p-6 text-center hover:bg-white/[0.04] hover:border-white/10 transition-all duration-300 group hover:scale-[1.02]"
              >
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/60 group-hover:text-emerald-400 group-hover:bg-emerald-500/10 transition-all mx-auto mb-4">
                  <Icon size={20} />
                </div>
                <div
                  className="text-3xl sm:text-4xl font-extrabold text-white mb-1"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {s.value}
                </div>
                <div className="text-sm font-bold text-white/90 mb-1">
                  {s.label}
                </div>
                <div className="text-xs text-white/50">
                  {s.desc}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
