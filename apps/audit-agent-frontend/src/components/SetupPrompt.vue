<template>
  <el-dialog
    v-model="open"
    class="setup-prompt"
    modal-class="setup-prompt-overlay"
    width="min(620px, calc(100vw - 24px))"
    :close-on-click-modal="false"
    :show-close="true"
    :destroy-on-close="false"
    @close="handleDialogClose"
  >
    <template #header>
      <div class="setup-prompt__header">
        <h2 class="setup-prompt__title">Quick Setup</h2>
        <p class="setup-prompt__subtitle">
          Set your timezone and reminder channels once. Add a phone only if you want call or WhatsApp backup.
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

      <div v-else v-loading="loading && contentReady" class="setup-prompt__content">
        <section class="setup-prompt__progress-card">
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p class="setup-prompt__eyebrow">Progress</p>
            <p class="setup-prompt__progress-count">
              {{ setupState.completedSteps }}/{{ setupState.totalSteps }} setup items complete
            </p>
          </div>
          <span
            class="setup-prompt__progress-status"
            :class="setupState.requiredComplete ? 'setup-prompt__progress-status--complete' : 'setup-prompt__progress-status--pending'"
          >
            {{ setupState.requiredComplete ? 'Core setup complete' : 'Setup in progress' }}
          </span>
        </div>
        <div class="setup-prompt__progress-track">
          <div class="setup-progress-bar" :style="{ width: `${setupState.completionPercent}%` }" />
        </div>
        <p v-if="refreshingRemote" class="setup-prompt__sync-copy">
          Syncing your saved setup details...
        </p>
        <div class="flex flex-wrap gap-2">
          <span
            v-for="step in setupState.steps"
            :key="step.key"
            class="setup-prompt__step"
            :class="step.complete ? 'setup-prompt__step--complete' : 'setup-prompt__step--pending'"
          >
            <span>{{ step.complete ? '✓' : '•' }}</span>
            <span>{{ step.label }}</span>
            <span v-if="!step.required" class="setup-prompt__step-optional">Optional</span>
          </span>
        </div>
        <p v-if="missingRequiredLabels.length" class="setup-prompt__missing-copy">
          Missing: {{ missingRequiredLabels.join(', ') }}
        </p>
        </section>

        <section class="setup-card">
        <div class="setup-card__header">
          <div>
            <div class="setup-card__title">🌎 Timezone</div>
            <p class="setup-card__copy">
              Use your device timezone while traveling, or keep a home timezone for planning and reminders.
            </p>
          </div>
          <span class="setup-status" :class="timezoneReady ? 'setup-status--complete' : 'setup-status--pending'">
            {{ timezoneReady ? 'Ready' : 'Needs review' }}
          </span>
        </div>
        <div class="setup-prompt__timezone-modes" role="group" aria-label="Timezone behavior">
          <button
            type="button"
            class="setup-prompt__timezone-mode"
            :class="{ 'setup-prompt__timezone-mode--active': timezoneMode === TIMEZONE_MODES.AUTO }"
            @click="selectTimezoneMode(TIMEZONE_MODES.AUTO)"
          >
            <span>Use device timezone</span>
            <small>Best for travel</small>
          </button>
          <button
            type="button"
            class="setup-prompt__timezone-mode"
            :class="{ 'setup-prompt__timezone-mode--active': timezoneMode === TIMEZONE_MODES.MANUAL }"
            @click="selectTimezoneMode(TIMEZONE_MODES.MANUAL)"
          >
            <span>Choose a home timezone</span>
            <small>Keep one home zone</small>
          </button>
        </div>
        <div v-if="timezoneMode === TIMEZONE_MODES.AUTO" class="setup-prompt__timezone-current">
          <div>
            <span class="setup-prompt__timezone-label">Current device timezone</span>
            <strong>{{ timezoneOptionLabel(detectedTimezone, timezoneNow) }}</strong>
          </div>
          <span class="setup-prompt__timezone-clock">{{ timezoneClockLabel(detectedTimezone, timezoneNow) }}</span>
        </div>
        <label v-else class="setup-prompt__timezone-select-field">
          <span>Home timezone</span>
          <select v-model="tz" class="setup-prompt__timezone-select" @change="handleManualTimezoneChange">
            <option v-for="timezone in timezoneOptions" :key="timezone" :value="timezone">
              {{ timezoneOptionLabel(timezone, timezoneNow) }}
            </option>
          </select>
          <small>New reminders and planning requests will use this zone.</small>
        </label>
        </section>

        <section class="setup-card">
        <div class="setup-card__header">
          <div>
            <div class="setup-card__title">📱 Reminder Phone</div>
            <p class="setup-card__copy">
              Optional. Used for WhatsApp, SMS, and voice reminders when you want backup delivery.
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
          <p class="setup-prompt__field-help">
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
              <span class="setup-prompt__channel-label">{{ channel.label }}</span>
              <span class="setup-prompt__channel-copy">{{ channel.copy }}</span>
            </span>
          </label>
        </div>
        </section>

        <section class="setup-card">
        <div class="setup-card__header">
          <div>
            <div class="setup-card__title">🛎️ Reminder Coverage</div>
            <p class="setup-card__copy">This is what a wake-up reminder can actually use on this account.</p>
          </div>
        </div>
        <div class="mt-3 grid gap-3 sm:grid-cols-3">
          <div
            v-for="item in reminderCoverage"
            :key="item.key"
            class="setup-prompt__coverage-item"
            :class="item.enabled ? 'setup-prompt__coverage-item--enabled' : 'setup-prompt__coverage-item--disabled'"
          >
            <p class="setup-prompt__coverage-label">{{ item.label }}</p>
            <p class="setup-prompt__coverage-copy">
              {{ item.status }}
            </p>
          </div>
        </div>
        </section>

        <section v-if="showInstantNotifications" class="setup-card">
        <div class="setup-card__header">
          <div>
            <div class="setup-card__title">🛎️ {{ pushCardTitle }}</div>
            <p class="setup-card__copy">{{ pushCardCopy }}</p>
          </div>
          <span class="setup-status" :class="pushGranted ? 'setup-status--complete' : 'setup-status--pending'">
            {{ pushGranted ? 'Enabled' : 'Optional' }}
          </span>
        </div>
        <div class="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p class="setup-prompt__push-copy">
            {{ pushGranted ? pushReadyCopy : 'You can skip this and still finish quick setup.' }}
          </p>
          <el-button
            size="small"
            type="primary"
            class="!rounded-lg font-semibold"
            :loading="loadingPush"
            :disabled="pushGranted"
            @click="enablePush"
          >
            {{ pushGranted ? 'Enabled ✓' : pushButtonLabel }}
          </el-button>
        </div>
        </section>

        <p v-if="saveError" class="setup-prompt__feedback setup-prompt__feedback--error">
          {{ saveError }}
        </p>
        <p v-else-if="saveSuccess" class="setup-prompt__feedback setup-prompt__feedback--success">
          {{ saveSuccess }}
        </p>
      </div>
    </div>

    <template #footer>
      <div class="setup-prompt__footer">
        <span class="setup-prompt__footer-copy">
          You can continue later from the dashboard setup banner or
          <RouterLink to="/settings?tab=account-quick-setup" class="setup-prompt__footer-link">
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
import { hasSubscription, registerPushSubscription } from '@/services/pushService'
import {
  getIntegrations,
  getPreferences,
  getProfile,
  requestWelcomeIntroCall,
  updateIntegrations,
  updatePreferences,
  updateProfile,
} from '@/services/settingsService'
import { requestNativeReminderPermissions, syncNativeReminderQueueNow } from '@/services/nativeReminderService'
import { trackFirstReminderChannelSaved } from '@/services/analytics'
import { useAuthFlags } from '@/composables/useAuthFlags'
import { useAuthStore } from '@/stores/authStore'
import { guessCountryFromLocale, normalizePhone } from '@/utils/phoneUtils'
import { isNativePackagedApp } from '@/utils/nativeAuthSupport'
import {
  detectDeviceTimezone,
  isValidTimezone,
  listSupportedTimezones,
  persistTimezonePreference,
  readTimezonePreference,
  resolveTimezonePreference,
  timezoneClockLabel,
  timezoneOptionLabel,
  TIMEZONE_MODES,
} from '@/utils/userTimezone'
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
const timezoneMode = ref(TIMEZONE_MODES.AUTO)
const detectedTimezone = ref(detectDeviceTimezone())
const timezoneNow = ref(new Date())
const reminderPhone = ref('')
const pushGranted = ref(false)
const showLoadingShell = computed(() => loading.value && !contentReady.value)
let suppressDialogCloseEmit = false
const loadedRemoteUserId = ref('')

