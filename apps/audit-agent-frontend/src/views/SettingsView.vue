<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-900 text-white px-4 sm:px-8 py-10">
    <!-- Header -->
    <header class="mb-10 text-center">
      <h1 class="text-3xl sm:text-4xl font-bold mb-2">⚙️ Settings</h1>
      <p class="text-indigo-300">Manage your notifications, integrations, and account preferences.</p>
    </header>

    <main class="max-w-4xl mx-auto space-y-10 px-1">
      <!-- Plan status and usage -->
      <section class="bg-white/10 backdrop-blur-md rounded-xl p-4 sm:p-6 shadow-lg border border-white/10 max-w-md mx-auto sm:max-w-none">
        <h2 class="text-lg sm:text-xl font-semibold mb-2">🌟 Subscription</h2>
        <p class="text-sm text-indigo-200">Current plan: <strong>{{ currentPlanLabel.toUpperCase() }}</strong></p>
        <p class="text-sm text-gray-300 mt-2">
          Daily AI limit: <span :class="isPremium ? 'text-green-300' : 'text-yellow-300'">{{ aiRemaining }}</span> left today
        </p>
        <p v-if="isPremium && subStore.subscription?.remainingDays > 0" class="text-sm text-indigo-300 mt-1">
          ⏳ Ends on: {{ premiumEndsOn }}
        </p>
        <div class="mt-3">
          <button v-if="!isPremium" @click="upgradePlan" class="bg-gradient-to-r from-purple-500 to-pink-600 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-semibold text-white shadow-lg hover:from-purple-600 hover:to-pink-700 transition text-sm sm:text-base">🚀 Upgrade</button>
          <el-button size="small" plain @click="planOpen=true" class="ml-2">View Plan Details</el-button>
        </div>
      </section>

      <!-- Notification Preferences -->
      <section
        ref="notificationsSection"
        :class="['bg-white/10 backdrop-blur-md rounded-xl p-4 sm:p-6 shadow-lg border border-white/10 max-w-md mx-auto sm:max-w-none',
                 highlightNotifications ? 'ring-2 ring-indigo-400' : '']"
      >
        <h2 class="text-lg sm:text-xl font-semibold mb-4">🔔 Notification Preferences</h2>
        <p class="text-sm text-indigo-200 mb-4">Choose how you’d like to be reminded about tasks, reflections, and insights.</p>

        <div class="space-y-3">
          <label class="flex items-center gap-3">
            <input type="checkbox" v-model="prefs.email" class="accent-indigo-500" @change="dirty = true" />
            <span>Email Notifications</span>
          </label>
          <label class="flex items-center gap-3">
            <input type="checkbox" v-model="prefs.pwa" class="accent-indigo-500" @change="dirty = true" />
            <span>Push Notifications (PWA)</span>
          </label>
          <div v-if="prefs.pwa" class="pl-7 mt-2">
            <el-button size="small" @click="enablePush" class="bg-slate-800 hover:bg-slate-700">Enable Browser Push</el-button>
          </div>
          <label class="flex items-center gap-3">
            <input type="checkbox" v-model="prefs.whatsapp" class="accent-indigo-500" @change="dirty = true" />
            <span>WhatsApp Alerts</span>
          </label>
          <label class="flex items-center gap-3">
            <input type="checkbox" v-model="prefs.sms" class="accent-indigo-500" @change="dirty = true" />
            <span>SMS</span>
          </label>
          <label class="flex items-center gap-3">
            <input type="checkbox" v-model="prefs.voice_call" class="accent-indigo-500" @change="dirty = true" />
            <span>Voice Call</span>
          </label>
          <label class="flex items-center gap-3">
            <input type="checkbox" v-model="prefs.discord" class="accent-indigo-500" disabled />
            <span>Discord Channel (coming soon)</span>
          </label>
        </div>

        <!-- Delivery endpoints -->
        <div v-if="prefs.whatsapp" class="mt-4">
          <label class="block text-sm text-slate-300 mb-1">WhatsApp Phone Number</label>
          <el-input v-model="integrationEndpoints.whatsapp.phone" placeholder="+1 234 567 8901" clearable class="w-full" @input="dirty = true" />
          <small class="text-slate-400">Format: +12135551234 (E.164)</small>
        </div>

        <div v-if="prefs.sms || prefs.voice_call" class="mt-4">
          <label class="block text-sm text-slate-300 mb-1">Phone Number (for SMS)</label>
          <el-input v-model="integrationEndpoints.sms.phone" placeholder="+1 234 567 8901" clearable class="w-full" @input="dirty = true" />
          <p v-if="effectiveTwilioPhone" class="text-xs text-slate-400 mt-1">
            💬 SMS and voice calls will be sent to {{ effectiveTwilioPhone }}.
            <span class="text-slate-400">You can update this under <strong>Integrations → Phone</strong>.</span>
          </p>
        </div>

        <div v-if="prefs.discord" class="mt-4">
          <label class="block text-sm text-slate-300 mb-1">Discord Webhook URL</label>
          <el-input v-model="integrationEndpoints.discord.webhook" placeholder="https://discord.com/api/webhooks/..." clearable class="w-full" @input="dirty = true" />
        </div>

        <div class="mt-6 text-center" v-if="dirty">
          <p class="text-sm text-yellow-300 mb-2">⚠️ You have unsaved changes.</p>
          <el-button type="primary" @click="saveSettings" class="bg-gradient-to-r from-indigo-600 to-purple-600">💾 Save Settings</el-button>
        </div>
      </section>

      <!-- Integrations -->
      <section class="bg-white/10 backdrop-blur-md rounded-xl p-4 sm:p-6 shadow-lg border border-white/10 max-w-md mx-auto sm:max-w-none">
        <h2 class="text-lg sm:text-xl font-semibold mb-4">🔗 Integrations</h2>
        <p class="text-sm text-indigo-200 mb-4">Connect your favorite platforms to sync tasks and reminders.</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <button
            v-for="i in integrationOptions"
            :key="i.key"
            @click="() => { i.selected = !i.selected; dirty = true }"
            :class="[ 'flex flex-col items-center justify-center p-4 rounded-lg transition', i.selected ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-900/50 hover:bg-slate-800']"
          >
            <span class="text-2xl mb-2">{{ i.icon }}</span>
            <span class="text-sm">{{ i.name }}</span>
          </button>
        </div>

        <!-- Google Calendar Card -->
        <div class="mt-6 rounded-lg border border-white/10 bg-slate-900/40 p-4">
          <div class="flex items-center justify-between">
            <div>
              <div class="font-semibold flex items-center gap-2">📆 Google Calendar
                <span v-if="google.enabled" :class="['text-xs px-2 py-0.5 rounded', google.connected ? 'bg-emerald-700/50 text-emerald-200' : 'bg-yellow-700/40 text-yellow-200']">
                  {{ google.connected ? 'Connected' : 'Not Connected' }}
                </span>
                <span v-else class="text-xs px-2 py-0.5 rounded bg-slate-700/50 text-slate-300">Disabled by server</span>
              </div>
              <p class="text-xs text-slate-300 mt-1">Import meetings and show Join links in your tasks.</p>
            </div>
            <div class="flex items-center gap-2">
              <button v-if="google.enabled && !google.connected && authStore.user" @click="connectGoogle"
                 class="px-3 py-1.5 rounded bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-sm">
                Connect
              </button>
              <button v-if="google.connected" @click="syncNow" class="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-sm">Sync Now</button>
            </div>
          </div>

          <!-- Calendars selection -->
          <div v-if="google.connected" class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label v-for="cal in google.calendars" :key="cal.id" class="flex items-center gap-2 bg-slate-800/40 border border-slate-700/40 rounded p-2">
              <input type="checkbox" v-model="cal.selected" @change="onSelectionChange" class="accent-indigo-500">
              <div class="flex-1">
                <div class="text-sm">{{ cal.summary || cal.id }}</div>
                <div class="text-xs text-slate-400">{{ cal.timeZone || '—' }}</div>
              </div>
              <span v-if="cal.primary" class="text-[10px] px-1.5 py-0.5 rounded bg-indigo-700/50">primary</span>
            </label>
          </div>

          <!-- Window + save -->
          <div v-if="google.connected" class="mt-3 flex items-center gap-3 flex-wrap">
            <label class="text-sm text-slate-300">Look-ahead window:</label>
            <select v-model.number="google.windowDays" class="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm">
              <option :value="7">7 days</option>
              <option :value="14">14 days</option>
              <option :value="30">30 days</option>
              <option :value="60">60 days</option>
            </select>
            <button @click="saveSelection" class="px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-sm">Save Selection</button>
            <span v-if="google.status" class="text-xs text-slate-400">Status: {{ google.status }}</span>
          </div>
        </div>
      </section>

      <!-- Account -->
      <section class="bg-white/10 backdrop-blur-md rounded-xl p-4 sm:p-6 shadow-lg border border-white/10 max-w-md mx-auto sm:max-w-none">
        <h2 class="text-lg sm:text-xl font-semibold mb-4">👤 Account</h2>
        <div class="flex items-center gap-4 mb-4">
          <img :src="authStore.user?.photoURL || 'https://i.pravatar.cc/80'" alt="avatar" class="w-14 h-14 rounded-full" />
          <div>
            <p class="font-medium">{{ authStore.user?.displayName || 'Guest User' }}</p>
            <p class="text-sm text-indigo-300">{{ authStore.user?.email }}</p>
          </div>
        </div>
        <div class="flex flex-col sm:flex-row gap-3 justify-center items-center w-full">
          <RouterLink to="/help" class="px-3 sm:px-4 py-1.5 sm:py-2 text-sm sm:text-base rounded-lg bg-gray-800 hover:bg-gray-700 transition">💬 Help & Feedback</RouterLink>
          <button class="px-3 sm:px-4 py-1.5 sm:py-2 text-sm sm:text-base rounded-lg bg-red-600 hover:bg-red-700 transition" @click="handleLogout">Logout</button>
        </div>
      </section>
    </main>
  </div>
  <PlanSummaryModal :open="planOpen" @close="planOpen=false" />
