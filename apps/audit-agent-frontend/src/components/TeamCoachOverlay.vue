<template>
  <Teleport to="body">
    <Transition name="coach-fade">
      <div
        v-if="isOpen"
        class="coach-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="coach-title"
      >
        <div class="coach-backdrop" @click="handleClose" />

        <div class="coach-panel">
          <header class="coach-header">
            <div class="header-text">
              <h2 id="coach-title">
                <span class="header-icon">🧭</span>
                Guided workspace tour
              </h2>
              <p class="header-sub">
                {{ finished ? 'You’re all set! Feel free to replay anytime.' : headerMessage }}
              </p>
            </div>

            <div class="header-actions">
              <button class="ghost" type="button" @click="handleReplay" v-if="finished">
                Replay tour
              </button>
              <button class="ghost" type="button" @click="handleSkip" v-else>
                Skip tour
              </button>
              <button class="icon-btn" type="button" @click="handleClose" aria-label="Dismiss tour">
                ✕
              </button>
            </div>
          </header>

          <div class="progress">
            <div class="progress-bar">
              <span class="progress-fill" :style="{ width: `${progressPercent}%` }" />
            </div>
            <span class="progress-label">{{ progressPercent }}% complete</span>
          </div>

          <div class="coach-body">
            <aside class="coach-steps">
              <button
                v-for="step in steps"
                :key="step.id"
                class="coach-step"
                :class="stepClasses(step.id)"
                type="button"
                @click="jumpToStep(step)"
              >
                <span class="step-status">
                  <span v-if="isStepComplete(step.id)">✔</span>
                  <span v-else-if="activeStep && activeStep.id === step.id">●</span>
                  <span v-else>○</span>
                </span>
                <span class="step-label">{{ step.title }}</span>
              </button>
            </aside>

            <section class="coach-content" v-if="activeStep">
              <div class="coach-card">
                <div class="coach-icon">{{ activeStep.icon || '✨' }}</div>
                <h3>{{ activeStep.title }}</h3>
                <p>{{ activeStep.description }}</p>

                <p v-if="activeStep.tip" class="coach-tip">
                  <strong>Coach tip:</strong> {{ activeStep.tip }}
                </p>

                <div class="coach-actions">
                  <button
                    v-if="activeStep.routeName"
                    type="button"
                    class="primary"
                    @click="navigateToStep(activeStep)"
                  >
                    {{ activeStep.actionLabel || 'Jump there' }}
                  </button>
                  <button type="button" class="secondary" @click="markStepComplete(activeStep.id)">
                    Mark step complete
                  </button>
                </div>
              </div>
            </section>

            <section class="coach-content" v-else>
              <div class="coach-card summary">
                <div class="coach-icon celebration">🎉</div>
                <h3>Tour complete!</h3>
                <p>You’ve covered the essentials. Keep building momentum with your team.</p>
                <div class="coach-actions">
                  <button type="button" class="primary" @click="handleClose">
                    Continue in workspace
                  </button>
                  <button type="button" class="secondary" @click="handleReplay">
                    Replay tour
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>

        <div v-if="showConfetti" class="confetti-layer">
          <span v-for="piece in confettiPieces" :key="piece" class="confetti-piece" />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useFirstRunCoachStore } from '@/stores/firstRunCoachStore'

const coachStore = useFirstRunCoachStore()
const router = useRouter()

const { steps, overlayOpen, progress, nextStep, finished, celebrationKey, activeOrgId, currentState } =
  storeToRefs(coachStore)

const confettiPieces = Array.from({ length: 24 }, (_, index) => index)
const showConfetti = ref(false)

const progressPercent = computed(() => Math.round((progress.value || 0) * 100))
const completedSteps = computed(() => new Set(currentState.value?.completedSteps ?? []))

const activeStep = computed(() => {
  if (finished.value) return null
  return nextStep.value ?? steps.value.at(-1) ?? null
})

const isOpen = computed(() => overlayOpen.value)

const headerMessage = computed(() => {
  if (!activeStep.value) {
    return 'Makes sense to celebrate—feel free to replay or keep exploring.'
  }
  return 'Let’s walk through the key areas to get your team rolling.'
})

const stopConfettiWatch = watch(
  () => celebrationKey.value,
  (key) => {
    if (!key) return
    showConfetti.value = true
    setTimeout(() => {
      showConfetti.value = false
    }, 3200)
    coachStore.consumeCelebrationKey()
  },
  { immediate: true },
)

onMounted(() => {
  if (finished.value && !celebrationKey.value) {
    showConfetti.value = true
    setTimeout(() => {
      showConfetti.value = false
    }, 3200)
  }
})

