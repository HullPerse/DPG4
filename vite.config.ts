import { defineConfig } from "vite";
import { resolve } from "path";
import vCache from "@raegen/vite-plugin-vitest-cache";
import viteCompression from "vite-plugin-compression";

import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(() => ({
  plugins: [
    react(),
    tailwindcss(),
    vCache(),
    viteCompression({
      algorithm: "brotliCompress",
      ext: ".br",
    }),
  ],
  clearScreen: false,
  build: {
    sourcemap: false,
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },

  server: {
    port: 1420,
    strictPort: true,
    host: "127.0.0.1",
    // hmr: host
    //   ? {
    //       protocol: "ws",
    //       host,
    //       port: 1421,
    //       overlay: true,
    //     }
    //   : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
}));
