<template>
  <Teleport to="body">
    <transition name="pcai-fade">
      <div
        v-if="modelValue"
        class="pcai-onboarding fixed inset-0 z-[9999] pointer-events-auto"
        role="dialog"
        aria-modal="true"
      >
        <div class="pcai-backdrop absolute inset-0"></div>

        <transition name="pcai-scale">
          <div
            v-if="phase === 'intro'"
            class="pcai-card pcai-card--intro"
            :class="{ 'pcai-card--mobile': isMobile }"
          >
            <div class="pcai-card__glare"></div>
            <div class="pcai-card__header">
              <span class="pcai-card__badge">PlanCraftAI</span>
              <p class="pcai-card__greeting">
                Hey {{ firstName }}, welcome to PlanCraftAI 👋
              </p>
              <p class="pcai-card__subhead">
                Let’s get you set up with a quick, voice-friendly walkthrough so you always know where
                to plan, speak, and reflect.
              </p>
            </div>
            <div class="pcai-card__actions">
              <button class="pcai-btn pcai-btn--primary" @click="startSteps">
                Start the tour
              </button>
              <button class="pcai-btn pcai-btn--ghost" @click="handleShowLater">
                Show me later
              </button>
              <button class="pcai-btn pcai-btn--ghost" @click="handleSkip">Skip</button>
            </div>
          </div>
        </transition>

        <transition name="pcai-slide">
          <div
            v-if="phase === 'steps' && currentStep"
            class="pcai-card pcai-card--step"
            :class="{ 'pcai-card--mobile': isMobile }"
            :style="cardStyle"
          >
            <div class="pcai-card__glare"></div>
            <div class="pcai-progress">
              <span class="pcai-progress__pill">Step {{ activeDisplay }} of {{ totalSteps }}</span>
              <div class="pcai-progress__bar">
                <span class="pcai-progress__fill" :style="{ width: `${progressPercent}%` }"></span>
              </div>
            </div>

            <div class="pcai-card__icon">
              <span class="pcai-icon-shimmer" aria-hidden="true">{{ currentStep.icon }}</span>
            </div>

            <div class="pcai-card__body">
              <p class="pcai-card__title">{{ currentStep.title }}</p>
              <p class="pcai-card__description">
                {{ currentStep.description }}
              </p>
            </div>

            <div v-if="currentStep.aiTip" class="pcai-ai-bubble">
              <span class="pcai-ai-bubble__avatar">✨</span>
              <p>{{ currentStep.aiTip }}</p>
            </div>

            <div class="pcai-card__controls">
              <button
                class="pcai-btn pcai-btn--ghost"
                :disabled="!hasPrev"
                @click="goPrev"
              >
                Back
              </button>
              <button class="pcai-btn pcai-btn--primary" @click="goNext">
                {{ isLast ? 'Finish' : 'Next' }}
              </button>
            </div>

            <div class="pcai-card__secondary">
              <button class="pcai-link" @click="handleShowLater">Show me later</button>
              <button class="pcai-link" @click="handleSkip">Skip</button>
            </div>
          </div>
        </transition>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import { trackOnboarding } from '@/services/analytics'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  steps: {
    type: Array,
    default: () => [],
  },
  firstName: {
    type: String,
    default: 'friend',
  },
})

const emit = defineEmits(['update:modelValue', 'started', 'step', 'finished', 'skipped', 'later'])

const phase = ref('intro')
const driverInstance = ref(null)
const driverStepsRef = ref([])
const activeIndex = ref(0)
const targetRect = ref(null)
const activeElement = ref(null)
const isMobile = ref(false)

const totalSteps = computed(() => props.steps.length)
const currentStep = computed(() => props.steps[activeIndex.value] || null)
const progressPercent = computed(() => {
  if (!totalSteps.value) return 0
  if (totalSteps.value === 1) return 100
  return (activeIndex.value / (totalSteps.value - 1)) * 100
})
const hasPrev = computed(() => activeIndex.value > 0)
const isLast = computed(() => activeIndex.value >= totalSteps.value - 1)
const activeDisplay = computed(() => Math.min(activeIndex.value + 1, totalSteps.value))

