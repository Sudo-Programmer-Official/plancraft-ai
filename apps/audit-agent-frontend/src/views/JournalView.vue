<template>
  <div class="min-h-screen bg-gradient-to-br from-[#0b1220] via-[#0f172a] to-[#0b1020] text-slate-100">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <header class="text-center space-y-3 animate-fade-in">
        <p class="text-xs uppercase tracking-[0.35em] text-indigo-300/80">Journal</p>
        <h1 class="text-3xl sm:text-4xl font-semibold">How are you feeling today, {{ userName }}?</h1>
        <p class="text-sm text-slate-300">A gentle place to breathe, reflect, and grow.</p>
      </header>

      <!-- AI insights -->
      <section
        class="rounded-2xl border border-indigo-500/30 bg-indigo-900/20 backdrop-blur-md shadow-lg p-4 sm:p-5 flex flex-wrap gap-3 items-center justify-between animate-slide-up"
      >
        <div class="flex items-center gap-2">
          <span class="text-lg">✨</span>
          <div>
            <p class="text-sm text-indigo-200">AI summary of your recent journaling</p>
            <p class="text-base font-semibold text-indigo-100">{{ insights[0] }}</p>
          </div>
        </div>
        <div class="flex flex-wrap gap-2 text-sm text-indigo-200">
          <span v-for="(insight, idx) in insights.slice(1, 3)" :key="idx" class="px-3 py-1 rounded-full bg-white/10 border border-white/10">
            {{ insight }}
          </span>
        </div>
      </section>

      <!-- Mood selector -->
      <section class="rounded-2xl bg-white/5 border border-white/10 p-5 shadow-lg animate-slide-up">
        <div class="flex items-center justify-between mb-4">
          <div>
            <p class="text-xs uppercase tracking-[0.25em] text-indigo-300/80">Mood</p>
            <h2 class="text-xl font-semibold">How's your energy?</h2>
          </div>
          <span v-if="selectedMood" class="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-100 text-sm flex items-center gap-2">
            <span class="text-lg">{{ selectedMood.emoji }}</span>
            {{ selectedMood.label }}
          </span>
        </div>
        <div class="flex flex-wrap gap-3">
          <button
            v-for="mood in moodOptions"
            :key="mood.label"
            type="button"
            class="mood-pill"
            :class="[
              mood.class,
              selectedMood?.label === mood.label ? 'ring-2 ring-indigo-300 scale-105' : 'opacity-90 hover:opacity-100'
            ]"
            @click="selectMood(mood)"
          >
            <span class="text-xl">{{ mood.emoji }}</span>
            <span class="text-sm font-semibold">{{ mood.label }}</span>
          </button>
        </div>
      </section>

      <!-- Write + Voice split -->
      <section class="grid gap-5 md:grid-cols-2 animate-slide-up">
        <div class="rounded-2xl bg-white/8 border border-white/10 p-5 shadow-lg space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs uppercase tracking-[0.25em] text-indigo-300/80">Write</p>
              <h3 class="text-lg font-semibold">Write your reflection</h3>
            </div>
            <div class="flex gap-2 text-xs text-indigo-200">
              <span class="px-2 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30">Tags</span>
              <span class="px-2 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30">Private</span>
            </div>
          </div>

          <textarea
            v-model="entryText"
            placeholder="Write freely… no rules here."
            rows="6"
            class="w-full rounded-2xl bg-slate-900/60 border border-white/10 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none shadow-inner"
          ></textarea>

          <div class="flex flex-wrap gap-2 text-xs">
            <button
              v-for="tag in tagSuggestions"
              :key="tag"
              type="button"
              class="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-indigo-100 hover:border-indigo-300/60 transition"
              @click="appendTag(tag)"
            >
              #{{ tag }}
            </button>
          </div>

          <div class="flex flex-wrap gap-3 items-center">
            <button
              class="px-5 py-2 rounded-lg bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-sm font-semibold hover:from-indigo-600 hover:to-pink-600 transition disabled:opacity-60"
              :disabled="!entryText.trim()"
              @click="saveEntry"
            >
              Save entry
            </button>
            <p v-if="enhancedText" class="text-xs text-indigo-200">✨ Polished: {{ enhancedText }}</p>
          </div>
        </div>

        <div class="rounded-2xl bg-white/6 border border-white/10 p-5 shadow-lg space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs uppercase tracking-[0.25em] text-indigo-300/80">Voice</p>
              <h3 class="text-lg font-semibold">Voice journal</h3>
            </div>
            <span class="px-2 py-1 rounded-full bg-cyan-500/15 border border-cyan-400/40 text-xs text-cyan-100">Live</span>
          </div>
          <VoiceRecorder @transcribed="handleTranscript" />
          <div
            v-if="voiceTranscript || pendingAudio"
            class="rounded-xl bg-slate-900/60 border border-white/10 p-3 text-sm space-y-2"
          >
            <div class="flex items-center justify-between">
              <p class="text-xs text-indigo-200">Transcript</p>
              <span v-if="pendingAudio" class="text-[11px] px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-400/30 text-emerald-100">
                Voice clip attached
              </span>
            </div>
            <p class="text-slate-100 whitespace-pre-line">{{ voiceTranscript }}</p>
            <div class="mt-2 flex gap-2">
              <button
                class="px-3 py-1 rounded-full text-xs bg-indigo-500/20 border border-indigo-400/40"
                @click="entryText = voiceTranscript"
              >
                Use as entry
              </button>
              <button class="px-3 py-1 rounded-full text-xs bg-white/10 border border-white/10" @click="clearVoiceCapture">
                Clear
              </button>
            </div>
          </div>

          <div class="mt-4 rounded-xl bg-slate-900/50 border border-indigo-400/20 p-4 space-y-3">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-xs uppercase tracking-[0.25em] text-indigo-300/80">Scan</p>
                <h3 class="text-base font-semibold">Scan a page or scribble</h3>
              </div>
              <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onFileChange" />
              <button
                class="px-3 py-2 rounded-lg bg-indigo-500 text-sm font-semibold hover:bg-indigo-600 disabled:opacity-60"
                :disabled="captureLoading"
                @click="() => fileInput?.click()"
              >
                {{ captureLoading ? 'Processing…' : 'Scan page' }}
              </button>
            </div>
            <p v-if="captureImageName" class="text-xs text-indigo-200">Image: {{ captureImageName }}</p>
            <p v-if="captureError" class="text-xs text-rose-300">{{ captureError }}</p>

            <div v-if="captureItems.length" class="space-y-2">
              <p class="text-xs text-indigo-200">Detected items (edit before creating tasks):</p>
              <div
                v-for="(item, idx) in captureItems"
                :key="idx"
                class="rounded-lg border border-white/10 bg-slate-900/60 p-3 space-y-2"
              >
                <div class="flex items-center gap-2">
                  <input type="checkbox" v-model="item.include" class="rounded text-indigo-500" />
                  <input
                    v-model="item.title"
                    class="flex-1 rounded bg-slate-800 border border-white/10 px-2 py-1 text-sm"
                    :placeholder="item.type === 'event' ? 'Event title' : 'Task title'"
                  />
                  <span
                    class="text-[11px] px-2 py-1 rounded-full border"
                    :class="item.type === 'event' ? 'border-emerald-300/40 text-emerald-200' : 'border-indigo-300/40 text-indigo-200'"
                  >
                    {{ item.type }}
                  </span>
                </div>
                <textarea
                  v-model="item.description"
                  rows="2"
                  class="w-full rounded bg-slate-800 border border-white/10 px-2 py-1 text-sm"
                  placeholder="Details or context"
                ></textarea>
              </div>
              <div class="flex justify-end">
                <button
                  class="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-emerald-500 text-sm font-semibold hover:from-indigo-600 hover:to-emerald-600 disabled:opacity-60"
                  :disabled="captureLoading || !captureItems.some((i) => i.include && i.title)"
                  @click="commitCapture"
                >
                  Create {{ captureItems.filter((i) => i.include).length }} items
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Timeline & Trends -->
      <section class="grid gap-5 lg:grid-cols-[2fr_1fr] animate-slide-up">
        <div class="rounded-2xl bg-white/6 border border-white/10 p-5 shadow-lg">
          <div class="flex items-center justify-between mb-3">
            <div>
              <p class="text-xs uppercase tracking-[0.25em] text-indigo-300/80">Timeline</p>
              <h3 class="text-lg font-semibold">Your reflection timeline</h3>
            </div>
            <span class="text-xs text-indigo-200">({{ filteredLogs.length }})</span>
          </div>
          <div class="flex flex-wrap items-center gap-2 text-xs text-indigo-100 mb-3">
            <button
              class="px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/40 hover:bg-indigo-500/30 transition disabled:opacity-60"
              :disabled="!filteredLogs.length || isLoadingTrack"
              @click="togglePlayAll"
            >
              {{ isPlaying ? 'Pause' : 'Play all' }}
            </button>
            <button
              class="px-3 py-1 rounded-full bg-white/10 border border-white/10 hover:bg-white/20 transition disabled:opacity-50"
              :disabled="!canSkipPrev || isLoadingTrack"
              @click="playPrevious"
            >
              ⏮ Prev
            </button>
            <button
              class="px-3 py-1 rounded-full bg-white/10 border border-white/10 hover:bg-white/20 transition disabled:opacity-50"
              :disabled="!canSkipNext || isLoadingTrack"
              @click="playNext"
            >
              Next ⏭
            </button>
            <button
              class="px-3 py-1 rounded-full bg-white/10 border border-white/10 hover:bg-white/20 transition"
              @click="toggleOrder"
            >
              {{ playbackOrderLabel }}
            </button>
            <span v-if="nowPlayingEntry" class="text-[11px] text-indigo-200 truncate flex-1 min-w-0">
              Now playing: {{ nowPlayingEntry.summary || nowPlayingEntry.text?.slice(0, 80) }}
            </span>
            <span v-if="playbackError" class="text-[11px] text-rose-300">{{ playbackError }}</span>
          </div>
          <div class="space-y-3 max-h-[480px] overflow-y-auto pr-1 scrollbar-plan">
            <div
              v-for="log in filteredLogs"
              :key="log.id"
              class="rounded-xl border border-white/10 bg-slate-900/50 p-4 hover:border-indigo-400/60 transition shadow-sm relative"
            >
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2">
                  <span class="text-lg">{{ log.mood?.emoji || '🌿' }}</span>
                  <div>
                    <p class="text-sm font-semibold text-slate-100">{{ log.summary }}</p>
                    <p class="text-[11px] text-indigo-200">{{ log.mood?.label || 'Mood' }}</p>
                  </div>
                </div>
                <span class="text-xs text-indigo-200">
                  {{ formatDate(log.timestamp) }}
                </span>
              </div>
              <p class="text-sm text-slate-200 line-clamp-3">{{ log.text }}</p>
              <div class="mt-3 flex gap-2 text-[11px] text-indigo-200 flex-wrap">
                <span class="px-2 py-1 rounded-full bg-white/5 border border-white/10" v-for="tag in log.tags || []" :key="tag">
                  #{{ tag }}
                </span>
              </div>
              <div class="mt-2 flex items-center gap-2 text-[11px] text-indigo-200">
                <button
                  class="px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-400/40 hover:bg-indigo-500/25 transition text-xs"
                  :disabled="isLoadingTrack"
                  @click="toggleEntryPlayback(log)"
                >
                  <span v-if="isEntryPlaying(log)">⏸ Pause</span>
                  <span v-else>▶ Play</span>
                </button>
                <span
                  class="px-2 py-1 rounded-full border"
                  :class="log.audioUrl ? 'border-emerald-300/50 text-emerald-200' : 'border-indigo-300/50 text-indigo-200'"
                >
                  {{ log.audioUrl ? 'Voice' : 'TTS on play' }}
                </span>
                <span v-if="isEntryPlaying(log)" class="text-emerald-300">Now playing</span>
                <button class="ml-auto text-indigo-300 hover:text-white text-xs" @click="openEntry(log)">View full</button>
              </div>
            </div>
          </div>
        </div>

        <div class="space-y-4">
          <div class="rounded-2xl bg-white/6 border border-white/10 p-4 shadow-lg">
            <p class="text-xs uppercase tracking-[0.25em] text-indigo-300/80">Streak</p>
            <div class="flex items-center justify-between mt-2">
              <div>
                <h4 class="text-xl font-semibold">{{ streak }}-day streak</h4>
                <p class="text-sm text-indigo-200">Longest: {{ longestStreak }} days</p>
              </div>
              <span class="text-3xl">🔥</span>
            </div>
            <div class="mt-3 h-2 rounded-full bg-slate-800 overflow-hidden">
              <div class="h-full bg-gradient-to-r from-emerald-400 via-indigo-400 to-pink-400" :style="{ width: streakBarWidth }"></div>
            </div>
          </div>

          <div class="rounded-2xl bg-white/6 border border-white/10 p-4 shadow-lg">
            <p class="text-xs uppercase tracking-[0.25em] text-indigo-300/80">Emotion trend</p>
            <div class="mt-2">
              <svg viewBox="0 0 240 80" class="w-full h-24">
                <polyline
                  :points="sparkPoints"
                  fill="none"
                  stroke="url(#grad)"
                  stroke-width="3"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <defs>
                  <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stop-color="#a5b4fc" />
                    <stop offset="100%" stop-color="#34d399" />
                  </linearGradient>
                </defs>
              </svg>
              <p class="text-xs text-indigo-200 mt-1">Higher means lighter moods. Based on your last {{ Math.min(trendValues.length, 10) }} entries.</p>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- Entry drawer -->
    <el-drawer v-model="drawerOpen" size="420px" title="Journal entry" class="journal-drawer">
      <div v-if="activeEntry" class="space-y-3 text-slate-100">
        <div class="flex items-center gap-2 text-sm text-indigo-200">
          <span class="text-xl">{{ activeEntry.mood?.emoji || '🌿' }}</span>
          <span>{{ activeEntry.mood?.label || 'Mood' }}</span>
          <span class="text-xs text-slate-400 ml-auto">{{ formatDate(activeEntry.timestamp) }}</span>
        </div>
        <p class="text-sm text-slate-300 whitespace-pre-line">{{ activeEntry.text }}</p>
        <div class="flex gap-2 text-[11px] text-indigo-200 flex-wrap">
          <span v-for="tag in activeEntry.tags || []" :key="tag" class="px-2 py-1 rounded-full bg-white/5 border border-white/10">
            #{{ tag }}
          </span>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import {
  addTaskToFirebase,
  fetchEntries,
  saveEntryToFirebase,
  updateJournalEntry,
  uploadJournalAudio,
} from '@/services/firebaseService'
import { enhanceJournal } from '@/services/aiService'
import VoiceRecorder from '@/components/VoiceRecorder.vue'
import { ElNotification } from 'element-plus'
import { nlpClient } from '@/services/leader/http'
import { uploadImageForVision } from '@/services/visionUploadService'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { requestSpeechUrl } from '@/services/ttsService'

