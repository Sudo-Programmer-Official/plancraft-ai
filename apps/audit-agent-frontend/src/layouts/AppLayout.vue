<template>
  <NotificationBanner :user-id="currentUserId" />
  <FeedbackPrompt />
  <FeedbackDrawer />
  <div
    class="flex min-h-screen w-full max-w-full overflow-x-hidden bg-gradient-to-br from-indigo-900 via-purple-900 to-gray-900 text-white"
  >
    <!-- Global upgrade banner -->
    <!-- Global Upgrade Banner -->
    <div v-if="showUpgrade" class="fixed top-0 left-0 right-0 z-50 px-3 sm:px-6">
      <div
        class="bg-gradient-to-r from-fuchsia-600/40 via-purple-600/40 to-indigo-600/40 backdrop-blur-xl border border-fuchsia-400/30 text-white rounded-b-xl shadow-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 py-2 sm:py-3 px-3 sm:px-5 animate-fade-in"
      >
        <span class="text-sm sm:text-base font-medium text-center sm:text-left">
          🚀 You're on the <span class="text-fuchsia-300 font-semibold">Free Plan</span>. Upgrade to
          unlock unlimited AI and reminders.
        </span>

        <div class="flex flex-wrap items-center justify-center gap-2">
          <RouterLink
            v-if="!isGuest"
            to="/subscription"
            @click="trackUpgradeClick"
            class="bg-gradient-to-r from-fuchsia-500 via-purple-500 to-indigo-500 text-white font-semibold text-sm px-3 py-1.5 rounded-lg hover:scale-105 transition-transform shadow-md"
          >
            Upgrade
          </RouterLink>
          <RouterLink
            v-else
            to="/login"
            class="bg-gradient-to-r from-indigo-500 via-sky-500 to-blue-600 text-white font-semibold text-sm px-3 py-1.5 rounded-lg hover:scale-105 transition-transform shadow-md"
          >
            Sign in
          </RouterLink>

          <button
            @click="planOpen = true"
            class="border border-fuchsia-300/60 text-fuchsia-200 text-sm px-3 py-1.5 rounded-lg hover:bg-fuchsia-500/10 hover:text-white transition-colors"
          >
            View Plan
          </button>

          <button
            @click="showUpgrade = false"
            class="text-sm text-gray-300 px-2 py-1 hover:text-white hover:bg-fuchsia-400/20 rounded-lg transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
    <!-- Sidebar (desktop only) -->
    <aside
      class="hidden md:flex flex-col h-screen transition-all duration-300 bg-gray-950/70 backdrop-blur-xl"
      :class="sidebarOpen ? 'w-72' : 'w-20'"
    >
      <div class="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-700">
        <h1 v-if="sidebarOpen" class="text-lg font-bold">🌙 PlanCraftAI</h1>
        <button
          @click="sidebarOpen = !sidebarOpen"
          class="p-2 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 transition-colors"
          aria-label="Toggle sidebar"
        >
          <svg v-if="sidebarOpen" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <!-- Workspace switcher -->
      <div class="px-3 pb-3 border-b border-gray-800/70">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2 min-w-0">
            <div class="w-9 h-9 rounded-lg bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-lg">
              {{ activeWorkspace?.icon || '📦' }}
            </div>
            <div v-if="sidebarOpen" class="min-w-0">
              <p class="text-[11px] uppercase tracking-[0.25em] text-slate-500">Workspace</p>
              <p class="text-sm font-semibold truncate">{{ activeWorkspace?.name || 'Personal' }}</p>
            </div>
          </div>
          <button
            class="p-2 rounded-lg bg-slate-900/70 border border-slate-800 hover:border-indigo-400 transition"
            @click="workspaceMenuOpen = !workspaceMenuOpen"
            aria-label="Change workspace"
          >
            <span v-if="workspaceMenuOpen">▲</span>
            <span v-else>▼</span>
          </button>
        </div>
        <div
          v-if="workspaceMenuOpen"
          class="mt-2 space-y-1"
        >
          <button
            v-for="ws in workspaceStore.workspaces"
            :key="ws.id"
            class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm border border-slate-800 hover:border-indigo-400 transition"
            :class="{ 'bg-indigo-600/20 border-indigo-400/60': ws.id === activeWorkspaceId }"
            @click="selectWorkspace(ws.id)"
          >
            <span>{{ ws.icon || '📦' }}</span>
            <span v-if="sidebarOpen" class="truncate">{{ ws.name }}</span>
          </button>
          <RouterLink
            to="/workspaces"
            class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-indigo-200 hover:text-white bg-slate-900/70 border border-slate-800 hover:border-indigo-400 transition"
            @click="workspaceMenuOpen = false"
          >
            <span>➕</span>
            <span v-if="sidebarOpen" class="truncate">Manage workspaces</span>
            <span v-else>➕</span>
          </RouterLink>
        </div>
      </div>

      <!-- Nav links -->
      <nav class="flex-1 mt-4 space-y-3 overflow-y-auto scrollbar-plan px-2">
        <div
          v-for="group in navGroups"
          :key="group.key"
          class="rounded-lg"
        >
          <button
            v-if="group.collapsible"
            class="w-full flex items-center justify-between px-3 py-2 text-sm font-semibold text-slate-200 rounded hover:bg-gray-800"
            @click="toggleGroup(group.key)"
          >
            <span class="flex items-center gap-2">
              <span>{{ group.icon }}</span>
              <span v-if="sidebarOpen" class="flex items-center gap-2">
                <span>{{ group.title }}</span>
                <span v-if="group.beta" class="beta-pill">Beta</span>
              </span>
            </span>
            <span v-if="sidebarOpen" class="text-xs text-slate-400">
              {{ openGroups[group.key] ? '▾' : '▸' }}
            </span>
          </button>
          <div v-else class="px-3 py-2 text-sm font-semibold text-slate-200 flex items-center gap-2">
            <span>{{ group.icon }}</span>
            <span v-if="sidebarOpen" class="flex items-center gap-2">
              <span>{{ group.title }}</span>
              <span v-if="group.beta" class="beta-pill">Beta</span>
            </span>
          </div>

          <div v-show="!group.collapsible || openGroups[group.key]" class="mt-1 space-y-1">
            <RouterLink
              v-for="item in group.children"
              :key="item.to"
              :to="item.to"
              class="flex items-center gap-3 w-full px-4 py-2 rounded transition hover:bg-gray-800 text-sm text-slate-200"
              :class="{ 'bg-indigo-600': isActive(item.to) }"
            >
              <span>{{ item.icon }}</span>
              <span v-if="sidebarOpen">{{ item.label }}</span>
            </RouterLink>
          </div>
        </div>

        <div class="pt-2 border-t border-gray-800/60 mt-4">
          <RouterLink
            v-for="item in systemLinks"
            :key="item.to"
            :to="item.to"
            class="flex items-center gap-3 w-full px-3 py-2 rounded transition hover:bg-gray-800 text-sm text-slate-200"
            :class="{ 'bg-indigo-600': isActive(item.to) }"
          >
            <span>{{ item.icon }}</span>
            <span v-if="sidebarOpen">{{ item.label }}</span>
          </RouterLink>
        </div>
      </nav>

      <!-- Sidebar Footer: segmented actions -->
      <div class="flex-shrink-0 mt-auto pb-4 px-3">
        <div
          class="grid gap-1 bg-gray-900/60 border border-gray-800 rounded-lg p-1"
          :class="[authStore.user?.role === 'admin' ? 'grid-cols-7' : 'grid-cols-6']"
        >
          <button
            @click="startTour"
            class="text-xs py-2 rounded-md hover:bg-gray-800 transition"
            title="Show Tour"
          >
            ❔
          </button>
          <RouterLink
            to="/settings"
            class="text-xs py-2 rounded-md hover:bg-gray-800 text-center transition"
            title="Settings"
            >⚙️</RouterLink
          >
          <RouterLink
            to="/subscription"
            class="text-xs py-2 rounded-md hover:bg-gray-800 text-center transition"
            title="Billing"
            >💳</RouterLink
          >
          <RouterLink
            v-if="authStore.user?.role === 'admin'"
            to="/admin"
            class="text-xs py-2 rounded-md hover:bg-gray-800 text-center transition"
            title="Admin Panel"
            >🛠</RouterLink
          >
          <RouterLink
            to="/help"
            class="text-xs py-2 rounded-md hover:bg-gray-800 text-center transition"
            title="Help"
            >💬</RouterLink
          >
          <button
            v-if="!isGuest"
            @click="handleLogout"
            class="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-lg 
                   bg-gradient-to-r from-red-600 to-pink-600 text-white shadow-md 
                   hover:shadow-lg hover:from-red-500 hover:to-pink-500 
                   transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
            title="Logout"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 -ml-[1px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-7.5A2.25 2.25 0 003.75 5.25v13.5A2.25 2.25 0 006 21h7.5a2.25 2.25 0 002.25-2.25V15" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h12m0 0l-3-3m3 3l-3 3" />
            </svg>
          </button>
          
        </div>
      </div>
    </aside>

    <!-- Mobile drawer -->
    <transition name="slide">
      <aside
        v-if="mobileMenu"
        class="fixed inset-0 bg-black/50 z-40 md:hidden"
        @click.self="mobileMenu = false"
      >
        <div class="absolute left-0 top-0 bottom-0 w-64 bg-gray-900 p-4 flex flex-col">
          <!-- Header -->
          <div class="flex justify-between items-center mb-6">
            <h1 class="text-lg font-bold">🌙 PlanCraftAI</h1>
            <button @click="mobileMenu = false" class="p-2 rounded hover:bg-gray-800">✖️</button>
          </div>

          <div class="mb-4">
            <p class="text-xs text-slate-400 mb-1">Workspace</p>
            <select
              v-model="selectedWorkspaceId"
              class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
              @change="selectWorkspace(selectedWorkspaceId)"
            >
              <option v-for="ws in workspaceStore.workspaces" :key="ws.id" :value="ws.id">
                {{ ws.icon || '📦' }} {{ ws.name }}
              </option>
            </select>
            <RouterLink
              to="/workspaces"
              class="mt-2 inline-flex items-center gap-2 text-xs text-indigo-200"
              @click="mobileMenu = false"
            >
              ➕ Manage workspaces
            </RouterLink>
          </div>

          <!-- Navigation -->
          <nav class="space-y-3 flex-1 overflow-y-auto scrollbar-plan">
            <div v-for="group in navGroups" :key="group.key" class="rounded-lg">
              <div
                class="flex items-center justify-between px-3 py-2 text-sm font-semibold text-slate-200"
                @click="toggleGroup(group.key)"
              >
                <span class="flex items-center gap-2">
                  <span>{{ group.icon }}</span>
                  <span>{{ group.title }}</span>
                </span>
                <span class="text-xs text-slate-400">
                  {{ openGroups[group.key] ? '▾' : '▸' }}
                </span>
              </div>
              <div v-show="openGroups[group.key]" class="mt-1 space-y-1">
                <RouterLink
                  v-for="item in group.children"
                  :key="item.to"
                  :to="item.to"
                  class="block px-4 py-2 rounded hover:bg-indigo-600"
                  @click="mobileMenu = false"
                >
                  {{ item.icon }} {{ item.label }}
                </RouterLink>
              </div>
            </div>
            <div class="pt-2 border-t border-gray-800/60 mt-4">
              <RouterLink
                v-for="item in systemLinks"
                :key="item.to"
                :to="item.to"
                class="block px-3 py-2 rounded hover:bg-indigo-600"
                @click="mobileMenu = false"
              >
                {{ item.icon }} {{ item.label }}
              </RouterLink>
            </div>
          </nav>

          <!-- Logout -->
          <!-- <button
            v-if="authStore.isLoggedIn"
            @click="handleLogout"
            class="mt-6 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg w-full"
          >
            Logout
          </button> -->
          <div class="p-4 border-t border-gray-800">
            <!-- Grouped card: Settings | Tour | Profile | Billing | Help | Logout -->
            <div
              class="grid grid-cols-6 gap-1 bg-gray-900/60 border border-gray-800 rounded-lg p-1"
            >
              <RouterLink
                to="/settings"
                @click="mobileMenu = false"
                class="text-xs py-2 rounded-md hover:bg-gray-800 text-center transition"
                title="Settings"
                >⚙️</RouterLink
              >
              <RouterLink
                to="/profile"
                @click="mobileMenu = false"
                class="text-xs py-2 rounded-md hover:bg-gray-800 text-center transition"
                title="Profile"
                >👤</RouterLink
              >
              <RouterLink
                to="/subscription"
                @click="mobileMenu = false"
                class="text-xs py-2 rounded-md hover:bg-gray-800 text-center transition"
                title="Billing"
                >💳</RouterLink
              >
              <button
                @click="startTour"
                class="text-xs py-2 rounded-md hover:bg-gray-800 transition"
                title="Show Tour"
              >
                ❔
              </button>
              <RouterLink
                to="/help"
                @click="mobileMenu = false"
                class="text-xs py-2 rounded-md hover:bg-gray-800 text-center transition"
                title="Help"
                >💬</RouterLink
              >
              <button
                v-if="authStore.isLoggedIn"
                @click="handleLogout"
                class="text-xs py-2 rounded-md hover:bg-gray-800 transition"
                title="Logout"
              >
                🚪
              </button>
            </div>
          </div>
        </div>
      </aside>
    </transition>

    <!-- Main Content -->
    <div class="flex-1 flex flex-col w-full max-w-full h-screen overflow-x-hidden">
      <!-- Header -->
      <header
        class="sticky top-0 z-10 bg-gray-950/60 backdrop-blur-xl border-b border-gray-800 p-4 flex justify-between items-center w-full"
      >
        <div class="flex items-center gap-3 min-w-0 flex-1">
          <!-- Hamburger (mobile only) -->
          <button class="md:hidden p-2 hover:bg-gray-800 rounded" @click="mobileMenu = !mobileMenu">
            <svg
              class="w-6 h-6"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h2 class="text-lg sm:text-2xl font-semibold capitalize truncate max-w-[50vw]">
            {{ $route.name }}
          </h2>
        </div>

        <!-- Right Section -->
        <div class="flex flex-wrap items-center gap-2 sm:gap-4 min-w-0">
          <!-- Talk to Planner shortcut -->
          <button
            @click="goToTalkPlanner"
            :class="[
              'flex items-center justify-center rounded-full border p-2 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-400',
              isOnTalkPlanner
                ? 'bg-indigo-500/40 border-indigo-300 text-white'
                : 'bg-indigo-500/15 border-indigo-400/50 text-indigo-200 hover:bg-indigo-500/25'
            ]"
            title="Talk to Planner"
            aria-label="Talk to Planner"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.8"
                d="M12 3a3 3 0 00-3 3v6a3 3 0 006 0V6a3 3 0 00-3-3z"
              />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.8"
                d="M19 11a7 7 0 01-14 0m7 7v3m-4 0h8"
              />
            </svg>
          </button>

          <!-- Feedback shortcut -->
          <!-- <button
            @click="openFeedback"
            class="hidden sm:flex items-center justify-center rounded-full border border-fuchsia-400/40 bg-fuchsia-500/15 p-2 text-fuchsia-100 transition hover:bg-fuchsia-500/30 focus:outline-none focus:ring-2 focus:ring-fuchsia-400"
            title="Share feedback"
          >
            💬
          </button> -->

          <!-- Upgrade Button / Pro Badge -->
          <div v-if="authReady" class="flex items-center gap-2 whitespace-nowrap">
            <template v-if="isPremium">
              <el-tooltip content="You're on the Premium Plan!" placement="bottom">
                <RouterLink
                  to="/subscription"
                  class="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-3 py-1 rounded-full text-sm font-semibold shadow-sm hover:from-purple-600 hover:to-pink-700 transition"
                >
                  🧠 Pro
                </RouterLink>
                <!-- <span class="bg-gradient-to-r from-purple-700 to-pink-600 text-white px-3 py-1 rounded-full text-sm font-semibold shadow-sm">🧠 Pro</span> -->
              </el-tooltip>
            </template>
            <template v-else>
              <RouterLink
                v-if="!isGuest"
                to="/subscription"
                class="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-3 py-1 rounded-full text-sm font-semibold shadow-sm hover:from-purple-600 hover:to-pink-700 transition"
              >
                🚀 Upgrade
              </RouterLink>
              <button
                v-else
                @click="goToLogin"
                class="bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold shadow-sm hover:from-indigo-500 hover:to-blue-500 transition animate-pulse-slow"
              >
                🔑 Sign in
              </button>
            </template>
          </div>
          <div
            v-else
            class="w-[88px] h-8 rounded-full bg-white/10 animate-pulse"
            aria-hidden="true"
          ></div>

          <!-- User Avatar -->
          <img
            v-if="authStore.isLoggedIn"
            :src="authStore.user?.photoURL || 'https://i.pravatar.cc/40'"
            class="rounded-full w-10 h-10 cursor-pointer"
            alt="avatar"
            @click="router.push('/settings')"
          />

          <!-- Logout removed from header per guidelines -->
        </div>
      </header>

      <!-- Dynamic content -->
      <main class="p-6 flex-1 overflow-y-auto overflow-x-hidden scrollbar-plan">
        <RouterView />
      </main>
      <!-- Compact sticky footer -->
      <footer
        class="py-3 text-center text-xs sm:text-sm text-indigo-300 bg-slate-950/95 border-t border-gray-800"
      >
        <div
          class="max-w-7xl mx-auto px-4 flex items-center justify-center sm:justify-between gap-3"
        >
          <div class="hidden sm:flex items-center gap-2">
            <img src="/logo-bg-remove.png" alt="PlanCraftAI" class="w-6 h-6" />
            <span class="opacity-80">PlanCraftAI</span>
          </div>
          <div class="flex items-center gap-4">
            <RouterLink to="/blog" class="hover:underline">Blog</RouterLink>
            <RouterLink to="/privacy-policy" class="hover:underline">Privacy</RouterLink>
            <RouterLink to="/terms" class="hover:underline">Terms</RouterLink>
            <RouterLink to="/contact" class="hover:underline">Contact</RouterLink>
            <a href="mailto:careers@plancraftai.com" class="hover:underline hidden sm:inline"
              >Careers</a
            >
          </div>
        </div>
      </footer>
      <PlanSummaryModal :open="planOpen" @close="planOpen = false" />
      <ProfileSetup :open="profileSetupOpen" @close="profileSetupOpen=false" @saved="onProfileSaved" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, onUnmounted, computed, reactive } from 'vue'
