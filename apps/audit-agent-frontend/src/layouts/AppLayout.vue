<template>
  <FeedbackPrompt />
  <FeedbackDrawer />
  <SetupPrompt
    v-if="isReady"
    :open="quickSetupStore.quickSetupOpen"
    :launch-source="quickSetupStore.quickSetupLaunchSource"
    @close="handleQuickSetupClose"
    @done="handleQuickSetupDone"
    @updated="handleQuickSetupUpdated"
  />
  <PremiumActivationPrompt
    v-model="premiumActivationOpen"
    @upgrade="handlePremiumActivationUpgrade"
    @dismissed="handlePremiumActivationDismissed"
  />
  <transition name="fade">
    <div
      v-if="showLogoutOverlay"
      class="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/75 px-6 backdrop-blur-xl"
    >
      <div class="w-full max-w-sm rounded-3xl border border-white/10 bg-slate-950/85 p-8 text-center shadow-2xl">
        <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-indigo-400/30 bg-indigo-500/15">
          <div class="h-8 w-8 rounded-full border-2 border-white/20 border-t-indigo-300 animate-spin"></div>
        </div>
        <h2 class="mt-5 text-2xl font-semibold text-white">Logging you out…</h2>
        <p class="mt-2 text-sm text-indigo-100/75">
          Clearing your session and taking you back to sign in.
        </p>
      </div>
    </div>
  </transition>
  <div
    class="app-shell flex w-full max-w-full overflow-hidden bg-pc-bg text-pc-text"
    :class="{
      'app-shell--document-scroll': usesDocumentScrollShell,
      'app-shell--overlay-sidebar': usesOverlaySidebar,
    }"
  >
    <template v-if="!isShellReady">
      <div class="flex flex-1" aria-hidden="true"></div>
    </template>
    <template v-else>
    <!-- Global upgrade banner -->
    <!-- Global Upgrade Banner -->
    <div v-if="showUpgrade && !isAppleBillingSafeMode" class="app-upgrade-banner fixed top-0 left-0 right-0 z-50 px-3 sm:px-6">
      <div
        class="bg-pc-surface border border-pc-border text-pc-text rounded-b-xl shadow-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 py-2 sm:py-3 px-3 sm:px-5 animate-fade-in"
      >
        <span class="text-sm sm:text-base font-medium text-center sm:text-left">
          {{ upgradeBannerMessage }}
        </span>

        <div class="flex flex-wrap items-center justify-center gap-2">
          <RouterLink
            v-if="!isGuest"
            :to="billingRoutePath"
            @click="trackUpgradeClick"
            class="bg-[image:var(--pc-accent-fill)] text-white font-semibold text-sm px-3 py-1.5 rounded-lg hover:bg-[image:var(--pc-accent-fill-hover)] transition shadow-md"
          >
            {{ upgradeBannerLabel }}
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
            class="border border-pc-border-strong text-pc-accent-text text-sm px-3 py-1.5 rounded-lg hover:bg-pc-accent-soft transition-colors"
          >
            View Plan
          </button>

          <button
            @click="showUpgrade = false"
            class="text-sm text-pc-text-muted px-2 py-1 hover:text-pc-text hover:bg-pc-surface-hover rounded-lg transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
    <!-- One navigation for every signed-in page: PlanCraft Design System shell. -->
    <PcAppShell
      v-model:capture-open="captureOpen"
      class="app-pc-shell"
      :active="activeNavKey"
      :inbox-count="Number(actionInboxNavState.pendingCount) || 0"
      :user="shellUser"
      :is-pro="isPremium"
      :can-install="canInstall"
      :capture-busy="capturing"
      @navigate="onShellNavigate"
      @focus="focusNextTask"
      @capture="onCaptureSubmit"
      @upgrade="router.push(billingRoutePath)"
      @install="onInstall"
    >
    <div
      class="app-main-pane flex-1 flex min-w-0 min-h-0 flex-col w-full max-w-full overflow-hidden"
      :class="{ 'app-main-pane--document-scroll': usesDocumentScrollShell }"
    >
      <!-- Header (Today has its own greeting) -->
      <header
        v-if="!route.meta?.hideAppHeader || route.name === 'today'"
        class="app-header sticky top-0 z-10 bg-pc-surface border-b border-pc-border p-4 flex justify-between items-center w-full text-pc-text"
        :class="{ 'app-header--today': route.name === 'today' }"
      >
        <div class="flex items-center gap-3 min-w-0 flex-1">
          <div class="header-title flex items-center gap-2 min-w-0">
            <h2 class="text-lg sm:text-2xl font-semibold capitalize truncate max-w-[36vw]">
              {{ currentSectionTitle }}
            </h2>
          </div>
        </div>

        <!-- Right Section -->
        <div class="flex flex-wrap items-center gap-2 sm:gap-4 min-w-0">
          <!-- Ask PlanCraft shortcut -->
          <button
            type="button"
            @click="goToTalkPlanner"
            :class="[
              'flex items-center justify-center rounded-full border p-2 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-400',
              isOnTalkPlanner
                ? 'bg-pc-accent text-white border-pc-accent'
                : 'bg-pc-accent-soft border-pc-border-strong text-pc-accent-text hover:bg-pc-surface-hover'
            ]"
            title="Open voice planner"
            aria-label="Open voice planner"
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

          <!-- Upgrade Button / Pro Badge -->
          <div v-if="authReady" class="flex items-center gap-2 whitespace-nowrap">
            <template v-if="isPremium">
              <span
                v-if="isAppleBillingSafeMode"
                :class="premiumStatusBadgeClasses"
                aria-label="Pro plan status"
              >
                Pro
              </span>
              <el-tooltip
                v-else
                content="You're on the Premium Plan!"
                placement="bottom"
              >
                <RouterLink
                  :to="billingRoutePath"
                  class="bg-[image:var(--pc-accent-fill)] text-white px-3 py-1 rounded-full text-sm font-semibold shadow-sm hover:bg-[image:var(--pc-accent-fill-hover)] transition"
                >
                  Pro
                </RouterLink>
              </el-tooltip>
            </template>
            <template v-else>
              <RouterLink
                v-if="showFreePlanHeaderBadge"
                :to="headerBillingRoute"
                :class="freePlanBadgeClasses"
                :title="upgradePillTitle"
                @click="trackUpgradeClick"
                aria-label="Free plan status"
              >
                Free Plan
              </RouterLink>
              <RouterLink
                v-else-if="!isGuest && !isAppleBillingSafeMode"
                :to="headerBillingRoute"
                :class="upgradePillClasses"
                :title="upgradePillTitle"
                @click="trackUpgradeClick"
              >
                {{ upgradePillLabel }}
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
          <button
            v-if="authStore.isLoggedIn"
            type="button"
            class="rounded-full transition focus:outline-none focus:ring-2 focus:ring-indigo-400"
            aria-label="Open profile settings"
            @click="router.push('/settings')"
          >
            <UserAvatar
              :src="authStore.user?.photoURL || authStore.user?.avatarUrl"
              :name="authStore.user?.displayName || authStore.user?.name"
              :email="authStore.user?.email"
              alt="Profile avatar"
              size-class="h-10 w-10"
              text-class="text-sm"
            />
          </button>

          <!-- Logout removed from header per guidelines -->
        </div>
      </header>

      <!-- Dynamic content (PcAppShell provides the <main> landmark) -->
      <div
        class="app-content flex-1 min-h-0"
        :class="[
          isOnTalkPlanner
            ? 'overflow-hidden p-0'
            : 'overflow-y-auto overflow-x-hidden scrollbar-plan px-4 py-4 sm:p-6',
          { 'app-content--document-scroll': usesDocumentScrollShell },
        ]"
      >
          <div
            v-if="showWorkspaceRecovery"
            class="mx-auto flex min-h-[55vh] w-full max-w-2xl items-center justify-center"
          >
            <div class="w-full rounded-3xl border border-pc-border bg-pc-surface p-8 text-center shadow-xl">
              <div class="text-xs font-semibold uppercase tracking-[0.35em] text-pc-text-subtle">Workspace</div>
              <h2 class="mt-3 text-3xl font-semibold text-pc-text">
                {{ workspaceStore.error ? "We couldn't load your workspace" : 'Workspace still loading' }}
              </h2>
              <p class="mt-3 text-sm text-pc-text-muted">
                {{ workspaceStore.error
                  ? 'Your session is active, but workspace data could not be loaded. Try again or open your workspaces.'
                  : 'We restored your session, but this device still needs a workspace before tasks and planning can load.' }}
              </p>
              <p v-if="workspaceStore.error" class="mt-3 text-sm text-amber-700">
                {{ workspaceStore.error }}
              </p>
              <div class="mt-6 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  class="rounded-xl border border-pc-border bg-pc-surface-2 px-4 py-2 text-sm font-medium text-pc-text transition hover:bg-pc-surface"
                  @click="ensureWorkspaceHydrated"
                >
                  Retry workspace load
                </button>
                <button
                  type="button"
                  class="rounded-xl bg-[image:var(--pc-accent-fill)] px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-[image:var(--pc-accent-fill-hover)]"
                  @click="router.push('/workspaces')"
                >
                  Open workspaces
                </button>
              </div>
            </div>
          </div>
        <RouterView v-else />
      </div>
      <PlanSummaryModal :open="planOpen" @close="planOpen = false" />
      <ProfileSetup :open="profileSetupOpen" @close="profileSetupOpen=false" @saved="onProfileSaved" @dismissed="onProfileDismissed" />
      <AppLockOffer />
    </div>
    </PcAppShell>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, onUnmounted, computed, reactive } from 'vue'
