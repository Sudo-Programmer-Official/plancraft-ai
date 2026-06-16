<template>
  <main class="app-page-shell text-white">
    <section class="app-page-frame space-y-6">
      <header class="space-y-2">
        <p class="text-xs uppercase tracking-[0.28em] text-indigo-200/80">Diagnostics</p>
        <h1 class="text-3xl sm:text-4xl font-bold">Notification Debug</h1>
        <p class="max-w-3xl text-sm sm:text-base text-slate-300">
          Use this screen to verify notification permission state, inspect the current device token or subscription,
          and trigger immediate or scheduled reminder tests on this device.
        </p>
      </header>

      <section class="grid gap-4 lg:grid-cols-[1.1fr,0.9fr]">
        <div class="rounded-3xl border border-white/10 bg-slate-950/50 p-5 shadow-xl shadow-black/20">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p class="text-xs uppercase tracking-[0.2em] text-slate-400">Status</p>
              <h2 class="text-xl font-semibold text-white">Current Notification State</h2>
            </div>
            <div class="flex flex-wrap gap-2">
              <el-button size="small" plain @click="refreshSnapshot" :loading="loading">
                Refresh
              </el-button>
              <el-button size="small" type="primary" @click="requestAccess" :loading="requesting">
                Request permission
              </el-button>
            </div>
          </div>

          <div class="mt-4 grid gap-3 sm:grid-cols-2">
            <div class="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p class="text-[11px] uppercase tracking-[0.2em] text-slate-400">Platform</p>
              <p class="mt-2 text-lg font-semibold text-white">{{ snapshot.platform || 'unknown' }}</p>
              <p class="text-sm text-slate-400">
                {{ ['ios', 'android'].includes(snapshot.platform) ? 'Native alarm-backed reminders are available.' : 'Browser / PWA notification path is available.' }}
              </p>
            </div>
            <div class="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p class="text-[11px] uppercase tracking-[0.2em] text-slate-400">Browser permission</p>
              <p class="mt-2 text-lg font-semibold text-white">{{ snapshot.browserPermission || 'unknown' }}</p>
              <p class="text-sm text-slate-400">This is the browser Notification API state.</p>
            </div>
            <div class="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p class="text-[11px] uppercase tracking-[0.2em] text-slate-400">Native permission</p>
              <p class="mt-2 text-lg font-semibold text-white">{{ snapshot.nativePermission?.raw || 'unsupported' }}</p>
              <p class="text-sm text-slate-400">This controls local alarm-backed reminders on iOS and Android.</p>
            </div>
            <div class="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p class="text-[11px] uppercase tracking-[0.2em] text-slate-400">Push support</p>
              <p class="mt-2 text-lg font-semibold text-white">{{ snapshot.pushSupported ? 'Enabled' : 'Unavailable' }}</p>
              <p class="text-sm text-slate-400">Browser push requires service worker and VAPID configuration.</p>
            </div>
          </div>
        </div>

        <div class="rounded-3xl border border-white/10 bg-slate-950/50 p-5 shadow-xl shadow-black/20">
          <p class="text-xs uppercase tracking-[0.2em] text-slate-400">Device token</p>
          <h2 class="text-xl font-semibold text-white">Token / Subscription</h2>
          <p class="mt-2 text-sm text-slate-300">
            Native APNs / FCM token registration is wired through the push plugin. On web, this screen shows the current
            browser push subscription endpoint when available.
          </p>

          <div class="mt-4 space-y-3">
            <div class="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p class="text-[11px] uppercase tracking-[0.2em] text-slate-400">Native token</p>
              <pre class="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words text-xs text-slate-100">{{ formattedNativeToken }}</pre>
            </div>
            <div class="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p class="text-[11px] uppercase tracking-[0.2em] text-slate-400">Platform / Updated</p>
              <pre class="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words text-xs text-slate-100">{{ formattedNativeMeta }}</pre>
            </div>
            <div v-if="!isNative" class="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p class="text-[11px] uppercase tracking-[0.2em] text-slate-400">Push subscription</p>
              <pre class="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words text-xs text-slate-100">{{ formattedSubscription }}</pre>
            </div>
          </div>

          <div class="mt-4 flex flex-wrap gap-2">
            <el-button size="small" @click="refreshToken" :loading="refreshingToken">
              Refresh token
            </el-button>
            <el-button v-if="!isNative && snapshot.pushSupported && authStore.user?.uid" size="small" plain @click="registerSubscription" :loading="registering">
              Register browser push
            </el-button>
          </div>
        </div>
      </section>

      <section class="grid gap-4 lg:grid-cols-2">
        <div class="rounded-3xl border border-indigo-400/20 bg-indigo-950/40 p-5 shadow-xl shadow-black/20">
          <p class="text-xs uppercase tracking-[0.2em] text-indigo-200/80">Immediate test</p>
          <h2 class="text-xl font-semibold text-white">Send now</h2>
          <p class="mt-2 text-sm text-indigo-100/80">
            Fires a remote push test on native devices. Web fallback can still show a local foreground notification.
          </p>
          <div class="mt-4 flex flex-wrap gap-2">
            <el-button type="primary" @click="sendImmediateTest" :loading="sendingImmediate">
              Send immediate native push
            </el-button>
          </div>
        </div>

        <div class="rounded-3xl border border-amber-400/20 bg-amber-950/35 p-5 shadow-xl shadow-black/20">
          <p class="text-xs uppercase tracking-[0.2em] text-amber-200/80">Scheduled test</p>
          <h2 class="text-xl font-semibold text-white">1-minute reminder</h2>
          <p class="mt-2 text-sm text-amber-100/80">
            Verifies that the local reminder path can survive backgrounding or app closure on iOS and Android.
          </p>
          <div class="mt-4 flex flex-wrap gap-2">
            <el-button class="!border-amber-300/40 !bg-amber-500/10 !text-amber-50 hover:!border-amber-200/60" plain @click="scheduleOneMinuteTest" :loading="scheduling">
              Schedule 1-minute local reminder
            </el-button>
          </div>
        </div>
      </section>

      <section class="grid gap-4 lg:grid-cols-[1fr,0.95fr]">
        <div class="rounded-3xl border border-white/10 bg-slate-950/50 p-5 shadow-xl shadow-black/20">
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="text-xs uppercase tracking-[0.2em] text-slate-400">Pending</p>
              <h2 class="text-xl font-semibold text-white">Native pending reminders</h2>
            </div>
            <span class="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
              {{ pendingReminders.length }} items
            </span>
          </div>

          <div v-if="pendingReminders.length" class="mt-4 space-y-3">
            <article
              v-for="item in pendingReminders"
              :key="item.id"
              class="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
            >
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p class="font-semibold text-white">{{ item.title || 'Untitled reminder' }}</p>
                  <p class="text-sm text-slate-400">{{ item.body || 'No body text' }}</p>
                </div>
                <p class="text-xs text-slate-400">{{ formatWhen(item.scheduledAt) }}</p>
              </div>
              <div class="mt-2 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.16em] text-slate-300">
                <span class="rounded-full border border-white/10 px-2 py-1">type: {{ item.type || 'n/a' }}</span>
                <span class="rounded-full border border-white/10 px-2 py-1">task: {{ item.taskId || 'n/a' }}</span>
              </div>
            </article>
          </div>
          <p v-else class="mt-4 text-sm text-slate-400">
            No pending native reminders detected.
          </p>
        </div>

        <div class="rounded-3xl border border-white/10 bg-slate-950/50 p-5 shadow-xl shadow-black/20">
          <p class="text-xs uppercase tracking-[0.2em] text-slate-400">Notes</p>
          <h2 class="text-xl font-semibold text-white">What this test proves</h2>
          <ul class="mt-3 space-y-2 text-sm text-slate-300">
            <li>Permission prompt behavior on this device.</li>
            <li>Native push token persistence on the backend profile.</li>
            <li>Local alarm / notification delivery while the app is backgrounded.</li>
            <li>Pending reminder persistence in the native scheduler.</li>
          </ul>
          <div class="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-950/30 p-4 text-sm text-emerald-100">
            If the native token is empty on mobile, the registration flow has not completed or the backend profile write failed.
          </div>
        </div>
      </section>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { Capacitor } from '@capacitor/core'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/authStore'
