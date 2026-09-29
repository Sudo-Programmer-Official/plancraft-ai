<template>
  <div class="app-root pc-theme">
    <RouterView v-slot="{ Component }">
      <transition name="page-fade">
        <component :is="Component" :key="$route.fullPath" />
      </transition>
    </RouterView>

    <transition name="startup-fade">
      <div v-if="showStartupOverlay" class="startup-overlay" aria-live="polite" aria-busy="true">
        <div class="startup-overlay__panel">
          <img src="/plancraft-mark.svg" alt="PlanCraftAI" class="startup-overlay__logo" />
          <p class="startup-overlay__eyebrow">PlanCraftAI</p>
          <h1 class="startup-overlay__title">{{ startupOverlayTitle }}</h1>
          <p class="startup-overlay__subtitle">{{ startupOverlaySubtitle }}</p>
          <div class="startup-overlay__progress" aria-hidden="true">
            <div class="startup-overlay__progress-bar"></div>
          </div>
        </div>
      </div>
    </transition>

    <AiConsentDialog />
    <InstallPrompt />
    <ConfettiOverlay v-if="confettiVisible" @done="confettiVisible = false" />
    <FocusSession v-if="focus.isOpen" />
    <ReminderDueBanner v-if="authStore.user?.uid" />
    <AppLockScreen />
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElNotification } from 'element-plus'
import AiConsentDialog from '@/components/AiConsentDialog.vue'
import InstallPrompt from '@/components/InstallPrompt.vue'
// Side effect: capture the PWA install prompt before any screen asks for it.
import '@/composables/useInstallApp'
import ConfettiOverlay from '@/components/ConfettiOverlay.vue'
import AppLockScreen from '@/components/AppLockScreen.vue'
import FocusSession from '@/components/focus/FocusSession.vue'
import ReminderDueBanner from '@/components/ReminderDueBanner.vue'
import { useAppLockStore } from '@/stores/appLockStore'
import { useFocusStore } from '@/stores/focusStore'
import { setAnalyticsContext } from '@/services/analytics'
import { useAuthStore } from '@/stores/authStore'
import { useAppReady } from '@/composables/useAppReady'
import {
  getAiConsentStatus,
  openAiConsentPrompt,
  requiresAiConsent,
} from '@/services/aiConsentService'

const route = useRoute()
const { isShellReady, isLoggingOut, hasAuthenticatedSession, startupStage } = useAppReady()

const showStartupOverlay = computed(() => {
  if (isLoggingOut.value) return false
  if (startupStage.value === 'bootstrapping') return true
  if (!route.meta?.requiresAuth) return false
  if (!hasAuthenticatedSession.value) return false
  return !isShellReady.value
})

const startupOverlayTitle = computed(() => {
  switch (startupStage.value) {
    case 'authenticating':
      return 'Signing you in...'
    case 'bootstrapping':
    case 'preparing-workspace':
    default:
      return 'Preparing your workspace...'
  }
})

const startupOverlaySubtitle = computed(() => {
  switch (startupStage.value) {
    case 'authenticating':
      return 'Securing your session and loading your account'
    case 'bootstrapping':
    case 'preparing-workspace':
    default:
      return 'Syncing your tasks and restoring your flow'
  }
})

const appLock = useAppLockStore()
const authStore = useAuthStore()

watch(
  () => ({
    uid: authStore.user?.uid || null,
    isGuest: authStore.guest === true || authStore.user?.mode === 'guest',
    settled: !authStore.bootstrapping,
  }),
  (state) => appLock.syncUser(state),
  { immediate: true },
)

watch(
  () => String(authStore.user?.plan || 'free').toLowerCase(),
  (plan) => setAnalyticsContext({ plan }),
  { immediate: true },
)

const focus = useFocusStore()
watch(
  () => (authStore.bootstrapping ? undefined : authStore.user?.uid || null),
  (uid) => {
    if (uid !== undefined) focus.syncUser(uid)
  },
  { immediate: true },
)

const confettiVisible = ref(false)
const aiConsentAutoPrompted = ref(false)

function triggerConfetti(count) {
  confettiVisible.value = true
  try {
    window.dispatchEvent(new Event('confetti:launch'))
  } catch {}
  try {
    ElNotification({
      title: 'Streak up',
      message: `Day ${count} complete.`,
      type: 'success',
      duration: 2600,
      offset: 80,
    })
  } catch {}
}

let streakHandler = null
onMounted(() => {
  appLock.init().catch(() => {})
  streakHandler = (e) => {
    const count = e?.detail?.count || 1
    triggerConfetti(count)
  }
  window.addEventListener('streak-increased', streakHandler)
})

watch(
  () => ({
    showStartupOverlay: showStartupOverlay.value,
    hasAuthenticatedSession: hasAuthenticatedSession.value,
    requiresAuth: !!route.meta?.requiresAuth,
  }),
  ({ showStartupOverlay, hasAuthenticatedSession, requiresAuth }) => {
    if (aiConsentAutoPrompted.value) return
    if (!requiresAiConsent()) return
    if (!requiresAuth || !hasAuthenticatedSession) return
    if (showStartupOverlay) return
    if (getAiConsentStatus() !== 'unknown') return

    aiConsentAutoPrompted.value = true
    window.setTimeout(() => {
      openAiConsentPrompt('app-launch')
    }, 250)
  },
  { immediate: true, deep: true },
)

