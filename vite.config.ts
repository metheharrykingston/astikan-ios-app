import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { VitePWA } from "vite-plugin-pwa"

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("react-icons")) return "icons"
            if (id.includes("@capacitor")) return "capacitor"
            if (id.includes("@firebase") || id.includes("firebase")) return "firebase"
            if (id.includes("workbox")) return "workbox"
            if (id.includes("react") || id.includes("scheduler")) return "vendor-react"
            if (id.includes("lodash")) return "vendor-lodash"
            if (id.includes("date-fns")) return "vendor-date"
            const match = id.match(/node_modules\/(?:\.pnpm\/)?(@?[^/]+)/)
            return match ? `vendor-${match[1].replace('@', '').replace(/[^a-z0-9_-]/gi, '-')}` : "vendor"
          }
          if (id.includes("/src/pages/")) {
            const match = id.match(/\/src\/pages\/([^/]+)/)
            return match ? `page-${match[1].toLowerCase()}` : "pages"
          }
          if (id.includes("/src/services/")) return "services"
        },
      },
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
      "/ws": {
        target: "ws://localhost:4000",
        ws: true,
        changeOrigin: true,
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["logo.png", "apple-touch-icon.png", "icons/icon-192.png", "icons/icon-512.png"],
      buildBase: "/",
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        clientsClaim: true,
        skipWaiting: true,
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        enabled: false,
      },
      manifest: {
        name: "Astikan",
        short_name: "Astikan",
        description: "Astikan health companion for consultations, lab tests, medicines, hospital bookings and support.",
        lang: "en-US",
        id: "/",
        start_url: "/",
        scope: "/",
        categories: ["health", "medical"],
        prefer_related_applications: false,
        theme_color: "#0b66f6",
        background_color: "#ffffff",
        display: "fullscreen",
        display_override: ["fullscreen", "standalone"],
        orientation: "portrait",
        icons: [
          { src: "/logo.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/logo.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ],
        shortcuts: [
          { name: "Home", short_name: "Home", url: "/home" },
          { name: "Book Consultation", short_name: "Consult", url: "/teleconsultation" },
          { name: "Lab Tests", short_name: "Labs", url: "/lab-tests" },
        ],
        screenshots: [
          { src: "/logo.png", sizes: "512x512", type: "image/png", form_factor: "wide" },
          { src: "/logo.png", sizes: "192x192", type: "image/png" },
        ],
      },
    }),
  ],
})
