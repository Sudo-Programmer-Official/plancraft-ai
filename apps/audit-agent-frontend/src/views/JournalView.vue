<template>
  <div class="journal-page min-h-full bg-pc-bg text-pc-text">
    <div class="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header class="space-y-2">
        <p class="text-xs font-semibold uppercase tracking-[0.3em] text-pc-accent-text">Journal</p>
        <div class="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 class="text-3xl font-semibold tracking-tight sm:text-4xl">A moment to reflect</h1>
            <p class="mt-2 text-sm text-pc-text-muted sm:text-base">Write a few lines. That’s enough.</p>
          </div>
          <span class="rounded-full border border-pc-border bg-pc-surface px-3 py-1.5 text-xs font-semibold text-pc-text-muted shadow-sm">
            {{ formatToday() }}
          </span>
        </div>
      </header>

      <!-- Unified reflection composer -->
      <section class="journal-surface journal-composer">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="journal-eyebrow">New reflection</p>
            <h2 class="mt-1 text-xl font-semibold tracking-tight">Write a reflection</h2>
            <p class="mt-1 text-sm text-pc-text-muted">Write freely or tap the mic. Voice input stays in the same note.</p>
          </div>
          <span class="rounded-full bg-pc-accent-soft px-3 py-1 text-xs font-semibold text-pc-accent-text">Private by default</span>
        </div>

        <div class="journal-input-shell mt-5">
          <textarea
            v-model="entryText"
            placeholder="What’s on your mind? Write freely… no rules here."
            rows="7"
            class="w-full resize-none rounded-2xl border border-pc-border-strong bg-pc-surface px-4 py-3 pb-16 pr-16 text-sm leading-6 text-pc-text shadow-inner placeholder:text-pc-text-subtle focus:outline-none focus:ring-2 focus:ring-pc-accent"
          ></textarea>
          <div class="journal-input-voice" aria-label="Voice input">
            <VoiceRecorder
              :reset-trigger="voiceResetKey"
              surface="journal"
              icon-only
              @transcribed="handleTranscript"
              @state-change="handleVoiceStateChange"
              @processing-error="handleVoiceError"
            />
          </div>
        </div>

        <div v-if="voiceTranscript" class="mt-3 flex items-start gap-3 rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-900">
          <Mic2 :size="18" class="mt-0.5 shrink-0 text-cyan-700" aria-hidden="true" />
          <div class="min-w-0">
            <p class="font-semibold">Voice input added</p>
            <p class="mt-0.5 line-clamp-2 text-xs text-cyan-800/80">{{ voiceTranscript }}</p>
          </div>
        </div>

        <div class="mt-2 min-h-5 text-xs" aria-live="polite">
          <p v-if="voiceError" class="text-rose-600">{{ voiceError }}</p>
          <p v-else-if="voiceState === 'recording'" class="font-medium text-rose-600">Listening… tap the mic again to stop.</p>
          <p v-else-if="voiceState === 'transcribing'" class="text-pc-accent-text">Transcribing your note…</p>
          <p v-else class="text-pc-text-muted">Tap the mic inside the note to add your voice.</p>
        </div>

        <div class="mt-5 flex flex-col gap-4 border-t border-pc-border pt-4">
          <div class="flex flex-wrap items-center gap-2">
            <span class="mr-1 text-xs font-semibold uppercase tracking-[0.18em] text-pc-text-subtle">Add a theme</span>
            <button
              v-for="tag in tagSuggestions"
              :key="tag"
              type="button"
              class="journal-tag-chip"
              :class="{ 'journal-tag-chip--selected': selectedTags.includes(tag) }"
              :aria-pressed="selectedTags.includes(tag)"
              @click="toggleTag(tag)"
            >
              #{{ tag }}
            </button>
          </div>

          <div class="flex justify-end">
            <button
              type="button"
              class="inline-flex items-center justify-center gap-2 rounded-xl bg-[image:var(--pc-accent-fill)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[image:var(--pc-accent-fill-hover)] disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="!entryText.trim()"
              @click="saveEntry"
            >
              <Sparkles :size="16" :stroke-width="2" aria-hidden="true" />
              Save reflection
            </button>
          </div>
        </div>

        <p class="mt-4 text-xs text-pc-text-muted">Saved reflections can create suggestions in Inbox automatically.</p>
      </section>

      <!-- Reflection history -->
      <section class="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(17rem,1fr)]">
        <div class="journal-surface">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="journal-eyebrow">Timeline</p>
              <h2 class="mt-1 text-xl font-semibold tracking-tight">Your reflection timeline</h2>
            </div>
            <span class="rounded-full bg-pc-surface-2 px-3 py-1 text-xs font-semibold text-pc-text-muted">
              {{ filteredLogs.length }} {{ filteredLogs.length === 1 ? 'entry' : 'entries' }}
            </span>
          </div>

          <div v-if="filteredLogs.length" class="journal-timeline mt-5 space-y-3 pr-1 scrollbar-plan">
            <article
              v-for="log in filteredLogs"
              :key="log.id"
              class="journal-entry-card"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0 flex-1">
                  <p class="break-words text-sm font-semibold text-pc-text">{{ log.summary }}</p>
                  <p class="mt-0.5 text-xs text-pc-text-muted">Reflection · {{ formatDate(log.timestamp) }}</p>
                </div>
              </div>
              <p class="mt-3 break-words whitespace-pre-line text-sm leading-6 text-pc-text-muted">{{ log.text }}</p>
              <div class="mt-3 flex flex-wrap items-center gap-2">
                <span v-for="tag in log.tags || []" :key="tag" class="journal-entry-tag">#{{ tag }}</span>
                <button type="button" class="ml-auto shrink-0 text-xs font-semibold text-pc-accent-text hover:text-pc-accent" @click="openEntry(log)">
                  View full
                </button>
              </div>
            </article>
          </div>
          <div v-else class="mt-5 rounded-2xl border border-dashed border-pc-border-strong bg-pc-surface-2 px-4 py-10 text-center text-sm text-pc-text-muted">
            No journal entries yet. Save your first reflection to start your timeline.
          </div>
        </div>

        <aside class="space-y-5">
          <div class="journal-surface">
            <p class="journal-eyebrow">Streak</p>
            <div class="mt-2 flex items-start justify-between gap-3">
              <div>
                <h2 class="text-2xl font-semibold tracking-tight">{{ streak }}-day streak</h2>
                <p class="mt-1 text-sm text-pc-text-muted">Longest: {{ longestStreak }} days</p>
              </div>
              <span class="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-50 text-xl" aria-hidden="true"><Flame :size="21" class="text-orange-500" /></span>
            </div>
            <div class="mt-5 h-2 overflow-hidden rounded-full bg-pc-surface-2">
              <div class="h-full rounded-full bg-[image:var(--pc-accent-fill)] transition-all" :style="{ width: streakBarWidth }"></div>
            </div>
          </div>

        </aside>
      </section>
    </div>

    <el-drawer v-model="drawerOpen" size="420px" title="Journal entry" class="journal-drawer">
      <div v-if="activeEntry" class="space-y-4 text-pc-text">
        <div class="flex items-center justify-between gap-3">
          <span class="journal-eyebrow">Reflection</span>
          <span class="text-xs text-pc-text-subtle">{{ formatDate(activeEntry.timestamp) }}</span>
        </div>
        <p class="whitespace-pre-line text-sm leading-6 text-pc-text-muted">{{ activeEntry.text }}</p>
        <div class="flex flex-wrap gap-2">
          <span v-for="tag in activeEntry.tags || []" :key="tag" class="journal-entry-tag">#{{ tag }}</span>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { Flame, Mic2, Sparkles } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { fetchEntries, saveEntryToFirebase } from '@/services/firebaseService'
