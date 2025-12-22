<template>
  <div class="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-[11px] uppercase tracking-[0.25em] text-slate-400">Activity</p>
        <h3 class="text-xl font-semibold text-white">Execution trail</h3>
      </div>
      <div class="text-xs text-slate-400">
        {{ events.length }} events
      </div>
    </div>

    <div v-if="loading && !events.length" class="text-sm text-slate-300">Loading activity…</div>
    <div v-else-if="!events.length" class="rounded-xl border border-dashed border-white/10 bg-white/5 p-4 text-slate-200">
      No activity yet.
    </div>

    <div v-else class="space-y-4">
      <div v-for="group in grouped" :key="group.date" class="space-y-2">
        <div class="text-xs text-slate-400 font-semibold">{{ group.dateLabel }}</div>
        <ul class="space-y-3">
          <li
            v-for="event in group.items"
            :key="event.id || `${event.type}-${event.timestamp}`"
            class="flex gap-3"
          >
            <div class="w-10 h-10 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center text-lg">
              {{ iconFor(event) }}
            </div>
            <div class="flex-1 space-y-1">
              <div class="flex items-center gap-2">
                <p class="text-sm font-semibold text-white">{{ labelFor(event) }}</p>
                <span class="text-[11px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-300">
                  {{ event.type }}
                </span>
              </div>
              <p class="text-xs text-slate-300">
                {{ actorName(event) }} • {{ timeAgo(event.timestamp) }}
              </p>
            </div>
          </li>
        </ul>
      </div>
      <div v-if="hasMore" ref="sentinel" class="h-8 flex items-center justify-start text-xs text-slate-400">
        Loading more…
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
dayjs.extend(relativeTime)

const props = defineProps({
  events: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  hasMore: { type: Boolean, default: false },
})

const emit = defineEmits(['loadMore'])

const sentinel = ref(null)
let observer = null

const grouped = computed(() => {
  const byDate = {}
  props.events.forEach((evt) => {
    const day = dayjs(evt.timestamp || evt.createdAt || new Date()).format('YYYY-MM-DD')
    byDate[day] = byDate[day] || []
    byDate[day].push(evt)
  })
  return Object.entries(byDate)
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([date, items]) => ({
      date,
      dateLabel: dayjs(date).format('MMM D, YYYY'),
      items: items.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1)),
    }))
})

function timeAgo(ts) {
  if (!ts) return ''
  return dayjs(ts).fromNow()
}

function actorName(event) {
  return event?.actor?.displayName || event?.actor?.userId || event?.actorUserId || 'Someone'
}

function iconFor(event) {
  const entity = (event?.entity?.type || '').toLowerCase()
  if (entity === 'project') return '📁'
  if (entity === 'sprint') return '🚀'
  if (entity === 'task') return '📝'
  if (entity === 'feedback') return '💬'
  if (/project/i.test(event?.type || '')) return '📁'
  if (/sprint/i.test(event?.type || '')) return '🚀'
  if (/task/i.test(event?.type || '')) return '📝'
  if (/feedback/i.test(event?.type || '')) return '💬'
  return '•'
}

function labelFor(event) {
  const type = event?.type || ''
  const actor = actorName(event)
  const target = event?.data?.name || event?.entity?.id || ''
  switch (type) {
    case 'PROJECT_CREATED':
      return `${actor} created the project`
    case 'PROJECT_UPDATED':
      return `${actor} updated the project`
    case 'SPRINT_CREATED':
      return `${actor} created sprint ${target}`.trim()
    case 'SPRINT_STARTED':
      return `${actor} started sprint ${target}`.trim()
    case 'SPRINT_COMPLETED':
      return `${actor} completed sprint ${target}`.trim()
    case 'TASK_CREATED':
      return `${actor} added a task`
    case 'TASK_UPDATED':
      return `${actor} updated a task`
    case 'TASK_STATUS_CHANGED':
      return `${actor} moved a task`
    case 'TASK_ASSIGNED':
      return `${actor} assigned a task`
    case 'FEEDBACK_INGESTED':
      return `${actor} added feedback`
    default:
      return 'Activity'
  }
}

function setupObserver() {
  if (!sentinel.value || !props.hasMore) return
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          emit('loadMore')
        }
      })
    },
    { threshold: 1 },
  )
  observer.observe(sentinel.value)
}

function cleanupObserver() {
  if (observer) observer.disconnect()
  observer = null
}

watch(
  () => sentinel.value,
  () => {
    cleanupObserver()
    setupObserver()
  },
)

watch(
  () => props.hasMore,
  () => {
    cleanupObserver()
    setupObserver()
  },
)

onMounted(() => setupObserver())
onBeforeUnmount(() => cleanupObserver())
</script>
