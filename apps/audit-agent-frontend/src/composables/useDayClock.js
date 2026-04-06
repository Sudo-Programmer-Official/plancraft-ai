import { computed, ref } from 'vue'
import { toLocalDateKey } from '@/utils/dateHelper'

const now = ref(new Date())
let listenersAttached = false
let midnightTimerId = null
let lastRefreshAt = 0

function scheduleMidnightRefresh() {
  if (typeof window === 'undefined') return
  if (midnightTimerId) window.clearTimeout(midnightTimerId)

  const current = new Date()
  const nextMidnight = new Date(
    current.getFullYear(),
    current.getMonth(),
    current.getDate() + 1,
    0,
    0,
    1,
    0,
  )
  const delay = Math.max(1000, nextMidnight.getTime() - current.getTime())

  midnightTimerId = window.setTimeout(() => {
    refreshDayClock('midnight')
  }, delay)
}

export function refreshDayClock(reason = 'manual') {
  const nowMs = Date.now()
  if (reason !== 'midnight' && nowMs - lastRefreshAt < 5000) return false

  lastRefreshAt = nowMs
  now.value = new Date()
  scheduleMidnightRefresh()
  return true
}

function attachDayClockListeners() {
  if (listenersAttached || typeof window === 'undefined') return
  listenersAttached = true

  const refresh = () => {
    refreshDayClock('resume')
  }
  const onVisibilityChange = () => {
    if (typeof document === 'undefined') return
    if (document.visibilityState === 'visible') refreshDayClock('visibility')
  }

  window.addEventListener('focus', refresh)
  window.addEventListener('pageshow', refresh)
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onVisibilityChange)
  }

  scheduleMidnightRefresh()
}

export function useDayClock() {
  attachDayClockListeners()

  return {
    now,
    todayKey: computed(() => toLocalDateKey(now.value)),
    refreshDayClock,
  }
}