import { hasSubscription, registerPushSubscription } from '@/services/pushService'
import NotificationBanner from '@/components/NotificationBanner.vue'
import FeedbackPrompt from '@/components/feedback/FeedbackPrompt.vue'
import FeedbackDrawer from '@/components/feedback/FeedbackDrawer.vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { useSubscriptionStore } from '@/stores/subscriptionStore'
import { useFeedbackStore } from '@/stores/feedbackStore'
import { useAuthFlags } from '@/composables/useAuthFlags'
import PlanSummaryModal from '@/components/PlanSummaryModal.vue'
import ProfileSetup from '@/components/ProfileSetup.vue'
import { db } from '@/firebase/init'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { trackLinkedInConversion } from '@/utils/ads'
import { useWorkspaceStore } from '@/stores/workspaceStore'
const currentUserId = ref(null)

function deriveUidFromStorage() {
  try {
    const direct = localStorage.getItem('uid')
    if (direct) return direct
    const userRaw = localStorage.getItem('user') || localStorage.getItem('auth') || localStorage.getItem('authUser')
    if (userRaw) {
      const obj = JSON.parse(userRaw)
      if (obj && (obj.uid || obj.id)) return obj.uid || obj.id
    }
  } catch (_) {}
  return null
}

onMounted(() => {
  currentUserId.value = deriveUidFromStorage()
  window.addEventListener('storage', () => {
    currentUserId.value = deriveUidFromStorage()
  })
  navGroups.forEach((g) => {
    openGroups[g.key] = g.defaultOpen ?? true
  })
  // Optional auto-registration if permission already granted
  setTimeout(async () => {
    try {
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        const uid = currentUserId.value
        if (uid && !(await hasSubscription())) {
          await registerPushSubscription(String(uid))
        }
      }
    } catch (_) {}
  }, 0)
  // Initial check for profile completion
  try { maybePromptProfile() } catch {}
})

