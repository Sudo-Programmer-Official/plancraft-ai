import {
  getCurrentSubscription,
  ensurePermission as ensureBrowserPushPermission,
  isPushSupported,
  registerPushSubscription,
} from '@/services/pushService'
import { getPreferences } from '@/services/settingsService'
import { isNativePackagedApp } from '@/utils/nativeAuthSupport'
import { normalizeNotificationSound } from '@/utils/notificationSound'
import {
  listPendingNativeTaskReminders,
  requestNativeReminderPermissions,
  scheduleNativeTestReminder,
} from '@/services/nativeReminderService'
import {
  getNativePushPermissionStatus,
  getNativePushProfileSnapshot,
  requestNativePushPermissionAndRegister,
  sendNativePushTest,
  syncNativePushRegistrationNow,
} from '@/services/nativePushService'

function getBrowserPermission() {
  if (typeof globalThis === 'undefined' || typeof globalThis.Notification === 'undefined') {
    return 'unsupported'
  }
  return String(globalThis.Notification.permission || 'prompt').toLowerCase()
}

export async function getNotificationDebugSnapshot(authStore) {
  const nativeSupported = isNativePackagedApp()
  const pushSupported = isPushSupported()
  const subscription = pushSupported ? await getCurrentSubscription().catch(() => null) : null
  const browserPermission = getBrowserPermission()
  const nativePermission = nativeSupported
    ? await getNativePushPermissionStatus().catch(() => ({ raw: 'unsupported', granted: false }))
    : { raw: 'unsupported', granted: false }
  const nativeProfile = nativeSupported
    ? await getNativePushProfileSnapshot(authStore).catch(() => ({
        platform: 'unknown',
        pushToken: null,
        pushTokenPlatform: null,
        pushPermissionState: nativePermission.raw,
        pushTokenUpdatedAt: null,
      }))
    : {
        platform: 'web',
        pushToken: null,
        pushTokenPlatform: null,
        pushPermissionState: nativePermission.raw,
        pushTokenUpdatedAt: null,
      }
  const pendingNative = nativeSupported
    ? await listPendingNativeTaskReminders().catch(() => [])
    : []

  return {
    platform: nativeProfile.platform || (nativeSupported ? 'native' : 'web'),
    browserPermission,
    pushSupported,
    subscriptionEndpoint: subscription?.endpoint || null,
    nativePermission,
    nativeProfile,
    pendingNative,
  }
}

export async function requestNotificationAccess(authStore) {
  if (isNativePackagedApp()) {
    const permission = await requestNativePushPermissionAndRegister(authStore)
    if (permission?.granted) {
      void syncNativePushRegistrationNow(authStore).catch((error) => {
        console.warn('[NativePush] deferred registration sync failed', error?.message || error)
      })
    }
    return permission
  }

  if (!isPushSupported()) {
    return { granted: false, raw: 'unsupported' }
  }

  const granted = await ensureBrowserPushPermission()
  return {
    granted,
    raw: granted
      ? 'granted'
      : String(globalThis.Notification?.permission || 'denied').toLowerCase(),
  }
}

export async function refreshDeviceToken(authStore) {
  if (isNativePackagedApp()) {
    const snapshot = await getNativePushProfileSnapshot(authStore)
    return {
      ok: !!snapshot.pushToken,
      token: snapshot.pushToken,
      platform: snapshot.pushTokenPlatform || snapshot.platform,
      permission: snapshot.pushPermissionState,
      updatedAt: snapshot.pushTokenUpdatedAt || null,
    }
  }

  if (!isPushSupported()) {
    return { ok: false, reason: 'unsupported', token: null }
  }

  const subscription = await getCurrentSubscription().catch(() => null)
  return {
    ok: false,
    reason: 'web-push-only',
    token: null,
    subscriptionEndpoint: subscription?.endpoint || null,
  }
}

export async function registerBrowserSubscription(userId) {
  if (!isPushSupported()) {
    return { ok: false, reason: 'unsupported' }
  }
  return registerPushSubscription(userId)
}

export async function sendImmediateNativePushTest({ title, body } = {}) {
  return sendNativePushTest({ title, body })
}

export async function scheduleOneMinuteNotificationTest({ title, body } = {}) {
  if (isNativePackagedApp()) {
    const uid = globalThis?.localStorage?.getItem?.('uid') || null
    let sound = 'default'
    if (uid) {
      try {
        const prefs = await getPreferences(uid)
        sound = normalizeNotificationSound(
          prefs?.notifications?.sound || prefs?.reminders?.sound || 'default',
        )
      } catch (error) {
        console.warn('[NotificationDebug] preference lookup failed', error?.message || error)
      }
    }
    return scheduleNativeTestReminder({
      title: title || 'PlanCraftAI reminder test',
      body: body || 'This notification should appear in about one minute.',
      delaySeconds: 60,
      type: 'wake_up',
      sound,
    })
  }

  return {
    ok: false,
    reason: 'native-only',
    message:
      'Background 1-minute scheduling uses the native reminder plugin. Web fallback is not reliable when the tab is closed.',
  }
}

export async function requestNativeReminderAccess() {
  return requestNativeReminderPermissions()
}
