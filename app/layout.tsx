import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorkerRegistrar } from "@/components/pwa/ServiceWorkerRegistrar";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "PlotVerse — Next Gen Plot Viewer",
  description:
    "Explore real-estate land plots on a full-screen interactive satellite map. Color-coded plots, real-time availability, and a single sharable link per project.",
  keywords: ["real estate", "land plots", "plot viewer", "satellite map", "property"],
  openGraph: {
    title: "PlotVerse — Next Gen Plot Viewer",
    description: "Explore real-estate land plots on an interactive satellite map.",
    type: "website",
  },
};

// Mobile-app viewport — user-scalable=no prevents pinch zoom on project pages (Req 41.3).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Google Fonts — Syne (display) + DM Sans (body) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap"
          rel="stylesheet"
        />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0a0a0a" />
      </head>
      <body style={{ fontFamily: "var(--font-body)" }}>
        {/* Registers the PWA service worker (Req 40.1). */}
        <ServiceWorkerRegistrar />
        {/* Global toast notifications (z-index 60) */}
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              background: "#1a1a1a",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: "12px",
              fontFamily: "var(--font-body)",
              fontSize: "14px",
            },
          }}
        />
        {children}
      </body>
    </html>
  );
}