const sidebarOpen = ref(true) // desktop toggle
const mobileMenu = ref(false) // mobile drawer toggle
const showUpgrade = ref(false)
const planOpen = ref(false)
const profileSetupOpen = ref(false)

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const workspaceStore = useWorkspaceStore()
const workspaceMenuOpen = ref(false)
const selectedWorkspaceId = ref(null)

// Subscription state via store
const subStore = useSubscriptionStore()
const feedbackStore = useFeedbackStore()
const { isPremium, isGuest } = useAuthFlags()
const authReady = computed(() => !authStore.loading)
const activeWorkspace = computed(() => workspaceStore.activeWorkspace || {})
const activeWorkspaceId = computed(() => workspaceStore.activeWorkspaceId)

const isOnTalkPlanner = computed(() => route.path === '/talk-to-planner')
let upgradeHandler = null

// Prompt for profile setup if incomplete + hydrate workspace store
watch(
  () => authStore.user?.uid,
  (uid) => {
    maybePromptProfile()
    if (uid) {
      workspaceStore.init()
    } else {
      workspaceStore.reset()
    }
  },
  { immediate: true },
)

watch(
  () => workspaceStore.activeWorkspaceId,
  (val) => {
    selectedWorkspaceId.value = val
  },
  { immediate: true },
)

