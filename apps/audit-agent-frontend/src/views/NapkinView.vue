<template>
  <div class="app-page-shell">
    <div class="app-page-frame">
      <header class="app-page-hero flex flex-col lg:flex-row gap-4 items-start">
        <div class="space-y-2">
          <p class="app-page-eyebrow">AI Quick Actions</p>
          <h1 class="app-page-title !text-[clamp(2rem,3vw,2.85rem)]">Napkin</h1>
          <p class="app-page-description max-w-2xl text-sm">
            Drop raw ideas, voice notes, and half-formed tasks. PlanCraft will classify, tag, and route them into Planner,
            Creator, or Leader mode when you’re ready.
          </p>
          <div class="flex flex-wrap gap-2 text-xs text-slate-300/80">
            <span class="px-3 py-1 rounded-full bg-slate-950/30 border border-white/10">⚡ Quick add</span>
            <span class="px-3 py-1 rounded-full bg-slate-950/30 border border-white/10">🎙 Voice-ready</span>
            <span class="px-3 py-1 rounded-full bg-slate-950/30 border border-white/10">🧠 Auto-tagged</span>
          </div>
        </div>
        <div class="ml-auto app-page-kpis grid grid-cols-2 sm:grid-cols-3 text-center w-full lg:w-auto">
          <div class="app-page-kpi stat-tile">
            <p class="stat-label">Captured</p>
            <p class="stat-value">{{ items.length }}</p>
          </div>
          <div class="app-page-kpi stat-tile">
            <p class="stat-label">Converted</p>
            <p class="stat-value">{{ convertedCount }}</p>
          </div>
          <div class="app-page-kpi stat-tile col-span-2 sm:col-span-1">
            <p class="stat-label">Voice notes</p>
            <p class="stat-value">{{ voiceCount }}</p>
          </div>
        </div>
      </header>

      <section class="app-page-section space-y-4">
        <div class="flex flex-col md:flex-row md:items-center gap-3 justify-between">
          <div>
            <p class="app-page-eyebrow !tracking-[0.25em]">Quick Add</p>
            <h2 class="text-xl font-semibold">Fast capture with AI routing</h2>
          </div>
          <div class="flex gap-2 flex-wrap">
            <span class="chip" v-if="classification">
              {{ classification.intent === 'planner' ? 'Planner suggested' : classification.intent === 'creator' ? 'Creator suggested' : classification.intent === 'leader' ? 'Leader suggested' : 'Stay on Napkin' }}
            </span>
            <span class="chip" v-if="classification">Tag: {{ classification.category }}</span>
          </div>
        </div>

        <div class="grid lg:grid-cols-[1.2fr_0.9fr] gap-4">
          <div class="space-y-3">
            <textarea
              v-model="input"
              rows="4"
              class="w-full rounded-2xl bg-slate-950/30 border border-white/10 px-4 py-3 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30 transition"
              placeholder="Type or paste anything — ideas, reminders, voice transcripts, screenshots (link), or messy notes…"
            ></textarea>

            <div class="flex flex-col sm:flex-row gap-3">
              <button
                class="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-500 to-indigo-500 hover:from-fuchsia-400 hover:to-indigo-400 text-sm font-semibold transition disabled:opacity-50"
                :disabled="saving || (!input.trim() && !voiceTranscript)"
                @click="saveNapkin"
              >
                <span v-if="saving" class="loader-dot" aria-hidden="true"></span>
                <span>{{ saving ? 'Saving…' : 'Drop to Napkin' }}</span>
              </button>
              <button
                class="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-950/30 border border-white/10 hover:border-indigo-400 text-sm transition"
                :class="{ 'animate-pulse-soft': recordingState === 'recording' }"
                @click="toggleRecording"
              >
                <span v-if="recordingState === 'recording'">⏹ Stop</span>
                <span v-else-if="recordingState === 'processing'">⏳ Processing</span>
                <span v-else>🎙 Voice capture</span>
                <span v-if="recordingState === 'recording'" class="recording-dot" aria-hidden="true"></span>
                <span v-if="recordingState !== 'idle'" class="text-xs text-slate-400">{{ formattedTimer }}</span>
              </button>
              <button
                v-if="audioPreviewUrl || voiceTranscript"
                class="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-950/30 border border-white/10 text-sm hover:border-rose-400"
                @click="resetVoice"
              >
                ✕ Clear voice
              </button>
            </div>

            <div v-if="audioPreviewUrl || voiceTranscript" class="voice-preview">
              <div class="flex items-center justify-between gap-2">
                <p class="text-sm font-semibold text-slate-200">Voice capture</p>
              </div>
              <div class="space-y-2">
                <audio v-if="audioPreviewUrl" :src="audioPreviewUrl" controls class="w-full" />
                <p v-if="voiceTranscript" class="text-sm text-slate-300 bg-slate-950/30 border border-white/10 rounded-xl px-3 py-2">
                  {{ voiceTranscript }}
                </p>
              </div>
            </div>

            <div v-if="classification" class="flex flex-wrap gap-2 text-xs">
              <span class="pill pill-ghost">AI: {{ classification.type }}</span>
              <span class="pill pill-ghost">Category: {{ classification.category }}</span>
              <span class="pill pill-ghost">{{ classification.suggestion }}</span>
            </div>
          </div>

          <div class="p-4 rounded-2xl bg-slate-950/30 border border-white/10 space-y-3">
            <div class="flex items-center justify-between">
              <p class="text-sm font-semibold text-slate-200">AI quick actions</p>
              <span class="text-[11px] px-2 py-0.5 rounded-full bg-slate-950/35 border border-white/10 text-slate-300/80">
                {{ latestSaved ? 'Ready' : 'Waiting for input' }}
              </span>
            </div>
            <p class="text-xs text-slate-400">PlanCraft recommends where this note should land.</p>

            <div class="grid sm:grid-cols-2 gap-2">
              <button class="action-btn" :disabled="!latestSaved" @click="latestSaved && openPlanner(latestSaved)">
                <span>🗓 Add to Planner</span>
              </button>
              <button class="action-btn" :disabled="!latestSaved" @click="latestSaved && convertToCreator(latestSaved)">
                <span>🎨 Send to Creator</span>
              </button>
              <button class="action-btn" :disabled="!latestSaved" @click="latestSaved && convertToLeader(latestSaved)">
                <span>🧭 Add Leader Event</span>
              </button>
              <button class="action-btn" :disabled="!latestSaved" @click="latestSaved && keepNapkin(latestSaved)">
                <span>📌 Keep in Napkin</span>
              </button>
            </div>

            <div v-if="latestSaved" class="text-xs text-slate-400 mt-2">
              {{ latestSaved.suggestion || 'Ready for routing.' }}
            </div>
          </div>
        </div>
      </section>

      <section class="space-y-3">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p class="app-page-eyebrow !tracking-[0.25em]">Stream</p>
            <h3 class="text-lg font-semibold">Your Napkin</h3>
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="f in filters"
              :key="f.value"
              @click="filter = f.value"
              :class="[
                'px-3 py-1.5 rounded-full text-sm border transition',
                filter === f.value
                  ? 'bg-indigo-500/90 text-white border-indigo-300/70'
                  : 'bg-slate-950/30 text-slate-300 border-white/10 hover:border-indigo-400/60',
              ]"
            >
              {{ f.label }}
            </button>
          </div>
        </div>

        <div
          v-if="napkinError"
          class="text-sm text-rose-200 bg-rose-900/40 border border-rose-700/40 rounded-xl px-3 py-2"
        >
          {{ napkinError }}
        </div>

        <div v-if="loading" class="space-y-2">
          <div v-for="n in 4" :key="n" class="h-20 bg-slate-900/60 border border-slate-800 rounded-xl animate-pulse" />
        </div>
        <div v-else-if="filteredItems.length === 0" class="app-page-empty text-sm">
          Nothing on the Napkin yet. Capture a note or voice memo to get started.
        </div>
        <div v-else class="space-y-3">
          <article
            v-for="item in filteredItems"
            :key="item.id"
            class="p-4 rounded-3xl bg-slate-950/30 border border-white/10 hover:border-indigo-300/50 transition space-y-3 shadow-lg shadow-slate-950/10"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="space-y-1 flex-1">
                <div class="flex flex-wrap items-center gap-2 text-[11px]">
                  <span class="pill">{{ item.type }}</span>
                  <span class="pill pill-ghost">{{ item.category }}</span>
                  <span v-if="item.status !== 'unsorted'" class="pill pill-ghost uppercase tracking-wide">
                    {{ item.status }}
                  </span>
                  <span class="text-slate-500">{{ formatDate(item.createdAt) }}</span>
                </div>
                <p class="text-sm text-slate-100 whitespace-pre-line leading-relaxed">
                  {{ item.text }}
                </p>
                <p v-if="item.transcript && item.transcript !== item.text" class="text-xs text-slate-400">
                  Transcript: {{ item.transcript }}
                </p>
                <audio
                  v-if="item.audioUrl"
                  :src="item.audioUrl"
                  controls
                  class="w-full mt-2 rounded-lg border border-slate-800 bg-slate-950/60"
                />
              </div>
              <div class="flex flex-col gap-2 items-end">
                <button class="icon-btn" @click="archiveItem(item)" :title="item.status === 'archived' ? 'Unarchive' : 'Archive'">
                  {{ item.status === 'archived' ? '⬆️' : '📦' }}
                </button>
                <button class="icon-btn" @click="deleteItem(item)" title="Delete">🗑</button>
              </div>
            </div>

            <div v-if="item.tags?.length" class="flex flex-wrap gap-2 text-[11px] text-slate-400">
              <span v-for="tag in item.tags" :key="tag" class="pill pill-ghost">#{{ tag }}</span>
            </div>

            <div class="flex flex-wrap gap-2">
              <button class="action-chip" @click="openPlanner(item)">Add to Planner</button>
              <button class="action-chip" @click="convertToCreator(item)">Send to Creator</button>
              <button class="action-chip" @click="convertToLeader(item)">Add Leader Event</button>
              <button class="action-chip" @click="keepNapkin(item)">Keep here</button>
            </div>
          </article>
        </div>
      </section>
    </div>

    <TaskPlannerDialog
      v-if="plannerOpen"
      :open="plannerOpen"
      :task="plannerTask"
      :date="plannerTask?.date"
      @close="closePlanner"
      @saved="handleTaskSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import TaskPlannerDialog from '@/components/TaskPlannerDialog.vue'