const authStore = useAuthStore()
const userName = computed(() => authStore?.user?.displayName || 'friend')

const moodOptions = [
  { emoji: '🌸', label: 'Calm', score: 4, class: 'bg-gradient-to-r from-pink-400/40 to-indigo-400/30 border border-pink-200/40' },
  { emoji: '🌧', label: 'Overwhelmed', score: 1, class: 'bg-gradient-to-r from-slate-600/40 to-blue-500/40 border border-blue-200/40' },
  { emoji: '⚡', label: 'Motivated', score: 5, class: 'bg-gradient-to-r from-amber-300/50 to-orange-400/40 border border-amber-200/50' },
  { emoji: '🌿', label: 'Reflective', score: 3, class: 'bg-gradient-to-r from-emerald-300/40 to-teal-400/40 border border-emerald-200/50' },
  { emoji: '☀', label: 'Hopeful', score: 4, class: 'bg-gradient-to-r from-yellow-200/60 to-amber-300/50 border border-amber-100/60' },
]

const workspaceStore = useWorkspaceStore()

const entryText = ref('')
const enhancedText = ref('')
const logs = ref([])
const selectedMood = ref(null)
const voiceTranscript = ref('')
const pendingAudio = ref(null)
const tagSuggestions = ['gratitude', 'focus', 'relationships', 'health', 'learning']
const drawerOpen = ref(false)
const activeEntry = ref(null)
const captureItems = ref([])
const capturePreview = ref('')
const captureLoading = ref(false)
const captureError = ref('')
const captureImageName = ref('')
const fileInput = ref(null)
const playbackOrder = ref('desc') // desc = newest first
const playbackQueue = ref([])
const currentTrackIndex = ref(-1)
const isLoadingTrack = ref(false)
const isPlaying = ref(false)
const playbackError = ref('')
const audioEl = ref(null)