const cardStyle = computed(() => {
  if (typeof window === 'undefined' || isMobile.value || !targetRect.value) return {}
  const spacing = 24
  const viewportWidth = window.innerWidth
  const cardWidth = 360
  const cardHeight = 260
  const preferred = currentStep.value?.placement || 'right'
  let top = targetRect.value.top
  let left = targetRect.value.right + spacing

  if (preferred === 'left') {
    left = targetRect.value.left - cardWidth - spacing
    top = targetRect.value.top
  } else if (preferred === 'bottom') {
    top = targetRect.value.bottom + spacing
    left = targetRect.value.left
  } else if (preferred === 'top') {
    top = targetRect.value.top - cardHeight - spacing
    left = targetRect.value.left
  }

  const clampedTop = Math.min(Math.max(20, top), window.innerHeight - cardHeight - 20)
  const clampedLeft = Math.min(Math.max(20, left), viewportWidth - cardWidth - 20)
  return {
    top: `${clampedTop}px`,
    left: `${clampedLeft}px`,
  }
})

watch(
  () => props.modelValue,
  (visible) => {
    if (visible) {
      trackOnboarding('started', { step_count: props.steps.length })
      phase.value = 'intro'
      activeIndex.value = 0
      updateViewport()
      if (typeof document !== 'undefined') {
        document.documentElement.classList.add('pcai-onboarding-open')
      }
    } else {
      teardownDriver()
      if (typeof document !== 'undefined') {
        document.documentElement.classList.remove('pcai-onboarding-open')
      }
    }
  }
)

watch(
  () => props.steps,
  () => {
    if (driverInstance.value && driverInstance.value.isActive()) {
      setupDriver(activeIndex.value)
    }
  }
)

function startSteps() {
  if (!props.steps.length) {
    handleSkip()
    return
  }
  phase.value = 'steps'
  emit('started')
  console.log('[Onboarding] started')
  setupDriver(0)
}

function getElementForStep(step) {
  if (!step) return null
  if (typeof step.element === 'function') {
    try {
      return step.element()
    } catch {
      return null
    }
  }
  if (step.element instanceof Element) return step.element
  if (typeof document === 'undefined') return null
  if (step.selector) return document.querySelector(step.selector)
  if (typeof step.element === 'string') return document.querySelector(step.element)
  return null
}

function setupDriver(stepIndex = 0) {
  if (!driverInstance.value) {
    driverInstance.value = driver({
      stagePadding: 24,
      stageRadius: 20,
      animate: true,
      overlayOpacity: 0.6,
      allowClose: false,
      disableActiveInteraction: false,
      showProgress: false,
      showButtons: [],
      onDeselected: handleDeselected,
      onDestroyed: () => {
        activeElement.value = null
        targetRect.value = null
      },
    })
  }

  const driverSteps = props.steps.map((step, index) => ({
    element: () => getElementForStep(step),
    popover: {
      popoverClass: 'pcai-driver-hidden',
      side: step.placement || 'right',
      showButtons: [],
    },
    onHighlightStarted: (el) => handleExternalHighlight(index, el),
  }))

  driverStepsRef.value = driverSteps
  driverInstance.value.setSteps(driverSteps)
  driverInstance.value.drive(stepIndex)
  if (!getElementForStep(props.steps[stepIndex])) {
    moveToStep(stepIndex, 1)
  }
}

function handleExternalHighlight(index, el) {
  activeIndex.value = index
  emit('step', { step: index + 1, id: props.steps[index]?.id })
  console.log('[Onboarding] step_completed', props.steps[index]?.id || index + 1)
  activeElement.value = el
  updateRect()
}

function handleDeselected() {
  activeElement.value = null
  targetRect.value = null
}

function updateRect() {
  if (!activeElement.value) {
    targetRect.value = null
    return
  }
  const rect = activeElement.value.getBoundingClientRect()
  targetRect.value = {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
    right: rect.right,
    bottom: rect.bottom,
  }
}

function moveToStep(targetIndex, direction = 1) {
  if (!driverInstance.value || typeof driverInstance.value.moveTo !== 'function') return
  let idx = targetIndex
  while (idx >= 0 && idx < totalSteps.value) {
    const candidate = props.steps[idx]
    if (getElementForStep(candidate)) {
      driverInstance.value.moveTo(idx)
      return
    }
    idx += direction
  }
  if (direction > 0) finishTour()
}

