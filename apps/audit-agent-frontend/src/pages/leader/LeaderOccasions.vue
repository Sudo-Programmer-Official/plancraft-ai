<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6">
    <header class="flex items-center justify-between gap-3">
      <div>
        <p class="uppercase text-xs tracking-[0.35em] text-indigo-300/80">Leader Mode</p>
        <h1 class="text-3xl font-bold mt-2">Occasions</h1>
        <p class="text-slate-400 text-sm">Birthdays and anniversaries with quick AI wishes and scheduling.</p>
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
          + Add occasion
        </button>
      </div>
    </header>

    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="o in occasions"
        :key="o.id"
        class="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 shadow space-y-3"
      >
        <div class="flex items-center justify-between gap-2">
          <div>
            <p class="font-semibold text-lg">{{ o.name }}</p>
            <p class="text-xs text-slate-400">{{ o.type }} • {{ formatDate(o.date) }}</p>
          </div>
          <div class="flex gap-2">
            <button class="px-3 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs" @click="openEdit(o)">Edit</button>
            <button class="px-3 py-1 rounded-lg bg-rose-800/70 border border-rose-700 text-xs" @click="remove(o)">Delete</button>
          </div>
        </div>
        <p class="text-sm text-slate-300 break-words min-h-[48px]">
          {{ o.message || o.suggested || 'No message yet. Generate one?' }}
        </p>
        <div class="flex flex-wrap gap-2">
          <button
            class="px-3 py-1 rounded-lg bg-indigo-600 text-sm hover:bg-indigo-500"
            :disabled="busyId === o.id"
            @click="sendNow(o)"
          >
            {{ busyId === o.id ? 'Sending…' : 'Send now' }}
          </button>
          <button
            class="px-3 py-1 rounded-lg bg-slate-800 border border-slate-700 text-sm"
            :disabled="busyId === o.id"
            @click="aiAndSchedule(o)"
          >
            {{ busyId === o.id ? 'Scheduling…' : 'AI + schedule' }}
          </button>
          <button class="px-3 py-1 rounded-lg bg-slate-800 border border-slate-700 text-sm" @click="previewMessage(o)">
            Preview with AI
          </button>
        </div>
      </div>
      <div v-if="loading" class="md:col-span-2 lg:col-span-3 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div v-for="n in 3" :key="n" class="h-40 bg-slate-900/60 border border-slate-800 rounded-2xl animate-pulse" />
      </div>
      <div v-if="!loading && occasions.length === 0" class="text-sm text-slate-500 col-span-full">
        No occasions yet. Add birthdays or anniversaries to get AI-crafted wishes.
      </div>
    </div>

    <div v-if="showModal" class="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div class="w-full max-w-xl p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs uppercase tracking-wide text-slate-400">{{ editing?.id ? 'Edit occasion' : 'New occasion' }}</p>
            <h3 class="text-xl font-semibold">{{ form.name || 'Occasion' }}</h3>
          </div>
          <button class="text-slate-400 hover:text-white" @click="closeModal">✕</button>
        </div>
        <div class="grid sm:grid-cols-2 gap-3">
          <div class="sm:col-span-2 rounded-lg border border-indigo-500/30 bg-indigo-500/10 p-3 space-y-2">
            <div class="flex items-center justify-between gap-2">
              <div>
                <p class="text-xs uppercase tracking-wide text-indigo-200">Scan card / message</p>
                <p class="text-[11px] text-indigo-100/80">Camera or upload to fill this occasion.</p>
              </div>
              <input ref="fileInput" type="file" accept="image/*" capture="environment" class="hidden" @change="onScanFile" />
              <button
                class="px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold disabled:opacity-60"
                :disabled="captureLoading"
                @click="triggerScan"
              >
                {{ captureLoading ? 'Processing…' : 'Scan card' }}
              </button>
            </div>
            <div class="flex items-center gap-3 text-xs text-indigo-100">
              <span v-if="captureConfidence" class="px-2 py-1 rounded bg-emerald-500/10 border border-emerald-400/40 text-emerald-100">
                Detected from scan ({{ Math.round(captureConfidence * 100) }}% confident)
              </span>
              <span v-if="captureError" class="text-rose-200">{{ captureError }}</span>
            </div>
          </div>
          <label class="space-y-1 text-sm text-slate-200">
            Name
            <input
              v-model="form.name"
              type="text"
              class="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm"
              placeholder="Name(s)"
            />
          </label>
          <label class="space-y-1 text-sm text-slate-200">
            Type
            <select v-model="form.type" class="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm">
              <option value="birthday">Birthday</option>
              <option value="anniversary">Anniversary</option>
              <option value="milestone">Milestone</option>
            </select>
          </label>
          <label class="space-y-1 text-sm text-slate-200">
            Date
            <input v-model="form.date" type="date" class="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm" />
          </label>
          <label class="space-y-1 text-sm text-slate-200">
            Tags
            <input
              v-model="form.tags"
              type="text"
              class="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm"
              placeholder="Comma separated tags"
            />
          </label>
        </div>
        <div class="grid sm:grid-cols-2 gap-3">
          <label class="space-y-1 text-sm text-slate-200">
            Contact
            <select v-model="form.contactId" class="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm">
              <option value="">Unassigned</option>
              <option v-for="c in contacts" :key="c.contactId || c.id" :value="c.contactId || c.id">
                {{ c.name }}
              </option>
            </select>
          </label>
          <label class="space-y-1 text-sm text-slate-200">
            Group
            <select v-model="form.groupId" class="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm">
              <option value="">Unassigned</option>
              <option v-for="g in groups" :key="g.groupId || g.id" :value="g.groupId || g.id">{{ g.name }}</option>
            </select>
          </label>
        </div>
        <label class="space-y-1 text-sm text-slate-200 block">
          Message
          <textarea
            v-model="form.message"
            rows="3"
            class="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm"
            placeholder="Add a personal note or use AI."
          ></textarea>
        </label>
        <div class="flex flex-wrap gap-2">
          <button
            class="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm"
            :disabled="aiLoading"
            @click="aiPreviewFromModal"
          >
            {{ aiLoading ? 'Thinking…' : 'AI preview' }}
          </button>
          <button
            class="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold disabled:opacity-50"
            :disabled="saving"
            @click="save"
          >
            {{ saving ? 'Saving…' : editing?.id ? 'Update' : 'Create' }}
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
import { ref, reactive } from 'vue'
import dayjs from 'dayjs'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  listOccasions,
  createOccasion,
  updateOccasion,
  deleteOccasion,
  recommendOccasionMessage,
  previewOccasionMessage,
  scheduleOccasion,
} from '@/services/leader/occasions'
import { listContacts, listGroups } from '@/services/leader/contacts'
import { nlpClient } from '@/services/leader/http'