onMounted(async () => {
  audioEl.value = new Audio()
  audioEl.value.addEventListener('ended', handleTrackEnded)
  audioEl.value.addEventListener('pause', () => {
    isPlaying.value = false
  })
  audioEl.value.addEventListener('play', () => {
    isPlaying.value = true
  })
  audioEl.value.addEventListener('error', () => {
    playbackError.value = 'Audio failed to load.'
  })

  try {
    logs.value = await fetchEntries()
  } catch (err) {
    console.error('Failed to load entries', err)
    logs.value = []
  }
})

onBeforeUnmount(() => {
  if (audioEl.value) {
    audioEl.value.pause()
    audioEl.value.removeEventListener('ended', handleTrackEnded)
  }
})

const filteredLogs = computed(() =>
  [...logs.value].sort((a, b) => entryTimestamp(b) - entryTimestamp(a)),
)
const orderedLogsForPlayback = computed(() =>
  playbackOrder.value === 'asc' ? [...filteredLogs.value].reverse() : filteredLogs.value,
)
const nowPlayingEntry = computed(() =>
  playbackQueue.value[currentTrackIndex.value] || null,
)
const playingEntryId = computed(() => nowPlayingEntry.value?.id || null)
const playbackOrderLabel = computed(() =>
  playbackOrder.value === 'asc' ? 'Oldest → Newest' : 'Newest → Oldest',
)
const canSkipPrev = computed(() => currentTrackIndex.value > 0)
const canSkipNext = computed(
  () => currentTrackIndex.value >= 0 && currentTrackIndex.value < playbackQueue.value.length - 1,
)

