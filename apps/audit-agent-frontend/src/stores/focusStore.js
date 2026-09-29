import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { saveFocusSession } from '@/services/focusService'
import { EVENTS, trackEvent } from '@/services/analytics'

export const FOCUS_DURATIONS = [15, 25, 45, 60]
export const DEFAULT_FOCUS_MINUTES = 25

const STORAGE_KEY = 'plancraft.focusSession'
// Sessions shorter than this are treated as accidental starts and not logged.
const MIN_LOGGED_MS = 60 * 1000

function readStored() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    return parsed?.taskId && parsed?.phase ? parsed : null
  } catch {
    return null
  }
}

function writeStored(value) {
  try {
    if (value) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
    else window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* storage unavailable */
  }
}

// Session timing is derived from timestamps rather than a ticking counter, so
// it stays correct across backgrounding, sleep and page reloads.
export const useFocusStore = defineStore('focus', () => {
  // phase: 'setup' | 'running' | 'done'
  const session = ref(typeof window !== 'undefined' ? readStored() : null)
  const now = ref(Date.now())
  let ticker = null

  const isOpen = computed(() => !!session.value)
  const phase = computed(() => session.value?.phase || null)
  const isPaused = computed(() => session.value?.phase === 'running' && !!session.value?.pausedAt)
  const plannedMs = computed(() =>
    session.value?.plannedMinutes ? session.value.plannedMinutes * 60 * 1000 : null,
  )

  const focusedMs = computed(() => {
    const s = session.value
    if (!s?.startedAt) return 0
    const end = s.endedAt || s.pausedAt || now.value
    return Math.max(0, end - s.startedAt - (s.pausedTotalMs || 0))
  })

  const remainingMs = computed(() =>
    plannedMs.value == null ? null : Math.max(0, plannedMs.value - focusedMs.value),
  )

  function persist() {
    writeStored(session.value)
  }

  function tick() {
    now.value = Date.now()
    if (phase.value === 'running' && !isPaused.value && remainingMs.value === 0) {
      finish()
    }
  }

  function startTicker() {
    if (ticker || typeof window === 'undefined') return
    tick()
    ticker = window.setInterval(tick, 1000)
  }

  function stopTicker() {
    if (!ticker) return
    window.clearInterval(ticker)
    ticker = null
  }

  function open(task, userId, options = {}) {
    if (!task?.id || task.completed || !userId || session.value) return
    const plannedMinutes = Number(options?.plannedMinutes) > 0 ? Number(options.plannedMinutes) : DEFAULT_FOCUS_MINUTES
    session.value = {
      userId,
      taskId: task.id,
      taskTitle: task.title || 'Untitled task',
      plannedMinutes,
      phase: 'setup',
    }
    persist()
    if (options?.autoStart) start(plannedMinutes)
  }

  function start(plannedMinutes = DEFAULT_FOCUS_MINUTES) {
    if (!session.value) return
    session.value = {
      userId: session.value.userId,
      taskId: session.value.taskId,
      taskTitle: session.value.taskTitle,
      plannedMinutes: plannedMinutes || null,
      phase: 'running',
      startedAt: Date.now(),
      pausedAt: null,
      pausedTotalMs: 0,
      endedAt: null,
    }
    persist()
    startTicker()
    trackEvent(EVENTS.FOCUS_STARTED, { planned_minutes: plannedMinutes || null, open_ended: !plannedMinutes })
  }

  function pause() {
    if (phase.value !== 'running' || isPaused.value) return
    session.value = { ...session.value, pausedAt: Date.now() }
    persist()
  }

  function resume() {
    if (!isPaused.value) return
    const s = session.value
    session.value = {
      ...s,
      pausedAt: null,
      pausedTotalMs: (s.pausedTotalMs || 0) + (Date.now() - s.pausedAt),
    }
    persist()
  }

  function finish() {
    if (phase.value !== 'running') return
    const s = session.value
    const endedAt = s.pausedAt || Date.now()
    session.value = { ...s, phase: 'done', endedAt }
    persist()
    stopTicker()
    try {
      navigator.vibrate?.(200)
    } catch {
      /* unsupported */
    }
  }

  // outcome: 'completed_task' | 'break' | 'continued' | 'ended'
  function logFinished(outcome) {
    const s = session.value
    if (!s?.startedAt || !s.endedAt || focusedMs.value < MIN_LOGGED_MS) return
    trackEvent(EVENTS.FOCUS_COMPLETED, {
      outcome,
      planned_minutes: s.plannedMinutes || null,
      focused_minutes: Math.round(focusedMs.value / 60000),
      reached_planned: !!s.plannedMinutes && focusedMs.value >= s.plannedMinutes * 60000,
    })
    saveFocusSession({
      taskId: s.taskId,
      taskTitle: s.taskTitle,
      plannedMinutes: s.plannedMinutes,
      focusedMs: focusedMs.value,
      startedAt: new Date(s.startedAt).toISOString(),
      endedAt: new Date(s.endedAt).toISOString(),
      outcome,
    })
  }

  function close(outcome = 'ended') {
    if (phase.value === 'running') finish()
    logFinished(outcome)
    stopTicker()
    session.value = null
    persist()
  }

  function continueFocusing() {
    const s = session.value
    if (!s) return
    logFinished('continued')
    start(s.plannedMinutes)
  }

  // Drop a session left behind by a different (or signed-out) account on this device.
  function syncUser(userId) {
    if (!session.value || session.value.userId === userId) return
    stopTicker()
    session.value = null
    persist()
  }

  // Restore the ticker for a session that survived a reload.
  if (session.value?.phase === 'running') startTicker()

  return {
    session,
    isOpen,
    phase,
    isPaused,
    plannedMs,
    focusedMs,
    remainingMs,
    open,
    start,
    pause,
    resume,
    finish,
    close,
    continueFocusing,
    syncUser,
  }
})
