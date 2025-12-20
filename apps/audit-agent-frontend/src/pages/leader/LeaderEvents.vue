<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6">
    <header class="flex items-start justify-between gap-3">
      <div>
        <p class="uppercase text-xs tracking-[0.35em] text-indigo-300/80">Leader Mode</p>
        <h1 class="text-3xl font-bold mt-2">Events</h1>
        <p class="text-slate-400 text-sm">Plan, edit, and schedule leader events with AI assistance.</p>
      </div>
      <div class="flex gap-2">
        <button
          class="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 hover:border-indigo-500 text-sm"
          @click="load"
        >
          Refresh
        </button>
        <button
          class="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold"
          @click="openCreate"
        >
          + New event
        </button>
      </div>
    </header>

    <section class="grid lg:grid-cols-3 gap-4">
      <div class="lg:col-span-2 p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow space-y-3">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs uppercase tracking-wide text-slate-400">Calendar</p>
            <p class="text-sm text-slate-500">Tap a day to create or view events.</p>
          </div>
          <div class="flex items-center gap-2 text-sm">
            <button class="px-3 py-1 rounded-lg bg-slate-800 border border-slate-700" @click="prevMonth">←</button>
            <span class="font-semibold">{{ currentMonthLabel }}</span>
            <button class="px-3 py-1 rounded-lg bg-slate-800 border border-slate-700" @click="nextMonth">→</button>
          </div>
        </div>
        <div class="grid grid-cols-7 gap-2 text-center text-xs text-slate-400">
          <div v-for="d in ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']" :key="d">{{ d }}</div>
        </div>
        <div class="grid grid-cols-7 gap-2">
          <button
            v-for="day in calendarDays"
            :key="day.date.valueOf()"
            class="p-2 rounded-xl text-left border transition"
            :class="[
              day.isCurrentMonth ? 'bg-slate-900/70 border-slate-800' : 'bg-slate-900/40 border-slate-900 text-slate-500',
              'hover:border-indigo-500',
            ]"
            @click="openCreate(day.date.format('YYYY-MM-DD'))"
          >
            <div class="flex items-center justify-between">
              <span class="text-sm font-semibold">{{ day.label }}</span>
              <span
                v-if="day.events.length"
                class="text-[10px] px-2 py-0.5 rounded-full bg-indigo-600/30 text-indigo-100"
              >
                {{ day.events.length }}
              </span>
            </div>
            <div class="mt-1 space-y-1">
              <div
                v-for="e in day.events.slice(0, 3)"
                :key="e.id"
                class="text-[11px] px-2 py-1 rounded bg-slate-800/80 text-indigo-100 truncate"
              >
                {{ e.title }}
              </div>
            </div>
          </button>
        </div>
      </div>

      <div class="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow space-y-3">
        <div class="flex items-center justify-between">
          <p class="text-xs uppercase tracking-wide text-slate-400">Events list</p>
          <span class="text-[11px] px-2 py-1 rounded-full bg-slate-800 border border-slate-700">{{ events.length }} total</span>
        </div>
        <div v-if="loading" class="space-y-2">
          <div v-for="n in 4" :key="n" class="h-12 bg-slate-800/60 rounded-lg animate-pulse" />
        </div>
        <div v-else-if="events.length === 0" class="text-sm text-slate-500">
          No events yet. Create the first one.
        </div>
        <div v-else class="space-y-3">
          <article
            v-for="event in events"
            :key="event.id"
            class="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col gap-2"
          >
            <div class="flex items-start justify-between gap-2">
              <div>
                <p class="font-semibold">{{ event.title }}</p>
                <p class="text-xs text-slate-400">{{ formatDate(event.date) }} {{ event.time ? `• ${event.time}` : '' }}</p>
              </div>
              <div class="flex gap-2">
                <button class="text-xs px-2 py-1 rounded bg-slate-800 border border-slate-700" @click="openEdit(event)">Edit</button>
                <button class="text-xs px-2 py-1 rounded bg-rose-800/70 border border-rose-700" @click="remove(event)">Delete</button>
              </div>
            </div>
            <p class="text-sm text-slate-300 line-clamp-2">{{ event.description || 'No description yet.' }}</p>
            <div class="flex items-center justify-between text-xs text-slate-500" v-if="event.location">
              <span>📍 {{ event.location }}</span>
              <a
                :href="mapLink(event.location)"
                target="_blank"
                rel="noopener"
                class="text-indigo-300 hover:text-indigo-100"
              >
                Open maps
              </a>
            </div>
            <div class="flex flex-wrap gap-1">
              <span v-for="tag in event.tags || []" :key="tag" class="text-[10px] px-2 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700">
                {{ tag }}
              </span>
            </div>
          </article>
        </div>
      </div>
    </section>

    <div v-if="showModal" class="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div class="w-full max-w-xl p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs uppercase tracking-wide text-slate-400">{{ form.id ? 'Edit event' : 'New event' }}</p>
            <h3 class="text-xl font-semibold">{{ form.title || 'Untitled event' }}</h3>
          </div>
          <button class="text-slate-400 hover:text-white" @click="closeModal">✕</button>
        </div>
        <div class="grid sm:grid-cols-2 gap-3">
          <div class="sm:col-span-2 rounded-lg border border-indigo-500/30 bg-indigo-500/10 p-3 space-y-2">
            <div class="flex items-center justify-between gap-2">
              <div>
                <p class="text-xs uppercase tracking-wide text-indigo-200">Scan invite / poster</p>
                <p class="text-[11px] text-indigo-100/80">Use your camera or upload to auto-fill this event.</p>
              </div>
              <input ref="fileInput" type="file" accept="image/*" capture="environment" class="hidden" @change="onScanFile" />
              <button
                class="px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold disabled:opacity-60"
                :disabled="captureLoading"
                @click="triggerScan"
              >
                {{ captureLoading ? 'Processing…' : capturePreview ? 'Re-scan' : 'Scan invite' }}
              </button>
            </div>
            <div class="flex items-center gap-3 text-xs text-indigo-100">
              <span v-if="capturePreview" class="px-2 py-1 rounded bg-white/10 border border-white/10">Image attached</span>
              <span v-if="captureConfidence" class="px-2 py-1 rounded bg-emerald-500/10 border border-emerald-400/40 text-emerald-100">
                Detected from scan ({{ Math.round(captureConfidence * 100) }}% confident)
              </span>
              <span v-if="captureError" class="text-rose-200">{{ captureError }}</span>
            </div>
          </div>
          <label class="space-y-1 text-sm text-slate-200">
            Title
            <input
              v-model="form.title"
              type="text"
              class="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm"
              placeholder="e.g., Community meet"
            />
          </label>
          <label class="space-y-1 text-sm text-slate-200">
            Date
            <input v-model="form.date" type="date" class="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm" />
          </label>
          <label class="space-y-1 text-sm text-slate-200">
            Time
            <input v-model="form.time" type="time" class="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm" />
          </label>
          <label class="space-y-1 text-sm text-slate-200">
            Location
            <input
              v-model="form.location"
              type="text"
              class="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm"
              placeholder="Venue or city"
            />
          </label>
        </div>
        <label class="space-y-1 text-sm text-slate-200 block">
          Description
          <textarea
            v-model="form.description"
            rows="3"
            class="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm"
            placeholder="What is this event about?"
          ></textarea>
        </label>
        <label class="space-y-1 text-sm text-slate-200 block">
          Tags
          <input
            v-model="form.tags"
            type="text"
            class="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm"
            placeholder="Comma separated tags"
          />
        </label>
        <div class="flex flex-wrap gap-2">
          <button
            class="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm"
            :disabled="aiLoading"
            @click="suggestAi"
          >
            {{ aiLoading ? 'Thinking…' : 'AI suggest title + description' }}
          </button>
          <button
            class="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold disabled:opacity-50"
            :disabled="saving"
            @click="save"
          >
            {{ saving ? 'Saving…' : form.id ? 'Update' : 'Create' }}
          </button>
          <button class="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm" @click="closeModal">
            Cancel
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  listLeaderEvents,
  createLeaderEvent,
  updateLeaderEvent,
  deleteLeaderEvent,
  suggestEventCopy,
} from '@/services/leader/events'
import { nlpClient } from '@/services/leader/http'
import { uploadImageForVision } from '@/services/visionUploadService'