const streak = computed(() => computeStreak(filteredLogs.value))
const longestStreak = computed(() => computeLongestStreak(filteredLogs.value))
const streakBarWidth = computed(() => `${Math.min(100, streak.value * 10)}%`)

const trendValues = computed(() => filteredLogs.value.slice(0, 10).map((l) => moodScore(l.mood?.label)))
const sparkPoints = computed(() => {
  if (!trendValues.value.length) return ''
  const max = Math.max(...trendValues.value, 1)
  const min = Math.min(...trendValues.value, 0)
  const width = 240
  const height = 80
  return trendValues.value
    .map((v, idx) => {
      const x = (idx / Math.max(trendValues.value.length - 1, 1)) * width
      const norm = max === min ? 0.5 : (v - min) / (max - min)
      const y = height - norm * (height - 10) - 5
      return `${x},${y}`
    })
    .join(' ')
})

const insights = computed(() => {
  if (!filteredLogs.value.length) return ['Start journaling to see insights.', 'No dominant mood yet.', 'Add a voice note to capture feelings.']
  const lastMood = filteredLogs.value[0]?.mood?.label || 'Reflective'
  const dominant = dominantMood(filteredLogs.value)
  const count = filteredLogs.value.length
  return [
    `You've logged ${count} reflections. Keep the flow going.`,
    `Lately you’ve felt more ${dominant}.`,
    `Last entry felt ${lastMood.toLowerCase()}.`,
  ]
})