import { hasSubscription, registerPushSubscription } from '@/services/pushService'
import FeedbackPrompt from '@/components/feedback/FeedbackPrompt.vue'
import FeedbackDrawer from '@/components/feedback/FeedbackDrawer.vue'
import SetupPrompt from '@/components/SetupPrompt.vue'
import PremiumActivationPrompt from '@/components/PremiumActivationPrompt.vue'
import { RouterLink, useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { useAccessStore } from '@/stores/accessStore'
import { useSubscriptionStore } from '@/stores/subscriptionStore'
import { useFeedbackStore } from '@/stores/feedbackStore'
import { useQuickSetupStore } from '@/stores/quickSetupStore'
import { useAppReady } from '@/composables/useAppReady'
import { useAuthFlags } from '@/composables/useAuthFlags'
import PlanSummaryModal from '@/components/PlanSummaryModal.vue'
import ProfileSetup from '@/components/ProfileSetup.vue'
import AppLockOffer from '@/components/AppLockOffer.vue'
import { ACCOUNT_NAV, MORE_GROUPS, PRIMARY_NAV, PcAppShell } from '@/design'
import { useCaptureSheet } from '@/composables/useCaptureSheet'
import { useInstallApp } from '@/composables/useInstallApp'
import { useTasks } from '@/composables/useTasks'
import { useTodayPlan } from '@/composables/useTodayPlan'
import { useFocusStore } from '@/stores/focusStore'
import { toLocalDateKey } from '@/utils/dateHelper'
import UserAvatar from '@/components/UserAvatar.vue'
import { db } from '@/firebase/init'
import { doc, setDoc } from 'firebase/firestore'
import { trackLinkedInConversion } from '@/utils/ads'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { ElMessage, ElNotification } from 'element-plus'
import { isNativePackagedApp } from '@/utils/nativeAuthSupport'
import { isAppleBillingSafeMode as detectAppleBillingSafeMode } from '@/utils/billingAccess'
import { fetchUserProfile } from '@/services/authService'
import { fetchActionInbox, syncActionInbox } from '@/services/actionInboxService'

const currentUserId = ref(null)
const viewportWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1440)
const coarseTouchViewport = ref(false)
const likelyIpadViewport = ref(false)
let storageHandler = null
let viewportChangeHandler = null
let pageVisibilityHandler = null

