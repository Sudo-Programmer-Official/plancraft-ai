// src/utils/notificationCheck.js
import { useAuthStore } from '@/stores/authStore'

export function hasNotificationSetup(localNotifications) {
  try {
    // Prefer explicit local notifications object if provided
    const n = localNotifications ||
      (useAuthStore()?.user?.preferences?.notifications) ||
      (useAuthStore()?.user?.notifications) || {}

    // Accept either boolean toggles or channels array
    if (Array.isArray(n?.channels)) {
      const set = new Set(n.channels.map((s) => String(s).toLowerCase()))
      return set.has('email') || set.has('pwa') || set.has('whatsapp')
    }

    return !!(n?.email || n?.push || n?.pwa || n?.whatsapp)
  } catch {
    return false
  }
}

