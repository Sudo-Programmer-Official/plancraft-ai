import 'element-plus/dist/index.css'
import './styles/themes.css'
import './assets/tailwind.scss'

import { ViteSSG } from 'vite-ssg'
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'
import { createHead } from '@vueuse/head'
import ElementPlus from 'element-plus'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import VoiceRecorder from '@/components/VoiceRecorder.vue'
import { loadInitialTheme } from '@/composables/useTheme'

// Firebase init (no-ops on server)
import '@/firebase/init'

const routesToPrerender = router.getRoutes().map((r) => r.path)

// Ensure theme is applied during client hydration to avoid flashes
if (typeof window !== 'undefined') {
  try { loadInitialTheme() } catch {}
}

export const createApp = ViteSSG(
  App,
  { routes: routesToPrerender },
  (ctx) => {
    ctx.app.use(router)
    ctx.app.use(createPinia())
    ctx.app.use(createHead())
    ctx.app.use(ElementPlus)
    for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
      ctx.app.component(key, component)
    }
    ctx.app.component('VoiceRecorder', VoiceRecorder)
  }
)
