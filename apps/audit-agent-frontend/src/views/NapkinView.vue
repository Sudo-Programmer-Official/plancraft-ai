<template>
  <div class="app-page-shell napkin-page">
    <div class="app-page-frame">
      <header class="app-page-hero flex flex-col items-start gap-3">
        <div class="min-w-0 space-y-2">
          <p class="app-page-eyebrow">AI Quick Actions</p>
          <h1 class="app-page-title !text-[clamp(2rem,3vw,2.85rem)]">Napkin</h1>
          <p v-if="!compactHeroMode" class="app-page-description max-w-2xl text-sm">
            Drop raw ideas, voice notes, and half-formed tasks. PlanCraft classifies them, routes them, and pushes
            eligible actions into your inbox automatically.
          </p>
          <div v-if="!compactHeroMode" class="flex flex-wrap gap-2 text-xs text-slate-300/80">
            <span class="rounded-full border border-white/10 bg-slate-950/30 px-3 py-1">Quick add</span>
            <span class="rounded-full border border-white/10 bg-slate-950/30 px-3 py-1">Voice-ready</span>
            <span class="rounded-full border border-white/10 bg-slate-950/30 px-3 py-1">Auto-tagged</span>
          </div>
          <div v-if="compactHeroMode" class="flex flex-wrap gap-2 text-xs text-slate-200/90">
            <span class="rounded-full border border-white/10 bg-slate-950/35 px-3 py-1">Captured {{ items.length }}</span>
            <span class="rounded-full border border-white/10 bg-slate-950/35 px-3 py-1">Converted {{ convertedCount }}</span>
            <span class="rounded-full border border-white/10 bg-slate-950/35 px-3 py-1">Voice {{ voiceCount }}</span>
          </div>
        </div>
        <div v-if="!compactHeroMode" class="app-page-kpis ml-auto grid w-full grid-cols-2 text-center sm:grid-cols-3 lg:w-auto">
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
        <div class="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <p class="app-page-eyebrow !tracking-[0.25em]">Quick Add</p>
            <h2 class="text-xl font-semibold">Fast capture with AI routing</h2>
          </div>
          <div class="flex flex-wrap gap-2">
            <span v-if="classification" class="chip">
              {{
                classification.intent === 'planner'
                  ? 'Planner suggested'
                  : classification.intent === 'creator'
                  ? 'Creator suggested'
                  : classification.intent === 'leader'
                  ? 'Leader suggested'
                  : 'Stay on Napkin'
              }}
            </span>
            <span v-if="classification" class="chip">Tag: {{ classification.category }}</span>
          </div>
        </div>

        <div class="grid gap-4">
          <div class="min-w-0 space-y-3">
            <textarea
              v-model="input"
              rows="4"
              class="w-full rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3 text-sm transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30"
              placeholder="Type or paste anything: ideas, reminders, voice transcripts, screenshots (link), or messy notes..."
            ></textarea>

            <div class="flex flex-col gap-3 sm:flex-row">
              <button
                class="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-indigo-500 px-4 py-2.5 text-sm font-semibold transition hover:from-fuchsia-400 hover:to-indigo-400 disabled:opacity-50"
                :disabled="saving || (!input.trim() && !voiceTranscript)"
                @click="saveNapkin"
              >
                <span v-if="saving" class="loader-dot" aria-hidden="true"></span>
                <span>{{ saving ? 'Submitting…' : 'Submit note' }}</span>
              </button>
              <button
                class="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-slate-950/30 px-4 py-2.5 text-sm transition hover:border-indigo-400"
                :class="{ 'animate-pulse-soft': recordingState === 'recording' }"
                @click="toggleRecording"
              >
                <span v-if="recordingState === 'recording'">Stop</span>
                <span v-else-if="recordingState === 'processing'">Processing</span>
                <span v-else>Voice capture</span>
                <span v-if="recordingState === 'recording'" class="recording-dot" aria-hidden="true"></span>
                <span v-if="recordingState !== 'idle'" class="text-xs text-slate-400">{{ formattedTimer }}</span>
              </button>
              <button
                v-if="audioPreviewUrl || voiceTranscript"
                class="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-slate-950/30 px-3 py-2 text-sm hover:border-rose-400"
                @click="resetVoice"
              >
                Clear voice
              </button>
            </div>

            <div v-if="audioPreviewUrl || voiceTranscript" class="voice-preview">
              <div class="flex items-center justify-between gap-2">
                <p class="text-sm font-semibold text-slate-200">Voice capture</p>
              </div>
              <div class="space-y-2">
                <audio v-if="audioPreviewUrl" :src="audioPreviewUrl" controls class="w-full" />
                <p
                  v-if="voiceTranscript"
                  class="rounded-xl border border-white/10 bg-slate-950/30 px-3 py-2 text-sm text-slate-300"
                >
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
        </div>
      </section>

      <section class="space-y-3">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p class="app-page-eyebrow !tracking-[0.25em]">Stream</p>
            <h3 class="text-lg font-semibold">Your Napkin</h3>
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="f in filters"
              :key="f.value"
              type="button"
              @click="filter = f.value"
              :class="[
                'rounded-full border px-3 py-1.5 text-sm transition',
                filter === f.value
                  ? 'border-indigo-300/70 bg-indigo-500/90 text-white'
                  : 'border-white/10 bg-slate-950/30 text-slate-300 hover:border-indigo-400/60',
              ]"
            >
              {{ f.label }}
            </button>
          </div>
        </div>

        <div class="napkin-stream-toolbar">
          <div class="napkin-search-box">
            <input
              v-model="searchTerm"
              type="search"
              class="napkin-search-input"
              placeholder="Search note text, transcript, tags, or category"
            />
            <button
              v-if="searchTerm"
              type="button"
              class="napkin-search-clear"
              @click="searchTerm = ''"
            >
              Clear
            </button>
          </div>
          <p class="napkin-stream-summary">
            Showing {{ filteredItems.length }} of {{ items.length }} notes
            <span v-if="searchTerm.trim()"> for "{{ searchTerm.trim() }}"</span>
          </p>
        </div>

        <div
          v-if="napkinError"
          class="rounded-xl border border-rose-700/40 bg-rose-900/40 px-3 py-2 text-sm text-rose-200"
        >
          {{ napkinError }}
        </div>

        <div v-if="loading" class="space-y-2">
          <div
            v-for="n in 4"
            :key="n"
            class="h-32 rounded-2xl border border-slate-800 bg-slate-900/60 animate-pulse"
          />
        </div>
        <div v-else-if="filteredItems.length === 0" class="app-page-empty text-sm">
          {{
            searchTerm.trim()
              ? `No notes match "${searchTerm.trim()}". Try a different keyword.`
              : 'Nothing on the Napkin yet. Capture a note or voice memo to get started.'
          }}
        </div>
        <div v-else class="napkin-stream-layout">
          <div class="napkin-list-pane">
            <button
              v-for="item in filteredItems"
              :key="item.id"
              type="button"
              class="napkin-list-card"
              :class="{ 'napkin-list-card--active': selectedItem?.id === item.id }"
              @click="openDetail(item)"
            >
              <div class="flex min-w-0 items-start justify-between gap-3">
                <div class="min-w-0 flex-1 space-y-3">
                  <div class="flex min-w-0 flex-wrap items-center gap-2 text-[11px]">
                    <span class="pill">{{ item.type }}</span>
                    <span class="pill pill-ghost">{{ item.category }}</span>
                    <span v-if="item.status !== 'unsorted'" class="pill pill-ghost uppercase tracking-wide">
                      {{ item.status }}
                    </span>
                    <span v-if="item.audioUrl || item.source === 'voice'" class="pill pill-ghost">Voice</span>
                    <span class="text-slate-500">{{ formatDate(item.createdAt) }}</span>
                  </div>
                  <p class="napkin-card-preview">
                    {{ item.text }}
                  </p>
                </div>
                <span class="napkin-card-chevron" aria-hidden="true">Open</span>
              </div>

              <div class="flex items-center justify-between gap-3 text-xs text-slate-400">
                <div class="flex min-w-0 flex-wrap gap-2 overflow-hidden">
                  <span
                    v-for="tag in item.tags.slice(0, 2)"
                    :key="tag"
                    class="pill pill-ghost max-w-full"
                  >
                    #{{ tag }}
                  </span>
                </div>
                <span class="truncate text-right">{{ item.suggestion || routeSuggestion(item.intent) }}</span>
              </div>
            </button>

            <div v-if="hasMoreItems || loadingMore" class="napkin-list-footer">
              <button
                type="button"
                class="napkin-load-more-btn"
                :disabled="loadingMore"
                @click="loadMoreNapkin"
              >
                {{ loadingMore ? 'Loading older notes…' : 'Load older notes' }}
              </button>
            </div>
          </div>

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

    <el-dialog
      v-model="detailOpen"
      width="min(880px, calc(100vw - 2rem))"
      class="napkin-detail-dialog"
      :style="napkinDialogStyle"
      :close-on-click-modal="!savingEdit && !deleting"
      :close-on-press-escape="!savingEdit && !deleting"
      :show-close="true"
    >
      <template #header>
        <div class="min-w-0">
          <p class="text-xs font-semibold uppercase tracking-[0.28em] text-indigo-200/80">Full note</p>
          <h4 class="truncate text-xl font-semibold text-white">
            {{ selectedItem ? detailHeading(selectedItem) : 'Napkin detail' }}
          </h4>
          <p v-if="selectedItem" class="mt-1 text-sm text-slate-400">
            {{ formatDetailMeta(selectedItem) }}
          </p>
        </div>
      </template>
      <div v-if="selectedItem" class="napkin-detail-scroll">
        <div class="space-y-5">
          <div class="flex flex-wrap gap-2 text-xs text-slate-300">
            <span class="pill">{{ selectedItem.type }}</span>
            <span class="pill pill-ghost">{{ selectedItem.category }}</span>
            <span class="pill pill-ghost">{{ routeSuggestion(selectedItem.intent) }}</span>
            <span v-for="tag in selectedItem.tags" :key="tag" class="pill pill-ghost">#{{ tag }}</span>
          </div>
          <div v-if="isEditingSelected" class="space-y-3">
            <label class="block space-y-2">
              <span class="text-sm font-medium text-slate-200">Edit note</span>
              <textarea v-model="editDraft" rows="10" class="detail-textarea" placeholder="Update your note..."></textarea>
            </label>
            <div class="flex flex-col gap-2 sm:flex-row">
              <button type="button" class="detail-primary-btn" @click="saveEdit">
                {{ savingEdit ? 'Saving...' : 'Save changes' }}
              </button>
              <button type="button" class="detail-secondary-btn" @click="cancelEdit">Cancel</button>
            </div>
          </div>
          <div v-else class="space-y-4">
            <p class="napkin-detail-body">{{ selectedItem.text }}</p>
            <div
              v-if="selectedItem.transcript && selectedItem.transcript !== selectedItem.text"
              class="rounded-2xl border border-white/10 bg-slate-950/35 p-4"
            >
              <p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Transcript</p>
              <p class="napkin-detail-body mt-3 text-sm text-slate-300">{{ selectedItem.transcript }}</p>
            </div>
          </div>
          <div v-if="selectedItem.audioUrl" class="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
            <p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Voice attachment</p>
            <audio :src="selectedItem.audioUrl" controls class="mt-3 w-full rounded-lg border border-slate-800 bg-slate-950/60" />
          </div>
          <div class="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
            <p class="text-sm font-semibold text-white">Move this note</p>
            <p class="text-xs text-slate-400">Send it where you want to work on it next.</p>
            <div class="mt-4 flex flex-wrap gap-2">
              <button type="button" class="action-chip" @click="openPlanner(selectedItem)">Add to Planner</button>
              <button type="button" class="action-chip" @click="convertToCreator(selectedItem)">Send to Creator</button>
              <button type="button" class="action-chip" @click="convertToLeader(selectedItem)">Add Leader Event</button>
              <button type="button" class="action-chip" @click="keepNapkin(selectedItem)">Keep here</button>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <button v-if="selectedItem && !isEditingSelected" type="button" class="detail-action-btn" @click="beginEdit(selectedItem)">Edit</button>
          <button v-if="selectedItem && isEditingSelected" type="button" class="detail-action-btn" @click="cancelEdit">Cancel edit</button>
          <button v-if="selectedItem" type="button" class="detail-action-btn detail-action-btn--danger" @click="requestDelete(selectedItem)">Delete</button>
          <button type="button" class="detail-secondary-btn" @click="closeDetail">Close</button>
        </div>
      </template>
    </el-dialog>

    <el-dialog
      v-model="deleteDialogOpen"
      width="min(420px, calc(100vw - 2rem))"
      class="napkin-delete-dialog"
      :style="napkinDialogStyle"
      :close-on-click-modal="!deleting"
      :close-on-press-escape="!deleting"
      :show-close="!deleting"
    >
      <template #header>
        <div class="space-y-1">
          <p class="text-xs font-semibold uppercase tracking-[0.28em] text-rose-300/80">Delete note</p>
          <h3 class="text-lg font-semibold text-white">Remove this Napkin entry?</h3>
        </div>
      </template>

      <div class="space-y-4 text-sm text-slate-200">
        <p>This permanently deletes the note and its attachments from this workspace.</p>
        <p
          v-if="deleteCandidate"
          class="max-h-28 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-slate-300"
        >
          {{ deleteCandidate.text }}
        </p>
      </div>

      <template #footer>
        <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" class="detail-secondary-btn" :disabled="deleting" @click="closeDeleteDialog">
            Cancel
          </button>
          <button type="button" class="detail-danger-btn" :disabled="deleting" @click="confirmDelete">
            {{ deleting ? 'Deleting...' : 'Delete' }}
          </button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElNotification } from 'element-plus'