</template>
<script setup>
import { reactive, ref, onMounted, computed } from "vue"
import { useAuthStore } from "@/stores/authStore"
import { useRouter, useRoute } from "vue-router"
import { ElMessage } from "element-plus"
import { normalizePhone, guessCountryFromLocale } from '@/utils/phoneUtils'
import { getGoogleStatus, getGoogleCalendars, saveGoogleCalendarSelection, triggerGoogleSyncNow, requestGoogleConnectUrl } from '@/stores/integrationsStore'
import { getPreferences as apiGetPrefs, updatePreferences as apiUpdatePrefs, getIntegrations, updateIntegrations } from "@/services/settingsService"
import { subscribeUserToPush } from "@/services/pwaService"
import { useSubscriptionStore } from "@/stores/subscriptionStore"
import { isFeatureAllowed, getRemainingAI } from "@/services/planService"
import PlanSummaryModal from "@/components/PlanSummaryModal.vue"
import { useIsPremium } from "@/composables/useIsPremium"
import { trackLinkedInConversion } from '@/utils/ads'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()
const subStore = useSubscriptionStore()
const { refresh: refreshPremium } = useIsPremium()
const dirty = ref(false) // tracks unsaved changes
const notificationsSection = ref(null)
const highlightNotifications = ref(false)

