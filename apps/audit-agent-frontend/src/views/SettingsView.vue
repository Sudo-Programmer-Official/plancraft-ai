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
            <input type="checkbox" v-model="prefs.discord" class="accent-indigo-500" disabled />
            <span>Discord Channel (coming soon)</span>
          </label>
          <label class="flex items-center gap-3">
            <input type="checkbox" v-model="prefs.calls" class="accent-indigo-500" @change="dirty = true" />
            <span>Phone Calls / SMS</span>
          </label>
        </div>

        <!-- Delivery endpoints -->
        <div v-if="prefs.whatsapp" class="mt-4">
          <label class="block text-sm text-slate-300 mb-1">WhatsApp Phone Number</label>
          <el-input v-model="integrationEndpoints.whatsapp.phone" placeholder="+1 234 567 8901" clearable class="w-full" @input="dirty = true" />
          <small class="text-slate-400">Format: +12135551234 (E.164)</small>
        </div>

        <div v-if="prefs.calls" class="mt-4">
          <label class="block text-sm text-slate-300 mb-1">Phone Number (for SMS)</label>
          <el-input v-model="integrationEndpoints.sms.phone" placeholder="+1 234 567 8901" clearable class="w-full" @input="dirty = true" />
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
import { getPreferences as apiGetPrefs, updatePreferences as apiUpdatePrefs, getIntegrations, updateIntegrations } from "@/services/settingsService"
import { subscribeUserToPush } from "@/services/pwaService"
import { useSubscriptionStore } from "@/stores/subscriptionStore"
import { isFeatureAllowed, getRemainingAI } from "@/services/planService"
import PlanSummaryModal from "@/components/PlanSummaryModal.vue"
import { useIsPremium } from "@/composables/useIsPremium"

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
  discord: false,
  calls: false,
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
      } else {
        // default to all if not specified
        prefs.email = n.email !== undefined ? !!n.email : true
        prefs.pwa = n.push !== undefined ? !!n.push : true
        prefs.whatsapp = n.whatsapp !== undefined ? !!n.whatsapp : true
      }
      prefs.discord = !!n.discord
      prefs.calls = !!n.calls

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

function handleLogout() {
  authStore.logout()
  router.push("/login")
}

function upgradePlan() {
  router.push("/subscription") // redirect to subscription/pricing
}

// Updated saveSettings function with user feedback
async function saveSettings() {
  try {
    const channels = []
    if (prefs.email) channels.push('email')
    if (prefs.pwa) channels.push('pwa')
    if (prefs.whatsapp) channels.push('whatsapp')
    const notifications = {
      email: !!prefs.email,
      push: !!prefs.pwa,
      whatsapp: !!prefs.whatsapp,
      discord: !!prefs.discord,
      calls: !!prefs.calls,
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
