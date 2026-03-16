// src/utils/notificationCheck.js
import { useAuthStore } from '@/stores/authStore'
import { isNativePackagedApp } from '@/utils/nativeAuthSupport'

export function hasNotificationSetup(localNotifications) {
  try {
    // Prefer explicit local notifications object if provided
    const n = localNotifications ||
      (useAuthStore()?.user?.preferences?.notifications) ||
      (useAuthStore()?.user?.notifications) || {}

    const acceptsBrowserPush = !isNativePackagedApp()

    // Accept either boolean toggles or channels array
    if (Array.isArray(n?.channels)) {
      const set = new Set(n.channels.map((s) => String(s).toLowerCase()))
      return (
        set.has('email') ||
        set.has('whatsapp') ||
        set.has('sms') ||
        set.has('voice_call') ||
        (acceptsBrowserPush && set.has('pwa'))
      )
    }

    return !!(n?.email || n?.whatsapp || n?.sms || n?.voice_call || (acceptsBrowserPush && (n?.push || n?.pwa)))
  } catch {
    return false
  }
}