// Notification preferences state
const prefs = reactive({
  email: true,
  pwa: true,
  whatsapp: true,
  sms: false,
  voice_call: false,
  discord: false,
  calls: false, // legacy toggle, derived below
})

const isPremium = computed(() => {
  try {
    const planFromStore = subStore?.plan ?? subStore?.value?.plan
    const planFromUser = authStore?.user?.plan
    const roleFromUser = authStore?.user?.role
    return [planFromStore, planFromUser, roleFromUser]
      .map(v => String(v || '').toLowerCase())
      .includes('premium')
  } catch { return false }
})

onMounted(async () => {
  try {
    // Ensure latest subscription state on entry
    try { await refreshPremium() } catch {}
    // Deep link: /settings?tab=notifications → scroll and highlight
    try {
      const tab = String(route?.query?.tab || '').toLowerCase()
      if (tab === 'notifications') {
        setTimeout(() => {
          try { notificationsSection.value?.scrollIntoView({ behavior: 'smooth', block: 'start' }) } catch {}
          highlightNotifications.value = true
          setTimeout(() => { highlightNotifications.value = false }, 1600)
        }, 150)
      }
    } catch {}
    if (authStore.user) {
      const res = await apiGetPrefs(authStore.user.uid)
      const n = res?.notifications || {}
      const ints = res?.integrations || {}
      // Prefer channels[] if present; fallback to boolean keys
      const chans = Array.isArray(n?.channels) ? n.channels : null
      if (chans) {
        const set = new Set(chans)
        prefs.email = set.has('email') || !!n.email || true
        prefs.pwa = set.has('pwa') || !!n.push || true
        prefs.whatsapp = set.has('whatsapp') || !!n.whatsapp || true
        prefs.sms = set.has('sms') || !!n.sms || false
        prefs.voice_call = set.has('voice_call') || !!n.voice_call || false
      } else {
        // default to all if not specified
        prefs.email = n.email !== undefined ? !!n.email : true
        prefs.pwa = n.push !== undefined ? !!n.push : true
        prefs.whatsapp = n.whatsapp !== undefined ? !!n.whatsapp : true
        prefs.sms = !!n.sms
        prefs.voice_call = !!n.voice_call
      }
      prefs.discord = !!n.discord
      // derive legacy calls flag for UI blocks that reference it
      prefs.calls = !!(n.calls || prefs.sms || prefs.voice_call)

      notifPhones.value = { sms: n.phone_sms || '', voice: n.phone_voice || '' }

      integrationOptions.forEach(i => { i.selected = !!ints[i.key] })

      const resInts = await getIntegrations(authStore.user.uid)
      integrationEndpoints.value = {
        whatsapp: { phone: resInts?.whatsapp?.phone || '' },
        sms: { phone: resInts?.sms?.phone || '' },
        discord: { webhook: resInts?.discord?.webhook || '' },
        slack: { userId: resInts?.slack?.userId || '', token: resInts?.slack?.token || '' },
        email: resInts?.email || authStore.user.email || ''
      }
    }
  } catch (e) {
    console.warn('Failed to load preferences', e)
  }
  try { await loadGoogle() } catch {}
})

