import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import { watch } from 'vue'
import api from '@/services/api'
import { registerNativePushToken } from '@/services/settingsService'
import { isNativePackagedApp } from '@/utils/nativeAuthSupport'

const PENDING_TOKEN_KEY = 'nativePush.pendingToken'
const PENDING_PLATFORM_KEY = 'nativePush.pendingPlatform'
const PENDING_PERMISSION_KEY = 'nativePush.pendingPermission'
const PENDING_UPDATED_AT_KEY = 'nativePush.pendingUpdatedAt'

let nativePushInitialized = false
let nativePushListenersInstalled = false

function getStorage() {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null
  } catch {
    return null
  }
}

function normalizePermissionState(value, fallback = 'prompt') {
  const raw = String(value || fallback || 'prompt').trim().toLowerCase()
  return {
    raw,
    granted: raw === 'granted' || raw === 'authorized' || raw === 'provisional' || raw === 'ephemeral',
    canPrompt: raw === 'prompt' || raw === 'prompt-with-rationale',
  }
}

function normalizePlatform(value = null) {
  const raw = String(value || Capacitor?.getPlatform?.() || 'native').trim().toLowerCase()
  if (raw === 'ios' || raw === 'android') return raw
  return Capacitor?.getPlatform?.() === 'ios' ? 'ios' : 'android'
}

function cachePendingRegistration(payload = {}) {
  const storage = getStorage()
  if (!storage) return
  try {
    if (payload?.token) storage.setItem(PENDING_TOKEN_KEY, String(payload.token))
    if (payload?.platform) storage.setItem(PENDING_PLATFORM_KEY, String(payload.platform))
    if (payload?.permissionState) storage.setItem(PENDING_PERMISSION_KEY, String(payload.permissionState))
    storage.setItem(PENDING_UPDATED_AT_KEY, new Date().toISOString())
  } catch {
    /* noop */
  }
}

function readPendingRegistration() {
  const storage = getStorage()
  if (!storage) return null
  try {
    const token = storage.getItem(PENDING_TOKEN_KEY)
    if (!token) return null
    return {
      token,
      platform: storage.getItem(PENDING_PLATFORM_KEY) || normalizePlatform(),
      permissionState: storage.getItem(PENDING_PERMISSION_KEY) || 'granted',
      updatedAt: storage.getItem(PENDING_UPDATED_AT_KEY) || null,
    }
  } catch {
    return null
  }
}

function clearPendingRegistration() {
  const storage = getStorage()
  if (!storage) return
  try {
    storage.removeItem(PENDING_TOKEN_KEY)
    storage.removeItem(PENDING_PLATFORM_KEY)
    storage.removeItem(PENDING_PERMISSION_KEY)
    storage.removeItem(PENDING_UPDATED_AT_KEY)
  } catch {
    /* noop */
  }
}

async function resolvePermissionStatus() {
  if (!isNativePackagedApp()) {
    return normalizePermissionState('unsupported', 'unsupported')
  }
  try {
    const result = await PushNotifications.checkPermissions()
    return normalizePermissionState(result?.receive || result?.display || result?.notifications || 'prompt')
  } catch (error) {
    console.warn('[NativePush] checkPermissions failed', error?.message || error)
    return normalizePermissionState('prompt')
  }
}

async function persistRegisteredToken({ token, permissionState, platform, authStore } = {}) {
  const uid = authStore?.user?.uid || null
  if (!uid || !token) {
    cachePendingRegistration({ token, platform, permissionState })
    return { ok: false, reason: uid ? 'missing-token' : 'missing-auth' }
  }

  const payload = {
    pushToken: String(token).trim(),
    pushTokenPlatform: normalizePlatform(platform),
    pushPermissionState: normalizePermissionState(permissionState).raw,
  }

  await registerNativePushToken(payload)
  clearPendingRegistration()
  return { ok: true, payload }
}

async function handleRegistrationEvent(token, authStore) {
  const permission = await resolvePermissionStatus()
  const payload = {
    token: token?.value || token || null,
    permissionState: permission.raw,
    platform: normalizePlatform(),
    authStore,
  }
  if (!payload.token) return { ok: false, reason: 'missing-token' }
  return persistRegisteredToken(payload)
}