onBeforeUnmount(() => {
  try {
    if (streakHandler) window.removeEventListener('streak-increased', streakHandler)
  } catch {}
})
</script>

<style>
.page-fade-enter-active,
.page-fade-leave-active {
  transition: opacity 0.4s ease, filter 0.4s ease;
}

.page-fade-enter-from,
.page-fade-leave-to {
  opacity: 0;
  filter: blur(3px);
}

.startup-fade-enter-active,
.startup-fade-leave-active {
  transition: opacity 0.28s ease, transform 0.28s ease;
}

.startup-fade-enter-from,
.startup-fade-leave-to {
  opacity: 0;
  transform: scale(1.02);
}

.startup-overlay {
  --startup-bg: #f6f7fc;
  --startup-glow: rgba(129, 140, 248, 0.16);
  --startup-text: #0f172a;
  --startup-muted: #475569;
  --startup-subtle: #64748b;
  --startup-track: #e2e8f0;
  --startup-fill: linear-gradient(90deg, #a855f7, #6366f1);
  --startup-shadow: rgba(99, 102, 241, 0.25);
  position: fixed;
  inset: 0;
  z-index: 120;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: var(--startup-bg);
}

.startup-overlay__panel {
  width: min(100%, 28rem);
  text-align: center;
  color: var(--startup-text);
}

.startup-overlay__logo {
  width: 5rem;
  height: 5rem;
  margin: 0 auto 1rem;
  display: block;
  object-fit: contain;
  filter: drop-shadow(0 12px 24px var(--startup-shadow));
}

.startup-overlay__eyebrow {
  margin: 0 0 0.75rem;
  font-size: 0.85rem;
  letter-spacing: 0.35em;
  text-transform: uppercase;
  color: var(--startup-subtle);
}

.startup-overlay__title {
  margin: 0;
  font-size: clamp(2rem, 4vw, 2.75rem);
  font-weight: 700;
  line-height: 1.05;
  color: var(--startup-text);
}

.startup-overlay__subtitle {
  margin: 0.9rem auto 0;
  max-width: 22rem;
  font-size: 1rem;
  line-height: 1.6;
  color: var(--startup-muted);
}

.startup-overlay__progress {
  width: min(100%, 17rem);
  height: 0.5rem;
  margin: 1.75rem auto 0;
  overflow: hidden;
  border-radius: 999px;
  background: var(--startup-track);
}

.startup-overlay__progress-bar {
  width: 42%;
  height: 100%;
  border-radius: inherit;
  background: var(--startup-fill);
  box-shadow: 0 0 18px var(--startup-shadow);
  animation: startup-shimmer 1.4s ease-in-out infinite;
}

:root[data-pc-theme='dark'] .startup-overlay {
  --startup-bg: #111318;
  --startup-glow: rgba(124, 108, 242, 0.16);
  --startup-text: #eceef1;
  --startup-muted: #a3a9b4;
  --startup-subtle: #8a909b;
  --startup-track: #1e222b;
  --startup-fill: linear-gradient(90deg, #5b4fe0, #7c3aed);
  --startup-shadow: rgba(0, 0, 0, 0.3);
}

@media (prefers-color-scheme: dark) {
  :root[data-pc-theme='system'] .startup-overlay {
    --startup-bg: #111318;
    --startup-glow: rgba(124, 108, 242, 0.16);
    --startup-text: #eceef1;
    --startup-muted: #a3a9b4;
    --startup-subtle: #8a909b;
    --startup-track: #1e222b;
    --startup-fill: linear-gradient(90deg, #5b4fe0, #7c3aed);
    --startup-shadow: rgba(0, 0, 0, 0.3);
  }
}

@keyframes startup-shimmer {
  0% {
    transform: translateX(-110%);
  }
  100% {
    transform: translateX(340%);
  }
}

.pcai-auth-notification {
  width: min(92vw, 26rem) !important;
  border: 1px solid #e2e8f0 !important;
  border-radius: 1.35rem !important;
  background: #ffffff !important;
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.14) !important;
}

.pcai-auth-notification .el-notification__group {
  margin-left: 0 !important;
}

.pcai-auth-notification .el-notification__title {
  margin: 0 0 0.4rem;
  color: #0f172a !important;
  font-size: 0.8rem;
  font-weight: 700;
}

.pcai-auth-notification .el-notification__content {
  margin: 0 !important;
}

.pcai-auth-toast {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  color: #0f172a;
}

.pcai-auth-toast__avatar {
  flex: 0 0 auto;
}

.pcai-auth-toast__avatar-image,
.pcai-auth-toast__avatar-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 999px;
  object-fit: cover;
}

.pcai-auth-toast__avatar-image {
  border: 2px solid var(--pc-accent-soft);
}

.pcai-auth-toast__avatar-fallback {
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  color: #ffffff;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.pcai-auth-toast__body {
  min-width: 0;
}

.pcai-auth-toast__title {
  margin: 0;
}

.pcai-auth-toast__title {
  font-size: 1rem;
  font-weight: 700;
  color: #0f172a;
  word-break: break-word;
}
</style>
