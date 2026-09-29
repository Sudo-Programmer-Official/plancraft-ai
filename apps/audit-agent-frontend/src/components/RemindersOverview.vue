<template>
  <div class="app-page-shell relative">
    <div class="app-page-frame">
    <!-- Header -->
    <div class="app-page-hero reminders-hero">
      <div class="reminders-hero__top">
        <div class="reminders-hero__content">
          <span class="app-page-eyebrow">Gentle reminder queue</span>
          <div class="reminders-hero__title-row">
            <h2 class="app-page-title !text-[clamp(2rem,3vw,2.8rem)] min-w-0">🔔 Reminders</h2>
            <span v-if="loading" class="reminders-status-pill">Refreshing</span>
          </div>
          <p class="app-page-description reminders-hero__description">
            Quick filters, calmer cards, and one-tap actions that stay readable on smaller screens.
          </p>
        </div>
        <button
          class="px-4 py-3 text-sm rounded-2xl bg-gradient-to-r from-fuchsia-500 via-violet-500 to-indigo-500 hover:from-fuchsia-400 hover:via-violet-400 hover:to-indigo-400 transition shadow-lg shadow-indigo-950/30 add-reminder-btn reminders-hero__cta"
          @click="goToPlanner"
        >
          <span class="add-reminder-icon">＋</span>
          <span>Add reminder</span>
        </button>
      </div>

      <div class="reminders-hero__stats">
        <div class="reminders-hero__stat">
          <span>Window</span>
          <strong>{{ activeFilterLabel }}</strong>
        </div>
        <div class="reminders-hero__stat">
          <span>Queue</span>
          <strong>{{ visibleCountLabel }}</strong>
        </div>
        <div class="reminders-hero__stat">
          <span>Past</span>
          <strong>{{ pastVisibilityLabel }}</strong>
        </div>
      </div>

      <!-- Date Navigation Chips -->
      <div class="date-nav-lite">
        <div class="chip-scroll hide-scrollbar">
          <button
            class="chip"
            :class="{ 'chip--active': filterMode === 'Today' }"
            @click="selectToday"
          >
            Today
          </button>
          <button
            class="chip"
            :class="{ 'chip--active': filterMode === 'Next7' }"
            @click="selectNextSeven"
          >
            Next 7 Days
          </button>
          <button
            v-for="date in chipDates"
            :key="date"
            :ref="setChipRef(date)"
            class="chip"
            :class="{ 'chip--active': selectedGroup === date }"
            @click="scrollToGroup(date)"
          >
            {{ date }}
          </button>
        </div>

        <div class="date-nav-lite__utilities">
          <div class="date-picker-pill">
            <span class="date-picker-icon">📅</span>
            <input
              type="date"
              v-model="customDate"
              class="date-picker-input"
              @change="scrollToCustomDate"
            />
          </div>

          <button
            class="past-toggle-pill"
            @click="showPast = !showPast"
          >
            {{ showPast ? 'Hide past reminders' : 'View past reminders' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Usage meter: Sign in for guests, Upgrade for signed-in free users -->
    <div v-if="usage.plan === 'free' && !isPremium" class="app-page-section app-page-section--compact reminders-usage">
      <div class="min-w-0">
        <p class="reminders-usage__eyebrow">Daily allowance</p>
        <p class="text-sm text-gray-300">You’ve used {{ usage.used }}/{{ usage.limit }} reminders today.</p>
      </div>
      <button
        v-if="!isGuest && !isAppleBillingSafeMode"
        @click="goToUpgrade"
        class="px-3 py-2 text-xs bg-gradient-to-r from-fuchsia-500 to-indigo-500 hover:from-fuchsia-400 hover:to-indigo-400 rounded-xl text-white reminders-usage__cta"
      >
        Upgrade for unlimited 🚀
      </button>
      <RouterLink
        v-else
        to="/login"
        class="px-3 py-2 text-xs bg-gradient-to-r from-fuchsia-500 to-indigo-500 hover:from-fuchsia-400 hover:to-indigo-400 rounded-xl text-white reminders-usage__cta"
      >
        🔑 Sign in
      </RouterLink>
    </div>

    <div v-if="loading" class="reminders-loading-state">
      <section class="app-page-section reminders-loading-panel">
        <div class="reminders-loading-panel__copy">
          <span class="reminders-status-pill reminders-status-pill--soft">Syncing reminders</span>
          <h3 class="reminders-loading-panel__title">Bringing your next nudges into focus</h3>
          <p class="reminders-loading-panel__subtitle">
            We’re pulling your upcoming reminders and notification channels.
          </p>
        </div>
        <div class="reminders-loading-panel__skeleton" aria-hidden="true">
          <div class="app-page-skeleton reminders-loading-panel__pill"></div>
          <div class="app-page-skeleton reminders-loading-panel__line reminders-loading-panel__line--hero"></div>
          <div class="app-page-skeleton reminders-loading-panel__line"></div>
          <div class="app-page-skeleton reminders-loading-panel__line"></div>
          <div class="app-page-skeleton reminders-loading-panel__line reminders-loading-panel__line--short"></div>
        </div>
      </section>
    </div>

    <EmptyState
      v-else-if="visibleCount === 0"
      title="No Reminders Yet"
      subtitle="Schedule a reminder from a task or ask the assistant to nudge you tomorrow."
      icon="🔔"
    />

    <!-- Reminders list -->
    <div v-else>
      <div
        v-for="(group, date) in groupedReminders"
        :key="date"
        :ref="setGroupRef(date)"
        class="scroll-mt-20"
      >
        <h3 class="reminders-group-heading">
          {{ date }}
        </h3>

        <TransitionGroup name="fade" tag="div" class="space-y-3">
          <article
            v-for="r in group"
            :key="r.id"
            class="reminder-card"
          >
            <div class="reminder-card__copy">
              <div class="reminder-card__title-row">
                <div class="font-semibold text-lg leading-snug text-white">{{ r.task || r.text || 'Reminder' }}</div>
                <span class="reminder-card__relative">{{ formatRelative(r.scheduledTime, r.timezone) }}</span>
              </div>
              <div class="reminder-card__time">🕒 {{ formatDualTime(r.scheduledTime, r.timezone) }}</div>
              <div class="reminder-card__channels">
                <span
                  v-for="channel in (r.channels || [])"
                  :key="`${r.id}-${channel}`"
                  class="reminder-card__chip"
                >
                  {{ channel }}
                </span>
                <span v-if="!(r.channels || []).length" class="reminder-card__chip reminder-card__chip--muted">
                  No channel yet
                </span>
              </div>
              <div v-if="r.meetingLink" class="flex flex-wrap items-center gap-2 mt-1">
                <a
                  :href="r.meetingLink"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-xs px-2 py-1 rounded-full bg-emerald-700/20 border border-emerald-400/60 text-emerald-200 hover:bg-emerald-600/30 transition"
                >
                  🔗 {{ r.meetingLabel || 'Open link' }}
                </a>
              </div>
            </div>

            <div class="reminder-card__actions">
              <button @click="goToPlannerWithReminder(r)" class="reminder-action reminder-action--primary">
                Change time
              </button>
              <button @click="onSnooze(r)" class="reminder-action reminder-action--warm">
                Snooze
              </button>
              <button @click="onCancel(r)" class="reminder-action reminder-action--danger">
                Cancel
              </button>
            </div>
          </article>
        </TransitionGroup>
      </div>
    </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { auth } from '@/firebase/init'
import api from '@/services/api'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import relativeTime from 'dayjs/plugin/relativeTime'
import _ from 'lodash'
import { toJsDate as toJsDateUtil } from '@/utils/time'
import { useAuthFlags } from '@/composables/useAuthFlags'
import { trackLinkedInConversion } from '@/utils/ads'
import { useAuthStore } from '@/stores/authStore'
import EmptyState from '@/components/EmptyState.vue'
import { resolveReminderLink } from '@/utils/taskLinks'
import { resolveTaskMeetingLink } from '@/utils/taskLinks'
import { toUtcIso } from '@/utils/time'
import { getEffectiveUserTimezone } from '@/utils/userTimezone'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { isAppleBillingSafeMode as detectAppleBillingSafeMode } from '@/utils/billingAccess'
import { fetchTasksBetween, fetchTasksByDate } from '@/services/firebaseService'

// Time setup
dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(relativeTime)

const router = useRouter()
const reminders = ref([])
const loading = ref(true)
const selectedGroup = ref('Today')
const groupRefs = new Map()
const chipRefs = new Map()
let refreshTimer = null

const usage = ref({ used: 0, limit: 0, plan: '' })
const { isPremium, isGuest } = useAuthFlags()
const isAppleBillingSafeMode = computed(() => detectAppleBillingSafeMode())
const customDate = ref(dayjs().format('YYYY-MM-DD'))
const filterMode = ref('Today') // Today | Next7 | Custom
const authStore = useAuthStore()
const workspaceStore = useWorkspaceStore()
const activeWorkspaceId = computed(() => workspaceStore.activeWorkspaceId)
const showPast = ref(false)
const visibleCount = computed(() => visibleReminders.value.length)
const reminderTasks = ref([])
let reminderTaskWindowKey = ''
let reminderTaskWindowPromise = null
let reminderTaskWindowToken = 0
const chipDates = computed(() =>
  Object.keys(groupedReminders.value || {}).filter(
    (d) => d !== 'Today' && d !== 'Next 7 Days' && d !== 'Tomorrow',
  ),
)
const activeFilterLabel = computed(() => {
  if (filterMode.value === 'Custom') return dayjs(customDate.value).format('MMM D, YYYY')
  if (filterMode.value === 'Next7') return 'Next 7 days'
  return 'Today'
})
const visibleCountLabel = computed(() =>
  loading.value ? 'Refreshing…' : `${visibleCount.value} ${visibleCount.value === 1 ? 'reminder' : 'reminders'}`,
)
const pastVisibilityLabel = computed(() => (showPast.value ? 'Visible' : 'Hidden'))

function logTimeBrainReminder(event, payload) {
  try {
     
    console.log(`[TimeBrain][Reminders] ${event}`, payload)
  } catch {
    /* noop */
  }
}

async function scrollToCustomDate() {
  filterMode.value = 'Custom'
  const selected = dayjs(customDate.value).format('YYYY-MM-DD')
  const zone = getEffectiveUserTimezone()
  logTimeBrainReminder('scroll-to-date', { selected, zone })

  for (const [groupLabel, reminders] of Object.entries(groupedReminders.value)) {
    const firstReminder = reminders?.[0]
    if (!firstReminder) continue
    const jsDate = toJsDate(firstReminder.scheduledTime)
    const localDate = dayjs.utc(jsDate).tz(zone).format('YYYY-MM-DD')

    if (localDate === selected) {
      scrollToGroup(groupLabel)
      return
    }
  }

  selectedGroup.value = null
}
async function fetchUsage() {
  try {
    const uid = authStore?.user?.uid || auth?.currentUser?.uid || localStorage.getItem('uid')
    if (!uid) return
    const { data } = await api.get('/reminders/usage', { params: { userId: uid } })
    if (data?.success) usage.value = { used: data.used || 0, limit: data.limit || 0, plan: data.plan || '' }
  } catch {
    /* noop */
  }
}

function goToUpgrade() {
  try { trackLinkedInConversion(import.meta.env.VITE_LI_CONV_UPGRADE_CLICK) } catch { /* noop */ }
  try { router.push(isAppleBillingSafeMode.value ? '/billing/upgrade' : '/pricing') } catch { /* noop */ }
}

function setGroupRef(date) {
  return (el) => {
    if (el) groupRefs.set(date, el)
  }
}

function setChipRef(date) {
  return (el) => {
    if (el) chipRefs.set(date, el)
  }
}

async function scrollToGroup(date) {
  selectedGroup.value = date
  await nextTick()
  const el = groupRefs.get(date)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  const chipEl = chipRefs.get(date)
  if (chipEl && chipEl.scrollIntoView) {
    chipEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }
}

function selectToday() {
  filterMode.value = 'Today'
  selectedGroup.value = 'Today'
}

function selectNextSeven() {
  filterMode.value = 'Next7'
  selectedGroup.value = 'Next 7 Days'
}

function toJsDate(v) { try { return toJsDateUtil(v) } catch { return null } }

function normalizeChannels(candidate) {
  if (Array.isArray(candidate)) return candidate.filter(Boolean)
  if (!candidate) return []
  return [candidate].filter(Boolean)
}

function normalizeTaskDateCandidate(value) {
  if (!value && value !== 0) return null

  if (typeof value === 'string') {
    const trimmed = value.trim()
    const directMatch = trimmed.match(/\d{4}-\d{2}-\d{2}/)
    if (directMatch) return directMatch[0]
    const parsed = new Date(trimmed)
    return Number.isNaN(parsed.getTime()) ? null : dayjs(parsed).format('YYYY-MM-DD')
  }

  if (typeof value?.toDate === 'function') {
    try {
      return dayjs(value.toDate()).format('YYYY-MM-DD')
    } catch {
      return null
    }
  }

  if (value instanceof Date || typeof value === 'number') {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : dayjs(parsed).format('YYYY-MM-DD')
  }

  return null
}

function getTaskPlannedDate(task) {
  if (!task || typeof task !== 'object') return null

  const candidates = [
    task.plannedDate,
    task.date,
    task.scheduledDate,
    task.scheduled_time,
    task.scheduledTime,
    task.dueDate,
    task?.metadata?.plannedDate,
  ]

  for (const value of candidates) {
    const normalized = normalizeTaskDateCandidate(value)
    if (normalized) return normalized
  }

  return null
}

function normalizeReminder(row) {
  if (!row || typeof row !== 'object') return null
  const whenRaw =
    row.scheduledTime ??
    row.when ??
    row.time ??
    row.remindAt ??
    row.remind_at ??
    row.whenUtc ??
    row.whenISO ??
    null

  const dt = toJsDate(whenRaw)
  if (!dt || Number.isNaN(dt.getTime())) return null

  const status = String(row.status || '').toLowerCase() || 'scheduled'

  const linkInfo = resolveReminderLink(row)
  return {
    ...row,
    status,
    scheduledTime: dt.toISOString(),
    channels: normalizeChannels(row.channels || row.channel),
    meetingLink: linkInfo?.url || null,
    meetingLabel: linkInfo?.label || '',
  }
}

function resolveReminderTaskWindow() {
  const today = dayjs().format('YYYY-MM-DD')
  if (filterMode.value === 'Today') {
    return { start: today, end: today, key: `today:${today}` }
  }
  if (filterMode.value === 'Custom') {
    const selected = dayjs(customDate.value || today).format('YYYY-MM-DD')
    return { start: selected, end: selected, key: `custom:${selected}` }
  }
  if (filterMode.value === 'Next7') {
    return {
      start: today,
      end: dayjs(today).add(7, 'day').format('YYYY-MM-DD'),
      key: `next7:${today}`,
    }
  }
  return {
    start: today,
    end: dayjs(today).add(7, 'day').format('YYYY-MM-DD'),
    key: `default:${today}`,
  }
}

async function loadReminderTasksWindow({ force = false } = {}) {
  if (!activeWorkspaceId.value) {
    reminderTasks.value = []
    reminderTaskWindowKey = ''
    return []
  }

  const windowRange = resolveReminderTaskWindow()
  const requestKey = windowRange.key

  if (!force && requestKey === reminderTaskWindowKey && reminderTaskWindowPromise) {
    return reminderTaskWindowPromise
  }

  reminderTaskWindowKey = requestKey
  const requestId = ++reminderTaskWindowToken
  const request =
    windowRange.start === windowRange.end
      ? fetchTasksByDate(windowRange.start)
      : fetchTasksBetween(windowRange.start, windowRange.end)

  const trackedRequest = Promise.resolve(request)
    .then((rows) => {
      if (requestId === reminderTaskWindowToken) {
        reminderTasks.value = Array.isArray(rows) ? rows : []
      }
      return Array.isArray(rows) ? rows : []
    })
    .catch((error) => {
      if (requestId === reminderTaskWindowToken) {
        reminderTasks.value = []
      }
      throw error
    })
    .finally(() => {
      if (reminderTaskWindowPromise === trackedRequest) {
        reminderTaskWindowPromise = null
      }
    })

  reminderTaskWindowPromise = trackedRequest
  return trackedRequest
}

function formatDualTime(iso, timezoneOverride) {
  const d = toJsDate(iso)
  if (!d) return ''
  const zone = timezoneOverride || getEffectiveUserTimezone()
  const utcTime = dayjs.utc(d)
  const local = utcTime.clone().tz(zone)
  return `${local.format('ddd, MMM D • h:mm A')} (Your Time) • ${utcTime.format('HH:mm')} UTC`
}

function formatRelative(iso) {
  const d = toJsDate(iso)
  if (!d) return ''
  return dayjs(d).fromNow()
}

const visibleReminders = computed(() => {
  const zone = getEffectiveUserTimezone()
  const today = dayjs().tz(zone).startOf('day')
  const horizon = today.add(7, 'day').endOf('day')
  return reminders.value.filter((r) => {
    const dt = toJsDate(r.scheduledTime)
    if (!dt) return false
    const local = dayjs.utc(dt).tz(zone)
    if (showPast.value && local.isBefore(today, 'day')) return true
    // Apply primary filter mode first
    if (filterMode.value === 'Today') {
      return local.isSame(today, 'day')
    }
    if (filterMode.value === 'Next7') {
      const ts = local.valueOf()
      return ts >= today.valueOf() && ts <= horizon.valueOf()
    }
    if (filterMode.value === 'Custom') {
      const selected = dayjs(customDate.value).format('YYYY-MM-DD')
      return local.format('YYYY-MM-DD') === selected
    }
    // Fallback: respect past toggle
    if (!showPast.value && local.isBefore(today)) return false
    return true
  })
})

const groupedReminders = computed(() => {
  const zone = getEffectiveUserTimezone()
  const sorted = _.sortBy(visibleReminders.value, (r) => {
    const d = toJsDate(r.scheduledTime)
    return d ? d.getTime() : 0
  })
  return _.groupBy(sorted, (r) => {
    const date = dayjs.utc(toJsDate(r.scheduledTime)).tz(zone)
    if (date.isSame(dayjs(), 'day')) return 'Today'
    if (filterMode.value === 'Next7') return 'Next 7 Days'
    if (date.isSame(dayjs().add(1, 'day'), 'day')) return 'Tomorrow'
    return date.format('dddd, MMM D')
  })
})

function deriveReminderIsoFromTask(task, tz) {
  const direct = task?.scheduledTime || task?.scheduled_time
  const directDate = toJsDate(direct)
  if (directDate && !Number.isNaN(directDate.getTime())) return directDate.toISOString()

  const hhmm = task?.reminderTime || task?.time
  const date = getTaskPlannedDate(task) || task?.date || task?.dueDate
  if (hhmm && date) {
    try {
      return toUtcIso(String(date), String(hhmm), tz)
    } catch {
      return null
    }
  }
  return null
}

const fallbackTaskReminders = computed(() => {
  const zone = getEffectiveUserTimezone()
  const tasks = Array.isArray(reminderTasks.value) ? reminderTasks.value : []
  return tasks
    .map((t) => {
      const taskZone = t?.timezone || zone
      const iso = deriveReminderIsoFromTask(t, taskZone)
      if (!iso) return null
      const meeting = resolveTaskMeetingLink(t)
      return {
        id: `task-${t.id || t.title}-${iso}`,
        task: t.title || 'Task',
        text: t.title || 'Task',
        scheduledTime: iso,
        taskId: t.id || null,
        channels: normalizeChannels(t.reminderChannels || t.channels),
        status: 'scheduled',
        meetingLink: meeting?.url || null,
        meetingLabel: meeting?.label || '',
      }
    })
    .filter(Boolean)
})

function mergeReminders(primary = [], fallback = []) {
  const map = new Map()
  const add = (r, source) => {
    if (!r) return
    const key = `${r.taskId || ''}:${r.scheduledTime || r.id || ''}`
    if (map.has(key)) return
    map.set(key, { ...r, __source: source })
  }
  primary.forEach((r) => add(r, 'api'))
  fallback.forEach((r) => add(r, 'tasks'))
  return Array.from(map.values())
}

async function loadReminders({ reloadTasks = false, forceTaskWindow = false } = {}) {
  const uid = authStore?.user?.uid || auth?.currentUser?.uid || localStorage.getItem('uid')
  if (!uid) {
    reminders.value = []
    loading.value = false
    logTimeBrainReminder('load-reminders:skipped', { reason: 'no-uid' })
    return
  }
  loading.value = true
  try {
    if (reloadTasks || !reminderTaskWindowKey) {
      await loadReminderTasksWindow({ force: forceTaskWindow })
    }
    const { data } = await api.get('/reminders', {
      params: { userId: uid, workspaceId: activeWorkspaceId.value || undefined },
    })
    const rows = Array.isArray(data?.items) ? data.items : []
    const normalizedRows = rows.map(normalizeReminder).filter(Boolean)
    logTimeBrainReminder('load-reminders:api', { rows: rows.length, normalized: normalizedRows.length })
    const now = Date.now()
    const upcoming = normalizedRows
      .filter((r) => {
        const status = String(r?.status || '').toLowerCase()
        const dt = toJsDate(r?.scheduledTime)
        const recent = dt ? dt.getTime() >= now - 15 * 60 * 1000 : false
        return ['scheduled', 'pending'].includes(status) || (status === 'sent' && recent)
      })
      .filter((r) => {
        const dt = toJsDate(r?.scheduledTime)
        return dt ? dt.getTime() >= now - 60 * 60 * 1000 : false
      })
    const merged = mergeReminders(upcoming, fallbackTaskReminders.value)
    reminders.value = merged
    logTimeBrainReminder('load-reminders:upcoming', { count: merged.length, api: upcoming.length, fallback: fallbackTaskReminders.value.length })
    const keys = Object.keys(groupedReminders.value)
    if (!selectedGroup.value) {
      selectedGroup.value = keys.find((k) => k === 'Today') || keys[0] || null
    }
  } catch (err) {
    console.warn('[RemindersOverview] Failed to load reminders', err?.message || err)
    logTimeBrainReminder('load-reminders:error', { message: err?.message })
  } finally {
    loading.value = false
  }
}

async function onCancel(r) {
  try {
    const uid = auth?.currentUser?.uid || localStorage.getItem('uid')
    if (!uid) return
    if (r?.taskId) await api.post('/reminders/cancel', { userId: uid, taskId: r.taskId })
    await loadReminders()
  } catch (e) {
    console.warn('Cancel failed', e?.response?.data || e?.message)
  }
}

async function onSnooze(r) {
  try {
    const dt = toJsDate(r?.scheduledTime)
    if (!dt) return
    const newIso = new Date(dt.getTime() + 10 * 60 * 1000).toISOString()
    const uid = auth?.currentUser?.uid || localStorage.getItem('uid')
    if (!uid) return
    await api.post('/reminders/text', {
      userId: uid,
      text: r.task || r.text || 'Reminder',
      scheduledTime: newIso,
      channels: r.channels || ['whatsapp'],
      taskId: r.taskId || null,
        timezone: r?.timezone || getEffectiveUserTimezone(),
    })
    await loadReminders()
  } catch (e) {
    console.warn('Snooze failed', e?.response?.data || e?.message)
  }
}

onMounted(() => {
  ;(async () => {
    await Promise.allSettled([
      loadReminders({ reloadTasks: true, forceTaskWindow: true }),
      fetchUsage(),
    ])
    refreshTimer = setInterval(() => loadReminders(), 60 * 1000)
  })()
})
onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
})