import { enhanceJournal } from '@/services/aiService'
import { detectActionInboxSuggestions } from '@/services/actionInboxService'
import VoiceRecorder from '@/components/VoiceRecorder.vue'
import { ElNotification } from 'element-plus'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { getEffectiveUserTimezone } from '@/utils/userTimezone'

const router = useRouter()
const authStore = useAuthStore()
const workspaceStore = useWorkspaceStore()

const entryText = ref('')
const logs = ref([])
const voiceTranscript = ref('')
const voiceResetKey = ref(0)
const voiceState = ref('idle')
const voiceError = ref('')
const tagSuggestions = ['gratitude', 'focus', 'relationships', 'health', 'learning']
const selectedTags = ref([])
const drawerOpen = ref(false)
const activeEntry = ref(null)

async function loadJournalEntries() {
  try {
    logs.value = await fetchEntries()
  } catch (err) {
    console.warn('[JournalView] entry load failed', err?.message || err)
    logs.value = []
  }
}

watch(
  () => authStore.user?.uid,
  (uid) => {
    if (!uid) {
      logs.value = []
      return
    }
    loadJournalEntries()
  },
  { immediate: true },
)

const filteredLogs = computed(() =>
  [...logs.value].sort((a, b) => (b.timestamp || b.createdAt || 0) - (a.timestamp || a.createdAt || 0)),
)