const showInstantNotifications = computed(() => true)
const pushCardTitle = computed(() => isNativePackagedApp() ? 'Device Notifications' : 'Browser Push')
const pushCardCopy = computed(() =>
  isNativePackagedApp()
    ? 'Optional. Enable local device notifications if you want due-time reminders on this phone or tablet.'
    : 'Optional. Enable device push now if you want instant browser reminders.',
)
const pushReadyCopy = computed(() =>
  isNativePackagedApp() ? 'Device notifications are ready on this device.' : 'Browser push is ready on this device.',
)
const pushButtonLabel = computed(() => isNativePackagedApp() ? 'Enable device notifications' : 'Enable push')
const timezoneOptions = computed(() => listSupportedTimezones())
const timezoneReady = computed(() => isValidTimezone(tz.value))
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
      pushGranted.value && 'pwa',
    ].filter(Boolean)
  )
)
const channelsReady = computed(() => selectedChannels.value.length > 0)
const phoneReady = computed(() => !!String(reminderPhone.value || '').trim())
const reminderCoverage = computed(() => [
  {
    key: 'voice',
    label: 'Voice Calls',
    enabled: channelState.voice_call && phoneReady.value,
    status: channelState.voice_call
      ? (phoneReady.value ? 'Available for wake-up reminders.' : 'Add a phone number to enable calls.')
      : 'Disabled in your reminder setup.',
  },
  {
    key: 'push',
    label: 'Push Notifications',
    enabled: pushGranted.value,
    status: pushGranted.value
      ? 'Ready on this device.'
      : 'Allow notifications so wake-up reminders can land on time.',
  },
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    enabled: channelState.whatsapp && phoneReady.value,
    status: channelState.whatsapp
      ? (phoneReady.value ? 'Can deliver reminder text here.' : 'Needs a saved phone number.')
      : 'Not selected for this setup.',
  },
])
const setupState = computed(() =>
  buildQuickSetupState({
    timezone: tz.value,
    timezoneMode: timezoneMode.value,
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
      showInstantNotifications.value &&
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

function applyTimezonePreference(preference = {}, { persist = false } = {}) {
  detectedTimezone.value = detectDeviceTimezone()
  timezoneNow.value = new Date()
  timezoneMode.value = preference.mode === TIMEZONE_MODES.MANUAL
    ? TIMEZONE_MODES.MANUAL
    : TIMEZONE_MODES.AUTO
  tz.value = timezoneMode.value === TIMEZONE_MODES.AUTO
    ? detectedTimezone.value
    : (isValidTimezone(preference.timezone) ? preference.timezone : detectedTimezone.value)

  if (persist) persistTimezonePreference(timezoneMode.value, tz.value)
}

function selectTimezoneMode(mode) {
  detectedTimezone.value = detectDeviceTimezone()
  timezoneNow.value = new Date()
  timezoneMode.value = mode === TIMEZONE_MODES.MANUAL ? TIMEZONE_MODES.MANUAL : TIMEZONE_MODES.AUTO
  if (timezoneMode.value === TIMEZONE_MODES.AUTO) {
    tz.value = detectedTimezone.value
  } else if (!isValidTimezone(tz.value)) {
    tz.value = detectedTimezone.value
  }
  markDirty()
  emitSetupState()
}

function handleManualTimezoneChange() {
  timezoneMode.value = TIMEZONE_MODES.MANUAL
  markDirty()
  emitSetupState()
}

async function loadSetup() {
  loading.value = true
  saveError.value = ''
  try {
    const stored = readQuickSetupState()
    const localPreference = readTimezonePreference()
    const storedPreference = stored?.timezoneMode
      ? { mode: stored.timezoneMode, timezone: stored.timezone }
      : localPreference
    applyTimezonePreference(storedPreference)
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
        const resolvedTimezone = resolveTimezonePreference({
          remoteTimezone: userData?.timezone || userData?.preferences?.timezone,
          remoteMode: userData?.timezoneMode || userData?.timezone_mode,
          localPreference: readTimezonePreference(),
        })
        applyTimezonePreference(resolvedTimezone, { persist: true })

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

function toggleChannel(key, checked) {
  channelState[key] = !!checked
  markDirty()
  emitSetupState()
}

async function enablePush() {
  try {
    loadingPush.value = true
    saveError.value = ''
    saveSuccess.value = ''
    if (isNativePackagedApp()) {
      const permission = await requestNativeReminderPermissions()
      pushGranted.value = permission.granted
      if (pushGranted.value) {
        saveSuccess.value = 'Device notifications enabled. Save setup to sync due reminders.'
      } else {
        saveError.value = 'Device notifications were blocked. You can enable them later in iOS or Android settings.'
      }
      markDirty()
      emitSetupState()
      return
    }
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
    const savedTimezonePreference = persistTimezonePreference(timezoneMode.value, tz.value)
    timezoneMode.value = savedTimezonePreference.mode
    tz.value = savedTimezonePreference.timezone

    if (userId) {
      const channels = selectedChannels.value
      let deferredProfileSync = false
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
      }), 15000, 'quick setup preferences save')
      if (isNativePackagedApp()) {
        await syncNativeReminderQueueNow({
          userId,
          reason: 'quick-setup-save',
        })
      }

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

      await withTimeout(updateIntegrations(userId, mergedIntegrations), 15000, 'quick setup integrations save')
      const profilePatch = {
        updatedAt: new Date().toISOString(),
        timezoneMode: timezoneMode.value,
        timezone: timezoneMode.value === TIMEZONE_MODES.MANUAL ? tz.value : null,
      }
      if (normalizedPhone) {
        profilePatch.phone = normalizedPhone
      }
      try {
        await withTimeout(updateProfile(userId, profilePatch), 15000, 'quick setup profile sync')
      } catch (error) {
        deferredProfileSync = true
        console.warn('[QuickSetup] profile sync deferred', error?.message || error)
      }

      authStore.user = {
        ...(authStore.user || {}),
        phone: normalizedPhone || null,
        timezoneMode: timezoneMode.value,
        timezone: timezoneMode.value === TIMEZONE_MODES.MANUAL ? tz.value : null,
      }
      existingIntegrations.value = mergedIntegrations
      if (deferredProfileSync) {
        saveSuccess.value = 'Quick setup saved. Profile details will finish syncing shortly.'
      }

      // One-time onboarding intro call to help user save PlanCraft AI number.
      // Keep non-blocking so setup completion is never interrupted.
      const canSendWelcomeCall =
        !isGuest.value &&
        !!normalizedPhone &&
        !localStorage.getItem(`pcai_welcome_call_sent:${userId}`)
      if (canSendWelcomeCall) {
        try {
          const result = await withTimeout(
            requestWelcomeIntroCall(userId),
            10000,
            'quick setup welcome call',
          )
          if (result?.success && !result?.skipped) {
            localStorage.setItem(`pcai_welcome_call_sent:${userId}`, '1')
            saveSuccess.value =
              'Quick setup complete. We just placed a short intro call from PlanCraft AI so you can save this number for future reminders.'
          } else if (result?.success && result?.skipped) {
            localStorage.setItem(`pcai_welcome_call_sent:${userId}`, '1')
          }
        } catch (error) {
          console.warn('[QuickSetup] welcome intro call skipped', error?.message || error)
        }
      }
    }

    clearQuickSetupSnooze()
    const nextState = buildQuickSetupState({
      timezone: tz.value,
      timezoneMode: timezoneMode.value,
      channels: selectedChannels.value,
      phone: reminderPhone.value,
      pushGranted: pushGranted.value,
      isNative: isNativePackagedApp(),
    })
    emitSetupState(nextState)
    dirty.value = false
    if (!saveSuccess.value) {
      saveSuccess.value = nextState.requiredComplete
        ? 'Quick setup complete.'
        : 'Progress saved. You can finish the remaining items later.'
    }
    if (nextState.requiredComplete && !isGuest.value) {
      saveSuccess.value += ' Premium adds deeper AI insights and stronger automation as you scale.'
    }
    try {
      if (selectedChannels.value.length) {
        trackFirstReminderChannelSaved({
          surface: 'quick_setup',
          guest: isGuest.value,
          channels: [...selectedChannels.value],
          channel_count: selectedChannels.value.length,
        })
      }
    } catch (error) {
      console.warn('[QuickSetup] reminder analytics failed', error?.message || error)
    }
    return nextState
  } catch (error) {
    const rawMessage = error?.response?.data?.error || error?.message || ''
    saveError.value = /timed out/i.test(String(rawMessage))
      ? 'Saving took longer than expected. Check your connection and try again.'
      : rawMessage || 'Failed to save quick setup.'
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

<style>
/* Element Plus teleports the dialog to <body>, so this surface owns its
   theme values instead of relying on utility classes inherited from the app. */
.setup-prompt-overlay {
  background: var(--pc-scrim, rgba(15, 23, 42, 0.35));
  backdrop-filter: blur(8px);
}

html[data-pc-theme='dark'] .setup-prompt-overlay {
  background: rgba(0, 0, 0, 0.55);
}

@media (prefers-color-scheme: dark) {
  html[data-pc-theme='system'] .setup-prompt-overlay {
    background: rgba(0, 0, 0, 0.55);
  }
}

.setup-prompt.el-dialog {
  --setup-surface: var(--pc-surface, #ffffff);
  --setup-surface-2: var(--pc-surface-2, #f1f3fa);
  --setup-surface-hover: var(--pc-surface-hover, #eceff8);
  --setup-border: var(--pc-border, #e2e8f0);
  --setup-border-strong: var(--pc-border-strong, #cbd5e1);
  --setup-text: var(--pc-text, #0f172a);
  --setup-muted: var(--pc-text-muted, #475569);
  --setup-subtle: var(--pc-text-subtle, #64748b);
  --setup-accent: var(--pc-accent, #4f46e5);
  --setup-accent-text: var(--pc-accent-text, #4338ca);
  --setup-accent-soft: var(--pc-accent-soft, rgba(79, 70, 229, 0.08));
  --setup-success: var(--pc-success, #15803d);
  --setup-success-soft: rgba(21, 128, 61, 0.1);
  --setup-warning: #b45309;
  --setup-warning-soft: rgba(180, 83, 9, 0.1);
  --setup-danger: #b42318;
  --setup-danger-soft: rgba(180, 35, 24, 0.08);
  --setup-accent-fill: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  --setup-accent-fill-hover: linear-gradient(135deg, #4338ca 0%, #6d28d9 100%);
  --setup-shadow: 0 24px 70px rgba(15, 23, 42, 0.18), 0 2px 8px rgba(15, 23, 42, 0.06);

  width: min(620px, calc(100vw - 24px));
  max-width: calc(100vw - 24px);
  max-height: min(46rem, calc(100dvh - 2rem));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  margin: auto !important;
  padding: 0;
  border: 1px solid var(--setup-border) !important;
  border-radius: 1.25rem;
  background: var(--setup-surface) !important;
  color: var(--setup-text) !important;
  box-shadow: var(--setup-shadow) !important;
  animation: setupDialogIn 0.24s cubic-bezier(0.2, 0, 0, 1);
}

html[data-pc-theme='dark'] .setup-prompt.el-dialog {
  --setup-surface: #171a21;
  --setup-surface-2: #1e222b;
  --setup-surface-hover: #242935;
  --setup-border: #262b36;
  --setup-border-strong: #343a47;
  --setup-text: #eceef1;
  --setup-muted: #a3a9b4;
  --setup-subtle: #8a909b;
  --setup-accent: #6a58e0;
  --setup-accent-text: #a79cf8;
  --setup-accent-soft: rgba(124, 108, 242, 0.16);
  --setup-success: #4cc38a;
  --setup-success-soft: rgba(76, 195, 138, 0.14);
  --setup-warning: #f4c46a;
  --setup-warning-soft: rgba(244, 196, 106, 0.12);
  --setup-danger: #f0605d;
  --setup-danger-soft: rgba(240, 96, 93, 0.12);
  --setup-accent-fill: linear-gradient(135deg, #5b4fe0 0%, #7c3aed 100%);
  --setup-accent-fill-hover: linear-gradient(135deg, #4f43d6 0%, #6d28d9 100%);
  --setup-shadow: 0 24px 70px rgba(0, 0, 0, 0.5), 0 2px 8px rgba(0, 0, 0, 0.3);
}

@media (prefers-color-scheme: dark) {
  html[data-pc-theme='system'] .setup-prompt.el-dialog {
    --setup-surface: #171a21;
    --setup-surface-2: #1e222b;
    --setup-surface-hover: #242935;
    --setup-border: #262b36;
    --setup-border-strong: #343a47;
    --setup-text: #eceef1;
    --setup-muted: #a3a9b4;
    --setup-subtle: #8a909b;
    --setup-accent: #6a58e0;
    --setup-accent-text: #a79cf8;
    --setup-accent-soft: rgba(124, 108, 242, 0.16);
    --setup-success: #4cc38a;
    --setup-success-soft: rgba(76, 195, 138, 0.14);
    --setup-warning: #f4c46a;
    --setup-warning-soft: rgba(244, 196, 106, 0.12);
    --setup-danger: #f0605d;
    --setup-danger-soft: rgba(240, 96, 93, 0.12);
    --setup-accent-fill: linear-gradient(135deg, #5b4fe0 0%, #7c3aed 100%);
    --setup-accent-fill-hover: linear-gradient(135deg, #4f43d6 0%, #6d28d9 100%);
    --setup-shadow: 0 24px 70px rgba(0, 0, 0, 0.5), 0 2px 8px rgba(0, 0, 0, 0.3);
  }
}

.setup-prompt.el-dialog .el-dialog__header {
  flex: 0 0 auto;
  margin: 0;
  padding: 1.35rem 4.25rem 1.15rem 1.5rem;
  border-bottom: 1px solid var(--setup-border);
  background: linear-gradient(180deg, var(--setup-accent-soft), transparent 90%);
  color: var(--setup-text) !important;
}

.setup-prompt__header {
  text-align: left;
}

.setup-prompt__title {
  margin: 0;
  color: var(--setup-text);
  font-size: 1.75rem;
  font-weight: 750;
  letter-spacing: -0.025em;
  line-height: 1.15;
}

.setup-prompt__subtitle {
  max-width: 34rem;
  margin: 0.45rem 0 0;
  color: var(--setup-muted);
  font-size: 0.875rem;
  line-height: 1.5;
}

.setup-prompt.el-dialog .el-dialog__headerbtn {
  top: 1.1rem;
  right: 1rem;
  width: 2.25rem;
  height: 2.25rem;
  border: 1px solid var(--setup-border);
  border-radius: 0.7rem;
  background: var(--setup-surface-2);
  transition: background-color 0.18s ease, border-color 0.18s ease, transform 0.18s ease;
}

.setup-prompt.el-dialog .el-dialog__headerbtn:hover {
  border-color: var(--setup-border-strong);
  background: var(--setup-surface-hover);
  transform: translateY(-1px);
}

.setup-prompt.el-dialog .el-dialog__headerbtn .el-dialog__close {
  color: var(--setup-muted);
  font-size: 1rem;
}

.setup-prompt.el-dialog .el-dialog__body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 1.25rem 1.5rem 1.5rem;
  background: var(--setup-surface) !important;
  color: var(--setup-text) !important;
  scrollbar-color: color-mix(in srgb, var(--setup-subtle) 35%, transparent) transparent;
}

.setup-prompt.el-dialog .el-dialog__footer {
  flex: 0 0 auto;
  margin: 0;
  padding: 1rem 1.5rem 1.25rem;
  border-top: 1px solid var(--setup-border);
  background: var(--setup-surface) !important;
}

.setup-prompt__shell,
.setup-prompt__content {
  min-height: 0;
}

.setup-prompt__content {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.setup-prompt__progress-card {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  padding: 1.125rem;
  border: 1px solid color-mix(in srgb, var(--setup-accent) 22%, var(--setup-border)) !important;
  border-radius: 1rem;
  background: linear-gradient(135deg, var(--setup-accent-soft), var(--setup-surface-2)) !important;
}

.setup-prompt__eyebrow {
  margin: 0;
  color: var(--setup-accent-text);
  font-size: 0.6875rem;
  font-weight: 750;
  letter-spacing: 0.2em;
  line-height: 1.2;
  text-transform: uppercase;
}

.setup-prompt__progress-count {
  margin: 0.35rem 0 0;
  color: var(--setup-text);
  font-size: 0.9375rem;
  font-weight: 650;
}

.setup-prompt__progress-status,
.setup-status {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  border: 1px solid var(--setup-border);
  border-radius: 999px;
  padding: 0.35rem 0.7rem;
  color: var(--setup-muted);
  font-size: 0.6875rem;
  font-weight: 750;
  letter-spacing: 0.01em;
  line-height: 1;
  white-space: nowrap;
}

.setup-prompt__progress-status--complete,
.setup-status--complete,
.setup-prompt__step--complete,
.setup-prompt__coverage-item--enabled {
  border-color: color-mix(in srgb, var(--setup-success) 38%, var(--setup-border));
  background: var(--setup-success-soft);
  color: var(--setup-success);
}

.setup-prompt__progress-status--pending,
.setup-status--pending {
  border-color: color-mix(in srgb, var(--setup-warning) 38%, var(--setup-border));
  background: var(--setup-warning-soft);
  color: var(--setup-warning);
}

.setup-prompt__progress-track {
  height: 0.5rem;
  overflow: hidden;
  border-radius: 999px;
  background: var(--setup-border);
}

.setup-progress-bar {
  height: 100%;
  min-width: 0.5rem;
  border-radius: inherit;
  background: linear-gradient(90deg, #4f46e5 0%, #7c3aed 62%, #db2777 100%);
  transition: width 0.25s ease;
}

.setup-prompt__sync-copy,
.setup-prompt__missing-copy {
  margin: 0;
  color: var(--setup-muted);
  font-size: 0.75rem;
  line-height: 1.4;
}

.setup-prompt__missing-copy {
  color: var(--setup-warning);
}

.setup-prompt__step {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  border: 1px solid var(--setup-border);
  border-radius: 999px;
  padding: 0.4rem 0.7rem;
  color: var(--setup-muted);
  font-size: 0.75rem;
  line-height: 1;
}

.setup-prompt__step--pending {
  background: var(--setup-surface);
}

.setup-prompt__step-optional {
  color: var(--setup-subtle);
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.setup-card {
  border: 1px solid var(--setup-border);
  border-radius: 1rem;
  padding: 1rem;
  background: var(--setup-surface);
  box-shadow: 0 5px 18px rgba(15, 23, 42, 0.045);
}

.setup-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.setup-card__title {
  color: var(--setup-text);
  font-size: 0.9375rem;
  font-weight: 700;
  line-height: 1.3;
}

.setup-card__copy,
.setup-prompt__field-help,
.setup-prompt__channel-copy,
.setup-prompt__coverage-copy,
.setup-prompt__push-copy {
  color: var(--setup-muted);
  font-size: 0.8rem;
  line-height: 1.45;
}

.setup-card__copy {
  margin: 0.3rem 0 0;
}

.setup-prompt__field-help,
.setup-prompt__coverage-copy {
  margin: 0.35rem 0 0;
}

.setup-prompt__timezone-value {
  min-width: 12rem;
  border: 1px solid var(--setup-border-strong);
  border-radius: 0.75rem;
  padding: 0.7rem 0.9rem;
  background: var(--setup-surface-2);
  color: var(--setup-text);
  font-size: 0.875rem;
  font-weight: 600;
}

.setup-prompt__timezone-modes {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.65rem;
  margin-top: 1rem;
}

.setup-prompt__timezone-mode {
  display: flex;
  min-height: 4.1rem;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 0.2rem;
  border: 1px solid var(--setup-border);
  border-radius: 0.8rem;
  padding: 0.75rem 0.85rem;
  background: var(--setup-surface-2);
  color: var(--setup-text);
  cursor: pointer;
  font: inherit;
  text-align: left;
  transition: border-color 0.18s ease, background-color 0.18s ease, box-shadow 0.18s ease;
}

.setup-prompt__timezone-mode:hover {
  border-color: var(--setup-border-strong);
  background: var(--setup-surface-hover);
}

.setup-prompt__timezone-mode--active {
  border-color: color-mix(in srgb, var(--setup-accent) 65%, var(--setup-border));
  background: var(--setup-accent-soft);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--setup-accent) 10%, transparent);
}

.setup-prompt__timezone-mode span {
  color: var(--setup-text);
  font-size: 0.8rem;
  font-weight: 700;
  line-height: 1.25;
}

.setup-prompt__timezone-mode small,
.setup-prompt__timezone-select-field small {
  color: var(--setup-muted);
  font-size: 0.7rem;
  line-height: 1.35;
}

.setup-prompt__timezone-current,
.setup-prompt__timezone-select-field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 0.8rem;
  border: 1px solid var(--setup-border);
  border-radius: 0.8rem;
  padding: 0.75rem 0.85rem;
  background: var(--setup-surface-2);
}

.setup-prompt__timezone-current > div,
.setup-prompt__timezone-select-field {
  min-width: 0;
}

.setup-prompt__timezone-label,
.setup-prompt__timezone-select-field > span {
  display: block;
  margin-bottom: 0.2rem;
  color: var(--setup-muted);
  font-size: 0.7rem;
  font-weight: 650;
}

.setup-prompt__timezone-current strong {
  display: block;
  overflow: hidden;
  color: var(--setup-text);
  font-size: 0.85rem;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.setup-prompt__timezone-clock {
  flex: 0 0 auto;
  color: var(--setup-accent-text);
  font-size: 0.75rem;
  font-weight: 700;
}

.setup-prompt__timezone-select-field {
  align-items: stretch;
  flex-direction: column;
}

.setup-prompt__timezone-select-field > span {
  margin-bottom: 0;
}

.setup-prompt__timezone-select {
  width: 100%;
  min-height: 2.6rem;
  border: 1px solid var(--setup-border-strong);
  border-radius: 0.65rem;
  padding: 0.45rem 0.65rem;
  background: var(--setup-surface);
  color: var(--setup-text);
  font: inherit;
  font-size: 0.82rem;
}

.setup-prompt__timezone-select:focus {
  outline: 2px solid color-mix(in srgb, var(--setup-accent) 35%, transparent);
  outline-offset: 1px;
}

.setup-prompt.el-dialog .el-input__wrapper {
  min-height: 2.75rem;
  border-radius: 0.75rem;
  background: var(--setup-surface-2) !important;
  box-shadow: inset 0 0 0 1px var(--setup-border-strong) !important;
  transition: background-color 0.18s ease, box-shadow 0.18s ease;
}

.setup-prompt.el-dialog .el-input__wrapper:hover,
.setup-prompt.el-dialog .el-input__wrapper.is-focus {
  background: var(--setup-surface) !important;
  box-shadow: inset 0 0 0 1px var(--setup-accent), 0 0 0 3px color-mix(in srgb, var(--setup-accent) 16%, transparent) !important;
}

.setup-prompt.el-dialog .el-input__inner {
  color: var(--setup-text) !important;
  font-size: 0.9375rem;
}

.setup-prompt.el-dialog .el-input__inner::placeholder {
  color: var(--setup-subtle) !important;
}

.channel-option {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  border: 1px solid var(--setup-border);
  border-radius: 0.85rem;
  padding: 0.85rem 0.9rem;
  background: var(--setup-surface-2);
  transition: border-color 0.18s ease, background-color 0.18s ease, box-shadow 0.18s ease;
}

.channel-option:hover {
  border-color: var(--setup-border-strong);
  background: var(--setup-surface-hover);
}

.channel-option--active {
  border-color: color-mix(in srgb, var(--setup-accent) 65%, var(--setup-border));
  background: var(--setup-accent-soft);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--setup-accent) 10%, transparent);
}

.channel-option input {
  width: 1rem;
  height: 1rem;
  margin-top: 0.15rem;
  accent-color: var(--setup-accent);
}

.setup-prompt__channel-label,
.setup-prompt__coverage-label {
  display: block;
  color: var(--setup-text);
  font-size: 0.875rem;
  font-weight: 650;
  line-height: 1.3;
}

.setup-prompt__coverage-item {
  min-height: 5rem;
  border: 1px solid var(--setup-border);
  border-radius: 0.85rem;
  padding: 0.85rem;
  background: var(--setup-surface-2);
}

.setup-prompt__coverage-item--disabled {
  color: var(--setup-muted);
}

.setup-prompt__coverage-item--disabled .setup-prompt__coverage-label {
  color: var(--setup-muted);
}

.setup-prompt__feedback {
  margin: 0;
  border: 1px solid var(--setup-border);
  border-radius: 0.8rem;
  padding: 0.8rem 0.9rem;
  font-size: 0.8125rem;
  line-height: 1.45;
}

.setup-prompt__feedback--error {
  border-color: color-mix(in srgb, var(--setup-danger) 35%, var(--setup-border));
  background: var(--setup-danger-soft);
  color: var(--setup-danger);
}

.setup-prompt__feedback--success {
  border-color: color-mix(in srgb, var(--setup-success) 35%, var(--setup-border));
  background: var(--setup-success-soft);
  color: var(--setup-success);
}

.setup-prompt__skeleton {
  display: flex;
  min-height: 24rem;
  flex-direction: column;
  gap: 1rem;
}

.setup-prompt__skeleton-block {
  height: 5rem;
  border: 1px solid var(--setup-border);
  border-radius: 1rem;
  background: linear-gradient(90deg, var(--setup-surface-2), var(--setup-accent-soft), var(--setup-surface-2));
  background-size: 220% 100%;
  animation: setupShimmer 1.4s linear infinite;
}

.setup-prompt__skeleton-block--hero {
  height: 7rem;
}

.setup-prompt__skeleton-block--short {
  height: 3.5rem;
}

.setup-prompt__footer {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.85rem;
}

.setup-prompt__footer-copy {
  color: var(--setup-subtle);
  font-size: 0.75rem;
  line-height: 1.45;
  text-align: center;
}

.setup-prompt__footer-link {
  color: var(--setup-accent-text);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.setup-prompt__footer-link:hover {
  color: var(--setup-accent);
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
  border-radius: 0.7rem;
  font-weight: 700;
}

.setup-prompt.el-dialog .el-button--primary {
  border-color: transparent !important;
  background: var(--setup-accent-fill) !important;
  color: #ffffff !important;
  box-shadow: 0 8px 18px rgba(79, 70, 229, 0.18);
}

.setup-prompt.el-dialog .el-button--primary:hover:not(:disabled) {
  background: var(--setup-accent-fill-hover) !important;
  transform: translateY(-1px);
}

.setup-prompt__footer-button--secondary,
.setup-prompt.el-dialog .el-button:not(.el-button--primary) {
  border-color: var(--setup-border-strong) !important;
  background: var(--setup-surface-2) !important;
  color: var(--setup-text) !important;
}

.setup-prompt__footer-button--secondary:hover:not(:disabled),
.setup-prompt.el-dialog .el-button:not(.el-button--primary):hover:not(:disabled) {
  border-color: var(--setup-accent) !important;
  background: var(--setup-surface-hover) !important;
  color: var(--setup-accent-text) !important;
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
  .setup-prompt.el-dialog {
    max-height: calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 1.5rem);
    margin-top: calc(env(safe-area-inset-top, 0px) + 0.75rem) !important;
    margin-bottom: calc(env(safe-area-inset-bottom, 0px) + 0.75rem) !important;
  }

  .setup-prompt.el-dialog .el-dialog__header {
    padding: 1.1rem 3.75rem 1rem 1.1rem;
  }

  .setup-prompt.el-dialog .el-dialog__body {
    padding: 1rem 1rem 1.25rem;
  }

  .setup-prompt.el-dialog .el-dialog__footer {
    padding: 0.85rem 1rem calc(1rem + env(safe-area-inset-bottom, 0px));
  }

  .setup-prompt__title {
    font-size: 1.5rem;
  }

  .setup-card__header {
    flex-direction: column;
  }

  .setup-prompt__timezone-value {
    width: 100%;
    min-width: 0;
  }
}

@keyframes setupDialogIn {
  from {
    opacity: 0;
    transform: translateY(0.5rem) scale(0.985);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes setupShimmer {
  from {
    background-position: 200% 0;
  }
  to {
    background-position: -20% 0;
  }
}
</style>
