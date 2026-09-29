<template>
  <Teleport to="body">
    <transition name="focus-fade">
      <div
        v-if="focus.isOpen"
        class="focus-screen"
        role="dialog"
        aria-modal="true"
        aria-labelledby="focus-task-title"
      >
        <div class="focus-panel">
          <!-- Setup -->
          <template v-if="focus.phase === 'setup'">
            <p class="focus-eyebrow">▶ Focus</p>
            <h1 id="focus-task-title" class="focus-title">{{ focus.session.taskTitle }}</h1>
            <p class="focus-sub">How long do you want to stay with this?</p>

            <div class="focus-durations" role="radiogroup" aria-label="Focus length">
              <button
                v-for="mins in FOCUS_DURATIONS"
                :key="mins"
                type="button"
                role="radio"
                :aria-checked="selectedMinutes === mins"
                class="focus-chip"
                :class="{ 'focus-chip--active': selectedMinutes === mins }"
                @click="selectedMinutes = mins"
              >
                {{ mins }} min
              </button>
              <button
                type="button"
                role="radio"
                :aria-checked="selectedMinutes === null"
                class="focus-chip"
                :class="{ 'focus-chip--active': selectedMinutes === null }"
                @click="selectedMinutes = null"
              >
                Open-ended
              </button>
            </div>

            <div class="focus-actions">
              <button type="button" class="focus-btn focus-btn--ghost" @click="focus.close()">Cancel</button>
              <button type="button" class="focus-btn focus-btn--primary" @click="focus.start(selectedMinutes)">
                Start focus
              </button>
            </div>
          </template>

          <!-- Running -->
          <template v-else-if="focus.phase === 'running'">
            <p class="focus-eyebrow">🔥 {{ focus.isPaused ? 'Paused' : 'Locked in' }}</p>
            <h1 id="focus-task-title" class="focus-title">{{ focus.session.taskTitle }}</h1>

            <div class="focus-clock" :class="{ 'focus-clock--paused': focus.isPaused }" aria-live="off">
              {{ clockText }}
            </div>
            <p class="focus-label">{{ focus.plannedMs ? 'Focus session' : 'Open-ended focus' }}</p>
            <p class="focus-sub">Stay with this one thing.</p>

            <div class="focus-actions">
              <button
                v-if="focus.isPaused"
                type="button"
                class="focus-btn focus-btn--ghost"
                @click="focus.resume()"
              >
                Resume
              </button>
              <button v-else type="button" class="focus-btn focus-btn--ghost" @click="focus.pause()">Pause</button>
              <button type="button" class="focus-btn focus-btn--primary" @click="focus.finish()">Finish</button>
            </div>
          </template>

          <!-- Done -->
          <template v-else-if="focus.phase === 'done'">
            <p class="focus-eyebrow">🎯 {{ focusedText }} focused</p>
            <h1 id="focus-task-title" class="focus-title">{{ focus.session.taskTitle }}</h1>
            <p class="focus-sub">Nice work. What's next?</p>

            <div class="focus-actions focus-actions--stack">
              <button
                v-if="task && !task.completed"
                type="button"
                class="focus-btn focus-btn--primary"
                :disabled="completing"
                @click="completeTask"
              >
                ✓ Complete task
              </button>
              <button type="button" class="focus-btn focus-btn--ghost" @click="focus.close('break')">
                Take a break
              </button>
              <button type="button" class="focus-btn focus-btn--ghost" @click="focus.continueFocusing()">
                Continue focusing
              </button>
            </div>
          </template>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { FOCUS_DURATIONS, DEFAULT_FOCUS_MINUTES, useFocusStore } from '@/stores/focusStore'
import { useTasks } from '@/composables/useTasks'

const focus = useFocusStore()
const { allTasks, tasks, toggleComplete } = useTasks()

const selectedMinutes = ref(DEFAULT_FOCUS_MINUTES)
const completing = ref(false)

const task = computed(() => {
  const id = focus.session?.taskId
  if (!id) return null
  return (allTasks.value || []).find((t) => t.id === id) || (tasks.value || []).find((t) => t.id === id) || null
})

