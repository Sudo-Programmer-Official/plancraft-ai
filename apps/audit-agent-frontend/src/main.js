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
  const guessed = dayjs.tz.guess()
  dayjs.tz.setDefault(guessed)
  console.log('[TimeZone] Default set to:', guessed)
} catch {}

// ✅ Firebase init
import '@/firebase/init'

// ✅ Safari/iOS PWA sessionStorage patch
if (window.matchMedia('(display-mode: standalone)').matches) {
  if (!sessionStorage.length && localStorage.getItem('sessionBackup')) {
    const backup = JSON.parse(localStorage.getItem('sessionBackup'))
    for (const k in backup) sessionStorage.setItem(k, backup[k])
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
  if (err.message.includes("auth")) {
    handleAuthError(err)
  }
  console.error("Unhandled error:", err)
}

initAnalytics()
bindRouter(router)

// Auth store init
const authStore = useAuthStore()
await authStore.checkRedirectResult()

// Mount app
app.mount('#app')