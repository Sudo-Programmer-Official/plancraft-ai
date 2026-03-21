<template>
  <el-dialog
    v-model="open"
    class="setup-prompt"
    modal-class="setup-prompt-overlay"
    width="min(620px, calc(100vw - 24px))"
    :close-on-click-modal="false"
    :show-close="true"
    :destroy-on-close="false"
    :style="{
      background: 'linear-gradient(145deg, #1e1b4b, #312e81, #4c1d95)',
      color: '#e2e8f0',
      borderRadius: '0.75rem',
      boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
      border: '1px solid rgba(255,255,255,0.08)',
      backdropFilter: 'blur(12px)'
    }"
    @close="handleDialogClose"
  >
    <template #header>
      <div class="text-center">
        <h2 class="text-2xl font-bold text-white mb-1">Quick Setup</h2>
        <p class="text-indigo-200 text-sm leading-snug">
          Set your timezone, reminder channels, and phone once so reminders work without another trip to settings.
        </p>
      </div>
    </template>

    <div class="setup-prompt__shell">
      <div v-if="showLoadingShell" class="setup-prompt__skeleton" aria-hidden="true">
        <div class="setup-prompt__skeleton-block setup-prompt__skeleton-block--hero" />
        <div class="setup-prompt__skeleton-block" />
        <div class="setup-prompt__skeleton-block" />
        <div class="setup-prompt__skeleton-block setup-prompt__skeleton-block--short" />
      </div>

      <div v-else v-loading="loading && contentReady" class="setup-prompt__content space-y-5 mt-4">
        <section class="rounded-2xl border border-white/10 bg-slate-950/30 p-4 space-y-3">
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p class="text-xs uppercase tracking-[0.28em] text-indigo-200/80">Progress</p>
            <p class="text-sm text-slate-200">
              {{ setupState.completedSteps }}/{{ setupState.totalSteps }} setup items complete
            </p>
          </div>
          <span
            class="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold"
            :class="setupState.requiredComplete ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200' : 'border-amber-400/40 bg-amber-500/10 text-amber-100'"
          >
            {{ setupState.requiredComplete ? 'Core setup complete' : 'Setup in progress' }}
          </span>
        </div>
        <div class="h-2 overflow-hidden rounded-full bg-white/10">
          <div class="setup-progress-bar" :style="{ width: `${setupState.completionPercent}%` }" />
        </div>
        <p v-if="refreshingRemote" class="text-xs text-indigo-200/80">
          Syncing your saved setup details...
        </p>
        <div class="flex flex-wrap gap-2">
          <span
            v-for="step in setupState.steps"
            :key="step.key"
            class="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs"
            :class="step.complete ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200' : 'border-white/10 bg-white/5 text-slate-300'"
          >
            <span>{{ step.complete ? '✓' : '•' }}</span>
            <span>{{ step.label }}</span>
            <span v-if="!step.required" class="text-[10px] uppercase tracking-[0.2em] text-slate-400">Optional</span>
          </span>
        </div>
        <p v-if="missingRequiredLabels.length" class="text-xs text-amber-200/90">
          Missing: {{ missingRequiredLabels.join(', ') }}
        </p>
        </section>

        <section class="setup-card">
        <div class="setup-card__header">
          <div>
            <div class="setup-card__title">🌎 Timezone</div>
            <p class="setup-card__copy">Detected locally and used for reminders, meetings, and daily planning.</p>
          </div>
          <span class="setup-status" :class="timezoneReady ? 'setup-status--complete' : 'setup-status--pending'">
            {{ timezoneReady ? 'Ready' : 'Needs review' }}
          </span>
        </div>
        <div class="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div class="rounded-xl border border-white/10 bg-slate-950/30 px-4 py-3 text-sm text-indigo-100">
            {{ tz }}
          </div>
          <el-button size="small" class="!rounded-lg font-semibold" @click="confirmTimezone">
            Confirm timezone
          </el-button>
        </div>
        </section>

        <section class="setup-card">
        <div class="setup-card__header">
          <div>
            <div class="setup-card__title">📱 Reminder Phone</div>
            <p class="setup-card__copy">
              Used for WhatsApp, SMS, and voice reminders so you can finish setup without going to settings.
            </p>
          </div>
          <span class="setup-status" :class="phoneReady ? 'setup-status--complete' : 'setup-status--pending'">
            {{ phoneReady ? 'Saved' : 'Missing' }}
          </span>
        </div>
        <div class="mt-3 space-y-2">
          <el-input
            v-model="reminderPhone"
            placeholder="+1 234 567 8901"
            clearable
            class="w-full"
            @input="markDirty"
          />
          <p class="text-xs text-slate-400">
            Format as an international number. One phone is applied to your reminder channels by default.
          </p>
        </div>
        </section>

        <section class="setup-card">
        <div class="setup-card__header">
          <div>
            <div class="setup-card__title">🔔 Reminder Channels</div>
            <p class="setup-card__copy">Choose how PlanCraftAI should reach you first.</p>
          </div>
          <span class="setup-status" :class="channelsReady ? 'setup-status--complete' : 'setup-status--pending'">
            {{ channelsReady ? 'Configured' : 'Pick at least one' }}
          </span>
        </div>
        <div class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label
            v-for="channel in channelOptions"
            :key="channel.key"
            class="channel-option"
            :class="{ 'channel-option--active': channelState[channel.key] }"
          >
            <input
              :checked="channelState[channel.key]"
              type="checkbox"
              class="accent-indigo-500"
              @change="toggleChannel(channel.key, $event.target.checked)"
            />
            <span class="flex-1">
              <span class="block text-sm font-medium text-white">{{ channel.label }}</span>
              <span class="block text-xs text-slate-400">{{ channel.copy }}</span>
            </span>
          </label>
        </div>
        </section>

        <section v-if="showBrowserNotifications" class="setup-card">
        <div class="setup-card__header">
          <div>
            <div class="setup-card__title">🛎️ Browser Push</div>
            <p class="setup-card__copy">Optional. Enable device push now if you want instant browser reminders.</p>
          </div>
          <span class="setup-status" :class="pushGranted ? 'setup-status--complete' : 'setup-status--pending'">
            {{ pushGranted ? 'Enabled' : 'Optional' }}
          </span>
        </div>
        <div class="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p class="text-sm text-slate-300">
            {{ pushGranted ? 'Browser push is ready on this device.' : 'You can skip this and still finish quick setup.' }}
          </p>
          <el-button
            size="small"
            type="primary"
            class="!rounded-lg font-semibold"
            :loading="loadingPush"
            :disabled="pushGranted"
            @click="enablePush"
          >
            {{ pushGranted ? 'Enabled ✓' : 'Enable push' }}
          </el-button>
        </div>
        </section>

        <p v-if="saveError" class="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {{ saveError }}
        </p>
        <p v-else-if="saveSuccess" class="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          {{ saveSuccess }}
        </p>
      </div>
    </div>

    <template #footer>
      <div class="setup-prompt__footer">
        <span class="setup-prompt__footer-copy">
          You can continue later from the dashboard setup banner or
          <RouterLink to="/settings?tab=account-quick-setup" class="text-indigo-300 hover:text-indigo-200 underline">
            Settings → Quick Setup
          </RouterLink>.
        </span>
        <div class="setup-prompt__footer-actions">
          <el-button
            class="setup-prompt__footer-button setup-prompt__footer-button--secondary !rounded-lg"
            :disabled="saving"
            @click="dismiss"
          >
            Later
          </el-button>
          <el-button
            type="primary"
            class="setup-prompt__footer-button !rounded-lg font-semibold"
            :loading="saving"
            @click="saveAndClose"
          >
            {{ setupState.requiredComplete ? 'Complete setup' : 'Save progress' }}
          </el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { doc, setDoc } from 'firebase/firestore'