import TaskPlannerDialog from '@/components/TaskPlannerDialog.vue'
import api from '@/services/api'
import { detectActionInboxSuggestions } from '@/services/actionInboxService'
import { addTaskToFirebase, updateTaskInFirebase } from '@/services/firebaseService'
import {
  classifyNapkinText,
  createNapkinItem,
  deleteNapkinItem,
  fetchNapkinItemsPage,
  subscribeToNapkinItems,
  updateNapkinItem,
  type NapkinClassification,
  type NapkinIntent,
  type NapkinItem,
  type NapkinPageInfo,
} from '@/services/napkinService'
import { toLocalDateKey } from '@/utils/dateHelper'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { ensureAiConsentOrThrow } from '@/services/aiConsentService'

type RecorderState = 'idle' | 'recording' | 'processing'
type NapkinActionSource = 'typed' | 'voice'

const router = useRouter()
const workspaceStore = useWorkspaceStore()

const input = ref('')
const NAPKIN_PAGE_SIZE = 40
const voiceTranscript = ref('')
const recordingState = ref<RecorderState>('idle')
const recordingSeconds = ref(0)
const audioPreviewUrl = ref('')
const recordedBlob = ref<Blob | null>(null)
const classification = ref<NapkinClassification | null>(null)
const saving = ref(false)
const loading = ref(true)
const savingEdit = ref(false)
const deleting = ref(false)
const loadingMore = ref(false)
const napkinError = ref('')
const items = ref<NapkinItem[]>([])
const liveItems = ref<NapkinItem[]>([])
const olderItems = ref<NapkinItem[]>([])
const filter = ref('all')
const searchTerm = ref('')
const plannerOpen = ref(false)
const plannerTask = ref<any>(null)
const convertingFrom = ref<NapkinItem | null>(null)
const latestSavedId = ref<string | null>(null)
const selectedItemId = ref<string | null>(null)
const detailOpen = ref(false)
const editingItemId = ref<string | null>(null)
const editDraft = ref('')
const deleteCandidate = ref<NapkinItem | null>(null)
const napkinDialogStyle = Object.freeze({
  background: 'linear-gradient(145deg, #1e1b4b, #312e81, #4c1d95)',
  color: '#e2e8f0',
  borderRadius: '1.35rem',
  boxShadow: '0 24px 60px rgba(2, 6, 23, 0.42)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  backdropFilter: 'blur(12px)',
})

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
const nextWorkspaceCursor = ref<NapkinPageInfo['workspaceCursor']>(null)
const nextLegacyCursor = ref<NapkinPageInfo['legacyCursor']>(null)
const hasMoreWorkspace = ref(false)
const hasMoreLegacy = ref(false)