import api from '@/services/api'
import { addTaskToFirebase, updateTaskInFirebase } from '@/services/firebaseService'
import {
  classifyNapkinText,
  createNapkinItem,
  deleteNapkinItem,
  subscribeToNapkinItems,
  updateNapkinItem,
  type NapkinClassification,
  type NapkinItem,
} from '@/services/napkinService'
import { toLocalDateKey } from '@/utils/dateHelper'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { ensureAiConsentOrThrow } from '@/services/aiConsentService'

type RecorderState = 'idle' | 'recording' | 'processing'

const router = useRouter()
const workspaceStore = useWorkspaceStore()

const input = ref('')
const voiceTranscript = ref('')
const recordingState = ref<RecorderState>('idle')
const recordingSeconds = ref(0)
const audioPreviewUrl = ref('')
const recordedBlob = ref<Blob | null>(null)
const classification = ref<NapkinClassification | null>(null)
const saving = ref(false)
const loading = ref(true)
const napkinError = ref('')
const items = ref<NapkinItem[]>([])
const filter = ref('all')
const plannerOpen = ref(false)
const plannerTask = ref<any>(null)
const convertingFrom = ref<NapkinItem | null>(null)
const latestSavedId = ref<string | null>(null)

const filters = [
  { label: 'All', value: 'all' },
  { label: 'Tasks', value: 'task' },
  { label: 'Ideas', value: 'idea' },
  { label: 'Content', value: 'content' },
  { label: 'Reminders', value: 'reminder' },
  { label: 'Voice', value: 'voice' },
]