function goNext() {
  if (isLast.value) {
    finishTour()
    return
  }
  moveToStep(activeIndex.value + 1, 1)
}

function goPrev() {
  if (!hasPrev.value) return
  moveToStep(activeIndex.value - 1, -1)
}

function finishTour() {
  trackOnboarding('completed', { step_count: props.steps.length })
  emit('finished')
  console.log('[Onboarding] finished')
  closeTour()
}

function handleSkip() {
  trackOnboarding('skipped', { reason: 'skip', at_step: phase.value === 'steps' ? activeIndex.value + 1 : 0 })
  emit('skipped')
  closeTour()
}

function handleShowLater() {
  trackOnboarding('skipped', { reason: 'later', at_step: phase.value === 'steps' ? activeIndex.value + 1 : 0 })
  emit('later')
  closeTour()
}

function closeTour() {
  emit('update:modelValue', false)
  teardownDriver()
}

function teardownDriver() {
  try {
    driverInstance.value?.destroy()
  } catch {
    /* noop */
  }
  driverInstance.value = null
  phase.value = 'intro'
  targetRect.value = null
  activeElement.value = null
  activeIndex.value = 0
}

function updateViewport() {
  if (typeof window === 'undefined') return
  isMobile.value = window.innerWidth < 768
  updateRect()
}

function handleKeydown(event) {
  if (!props.modelValue) return
  if (event.key === 'Escape') {
    handleSkip()
  }
}

onMounted(() => {
  window.addEventListener('resize', updateViewport)
  window.addEventListener('scroll', updateRect, true)
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateViewport)
  window.removeEventListener('scroll', updateRect, true)
  window.removeEventListener('keydown', handleKeydown)
  teardownDriver()
})
</script>

<style scoped>
.pcai-onboarding {
  font-family: 'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  z-index: 1000000500 !important;
}

.pcai-backdrop {
  background: radial-gradient(circle at 20% 20%, rgba(99, 102, 241, 0.12), transparent 50%),
    radial-gradient(circle at 80% 0%, rgba(236, 72, 153, 0.12), transparent 50%),
    rgba(2, 6, 23, 0.82);
  backdrop-filter: blur(14px);
}

