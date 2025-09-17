import { fileURLToPath, URL } from 'node:url'
import path from 'path'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), vueDevTools(), tailwindcss()],
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
    },
  },
})