import { db } from '@/firebase/init'
import { hasSubscription, registerPushSubscription } from '@/services/pushService'
import { getIntegrations, getPreferences, getProfile, updateIntegrations, updatePreferences } from '@/services/settingsService'
import { useAuthFlags } from '@/composables/useAuthFlags'
import { useAuthStore } from '@/stores/authStore'
import { guessCountryFromLocale, normalizePhone } from '@/utils/phoneUtils'
import { isNativePackagedApp } from '@/utils/nativeAuthSupport'
import {
  buildQuickSetupState,
  clearQuickSetupSnooze,
  dispatchQuickSetupUpdated,
  getIncompleteQuickSetupLabels,
  normalizeQuickSetupChannels,
  readQuickSetupState,
  snoozeQuickSetup,
  writeQuickSetupState,
} from '@/utils/quickSetup'

const props = defineProps({
  open: { type: Boolean, default: true },
  launchSource: { type: String, default: 'manual' },
})
const emit = defineEmits(['close', 'done', 'updated'])

const authStore = useAuthStore()
const { isGuest } = useAuthFlags()

const open = ref(props.open)
const contentReady = ref(false)
const hasLoadedOnce = ref(false)
const loading = ref(false)
const refreshingRemote = ref(false)
const saving = ref(false)
const loadingPush = ref(false)
const saveError = ref('')
const saveSuccess = ref('')
const dirty = ref(false)
const tz = ref('UTC')
const reminderPhone = ref('')
const pushGranted = ref(false)
const showLoadingShell = computed(() => loading.value && !contentReady.value)
let suppressDialogCloseEmit = false
const loadedRemoteUserId = ref('')

