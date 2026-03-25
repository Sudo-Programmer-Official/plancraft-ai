<template>
  <div class="app-root">
    <transition name="page-fade" mode="out-in">
      <RouterView />
    </transition>

    <transition name="startup-fade">
      <div v-if="showStartupOverlay" class="startup-overlay" aria-live="polite" aria-busy="true">
        <div class="startup-overlay__panel">
          <img src="/logo-bg-remove.png" alt="PlanCraftAI" class="startup-overlay__logo" />
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
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElNotification } from 'element-plus'
import AiConsentDialog from '@/components/AiConsentDialog.vue'
import InstallPrompt from '@/components/InstallPrompt.vue'
import ConfettiOverlay from '@/components/ConfettiOverlay.vue'
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

const confettiVisible = ref(false)
const aiConsentAutoPrompted = ref(false)

function triggerConfetti(count) {
  confettiVisible.value = true
  try {
    window.dispatchEvent(new Event('confetti:launch'))
  } catch {}
  try {
    ElNotification({
      title: 'Streak up! 🔥',
      message: `You're on a ${count}-day streak. Keep going!`,
      type: 'success',
      duration: 2600,
      offset: 80,
    })
  } catch {}
}

let streakHandler = null
onMounted(() => {
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
  position: fixed;
  inset: 0;
  z-index: 120;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background:
    radial-gradient(circle at top, rgba(96, 165, 250, 0.18), transparent 28%),
    linear-gradient(135deg, #1d1645 0%, #4f2b93 58%, #241d53 100%);
}

.startup-overlay__panel {
  width: min(100%, 28rem);
  text-align: center;
  color: #fff;
}

.startup-overlay__logo {
  width: 5rem;
  height: 5rem;
  margin: 0 auto 1rem;
  filter: drop-shadow(0 18px 34px rgba(31, 41, 55, 0.35));
}

.startup-overlay__eyebrow {
  margin: 0 0 0.75rem;
  font-size: 0.85rem;
  letter-spacing: 0.35em;
  text-transform: uppercase;
  color: rgba(224, 231, 255, 0.76);
}

.startup-overlay__title {
  margin: 0;
  font-size: clamp(2rem, 4vw, 2.75rem);
  font-weight: 700;
  line-height: 1.05;
}

.startup-overlay__subtitle {
  margin: 0.9rem auto 0;
  max-width: 22rem;
  font-size: 1rem;
  line-height: 1.6;
  color: rgba(224, 231, 255, 0.72);
}

.startup-overlay__progress {
  width: min(100%, 17rem);
  height: 0.5rem;
  margin: 1.75rem auto 0;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
}

.startup-overlay__progress-bar {
  width: 42%;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, rgba(192, 132, 252, 0.95), rgba(96, 165, 250, 0.95));
  box-shadow: 0 0 18px rgba(96, 165, 250, 0.35);
  animation: startup-shimmer 1.4s ease-in-out infinite;
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
  border: 1px solid rgba(129, 140, 248, 0.22) !important;
  border-radius: 1.35rem !important;
  background: linear-gradient(140deg, rgba(30, 27, 75, 0.96), rgba(91, 33, 182, 0.92)) !important;
  box-shadow: 0 26px 50px rgba(15, 23, 42, 0.28) !important;
}

.pcai-auth-notification .el-notification__group {
  margin-left: 0 !important;
}

.pcai-auth-notification .el-notification__title {
  margin: 0 0 0.4rem;
  color: rgba(224, 231, 255, 0.72);
  font-size: 0.8rem;
  letter-spacing: 0.28em;
  text-transform: uppercase;
}

.pcai-auth-notification .el-notification__content {
  margin: 0 !important;
}

.pcai-auth-toast {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  color: #fff;
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
  border: 2px solid rgba(255, 255, 255, 0.18);
}

.pcai-auth-toast__avatar-fallback {
  background: linear-gradient(135deg, rgba(244, 114, 182, 0.95), rgba(96, 165, 250, 0.95));
  color: #fff;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.pcai-auth-toast__body {
  min-width: 0;
}

.pcai-auth-toast__eyebrow,
.pcai-auth-toast__title,
.pcai-auth-toast__subtitle {
  margin: 0;
}

.pcai-auth-toast__eyebrow {
  font-size: 0.72rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(224, 231, 255, 0.62);
}

.pcai-auth-toast__title {
  margin-top: 0.15rem;
  font-size: 1rem;
  font-weight: 700;
  color: #fff;
  word-break: break-word;
}

.pcai-auth-toast__subtitle {
  margin-top: 0.15rem;
  font-size: 0.88rem;
  color: rgba(224, 231, 255, 0.78);
  word-break: break-word;
}
</style>