// Optional: auto-save debounce can be added later. For now, use Save button.

// Integrations toggle list (selected state persisted)
const integrationOptions = reactive([
  { key: 'googleCalendar', name: 'Google Calendar', icon: '📆', selected: false },
  { key: 'slack', name: 'Slack', icon: '💬', selected: false },
  { key: 'discord', name: 'Discord', icon: '🎮', selected: false },
  { key: 'whatsapp', name: 'WhatsApp', icon: '📱', selected: false },
  { key: 'outlook', name: 'Outlook', icon: '📧', selected: false },
])

// Delivery endpoints (per-channel identifiers)
const integrationEndpoints = ref({
  whatsapp: { phone: '' },
  sms: { phone: '' },
  discord: { webhook: '' },
  slack: { userId: '', token: '' },
  email: ''
})

// Derived phone used by Twilio (mirrors backend resolution order)
const notifPhones = ref({ sms: '', voice: '' })
const effectiveTwilioPhone = computed(() => {
  try {
    const smsPref = (notifPhones.value?.sms || '').trim()
    const voicePref = (notifPhones.value?.voice || '').trim()
    const smsInt = (integrationEndpoints.value?.sms?.phone || '').trim()
    const waInt = (integrationEndpoints.value?.whatsapp?.phone || '').trim()
    const userPhone = (authStore?.user?.phone || '').trim()
    return smsPref || voicePref || smsInt || waInt || userPhone || ''
  } catch { return '' }
})

// Google Calendar integration state and handlers
const google = reactive({ enabled: true, connected: false, calendars: [], windowDays: 30, status: '', lastRun: null })
async function connectGoogle() {
  try {
    if (!authStore.user?.uid) return
    const url = await requestGoogleConnectUrl(authStore.user.uid)
    if (url) window.location.href = url
    else ElMessage.error('Failed to get Google consent URL')
  } catch (e) {
    ElMessage.error(e?.response?.data?.error || 'Failed to start Google connect')
  }
}