const filteredItems = computed(() => {
  let base = items.value

  if (filter.value === 'voice') {
    base = base.filter((i) => i.audioUrl || i.source === 'voice')
  } else if (filter.value !== 'all') {
    base = base.filter((i) => i.type === filter.value)
  }

  const term = searchTerm.value.trim().toLowerCase()
  if (!term) return base

  return base.filter((item) => {
    const searchable = [
      item.text,
      item.transcript,
      item.category,
      item.type,
      item.status,
      item.suggestion,
      routeSuggestion(item.intent),
      ...(Array.isArray(item.tags) ? item.tags : []),
    ]

    return searchable.some((value) => String(value || '').toLowerCase().includes(term))
  })
})

const selectedItem = computed(() => filteredItems.value.find((item) => item.id === selectedItemId.value) || null)
const isEditingSelected = computed(() => !!selectedItem.value && editingItemId.value === selectedItem.value.id)
const deleteDialogOpen = computed({
  get: () => !!deleteCandidate.value,
  set: (next) => {
    if (!next) closeDeleteDialog()
  },
})
const latestSaved = computed(() => items.value.find((i) => i.id === latestSavedId.value))
const convertedCount = computed(() => items.value.filter((i) => i.status === 'converted').length)
const voiceCount = computed(() => items.value.filter((i) => i.audioUrl || i.source === 'voice').length)
const hasMoreItems = computed(() => hasMoreWorkspace.value || hasMoreLegacy.value)
const compactHeroMode = computed(() => true)

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