function parseEnvFlag(value) {
  return String(value || '')
    .split('#')[0]
    .trim()
    .toLowerCase() === 'true'
}

const occasions = ref([])
const loading = ref(false)
const saving = ref(false)
const aiLoading = ref(false)
const busyId = ref(null)
const showModal = ref(false)
const editing = ref(null)
const contacts = ref([])
const groups = ref([])
const captureLoading = ref(false)
const captureError = ref('')
const captureConfidence = ref(null)
const fileInput = ref(null)
const form = reactive({
  name: '',
  type: 'birthday',
  date: dayjs().format('YYYY-MM-DD'),
  message: '',
  tags: '',
  contactId: '',
  groupId: '',
})

const imageTasksEnabled = parseEnvFlag(import.meta.env.VITE_ENABLE_IMAGE_TASKS)
let visionUploadLoader = null
async function getVisionUploader() {
  if (!imageTasksEnabled) throw new Error('Image capture is disabled')
  if (!visionUploadLoader) {
    visionUploadLoader = import('@/services/visionUploadService')
      .then((mod) => mod.uploadImageForVision)
      .catch((err) => {
        visionUploadLoader = null
        throw err
      })
  }
  return visionUploadLoader
}

function resetForm() {
  form.name = ''
  form.type = 'birthday'
  form.date = dayjs().format('YYYY-MM-DD')
  form.message = ''
  form.tags = ''
  editing.value = null
  form.contactId = ''
  form.groupId = ''
  captureError.value = ''
  captureConfidence.value = null
}

function formatDate(value) {
  return value ? dayjs(value).format('MMM D, YYYY') : ''
}

function openCreate() {
  resetForm()
  showModal.value = true
}

function openEdit(o) {
  editing.value = o
  form.name = o.name
  form.type = o.type
  form.date = o.date
  form.message = o.message || ''
  form.tags = (o.tags || []).join(', ')
  form.contactId = o.contactId || ''
  form.groupId = o.groupId || ''
  captureError.value = ''
  captureConfidence.value = null
  showModal.value = true
}

function closeModal() {
  showModal.value = false
}