async function loadGoogle() {
  try {
    if (!authStore.user?.uid) return
    let status
    try {
      status = await getGoogleStatus(authStore.user.uid)
    } catch (e) {
      // if disabled server-side
      google.enabled = false
      return
    }
    google.enabled = true
    google.connected = !!status?.connected
    google.windowDays = Number(status?.sync?.windowDays || 30)
    google.status = status?.sync?.status || ''
    google.lastRun = status?.sync?.lastRun || null
    if (!google.connected) return
    const cals = await getGoogleCalendars(authStore.user.uid)
    google.calendars = Array.isArray(cals) ? cals : []
  } catch (e) {
    console.warn('loadGoogle failed', e?.message || e)
  }
}

async function saveSelection() {
  try {
    if (!authStore.user?.uid) return
    const selected = (google.calendars || []).filter(c => c.selected).map(c => c.id)
    await saveGoogleCalendarSelection(authStore.user.uid, selected, google.windowDays)
    ElMessage.success('Google calendar selection saved')
  } catch (e) {
    ElMessage.error(e?.response?.data?.error || 'Failed to save selection')
  }
}

async function syncNow() {
  try {
    if (!authStore.user?.uid) return
    const ok = await triggerGoogleSyncNow(authStore.user.uid)
    if (ok) ElMessage.success('Sync started')
    else ElMessage.warning('Sync request not accepted')
  } catch (e) {
    ElMessage.error(e?.response?.data?.error || 'Sync failed')
  }
}

function onSelectionChange() {
  // placeholder to react to checkbox change; selection is persisted via Save Selection
}

function handleLogout() {
  authStore.logout()
  router.push("/login")
}

function upgradePlan() {
  try { trackLinkedInConversion(import.meta.env.VITE_LI_CONV_UPGRADE_CLICK) } catch {}
  router.push("/subscription") // redirect to subscription/pricing
}

// Updated saveSettings function with user feedback
async function saveSettings() {
  try {
    // Normalize phone before persisting
    try {
      const cc = guessCountryFromLocale()
      const raw = integrationEndpoints.value?.sms?.phone
      const norm = normalizePhone(raw, cc)
      if (norm) integrationEndpoints.value.sms.phone = norm
    } catch {}
    const channels = []
    if (prefs.email) channels.push('email')
    if (prefs.pwa) channels.push('pwa')
    if (prefs.whatsapp) channels.push('whatsapp')
    if (prefs.sms) channels.push('sms')
    if (prefs.voice_call) channels.push('voice_call')
    const notifications = {
      email: !!prefs.email,
      push: !!prefs.pwa,
      whatsapp: !!prefs.whatsapp,
      discord: !!prefs.discord,
      // keep legacy aggregated flag for backward-compat
      calls: !!(prefs.calls || prefs.sms || prefs.voice_call),
      channels,
    }
    const toggles = integrationOptions.reduce((acc, i) => {
      acc[i.key] = !!i.selected
      return acc
    }, {})

    await apiUpdatePrefs(authStore.user?.uid, { notifications, integrations: toggles })
    await updateIntegrations(authStore.user?.uid, integrationEndpoints.value)
    console.log("Settings saved:", { notifications, integrationToggles: toggles, integrationEndpoints: integrationEndpoints.value })
    ElMessage.success("✅ Settings saved successfully!")
    dirty.value = false // reset dirty flag
  } catch (error) {
    console.error("Failed to save settings:", error)
    ElMessage.error("❌ Failed to save settings. Please try again.")
  }
}

async function enablePush() {
  try {
    if (!authStore.user?.uid) throw new Error('Not signed in')
    await subscribeUserToPush(authStore.user.uid)
    ElMessage.success('🔔 Push notifications enabled')
  } catch (e) {
    console.warn('Enable push failed:', e)
    ElMessage.error(`❌ Enable push failed: ${e?.message || e}`)
  }
}

// Plan gates
// Use unified premium flag to control gates for a consistent UX
const canWhatsapp = computed(() => !!isPremium.value)
const canPwa = computed(() => !!isPremium.value)
const aiRemaining = computed(() => getRemainingAI(authStore.user || {}))
const planOpen = ref(false)

const currentPlanLabel = computed(() => (isPremium.value ? 'premium' : 'free'))

// Approximate end date using remainingDays provided by subscription store
const premiumEndsOn = computed(() => {
  const days = Number(subStore.subscription?.remainingDays || 0)
  if (!days || !isPremium.value) return ''
  const dt = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
  return dt.toLocaleDateString()
})
</script>

<style scoped>
section h2 {
  color: #f8fafc;
}
</style>