import {
  getNotificationDebugSnapshot,
  requestNotificationAccess,
  refreshDeviceToken,
  registerBrowserSubscription,
  scheduleOneMinuteNotificationTest,
  sendImmediateNativePushTest,
} from '@/services/notificationDebugService'

const authStore = useAuthStore()
const isNative = !!Capacitor?.isNativePlatform?.()

const loading = ref(false)
const requesting = ref(false)
const refreshingToken = ref(false)
const registering = ref(false)
const sendingImmediate = ref(false)
const scheduling = ref(false)

const snapshot = ref({
  platform: 'unknown',
  browserPermission: 'unknown',
  pushSupported: false,
  subscriptionEndpoint: null,
  nativePermission: { raw: 'unsupported', granted: false },
  nativeProfile: null,
  pendingNative: [],
})

const pendingReminders = computed(() => Array.isArray(snapshot.value.pendingNative) ? snapshot.value.pendingNative : [])

const formattedNativeToken = computed(() => {
  const token = snapshot.value.nativeProfile?.pushToken || null
  if (!token) return 'No native push token available on this device.'
  if (token.length <= 120) return token
  return `${token.slice(0, 48)}…${token.slice(-24)}`
})

const formattedNativeMeta = computed(() => {
  const platform = snapshot.value.nativeProfile?.pushTokenPlatform || snapshot.value.nativeProfile?.platform || 'unknown'
  const permission = snapshot.value.nativeProfile?.pushPermissionState || snapshot.value.nativePermission?.raw || 'unknown'
  const updatedAt = snapshot.value.nativeProfile?.pushTokenUpdatedAt || 'never'
  return `platform: ${platform}\npermission: ${permission}\nupdatedAt: ${updatedAt}`
})