// Refresh usage meter when other parts of app schedule reminders
onMounted(() => {
  try {
    window.addEventListener('usage-refresh', fetchUsage)
    window.addEventListener('usage-refresh', handleReminderUsageRefresh)
  } catch {
    /* noop */
  }
})
onUnmounted(() => {
  try {
    window.removeEventListener('usage-refresh', fetchUsage)
    window.removeEventListener('usage-refresh', handleReminderUsageRefresh)
  } catch {
    /* noop */
  }
})

async function handleReminderUsageRefresh() {
  await loadReminders({ reloadTasks: true, forceTaskWindow: true })
}

watch(
  () => authStore?.user?.uid,
  (uid) => {
    if (uid) loadReminders({ reloadTasks: true, forceTaskWindow: true })
    else reminders.value = []
  }
)

watch(
  activeWorkspaceId,
  async (workspaceId) => {
    if (!workspaceId) {
      reminderTasks.value = []
      reminders.value = []
      reminderTaskWindowKey = ''
      return
    }
    await loadReminders({ reloadTasks: true, forceTaskWindow: true })
  },
)

watch(
  [filterMode, customDate],
  async ([mode, date], [previousMode, previousDate]) => {
    if (!activeWorkspaceId.value) return
    if (mode === previousMode && date === previousDate) return
    await loadReminders({ reloadTasks: true, forceTaskWindow: true })
  },
)