let unsubscribe: (() => void) | null = null
let mediaRecorder: MediaRecorder | null = null
let timerId: number | null = null
let stream: MediaStream | null = null
let workspaceUnsub: (() => void) | null = null

const filteredItems = computed(() => {
  if (filter.value === 'all') return items.value
  if (filter.value === 'voice') return items.value.filter((i) => i.audioUrl || i.source === 'voice')
  return items.value.filter((i) => i.type === filter.value)
})

const latestSaved = computed(() => items.value.find((i) => i.id === latestSavedId.value))
const convertedCount = computed(() => items.value.filter((i) => i.status === 'converted').length)
const voiceCount = computed(() => items.value.filter((i) => i.audioUrl || i.source === 'voice').length)

const formattedTimer = computed(() => {
  const mins = Math.floor(recordingSeconds.value / 60)
  const secs = recordingSeconds.value % 60
  return `${mins}:${String(secs).padStart(2, '0')}`
})

function formatDate(ms: number) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(ms))
  } catch {
    return new Date(ms).toLocaleString()
  }
}

async function toggleRecording() {
  if (recordingState.value === 'recording') {
    stopRecording()
    return
  }
  if (recordingState.value === 'processing') return
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  } catch (err: any) {
    ElMessage.error(err?.message || 'Microphone permission denied')
    return
  }
  recordedBlob.value = null
  voiceTranscript.value = ''
  recordingSeconds.value = 0
  mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
  const chunks: Blob[] = []
  mediaRecorder.ondataavailable = (e: BlobEvent) => {
    if (e?.data?.size) chunks.push(e.data)
  }
  mediaRecorder.onstop = async () => {
    recordingState.value = 'processing'
    try {
      const blob = new Blob(chunks, { type: mediaRecorder?.mimeType || 'audio/webm' })
      recordedBlob.value = blob
      audioPreviewUrl.value = URL.createObjectURL(blob)
      await transcribeBlob(blob)
    } finally {
      recordingState.value = 'idle'
      stopStream()
    }
  }
  mediaRecorder.start()
  recordingState.value = 'recording'
  startTimer()
}

