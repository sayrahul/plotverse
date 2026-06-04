// Stats section — Landing_Page. Server Component.

const STATS = [
  { value: "10,000+", label: "Plots mapped",   desc: "Across all projects" },
  { value: "250+",    label: "Projects live",   desc: "In production today" },
  { value: "40+",     label: "Cities covered",  desc: "And growing" },
  { value: "100%",    label: "Mobile-first",    desc: "PWA installable" },
];

export function Stats() {
  return (
    <section
      className="py-20 sm:py-28"
      style={{ background: "var(--bg-card)" }}
    >
      <div className="mx-auto max-w-5xl px-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-12">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <div
                className="text-4xl sm:text-5xl font-bold text-white mb-1"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {s.value}
              </div>
              <div className="text-base font-semibold text-white/80 mb-0.5">
                {s.label}
              </div>
              <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
                {s.desc}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
