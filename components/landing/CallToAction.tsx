// CallToAction — Landing_Page. Server Component.
import Link from "next/link";

export function CallToAction() {
  return (
    <section
      id="get-started"
      className="py-24 sm:py-32"
      style={{ background: "var(--bg-primary)" }}
    >
      <div className="mx-auto max-w-3xl px-6 text-center">
        <h2
          className="text-3xl sm:text-5xl font-bold text-white mb-6"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Ready to go live?
        </h2>
        <p className="text-lg mb-10" style={{ color: "var(--text-secondary)" }}>
          Set up your project in minutes. Upload a GeoJSON, add your plots, and share a single link.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/admin/login"
            className="px-10 py-4 rounded-xl font-bold text-base transition-all duration-200 hover:opacity-90 active:scale-95"
            style={{ background: "#fff", color: "#000" }}
          >
            Get started free →
          </Link>
          <a
            href="#features"
            className="px-10 py-4 rounded-xl font-semibold text-base transition-all duration-200 hover:bg-white/10"
            style={{ border: "1px solid rgba(255,255,255,0.20)", color: "#fff" }}
          >
            View features
          </a>
        </div>
      </div>
    </section>
  );
}