const streak = computed(() => computeStreak(filteredLogs.value))
const longestStreak = computed(() => computeLongestStreak(filteredLogs.value))
const streakBarWidth = computed(() => `${Math.min(100, streak.value * 10)}%`)

const hasWorkspace = computed(() => !!workspaceStore.activeWorkspaceId)

function formatToday() {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: getEffectiveUserTimezone(),
  }).format(new Date())
}

function handleTranscript(raw) {
  const text = typeof raw === 'string' ? raw.trim() : String(raw?.text || '').trim()
  if (!text) return
  voiceError.value = ''
  voiceTranscript.value = text
  const current = entryText.value.trim()
  if (!current) {
    entryText.value = text
  } else if (!current.includes(text)) {
    entryText.value = `${current}\n\n${text}`
  }
}

function handleVoiceStateChange(nextState) {
  voiceState.value = nextState
  if (nextState === 'recording' || nextState === 'transcribing' || nextState === 'idle') {
    voiceError.value = ''
  }
}

function handleVoiceError(message) {
  voiceState.value = 'error'
  voiceError.value = String(message || 'Voice recording failed. Please try again.')
}

function toggleTag(tag) {
  selectedTags.value = selectedTags.value.includes(tag)
    ? selectedTags.value.filter((value) => value !== tag)
    : [...selectedTags.value, tag]
}

function timezoneGuess() {
  try {
    return getEffectiveUserTimezone()
  } catch {
    return 'UTC'
  }
}

async function detectActionsFromText(text, source = {}, { toastSuccess = true } = {}) {
  const rawText = String(text || '').trim()
  if (!rawText) return []
  if (!workspaceStore.activeWorkspaceId) {
    throw new Error('Select a workspace before detecting actions.')
  }

  const suggestions = await detectActionInboxSuggestions({
    text: rawText,
    workspaceId: workspaceStore.activeWorkspaceId,
    sourceType: source.sourceType || 'note',
    sourceLabel: source.sourceLabel || 'note',
    sourceRefId: source.sourceRefId || null,
    timezone: timezoneGuess(),
    now: new Date().toISOString(),
    maxItems: 6,
  })
  if (typeof window !== 'undefined' && suggestions.length) {
    try {
      window.dispatchEvent(
        new CustomEvent('action-inbox-updated', {
          detail: {
            workspaceId: workspaceStore.activeWorkspaceId,
            trigger: source.sourceType || 'note_submit',
            suggestionCount: suggestions.length,
          },
        }),
      )
    } catch {
      /* noop */
    }
  }
  if (toastSuccess) {
    ElNotification({
      title: suggestions.length ? 'Inbox updated' : 'No actions found',
      message: suggestions.length
        ? `${suggestions.length} task${suggestions.length === 1 ? '' : 's'} added.`
        : 'No tasks found in that note.',
      type: suggestions.length ? 'success' : 'info',
      onClick: suggestions.length ? () => router.push('/inbox') : undefined,
    })
  }
  return suggestions
}

async function saveEntry() {
  if (!entryText.value.trim()) return
  try {
    const rawText = entryText.value.trim()
    const enhanced = await enhanceJournal(rawText)
    const timestamp = Date.now()
    const savedText = enhanced || rawText
    const entry = {
      id: crypto.randomUUID?.() || timestamp,
      text: savedText,
      timestamp,
      createdAt: timestamp,
      tags: [...selectedTags.value],
      summary: savedText.length > 100 ? `${savedText.slice(0, 100)}…` : savedText,
    }
    const savedEntry = await saveEntryToFirebase(entry)
    logs.value = [entry, ...logs.value]
    let detected = []
    if (hasWorkspace.value) {
      try {
        detected = await detectActionsFromText(rawText, {
          sourceType: 'journal_entry',
          sourceLabel: 'journal entry',
          sourceRefId: savedEntry?.id || null,
        }, { toastSuccess: false })
      } catch (detectErr) {
        console.warn('[JournalView] action detection after save failed', detectErr?.message || detectErr)
      }
    }
    entryText.value = ''
    voiceTranscript.value = ''
    voiceResetKey.value += 1
    voiceState.value = 'idle'
    voiceError.value = ''
    selectedTags.value = []
    ElNotification({
      title: detected.length ? 'Inbox updated' : 'Saved',
      message: detected.length
        ? `Saved. ${detected.length} task${detected.length === 1 ? '' : 's'} added.`
        : 'Reflection saved.',
      type: 'success',
      onClick: detected.length ? () => router.push('/inbox') : undefined,
    })
  } catch (err) {
    ElNotification({
      title: 'Unable to save',
      message: err?.message || 'Try saving your reflection again.',
      type: 'error',
    })
  }
}