function stopRecording() {
  if (mediaRecorder && recordingState.value === 'recording') {
    mediaRecorder.stop()
  }
  stopTimer()
}

function startTimer() {
  stopTimer()
  timerId = window.setInterval(() => {
    recordingSeconds.value += 1
  }, 1000)
}

function stopTimer() {
  if (timerId) {
    clearInterval(timerId)
    timerId = null
  }
}

function stopStream() {
  if (stream) {
    stream.getTracks().forEach((t) => t.stop())
    stream = null
  }
}

async function transcribeBlob(blob: Blob) {
  try {
    await ensureAiConsentOrThrow({ source: 'napkin-transcribe' })
    const fd = new FormData()
    fd.append('file', blob, 'napkin-voice.webm')
    const { data } = await api.post('/transcribe', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    const text = data?.text || ''
    if (text) {
      voiceTranscript.value = text
      input.value = input.value ? `${input.value.trim()}\n${text}` : text
    }
  } catch (err: any) {
    console.warn('[napkin] voice transcription failed', err?.message || err)
    ElMessage.error(err?.message || 'Voice transcription failed')
  }
}

function resetVoice() {
  if (audioPreviewUrl.value) {
    URL.revokeObjectURL(audioPreviewUrl.value)
    audioPreviewUrl.value = ''
  }
  recordedBlob.value = null
  voiceTranscript.value = ''
  recordingSeconds.value = 0
  recordingState.value = 'idle'
  stopTimer()
  stopStream()
}

async function saveNapkin() {
  const text = input.value.trim() || voiceTranscript.value.trim()
  if (!text) {
    ElMessage.warning('Drop a thought first')
    return
  }
  saving.value = true
  try {
    const cls = await classifyNapkinText(text)
    classification.value = cls
    const saved = await createNapkinItem({
      text,
      source: recordedBlob.value ? 'voice' : 'typed',
      transcript: voiceTranscript.value,
      audioBlob: recordedBlob.value,
      audioType: recordedBlob.value?.type,
      classification: cls,
      metadata: { length: text.length },
    })
    latestSavedId.value = saved.id
    input.value = ''
    voiceTranscript.value = ''
    resetVoice()
    ElMessage.success('Captured on your Napkin')
  } catch (err: any) {
    console.error(err)
    ElMessage.error(err?.message || 'Failed to save')
  } finally {
    saving.value = false
  }
}

function openPlanner(item: NapkinItem) {
  convertingFrom.value = item
  plannerTask.value = {
    title: item.text.slice(0, 120),
    details: item.transcript || '',
    date: toLocalDateKey(new Date()),
    category: item.category || 'task',
  }
  plannerOpen.value = true
}

async function handleTaskSaved(payload: any) {
  try {
    let linkedId: string | undefined
    if (Array.isArray(payload)) {
      const needsSave = payload.filter((task) => !task.id)
      if (needsSave.length) {
        const saved = await Promise.all(needsSave.map((task) => addTaskToFirebase(task)))
        linkedId = saved[0]?.id
      } else {
        linkedId = payload[0]?.id
      }
    } else if (payload) {
      if (payload.id) {
        linkedId = payload.id
        await updateTaskInFirebase(payload)
      } else {
        const saved = await addTaskToFirebase(payload)
        linkedId = saved.id
      }
    }
    if (convertingFrom.value?.id) {
      await updateNapkinItem(convertingFrom.value.id, {
        status: 'converted',
        intent: 'planner',
        linkedTaskId: linkedId,
      }, convertingFrom.value.workspaceId)
    }
    ElMessage.success('Routed to Planner')
  } catch (err: any) {
    ElMessage.error(err?.message || 'Task save failed')
  } finally {
    plannerOpen.value = false
    plannerTask.value = null
    convertingFrom.value = null
  }
}

function closePlanner() {
  plannerOpen.value = false
  plannerTask.value = null
  convertingFrom.value = null
}

async function convertToCreator(item: NapkinItem) {
  try {
    await updateNapkinItem(item.id, { status: 'converted', intent: 'creator' }, item.workspaceId)
    router.push({ path: '/creator/editor/new', query: { seed: item.text, napkin: item.id } })
  } catch (err: any) {
    ElMessage.error(err?.message || 'Failed to send to Creator')
  }
}

async function convertToLeader(item: NapkinItem) {
  try {
    await updateNapkinItem(item.id, { status: 'converted', intent: 'leader' }, item.workspaceId)
    router.push({
      name: 'leader-events',
      query: { seed: item.text, category: item.category, napkin: item.id },
    })
  } catch (err: any) {
    ElMessage.error(err?.message || 'Failed to send to Leader')
  }
}

async function keepNapkin(item: NapkinItem) {
  try {
    await updateNapkinItem(item.id, { status: 'unsorted', intent: 'napkin' }, item.workspaceId)
    ElMessage.success('Kept on Napkin')
  } catch (err: any) {
    ElMessage.error(err?.message || 'Failed to update item')
  }
}

async function archiveItem(item: NapkinItem) {
  try {
    const nextStatus = item.status === 'archived' ? 'unsorted' : 'archived'
    await updateNapkinItem(item.id, { status: nextStatus }, item.workspaceId)
  } catch (err: any) {
    ElMessage.error(err?.message || 'Failed to archive')
  }
}

async function deleteItem(item: NapkinItem) {
  try {
    await ElMessageBox.confirm('Delete this Napkin entry?', 'Delete', {
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      type: 'warning',
    })
  } catch {
    return
  }
  try {
    await deleteNapkinItem(item.id, item.workspaceId)
  } catch (err: any) {
    ElMessage.error(err?.message || 'Delete failed')
  }
}

function subscribe() {
  loading.value = true
  napkinError.value = ''
  try {
    unsubscribe = subscribeToNapkinItems(
      (list) => {
        items.value = list
        loading.value = false
        napkinError.value = ''
      },
      {
        onError: (error) => {
          if (!items.value.length) {
            napkinError.value =
              'Napkin feed is unavailable right now. Showing the last saved items if possible.'
          }
          loading.value = false
        },
      },
    )
  } catch (err: any) {
    console.warn('[napkin] subscribe failed', err?.message || err)
    napkinError.value = 'Unable to load napkin stream.'
    loading.value = false
  }
}

onMounted(() => {
  subscribe()
  try {
    workspaceUnsub = workspaceStore.$subscribe(() => {
      if (unsubscribe) unsubscribe()
      subscribe()
    })
  } catch {
    /* noop */
  }
})

onBeforeUnmount(() => {
  if (unsubscribe) unsubscribe()
  if (workspaceUnsub) workspaceUnsub()
  resetVoice()
})
</script>

<style scoped>
.chip {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.stat-tile {
  padding: 0.9rem;
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 1rem;
}

.stat-label {
  margin: 0;
  color: rgba(148, 163, 184, 0.8);
  font-size: 0.75rem;
  letter-spacing: 0.02em;
}

.stat-value {
  margin: 0.15rem 0 0;
  font-weight: 700;
  font-size: 1.4rem;
}

.loader-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: white;
  animation: spin 0.8s linear infinite;
}

.recording-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #f43f5e;
  animation: pulse 1.4s ease-in-out infinite;
}

