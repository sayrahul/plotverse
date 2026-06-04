// Landing_Page served at the root path (Req 30.1).
// Marketing-only RSC — no viewer/map imports.
import { CallToAction } from "@/components/landing/CallToAction";
import { Features }     from "@/components/landing/Features";
import { Footer }       from "@/components/landing/Footer";
import { Hero }         from "@/components/landing/Hero";
import { Stats }        from "@/components/landing/Stats";

export default function HomePage() {
  return (
    <main style={{ background: "var(--bg-primary)" }}>
      <Hero />
      <Features />
      <Stats />
      <CallToAction />
      <Footer />
    </main>
  );
}