async function maybePromptProfile() {
  try {
    const uid = authStore?.user?.uid
    if (!uid) return
    // Do not show for guests
    if (authStore?.isGuest || authStore?.guest === true) return
    const localKey = `profile_setup_done:${uid}`
    if (localStorage.getItem(localKey) === '1') return
    const ref = doc(db, 'users', uid)
    const snap = await getDoc(ref)
    if (!snap.exists()) {
      // Only prompt for phone-based accounts
      await setDoc(ref, { createdAt: new Date(), updatedAt: new Date(), profileComplete: false }, { merge: true })
      // Without a doc we don't yet know the mode; don't show until next fetch
      return
    }
    const data = snap.data() || {}
    const signInMethod = String(data.mode || authStore?.user?.mode || authStore?.user?.signInMethod || '').toLowerCase()
    const isPhone = signInMethod === 'phone'
    const complete = !!data.profileComplete || !!data.name
    if (isPhone && !complete) {
      profileSetupOpen.value = true
    }
  } catch {}
}

function onProfileSaved() {
  try {
    const uid = authStore?.user?.uid
    if (uid) localStorage.setItem(`profile_setup_done:${uid}`, '1')
  } catch {}
}

async function selectWorkspace(id) {
  if (!id) return
  selectedWorkspaceId.value = id
  workspaceMenuOpen.value = false
  mobileMenu.value = false
  try {
    await workspaceStore.setActive(id)
  } catch (err) {
    console.warn('Workspace switch failed', err?.message || err)
  }
}