async function installNativePushListeners(authStore) {
  if (nativePushListenersInstalled || !isNativePackagedApp()) return
  nativePushListenersInstalled = true

  await PushNotifications.addListener('registration', (token) => {
    handleRegistrationEvent(token, authStore).catch((error) => {
      console.warn('[NativePush] registration handler failed', error?.message || error)
    })
  })

  await PushNotifications.addListener('registrationError', (error) => {
    console.warn('[NativePush] registration error', error?.error || error?.message || error)
  })

  await PushNotifications.addListener('pushNotificationReceived', (notification) => {
    try {
      window.dispatchEvent(new CustomEvent('native-push-received', { detail: notification }))
    } catch {
      /* noop */
    }
  })

  await PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
    try {
      window.dispatchEvent(new CustomEvent('native-push-action-performed', { detail: notification }))
    } catch {
      /* noop */
    }
  })
}

async function ensureNativePushRegistration(authStore, { prompt = false, reason = 'manual' } = {}) {
  if (!isNativePackagedApp()) {
    return normalizePermissionState('unsupported', 'unsupported')
  }

  const permission = prompt
    ? normalizePermissionState((await PushNotifications.requestPermissions())?.receive || 'prompt')
    : await resolvePermissionStatus()

  if (!permission.granted) {
    cachePendingRegistration({ permissionState: permission.raw })
    return permission
  }

  try {
    await PushNotifications.register()
  } catch (error) {
    console.warn('[NativePush] register failed', { reason, message: error?.message || error })
    return permission
  }

  const pending = readPendingRegistration()
  if (pending?.token && authStore?.user?.uid) {
    try {
      await persistRegisteredToken({
        token: pending.token,
        permissionState: pending.permissionState || permission.raw,
        platform: pending.platform || normalizePlatform(),
        authStore,
      })
    } catch (error) {
      console.warn('[NativePush] pending token sync failed', error?.message || error)
    }
  }

  return permission
}

export async function requestNativePushPermissionAndRegister(authStore) {
  return ensureNativePushRegistration(authStore, { prompt: true, reason: 'user-request' })
}

export async function getNativePushPermissionStatus() {
  return resolvePermissionStatus()
}

export async function getNativePushProfileSnapshot(authStore) {
  const permission = await resolvePermissionStatus()
  const uid = authStore?.user?.uid || null
  let profile = null

  if (uid) {
    try {
      const res = await api.get('/settings/profile', { params: { userId: uid } })
      profile = res?.data?.profile || null
    } catch (error) {
      console.warn('[NativePush] get profile snapshot failed', error?.message || error)
    }
  }

  return {
    platform: normalizePlatform(),
    permission,
    profile,
    pushToken: profile?.pushToken || null,
    pushTokenPlatform: profile?.pushTokenPlatform || null,
    pushPermissionState: profile?.pushPermissionState || permission.raw,
    pushTokenUpdatedAt: profile?.pushTokenUpdatedAt || null,
  }
}

export async function sendNativePushTest({ title, body } = {}) {
  const payload = {
    title: String(title || 'PlanCraftAI native push test').trim(),
    body: String(body || 'This is a remote push test from PlanCraftAI.').trim(),
  }
  const res = await api.post('/settings/native-push/test', payload)
  const data = res?.data || {}
  return {
    ok: data?.success !== false,
    ...data,
  }
}

export function initNativePushSync({ authStore } = {}) {
  if (nativePushInitialized || !isNativePackagedApp()) return
  nativePushInitialized = true

  installNativePushListeners(authStore).catch((error) => {
    console.warn('[NativePush] listener install failed', error?.message || error)
  })

  const maybeRegister = (reason) =>
    ensureNativePushRegistration(authStore, { prompt: false, reason }).catch((error) => {
      console.warn('[NativePush] auto register failed', { reason, message: error?.message || error })
    })

  watch(
    () => authStore?.user?.uid || null,
    (uid, prevUid) => {
      if (uid && uid !== prevUid) {
        maybeRegister('auth-ready')
      }
    },
    { immediate: true },
  )

  import('@capacitor/app')
    .then(({ App }) => App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        maybeRegister('app-resume')
      }
    }))
    .catch((error) => {
      console.warn('[NativePush] app state listener unavailable', error?.message || error)
    })
}
