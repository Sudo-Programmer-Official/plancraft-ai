import 'element-plus/dist/index.css'
import './assets/tailwind.scss'

import { ViteSSG } from 'vite-ssg'
import App from './App.vue'
import { routes } from './router/index.js'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import { ID_INJECTION_KEY, ZINDEX_INJECTION_KEY } from 'element-plus'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import VoiceRecorder from '@/components/VoiceRecorder.vue'

// Firebase init (no-ops on server)
import '@/firebase/init'

if (import.meta.env.SSR) {
  try {
    delete globalThis.window
  } catch {
    globalThis.window = undefined
  }
  try {
    delete globalThis.document
  } catch {
    globalThis.document = undefined
  }
}

const routesToPrerender = [
  '/',
  '/features',
  '/ai-task-planner',
  '/ai-daily-planner',
  '/voice-planning',
  '/voice-reminder-app',
  '/ai-reminders',
  '/recurring-reminder-app',
  '/google-calendar-integration',
  '/pricing',
  '/help',
  '/contact',
  '/privacy',
  '/terms',
  '/delete-account',
]

export function includedRoutes() {
  return routesToPrerender
}

export const createApp = ViteSSG(
  App,
  { routes },
  (ctx) => {
    ctx.app.use(createPinia())
    ctx.app.use(ElementPlus)
    ctx.app.provide(ID_INJECTION_KEY, { prefix: 1024, current: 0 })
    ctx.app.provide(ZINDEX_INJECTION_KEY, { current: 0 })
    for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
      ctx.app.component(key, component)
    }
    ctx.app.component('VoiceRecorder', VoiceRecorder)
  }
)
