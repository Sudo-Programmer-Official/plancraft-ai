<template>
  <div class="min-h-screen p-8 bg-gradient-to-b from-slate-900 to-slate-800 text-white">
    <h2 class="text-3xl font-semibold mb-6 flex items-center gap-2">
      🔔 Reminders
      <span v-if="loading" class="text-gray-400 text-base animate-pulse">Loading...</span>
    </h2>

    <div v-if="!loading && reminders.length === 0" class="text-gray-400">
      No active reminders 🎉
    </div>

    <template v-else>
      <template v-for="(group, date) in groupedReminders" :key="date">
        <h3 class="text-xl font-semibold mt-8 mb-3 border-b border-slate-700 pb-1">
          {{ date }}
        </h3>

        <TransitionGroup name="fade" tag="div" class="space-y-3">
          <div
            v-for="r in group"
            :key="r.id"
            class="p-5 rounded-2xl bg-slate-800/70 border border-slate-700 shadow-lg
                   hover:shadow-indigo-500/20 transition-all flex justify-between items-center"
          >
            <div class="flex flex-col">
              <div class="font-medium text-lg">{{ r.task || r.text || 'Reminder' }}</div>
              <div class="text-sm text-gray-300 mt-1">
                🕒 {{ formatDualTime(r.scheduledTime) }}
              </div>
              <div class="text-xs text-gray-500">
                {{ formatRelative(r.scheduledTime) }} •
                Channels: {{ (r.channels || []).join(', ') || '—' }}
              </div>
            </div>

            <div class="flex gap-3">
              <button
                @click="onSnooze(r)"
                class="px-3 py-1 text-xs bg-yellow-500/20 hover:bg-yellow-500/40
                       border border-yellow-500 rounded-lg text-yellow-300"
              >
                Snooze
              </button>
              <button
                @click="onCancel(r)"
                class="px-3 py-1 text-xs bg-red-500/20 hover:bg-red-500/40
                       border border-red-500 rounded-lg text-red-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </TransitionGroup>
      </template>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db, auth } from '@/firebase/init'
import api from '@/services/api'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import relativeTime from 'dayjs/plugin/relativeTime'
import _ from 'lodash'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(relativeTime)

const reminders = ref([])
const loading = ref(true)
let unbind = null

function toJsDate(v) {
  try {
    if (!v) return null
    if (typeof v === 'string') return new Date(v)
    if (v instanceof Date) return v
    if (typeof v.toDate === 'function') return v.toDate()
    if (typeof v.seconds === 'number') return new Date(v.seconds * 1000)
    if (typeof v._seconds === 'number') return new Date(v._seconds * 1000)
  } catch {}
  return null
}

function formatDualTime(iso) {
  const d = toJsDate(iso)
  if (!d) return ''
  const local = dayjs.utc(d).tz(dayjs.tz.guess())
  const utcTime = dayjs.utc(d)
  return `${local.format('ddd, MMM D • h:mm A')} (Your Time) • ${utcTime.format('HH:mm')} UTC`
}

function formatRelative(iso) {
  const d = toJsDate(iso)
  if (!d) return ''
  return dayjs(d).fromNow()
}

const groupedReminders = computed(() => {
  const sorted = _.sortBy(reminders.value, r => toJsDate(r.scheduledTime))
  const groups = _.groupBy(sorted, r => {
    const date = dayjs.utc(toJsDate(r.scheduledTime)).tz(dayjs.tz.guess())
    if (date.isSame(dayjs(), 'day')) return 'Today'
    if (date.isSame(dayjs().add(1, 'day'), 'day')) return 'Tomorrow'
    return date.format('dddd, MMM D')
  })
  return groups
})

function watchReminders() {
  const uid = auth?.currentUser?.uid || localStorage.getItem('uid')
  if (!uid) { loading.value = false; return }

  const q = query(collection(db, 'reminders'), where('userId', '==', uid))
  unbind = onSnapshot(q, (snap) => {
    const now = Date.now()
    const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    const upcoming = rows
      .filter(r => String(r?.status || '').toLowerCase() === 'scheduled' && !r?.sentAt)
      .filter(r => {
        const dt = toJsDate(r?.scheduledTime)
        return dt ? dt.getTime() >= now - 60 * 1000 : false
      })
    reminders.value = upcoming
    loading.value = false
  }, () => { loading.value = false })
}

async function onCancel(r) {
  try {
    const uid = auth?.currentUser?.uid || localStorage.getItem('uid')
    if (!uid) return
    if (r?.taskId) {
      await api.post('/reminders/cancel', { userId: uid, taskId: r.taskId })
    }
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
  } catch (e) {
    console.warn('Snooze failed', e?.response?.data || e?.message)
  }
}

onMounted(watchReminders)
onUnmounted(() => { if (unbind) unbind() })
</script>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: all 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>