const showBrowserNotifications = computed(() => !isNativePackagedApp())
const timezoneReady = computed(() => !!tz.value && tz.value !== 'UTC')
const channelState = reactive({
  email: true,
  whatsapp: false,
  sms: false,
  voice_call: false,
})
const channelOptions = [
  { key: 'email', label: 'Email', copy: 'Fallback reminders to your account email.' },
  { key: 'whatsapp', label: 'WhatsApp', copy: 'Best for quick reminder nudges and async follow-ups.' },
  { key: 'sms', label: 'SMS', copy: 'Text reminders to the phone you save here.' },
  { key: 'voice_call', label: 'Voice Call', copy: 'Phone call reminders for time-sensitive tasks.' },
]

const existingPreferenceIntegrations = ref({
  googleCalendar: false,
  slack: false,
  discord: false,
  outlook: false,
  whatsapp: false,
})
const existingNotifications = ref({
  discord: false,
})
const existingIntegrations = ref({
  whatsapp: { phone: '' },
  sms: { phone: '' },
  discord: { webhook: '' },
  slack: { userId: '', token: '' },
  email: '',
})

const selectedChannels = computed(() =>
  normalizeQuickSetupChannels(
    [
      channelState.email && 'email',
      channelState.whatsapp && 'whatsapp',
      channelState.sms && 'sms',
      channelState.voice_call && 'voice_call',
      showBrowserNotifications.value && pushGranted.value && 'pwa',
    ].filter(Boolean)
  )
)
const channelsReady = computed(() => selectedChannels.value.length > 0)
const phoneReady = computed(() => !!String(reminderPhone.value || '').trim())
const setupState = computed(() =>
  buildQuickSetupState({
    timezone: tz.value,
    channels: selectedChannels.value,
    phone: reminderPhone.value,
    pushGranted: pushGranted.value,
    isNative: isNativePackagedApp(),
  })
)
const missingRequiredLabels = computed(() => getIncompleteQuickSetupLabels(setupState.value))

function withTimeout(promise, ms = 8000, label = 'request') {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    Promise.resolve(promise)
      .then((value) => {
        clearTimeout(timer)
        resolve(value)
      })
      .catch((error) => {
        clearTimeout(timer)
        reject(error)
      })
  })
}

function getSetupUserId() {
  return authStore?.user?.uid || localStorage.getItem('uid') || ''
}

function markDirty() {
  dirty.value = true
  saveError.value = ''
  saveSuccess.value = ''
}

function emitSetupState(state = setupState.value) {
  writeQuickSetupState(state)
  dispatchQuickSetupUpdated(state)
  emit('updated', state)
}

function applyChannels(channels) {
  const set = new Set(normalizeQuickSetupChannels(channels))
  channelState.email = set.has('email')
  channelState.whatsapp = set.has('whatsapp')
  channelState.sms = set.has('sms')
  channelState.voice_call = set.has('voice_call')
  pushGranted.value =
    set.has('pwa') ||
    (
      showBrowserNotifications.value &&
      typeof globalThis !== 'undefined' &&
      typeof globalThis.Notification !== 'undefined' &&
      globalThis.Notification.permission === 'granted'
    )
}

function deriveChannels(notifications = {}) {
  const direct = normalizeQuickSetupChannels(notifications?.channels)
  if (direct.length) return direct
  return normalizeQuickSetupChannels([
    notifications?.email && 'email',
    (notifications?.push || notifications?.pwa) && 'pwa',
    notifications?.whatsapp && 'whatsapp',
    notifications?.sms && 'sms',
    notifications?.voice_call && 'voice_call',
  ])
}