function formatClock(ms) {
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

// Countdown rounds up so a fresh 25 min session shows 25:00, not 24:59.
const clockText = computed(() =>
  focus.remainingMs == null ? formatClock(focus.focusedMs) : formatClock(Math.ceil(focus.remainingMs / 1000) * 1000),
)

const focusedText = computed(() => {
  const mins = Math.round(focus.focusedMs / 60000)
  if (mins < 1) return 'Under a minute'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (!h) return `${m} minute${m === 1 ? '' : 's'}`
  return m ? `${h}h ${m}m` : `${h}h`
})

async function completeTask() {
  if (!task.value || completing.value) return
  completing.value = true
  try {
    await toggleComplete(task.value)
    focus.close('completed_task')
  } finally {
    completing.value = false
  }
}

// Keep the screen on and the page from scrolling behind the overlay.
let wakeLock = null
async function acquireWakeLock() {
  try {
    wakeLock = await navigator.wakeLock?.request('screen')
  } catch {
    wakeLock = null
  }
}
function releaseWakeLock() {
  try {
    wakeLock?.release()
  } catch {
    /* already released */
  }
  wakeLock = null
}
function onVisibility() {
  if (document.visibilityState === 'visible' && focus.phase === 'running') acquireWakeLock()
}

watch(
  () => focus.phase,
  (phase) => {
    if (phase === 'setup') selectedMinutes.value = focus.session?.plannedMinutes ?? DEFAULT_FOCUS_MINUTES
    if (phase === 'running') acquireWakeLock()
    else releaseWakeLock()
  },
  { immediate: true },
)

watch(
  () => focus.isOpen,
  (open) => {
    document.documentElement.classList.toggle('focus-mode-open', open)
    if (open) document.addEventListener('visibilitychange', onVisibility)
    else document.removeEventListener('visibilitychange', onVisibility)
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  releaseWakeLock()
  document.removeEventListener('visibilitychange', onVisibility)
  document.documentElement.classList.remove('focus-mode-open')
})
</script>

<style scoped>
.focus-screen {
  position: fixed;
  inset: 0;
  /* Above app chrome and Element Plus dialogs, below the app lock screen. */
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: max(16px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right))
    max(16px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left));
  background: radial-gradient(
    ellipse at top,
    #eef2ff 0%,
    var(--pc-bg, #f6f7fc) 58%,
    #e8ecf7 100%
  );
  color: var(--pc-text, #0f172a);
  overflow-y: auto;
}

.focus-panel {
  width: 100%;
  max-width: 440px;
  box-sizing: border-box;
  margin: auto;
  padding: clamp(1.75rem, 5vw, 3rem);
  border: 1px solid var(--pc-border, #e2e8f0);
  border-radius: 1.5rem;
  background: var(--pc-surface, #ffffff);
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.14);
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.focus-eyebrow {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0.45rem 0.8rem;
  border: 1px solid rgba(79, 70, 229, 0.16);
  border-radius: 999px;
  background: var(--pc-accent-soft, rgba(79, 70, 229, 0.08));
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--pc-accent-text, #4338ca);
}

.focus-title {
  width: 100%;
  margin: 0.35rem 0 0;
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.3;
  color: var(--pc-text, #0f172a);
  overflow-wrap: anywhere;
}

.focus-sub {
  margin: 0;
  font-size: 0.95rem;
  color: var(--pc-text-muted, #475569);
}

.focus-clock {
  margin-top: 20px;
  font-size: clamp(4rem, 22vw, 6.5rem);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  color: #fff;
  transition: opacity 0.2s ease;
}

.focus-clock--paused {
  opacity: 0.45;
}

.focus-label {
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--pc-text-subtle, #64748b);
  margin-bottom: 12px;
}

.focus-durations {
  width: 100%;
  box-sizing: border-box;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.65rem;
  margin: 0.75rem 0 0.5rem;
  padding: 0.75rem;
  border: 1px solid var(--pc-border, #e2e8f0);
  border-radius: 1.1rem;
  background: var(--pc-surface-2, #f1f3fa);
}

.focus-chip {
  min-height: 44px;
  padding: 0 16px;
  border-radius: 999px;
  border: 1px solid var(--pc-border-strong, #cbd5e1);
  background: var(--pc-surface, #ffffff);
  color: var(--pc-text-muted, #475569);
  font-weight: 600;
  font-size: 0.9rem;
  transition:
    border-color 0.15s ease,
    background 0.15s ease,
    color 0.15s ease,
    box-shadow 0.15s ease,
    transform 0.15s ease;
}

.focus-chip--active {
  border-color: var(--pc-accent, #4f46e5);
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  color: #fff;
  box-shadow: 0 8px 18px rgba(79, 70, 229, 0.22);
  transform: translateY(-1px);
}

.focus-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 0.75rem;
  width: 100%;
  justify-content: center;
}

.focus-actions--stack {
  flex-direction: column;
  max-width: 280px;
}

.focus-btn {
  flex: 1 1 0;
  min-height: 48px;
  min-width: 120px;
  padding: 0 20px;
  border-radius: 12px;
  font-weight: 600;
  transition: background 0.15s ease, border-color 0.15s ease, opacity 0.15s ease, box-shadow 0.15s ease;
}

.focus-btn:disabled {
  opacity: 0.6;
}

.focus-btn--primary {
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  color: #fff;
  box-shadow: 0 10px 22px rgba(79, 70, 229, 0.2);
}

.focus-btn--primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #4338ca, #6d28d9);
  box-shadow: 0 12px 26px rgba(79, 70, 229, 0.28);
}

.focus-btn--ghost {
  border: 1px solid var(--pc-border-strong, #cbd5e1);
  background: var(--pc-surface-2, #f1f3fa);
  color: var(--pc-text, #0f172a);
}

.focus-btn--ghost:hover {
  border-color: var(--pc-accent, #4f46e5);
  background: var(--pc-surface-hover, #eceff8);
}

.focus-btn:focus-visible,
.focus-chip:focus-visible {
  outline: 2px solid var(--pc-accent, #4f46e5);
  outline-offset: 2px;
}

.focus-fade-enter-active,
.focus-fade-leave-active {
  transition: opacity 0.25s ease;
}

.focus-fade-enter-from,
.focus-fade-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .focus-fade-enter-active,
  .focus-fade-leave-active {
    transition: none;
  }
}

@media (max-width: 480px) {
  .focus-screen {
    padding: max(12px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right))
      max(12px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left));
  }

  .focus-panel {
    padding: 1.5rem 1.1rem;
    border-radius: 1.25rem;
  }

  .focus-actions {
    flex-direction: column-reverse;
  }

  .focus-btn {
    width: 100%;
  }
}
</style>

<style>
html.focus-mode-open,
html.focus-mode-open body {
  overflow: hidden;
}
</style>
