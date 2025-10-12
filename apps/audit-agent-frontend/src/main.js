// Global styles
import './assets/tailwind.scss'
import './assets/theme.scss'
import 'element-plus/dist/index.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import { useAuthStore } from '@/stores/authStore'
import VoiceRecorder from '@/components/VoiceRecorder.vue'
import { createHead } from '@vueuse/head'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import { initAnalytics, bindRouter } from '@/services/analytics'
import 'driver.js/dist/driver.css'
import { handleAuthError } from '@/services/firebaseService'

// Day.js timezone defaults
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
dayjs.extend(utc)
dayjs.extend(timezone)
try {
  let guessed = dayjs.tz.guess()
  // 🧠 Fallback to system Intl if dayjs returns UTC (PWA edge case)
  if (guessed === 'UTC') {
    const intlGuess = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (intlGuess && intlGuess !== 'UTC') guessed = intlGuess
  }

  // 🧩 Persist timezone in localStorage for consistent reuse
  localStorage.setItem('user_timezone', guessed)
  dayjs.tz.setDefault(guessed)
  console.log('[TimeZone] Default set to:', guessed)
} catch (err) {
  console.warn('[TimeZone] Fallback to UTC:', err)
  dayjs.tz.setDefault('UTC')
}

// ✅ Firebase init
import '@/firebase/init'

// ✅ PWA service worker registration
import { registerSW } from 'virtual:pwa-register'
registerSW({
  onNeedRefresh() {
    console.log('New content available. Refresh!')
  },
  onOfflineReady() {
    console.log('App ready to work offline.')
  },
})

const app = createApp(App)

// Plugins
app.use(ElementPlus)
app.use(router)
app.use(createPinia())
app.use(createHead())

// Global components
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}
app.component('VoiceRecorder', VoiceRecorder)

app.config.errorHandler = (err, vm, info) => {
  console.error('Global error handler:', err, info)
  if (err.message.includes('auth')) {
    handleAuthError(err)
  }
  console.error('Unhandled error:', err)
}

// Analytics
initAnalytics()
bindRouter(router)

// ✅ Auth store init
const authStore = useAuthStore()
authStore.init()

// 🆕 Restore Google redirect login results (fix for Safari / LinkedIn)
try {
  authStore.checkRedirectResult?.()
} catch (err) {
  console.warn('Redirect login check failed:', err)
}

// Early Instagram/Facebook/TikTok browser check
const ua = navigator.userAgent.toLowerCase()
const isInApp = /(instagram|fbav|facebook|line|wechat|micromessenger|pinterest|snapchat|tiktok)/i.test(ua)
if (isInApp) {
  window.location.href = '/inapp-fallback.html'
}

// Mount app
app.mount('#app')

// 🧩 Persist sessionStorage in iOS/Safari PWA
try {
  const isStandalone =
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone
  if (isStandalone) {
    if (!sessionStorage.length && localStorage.getItem('sessionBackup')) {
      const backup = JSON.parse(localStorage.getItem('sessionBackup') || '{}')
      Object.keys(backup).forEach((k) => sessionStorage.setItem(k, backup[k]))
    }
    window.addEventListener('beforeunload', () => {
      const dump = {}
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i)
        dump[key] = sessionStorage.getItem(key)
      }
      localStorage.setItem('sessionBackup', JSON.stringify(dump))
    })
  }
} catch {}