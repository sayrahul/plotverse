import type { Metadata, Viewport } from "next";
import { Outfit, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegistrar } from "@/components/pwa/ServiceWorkerRegistrar";
import { Toaster } from "react-hot-toast";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-display",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-body",
});

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
    <html lang="en" className={`${outfit.variable} ${plusJakartaSans.variable}`}>
      <head>
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