function entryTimestamp(entry = {}) {
  const raw = entry?.timestamp || entry?.createdAt || entry?.date
  if (raw?.seconds) return raw.seconds * 1000 + Math.floor((raw.nanoseconds || 0) / 1e6)
  const num = Number(raw)
  if (Number.isFinite(num)) return num
  const dateObj = raw instanceof Date ? raw : new Date(raw || Date.now())
  const ms = dateObj.getTime()
  return Number.isFinite(ms) ? ms : Date.now()
}

function selectMood(mood) {
  selectedMood.value = mood
}

function handleTranscript(text, meta = {}) {
  voiceTranscript.value = text || ''
  if (meta?.audioBlob) {
    pendingAudio.value = {
      blob: meta.audioBlob,
      mimeType: meta.mimeType || 'audio/webm',
      durationSeconds: meta.durationSeconds || 0,
    }
  }
}

function clearVoiceCapture() {
  voiceTranscript.value = ''
  pendingAudio.value = null
}

function appendTag(tag) {
  const insert = entryText.value.trim() ? `${entryText.value.trim()} #${tag}` : `#${tag}`
  entryText.value = insert
}

async function saveEntry() {
  const baseText = entryText.value.trim() || voiceTranscript.value.trim()
  if (!baseText) return

  let enhanced = ''
  try {
    enhanced = await enhanceJournal(baseText)
    enhancedText.value = enhanced
  } catch (err) {
    console.warn('Enhance journal failed; using raw text', err)
  }

  let uploadedAudio = null
  if (pendingAudio.value?.blob) {
    try {
      uploadedAudio = await uploadJournalAudio(pendingAudio.value.blob, {
        mimeType: pendingAudio.value.mimeType,
      })
    } catch (err) {
      console.warn('Audio upload failed', err)
      ElNotification({
        title: 'Voice upload skipped',
        message: 'Saved your entry, but the voice clip could not be uploaded.',
        type: 'warning',
      })
    }
  }

  const timestamp = Date.now()
  const finalText = enhanced || baseText
  const summaryText = finalText.length > 140 ? `${finalText.slice(0, 140)}…` : finalText
  const entry = {
    id: crypto.randomUUID?.() || timestamp,
    text: finalText,
    mood: selectedMood.value,
    timestamp,
    createdAt: timestamp,
    tags: tagSuggestions.slice(0, 2),
    summary: summaryText,
    audioUrl: uploadedAudio?.url || null,
    audioStoragePath: uploadedAudio?.path || null,
    audioType: pendingAudio.value?.mimeType || null,
    audioDuration: pendingAudio.value?.durationSeconds || null,
    source: pendingAudio.value ? 'voice' : 'text',
  }
  try {
    const res = await saveEntryToFirebase(entry)
    const saved = { ...entry, id: res?.id || entry.id }
    logs.value = [saved, ...logs.value]
    entryText.value = ''
    voiceTranscript.value = ''
    pendingAudio.value = null
    selectedMood.value = null
    ElNotification({ title: 'Saved', message: 'Your reflection was saved 💫', type: 'success' })
  } catch (err) {
    console.error('Save entry failed', err)
    ElNotification({
      title: 'Save failed',
      message: err?.message || 'Could not save your entry. Please try again.',
      type: 'error',
    })
  }
}

