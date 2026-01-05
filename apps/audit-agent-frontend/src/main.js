// Global styles
import './assets/tailwind.scss'
import './assets/theme.scss'
import './assets/styles/scrollbar.css'
import 'element-plus/dist/index.css'

import { initTheme } from '@/composables/useTheme'
initTheme()

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
import { setupLinkedInTag } from './analytics/linkedin.js'

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

// Firebase auth export for quick token refreshes
import { auth } from '@/firebase/init'

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
// LinkedIn Insight Tag (env-driven)
try { setupLinkedInTag() } catch {}

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

// 🧭 Keep canonical tag in sync with current route (prevents alternate/redirect warnings)
try {
  const ensureCanonical = (path) => {
    const origin = window?.location?.origin
    if (!origin) return
    const href = `${origin}${path || '/'}`
    let link = document.querySelector("link[rel='canonical']")
    if (!link) {
      link = document.createElement('link')
      link.setAttribute('rel', 'canonical')
      document.head.appendChild(link)
    }
    link.setAttribute('href', href)
  }
  router.afterEach((to) => ensureCanonical(to.fullPath || '/'))
} catch {}

// Mount app
app.mount('#app')

// 🧩 Persist session data + auth backup in iOS/Safari PWA
try {
  const isStandalone =
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone
  if (isStandalone) {
    // Restore any prior session backup
    try {
      const raw = localStorage.getItem('sessionBackup') || '{}'
      const backup = JSON.parse(raw)
      // Support old shape (plain key-value) and new shape (with session)
      const sessionData = backup && typeof backup === 'object' && backup.session ? backup.session : backup
      if (sessionData && !sessionStorage.length) {
        Object.keys(sessionData).forEach((k) => sessionStorage.setItem(k, sessionData[k]))
      }
      // Restore auth backup if Firebase layer was cleared
      if (backup && backup.user && !localStorage.getItem('user')) {
        localStorage.setItem('user', backup.user)
      }
      if (backup && backup.token && !localStorage.getItem('token')) {
        localStorage.setItem('token', backup.token)
      }
    } catch {}

    window.addEventListener('beforeunload', () => {
      try {
        const dump = { token: null, user: null, session: {} }
        dump.token = localStorage.getItem('token')
        dump.user = localStorage.getItem('user')
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i)
          dump.session[key] = sessionStorage.getItem(key)
        }
        localStorage.setItem('sessionBackup', JSON.stringify(dump))
      } catch {}
    })
  }
} catch {}

// 🔄 Foreground refresh: when tab/app becomes visible, refresh auth
try {
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState !== 'visible') return
    try {
      const user = auth?.currentUser
      if (user) {
        const token = await user.getIdToken(true)
        localStorage.setItem('token', token)
        try { authStore.token = token } catch {}
      }
    } catch (e) {
      console.warn('[Auth] Foreground token refresh failed', e)
    }

    // Optionally refresh long-lived app token if feature flag is enabled
    try {
      if (import.meta.env.VITE_USE_APP_TOKEN === '1') {
        const mod = await import('@/services/appTokenService.js')
        await mod.refreshAppToken().catch(() => {})
      }
    } catch {}
  })
} catch {}

// Optional startup nudge: delay a bit to ensure Firebase rehydration before first refresh
try {
  if (import.meta.env.VITE_USE_APP_TOKEN === '1') {
    setTimeout(async () => {
      try {
        const mod = await import('@/services/appTokenService.js')
        await mod.refreshAppToken().catch(() => {})
      } catch {}
    }, 1800)
  }
} catch {}