async function load() {
  loading.value = true
  try {
    const [occs, contactsRes, groupsRes] = await Promise.all([listOccasions(), listContacts(), listGroups()])
    occasions.value = occs || []
    contacts.value = contactsRes || []
    groups.value = groupsRes || []
  } catch (e) {
    ElMessage.error(e?.response?.data?.error || 'Failed to load occasions')
  } finally {
    loading.value = false
  }
}

async function save() {
  if (!form.name) return ElMessage.warning('Name required')
  saving.value = true
  const payload = {
    name: form.name,
    type: form.type,
    date: form.date,
    message: form.message,
    contactId: form.contactId || undefined,
    groupId: form.groupId || undefined,
    tags: form.tags
      ? form.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      : [],
  }
  try {
    if (editing.value?.id) {
      await updateOccasion(editing.value.id, payload)
    } else {
      await createOccasion(payload)
    }
    await load()
    showModal.value = false
    ElMessage.success(editing.value ? 'Occasion updated' : 'Occasion created')
  } catch (e) {
    ElMessage.error(e?.response?.data?.error || 'Failed to save occasion')
  } finally {
    saving.value = false
  }
}

async function aiPreviewFromModal() {
  aiLoading.value = true
  try {
    form.message = await previewOccasionMessage({
      name: form.name,
      type: form.type,
      date: form.date,
      message: form.message,
    })
  } catch (e) {
    ElMessage.error(e?.response?.data?.error || 'AI preview failed')
  } finally {
    aiLoading.value = false
  }
}

function triggerScan() {
  captureError.value = ''
  if (!imageTasksEnabled) {
    ElMessage.warning('Image scanning is disabled in this environment.')
    return
  }
  fileInput.value?.click()
}

async function onScanFile(event) {
  const file = event.target.files?.[0]
  if (!file) return
  if (!imageTasksEnabled) {
    captureError.value = 'Image scanning is disabled.'
    if (event?.target?.value) event.target.value = ''
    return
  }
  captureError.value = ''
  captureLoading.value = true
  captureConfidence.value = null
  try {
    const uploadImageForVision = await getVisionUploader()
    const { imageUrl } = await uploadImageForVision(file)
    const { data } = await nlpClient.post('/workspace/ingest-image?mode=occasion', { imageUrl })
    if (data?.occasion) {
      form.name = data.occasion.name || form.name
      form.type = data.occasion.type || form.type
      form.date = data.occasion.date || form.date
      if (!form.message && data.occasion.messageHint) form.message = data.occasion.messageHint
      captureConfidence.value = data.occasion.confidence || data.occasion.dateConfidence || null
    } else {
      captureError.value = 'No occasion detected. Try again.'
    }
  } catch (e) {
    captureError.value = e?.response?.data?.error || e?.message || 'Failed to scan image'
  } finally {
    captureLoading.value = false
    if (event?.target?.value) event.target.value = ''
  }
}

async function sendNow(o) {
  if (!o.contactId && !o.groupId) return ElMessage.warning('Add a contact or group to send the wish')
  busyId.value = o.id
  try {
    await scheduleOccasion({ ...o, message: o.message || o.suggested, scheduleAt: new Date().toISOString() })
    ElMessage.success('Queued to send now')
  } catch (e) {
    ElMessage.error(e?.response?.data?.error || 'Failed to send now')
  } finally {
    busyId.value = null
  }
}

async function aiAndSchedule(o) {
  if (!o.contactId && !o.groupId) return ElMessage.warning('Add a contact or group to send the wish')
  busyId.value = o.id
  try {
    const message = await recommendOccasionMessage(o)
    o.suggested = message
    await scheduleOccasion({ ...o, message, scheduleAt: o.date })
    ElMessage.success('Wish scheduled')
  } catch (e) {
    ElMessage.error(e?.response?.data?.error || 'Failed to schedule')
  } finally {
    busyId.value = null
  }
}

async function previewMessage(o) {
  busyId.value = o.id
  try {
    const message = await previewOccasionMessage(o)
    o.suggested = message
    ElMessage.success('Preview refreshed')
  } catch (e) {
    ElMessage.error(e?.response?.data?.error || 'AI preview failed')
  } finally {
    busyId.value = null
  }
}

async function remove(o) {
  try {
    await ElMessageBox.confirm(`Delete ${o.name}?`, 'Confirm', { type: 'warning' })
    await deleteOccasion(o.id)
    await load()
    ElMessage.success('Occasion removed')
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e?.response?.data?.error || 'Delete failed')
  }
}

load()
</script>