function goToPlanner() {
  try {
    router.push({ path: '/planner', query: { date: customDate.value } })
  } catch {
    /* noop */
  }
}

function goToPlannerWithReminder(r) {
  try {
    const d = toJsDate(r?.scheduledTime)
    const date = d ? dayjs(d).format('YYYY-MM-DD') : customDate.value
    const time = d ? dayjs(d).format('HH:mm') : null
    const query = { date, mode: 'reminderOnly' }
    if (time) query.reminderTime = time
    if (r?.id) query.reminderId = r.id
    router.push({ path: '/planner', query })
  } catch {
    /* noop */
  }
}
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: all 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(10px); }
.hide-scrollbar::-webkit-scrollbar { display: none; }
.hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

.reminders-hero {
  gap: 1rem;
}

.reminders-hero__top {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.reminders-hero__content {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.reminders-hero__title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
}

.reminders-hero__description {
  margin-top: 0.75rem;
  max-width: 42rem;
}

.reminders-hero__cta {
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  font-weight: 600;
}

.reminders-status-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.45rem 0.8rem;
  border-radius: 999px;
  border: 1px solid rgba(196, 181, 253, 0.34);
  background: rgba(99, 102, 241, 0.16);
  color: #dbeafe;
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.reminders-status-pill--soft {
  width: fit-content;
  background: rgba(167, 139, 250, 0.14);
  color: #ede9fe;
}

.reminders-hero__stats {
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  gap: 0.75rem;
}

.reminders-hero__stat {
  min-width: 0;
  padding: 0.95rem 1rem;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.34), rgba(67, 56, 202, 0.16));
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.reminders-hero__stat span {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: rgba(196, 181, 253, 0.72);
}