const formattedSubscription = computed(() => {
  const endpoint = snapshot.value.subscriptionEndpoint
  if (!endpoint) return 'No browser push subscription registered.'
  if (endpoint.length <= 120) return endpoint
  return `${endpoint.slice(0, 48)}…${endpoint.slice(-24)}`
})

function formatWhen(value) {
  if (!value) return 'unscheduled'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString()
}

async function refreshSnapshot() {
  loading.value = true
  try {
    snapshot.value = await getNotificationDebugSnapshot(authStore)
  } catch (error) {
    console.warn('Failed to refresh notification snapshot', error)
    ElMessage.error(error?.message || 'Failed to load notification state')
  } finally {
    loading.value = false
  }
}

async function requestAccess() {
  requesting.value = true
  try {
    const result = await requestNotificationAccess(authStore)
    ElMessage.success(result?.granted ? 'Notification permission granted' : 'Notification permission not granted')
    await refreshSnapshot()
  } catch (error) {
    console.warn('Failed to request notification access', error)
    ElMessage.error(error?.message || 'Failed to request permission')
  } finally {
    requesting.value = false
  }
}

async function refreshToken() {
  refreshingToken.value = true
  try {
    const result = await refreshDeviceToken(authStore)
    if (result?.ok) {
      ElMessage.success('Native token loaded')
    } else {
      ElMessage.warning('No native device token is currently available.')
    }
    await refreshSnapshot()
  } catch (error) {
    console.warn('Failed to refresh token', error)
    ElMessage.error(error?.message || 'Failed to refresh token')
  } finally {
    refreshingToken.value = false
  }
}

async function registerSubscription() {
  registering.value = true
  try {
    const result = await registerBrowserSubscription(authStore.user?.uid)
    if (result?.ok) {
      ElMessage.success('Browser push subscription registered')
    } else {
      ElMessage.warning(result?.error || result?.reason || 'Failed to register browser push')
    }
    await refreshSnapshot()
  } catch (error) {
    console.warn('Failed to register browser push', error)
    ElMessage.error(error?.message || 'Failed to register browser push')
  } finally {
    registering.value = false
  }
}

async function sendImmediateTest() {
  sendingImmediate.value = true
  try {
    const result = isNative
      ? await sendImmediateNativePushTest()
      : { ok: false, reason: 'native-only', message: 'Remote push tests are only available in the native app.' }
    if (result?.ok || result?.success) {
      ElMessage.success('Remote push test sent')
    } else {
      ElMessage.warning(result?.message || result?.reason || 'Failed to send immediate test')
    }
    await refreshSnapshot()
  } catch (error) {
    console.warn('Failed to send immediate test', error)
    ElMessage.error(error?.message || 'Failed to send immediate test')
  } finally {
    sendingImmediate.value = false
  }
}

async function scheduleOneMinuteTest() {
  scheduling.value = true
  try {
    const result = await scheduleOneMinuteNotificationTest()
    if (result?.ok) {
      ElMessage.success('1-minute reminder scheduled')
    } else {
      ElMessage.warning(result?.message || result?.reason || 'Failed to schedule reminder')
    }
    await refreshSnapshot()
  } catch (error) {
    console.warn('Failed to schedule reminder test', error)
    ElMessage.error(error?.message || 'Failed to schedule reminder')
  } finally {
    scheduling.value = false
  }
}

onMounted(() => {
  refreshSnapshot()
})
</script>
