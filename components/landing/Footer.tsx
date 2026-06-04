// Footer — Landing_Page. Server Component.
import Link from "next/link";

export function Footer() {
  return (
    <footer
      className="border-t py-12 px-6"
      style={{ background: "var(--bg-primary)", borderColor: "var(--border-solid)" }}
    >
      <div className="mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-6">
        {/* Brand */}
        <div>
          <div
            className="text-xl font-bold text-white mb-1"
            style={{ fontFamily: "var(--font-display)" }}
          >
            PlotVerse
          </div>
          <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Next Gen Plot Viewer · Real-time · Shareable
          </div>
        </div>

        {/* Links */}
        <nav className="flex flex-wrap gap-6 text-sm" style={{ color: "var(--text-secondary)" }}>
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#get-started" className="hover:text-white transition-colors">Get started</a>
          <Link href="/admin" className="hover:text-white transition-colors">Admin panel</Link>
          <Link href="/admin/login" className="hover:text-white transition-colors">Login</Link>
        </nav>

        {/* Copyright */}
        <div className="text-xs" style={{ color: "var(--text-muted)" }}>
          © {new Date().getFullYear()} PlotVerse. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
