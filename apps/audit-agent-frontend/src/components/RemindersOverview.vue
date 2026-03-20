<template>
  <div class="min-h-screen p-6 bg-gradient-to-b from-slate-900 to-slate-800 text-white relative">
    <!-- Header -->
    <div class="flex flex-col gap-3 mb-4">
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-3xl font-semibold flex items-center gap-2">
          🔔 Reminders
          <span v-if="loading" class="text-gray-400 text-base animate-pulse">Loading...</span>
        </h2>
        <button
          class="px-3 py-2 text-sm rounded-lg bg-indigo-600 hover:bg-indigo-500 transition shadow shadow-indigo-500/20 add-reminder-btn"
          @click="goToPlanner"
        >
          <span class="add-reminder-icon">＋</span> Add reminder
        </button>
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
          class="text-xs text-gray-300 hover:text-white underline-offset-2 hover:underline"
          @click="showPast = !showPast"
        >
          {{ showPast ? 'Hide past reminders' : 'View past reminders' }}
        </button>
      </div>
    </div>

    <!-- Usage meter: Sign in for guests, Upgrade for signed-in free users -->
    <div v-if="usage.plan === 'free' && !isPremium" class="mb-6 flex items-center justify-between bg-slate-800/60 border border-slate-700 rounded-lg p-3">
      <span class="text-sm text-gray-300">You’ve used {{ usage.used }}/{{ usage.limit }} reminders today.</span>
      <button
        v-if="!isGuest"
        @click="goToUpgrade"
        class="px-3 py-1 text-xs bg-indigo-600 hover:bg-indigo-700 rounded-md text-white"
      >
        Upgrade for unlimited 🚀
      </button>
      <RouterLink
        v-else
        to="/login"
        class="px-3 py-1 text-xs bg-indigo-600 hover:bg-indigo-700 rounded-md text-white"
      >
        🔑 Sign in
      </RouterLink>
    </div>

    <div v-if="loading" class="mt-12">
      <EmptyState
        title="Syncing reminders"
        subtitle="We’re pulling your upcoming reminders and notification channels."
        icon="⏳"
      >
        <div class="w-full max-w-3xl mt-4">
          <el-skeleton :rows="3" animated />
        </div>
      </EmptyState>
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
        <h3 class="text-xl font-semibold mt-8 mb-3 border-b border-slate-700 pb-1">
          {{ date }}
        </h3>

        <TransitionGroup name="fade" tag="div" class="space-y-3">
          <div
            v-for="r in group"
            :key="r.id"
            class="max-w-4xl mx-auto p-4 rounded-2xl bg-slate-800/70 border border-slate-700 shadow-md hover:shadow-indigo-500/20 transition-all flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3"
          >
            <div class="flex flex-col flex-1 gap-1">
              <div class="font-semibold text-lg">{{ r.task || r.text || 'Reminder' }}</div>
              <div class="text-sm text-gray-300">🕒 {{ formatDualTime(r.scheduledTime) }}</div>
              <div class="text-xs text-gray-500">{{ formatRelative(r.scheduledTime) }} • Channels: {{ (r.channels || []).join(', ') || '—' }}</div>
              <div v-if="r.meetingLink" class="flex flex-wrap items-center gap-2 mt-1">
                <a
                  :href="r.meetingLink"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-xs px-2 py-1 rounded bg-emerald-700/20 border border-emerald-400/60 text-emerald-200 hover:bg-emerald-600/30 transition"
                >
                  🔗 {{ r.meetingLabel || 'Open link' }}
                </a>
              </div>
            </div>

            <div class="flex gap-2 justify-end sm:justify-center shrink-0">
              <button @click="goToPlannerWithReminder(r)" class="px-3 py-1 text-xs bg-slate-700/60 hover:bg-slate-700 border border-slate-500 rounded-lg text-slate-200 w-[100px] text-center">
                Change time
              </button>
              <button @click="onSnooze(r)" class="px-3 py-1 text-xs bg-yellow-500/20 hover:bg-yellow-500/40 border border-yellow-500 rounded-lg text-yellow-300 w-[90px] text-center">
                Snooze
              </button>
              <button @click="onCancel(r)" class="px-3 py-1 text-xs bg-red-500/20 hover:bg-red-500/40 border border-red-500 rounded-lg text-red-300 w-[80px] text-center">
                Cancel
              </button>
            </div>
          </div>
        </TransitionGroup>
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
import { useTasks } from '@/composables/useTasks'
import { useWorkspaceStore } from '@/stores/workspaceStore'

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
const { isPremium, isGuest, isFreeUser } = useAuthFlags()
const customDate = ref(dayjs().format('YYYY-MM-DD'))
const filterMode = ref('Today') // Today | Next7 | Custom
const authStore = useAuthStore()
const workspaceStore = useWorkspaceStore()
const activeWorkspaceId = computed(() => workspaceStore.activeWorkspaceId)
const { allTasks, refreshAllTasks, getTaskPlannedDate } = useTasks()
const showPast = ref(false)
const visibleCount = computed(() => visibleReminders.value.length)
const chipDates = computed(() =>
  Object.keys(groupedReminders.value || {}).filter(
    (d) => d !== 'Today' && d !== 'Next 7 Days' && d !== 'Tomorrow',
  ),
)

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
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
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
  } catch {}
}

