<template>
  <div class="min-h-screen p-8 bg-gradient-to-b from-slate-900 to-slate-800 text-white relative">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <h2 class="text-3xl font-semibold flex items-center gap-2">
        🔔 Reminders
        <span v-if="loading" class="text-gray-400 text-base animate-pulse">Loading...</span>
      </h2>

      <!-- Date Navigation Chips -->
      <div class="flex items-center gap-4">
        <!-- Date Picker -->
        <input
          type="date"
          v-model="customDate"
          class="bg-slate-700 text-white rounded px-2 py-1 text-sm border border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          @change="scrollToCustomDate"
        />

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
        <h3 class="text-xl font-semibold mt-10 mb-3 border-b border-slate-700 pb-1">
          {{ date }}
        </h3>

        <TransitionGroup name="fade" tag="div" class="space-y-4">
          <div
            v-for="r in group"
            :key="r.id"
            class="max-w-4xl mx-auto p-5 rounded-2xl bg-slate-800/70 border border-slate-700 shadow-md hover:shadow-indigo-500/20 transition-all flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3"
          >
            <div class="flex flex-col flex-1">
              <div class="font-medium text-lg">{{ r.task || r.text || 'Reminder' }}</div>
              <div class="text-sm text-gray-300 mt-1">🕒 {{ formatDualTime(r.scheduledTime) }}</div>
              <div class="text-xs text-gray-500">{{ formatRelative(r.scheduledTime) }} • Channels: {{ (r.channels || []).join(', ') || '—' }}</div>
            </div>

            <div class="flex gap-3 justify-end sm:justify-center shrink-0">
              <button @click="onSnooze(r)" class="px-3 py-1 text-xs bg-yellow-500/20 hover:bg-yellow-500/40 border border-yellow-500 rounded-lg text-yellow-300 w-[90px] text-center">
                Snooze
              </button>
              <button @click="onCancel(r)" class="px-3 py-1 text-xs bg-red-500/20 hover:bg-red-500/40 border border-red-500 rounded-lg text-red-300 w-[90px] text-center">
                Cancel
              </button>
            </div>
          </div>
        </TransitionGroup>
      </div>
    </template>
  </div>
</template>

<!-- <script setup>
// existing imports...

</script> -->

<script setup>
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db, auth } from '@/firebase/init'
import api from '@/services/api'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import relativeTime from 'dayjs/plugin/relativeTime'
import _ from 'lodash'
import { toJsDate as toJsDateUtil } from '@/utils/time'
import { useAuthFlags } from '@/composables/useAuthFlags'
import { trackLinkedInConversion } from '@/utils/ads'

// Time setup
dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(relativeTime)

const router = useRouter()
const reminders = ref([])
const loading = ref(true)
const selectedGroup = ref(null)
const groupRefs = new Map()
let unbind = null

const usage = ref({ used: 0, limit: 0, plan: '' })
const { isPremium, isGuest, isFreeUser } = useAuthFlags()
const customDate = ref(dayjs().format('YYYY-MM-DD'))

// async function scrollToCustomDate() {
//   const selected = customDate.value
//   const keys = Object.keys(groupedReminders.value)
//   const match = keys.find(k => dayjs(k).format('YYYY-MM-DD') === selected)
//   if (match) scrollToGroup(match)
//   else selectedGroup.value = null
// }
async function scrollToCustomDate() {
  const selected = dayjs(customDate.value).format('YYYY-MM-DD')
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone

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
    const uid = auth?.currentUser?.uid || localStorage.getItem('uid')
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

async function scrollToGroup(date) {
  selectedGroup.value = date
  await nextTick()
  const el = groupRefs.get(date)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function toJsDate(v) { try { return toJsDateUtil(v) } catch { return null } }

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

const groupedReminders = computed(() => {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const sorted = _.sortBy(reminders.value, r => {
    const d = toJsDate(r.scheduledTime)
    return d ? d.getTime() : 0
  })
  return _.groupBy(sorted, r => {
    const date = dayjs.utc(toJsDate(r.scheduledTime)).tz(zone)
    if (date.isSame(dayjs(), 'day')) return 'Today'
    if (date.isSame(dayjs().add(1, 'day'), 'day')) return 'Tomorrow'
    return date.format('dddd, MMM D')
  })
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
    selectedGroup.value ||= Object.keys(groupedReminders.value)[0] || null
    fetchUsage()
  }, () => { loading.value = false })
}

async function onCancel(r) {
  try {
    const uid = auth?.currentUser?.uid || localStorage.getItem('uid')
    if (!uid) return
    if (r?.taskId) await api.post('/reminders/cancel', { userId: uid, taskId: r.taskId })
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

onMounted(() => { watchReminders(); fetchUsage() })
onUnmounted(() => { if (unbind) unbind() })

// Refresh usage meter when other parts of app schedule reminders
onMounted(() => { try { window.addEventListener('usage-refresh', fetchUsage) } catch {} })
onUnmounted(() => { try { window.removeEventListener('usage-refresh', fetchUsage) } catch {} })
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: all 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(10px); }
.hide-scrollbar::-webkit-scrollbar { display: none; }
.hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>