function toggleGroup(key) {
  openGroups[key] = !openGroups[key]
}

function isActive(path) {
  return route.path.startsWith(path)
}

const navGroups = [
  {
    key: 'planning',
    title: 'Planner',
    icon: '📘',
    collapsible: true,
    defaultOpen: false,
    children: [
      { label: 'Dashboard', icon: '📊', to: '/dashboard' },
      { label: 'Daily', icon: '🗓', to: '/daily' },
      { label: 'All Tasks', icon: '🗂', to: '/tasks' },
      { label: 'Weekly', icon: '📅', to: '/weekly' },
      { label: 'Monthly', icon: '📆', to: '/monthly' },
      { label: 'Journal', icon: '📔', to: '/journal' },
      { label: 'Reminders', icon: '🔔', to: '/reminders' },
      { label: 'Quick Links', icon: '🔗', to: '/links' },
      { label: 'Goals', icon: '🎯', to: '/goals' },
      { label: 'Reports', icon: '📈', to: '/reports' },
      { label: 'Habits', icon: '🏆', to: '/habits' },
    ],
  },
  {
    key: 'projects',
    title: 'Projects',
    icon: '🗂️',
    collapsible: true,
    defaultOpen: false,
    children: [{ label: 'Projects', icon: '🗂️', to: '/projects' }],
  },
  {
    key: 'creator',
    title: 'Creator Mode',
    icon: '🎨',
    beta: true,
    collapsible: true,
    defaultOpen: false,
    children: [
      { label: 'Content Board', icon: '🏠', to: '/creator' },
      { label: 'Calendar', icon: '📅', to: '/creator/calendar' },
      { label: 'Repurpose', icon: '🔁', to: '/creator/repurpose' },
      { label: 'Editor', icon: '✏️', to: '/creator/editor' },
      { label: 'Publish', icon: '📤', to: '/creator/publish' },
    ],
  },
  {
    key: 'leader',
    title: 'Leader Mode',
    icon: '🧑‍💼',
    beta: true,
    collapsible: true,
    defaultOpen: false,
    children: [
      { label: 'Events', icon: '🎉', to: '/leader/events' },
      { label: 'Occasions', icon: '🎂', to: '/leader/occasions' },
      { label: 'Messages', icon: '✉️', to: '/leader/messages' },
      { label: 'Issues', icon: '🚨', to: '/leader/issues' },
      { label: 'Contacts', icon: '👥', to: '/leader/contacts' },
      { label: 'Maps', icon: '🗺', to: '/leader/maps' },
    ],
  },
  {
    key: 'ai',
    title: 'AI Quick Actions',
    icon: '🤖',
    collapsible: true,
    defaultOpen: false,
    children: [
      { label: 'Talk to Planner', icon: '🎤', to: '/talk-to-planner' },
      { label: 'Quick Add', icon: '⚡', to: '/quick-add' },
      { label: 'Napkin', icon: '🧾', to: '/napkin' },
    ],
  },
]