.reminders-hero__stat strong {
  font-size: 1rem;
  line-height: 1.35;
  color: #fff;
}

.date-nav-lite {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.75rem;
}

.chip-scroll {
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  white-space: nowrap;
  padding: 0.25rem 0.35rem;
  width: 100%;
  min-width: 0;
}

.chip {
  padding: 0.55rem 0.95rem;
  border-radius: 999px;
  font-size: 0.9rem;
  background: rgba(255, 255, 255, 0.07);
  color: #f8fafc;
  border: 1px solid rgba(255, 255, 255, 0.12);
  transition: all 0.2s ease;
}

.chip--active {
  background: #6366f1;
  color: #fff;
  box-shadow: 0 6px 18px rgba(99, 102, 241, 0.35);
}

.date-nav-lite__utilities {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.date-picker-pill {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.55rem 0.75rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  min-height: 46px;
}

.date-picker-icon {
  font-size: 0.9rem;
  color: #f8fafc;
}

.date-picker-input {
  background: transparent;
  color: #f8fafc;
  border: none;
  outline: none;
  font-size: 0.9rem;
  width: 100%;
  min-width: 0;
}

.date-picker-input::-webkit-calendar-picker-indicator {
  filter: invert(1);
}

.past-toggle-pill {
  min-height: 46px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem 1rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(15, 23, 42, 0.22);
  color: rgba(226, 232, 240, 0.9);
  font-size: 0.8rem;
  font-weight: 600;
  transition: all 0.2s ease;
}

.past-toggle-pill:hover {
  color: #fff;
  border-color: rgba(196, 181, 253, 0.34);
}

.reminders-usage {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.9rem;
}

.reminders-usage__eyebrow {
  font-size: 0.72rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(196, 181, 253, 0.74);
  margin-bottom: 0.35rem;
}

.reminders-usage__cta {
  width: 100%;
  text-align: center;
  font-weight: 600;
}

.reminders-loading-state {
  margin-top: 0.5rem;
}

.reminders-loading-panel {
  display: grid;
  gap: 1.5rem;
}

.reminders-loading-panel__copy {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.reminders-loading-panel__title {
  font-size: clamp(1.4rem, 3vw, 2rem);
  line-height: 1.1;
  font-weight: 700;
  color: #fff;
}

.reminders-loading-panel__subtitle {
  max-width: 36rem;
  color: rgba(226, 232, 240, 0.8);
  line-height: 1.6;
}

.reminders-loading-panel__skeleton {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.reminders-loading-panel__pill {
  width: 9rem;
  height: 2.6rem;
  border-radius: 999px;
}

.reminders-loading-panel__line {
  height: 1rem;
  width: 100%;
  border-radius: 999px;
}

.reminders-loading-panel__line--hero {
  width: min(100%, 24rem);
  height: 1.15rem;
}

.reminders-loading-panel__line--short {
  width: min(100%, 14rem);
}

.reminders-group-heading {
  margin: 2rem 0 0.9rem;
  padding-bottom: 0.65rem;
  font-size: 1.05rem;
  font-weight: 700;
  color: rgba(248, 250, 252, 0.96);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.reminder-card {
  max-width: 64rem;
  margin: 0 auto;
  padding: 1rem;
  border-radius: 26px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background:
    radial-gradient(circle at top right, rgba(129, 140, 248, 0.12), transparent 32%),
    linear-gradient(145deg, rgba(15, 23, 42, 0.46), rgba(49, 46, 129, 0.24));
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.18);
  display: flex;
  flex-direction: column;
  gap: 1rem;
  transition: box-shadow 0.2s ease, transform 0.2s ease, border-color 0.2s ease;
}

.reminder-card:hover {
  transform: translateY(-1px);
  border-color: rgba(129, 140, 248, 0.32);
  box-shadow: 0 22px 48px rgba(49, 46, 129, 0.24);
}

.reminder-card__copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.reminder-card__title-row {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.reminder-card__relative {
  width: fit-content;
  max-width: 100%;
  padding: 0.32rem 0.7rem;
  border-radius: 999px;
  border: 1px solid rgba(196, 181, 253, 0.2);
  background: rgba(99, 102, 241, 0.14);
  color: rgba(224, 231, 255, 0.92);
  font-size: 0.75rem;
  font-weight: 600;
}

.reminder-card__time {
  color: rgba(226, 232, 240, 0.86);
  line-height: 1.5;
}

.reminder-card__channels {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.reminder-card__chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.38rem 0.72rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.09);
  background: rgba(255, 255, 255, 0.06);
  color: rgba(224, 231, 255, 0.88);
  font-size: 0.74rem;
  line-height: 1;
  text-transform: capitalize;
}

.reminder-card__chip--muted {
  color: rgba(148, 163, 184, 0.94);
}

.reminder-card__actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.65rem;
}

.reminder-action {
  min-height: 42px;
  padding: 0.7rem 0.9rem;
  border-radius: 16px;
  border: 1px solid transparent;
  font-size: 0.78rem;
  font-weight: 600;
  text-align: center;
  transition: all 0.2s ease;
}

.reminder-action--primary {
  grid-column: 1 / -1;
  background: rgba(15, 23, 42, 0.3);
  border-color: rgba(255, 255, 255, 0.1);
  color: #e2e8f0;
}

.reminder-action--primary:hover {
  border-color: rgba(129, 140, 248, 0.4);
  color: #fff;
}

.reminder-action--warm {
  background: rgba(234, 179, 8, 0.16);
  border-color: rgba(234, 179, 8, 0.58);
  color: #fde68a;
}

.reminder-action--warm:hover {
  background: rgba(234, 179, 8, 0.26);
}

.reminder-action--danger {
  background: rgba(239, 68, 68, 0.16);
  border-color: rgba(248, 113, 113, 0.58);
  color: #fecaca;
}

.reminder-action--danger:hover {
  background: rgba(239, 68, 68, 0.26);
}

.add-reminder-btn {
  color: #f8fafc;
}

.add-reminder-icon {
  margin-right: 6px;
  color: #f8fafc;
}

@media (min-width: 640px) {
  .reminders-hero {
    gap: 1.25rem;
  }

  .reminders-hero__top {
    flex-direction: row;
    align-items: flex-start;
    justify-content: space-between;
  }

  .reminders-hero__cta {
    width: auto;
    min-width: 168px;
  }

  .reminders-hero__stats {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .date-nav-lite__utilities {
    flex-direction: row;
    align-items: center;
  }

  .date-picker-pill {
    min-width: 220px;
  }

  .reminders-usage {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }

  .reminders-usage__cta {
    width: auto;
  }

  .reminders-loading-panel {
    grid-template-columns: minmax(0, 1.1fr) minmax(280px, 0.9fr);
    align-items: center;
  }

  .reminder-card {
    padding: 1.15rem 1.2rem;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }

  .reminder-card__title-row {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }

  .reminder-card__actions {
    flex: 0 0 auto;
    width: auto;
    display: flex;
    align-items: center;
  }

  .reminder-action {
    min-width: 96px;
  }

  .reminder-action--primary {
    grid-column: auto;
  }
}
</style>