function handleClose() {
  coachStore.closeOverlay()
}

function handleSkip() {
  coachStore.skipOnboarding()
}

function handleReplay() {
  coachStore.replayOnboarding()
}

function navigateToStep(step) {
  if (!step?.routeName) return
  const orgId = activeOrgId.value
  if (!orgId) return
  router.push({ name: step.routeName, params: { orgId } }).catch(() => {})
  coachStore.closeOverlay()
}

function markStepComplete(stepId: string) {
  coachStore.completeStep(stepId)
}

function jumpToStep(step) {
  if (activeStep.value && activeStep.value.id === step.id) return
  if (!completedSteps.value.has(step.id)) return
  // Allow revisiting completed steps by navigating to their target area.
  if (step.routeName) {
    navigateToStep(step)
  }
}

function stepClasses(stepId: string) {
  return {
    complete: completedSteps.value.has(stepId),
    active: !!activeStep.value && activeStep.value.id === stepId,
  }
}

function isStepComplete(stepId: string) {
  return completedSteps.value.has(stepId)
}

onBeforeUnmount(() => {
  stopConfettiWatch()
})
</script>

<style scoped>
.coach-overlay {
  position: fixed;
  inset: 0;
  z-index: 3200;
  display: flex;
  align-items: center;
  justify-content: center;
}

.coach-fade-enter-active,
.coach-fade-leave-active {
  transition: opacity 160ms ease;
}

.coach-fade-enter-from,
.coach-fade-leave-to {
  opacity: 0;
}

.coach-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(9, 12, 23, 0.68);
  backdrop-filter: blur(18px);
}

.coach-panel {
  position: relative;
  z-index: 1;
  width: min(960px, 92vw);
  max-height: 84vh;
  display: flex;
  flex-direction: column;
  border-radius: 28px;
  background: linear-gradient(155deg, rgba(15, 23, 42, 0.92), rgba(30, 64, 175, 0.72));
  border: 1px solid rgba(148, 163, 184, 0.35);
  box-shadow: 0 40px 88px rgba(8, 10, 20, 0.55);
  color: #e2e8f0;
  overflow: hidden;
}

.coach-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  padding: 28px 32px 16px;
}