function formatDate(ms) {
  const d = new Date(entryTimestamp({ timestamp: ms }))
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', weekday: 'short' })
}

function openEntry(entry) {
  activeEntry.value = entry
  drawerOpen.value = true
}

function moodScore(label) {
  const match = moodOptions.find((m) => m.label === label)
  return match?.score ?? 2.5
}

function dominantMood(list = []) {
  const counts = {}
  list.forEach((l) => {
    const key = l.mood?.label || 'Reflective'
    counts[key] = (counts[key] || 0) + 1
  })
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Reflective'
}

function computeStreak(list = []) {
  if (!list.length) return 0
  const dates = new Set(list.map((l) => new Date(entryTimestamp(l)).toDateString()))
  let streakCount = 0
  let day = new Date()
  while (dates.has(day.toDateString())) {
    streakCount += 1
    day.setDate(day.getDate() - 1)
  }
  return streakCount
}

function computeLongestStreak(list = []) {
  if (!list.length) return 0
  const dates = [...new Set(list.map((l) => new Date(entryTimestamp(l)).toDateString()))].sort(
    (a, b) => new Date(a) - new Date(b),
  )
  let longest = 1
  let current = 1
  for (let i = 1; i < dates.length; i += 1) {
    const prev = new Date(dates[i - 1])
    const curr = new Date(dates[i])
    const diff = (curr - prev) / (1000 * 60 * 60 * 24)
    if (diff === 1) {
      current += 1
      longest = Math.max(longest, current)
    } else {
      current = 1
    }
  }
  return longest
}