function timezoneGuess() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

function routeSuggestion(intent: NapkinIntent) {
  if (intent === 'planner') return 'Planner suggested'
  if (intent === 'creator') return 'Creator suggested'
  if (intent === 'leader') return 'Leader suggested'
  return 'Stay on Napkin'
}

function detailHeading(item: NapkinItem) {
  if (item.type === 'task') return 'Task draft'
  if (item.type === 'idea') return 'Idea note'
  if (item.type === 'content') return 'Content note'
  if (item.type === 'reminder') return 'Reminder note'
  return 'Captured note'
}

function formatDetailMeta(item: NapkinItem) {
  const sourceLabel = item.audioUrl || item.source === 'voice' ? 'Voice note' : 'Typed note'
  return `${sourceLabel} · ${formatDate(item.createdAt)}`
}

function mergeLocalNapkinLists(...lists: NapkinItem[][]) {
  const merged = new Map<string, NapkinItem>()
  for (const list of lists) {
    for (const item of list || []) {
      const key = `${item.workspaceId || 'legacy'}:${item.id}`
      if (!merged.has(key)) merged.set(key, item)
      else merged.set(key, { ...merged.get(key), ...item })
    }
  }
  return Array.from(merged.values()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
}

function syncMergedItems() {
  items.value = mergeLocalNapkinLists(liveItems.value, olderItems.value)
}

function resetPaginationState() {
  liveItems.value = []
  olderItems.value = []
  items.value = []
  nextWorkspaceCursor.value = null
  nextLegacyCursor.value = null
  hasMoreWorkspace.value = false
  hasMoreLegacy.value = false
  loadingMore.value = false
}

function applyPageInfo(pageInfo?: NapkinPageInfo | null) {
  if (!pageInfo) return
  nextWorkspaceCursor.value = pageInfo.workspaceCursor
  nextLegacyCursor.value = pageInfo.legacyCursor
  hasMoreWorkspace.value = pageInfo.hasMoreWorkspace
  hasMoreLegacy.value = pageInfo.hasMoreLegacy
}

function patchLocalItem(itemId: string, updater: (item: NapkinItem) => NapkinItem) {
  liveItems.value = liveItems.value.map((entry) => (entry.id === itemId ? updater(entry) : entry))
  olderItems.value = olderItems.value.map((entry) => (entry.id === itemId ? updater(entry) : entry))
  syncMergedItems()
}

function removeLocalItem(itemId: string) {
  liveItems.value = liveItems.value.filter((entry) => entry.id !== itemId)
  olderItems.value = olderItems.value.filter((entry) => entry.id !== itemId)
  syncMergedItems()
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

async function detectNapkinActions(
  text: string,
  {
    workspaceId = workspaceStore.activeWorkspaceId,
    sourceRefId = null,
    sourceKind = 'typed',
  }: { workspaceId?: string | null; sourceRefId?: string | null; sourceKind?: NapkinActionSource } = {},
) {
  const rawText = String(text || '').trim()
  if (!rawText || !workspaceId) return []

  const sourceType = sourceKind === 'voice' ? 'napkin_voice_note' : 'napkin_note'
  const sourceLabel = sourceKind === 'voice' ? 'napkin voice note' : 'napkin note'
  const suggestions = await detectActionInboxSuggestions({
    text: rawText,
    workspaceId,
    sourceType,
    sourceLabel,
    sourceRefId,
    timezone: timezoneGuess(),
    now: new Date().toISOString(),
    maxItems: 6,
  })

  if (suggestions.length && typeof window !== 'undefined') {
    try {
      window.dispatchEvent(
        new CustomEvent('action-inbox-updated', {
          detail: { workspaceId, trigger: 'napkin_capture', suggestionCount: suggestions.length },
        }),
      )
    } catch {}
  }

  return suggestions
}

async function saveNapkin() {
  const text = input.value.trim() || voiceTranscript.value.trim()
  if (!text) {
    ElMessage.warning('Drop a thought first')
    return
  }
  saving.value = true
  try {
    const sourceKind: NapkinActionSource = recordedBlob.value ? 'voice' : 'typed'
    const transcript = voiceTranscript.value
    const audioBlob = recordedBlob.value
    const cls = await classifyNapkinText(text)
    classification.value = cls
    const saved = await createNapkinItem({
      text,
      source: sourceKind,
      transcript,
      audioBlob,
      audioType: audioBlob?.type,
      classification: cls,
      metadata: { length: text.length },
    })
    latestSavedId.value = saved.id
    selectedItemId.value = saved.id
    input.value = ''
    voiceTranscript.value = ''
    resetVoice()
    let detectedCount = 0
    try {
      const detected = await detectNapkinActions(text, {
        workspaceId: saved.workspaceId || workspaceStore.activeWorkspaceId,
        sourceRefId: saved.id,
        sourceKind,
      })
      detectedCount = detected.length
    } catch (detectErr: any) {
      console.warn('[napkin] action detection after save failed', detectErr?.message || detectErr)
    }
    ElNotification({
      title: detectedCount ? 'Inbox updated' : 'Saved',
      message: detectedCount
        ? `Saved your note and added ${detectedCount} eligible task${detectedCount === 1 ? '' : 's'} to your inbox. Click to open.`
        : 'Captured on your Napkin',
      type: 'success',
      onClick: detectedCount ? () => router.push('/inbox') : undefined,
    })
  } catch (err: any) {
    console.error(err)
    ElMessage.error(err?.message || 'Failed to save')
  } finally {
    saving.value = false
  }
}

function openDetail(item: NapkinItem) {
  selectedItemId.value = item.id
  detailOpen.value = true
}

function closeDetail() {
  detailOpen.value = false
  cancelEdit()
}

function beginEdit(item: NapkinItem) {
  selectedItemId.value = item.id
  editDraft.value = item.text
  editingItemId.value = item.id
  detailOpen.value = true
}

function cancelEdit() {
  editingItemId.value = null
  editDraft.value = ''
}

async function saveEdit() {
  const item = selectedItem.value
  const nextText = editDraft.value.trim()
  if (!item || editingItemId.value !== item.id) return
  if (!nextText) {
    ElMessage.warning('Note cannot be empty')
    return
  }
  savingEdit.value = true
  try {
    const nextMetadata = { ...(item.metadata || {}), length: nextText.length }
    await updateNapkinItem(
      item.id,
      {
        text: nextText,
        metadata: nextMetadata,
      },
      item.workspaceId,
    )
    patchLocalItem(item.id, (entry) => ({
      ...entry,
      text: nextText,
      metadata: nextMetadata,
    }))
    try {
      await detectNapkinActions(nextText, {
        workspaceId: item.workspaceId || workspaceStore.activeWorkspaceId,
        sourceRefId: item.id,
        sourceKind: item.audioUrl || item.source === 'voice' ? 'voice' : 'typed',
      })
    } catch (detectErr: any) {
      console.warn('[napkin] action detection after edit failed', detectErr?.message || detectErr)
    }
    cancelEdit()
    ElMessage.success('Note updated')
  } catch (err: any) {
    ElMessage.error(err?.message || 'Failed to save changes')
  } finally {
    savingEdit.value = false
  }
}

function openPlanner(item: NapkinItem) {
  detailOpen.value = false
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
      await updateNapkinItem(
        convertingFrom.value.id,
        {
          status: 'converted',
          intent: 'planner',
          linkedTaskId: linkedId,
        },
        convertingFrom.value.workspaceId,
      )
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

function requestDelete(item: NapkinItem | null) {
  if (!item) return
  deleteCandidate.value = item
}

function closeDeleteDialog() {
  if (deleting.value) return
  deleteCandidate.value = null
}

async function confirmDelete() {
  const item = deleteCandidate.value
  if (!item) return
  deleting.value = true
  try {
    await deleteNapkinItem(item.id, item.workspaceId)
    removeLocalItem(item.id)
    detailOpen.value = false
    if (selectedItemId.value === item.id) {
      selectedItemId.value = null
    }
    cancelEdit()
    deleteCandidate.value = null
    ElMessage.success('Deleted from Napkin')
  } catch (err: any) {
    ElMessage.error(err?.message || 'Delete failed')
  } finally {
    deleting.value = false
  }
}

function subscribe() {
  loading.value = true
  napkinError.value = ''
  resetPaginationState()
  try {
    unsubscribe = subscribeToNapkinItems(
      (list, pageInfo) => {
        liveItems.value = list
        if (!olderItems.value.length) {
          applyPageInfo(pageInfo)
        }
        syncMergedItems()
        loading.value = false
        napkinError.value = ''
      },
      {
        pageSize: NAPKIN_PAGE_SIZE,
        onError: () => {
          if (!items.value.length) {
            napkinError.value = 'Napkin feed is unavailable right now. Showing the last saved items if possible.'
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

async function loadMoreNapkin() {
  if (loadingMore.value || !hasMoreItems.value) return
  loadingMore.value = true
  try {
    const page = await fetchNapkinItemsPage({
      workspaceId: workspaceStore.activeWorkspaceId,
      pageSize: NAPKIN_PAGE_SIZE,
      workspaceCursor: nextWorkspaceCursor.value,
      legacyCursor: nextLegacyCursor.value,
    })
    olderItems.value = mergeLocalNapkinLists(olderItems.value, page.items)
    applyPageInfo(page.pageInfo)
    syncMergedItems()
  } catch (err: any) {
    console.warn('[napkin] load more failed', err?.message || err)
    ElMessage.error(err?.message || 'Unable to load older notes')
  } finally {
    loadingMore.value = false
  }
}

watch(
  filteredItems,
  (list) => {
    if (!list.length) {
      selectedItemId.value = null
      detailOpen.value = false
      cancelEdit()
      return
    }
    const hasSelected = !!selectedItemId.value && list.some((item) => item.id === selectedItemId.value)
    if (!hasSelected) {
      selectedItemId.value = null
      cancelEdit()
      detailOpen.value = false
    }
  },
  { immediate: true },
)

onMounted(() => {
  subscribe()
})

watch(
  () => workspaceStore.activeWorkspaceId,
  (next, prev) => {
    if (next === prev) return
    if (unsubscribe) unsubscribe()
    subscribe()
  },
)

onBeforeUnmount(() => {
  if (unsubscribe) unsubscribe()
  resetVoice()
})
</script>

<style scoped>
.napkin-page {
  overflow-x: hidden;
}

.napkin-list-footer {
  display: flex;
  justify-content: center;
  padding-top: 0.75rem;
}

.napkin-load-more-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 13rem;
  padding: 0.8rem 1.15rem;
  border-radius: 999px;
  border: 1px solid rgba(129, 140, 248, 0.35);
  background: rgba(15, 23, 42, 0.72);
  color: #e2e8f0;
  font-size: 0.92rem;
  font-weight: 600;
  transition: border-color 0.2s ease, transform 0.2s ease, background 0.2s ease;
}

.napkin-load-more-btn:hover:not(:disabled) {
  border-color: rgba(129, 140, 248, 0.6);
  background: rgba(49, 46, 129, 0.55);
  transform: translateY(-1px);
}

.napkin-load-more-btn:disabled {
  cursor: wait;
  opacity: 0.7;
}

.napkin-stream-toolbar {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.napkin-search-box {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
  border-radius: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(15, 23, 42, 0.56);
  padding: 0.45rem 0.55rem 0.45rem 0.9rem;
}

.napkin-search-input {
  width: 100%;
  min-width: 0;
  border: 0;
  background: transparent;
  color: #f8fafc;
  font-size: 0.95rem;
  outline: none;
}

.napkin-search-input::placeholder {
  color: rgba(148, 163, 184, 0.78);
}

.napkin-search-clear {
  flex-shrink: 0;
  border-radius: 999px;
  border: 1px solid rgba(129, 140, 248, 0.35);
  background: rgba(67, 56, 202, 0.2);
  padding: 0.45rem 0.85rem;
  color: #e0e7ff;
  font-size: 0.82rem;
  font-weight: 600;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.napkin-search-clear:hover {
  border-color: rgba(129, 140, 248, 0.65);
  background: rgba(79, 70, 229, 0.28);
}

.napkin-stream-summary {
  margin: 0;
  color: rgba(148, 163, 184, 0.9);
  font-size: 0.84rem;
}

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
  font-size: 1.4rem;
  font-weight: 700;
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
  width: 100%;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
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
  max-width: 100%;
  align-items: center;
  gap: 0.35rem;
  padding: 0.2rem 0.65rem;
  border-radius: 999px;
  background: rgba(99, 102, 241, 0.15);
  border: 1px solid rgba(129, 140, 248, 0.4);
  text-transform: capitalize;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pill-ghost {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.1);
}

.action-chip {
  padding: 0.6rem 0.95rem;
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

.napkin-stream-layout {
  display: block;
  min-width: 0;
}

.napkin-list-pane {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 0.85rem;
}

.napkin-list-card {
  display: flex;
  width: 100%;
  min-width: 0;
  min-height: 140px;
  max-height: 140px;
  flex-direction: column;
  justify-content: space-between;
  gap: 0.75rem;
  overflow: hidden;
  border-radius: 1.4rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(2, 6, 23, 0.44);
  padding: 1rem;
  text-align: left;
  box-shadow: 0 18px 32px rgba(15, 23, 42, 0.18);
  transition: border-color 0.2s ease, transform 0.18s ease, background 0.18s ease;
}

.napkin-list-card:hover {
  border-color: rgba(129, 140, 248, 0.55);
  background: rgba(15, 23, 42, 0.6);
  transform: translateY(-1px);
}

.napkin-list-card--active {
  border-color: rgba(129, 140, 248, 0.8);
  background: linear-gradient(180deg, rgba(49, 46, 129, 0.3), rgba(15, 23, 42, 0.72));
}

.napkin-card-preview {
  overflow: hidden;
  color: #f8fafc;
  font-size: 0.95rem;
  line-height: 1.5;
  text-wrap: pretty;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.napkin-card-chevron {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
  padding: 0.35rem 0.65rem;
  font-size: 0.72rem;
  font-weight: 600;
  color: #cbd5f5;
}

.napkin-detail-card {
  display: flex;
  width: 100%;
  min-width: 0;
  height: 100%;
  flex-direction: column;
  overflow: hidden;
  background: rgba(2, 6, 23, 0.96);
  box-shadow: 0 24px 60px rgba(2, 6, 23, 0.42);
}

.napkin-detail-toolbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding: 1rem;
}

.napkin-detail-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  -webkit-overflow-scrolling: touch;
}

.napkin-detail-empty {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
  color: #94a3b8;
}

.napkin-detail-body {
  color: #f8fafc;
  font-size: 0.98rem;
  line-height: 1.72;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.detail-textarea {
  width: 100%;
  min-height: 240px;
  resize: vertical;
  border-radius: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(15, 23, 42, 0.82);
  padding: 1rem;
  color: #f8fafc;
  line-height: 1.65;
  outline: none;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.detail-textarea:focus {
  border-color: rgba(129, 140, 248, 0.72);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.16);
}

.detail-action-btn,
.detail-primary-btn,
.detail-secondary-btn,
.detail-danger-btn,
.detail-close-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.95rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  padding: 0.7rem 0.95rem;
  font-size: 0.9rem;
  font-weight: 600;
  transition: background 0.2s ease, border-color 0.2s ease;
}

.detail-action-btn,
.detail-secondary-btn,
.detail-close-btn {
  background: rgba(255, 255, 255, 0.04);
  color: #e2e8f0;
}

.detail-action-btn:hover,
.detail-secondary-btn:hover,
.detail-close-btn:hover {
  border-color: rgba(129, 140, 248, 0.55);
  background: rgba(129, 140, 248, 0.12);
}

.detail-action-btn--danger,
.detail-danger-btn {
  border-color: rgba(251, 113, 133, 0.4);
  background: rgba(159, 18, 57, 0.18);
  color: #fecdd3;
}

.detail-action-btn--danger:hover,
.detail-danger-btn:hover {
  border-color: rgba(251, 113, 133, 0.7);
  background: rgba(190, 24, 93, 0.24);
}

.detail-primary-btn {
  background: linear-gradient(135deg, #ec4899, #6366f1);
  color: white;
  border-color: transparent;
}

.detail-primary-btn:hover {
  filter: brightness(1.06);
}

.napkin-delete-dialog :deep(.el-dialog) {
  border-radius: 1.35rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: #0f172a;
  box-shadow: 0 24px 60px rgba(2, 6, 23, 0.42);
}

.napkin-delete-dialog :deep(.el-dialog__body) {
  padding-top: 0.5rem;
}

.napkin-detail-dialog :deep(.el-dialog) {
  overflow: hidden;
}

.napkin-detail-dialog :deep(.el-dialog__body) {
  padding-top: 0.25rem;
}

.napkin-detail-dialog :deep(.el-dialog__header) {
  color: #e2e8f0;
}

.napkin-detail-dialog :deep(.el-dialog__title) {
  color: #e2e8f0;
}

.napkin-detail-dialog :deep(.el-dialog__headerbtn .el-dialog__close) {
  color: rgba(226, 232, 240, 0.8);
}

.napkin-detail-dialog :deep(.el-dialog__headerbtn:hover .el-dialog__close) {
  color: #ffffff;
}

.napkin-detail-dialog :deep(.el-dialog__footer) {
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

@media (min-width: 768px) {
  .napkin-stream-toolbar {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }

  .napkin-search-box {
    flex: 1 1 auto;
    max-width: 32rem;
  }

  .napkin-detail-card {
    min-height: 580px;
    max-height: calc(100dvh - 8rem);
    border-radius: 1.6rem;
    border: 1px solid rgba(255, 255, 255, 0.08);
  }
}

@media (max-width: 767px) {
  .napkin-list-card {
    border-radius: 1.15rem;
  }

  .napkin-detail-card {
    border-radius: 0;
  }

  .napkin-detail-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .napkin-detail-toolbar > div:last-child {
    width: 100%;
    justify-content: flex-end;
    flex-wrap: wrap;
  }
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