async function loadSetup() {
  loading.value = true
  saveError.value = ''
  try {
    const stored = readQuickSetupState()
    const guessedTz = localStorage.getItem('user_timezone') || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    tz.value = stored?.timezone || guessedTz || 'UTC'
    reminderPhone.value = stored?.phone || ''
    applyChannels(stored?.channels?.length ? stored.channels : ['email'])
    emitSetupState()
    contentReady.value = true
    hasLoadedOnce.value = true
    dirty.value = false
    loading.value = false

    const userId = getSetupUserId()
    loadedRemoteUserId.value = userId || ''
    if (userId) {
      refreshingRemote.value = true
      const [prefResult, integrationsResult, userResult] = await Promise.allSettled([
        withTimeout(getPreferences(userId), 8000, 'quick setup preferences'),
        withTimeout(getIntegrations(userId), 8000, 'quick setup integrations'),
        withTimeout(getProfile(userId), 8000, 'quick setup profile'),
      ])

      const prefData = prefResult.status === 'fulfilled' ? (prefResult.value || {}) : {}
      const integrationsData = integrationsResult.status === 'fulfilled' ? (integrationsResult.value || {}) : {}
      const userData = userResult.status === 'fulfilled' ? (userResult.value || {}) : {}

      if (prefResult.status === 'rejected') {
        console.warn('[QuickSetup] preferences load failed', prefResult.reason?.message || prefResult.reason)
      }
      if (integrationsResult.status === 'rejected') {
        console.warn('[QuickSetup] integrations load failed', integrationsResult.reason?.message || integrationsResult.reason)
      }
      if (userResult.status === 'rejected') {
        console.warn('[QuickSetup] profile load failed', userResult.reason?.message || userResult.reason)
      }

      existingPreferenceIntegrations.value = {
        googleCalendar: !!prefData?.integrations?.googleCalendar,
        slack: !!prefData?.integrations?.slack,
        discord: !!prefData?.integrations?.discord,
        outlook: !!prefData?.integrations?.outlook,
        whatsapp: !!prefData?.integrations?.whatsapp,
      }
      existingNotifications.value = {
        discord: !!prefData?.notifications?.discord,
      }

      existingIntegrations.value = {
        whatsapp: { ...(integrationsData?.whatsapp || {}), phone: integrationsData?.whatsapp?.phone || '' },
        sms: { ...(integrationsData?.sms || {}), phone: integrationsData?.sms?.phone || '' },
        discord: { ...(integrationsData?.discord || {}), webhook: integrationsData?.discord?.webhook || '' },
        slack: {
          ...(integrationsData?.slack || {}),
          userId: integrationsData?.slack?.userId || '',
          token: integrationsData?.slack?.token || '',
        },
        email: integrationsData?.email || authStore?.user?.email || '',
      }

      if (!dirty.value) {
        const loadedChannels = deriveChannels(prefData?.notifications || {})
        if (loadedChannels.length) applyChannels(loadedChannels)

        reminderPhone.value =
          integrationsData?.sms?.phone ||
          integrationsData?.whatsapp?.phone ||
          userData?.phone ||
          authStore?.user?.phone ||
          reminderPhone.value
      }
      emitSetupState()
    }

    if (setupState.value.completed && props.launchSource === 'auto') {
      suppressDialogCloseEmit = true
      open.value = false
      emit('done')
    }
  } catch (error) {
    saveError.value = error?.message || 'Failed to load quick setup.'
  } finally {
    refreshingRemote.value = false
    loading.value = false
    contentReady.value = true
    hasLoadedOnce.value = true
  }
}

async function ensureSetupLoaded(force = false) {
  if (loading.value) return
  if (hasLoadedOnce.value && !force) {
    contentReady.value = true
    return
  }
  contentReady.value = false
  await loadSetup()
}

function confirmTimezone() {
  try {
    localStorage.setItem('user_timezone', tz.value)
  } catch {}
  markDirty()
  emitSetupState()
}

function toggleChannel(key, checked) {
  channelState[key] = !!checked
  markDirty()
  emitSetupState()
}

