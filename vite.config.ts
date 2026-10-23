import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  plugins: [react(), cloudflare()],
  server: {
    port: 5173,
    proxy: {
      // Local dev without worker: vite-only mode falls back to same-origin mock.
      // When using `wrangler dev`, API is served by the Worker.
    }
  },
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 600,
  },
});