.voice-preview {
  border: 1px dashed rgba(148, 163, 184, 0.4);
  border-radius: 0.9rem;
  padding: 0.85rem;
  background: rgba(255, 255, 255, 0.02);
}

.action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  width: 100%;
  padding: 0.8rem 0.75rem;
  border-radius: 0.9rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(15, 23, 42, 0.7);
  color: #e2e8f0;
  transition: border-color 0.2s ease, transform 0.15s ease;
}

.action-btn:hover:not(:disabled) {
  border-color: rgba(129, 140, 248, 0.8);
  transform: translateY(-1px);
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.15rem 0.6rem;
  border-radius: 999px;
  background: rgba(99, 102, 241, 0.15);
  border: 1px solid rgba(129, 140, 248, 0.4);
  text-transform: capitalize;
}

.pill-ghost {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.1);
}

.action-chip {
  padding: 0.55rem 0.9rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
  color: #e2e8f0;
  font-size: 0.85rem;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.action-chip:hover {
  border-color: rgba(129, 140, 248, 0.8);
  background: rgba(129, 140, 248, 0.12);
}

.icon-btn {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes pulse {
  0% {
    transform: scale(0.95);
    opacity: 0.7;
  }
  50% {
    transform: scale(1.05);
    opacity: 1;
  }
  100% {
    transform: scale(0.95);
    opacity: 0.7;
  }
}

.animate-pulse-soft {
  animation: pulse 1.4s ease-in-out infinite;
}
</style>
