import { defineConfig } from "vite";
import { resolve } from "path";
import viteCompression from "vite-plugin-compression";

import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(() => ({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "no-rapier-preload",
      transformIndexHtml: {
        order: "post",
        handler(html: string) {
          return html.replace(
            /<link rel="modulepreload" crossorigin href="\/assets\/rapier-[^"]+\.js">\s*/,
            "",
          );
        },
      },
    },
    viteCompression({
      algorithm: "brotliCompress",
      ext: ".br",
    }),
  ],
  clearScreen: false,
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes("node_modules/three/") || id.includes("node_modules/@react-three/fiber/") || id.includes("node_modules/@react-three/drei/")) return "three";
          if (id.includes("node_modules/@react-three/rapier/")) return "rapier";
        },
      },
    },
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
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
}));