function goToUpgrade() {
  try { trackLinkedInConversion(import.meta.env.VITE_LI_CONV_UPGRADE_CLICK) } catch {}
  try { router.push('/pricing') } catch {}
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

function formatDualTime(iso) {
  const d = toJsDate(iso)
  if (!d) return ''
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
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
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const today = dayjs().tz(zone).startOf('day')
  const horizon = today.add(7, 'day').endOf('day')
  return reminders.value.filter((r) => {
    const dt = toJsDate(r.scheduledTime)
    if (!dt) return false
    const local = dayjs.utc(dt).tz(zone)
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
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
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
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const tasks = Array.isArray(allTasks.value) ? allTasks.value : []
  return tasks
    .map((t) => {
      const iso = deriveReminderIsoFromTask(t, zone)
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

async function loadReminders() {
  const uid = authStore?.user?.uid || auth?.currentUser?.uid || localStorage.getItem('uid')
  if (!uid) {
    reminders.value = []
    loading.value = false
    logTimeBrainReminder('load-reminders:skipped', { reason: 'no-uid' })
    return
  }
  loading.value = true
  try {
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
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    })
    await loadReminders()
  } catch (e) {
    console.warn('Snooze failed', e?.response?.data || e?.message)
  }
}

onMounted(() => {
  (async () => {
    await Promise.allSettled([
      refreshAllTasks(true),
      loadReminders(),
      fetchUsage(),
    ])
    refreshTimer = setInterval(loadReminders, 60 * 1000)
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
    window.addEventListener('usage-refresh', loadReminders)
  } catch {}
})
onUnmounted(() => {
  try {
    window.removeEventListener('usage-refresh', fetchUsage)
    window.removeEventListener('usage-refresh', loadReminders)
  } catch {}
})

watch(
  () => authStore?.user?.uid,
  (uid) => {
    if (uid) loadReminders()
  }
)

watch(
  activeWorkspaceId,
  async (workspaceId) => {
    if (!workspaceId) return
    await Promise.allSettled([
      refreshAllTasks(true),
      loadReminders(),
    ])
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

.date-nav-lite {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
}

.chip-scroll {
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  white-space: nowrap;
  padding: 0.25rem 0.35rem;
}

.chip {
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
  font-size: 0.9rem;
  background: rgba(255, 255, 255, 0.08);
  color: #f8fafc;
  border: 1px solid rgba(255, 255, 255, 0.12);
  transition: all 0.2s ease;
}

.chip--active {
  background: #6366f1;
  color: #fff;
  box-shadow: 0 6px 18px rgba(99, 102, 241, 0.35);
}

.date-picker-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
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
}

.date-picker-input::-webkit-calendar-picker-indicator {
  filter: invert(1);
}

.add-reminder-btn {
  color: #f8fafc;
}
.add-reminder-icon {
  margin-right: 6px;
  color: #f8fafc;
}
</style>
