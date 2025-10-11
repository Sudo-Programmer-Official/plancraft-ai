<template>
  <div class="min-h-screen p-8 bg-gradient-to-b from-slate-900 to-slate-800 text-white relative">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <h2 class="text-3xl font-semibold flex items-center gap-2">
        🔔 Reminders
        <span v-if="loading" class="text-gray-400 text-base animate-pulse">Loading...</span>
      </h2>

      <!-- Date Navigation Chips -->
      <div
        v-if="Object.keys(groupedReminders).length > 1"
        class="flex gap-2 overflow-x-auto hide-scrollbar py-1 px-2 sm:px-0"
      >
        <button
          v-for="(group, date) in groupedReminders"
          :key="date"
          @click="scrollToGroup(date)"
          :class="[
            'px-4 py-1 text-sm rounded-full whitespace-nowrap transition-all duration-200',
            selectedGroup === date
              ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/30'
              : 'bg-slate-700 hover:bg-slate-600 text-gray-300',
          ]"
        >
          {{ date }}
        </button>
      </div>
    </div>

    <!-- Empty state -->
    <div v-if="!loading && reminders.length === 0" class="text-gray-400 text-center mt-10">
      No active reminders 🎉
    </div>

    <!-- Reminders list -->
    <template v-else>
      <div
        v-for="(group, date) in groupedReminders"
        :key="date"
        :ref="setGroupRef(date)"
        class="scroll-mt-20"
      >
        <!-- Group Title -->
        <h3 class="text-xl font-semibold mt-10 mb-3 border-b border-slate-700 pb-1">
          {{ date }}
        </h3>

        <!-- Cards -->
        <TransitionGroup name="fade" tag="div" class="space-y-4">
          <div
            v-for="r in group"
            :key="r.id"
            class="max-w-4xl mx-auto p-5 rounded-2xl bg-slate-800/70 border border-slate-700 shadow-md hover:shadow-indigo-500/20 transition-all flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3"
          >
            <!-- Text Section -->
            <div class="flex flex-col flex-1">
              <div class="font-medium text-lg">{{ r.task || r.text || 'Reminder' }}</div>
              <div class="text-sm text-gray-300 mt-1">
                🕒 {{ formatDualTime(r.scheduledTime) }}
              </div>
              <div class="text-xs text-gray-500">
                {{ formatRelative(r.scheduledTime) }} •
                Channels: {{ (r.channels || []).join(', ') || '—' }}
              </div>
            </div>

            <!-- Buttons -->
            <div class="flex gap-3 justify-end sm:justify-center shrink-0">
              <button
                @click="onSnooze(r)"
                class="px-3 py-1 text-xs bg-yellow-500/20 hover:bg-yellow-500/40 border border-yellow-500 rounded-lg text-yellow-300 w-[90px] text-center"
              >
                Snooze
              </button>
              <button
                @click="onCancel(r)"
                class="px-3 py-1 text-xs bg-red-500/20 hover:bg-red-500/40 border border-red-500 rounded-lg text-red-300 w-[90px] text-center"
              >
                Cancel
              </button>
            </div>
          </div>
        </TransitionGroup>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db, auth } from '@/firebase/init'
import api from '@/services/api'
import _ from 'lodash'
import { toJsDate, toLocalDayGroup, formatDualTime, formatRelative } from '@/utils/timeUtils'

// ----------------------------------------------------
// State
// ----------------------------------------------------
const reminders = ref([])
const loading = ref(true)
const selectedGroup = ref(null)
const groupRefs = new Map()
let unbind = null

// ----------------------------------------------------
// Scroll to specific group
// ----------------------------------------------------
function setGroupRef(date) {
  return (el) => {
    if (el) groupRefs.set(date, el)
  }
}

async function scrollToGroup(date) {
  selectedGroup.value = date
  await nextTick()
  const el = groupRefs.get(date)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// ----------------------------------------------------
// Live Firestore watcher
// ----------------------------------------------------
function watchReminders() {
  const uid = auth?.currentUser?.uid || localStorage.getItem('uid')
  if (!uid) {
    loading.value = false
    return
  }

  const q = query(collection(db, 'reminders'), where('userId', '==', uid))

  unbind = onSnapshot(
    q,
    (snap) => {
      const now = Date.now()
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      const upcoming = rows
        .filter((r) => String(r?.status || '').toLowerCase() === 'scheduled' && !r?.sentAt)
        .filter((r) => {
          const dt = toJsDate(r?.scheduledTime)
          return dt ? dt.getTime() >= now - 60 * 1000 : false
        })

      reminders.value = upcoming
      loading.value = false
      selectedGroup.value ||= Object.keys(groupedReminders.value)[0] || null
    },
    () => (loading.value = false),
  )
}

onMounted(watchReminders)
onUnmounted(() => unbind && unbind())

// ----------------------------------------------------
// Grouped & Sorted View
// ----------------------------------------------------
const groupedReminders = computed(() => {
  const sorted = _.sortBy(reminders.value, (r) => toJsDate(r.scheduledTime))
  return _.groupBy(sorted, (r) => toLocalDayGroup(r.scheduledTime))
})

// ----------------------------------------------------
// Actions
// ----------------------------------------------------
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
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

/* Hide horizontal scrollbar for chip container */
.hide-scrollbar::-webkit-scrollbar {
  display: none;
}
.hide-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>