async function resolveEntryAudio(entry) {
  if (!entry) throw new Error('No entry to play.')
  if (entry.audioUrl) return { url: entry.audioUrl, kind: 'voice' }
  if (entry.ttsUrl) return { url: entry.ttsUrl, kind: 'tts' }

  const text = String(entry.text || '').trim()
  if (!text) throw new Error('No text available to speak.')

  const trimmed = text.length > 1200 ? text.slice(0, 1200) : text
  let tts = null
  try {
    tts = await requestSpeechUrl(trimmed)
  } catch (err) {
    const reason = err?.response?.data?.error || err?.message || 'Unable to generate audio.'
    throw new Error(reason)
  }
  if (tts?.url) {
    entry.ttsUrl = tts.url
    if (entry.id) {
      updateJournalEntry(entry.id, { ttsUrl: tts.url }).catch((err) =>
        console.warn('Persisting TTS url failed', err),
      )
    }
    return { url: tts.url, kind: 'tts' }
  }
  throw new Error('Unable to generate audio for this entry.')
}

async function startEntryPlayback(entry) {
  if (!entry || !audioEl.value) return
  isLoadingTrack.value = true
  playbackError.value = ''
  try {
    const source = await resolveEntryAudio(entry)
    if (!source?.url) throw new Error('Audio unavailable for this entry.')
    audioEl.value.src = source.url
    await audioEl.value.play()
    isPlaying.value = true
  } catch (err) {
    playbackError.value = err?.message || 'Playback failed.'
    isPlaying.value = false
    if (canSkipNext.value) {
      await playNext()
    }
  } finally {
    isLoadingTrack.value = false
  }
}

async function playCurrentFromQueue() {
  const entry = playbackQueue.value[currentTrackIndex.value]
  if (entry) {
    await startEntryPlayback(entry)
  }
}

async function toggleEntryPlayback(entry) {
  if (!entry) return
  playbackError.value = ''
  const queue = [...orderedLogsForPlayback.value]
  playbackQueue.value = queue
  const idx = queue.findIndex((l) => l.id === entry.id)
  currentTrackIndex.value = idx >= 0 ? idx : 0
  if (playingEntryId.value === entry.id && isPlaying.value) {
    pausePlayback()
  } else {
    await playCurrentFromQueue()
  }
}

