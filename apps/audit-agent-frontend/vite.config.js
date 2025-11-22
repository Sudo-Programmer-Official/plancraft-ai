import { fileURLToPath, URL } from 'node:url'
import path from 'path'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
      strategies: 'generateSW',
      workbox: {
        importScripts: ['sw-push.js'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB
        // Do NOT take over Firebase auth handler routes when using a
        // custom domain (e.g., plancraftai.com). If the SW serves
        // index.html for "/__/auth/handler", Google sign-in breaks.
        navigateFallbackDenylist: [/^\/__\//],
      },
      manifest: {
        name: 'Peaceful Productivity',
        short_name: 'Productivity',
        description: 'Pause, plan, and reflect with mindful journaling and tasks',
        theme_color: '#4f46e5', // matches your indigo brand
        background_color: '#111827', // slate/indigo background
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-384x384.png',
            sizes: '384x384',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@llm': path.resolve(__dirname, '../../shared/llm'),
      '@utils': path.resolve(__dirname, '../../shared/utils'),
      '@components': path.resolve(__dirname, '../../shared/components'),
      '@api': path.resolve(__dirname, '../../shared/api-clients'),
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:4000',
      '/creator-api': 'http://localhost:5005',
      '/posting-api': 'http://localhost:5006',
    },
  },
  build: {
    outDir: 'dist',
    copyPublicDir: true, // ✅ this ensures /public contents (logo.png, sitemap.xml, etc.) are included
  }
})
