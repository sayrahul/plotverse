import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Mirror the `@/*` -> `./*` path alias from tsconfig.json
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    // Enable describe/it/expect/vi without importing them
    globals: true,
    // Browser-like DOM for React component + user-event tests
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    // Discover co-located unit tests and property tests
    include: ["**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", ".next", "out", "build", "coverage"],
    css: false,
  },
});
