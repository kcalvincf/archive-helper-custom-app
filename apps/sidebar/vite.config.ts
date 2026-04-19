import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  /** Relative asset URLs so `index.html` works inside the Contentful app zip (same root as Functions). */
  base: "./",
  plugins: [react()],
  server: {
    port: 3001,
    strictPort: false,
  },
  build: {
    outDir: "build",
  },
  envPrefix: "VITE_",
});