async function togglePlayAll() {
  playbackError.value = ''
  if (isPlaying.value && playbackQueue.value.length) {
    pausePlayback()
    return
  }

  if (playbackQueue.value.length && currentTrackIndex.value >= 0) {
    await resumePlayback()
    return
  }

  playbackQueue.value = [...orderedLogsForPlayback.value]
  currentTrackIndex.value = playbackQueue.value.length ? 0 : -1
  await playCurrentFromQueue()
}

function pausePlayback() {
  if (audioEl.value) {
    audioEl.value.pause()
  }
  isPlaying.value = false
}

async function resumePlayback() {
  if (!audioEl.value) return
  if (!audioEl.value.src) {
    await playCurrentFromQueue()
  } else {
    try {
      await audioEl.value.play()
      isPlaying.value = true
    } catch (err) {
      playbackError.value = err?.message || 'Playback failed.'
    }
  }
}

async function playNext() {
  playbackError.value = ''
  if (!canSkipNext.value) {
    isPlaying.value = false
    return
  }
  currentTrackIndex.value += 1
  await playCurrentFromQueue()
}

async function playPrevious() {
  playbackError.value = ''
  if (!canSkipPrev.value) return
  currentTrackIndex.value -= 1
  await playCurrentFromQueue()
}

function handleTrackEnded() {
  if (canSkipNext.value) {
    playNext()
  } else {
    isPlaying.value = false
  }
}

function toggleOrder() {
  playbackOrder.value = playbackOrder.value === 'asc' ? 'desc' : 'asc'
  if (playbackQueue.value.length) {
    const activeId = playingEntryId.value
    playbackQueue.value = [...orderedLogsForPlayback.value]
    if (activeId) {
      const idx = playbackQueue.value.findIndex((l) => l.id === activeId)
      currentTrackIndex.value = idx >= 0 ? idx : currentTrackIndex.value
    }
  }
}

function isEntryPlaying(entry) {
  return playingEntryId.value && playingEntryId.value === entry?.id && isPlaying.value
}

function onFileChange(e) {
  const file = e.target.files?.[0]
  if (!file) return
  captureImageName.value = file.name
  processCapture(file)
}

async function processCapture(file) {
  captureLoading.value = true
  captureError.value = ''
  captureItems.value = []
  try {
    const { imageUrl } = await uploadImageForVision(file)
    const { data } = await nlpClient.post('/workspace/ingest-image', { imageUrl })
    capturePreview.value = data?.rawText || data?.ocrText || ''
    captureItems.value = (data?.items || []).map((it) => ({
      title: it.title || 'Task',
      description: it.description || '',
      type: it.type || 'task',
      include: true,
    }))
    if (!captureItems.value.length) {
      captureError.value = 'No items detected. Try a clearer image.'
    }
  } catch (err) {
    captureError.value = err?.response?.data?.error || err?.message || 'Failed to process image.'
  } finally {
    captureLoading.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

async function commitCapture() {
  const selected = captureItems.value.filter((i) => i.include && i.title)
  if (!selected.length) return
  for (const item of selected) {
    await addTaskToFirebase({
      title: item.title,
      details: item.description,
      source: 'capture',
      createdBy: authStore.user?.uid || null,
      workspaceId: workspaceStore.activeWorkspaceId || null,
    })
  }
  ElNotification({ title: 'Created', message: `Added ${selected.length} tasks from scan.`, type: 'success' })
  captureItems.value = []
  capturePreview.value = ''
  captureImageName.value = ''
}
</script>

<style scoped>
.mood-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-radius: 999px;
  transition: transform 0.15s ease, box-shadow 0.2s ease, opacity 0.2s ease;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
}

.animate-fade-in {
  animation: fadeIn 0.5s ease;
}

.animate-slide-up {
  animation: slideUp 0.5s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.journal-drawer :deep(.el-drawer__body) {
  background: #0b1220;
}

.journal-drawer :deep(.el-drawer__header) {
  background: #0b1220;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
</style>