async function enablePush() {
  if (!showBrowserNotifications.value) return
  try {
    loadingPush.value = true
    saveError.value = ''
    saveSuccess.value = ''
    if (typeof globalThis === 'undefined' || typeof globalThis.Notification === 'undefined') {
      throw new Error('Browser notifications are not supported on this device.')
    }
    const permission = await globalThis.Notification.requestPermission()
    pushGranted.value = permission === 'granted'
    if (pushGranted.value) {
      const uid = authStore?.user?.uid || localStorage.getItem('uid')
      if (uid && !(await hasSubscription())) {
        await registerPushSubscription(String(uid))
      }
      saveSuccess.value = 'Browser notifications enabled.'
    } else if (permission === 'denied') {
      saveError.value =
        'Notifications were blocked. You can enable them later in your browser settings (e.g. click the lock or info icon in the address bar).'
    }
    markDirty()
    emitSetupState()
  } catch (error) {
    saveError.value = error?.message || 'Failed to enable browser push.'
  } finally {
    loadingPush.value = false
  }
}

async function persistQuickSetup() {
  saveError.value = ''
  saveSuccess.value = ''
  saving.value = true
  try {
    const userId = authStore?.user?.uid || localStorage.getItem('uid')
    const normalizedPhone = reminderPhone.value
      ? normalizePhone(reminderPhone.value, guessCountryFromLocale())
      : ''

    reminderPhone.value = normalizedPhone
    confirmTimezone()

    if (userId) {
      const channels = selectedChannels.value
      await withTimeout(updatePreferences(userId, {
        notifications: {
          email: channels.includes('email'),
          push: channels.includes('pwa'),
          whatsapp: channels.includes('whatsapp'),
          sms: channels.includes('sms'),
          voice_call: channels.includes('voice_call'),
          discord: existingNotifications.value.discord,
          calls: channels.includes('sms') || channels.includes('voice_call'),
          channels,
        },
        integrations: existingPreferenceIntegrations.value,
        reminders: {
          enabled: channels.length > 0,
          channels,
        },
      }), 10000, 'quick setup preferences save')

      const mergedIntegrations = {
        ...existingIntegrations.value,
        whatsapp: {
          ...(existingIntegrations.value?.whatsapp || {}),
          phone: normalizedPhone,
        },
        sms: {
          ...(existingIntegrations.value?.sms || {}),
          phone: normalizedPhone,
        },
      }

      await withTimeout(updateIntegrations(userId, mergedIntegrations), 10000, 'quick setup integrations save')
      const profilePatch = {
        updatedAt: new Date(),
      }
      if (normalizedPhone) {
        profilePatch.phone = normalizedPhone
      }
      await withTimeout(
        setDoc(
          doc(db, 'users', userId),
          profilePatch,
          { merge: true }
        ),
        10000,
        'quick setup profile save'
      )

      authStore.user = {
        ...(authStore.user || {}),
        phone: normalizedPhone || null,
      }
      existingIntegrations.value = mergedIntegrations
    }

    clearQuickSetupSnooze()
    const nextState = buildQuickSetupState({
      timezone: tz.value,
      channels: selectedChannels.value,
      phone: reminderPhone.value,
      pushGranted: pushGranted.value,
      isNative: isNativePackagedApp(),
    })
    emitSetupState(nextState)
    dirty.value = false
    saveSuccess.value = nextState.requiredComplete
      ? 'Quick setup complete.'
      : 'Progress saved. You can finish the remaining items later.'
    return nextState
  } catch (error) {
    saveError.value = error?.response?.data?.error || error?.message || 'Failed to save quick setup.'
    return null
  } finally {
    saving.value = false
  }
}

async function saveAndClose() {
  const state = await persistQuickSetup()
  if (!state) return
  suppressDialogCloseEmit = true
  open.value = false
  if (state.completed) emit('done')
  else emit('close')
}

function dismiss() {
  saveError.value = ''
  saveSuccess.value = ''
  emitSetupState()
  dirty.value = false
  snoozeQuickSetup(24)
  suppressDialogCloseEmit = true
  open.value = false
  emit('close')
}

function handleDialogClose() {
  if (suppressDialogCloseEmit) {
    suppressDialogCloseEmit = false
    return
  }
  emitSetupState()
  emit('close')
}

watch(
  () => props.open,
  async (value) => {
    open.value = value
    if (value) {
      clearQuickSetupSnooze()
      await ensureSetupLoaded()
    }
  }
)

onMounted(async () => {
  if (props.open) {
    clearQuickSetupSnooze()
    await ensureSetupLoaded()
  }
})

watch(
  () => authStore.user?.uid,
  async (uid) => {
    if (!open.value || !uid || uid === loadedRemoteUserId.value) return
    await ensureSetupLoaded(true)
  }
)
</script>