function detectCoarseTouchViewport() {
  if (typeof window === 'undefined') return false
  try {
    return !!window.matchMedia?.('(hover: none) and (pointer: coarse)').matches
  } catch { /* noop */ }
  return false
}

function detectLikelyIpadViewport() {
  if (typeof window === 'undefined') return false
  try {
    const ua = navigator.userAgent || ''
    if (/iPad/i.test(ua)) return true
    return /Macintosh/i.test(ua) && navigator.maxTouchPoints > 1
  } catch { /* noop */ }
  return false
}

function updateViewportLayoutState() {
  if (typeof window === 'undefined') return
  viewportWidth.value = window.innerWidth
  coarseTouchViewport.value = detectCoarseTouchViewport()
  likelyIpadViewport.value = detectLikelyIpadViewport()
}

function deriveUidFromStorage() {
  try {
    const direct = localStorage.getItem('uid')
    if (direct) return direct
    const userRaw = localStorage.getItem('user') || localStorage.getItem('auth') || localStorage.getItem('authUser')
    if (userRaw) {
      const obj = JSON.parse(userRaw)
      if (obj && (obj.uid || obj.id)) return obj.uid || obj.id
    }
  } catch { /* noop */ }
  return null
}

onMounted(() => {
  updateViewportLayoutState()
  currentUserId.value = deriveUidFromStorage()
  quickSetupStore.refreshQuickSetupState()
  storageHandler = () => {
    currentUserId.value = deriveUidFromStorage()
  }
  viewportChangeHandler = () => {
    updateViewportLayoutState()
  }
  pageVisibilityHandler = () => {
    if (document.visibilityState !== 'visible') return
    maybeSyncActionInbox('app_resume')
  }
  actionInboxUpdatedHandler = (event) => {
    const workspaceId = event?.detail?.workspaceId || workspaceStore.activeWorkspaceId
    if (!workspaceId || workspaceId !== workspaceStore.activeWorkspaceId) return
    refreshActionInboxNavState(workspaceId).catch(() => {})
  }
  window.addEventListener('storage', storageHandler)
  window.addEventListener('resize', viewportChangeHandler)
  window.addEventListener('orientationchange', viewportChangeHandler)
  window.addEventListener('action-inbox-updated', actionInboxUpdatedHandler)
  document.addEventListener('visibilitychange', pageVisibilityHandler)
  // Optional auto-registration if permission already granted
  setTimeout(async () => {
    try {
      if (isNativePackagedApp()) return
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        const uid = currentUserId.value
        if (uid && !(await hasSubscription())) {
          await registerPushSubscription(String(uid))
        }
      }
    } catch { /* noop */ }
  }, 0)
  // Initial check for profile completion
  try { maybePromptProfile() } catch { /* noop */ }
})

const mobileMenu = ref(false) // mobile drawer toggle
const showUpgrade = ref(false)
const premiumActivationOpen = ref(false)
const planOpen = ref(false)
const profileSetupOpen = ref(false)

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const workspaceStore = useWorkspaceStore()
const quickSetupStore = useQuickSetupStore()
// Subscription state via store
const accessStore = useAccessStore()
const subStore = useSubscriptionStore()
const feedbackStore = useFeedbackStore()
const { isPremium, isGuest } = useAuthFlags()
const { isReady, isShellReady, isAuthReady, isWorkspaceHydrated, hasResolvedWorkspace } = useAppReady()
const authReady = computed(() => !authStore.bootstrapping)
const showLogoutOverlay = computed(() => authStore.logoutPending === true)

// --- PlanCraft Design System shell (one navigation for every signed-in page) ---
const focus = useFocusStore()
const { captureOpen } = useCaptureSheet()
const { canInstall, install } = useInstallApp()
const { allTasks, getTaskPlannedDate } = useTasks()
const { planFromText } = useTodayPlan()
const capturing = ref(false)
const ALL_NAV_ITEMS = [...PRIMARY_NAV, ...MORE_GROUPS.flatMap((group) => group.items), ...ACCOUNT_NAV]

const shellUser = computed(() => ({
  name: authStore.user?.displayName || authStore.user?.name || '',
  email: authStore.user?.email || '',
  photoURL: authStore.user?.photoURL || authStore.user?.avatarUrl || '',
}))

// Routes can declare meta.pcNav; otherwise match the path against nav targets.
const activeNavKey = computed(() => {
  if (route.meta?.pcNav) return route.meta.pcNav
  const match = ALL_NAV_ITEMS.filter((item) => item.to && (route.path === item.to || route.path.startsWith(`${item.to}/`)))
    .sort((a, b) => b.to.length - a.to.length)[0]
  return match?.key || ''
})

function onShellNavigate(item) {
  if (item?.to && item.to !== route.path) router.push(item.to)
}

// Focus from the nav starts on the next open task for today.
function focusNextTask() {
  const today = toLocalDateKey(new Date())
  const next = allTasks.value
    .filter((task) => !task.completed && getTaskPlannedDate(task) === today)
    .sort((a, b) => String(a.reminderTime || '99:99').localeCompare(String(b.reminderTime || '99:99')))[0]
  if (!next) {
    ElMessage.info('Add a task for today first, then focus on it.')
    if (route.path !== '/today') router.push('/today')
    return
  }
  focus.open(next, authStore.user?.uid)
}

async function onCaptureSubmit(text) {
  capturing.value = true
  try {
    const { created, usedAi } = await planFromText(text)
    captureOpen.value = false
    const count = created.filter(Boolean).length
    ElMessage.success(usedAi && count > 1 ? `Added ${count} tasks` : 'Added to Today')
  } catch {
    // useTasks already told the user the task could not be saved; keep the text.
  } finally {
    capturing.value = false
  }
}