function formatDate(ms) {
  const date = new Date(ms)
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', weekday: 'short' })
}

function openEntry(entry) {
  activeEntry.value = entry
  drawerOpen.value = true
}

function computeStreak(list = []) {
  if (!list.length) return 0
  const dates = new Set(list.map((entry) => new Date(entry.timestamp).toDateString()))
  let streakCount = 0
  const day = new Date()
  while (dates.has(day.toDateString())) {
    streakCount += 1
    day.setDate(day.getDate() - 1)
  }
  return streakCount
}

function computeLongestStreak(list = []) {
  if (!list.length) return 0
  const dates = [...new Set(list.map((entry) => new Date(entry.timestamp).toDateString()))].sort(
    (a, b) => new Date(a) - new Date(b),
  )
  let longest = 1
  let current = 1
  for (let index = 1; index < dates.length; index += 1) {
    const previous = new Date(dates[index - 1])
    const currentDate = new Date(dates[index])
    const diff = (currentDate - previous) / (1000 * 60 * 60 * 24)
    if (diff === 1) {
      current += 1
      longest = Math.max(longest, current)
    } else {
      current = 1
    }
  }
  return longest
}
</script>

<style scoped>
.journal-page {
  min-height: 100%;
  min-width: 0;
  box-sizing: border-box;
  overflow-x: hidden;
}

.journal-timeline {
  max-height: 560px;
  overflow-y: auto;
}

.journal-surface {
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-radius-xl);
  background: var(--pc-surface);
  padding: 1.25rem;
  box-shadow: var(--pc-shadow-sm);
}

.journal-eyebrow {
  color: var(--pc-text-subtle);
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.25em;
  line-height: 1.2;
  text-transform: uppercase;
}

.journal-tag-chip,
.journal-entry-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-radius-full);
  background: var(--pc-surface-2);
  color: var(--pc-text-muted);
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1;
}

.journal-tag-chip {
  cursor: pointer;
  padding: 0.55rem 0.75rem;
  transition: border-color 160ms ease, background 160ms ease, color 160ms ease;
}

.journal-tag-chip:hover,
.journal-tag-chip--selected {
  border-color: var(--pc-accent);
  background: var(--pc-accent-soft);
  color: var(--pc-accent-text);
}

.journal-entry-card {
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-radius-lg);
  background: var(--pc-surface-2);
  padding: 1rem;
  transition: border-color 160ms ease, box-shadow 160ms ease;
}

.journal-entry-card:hover {
  border-color: var(--pc-border-strong);
  box-shadow: var(--pc-shadow-sm);
}

.journal-entry-tag {
  padding: 0.4rem 0.6rem;
  font-size: 0.6875rem;
}

.journal-input-shell {
  position: relative;
}

.journal-input-voice {
  position: absolute;
  right: 0.75rem;
  bottom: 0.75rem;
  z-index: 1;
}

.journal-input-voice :deep(.voice-controller__button) {
  width: 2.75rem;
  height: 2.75rem;
  background: var(--pc-accent-fill);
  box-shadow: 0 6px 16px rgba(79, 70, 229, 0.22);
}

.journal-input-voice :deep(.voice-controller__button:not(:disabled):hover) {
  box-shadow: 0 8px 20px rgba(79, 70, 229, 0.3);
}

.journal-input-voice :deep(.voice-controller__button--recording) {
  background: linear-gradient(135deg, #fb7185, #e11d48);
}

.journal-entry-card,
.journal-entry-card * {
  min-width: 0;
  max-width: 100%;
}

.journal-entry-card p {
  overflow-wrap: anywhere;
}

.journal-drawer :deep(.el-drawer__body),
.journal-drawer :deep(.el-drawer__header) {
  background: var(--pc-surface);
  color: var(--pc-text);
}

.journal-drawer :deep(.el-drawer__header) {
  margin-bottom: 0;
  border-bottom: 1px solid var(--pc-border);
  padding-bottom: 1rem;
}

.journal-drawer :deep(.el-drawer__title) {
  color: var(--pc-text);
}

@media (min-width: 640px) {
  .journal-surface {
    padding: 1.5rem;
  }
}

@media (max-width: 639px) {
  .journal-page {
    padding-bottom: calc(6.5rem + var(--safe-area-bottom));
  }

  /* Keep one predictable page scroll on phones instead of trapping long
     journal histories inside a second nested scroller. */
  .journal-timeline {
    max-height: none;
    overflow-y: visible;
    padding-right: 0;
  }
}
</style>