<style scoped>
:deep(.setup-prompt-overlay) {
  background: rgba(2, 6, 23, 0.72);
  backdrop-filter: blur(10px);
}

.setup-prompt :deep(.el-dialog) {
  width: min(620px, calc(100vw - 24px));
  max-width: calc(100vw - 24px);
  background: radial-gradient(circle at top left, #1e1b4b 0%, #312e81 45%, #4c1d95 100%);
  color: #e2e8f0;
  border-radius: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(14px);
  overflow: hidden;
  animation: fadeIn 0.35s ease-out;
}

.setup-prompt :deep(.el-dialog__header),
.setup-prompt :deep(.el-dialog__footer) {
  background: transparent;
  border: none;
}

.setup-prompt :deep(.el-dialog__body) {
  min-height: 24rem;
  background: radial-gradient(circle at top left, rgba(30, 27, 75, 0.98), rgba(76, 29, 149, 0.9));
}

.setup-prompt__shell {
  min-height: 24rem;
}

.setup-prompt__content {
  min-height: 24rem;
}

.setup-prompt__skeleton {
  min-height: 24rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-top: 1rem;
}

.setup-prompt__skeleton-block {
  height: 5rem;
  border-radius: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.7), rgba(67, 56, 202, 0.22));
  box-shadow: inset 0 1px 10px rgba(255, 255, 255, 0.03);
  animation: setupPulse 1.1s ease-in-out infinite alternate;
}

.setup-prompt__skeleton-block--hero {
  height: 7rem;
}

.setup-prompt__skeleton-block--short {
  height: 3.5rem;
}

.setup-progress-bar {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #6366f1 0%, #8b5cf6 55%, #ec4899 100%);
  transition: width 0.25s ease;
}

.setup-card {
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: linear-gradient(145deg, rgba(15, 23, 42, 0.55), rgba(49, 46, 129, 0.32));
  border-radius: 1rem;
  padding: 1rem;
  box-shadow: inset 0 1px 10px rgba(255, 255, 255, 0.03);
}

.setup-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.setup-card__title {
  font-weight: 600;
  color: #fff;
}

.setup-card__copy {
  margin-top: 0.25rem;
  font-size: 0.8rem;
  line-height: 1.4;
  color: #cbd5f5;
}

.setup-status {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 0.25rem 0.7rem;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}

.setup-status--complete {
  border-color: rgba(52, 211, 153, 0.35);
  background: rgba(16, 185, 129, 0.12);
  color: #a7f3d0;
}

.setup-status--pending {
  border-color: rgba(251, 191, 36, 0.25);
  background: rgba(251, 191, 36, 0.1);
  color: #fde68a;
}

.channel-option {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  border-radius: 0.9rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(15, 23, 42, 0.36);
  padding: 0.9rem 1rem;
  transition: border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
}

.channel-option--active {
  border-color: rgba(129, 140, 248, 0.45);
  background: rgba(79, 70, 229, 0.18);
  box-shadow: 0 0 0 1px rgba(129, 140, 248, 0.18);
}

.setup-prompt__footer {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.85rem;
}

.setup-prompt__footer-copy {
  font-size: 0.75rem;
  line-height: 1.45;
  text-align: center;
  color: #94a3b8;
}

.setup-prompt__footer-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
  width: 100%;
}

.setup-prompt__footer-button {
  width: 100%;
  min-height: 2.75rem;
  margin: 0 !important;
}

.setup-prompt__footer-button--secondary {
  border-color: rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.96);
  color: #4338ca;
}

@media (min-width: 640px) {
  .setup-prompt__footer {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }

  .setup-prompt__footer-copy {
    flex: 1;
    text-align: left;
  }

  .setup-prompt__footer-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    width: auto;
  }

  .setup-prompt__footer-button {
    width: auto;
    min-width: 8.5rem;
  }
}

@media (max-width: 639px) {
  .setup-prompt :deep(.el-dialog) {
    margin-top: 3vh !important;
  }

  .setup-prompt :deep(.el-dialog__body) {
    padding-left: 1rem;
    padding-right: 1rem;
  }

  .setup-prompt :deep(.el-dialog__footer) {
    padding-top: 0.5rem;
  }

  .setup-card__header {
    flex-direction: column;
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.96);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes setupPulse {
  from {
    opacity: 0.58;
  }
  to {
    opacity: 0.92;
  }
}
</style>