async function onInstall() {
  const result = await install()
  if (result === 'ios-instructions') {
    ElMessage({ message: 'In Safari, tap Share, then “Add to Home Screen”.', type: 'info', duration: 6000 })
  } else if (result === 'installed') {
    ElMessage.success('PlanCraftAI is installed')
  }
}
let lastWorkspaceInitKickAt = 0
const workspaceRetryCount = ref(0)
let workspaceRetryTimer = null
const showWorkspaceRecovery = computed(
  () =>
    !!isShellReady.value &&
    !isGuest.value &&
    !hasResolvedWorkspace.value &&
    !isOnTalkPlanner.value,
)

const isOnTalkPlanner = computed(() => route.path === '/talk-to-planner')
const ACTION_INBOX_SYNC_INTERVAL_MS = 15 * 60 * 1000
const ACTION_INBOX_REMINDER_INTERVAL_MS = 6 * 60 * 60 * 1000
const ACTION_INBOX_STALE_PENDING_MS = 18 * 60 * 60 * 1000
const actionInboxSyncState = reactive({
  key: '',
  lastAt: 0,
  busy: false,
})
const actionInboxNavState = reactive({
  pendingCount: 0,
  stalePendingCount: 0,
  focusTitle: '',
  urgentCount: 0,
})
const usesOverlaySidebar = computed(
  () =>
    viewportWidth.value < 768 ||
    likelyIpadViewport.value ||
    (coarseTouchViewport.value && viewportWidth.value <= 1200),
)
const showsDesktopSidebar = computed(
  () => viewportWidth.value >= 768 && !usesOverlaySidebar.value,
)
const usesDocumentScrollShell = computed(
  () =>
    !isOnTalkPlanner.value &&
    viewportWidth.value >= 768 &&
    (
      (likelyIpadViewport.value && viewportWidth.value <= 1400) ||
      (coarseTouchViewport.value && viewportWidth.value <= 1024)
    ),
)
let upgradeHandler = null
let actionInboxUpdatedHandler = null
let premiumActivationHandler = null
const SUBSCRIPTION_REFRESH_INTERVAL_MS = 5 * 60 * 1000
const PREMIUM_ACTIVATION_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000

function handleQuickSetupUpdated(nextState = null) {
  quickSetupStore.refreshQuickSetupState(nextState)
}

function handleQuickSetupClose() {
  quickSetupStore.refreshQuickSetupState()
  quickSetupStore.closeQuickSetup()
}

function handleQuickSetupDone() {
  quickSetupStore.refreshQuickSetupState()
  quickSetupStore.closeQuickSetup()
}

async function ensureWorkspaceHydrated() {
  if (authStore.logoutPending) {
    clearWorkspaceRetryTimer()
    workspaceRetryCount.value = 0
    return
  }
  const uid = authStore.user?.uid
  if (!uid) {
    workspaceRetryCount.value = 0
    workspaceStore.reset()
    return
  }
  if (!authStore.token && !isGuest.value) return
  if (workspaceStore.loading) return
  if (workspaceStore.hydrated && workspaceStore.activeWorkspaceId) {
    workspaceRetryCount.value = 0
    return
  }
  const now = Date.now()
  if (now - lastWorkspaceInitKickAt < 1500) return
  lastWorkspaceInitKickAt = now
  try {
    await workspaceStore.init(uid)
    if (workspaceStore.activeWorkspaceId) {
      workspaceRetryCount.value = 0
    }
  } catch {
    /* noop */
  }
}

function clearWorkspaceRetryTimer() {
  if (!workspaceRetryTimer) return
  try {
    clearTimeout(workspaceRetryTimer)
  } catch { /* noop */ }
  workspaceRetryTimer = null
}

function resetActionInboxNavState() {
  actionInboxNavState.pendingCount = 0
  actionInboxNavState.stalePendingCount = 0
  actionInboxNavState.focusTitle = ''
  actionInboxNavState.urgentCount = 0
}