.header-text h2 {
  margin: 0;
  font-size: 1.8rem;
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-icon {
  font-size: 1.9rem;
}

.header-sub {
  margin: 8px 0 0;
  color: rgba(226, 232, 240, 0.78);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ghost {
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 16px;
  padding: 8px 16px;
  font-size: 0.9rem;
  background: transparent;
  color: inherit;
  cursor: pointer;
  transition: border-color 160ms ease, background 160ms ease;
}

.ghost:hover {
  border-color: rgba(196, 181, 253, 0.65);
  background: rgba(196, 181, 253, 0.12);
}

.icon-btn {
  border: none;
  background: rgba(148, 163, 184, 0.2);
  color: rgba(226, 232, 240, 0.9);
  font-size: 1rem;
  border-radius: 999px;
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: background 160ms ease;
}

.icon-btn:hover {
  background: rgba(226, 232, 240, 0.3);
}

.progress {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 32px 16px;
}

.progress-bar {
  flex: 1;
  height: 8px;
  border-radius: 999px;
  background: rgba(79, 70, 229, 0.25);
  overflow: hidden;
  position: relative;
}

.progress-fill {
  position: absolute;
  inset: 0;
  width: 0%;
  background: linear-gradient(120deg, #818cf8, #a855f7);
  border-radius: inherit;
  transition: width 220ms ease-out;
}

.progress-label {
  font-size: 0.85rem;
  color: rgba(226, 232, 240, 0.76);
}

.coach-body {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 22px;
  padding: 0 32px 32px;
  overflow: auto;
}

.coach-steps {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.coach-step {
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 16px;
  padding: 10px 14px;
  background: rgba(15, 23, 42, 0.6);
  color: inherit;
  font-size: 0.9rem;
  cursor: pointer;
  transition: border-color 140ms ease, background 140ms ease;
}

.coach-step:hover {
  border-color: rgba(148, 163, 184, 0.45);
}

.coach-step.active {
  border-color: rgba(196, 181, 253, 0.75);
  background: rgba(129, 140, 248, 0.18);
}

.coach-step.complete {
  border-color: rgba(74, 222, 128, 0.55);
  background: rgba(74, 222, 128, 0.14);
}

.step-status {
  display: inline-flex;
  width: 18px;
  justify-content: center;
}

.coach-content {
  min-height: 260px;
}

.coach-card {
  background: rgba(15, 23, 42, 0.7);
  border-radius: 22px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  box-shadow: 0 28px 64px rgba(10, 12, 24, 0.35);
  padding: 26px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.coach-card h3 {
  margin: 0;
  font-size: 1.4rem;
}

.coach-card p {
  margin: 0;
  color: rgba(226, 232, 240, 0.85);
  line-height: 1.55;
}

.coach-icon {
  align-self: flex-start;
  font-size: 2rem;
  border-radius: 18px;
  padding: 10px 14px;
  background: rgba(129, 140, 248, 0.18);
}

.coach-tip {
  border-left: 3px solid rgba(129, 140, 248, 0.65);
  padding-left: 14px;
  color: rgba(196, 181, 253, 0.85);
}

.coach-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 8px;
}

.primary,
.secondary {
  border-radius: 14px;
  padding: 12px 18px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: transform 140ms ease, box-shadow 140ms ease, background 140ms ease;
}

.primary {
  background: linear-gradient(135deg, #6366f1, #a855f7);
  color: #eef2ff;
  box-shadow: 0 18px 40px rgba(99, 102, 241, 0.35);
}

.primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 24px 48px rgba(99, 102, 241, 0.45);
}

.secondary {
  background: rgba(148, 163, 184, 0.2);
  color: rgba(226, 232, 240, 0.9);
}

.secondary:hover {
  background: rgba(148, 163, 184, 0.35);
}

.summary {
  align-items: center;
  text-align: center;
}

.summary p {
  max-width: 360px;
}

.celebration {
  background: rgba(74, 222, 128, 0.18);
}

.confetti-layer {
  pointer-events: none;
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.confetti-piece {
  position: absolute;
  top: -12%;
  width: 10px;
  height: 18px;
  background: linear-gradient(180deg, #f87171, #fbbf24, #34d399, #60a5fa);
  opacity: 0;
  animation: confetti-fall 1200ms ease-in forwards;
}

.confetti-piece:nth-child(odd) {
  animation-duration: 1400ms;
}

.confetti-piece:nth-child(3n) {
  animation-duration: 1600ms;
}

.confetti-piece:nth-child(4n) {
  animation-duration: 1100ms;
}

.confetti-piece {
  left: calc(var(--i, 0) * 5%);
  transform: rotate(calc(var(--i, 0) * 15deg));
}

.confetti-piece:nth-child(1) { --i: 2; }
.confetti-piece:nth-child(2) { --i: 6; }
.confetti-piece:nth-child(3) { --i: 10; }
.confetti-piece:nth-child(4) { --i: 14; }
.confetti-piece:nth-child(5) { --i: 18; }
.confetti-piece:nth-child(6) { --i: 22; }
.confetti-piece:nth-child(7) { --i: 26; }
.confetti-piece:nth-child(8) { --i: 30; }
.confetti-piece:nth-child(9) { --i: 34; }
.confetti-piece:nth-child(10) { --i: 38; }
.confetti-piece:nth-child(11) { --i: 42; }
.confetti-piece:nth-child(12) { --i: 46; }
.confetti-piece:nth-child(13) { --i: 50; }
.confetti-piece:nth-child(14) { --i: 54; }
.confetti-piece:nth-child(15) { --i: 58; }
.confetti-piece:nth-child(16) { --i: 62; }
.confetti-piece:nth-child(17) { --i: 66; }
.confetti-piece:nth-child(18) { --i: 70; }
.confetti-piece:nth-child(19) { --i: 74; }
.confetti-piece:nth-child(20) { --i: 78; }
.confetti-piece:nth-child(21) { --i: 82; }
.confetti-piece:nth-child(22) { --i: 86; }
.confetti-piece:nth-child(23) { --i: 90; }
.confetti-piece:nth-child(24) { --i: 94; }

@keyframes confetti-fall {
  0% {
    transform: translateY(0) rotate(0deg);
    opacity: 0;
  }
  20% {
    opacity: 1;
  }
  100% {
    transform: translateY(120vh) rotate(360deg);
    opacity: 0;
  }
}

@media (max-width: 960px) {
  .coach-body {
    grid-template-columns: 1fr;
  }

  .coach-steps {
    flex-direction: row;
    flex-wrap: wrap;
  }

  .coach-step {
    flex: 1 1 calc(50% - 8px);
  }
}

@media (max-width: 640px) {
  .coach-panel {
    width: 96vw;
    max-height: 90vh;
  }

  .coach-header {
    flex-direction: column;
    align-items: stretch;
  }

  .header-actions {
    justify-content: flex-end;
  }

  .coach-step {
    flex: 1 1 100%;
  }
}
</style>