.pcai-card {
  position: fixed;
  min-width: 320px;
  max-width: 380px;
  padding: 1.5rem;
  border-radius: 28px;
  background: rgba(8, 8, 16, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 25px 80px rgba(15, 23, 42, 0.45);
  color: #f8fafc;
  overflow: hidden;
  isolation: isolate;
}

.pcai-card--intro {
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.pcai-card--step {
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.pcai-card--mobile {
  top: auto !important;
  bottom: 5%;
  left: 50%;
  transform: translateX(-50%);
  width: calc(100% - 2.5rem);
  max-width: none;
}

.pcai-card__glare {
  position: absolute;
  inset: 0;
  background: linear-gradient(120deg, rgba(99, 102, 241, 0.2), transparent, rgba(236, 72, 153, 0.18));
  opacity: 0.7;
  mix-blend-mode: screen;
  pointer-events: none;
  animation: pcai-glow 8s ease-in-out infinite alternate;
}

.pcai-card__header {
  position: relative;
  z-index: 1;
  text-align: left;
}

.pcai-card__badge {
  display: inline-flex;
  padding: 0.15rem 0.7rem;
  border-radius: 999px;
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  background: rgba(99, 102, 241, 0.18);
  color: #c7d2fe;
  margin-bottom: 0.85rem;
}

.pcai-card__greeting {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
}

.pcai-card__subhead {
  font-size: 0.95rem;
  color: rgba(226, 232, 240, 0.82);
  line-height: 1.6;
}

.pcai-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: center;
  margin-top: 1.5rem;
}

.pcai-btn {
  border-radius: 999px;
  padding: 0.7rem 1.5rem;
  font-weight: 600;
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
  border: none;
  cursor: pointer;
}

.pcai-btn--primary {
  background: linear-gradient(120deg, #6366f1, #ec4899);
  box-shadow: 0 12px 28px rgba(99, 102, 241, 0.35);
  color: #fff;
}

.pcai-btn--primary:hover {
  transform: translateY(-1px);
}

.pcai-btn--ghost {
  background: rgba(15, 23, 42, 0.6);
  color: #cbd5f5;
  border: 1px solid rgba(203, 213, 245, 0.2);
}

.pcai-btn--ghost:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.pcai-progress {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-bottom: 1rem;
}

.pcai-progress__pill {
  align-self: flex-start;
  font-size: 0.75rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: rgba(226, 232, 240, 0.9);
  animation: pcai-float 4s ease-in-out infinite;
}

.pcai-progress__bar {
  width: 100%;
  height: 6px;
  border-radius: 999px;
  background: rgba(248, 250, 252, 0.12);
  overflow: hidden;
}

.pcai-progress__fill {
  display: block;
  height: 100%;
  background: linear-gradient(120deg, #38bdf8, #a855f7, #ec4899);
  border-radius: inherit;
  transition: width 0.4s ease;
  box-shadow: 0 0 20px rgba(99, 102, 241, 0.4);
}

.pcai-card__icon {
  width: 52px;
  height: 52px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.65);
  border: 1px solid rgba(255, 255, 255, 0.08);
  margin-bottom: 1rem;
}

.pcai-icon-shimmer {
  font-size: 24px;
  animation: pcai-shimmer 3s linear infinite;
}

.pcai-card__body {
  position: relative;
  z-index: 1;
  margin-bottom: 1rem;
}

.pcai-card__title {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 0.35rem;
}

.pcai-card__description {
  font-size: 0.95rem;
  line-height: 1.6;
  color: rgba(226, 232, 240, 0.85);
}

.pcai-ai-bubble {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.65rem 0.9rem;
  border-radius: 16px;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(99, 102, 241, 0.3);
  font-size: 0.85rem;
  color: rgba(226, 232, 240, 0.9);
  margin-bottom: 1rem;
}

.pcai-ai-bubble__avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.7), rgba(14, 116, 144, 0.4));
  box-shadow: 0 0 12px rgba(99, 102, 241, 0.4);
}

.pcai-card__controls {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.pcai-card__controls .pcai-btn {
  flex: 1;
}

.pcai-card__secondary {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
}

.pcai-link {
  background: none;
  border: none;
  color: rgba(167, 139, 250, 0.95);
  cursor: pointer;
  padding: 0;
  font-weight: 500;
}

.pcai-driver-hidden {
  visibility: hidden !important;
  opacity: 0 !important;
  pointer-events: none !important;
}

@keyframes pcai-glow {
  0% {
    opacity: 0.4;
    transform: translateY(0);
  }
  100% {
    opacity: 0.8;
    transform: translateY(-10px);
  }
}

@keyframes pcai-shimmer {
  0% {
    filter: drop-shadow(0 0 6px rgba(99, 102, 241, 0.6));
  }
  100% {
    filter: drop-shadow(0 0 18px rgba(236, 72, 153, 0.55));
  }
}

@keyframes pcai-float {
  0% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-2px);
  }
  100% {
    transform: translateY(0);
  }
}

.pcai-fade-enter-active,
.pcai-fade-leave-active {
  transition: opacity 0.3s ease;
}

.pcai-fade-enter-from,
.pcai-fade-leave-to {
  opacity: 0;
}

.pcai-slide-enter-active,
.pcai-slide-leave-active {
  transition: opacity 0.3s ease, transform 0.35s ease;
}

.pcai-slide-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.pcai-slide-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

.pcai-scale-enter-active,
.pcai-scale-leave-active {
  transition: opacity 0.25s ease, transform 0.35s ease;
}

.pcai-scale-enter-from,
.pcai-scale-leave-to {
  opacity: 0;
  transform: scale(0.92);
}

@media (max-width: 640px) {
  .pcai-card {
    padding: 1.25rem;
  }

  .pcai-card__secondary {
    flex-direction: column;
    gap: 0.35rem;
    align-items: flex-start;
  }
}

</style>

<style>
.driver-active .pcai-onboarding,
.driver-active .pcai-onboarding * {
  pointer-events: auto !important;
  touch-action: auto !important;
}
</style>