function parseActionInboxDate(value) {
  if (!value) return Number.NaN
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T00:00:00`).getTime()
  }
  return new Date(value).getTime()
}

function isStalePendingSuggestion(item, nowMs = Date.now()) {
  if (!item || item.status !== 'pending') return false
  const score = Number(item.priorityScore) || 0
  const confidence = Number(item.confidenceScore) || 0
  const dueAt = parseActionInboxDate(item.dueDate || item.scheduledTime || null)
  const createdAt = parseActionInboxDate(
    item.lastShownAt || item.lastDetectedAt || item.createdAt || item.updatedAt || null,
  )
  const ageMs = Number.isFinite(createdAt) ? nowMs - createdAt : 0
  const dueSoon = Number.isFinite(dueAt) && dueAt - nowMs <= 2 * 24 * 60 * 60 * 1000
  return (
    item.urgency === 'high' ||
    dueSoon ||
    (ageMs >= ACTION_INBOX_STALE_PENDING_MS && (score >= 55 || confidence >= 0.62))
  )
}

function updateActionInboxNavState(suggestions = []) {
  const items = Array.isArray(suggestions) ? suggestions : []
  const nowMs = Date.now()
  const stale = items.filter((item) => isStalePendingSuggestion(item, nowMs))
  const urgent = items.filter((item) => item?.status === 'pending' && item?.urgency === 'high')
  actionInboxNavState.pendingCount = items.length
  actionInboxNavState.stalePendingCount = stale.length
  actionInboxNavState.focusTitle =
    items[0]?.displayTitle || items[0]?.title || stale[0]?.displayTitle || stale[0]?.title || ''
  actionInboxNavState.urgentCount = urgent.length
}

async function refreshActionInboxNavState(workspaceId = workspaceStore.activeWorkspaceId) {
  if (!authStore.user?.uid || !workspaceId || isGuest.value || !hasResolvedWorkspace.value) {
    resetActionInboxNavState()
    return []
  }
  try {
    const suggestions = await fetchActionInbox({
      workspaceId,
      status: 'pending',
      limit: 60,
    })
    updateActionInboxNavState(suggestions)
    return suggestions
  } catch (err) {
    console.warn('[AppLayout] action inbox count refresh failed', err?.response?.data || err?.message || err)
    return []
  }
}

function actionInboxReminderStorageKey(uid, workspaceId) {
  return `pcai:action-inbox-reminder:${uid}:${workspaceId}`
}

function buildActionInboxReminderMessage({ reopened = 0, nudged = 0, stalePendingCount = 0, focusTitle = '' } = {}) {
  if (reopened > 0) {
    if (reopened === 1 && focusTitle) return `${focusTitle} is back in your inbox.`
    return `${reopened} inbox item${reopened === 1 ? '' : 's'} are back in play.`
  }
  if (stalePendingCount > 0) {
    if (stalePendingCount === 1 && focusTitle) return `${focusTitle} is still waiting in your inbox.`
    return `${stalePendingCount} inbox item${stalePendingCount === 1 ? '' : 's'} need review.`
  }
  if (nudged > 0) {
    return `${nudged} urgent inbox item${nudged === 1 ? '' : 's'} need review.`
  }
  return ''
}

function maybeNotifyActionInboxReminder(result, { uid, workspaceId, trigger = 'app_open' } = {}) {
  if (!uid || !workspaceId || !['app_open', 'app_resume'].includes(trigger)) return
  if (route.path === '/inbox') return
  const pendingCount = Array.isArray(result?.suggestions) ? result.suggestions.length : actionInboxNavState.pendingCount
  const stalePendingCount = actionInboxNavState.stalePendingCount
  if (!(Number(result?.reopened) > 0 || Number(result?.nudged) > 0 || stalePendingCount > 0)) return

  const message = buildActionInboxReminderMessage({
    reopened: Number(result?.reopened) || 0,
    nudged: Number(result?.nudged) || 0,
    stalePendingCount,
    pendingCount,
    focusTitle: actionInboxNavState.focusTitle,
  })
  if (!message) return

  try {
    const now = Date.now()
    const key = actionInboxReminderStorageKey(uid, workspaceId)
    const raw = localStorage.getItem(key)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed?.shownAt && now - Number(parsed.shownAt) < ACTION_INBOX_REMINDER_INTERVAL_MS) return
    }

    localStorage.setItem(
      key,
      JSON.stringify({
        shownAt: now,
        reopened: Number(result?.reopened) || 0,
        nudged: Number(result?.nudged) || 0,
        pendingCount,
        stalePendingCount,
      }),
    )
  } catch { /* noop */ }

  try {
    ElNotification({
      title: actionInboxNavState.urgentCount > 0 ? 'Inbox needs attention' : 'Inbox reminder',
      message,
      type: actionInboxNavState.urgentCount > 0 ? 'warning' : 'info',
      duration: 8000,
      onClick: () => router.push('/inbox'),
    })
  } catch { /* noop */ }
}

async function maybeSyncActionInbox(trigger = 'app_open') {
  const uid = authStore.user?.uid
  const workspaceId = workspaceStore.activeWorkspaceId
  if (!uid || !workspaceId || isGuest.value || !hasResolvedWorkspace.value) {
    resetActionInboxNavState()
    return
  }

  const key = `${uid}:${workspaceId}:${trigger}`
  const now = Date.now()
  if (actionInboxSyncState.busy) return
  if (actionInboxSyncState.key === key && now - actionInboxSyncState.lastAt < ACTION_INBOX_SYNC_INTERVAL_MS) {
    return
  }

  actionInboxSyncState.busy = true
  try {
    const result = await syncActionInbox({ workspaceId, trigger, limit: 24 })
    updateActionInboxNavState(result?.suggestions || [])
    actionInboxSyncState.key = key
    actionInboxSyncState.lastAt = now
    maybeNotifyActionInboxReminder(result, { uid, workspaceId, trigger })
    if (result?.reopened > 0 && typeof window !== 'undefined') {
      try {
        window.dispatchEvent(
          new CustomEvent('action-inbox-updated', {
            detail: {
              reopened: result.reopened,
              nudged: result.nudged || 0,
              pendingCount: Array.isArray(result?.suggestions) ? result.suggestions.length : 0,
              workspaceId,
              trigger,
            },
          }),
        )
      } catch { /* noop */ }
    }
  } catch (err) {
    console.warn('[AppLayout] action inbox sync failed', err?.response?.data || err?.message || err)
  } finally {
    actionInboxSyncState.busy = false
  }
}

function scheduleWorkspaceHydrationRetry() {
  clearWorkspaceRetryTimer()
  if (authStore.logoutPending || !isAuthReady.value || hasResolvedWorkspace.value) {
    workspaceRetryCount.value = 0
    return
  }
  if (workspaceStore.loading) return
  if (workspaceRetryCount.value >= 6) return

  const delay = Math.min(1500 * (workspaceRetryCount.value + 1), 6000)
  workspaceRetryTimer = setTimeout(async () => {
    workspaceRetryTimer = null
    workspaceRetryCount.value += 1
    await ensureWorkspaceHydrated()
    if (!hasResolvedWorkspace.value) {
      scheduleWorkspaceHydrationRetry()
    }
  }, delay)
}

// Prompt for profile setup if incomplete + hydrate workspace store
watch(
  () => [authStore.user?.uid, authStore.token, authStore.logoutPending],
  ([uid, token, logoutPending], previous = []) => {
    const [prevUid, prevToken, prevLogoutPending] = previous
    if (logoutPending) {
      clearWorkspaceRetryTimer()
      workspaceRetryCount.value = 0
      return
    }
    if (uid && token) {
      maybePromptProfile()
      ensureWorkspaceHydrated()
      const gainedSession = uid !== prevUid || (!!token && !prevToken) || prevLogoutPending
      if (gainedSession) {
        accessStore.fetchAccess(uid, { minIntervalMs: SUBSCRIPTION_REFRESH_INTERVAL_MS }).catch(() => {})
        subStore.fetchStatus(uid, { minIntervalMs: SUBSCRIPTION_REFRESH_INTERVAL_MS }).catch(() => {})
      }
      scheduleWorkspaceHydrationRetry()
    } else {
      clearWorkspaceRetryTimer()
      workspaceRetryCount.value = 0
      accessStore.reset()
      workspaceStore.reset()
    }
  },
  { immediate: true },
)

watch(
  () => [isAuthReady.value, isWorkspaceHydrated.value, hasResolvedWorkspace.value, workspaceStore.loading, workspaceStore.error, authStore.logoutPending],
  ([authReadyNow, workspaceHydratedNow, workspaceResolvedNow, workspaceLoading, , logoutPending]) => {
    if (logoutPending || !authReadyNow) {
      clearWorkspaceRetryTimer()
      workspaceRetryCount.value = 0
      return
    }
    if (workspaceResolvedNow) {
      clearWorkspaceRetryTimer()
      workspaceRetryCount.value = 0
      return
    }
    if (!workspaceHydratedNow && workspaceLoading) return
    if (workspaceLoading) return
    scheduleWorkspaceHydrationRetry()
  },
  { immediate: true },
)

watch(
  () => [authStore.user?.uid, workspaceStore.activeWorkspaceId, isShellReady.value, hasResolvedWorkspace.value],
  ([uid, workspaceId, shellReady, workspaceResolved]) => {
    if (!uid || !workspaceId || !shellReady || !workspaceResolved) {
      actionInboxSyncState.key = ''
      actionInboxSyncState.lastAt = 0
      resetActionInboxNavState()
      return
    }
    maybeSyncActionInbox('app_open')
  },
  { immediate: true },
)

// Toast when workspace context changes (desktop + mobile)
watch(
  () => workspaceStore.activeWorkspaceId,
  (next, prev) => {
    if (!prev || !next || next === prev) return
    const name = workspaceStore.activeWorkspace?.name
    if (!name) return
    try {
      ElMessage.success(`Switched to workspace: ${name}`)
    } catch {
      /* noop */
    }
  },
)

async function maybePromptProfile() {
  try {
    const uid = authStore?.user?.uid
    if (!uid) return
    // Do not show for guests
    if (authStore?.isGuest || authStore?.guest === true) return
    const localKey = `profile_setup_done:${uid}`
    if (localStorage.getItem(localKey) === '1') return
    const snoozedUntil = Number(localStorage.getItem(`profile_setup_snooze:${uid}`) || 0)
    if (snoozedUntil > Date.now()) return
    if (profileSetupOpen.value) return
    const data = await fetchUserProfile(uid)
    if (!data || typeof data !== 'object' || !Object.keys(data).length) {
      const ref = doc(db, 'users', uid)
      // Only prompt for phone-based accounts
      await setDoc(ref, { createdAt: new Date(), updatedAt: new Date(), profileComplete: false }, { merge: true })
      // Without a doc we don't yet know the mode; don't show until next fetch
      return
    }
    const signInMethod = String(data.mode || authStore?.user?.mode || authStore?.user?.signInMethod || '').toLowerCase()
    const isPhone = signInMethod === 'phone'
    const complete = !!data.profileComplete || !!data.name
    if (isPhone && !complete) {
      profileSetupOpen.value = true
    }
  } catch { /* noop */ }
}

function onProfileSaved() {
  try {
    const uid = authStore?.user?.uid
    if (uid) localStorage.setItem(`profile_setup_done:${uid}`, '1')
  } catch { /* noop */ }
}

const PROFILE_SETUP_SNOOZE_MS = 3 * 24 * 60 * 60 * 1000

function onProfileDismissed() {
  try {
    const uid = authStore?.user?.uid
    if (uid) localStorage.setItem(`profile_setup_snooze:${uid}`, String(Date.now() + PROFILE_SETUP_SNOOZE_MS))
  } catch { /* noop */ }
}

const routeTitleOverrides = {
  dashboard: 'Today',
  today: 'Today',
  inbox: 'Inbox',
  'quick-add': 'Capture',
  napkin: 'Capture',
  workspaces: 'Workspace',
  planner: 'Planner',
  journal: 'Journal',
  reports: 'Insights',
  settings: 'Settings',
}

const currentSectionTitle = computed(() => {
  const routeName = String(route.name || '').trim()
  if (routeName && routeTitleOverrides[routeName]) return routeTitleOverrides[routeName]
  return routeName || 'Workspace'
})

const isAppleBillingSafeMode = computed(() => detectAppleBillingSafeMode())
const billingRoutePath = computed(() => (isAppleBillingSafeMode.value ? '/billing/upgrade' : '/subscription'))
const headerBillingRoute = computed(() => ({
  path: billingRoutePath.value,
  query: {
    source: isAppleBillingSafeMode.value ? 'header-free-plan' : 'header-upgrade',
  },
}))
const upgradeBannerLabel = computed(() => (isAppleBillingSafeMode.value ? 'Refresh access' : 'Upgrade'))
const upgradeBannerMessage = computed(() => (
  isAppleBillingSafeMode.value
    ? 'You have reached a Free plan limit. Existing premium access syncs automatically if this account already has it outside the app.'
    : '🚀 You\'re on the Free Plan. Upgrade to unlock unlimited AI and reminders.'
))
const upgradePillLabel = computed(() => '🚀 Upgrade')
const upgradePillTitle = computed(() => (
  isAppleBillingSafeMode.value
    ? 'Open Solo Premium on iPhone or refresh access that already exists on this account.'
    : 'Upgrade'
))
const showFreePlanHeaderBadge = computed(() => (
  isAppleBillingSafeMode.value && !isPremium.value && !isGuest.value
))
// Header is light now: token colours (the old white-on-white badges were unreadable).
const premiumStatusBadgeClasses = 'rounded-full bg-[image:var(--pc-accent-fill)] px-3 py-1 text-sm font-semibold text-white'
const freePlanBadgeClasses = 'rounded-full border border-pc-border-strong bg-pc-surface px-3 py-1 text-sm font-semibold text-pc-text-muted transition hover:border-pc-accent hover:text-pc-accent-text focus:outline-none focus:ring-2 focus:ring-indigo-400/70'
const upgradePillClasses = computed(() => (
  isAppleBillingSafeMode.value
    ? 'rounded-full border border-pc-border-strong bg-pc-surface px-3 py-1 text-sm font-semibold text-pc-text shadow-sm transition hover:bg-pc-surface-hover'
    : 'bg-[image:var(--pc-accent-fill)] text-white px-3 py-1 rounded-full text-sm font-semibold shadow-sm hover:bg-[image:var(--pc-accent-fill-hover)] transition'
))

function goToLogin() {
  try { trackLinkedInConversion(import.meta.env.VITE_LI_CONV_SIGNIN_CLICK) } catch { /* noop */ }
  try { router.push({ path: '/login' }) } catch { /* noop */ }
}

function trackUpgradeClick() {
  try { trackLinkedInConversion(import.meta.env.VITE_LI_CONV_UPGRADE_CLICK) } catch { /* noop */ }
}

function premiumActivationStorageKey(uid) {
  return `plancraftai:premium-activation:last-shown:${uid}`
}

async function maybeShowPremiumActivation() {
  const uid = authStore.user?.uid
  if (!uid || isGuest.value || isPremium.value) return

  try {
    await accessStore.fetchAccess(uid, { minIntervalMs: 15000 })
  } catch {
    // The prompt is only a soft conversion aid; never block task completion on access refresh.
  }
  if (isPremium.value || isGuest.value) return

  try {
    const lastShownAt = Number(localStorage.getItem(premiumActivationStorageKey(uid)) || 0)
    if (lastShownAt > 0 && Date.now() - lastShownAt < PREMIUM_ACTIVATION_COOLDOWN_MS) return
    localStorage.setItem(premiumActivationStorageKey(uid), String(Date.now()))
  } catch {
    // Continue without a frequency cap if storage is unavailable.
  }

  premiumActivationOpen.value = true
}

function handlePremiumActivationUpgrade() {
  trackUpgradeClick()
  router.push({
    path: billingRoutePath.value,
    query: { source: 'task-value-prompt' },
  }).catch(() => {})
}

function handlePremiumActivationDismissed() {
  premiumActivationOpen.value = false
}

async function goToTalkPlanner() {
  try {
    if (route.path !== '/talk-to-planner') {
      await router.push('/talk-to-planner')
    }
    mobileMenu.value = false
  } catch (err) {
    console.warn('Failed to open Talk to Planner', err?.message || err)
  }
}

onMounted(() => {
  feedbackStore.init()
  // Upgrade banner events
  try {
    upgradeHandler = () => {
      if (isAppleBillingSafeMode.value) return
      showUpgrade.value = true
    }
    window.addEventListener('upgrade-required', upgradeHandler)

    premiumActivationHandler = (event) => {
      if (event?.detail?.reason !== 'task-created') return
      window.setTimeout(() => {
        maybeShowPremiumActivation().catch(() => {})
      }, 700)
    }
    window.addEventListener('tasks:refresh-request', premiumActivationHandler)
  } catch { /* noop */ }
})

watch(
  () => authStore.token,
  () => {
    if (!authStore.user?.uid) return
    ensureWorkspaceHydrated()
  },
)

watch(
  () => showsDesktopSidebar.value,
  (isDesktopSidebarVisible) => {
    if (isDesktopSidebarVisible) {
      mobileMenu.value = false
    }
  },
)

onUnmounted(() => {
  clearWorkspaceRetryTimer()
  if (storageHandler) {
    try {
      window.removeEventListener('storage', storageHandler)
    } catch { /* noop */ }
    storageHandler = null
  }
  if (viewportChangeHandler) {
    try {
      window.removeEventListener('resize', viewportChangeHandler)
      window.removeEventListener('orientationchange', viewportChangeHandler)
    } catch { /* noop */ }
    viewportChangeHandler = null
  }
  if (pageVisibilityHandler) {
    try {
      document.removeEventListener('visibilitychange', pageVisibilityHandler)
    } catch { /* noop */ }
    pageVisibilityHandler = null
  }
  if (actionInboxUpdatedHandler) {
    try {
      window.removeEventListener('action-inbox-updated', actionInboxUpdatedHandler)
    } catch { /* noop */ }
    actionInboxUpdatedHandler = null
  }
  if (upgradeHandler) {
    try {
      window.removeEventListener('upgrade-required', upgradeHandler)
    } catch { /* noop */ }
    upgradeHandler = null
  }
  if (premiumActivationHandler) {
    try {
      window.removeEventListener('tasks:refresh-request', premiumActivationHandler)
    } catch { /* noop */ }
    premiumActivationHandler = null
  }
})
</script>

<style>
:root {
  --safe-area-top: env(safe-area-inset-top, 0px);
  --safe-area-right: env(safe-area-inset-right, 0px);
  --safe-area-bottom: env(safe-area-inset-bottom, 0px);
  --safe-area-left: env(safe-area-inset-left, 0px);
}

html {
  height: 100%;
  height: -webkit-fill-available;
  background: var(--pc-bg);
}

body,
#app {
  width: 100%;
  height: 100%;
  min-height: 100vh;
  min-height: 100dvh;
  min-height: -webkit-fill-available;
  background: var(--pc-bg);
}

body {
  margin: 0;
  overflow-x: hidden;
}

#app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100dvh;
  min-height: -webkit-fill-available;
}

.app-shell {
  --desktop-sidebar-width: 18rem;
  flex: 1 1 auto;
  display: flex;
  height: 100%;
  height: 100vh;
  height: 100dvh;
  height: -webkit-fill-available;
  min-height: 100vh;
  min-height: 100dvh;
  min-height: -webkit-fill-available;
  width: 100%;
  overflow: hidden;
  padding-left: var(--safe-area-left);
  padding-right: var(--safe-area-right);
}

/* The design-system shell fills the app-shell; its <main> hosts the pane so the
   pane's own scrolling (app-content) keeps working. */
.app-pc-shell {
  flex: 1;
  min-width: 0;
  min-height: 0;
  height: 100%;
}

.app-pc-shell .pc-shell__main {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.app-main-pane {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.app-shell--document-scroll {
  height: auto;
  min-height: 100vh;
  min-height: 100dvh;
  min-height: -webkit-fill-available;
  overflow: visible;
}

.app-main-pane--document-scroll {
  height: auto;
  min-height: 100vh;
  min-height: 100dvh;
  min-height: -webkit-fill-available;
  display: flex;
  flex-direction: column;
  overflow: visible;
}

.app-content--document-scroll {
  overflow: visible !important;
}

@media (min-width: 768px) {
  .app-shell {
    position: relative;
  }

  /* PcAppShell owns the sidebar width. Do not apply the legacy layout's
     sidebar offset to the content pane a second time. */
  .app-desktop-sidebar {
    position: fixed;
    top: 0;
    bottom: 0;
    left: var(--safe-area-left);
    z-index: 15;
    width: var(--desktop-sidebar-width);
    height: 100vh;
    height: 100dvh;
    height: -webkit-fill-available;
  }

  .app-main-pane {
    width: 100%;
    margin-left: 0;
  }

  .app-shell--overlay-sidebar .app-main-pane {
    width: 100%;
    margin-left: 0;
  }
}

.app-upgrade-banner {
  left: var(--safe-area-left);
  right: var(--safe-area-right);
  padding-top: var(--safe-area-top);
}

.app-mobile-drawer {
  padding-top: calc(var(--safe-area-top) + 1rem);
  padding-bottom: calc(var(--safe-area-bottom) + 1rem);
}

.app-desktop-sidebar {
  padding-top: 1rem;
  padding-bottom: calc(var(--safe-area-bottom) + 1rem);
}

.app-header {
  align-self: stretch;
  flex: 0 0 auto;
  width: 100%;
  box-sizing: border-box;
  margin: 0;
  padding-top: calc(var(--safe-area-top) + 1rem);
}

.app-content {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  background: var(--pc-bg);
  -webkit-overflow-scrolling: touch;
  padding-bottom: calc(1.5rem + var(--safe-area-bottom));
}

.app-mobile-bottom-nav {
  display: none;
}

.app-content > * {
  flex: 1 0 auto;
  min-width: 0;
  min-height: 100%;
  display: flex;
  flex-direction: column;
}

@media (max-width: 1024px) {
  .app-content {
    padding-bottom: calc(1rem + var(--safe-area-bottom));
  }
}

@media (max-width: 1200px) and (hover: none), (max-width: 767px) {
  .app-header--today {
    display: none;
  }

  .app-shell {
    height: 100%;
    max-height: 100dvh;
    min-height: 0;
    overflow: hidden;
  }

  .app-pc-shell {
    height: 100%;
    max-height: 100%;
    min-height: 0;
    overflow: hidden;
  }

  .app-main-pane {
    height: 100%;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .app-content {
    min-height: 0;
    overflow-x: hidden;
    overflow-y: auto;
    padding-bottom: calc(5.5rem + var(--safe-area-bottom));
    overscroll-behavior: contain;
    scrollbar-width: none;
  }

  .app-content::-webkit-scrollbar {
    display: none;
  }

  .app-mobile-bottom-nav {
    position: fixed;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 30;
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    align-items: end;
    gap: 0.25rem;
    padding: 0.55rem max(0.5rem, var(--safe-area-left)) calc(0.55rem + var(--safe-area-bottom));
    border-top: 1px solid var(--pc-border);
    background: color-mix(in srgb, var(--pc-surface) 94%, transparent);
    box-shadow: 0 -12px 32px rgba(15, 23, 42, 0.08);
    backdrop-filter: blur(18px);
  }

  .app-mobile-bottom-nav__item,
  .app-mobile-bottom-nav__capture {
    display: inline-flex;
    min-width: 0;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.2rem;
    border: 0;
    background: transparent;
    color: var(--pc-text-subtle);
    font-size: 0.68rem;
    font-weight: 600;
    line-height: 1;
    text-decoration: none;
  }

  .app-mobile-bottom-nav__item {
    min-height: 3rem;
    border-radius: 0.85rem;
  }

  .app-mobile-bottom-nav__item--active {
    color: var(--pc-accent-text);
  }

  .app-mobile-bottom-nav__item:active,
  .app-mobile-bottom-nav__item:focus-visible {
    outline: none;
    background: var(--pc-accent-soft);
  }

  .app-mobile-bottom-nav__capture {
    transform: translateY(-0.65rem);
    color: var(--pc-accent-text);
  }

  .app-mobile-bottom-nav__capture-icon {
    display: inline-flex;
    width: 2.65rem;
    height: 2.65rem;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--pc-border-strong);
    border-radius: 999px;
    background: var(--pc-accent);
    color: white;
    font-size: 1.65rem;
    font-weight: 400;
    line-height: 1;
    box-shadow: 0 8px 18px rgba(79, 70, 229, 0.22);
  }

  .app-mobile-bottom-nav__capture:focus-visible {
    outline: 2px solid var(--pc-accent);
    outline-offset: 3px;
  }

  .app-mobile-bottom-nav__badge {
    position: absolute;
    top: -0.35rem;
    right: -0.65rem;
    display: inline-flex;
    min-width: 1rem;
    height: 1rem;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    background: var(--pc-accent);
    color: white;
    font-size: 0.58rem;
    line-height: 1;
  }
}

.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease;
}
.slide-enter-from,
.slide-leave-to {
  transform: translateX(-100%);
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.18s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
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
  background: var(--pc-accent-soft);
  border: 1px solid var(--pc-border-strong);
  color: var(--pc-accent-text);
  letter-spacing: 0.02em;
  text-transform: uppercase;
}
</style>