const router = useRouter()
const route = useRoute()
const events = ref([])
const loading = ref(false)
const showModal = ref(false)
const saving = ref(false)
const aiLoading = ref(false)
const currentMonth = ref(dayjs())
const captureLoading = ref(false)
const captureError = ref('')
const capturePreview = ref('')
const captureConfidence = ref(null)
const fileInput = ref(null)
const form = reactive({
  id: null,
  title: '',
  description: '',
  date: dayjs().format('YYYY-MM-DD'),
  time: '09:00',
  location: '',
  tags: '',
})

const currentMonthLabel = computed(() => currentMonth.value.format('MMMM YYYY'))

const calendarDays = computed(() => {
  const days = []
  const start = currentMonth.value.startOf('month').startOf('week')
  const end = currentMonth.value.endOf('month').endOf('week')
  let cursor = start
  while (cursor.isBefore(end) || cursor.isSame(end, 'day')) {
    const dateStr = cursor.format('YYYY-MM-DD')
    const dayEvents = events.value.filter((e) => e.date && dayjs(e.date).isSame(cursor, 'day'))
    days.push({
      date: cursor,
      label: cursor.format('D'),
      events: dayEvents,
      isCurrentMonth: cursor.month() === currentMonth.value.month(),
    })
    cursor = cursor.add(1, 'day')
  }
  return days
})

