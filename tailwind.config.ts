import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["Syne", "sans-serif"],
        body:    ["DM Sans", "sans-serif"],
      },
      colors: {
        // Design-system palette
        bg: {
          primary: "#0a0a0a",
          card:    "#1a1a1a",
        },
        border: {
          DEFAULT: "rgba(255,255,255,0.10)",
          solid:   "#222222",
        },
        // Plot_Status color coding (Req 6.2–6.5)
        status: {
          available: "#22c55e",
          sold:      "#ef4444",
          reserved:  "#f59e0b",
          blocked:   "#6b7280",
        },
        // Brand
        whatsapp:  "#25d366",
        instagram: "#e1306c",
      },
      height: {
        dvh: "100dvh",
      },
      minHeight: {
        dvh: "100dvh",
      },
      screens: {
        xs: "390px",
      },
      animation: {
        "fade-in-up": "fadeInUp 0.5s ease forwards",
        "gps-pulse":  "gpsPulse 2s infinite",
        shimmer:      "shimmer 1.5s infinite",
      },
      keyframes: {
        fadeInUp: {
          from: { opacity: "0", transform: "translateY(16px)" },
          to:   { opacity: "1", transform: "translateY(0)"    },
        },
        gpsPulse: {
          "0%":   { boxShadow: "0 0 0 0 rgba(59,130,246,0.7)"  },
          "70%":  { boxShadow: "0 0 0 12px rgba(59,130,246,0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(59,130,246,0)"    },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition:  "200% 0" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
