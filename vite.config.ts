import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url))
    }
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/icon-192.svg", "icons/icon-512.svg"],
      manifest: {
        name: "SomaSmart",
        short_name: "SomaSmart",
        start_url: "/",
        display: "standalone",
        background_color: "#0b1220",
        theme_color: "#0ea5e9",
        icons: [
          { src: "/icons/icon-192.svg", sizes: "192x192", type: "image/svg+xml" },
          { src: "/icons/icon-512.svg", sizes: "512x512", type: "image/svg+xml" }
        ]
      },
      workbox: {
        navigateFallback: "/index.html",
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"]
      }
    })
  ],
  server: { port: 5173, strictPort: true },
  test: {
    environment: "jsdom",
    setupFiles: ["src/test/setup.ts"],
    globals: true,
    css: true,
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: ["e2e/**", "node_modules/**"]
  }
});