const systemLinks = [
  { label: 'Workspaces', icon: '📦', to: '/workspaces' },
]

const openGroups = reactive({})

async function handleLogout() {
  await authStore.logout()
  router.push('/login')
}

function goToLogin() {
  try { trackLinkedInConversion(import.meta.env.VITE_LI_CONV_SIGNIN_CLICK) } catch {}
  try { router.push({ path: '/login' }) } catch {}
}

function trackUpgradeClick() {
  try { trackLinkedInConversion(import.meta.env.VITE_LI_CONV_UPGRADE_CLICK) } catch {}
}

function goToTalkPlanner() {
  try {
    if (route.path !== '/talk-to-planner') {
      router.push('/talk-to-planner')
    }
    mobileMenu.value = false
  } catch (err) {
    console.warn('Failed to open Talk to Planner', err?.message || err)
  }
}

function openFeedback() {
  try {
    feedbackStore.openDrawer({ route: route.name || route.path, source: 'header' })
  } catch (err) {
    console.warn('Failed to open feedback drawer', err?.message || err)
  }
}

onMounted(() => {
  if (authStore.user?.uid) subStore.fetchStatus(authStore.user.uid)
  feedbackStore.init()
  // Upgrade banner events
  try {
    upgradeHandler = () => {
      showUpgrade.value = true
    }
    window.addEventListener('upgrade-required', upgradeHandler)
  } catch {}
})

onUnmounted(() => {
  if (upgradeHandler) {
    try {
      window.removeEventListener('upgrade-required', upgradeHandler)
    } catch {}
    upgradeHandler = null
  }
})

function startTour() {
  mobileMenu.value = false
  try {
    if (typeof window === 'undefined') return
    window.dispatchEvent(
      new CustomEvent('pcai:onboarding:request', { detail: { source: 'sidebar-tour-button' } })
    )
  } catch (error) {
    console.warn('Failed to trigger onboarding tour', error)
  }
}
</script>

<style>
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease;
}
.slide-enter-from,
.slide-leave-to {
  transform: translateX(-100%);
}
/* Subtle pulse for guest sign-in CTA */
@keyframes pulseSlow {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.9; transform: scale(1.02); }
}
.animate-pulse-slow {
  animation: pulseSlow 2s ease-in-out infinite;
}

.beta-pill {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.18);
  color: #c7d2fe;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}
</style>
