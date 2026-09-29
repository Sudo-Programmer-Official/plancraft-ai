<template>
  <main class="app-page-shell">
    <div class="app-page-frame">
    <header class="app-page-hero flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p class="app-page-eyebrow">Calendar</p>
        <h1 class="app-page-title !text-[clamp(2rem,3vw,2.7rem)]">Meetings</h1>
        <p class="app-page-description">Read-only view of synced events.</p>
      </div>
      <div class="flex items-center gap-2 flex-wrap justify-end">
        <span v-if="googleConnected" class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-700/40 text-emerald-100 text-xs">
          <span class="w-2 h-2 rounded-full bg-emerald-300"></span>
          Connected
        </span>
        <span v-if="googleLastSync" class="text-xs text-slate-300">Last sync: {{ googleLastSync }}</span>
        <button
          class="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-semibold"
          @click="goToIntegrations"
        >
          {{ googleConnected ? 'Manage / add account' : 'Connect calendar →' }}
        </button>
      </div>
    </header>

    <section v-if="!(meetings?.length)" class="app-page-section">
      <EmptyState
        title="No meetings scheduled"
        subtitle="Once your calendar syncs, your upcoming meetings will appear here."
        icon="📅"
      />
    </section>

    <div v-else class="space-y-6">
      <section v-if="groupedMeetings.today?.length" class="app-page-section app-page-section--compact space-y-3">
        <div class="text-lg font-semibold text-indigo-100">Today</div>
        <div class="grid gap-3">
          <MeetingCard v-for="m in groupedMeetings.today" :key="m.id" :meeting="m" />
        </div>
      </section>

      <section v-if="groupedMeetings.upcoming?.length" class="app-page-section app-page-section--compact space-y-3">
        <div class="text-lg font-semibold text-indigo-100">Upcoming</div>
        <div class="grid gap-3">
          <MeetingCard v-for="m in groupedMeetings.upcoming" :key="m.id" :meeting="m" />
        </div>
      </section>
    </div>
    </div>
  </main>
</template>

<script setup>
import { computed, ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import EmptyState from '@/components/EmptyState.vue'
import { useTasks } from '@/composables/useTasks'
import { resolveTaskMeetingLink } from '@/utils/taskLinks'
import { getGoogleStatus } from '@/stores/integrationsStore'
import MeetingCard from '@/components/meeting/MeetingCard.vue'
import { useAuthStore } from '@/stores/authStore'
import { getEffectiveUserTimezone } from '@/utils/userTimezone'

dayjs.extend(utc)
dayjs.extend(timezone)

const router = useRouter()
const authStore = useAuthStore()
const { tasks } = useTasks()
const googleStatus = ref({ connected: false, accounts: [] })

const googleConnected = computed(() => !!googleStatus.value?.connected)
const googleLastSync = computed(() => {
  const raw = googleStatus.value?.accounts?.[0]?.lastRun || googleStatus.value?.lastRun
  if (!raw) return ''
  const ts = dayjs(raw)
  return ts.isValid() ? ts.format('MMM D · h:mm A') : ''
})

const meetings = computed(() => {
  const zone = getEffectiveUserTimezone()
  return (tasks?.value || [])
    .map((t) => {
      const meetingLink = resolveTaskMeetingLink(t)
      const external = t?.metadata?.externalEvent || t?.externalEvent || t?.meeting || {}
      const hasExternal = external && Object.keys(external).length > 0
      // Skip non-meeting items (e.g., reminders) unless we have explicit meeting context or join link
      if (!hasExternal && !meetingLink) return null
      const start =
        external?.startTime ||
        external?.start ||
        external?.startDateTime ||
        null
      if (!start) return null
      const startDate = dayjs.utc(start).tz(zone)
      if (!startDate.isValid()) return null
      return {
        id: t.id || `${t.title}-${start}`,
        title: t.title || external?.summary || 'Meeting',
        start: startDate,
        joinUrl: meetingLink?.url || external?.joinUrl || null,
        joinLabel: meetingLink?.label || 'Open link',
        participants: external?.attendees || [],
      }
    })
    .filter(Boolean)
    .sort((a, b) => a.start.valueOf() - b.start.valueOf())
})

const groupedMeetings = computed(() => {
  const zone = getEffectiveUserTimezone()
  const today = dayjs().tz(zone).startOf('day')
  const todayEnd = today.endOf('day')
  const upcoming = []
  const todayList = []
  meetings.value.forEach((m) => {
    const start = dayjs(m.start)
    if (!start.isValid()) return
    if (start.isSame(today, 'day')) todayList.push(m)
    else if (start.isAfter(todayEnd)) upcoming.push(m)
  })
  return { today: todayList, upcoming }
})

function goToIntegrations() {
  router.push('/settings?tab=integrations')
}

onMounted(async () => {
  try {
    const uid = authStore?.user?.uid || localStorage.getItem('uid')
    if (!uid) return
    const status = await getGoogleStatus(uid)
    googleStatus.value = status || { connected: false, accounts: [] }
  } catch {
    /* noop */
  }
})

watch(
  () => authStore?.user?.uid,
  async (uid) => {
    if (!uid) return
    try {
      const status = await getGoogleStatus(uid)
      googleStatus.value = status || { connected: false, accounts: [] }
    } catch {
      /* noop */
    }
  },
)
</script>
