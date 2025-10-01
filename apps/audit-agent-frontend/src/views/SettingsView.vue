<template>
  <div
    class="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-900 text-white px-4 sm:px-8 py-10"
  >
    <!-- Header -->
    <header class="mb-10 text-center">
      <h1 class="text-3xl sm:text-4xl font-bold mb-2">⚙️ Settings</h1>
      <p class="text-indigo-300">
        Manage your notifications, integrations, and account preferences.
      </p>
    </header>

    <main class="max-w-4xl mx-auto space-y-10">
      <!-- Notification Preferences -->
      <section class="bg-white/10 backdrop-blur-md rounded-xl p-4 sm:p-6 shadow-lg border border-white/10">
        <h2 class="text-lg sm:text-xl font-semibold mb-4">🔔 Notification Preferences</h2>
        <p class="text-sm text-indigo-200 mb-4">
          Choose how you’d like to be reminded about tasks, reflections, and insights.
        </p>

        <div class="space-y-3">
          <label class="flex items-center gap-3">
            <input type="checkbox" v-model="prefs.email" class="accent-indigo-500" />
            <span>Email Notifications</span>
          </label>
          <label class="flex items-center gap-3">
            <input type="checkbox" v-model="prefs.pwa" class="accent-indigo-500" />
            <span>Push Notifications (PWA)</span>
          </label>
          <label class="flex items-center gap-3">
            <input type="checkbox" v-model="prefs.whatsapp" class="accent-indigo-500" />
            <span>WhatsApp Alerts</span>
          </label>
          <label class="flex items-center gap-3">
            <input type="checkbox" v-model="prefs.discord" class="accent-indigo-500" />
            <span>Discord Channel</span>
          </label>
          <label class="flex items-center gap-3">
            <input type="checkbox" v-model="prefs.calls" class="accent-indigo-500" />
            <span>Phone Calls / SMS</span>
          </label>
        </div>
      </section>

      <!-- Integrations -->
      <section class="bg-white/10 backdrop-blur-md rounded-xl p-4 sm:p-6 shadow-lg border border-white/10">
        <h2 class="text-lg sm:text-xl font-semibold mb-4">🔗 Integrations</h2>
        <p class="text-sm text-indigo-200 mb-4">
          Connect your favorite platforms to sync tasks and reminders.
        </p>
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <button
            v-for="i in integrations"
            :key="i.key"
            @click="i.selected = !i.selected"
            :class="[
              'flex flex-col items-center justify-center p-4 rounded-lg transition',
              i.selected ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-900/50 hover:bg-slate-800'
            ]"
          >
            <span class="text-2xl mb-2">{{ i.icon }}</span>
            <span class="text-sm">{{ i.name }}</span>
          </button>
        </div>
      </section>

      <!-- Account -->
      <section class="bg-white/10 backdrop-blur-md rounded-xl p-4 sm:p-6 shadow-lg border border-white/10">
        <h2 class="text-lg sm:text-xl font-semibold mb-4">👤 Account</h2>
        <div class="flex items-center gap-4 mb-4">
          <img
            :src="authStore.user?.photoURL || 'https://i.pravatar.cc/80'"
            alt="avatar"
            class="w-14 h-14 rounded-full"
          />
          <div>
            <p class="font-medium">{{ authStore.user?.displayName || 'Guest User' }}</p>
            <p class="text-sm text-indigo-300">{{ authStore.user?.email }}</p>
          </div>
        </div>
        <div class="flex gap-2 sm:gap-3">
          <button
            class="px-3 sm:px-4 py-1.5 sm:py-2 text-sm sm:text-base rounded-lg bg-indigo-600 hover:bg-indigo-700 transition"
            @click="upgradePlan"
          >
            🚀 Upgrade Plan
          </button>
          <RouterLink
            to="/help"
            class="px-3 sm:px-4 py-1.5 sm:py-2 text-sm sm:text-base rounded-lg bg-gray-800 hover:bg-gray-700 transition"
          >
            💬 Help & Feedback
          </RouterLink>
          <button
            class="px-3 sm:px-4 py-1.5 sm:py-2 text-sm sm:text-base rounded-lg bg-red-600 hover:bg-red-700 transition"
            @click="handleLogout"
          >
            Logout
          </button>
        </div>
      </section>
      <!-- Save Button -->
      <div class="flex justify-end mt-6">
        <el-button
          type="primary"
          class="px-6 py-2 rounded-lg shadow-md bg-gradient-to-r from-indigo-600 to-purple-600"
          @click="saveSettings"
        >
          💾 Save Settings
        </el-button>
      </div>
    </main>
  </div>
</template>

<script setup>
import { reactive, onMounted } from "vue"
import { useAuthStore } from "@/stores/authStore"
import { useRouter } from "vue-router"
import { ElMessage } from "element-plus"
import { getPreferences as apiGetPrefs, updatePreferences as apiUpdatePrefs } from "@/services/settingsService"

const authStore = useAuthStore()
const router = useRouter()

// Notification preferences state
const prefs = reactive({
  email: true,
  pwa: true,
  whatsapp: false,
  discord: false,
  calls: false,
})

onMounted(async () => {
  try {
    if (authStore.user) {
      const res = await apiGetPrefs(authStore.user.uid)
      const n = res?.notifications || {}
      const ints = res?.integrations || {}
      prefs.email = !!n.email
      prefs.pwa = !!n.push
      prefs.whatsapp = !!n.whatsapp
      prefs.discord = !!n.discord
      prefs.calls = !!n.calls
      integrations.forEach(i => { i.selected = !!ints[i.key] })
    }
  } catch (e) {
    console.warn('Failed to load preferences', e)
  }
})

// Optional: auto-save debounce can be added later. For now, use Save button.

// Integrations toggle list (selected state persisted)
const integrations = reactive([
  { key: 'googleCalendar', name: 'Google Calendar', icon: '📆', selected: false },
  { key: 'slack', name: 'Slack', icon: '💬', selected: false },
  { key: 'discord', name: 'Discord', icon: '🎮', selected: false },
  { key: 'whatsapp', name: 'WhatsApp', icon: '📱', selected: false },
  { key: 'outlook', name: 'Outlook', icon: '📧', selected: false },
])

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
    const payload = {
      notifications: {
        email: !!prefs.email,
        push: !!prefs.pwa,
        whatsapp: !!prefs.whatsapp,
        discord: !!prefs.discord,
        calls: !!prefs.calls,
      },
      integrations: integrations.reduce((acc, i) => {
        acc[i.key] = !!i.selected
        return acc
      }, {}),
    }
    await apiUpdatePrefs(authStore.user?.uid, payload)
    console.log("Settings saved:", prefs)
    ElMessage.success("✅ Settings saved successfully!")
  } catch (error) {
    console.error("Failed to save settings:", error)
    ElMessage.error("❌ Failed to save settings. Please try again.")
  }
}
</script>

<style scoped>
section h2 {
  color: #f8fafc;
}
</style>
