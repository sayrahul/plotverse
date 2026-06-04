// Features grid for Landing_Page (Req 30.1). Server Component.
// 20 features displayed in a dark glassmorphism grid.

const FEATURES = [
  {
    icon: "🗺️",
    title: "Full-Screen Satellite Map",
    desc: "Mapbox satellite imagery with plot polygons overlaid. Works on any device.",
  },
  {
    icon: "🎨",
    title: "Color-Coded Status",
    desc: "Available (green), Sold (red), Reserved (amber), Blocked (gray) — at a glance.",
  },
  {
    icon: "🔗",
    title: "One Shareable Link",
    desc: "One URL per project. Share filtered views, specific plots, or 3D mode.",
  },
  {
    icon: "📡",
    title: "Real-Time Inventory",
    desc: "Firestore onSnapshot keeps the map updated live without page reloads.",
  },
  {
    icon: "🔍",
    title: "Instant Plot Search",
    desc: "Search by plot number, area, or status. Results fly-to on map instantly.",
  },
  {
    icon: "📐",
    title: "Auto Area Calculation",
    desc: "Turf.js calculates precise area in sqft, sqm, sqyd, acre, or gunta.",
  },
  {
    icon: "🏗️",
    title: "3D View Toggle",
    desc: "Pitch the map 60° with building extrusions for a dramatic site overview.",
  },
  {
    icon: "📍",
    title: "Live GPS Tracking",
    desc: "Pulsing blue dot shows your real-world position on the plot map.",
  },
  {
    icon: "📏",
    title: "Dimension Labels",
    desc: "Edge lengths displayed in meters at zoom ≥ 18 for precise measurement.",
  },
  {
    icon: "🖼️",
    title: "Media Gallery",
    desc: "Image & video gallery with lightbox, swipe, pinch-to-zoom support.",
  },
  {
    icon: "💬",
    title: "WhatsApp Integration",
    desc: "Pre-filled enquiry messages for any plot, directly to the developer.",
  },
  {
    icon: "🗂️",
    title: "Zone Management",
    desc: "Define zones (Phase 1, Commercial) with colored polygon overlays.",
  },
  {
    icon: "🎯",
    title: "Status Group Filters",
    desc: "Create named filter presets. Share a link that opens pre-filtered.",
  },
  {
    icon: "📊",
    title: "Built-in CRM",
    desc: "Capture leads from enquiry forms. Pipeline management with timeline.",
  },
  {
    icon: "📁",
    title: "File Upload",
    desc: "Import GeoJSON, KML, KMZ, Shapefile, DXF, or CSV. Auto-converted.",
  },
  {
    icon: "📱",
    title: "PWA — No App Store",
    desc: "Installable on iOS and Android homescreen. Works offline.",
  },
  {
    icon: "🔭",
    title: "Presentation Mode",
    desc: "Hide all UI chrome for a clean map-only walkthrough. Exit with Escape.",
  },
  {
    icon: "🔐",
    title: "Role-Based Admin",
    desc: "Superadmin and Editor roles. Session-based auth via Firebase.",
  },
  {
    icon: "📤",
    title: "QR Code Sharing",
    desc: "Auto-generated QR code for every project URL. Download as PNG.",
  },
  {
    icon: "📈",
    title: "GeoJSON History",
    desc: "Keep last 5 GeoJSON versions. One-click rollback to any version.",
  },
] as const;

export function Features() {
  return (
    <section
      id="features"
      className="relative py-24 sm:py-32"
      style={{ background: "var(--bg-primary)" }}
    >
      {/* Section header */}
      <div className="mx-auto max-w-5xl px-6 text-center mb-16">
        <span
          className="inline-block text-xs font-bold uppercase tracking-widest mb-4"
          style={{ color: "var(--color-available)" }}
        >
          Full Feature Set
        </span>
        <h2
          className="text-3xl sm:text-5xl font-bold text-white"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Everything your
          <br />
          <span className="gradient-text-green">project needs</span>
        </h2>
        <p className="mt-4 text-base sm:text-lg max-w-2xl mx-auto" style={{ color: "var(--text-secondary)" }}>
          A complete real-estate plot viewer — from satellite map to CRM, all in one URL.
        </p>
      </div>

      {/* Grid */}
      <div className="mx-auto max-w-5xl px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {FEATURES.map((f) => (
          <div key={f.title} className="feature-card group cursor-default">
            <div className="text-3xl mb-3">{f.icon}</div>
            <h3
              className="text-sm font-bold text-white mb-1.5"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {f.title}
            </h3>
            <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              {f.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
