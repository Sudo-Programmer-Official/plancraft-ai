import { computed, ref } from 'vue'
import { isNativePackagedApp } from '@/utils/nativeAuthSupport'

// Captures the browser's install prompt as early as possible (App.vue imports
// this module) so any screen can offer "Install app" later. iOS Safari has no
// prompt, so there we show the Share → Add to Home Screen instructions.
const deferredPrompt = ref(null)
const installed = ref(false)

function isStandalone() {
  try {
    return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
  } catch {
    return false
  }
}

function isIosSafari() {
  const ua = navigator.userAgent || ''
  return /iphone|ipad|ipod/i.test(ua) && /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua)
}

if (typeof window !== 'undefined' && !isNativePackagedApp()) {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferredPrompt.value = event
  })
  window.addEventListener('appinstalled', () => {
    installed.value = true
    deferredPrompt.value = null
  })
}

export function useInstallApp() {
  const canInstall = computed(() => {
    if (typeof window === 'undefined' || isNativePackagedApp() || installed.value || isStandalone()) return false
    return !!deferredPrompt.value || isIosSafari()
  })

  // Resolves to 'installed' | 'dismissed' | 'ios-instructions' | 'unavailable'.
  async function install() {
    const prompt = deferredPrompt.value
    if (prompt) {
      deferredPrompt.value = null
      prompt.prompt()
      const { outcome } = await prompt.userChoice
      return outcome === 'accepted' ? 'installed' : 'dismissed'
    }
    return isIosSafari() ? 'ios-instructions' : 'unavailable'
  }

  return { canInstall, install }
}