function formatDate(value) {
  if (!value) return ''
  return dayjs(value).format('MMM D, YYYY')
}

function mapLink(location) {
  if (!location) return '#'
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`
}

async function prefillFromQuery() {
  const seed = typeof route.query.seed === 'string' ? route.query.seed : ''
  if (!seed) return
  form.title = typeof route.query.title === 'string' && route.query.title.trim().length
    ? route.query.title
    : seed.slice(0, 48) + (seed.length > 48 ? '…' : '')
  form.description = seed
  if (typeof route.query.category === 'string') form.tags = route.query.category
  showModal.value = true
  await nextTick()
  try {
    router.replace({
      query: {
        ...route.query,
        seed: undefined,
        title: undefined,
        category: undefined,
        napkin: undefined,
      },
    })
  } catch {
    /* noop */
  }
}

function nextMonth() {
  currentMonth.value = currentMonth.value.add(1, 'month')
}

function prevMonth() {
  currentMonth.value = currentMonth.value.subtract(1, 'month')
}

function resetForm(date) {
  form.id = null
  form.title = ''
  form.description = ''
  form.date = date || dayjs().format('YYYY-MM-DD')
  form.time = '09:00'
  form.location = ''
  form.tags = ''
  capturePreview.value = ''
  captureError.value = ''
  captureConfidence.value = null
}

function openCreate(date) {
  resetForm(date)
  showModal.value = true
}

function openEdit(event) {
  form.id = event.id
  form.title = event.title
  form.description = event.description
  form.date = event.date || dayjs().format('YYYY-MM-DD')
  form.time = event.time || '09:00'
  form.location = event.location || ''
  form.tags = (event.tags || []).join(', ')
  showModal.value = true
}

function closeModal() {
  showModal.value = false
}

async function load() {
  loading.value = true
  try {
    const res = await listLeaderEvents()
    events.value = res || []
  } catch (e) {
    ElMessage.error(e?.response?.data?.error || 'Failed to load events')
  } finally {
    loading.value = false
  }
}

async function save() {
  if (!form.title) return ElMessage.warning('Title is required')
  saving.value = true
  const payload = {
    title: form.title,
    description: form.description,
    date: form.date,
    time: form.time,
    location: form.location,
    tags: form.tags
      ? form.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      : [],
  }
  try {
    if (form.id) {
      await updateLeaderEvent(form.id, payload)
    } else {
      await createLeaderEvent(payload)
    }
    await load()
    showModal.value = false
    ElMessage.success(form.id ? 'Event updated' : 'Event created')
  } catch (e) {
    ElMessage.error(e?.response?.data?.error || 'Failed to save event')
  } finally {
    saving.value = false
  }
}

async function remove(event) {
  try {
    await ElMessageBox.confirm(`Delete "${event.title}"?`, 'Confirm', { type: 'warning' })
    await deleteLeaderEvent(event.id)
    await load()
    ElMessage.success('Event deleted')
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e?.response?.data?.error || 'Failed to delete event')
  }
}

async function suggestAi() {
  aiLoading.value = true
  try {
    const res = await suggestEventCopy({
      title: form.title,
      description: form.description,
      context: form.location,
    })
    if (res?.title) form.title = res.title
    if (res?.description) form.description = res.description
  } catch (e) {
    ElMessage.error(e?.response?.data?.error || 'AI suggestion failed')
  } finally {
    aiLoading.value = false
  }
}

function triggerScan() {
  captureError.value = ''
  fileInput.value?.click()
}

async function onScanFile(event) {
  const file = event.target.files?.[0]
  if (!file) return
  captureError.value = ''
  captureLoading.value = true
  capturePreview.value = ''
  captureConfidence.value = null
  try {
    capturePreview.value = URL.createObjectURL(file)
    const { imageUrl } = await uploadImageForVision(file)
    const { data } = await nlpClient.post('/workspace/ingest-image?mode=event', { imageUrl })
    if (data?.event) {
      form.title = data.event.title || form.title
      form.date = data.event.date || form.date
      form.time = data.event.startTime || form.time
      form.location = data.event.locationText || form.location
      form.description = data.event.notes || form.description
      captureConfidence.value = data.event.confidence || null
    } else if (Array.isArray(data?.items) && data.items.length) {
      const first = data.items.find((it) => it.type === 'event') || data.items[0]
      form.title = first?.title || form.title
      form.description = first?.description || form.description
    } else {
      captureError.value = 'No event detected. Please try again.'
    }
  } catch (e) {
    captureError.value = e?.response?.data?.error || e?.message || 'Failed to scan image'
  } finally {
    captureLoading.value = false
    if (event?.target?.value) event.target.value = ''
  }
}

onMounted(() => {
  load()
  prefillFromQuery()
})
</script>
