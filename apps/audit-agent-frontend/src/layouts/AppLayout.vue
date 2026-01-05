<template>
  <NotificationBanner :user-id="currentUserId" />
  <FeedbackPrompt />
  <FeedbackDrawer />
  <div class="flex min-h-screen w-full max-w-full overflow-x-hidden bg-bg text-text transition-colors">
    <div v-if="showUpgrade" class="fixed top-0 left-0 right-0 z-50 px-3 sm:px-6">
      <div
        class="bg-surface border border-border text-text rounded-b-xl shadow-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 py-2 sm:py-3 px-3 sm:px-5"
      >
        <span class="text-sm sm:text-base font-medium text-center sm:text-left">
          🚀 You're on the <span class="font-semibold text-primary">Free Plan</span>. Upgrade to unlock unlimited AI and reminders.
        </span>

        <div class="flex flex-wrap items-center justify-center gap-2">
          <RouterLink
            v-if="!isGuest"
            to="/subscription"
            @click="trackUpgradeClick"
            class="bg-primary text-white font-semibold text-sm px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors"
          >
            Upgrade
          </RouterLink>
          <RouterLink
            v-else
            to="/login"
            class="bg-primary text-white font-semibold text-sm px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors"
          >
            Sign in
          </RouterLink>

          <button
            @click="planOpen = true"
            class="border border-border text-text text-sm px-3 py-1.5 rounded-lg hover:bg-surface/70 transition-colors"
          >
            View Plan
          </button>

          <button
            @click="showUpgrade = false"
            class="text-sm text-muted px-2 py-1 hover:text-text hover:bg-surface/70 rounded-lg transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>

    <aside
      class="hidden md:flex flex-col h-screen transition-all duration-300 bg-surface border-r border-border"
      :class="sidebarOpen ? 'w-72' : 'w-20'"
    >
      <div class="flex-shrink-0 flex items-center justify-between p-4 border-b border-border">
        <h1 v-if="sidebarOpen" class="text-lg font-semibold truncate">PlanCraft</h1>
        <button
          @click="sidebarOpen = !sidebarOpen"
          class="p-2 rounded-lg border border-border hover:bg-surface/80 transition-colors"
          aria-label="Toggle sidebar"
        >
          <svg v-if="sidebarOpen" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div class="px-3 pb-3 border-b border-border">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2 min-w-0">
            <div class="w-9 h-9 rounded-lg bg-surface border border-border flex items-center justify-center text-lg">
              {{ activeWorkspace?.icon || '📦' }}
            </div>
            <div v-if="sidebarOpen" class="min-w-0">
              <p class="text-[11px] uppercase tracking-[0.25em] text-muted">Workspace</p>
              <p class="text-sm font-semibold truncate">{{ activeWorkspace?.name || 'Personal' }}</p>
            </div>
          </div>
          <button
            class="p-2 rounded-lg border border-border hover:bg-surface/70 transition"
            @click="workspaceMenuOpen = !workspaceMenuOpen"
            aria-label="Change workspace"
          >
            <span v-if="workspaceMenuOpen">▲</span>
            <span v-else>▼</span>
          </button>
        </div>
        <div v-if="workspaceMenuOpen" class="mt-2 space-y-1">
          <button
            v-for="ws in workspaceStore.workspaces"
            :key="ws.id"
            class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm border border-border hover:border-primary/40 transition"
            :class="{ 'bg-primary/10 border-primary/30 text-primary': ws.id === activeWorkspaceId }"
            @click="selectWorkspace(ws.id)"
          >
            <span>{{ ws.icon || '•' }}</span>
            <span v-if="sidebarOpen" class="truncate">{{ ws.name }}</span>
          </button>
          <RouterLink
            to="/workspaces"
            class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-text hover:text-primary border border-border hover:border-primary/40 transition"
            @click="workspaceMenuOpen = false"
          >
            <span>➕</span>
            <span v-if="sidebarOpen" class="truncate">Manage workspaces</span>
            <span v-else>➕</span>
          </RouterLink>
        </div>
      </div>

      <nav class="flex-1 mt-4 space-y-3 overflow-y-auto scrollbar-plan px-2">
        <div
          v-for="group in filteredNavGroups"
          :key="group.key"
          class="rounded-lg"
        >
          <button
            v-if="group.collapsible"
            class="w-full flex items-center justify-between px-3 py-2 text-sm font-semibold rounded hover:bg-surface/80 text-text"
            @click="toggleGroup(group.key)"
          >
            <span class="flex items-center gap-2">
              <span v-if="sidebarOpen">{{ group.title }}</span>
              <span v-else class="font-semibold">{{ group.title?.charAt(0) }}</span>
            </span>
            <span v-if="sidebarOpen" class="text-xs text-muted">
              {{ openGroups[group.key] ? '▾' : '▸' }}
            </span>
          </button>
          <div v-else class="px-3 py-2 text-sm font-semibold text-text flex items-center gap-2">
            <span v-if="sidebarOpen">{{ group.title }}</span>
            <span v-else class="font-semibold">{{ group.title?.charAt(0) }}</span>
          </div>

          <div v-show="!group.collapsible || openGroups[group.key]" class="mt-1 space-y-1">
            <RouterLink
              v-for="item in group.children"
              :key="item.to"
              :to="item.to"
              class="flex items-center w-full px-4 py-2 rounded-lg transition text-sm text-text hover:bg-surface/70 border border-transparent"
              :class="{ 'bg-primary/10 text-primary border-primary/30': isActive(item.to) }"
            >
              <span v-if="sidebarOpen">{{ item.label }}</span>
              <span v-else class="text-xs font-semibold">{{ item.label.charAt(0) }}</span>
            </RouterLink>
          </div>
        </div>
      </nav>

      <div class="flex-shrink-0 mt-auto pb-4 px-3">
        <div class="grid grid-cols-6 gap-1 bg-surface border border-border rounded-lg p-1">
          <button
            @click="startTour"
            class="text-xs py-2 rounded-md hover:bg-surface/70 transition"
            title="Show Tour"
          >
            ❔
          </button>
          <RouterLink
            to="/settings"
            class="text-xs py-2 rounded-md hover:bg-surface/70 text-center transition"
            title="Settings"
            >⚙️</RouterLink
          >
          <RouterLink
            to="/subscription"
            class="text-xs py-2 rounded-md hover:bg-surface/70 text-center transition"
            title="Billing"
            >💳</RouterLink
          >
          <RouterLink
            to="/help"
            class="text-xs py-2 rounded-md hover:bg-surface/70 text-center transition"
            title="Help"
            >💬</RouterLink
          >
          <RouterLink
            to="/workspaces"
            class="text-xs py-2 rounded-md hover:bg-surface/70 text-center transition"
            title="Workspaces"
            >🏠</RouterLink
          >
          <button
            v-if="!isGuest"
            @click="handleLogout"
            class="text-xs py-2 rounded-md hover:bg-surface/70 transition text-danger font-semibold"
            title="Logout"
          >
            ⎋
          </button>
        </div>
      </div>
    </aside>

    <transition name="slide">
      <aside
        v-if="mobileMenu"
        class="fixed inset-0 bg-black/40 z-40 md:hidden"
        @click.self="mobileMenu = false"
      >
        <div class="absolute left-0 top-0 bottom-0 w-64 bg-surface p-4 flex flex-col border-r border-border">
          <div class="flex justify-between items-center mb-6">
            <h1 class="text-lg font-semibold">PlanCraft</h1>
            <button @click="mobileMenu = false" class="p-2 rounded hover:bg-surface/70">✖️</button>
          </div>

          <div class="mb-4">
            <p class="text-xs text-muted mb-1">Workspace</p>
            <select
              v-model="selectedWorkspaceId"
              class="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text"
              @change="selectWorkspace(selectedWorkspaceId)"
            >
              <option v-for="ws in workspaceStore.workspaces" :key="ws.id" :value="ws.id">
                {{ ws.name }}
              </option>
            </select>
            <RouterLink
              to="/workspaces"
              class="mt-2 inline-flex items-center gap-2 text-xs text-primary"
              @click="mobileMenu = false"
            >
              Manage workspaces
            </RouterLink>
          </div>

          <nav class="space-y-3 flex-1 overflow-y-auto scrollbar-plan">
            <div v-for="group in filteredNavGroups" :key="group.key" class="rounded-lg">
              <div
                class="flex items-center justify-between px-3 py-2 text-sm font-semibold text-text"
                @click="toggleGroup(group.key)"
              >
                <span>{{ group.title }}</span>
                <span class="text-xs text-muted">
                  {{ openGroups[group.key] ? '▾' : '▸' }}
                </span>
              </div>
              <div v-show="openGroups[group.key]" class="mt-1 space-y-1">
                <RouterLink
                  v-for="item in group.children"
                  :key="item.to"
                  :to="item.to"
                  class="block px-4 py-2 rounded hover:bg-surface/70"
                  @click="mobileMenu = false"
                >
                  {{ item.label }}
                </RouterLink>
              </div>
            </div>
          </nav>

          <div class="p-4 border-t border-border">
            <div class="grid grid-cols-5 gap-1 bg-surface border border-border rounded-lg p-1">
              <RouterLink
                to="/settings"
                @click="mobileMenu = false"
                class="text-xs py-2 rounded-md hover:bg-surface/70 text-center transition"
                title="Settings"
                >⚙️</RouterLink
              >
              <RouterLink
                to="/subscription"
                @click="mobileMenu = false"
                class="text-xs py-2 rounded-md hover:bg-surface/70 text-center transition"
                title="Billing"
                >💳</RouterLink
              >
              <button
                @click="startTour"
                class="text-xs py-2 rounded-md hover:bg-surface/70 transition"
                title="Show Tour"
              >
                ❔
              </button>
              <RouterLink
                to="/help"
                @click="mobileMenu = false"
                class="text-xs py-2 rounded-md hover:bg-surface/70 text-center transition"
                title="Help"
                >💬</RouterLink
              >
              <button
                v-if="authStore.isLoggedIn"
                @click="handleLogout"
                class="text-xs py-2 rounded-md hover:bg-surface/70 transition text-danger font-semibold"
                title="Logout"
              >
                ⎋
              </button>
            </div>
          </div>
        </div>
      </aside>
    </transition>

    <div class="flex-1 flex flex-col w-full max-w-full h-screen overflow-x-hidden bg-bg">
      <header
        class="sticky top-0 z-10 bg-surface/95 backdrop-blur border-b border-border p-4 flex justify-between items-center w-full"
      >
        <div class="flex items-center gap-3 min-w-0 flex-1">
          <button class="md:hidden p-2 rounded border border-border hover:bg-surface/70" @click="mobileMenu = !mobileMenu">
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
          <h2 class="text-lg sm:text-2xl font-semibold truncate max-w-[50vw]">
            {{ $route.name }}
          </h2>
        </div>

        <div class="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
          <button
            @click="switchTheme"
            class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border hover:bg-surface/70 text-sm"
            aria-label="Toggle theme"
          >
            <span>{{ themeMode === 'dark' ? 'Dark' : 'Light' }}</span>
          </button>

          <button
            @click="goToTalkPlanner"
            :class="[
              'flex items-center justify-center rounded-full border p-2 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50',
              isOnTalkPlanner
                ? 'bg-primary/20 border-primary/50 text-primary'
                : 'bg-surface border-border text-text hover:bg-surface/70'
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

          <div v-if="authReady" class="flex items-center gap-2 whitespace-nowrap">
            <template v-if="isPremium">
              <el-tooltip content="You're on the Premium Plan!" placement="bottom">
                <RouterLink
                  to="/subscription"
                  class="bg-primary text-white px-3 py-1 rounded-full text-sm font-semibold shadow-sm hover:bg-primary/90 transition"
                >
                  Pro
                </RouterLink>
              </el-tooltip>
            </template>
            <template v-else>
              <RouterLink
                v-if="!isGuest"
                to="/subscription"
                class="border border-border text-sm px-3 py-1 rounded-full font-semibold hover:bg-surface/70 transition"
              >
                Upgrade
              </RouterLink>
              <button
                v-else
                @click="goToLogin"
                class="border border-border text-sm px-3 py-1 rounded-full font-semibold hover:bg-surface/70 transition"
              >
                Sign in
              </button>
            </template>
          </div>
          <div
            v-else
            class="w-[88px] h-8 rounded-full bg-surface animate-pulse"
            aria-hidden="true"
          ></div>

          <img
            v-if="authStore.isLoggedIn"
            :src="authStore.user?.photoURL || 'https://i.pravatar.cc/40'"
            class="rounded-full w-10 h-10 cursor-pointer border border-border"
            alt="avatar"
            @click="router.push('/settings')"
          />
        </div>
      </header>

      <main class="p-6 flex-1 overflow-y-auto overflow-x-hidden scrollbar-plan bg-bg">
        <RouterView />
      </main>

      <footer
        class="py-3 text-center text-xs sm:text-sm text-muted bg-surface border-t border-border"
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
import { initTheme, toggleTheme } from '@/composables/useTheme'
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
const themeMode = ref(initTheme())

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
    key: 'dashboard',
    title: 'Dashboard',
    collapsible: false,
    defaultOpen: true,
    children: [{ label: 'Home', to: '/dashboard' }],
  },
  {
    key: 'planner',
    title: 'Planner',
    collapsible: true,
    defaultOpen: true,
    children: [
      { label: 'Daily', to: '/daily' },
      { label: 'Weekly', to: '/weekly' },
      { label: 'Monthly', to: '/monthly' },
    ],
  },
  {
    key: 'review',
    title: 'Review',
    collapsible: true,
    defaultOpen: true,
    children: [
      { label: 'Reports', to: '/reports' },
      { label: 'Journal', to: '/journal' },
    ],
  },
  {
    key: 'settings',
    title: 'Settings',
    collapsible: true,
    defaultOpen: true,
    children: [
      { label: 'Settings', to: '/settings' },
      { label: 'Workspaces', to: '/workspaces' },
    ],
  },
]

const filteredNavGroups = computed(() => navGroups)

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

function switchTheme() {
  themeMode.value = toggleTheme()
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
</style>
