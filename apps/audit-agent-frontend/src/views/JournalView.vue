<template>
  <div class="journal-page">
    <guest-banner :isGuest="authStore.guest" @login="redirectToLogin" />

    <section class="journal-hero">
      <div class="hero-copy">
        <p class="hero-eyebrow">Voice Reflection · Hands-free</p>
        <h1>Speak once. We’ll auto-tag, tone-check, and save the feeling.</h1>
        <p class="hero-subtitle">
          Tap the mic, share what’s on your mind, and Whisper cleans up the transcript while our
          journal AI detects category, sentiment, and keywords automatically.
        </p>
        <ul class="hero-list">
          <li>🎙️ One-tap voice journaling with auto-stop silence detection</li>
          <li>🧠 AI categorization across Reflection, Gratitude, Goal, Stress, Idea</li>
          <li>💡 Tone + mood chips so you can spot patterns without typing</li>
        </ul>
      </div>

      <div class="hero-card" v-if="insightsCard">
        <div class="hero-card__label">Today’s gentle nudge</div>
        <p class="hero-card__title">
          {{ insightsCard.suggestion.title }}
        </p>
        <p class="hero-card__text">
          {{ insightsCard.suggestion.text }}
        </p>
        <div class="hero-card__stats">
          <div class="hero-card__stat">
            <span class="hero-card__stat-label">Streak</span>
            <strong>{{ insightsCard.stats.streakDays }} days</strong>
          </div>
          <div class="hero-card__stat">
            <span class="hero-card__stat-label">This week</span>
            <strong>{{ insightsCard.stats.entriesThisWeek }} logs</strong>
          </div>
          <div class="hero-card__stat">
            <span class="hero-card__stat-label">Top vibe</span>
            <strong>
              {{ insightsCard.stats.topCategory?.label || "—" }}
            </strong>
          </div>
        </div>
        <div class="hero-card__keywords" v-if="insightsCard.keywords?.length">
          <span v-for="word in insightsCard.keywords" :key="word">#{{ word }}</span>
        </div>
        <router-link to="/journal" class="hero-card__cta">
          {{ insightsCard.suggestion.cta }} →
        </router-link>
      </div>
    </section>

    <section class="voice-panel">
      <div class="voice-panel__body">
        <div class="voice-panel__mic">
          <button class="mic-button" :class="{ active: isListening }" @click="toggleRecording">
            <span class="mic-button__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M12 3a3 3 0 00-3 3v6a3 3 0 006 0V6a3 3 0 00-3-3z"
                />
                <path
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M19 11a7 7 0 01-14 0m7 7v3m-4 0h8"
                />
              </svg>
            </span>
            <div class="mic-button__copy">
              <span>{{ isListening ? "Tap to stop" : "Tap once to start" }}</span>
              <small>{{ isListening ? "Auto-stops after a few seconds of silence" : "Hands-free voice journal" }}</small>
            </div>
          </button>

          <div class="voice-visual" :class="{ listening: isListening }" aria-hidden="true">
            <span class="wave wave-1"></span>
            <span class="wave wave-2"></span>
            <span class="wave wave-3"></span>
          </div>
        </div>

        <p class="status-line">{{ statusLabel }}</p>

        <transition name="fade-slide">
          <div v-if="transcript" class="transcript-card">
            <header class="transcript-card__header">
              <div>
                <p class="transcript-card__label">Transcription</p>
                <small class="transcript-card__hint">{{ transcriptTag }}</small>
              </div>
              <span v-if="analysis" class="auto-chip">
                {{ analysis.categoryEmoji }} {{ analysis.category }}
              </span>
            </header>
            <p class="transcript-card__body">
              {{ polishedText || transcript }}
            </p>

            <div v-if="analysis" class="analysis-grid">
              <span class="analysis-chip">
                {{ analysis.mood.emoji }} Mood: {{ analysis.mood.label }}
              </span>
              <span class="analysis-chip">
                🔊 Tone: {{ analysis.tone.primary }} · {{ analysis.tone.energy }}
              </span>
              <span class="analysis-chip">
                💬 Sentiment: {{ formatLabel(analysis.sentiment) }}
              </span>
            </div>

            <div v-if="analysis?.keywords?.length" class="keyword-row">
              <span v-for="word in analysis.keywords" :key="word" class="keyword-chip">
                #{{ word }}
              </span>
            </div>

            <div v-if="analysis?.takeaway" class="takeaway-card">
              <p class="takeaway-card__label">Insight</p>
              <p class="takeaway-card__text">{{ analysis.takeaway }}</p>
            </div>

            <div class="save-row" v-if="readyToSave">
              <button class="save-btn" :disabled="saving || hasSaved" @click="handleManualSave">
                <span v-if="saving">Saving…</span>
                <span v-else-if="hasSaved">Saved</span>
                <span v-else>Save reflection</span>
              </button>
              <p class="auto-hint" v-if="!hasSaved && autoSaveScheduled">
                Auto-saving
                <span class="dots">
                  <span></span><span></span><span></span>
                </span>
              </p>
            </div>
          </div>
        </transition>

        <transition name="fade-slide">
          <div v-if="saveToastVisible" class="save-toast">
            ✨ Reflection saved. You’ve journaled today.
          </div>
        </transition>
      </div>
    </section>

    <section class="history-panel">
      <div class="history-card">
        <header class="history-card__header">
          <div>
            <p class="history-card__eyebrow">Recent</p>
            <h3>Recent reflections</h3>
          </div>
          <router-link to="/reports" class="history-card__link">
            Reports →
          </router-link>
        </header>
        <div v-if="historyEntries.length" class="history-list">
          <article v-for="entry in historyEntries" :key="entry.id" class="history-item">
            <div class="history-item__emoji">{{ entry.moodEmoji }}</div>
            <div class="history-item__body">
              <p class="history-item__date">{{ entry.dateLabel }}</p>
              <p class="history-item__text">{{ entry.preview }}</p>
            </div>
            <span class="history-item__tag">{{ entry.category }}</span>
          </article>
        </div>
        <p v-else class="history-empty">
          Your next voice journal will land here. Tap the mic to begin.
        </p>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { ElMessage } from 'element-plus'
import GuestBanner from '@/components/GuestBanner.vue'
import { useAuthStore } from '@/stores/authStore'
import { recordAndSendToBackend } from '@/utils/backendRecorder'
import { analyzeJournalEntry, saveJournalEntry, fetchJournalInsights } from '@/services/journalService'
import { fetchEntries } from '@/services/firebaseService'
import { useSeoMeta } from '@/composables/useSeoMeta'

const authStore = useAuthStore()
const router = useRouter()

useSeoMeta({
  title: 'Voice Journal | PlanCraft AI',
  description: 'Tap once to record, auto-transcribe with Whisper, and file AI-tagged reflections.',
  pageLabel: 'Journal',
  noindex: true,
})

const recordingState = ref('idle')
const recorderRef = ref(null)
const transcript = ref('')
const polishedText = ref('')
const analysis = ref(null)
const audioBlob = ref(null)
const recordingStartedAt = ref(0)
const saving = ref(false)
const hasSaved = ref(false)
const saveToastVisible = ref(false)
const autoSaveTimer = ref(null)
const autoSaveScheduled = ref(false)
const logs = ref([])
const insightsCard = ref(null)

const statusLabel = computed(() => {
  if (recordingState.value === 'listening') return 'Listening — we’ll stop automatically after silence'
  if (recordingState.value === 'processing') return 'Wrapping up recording…'
  if (recordingState.value === 'analyzing') return 'Analyzing tone & tags…'
  if (recordingState.value === 'saving') return 'Saving reflection…'
  if (hasSaved.value) return 'Saved — great job journaling today ✨'
  return 'Tap to start a calm 60-second voice journal'
})

const transcriptTag = computed(() => {
  if (recordingState.value === 'analyzing') return 'Auto punctuating…'
  if (analysis.value) return 'Polished with Whisper + AI'
  return 'Live transcript'
})

const readyToSave = computed(() => Boolean(polishedText.value && analysis.value))
const isListening = computed(() => recordingState.value === 'listening')
const historyEntries = computed(() => logs.value.slice(0, 4))

function formatLabel(value) {
  if (!value) return ''
  return String(value)
    .split(/[\s_-]+/)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(' ')
}

function buildFallbackAnalysis(text) {
  const cleaned = String(text || '').trim()
  return {
    cleanedText: cleaned,
    category: 'Reflection',
    categoryEmoji: '🪞',
    sentiment: 'balanced',
    mood: { label: 'Centered', emoji: '🪴', intensity: 0.5 },
    tone: { primary: 'calm', secondary: 'reflective', energy: 'low' },
    keywords: [],
    summary: '',
    takeaway: '',
    action: '',
  }
}

function serializeEntry(entry) {
  if (!entry) return null
  const created =
    entry.createdAt && typeof entry.createdAt.toDate === 'function'
      ? entry.createdAt.toDate()
      : entry.createdAt
        ? new Date(entry.createdAt)
        : new Date()
  const category = entry.category || entry.mood?.label || 'Reflection'
  return {
    id:
      entry.id ||
      ((typeof crypto !== 'undefined' && crypto.randomUUID?.()) || `entry-${created.getTime()}`),
    preview: (entry.summary || entry.text || '').slice(0, 160) || 'Voice entry',
    category,
    moodEmoji: entry.mood?.emoji || entry.categoryEmoji || '📝',
    dateLabel: dayjs(created).format('MMM D, h:mm a'),
  }
}

async function loadHistory() {
  try {
    const data = await fetchEntries()
    logs.value = data.map(serializeEntry).filter(Boolean)
  } catch (err) {
    console.warn('Failed to load history', err)
  }
}

async function refreshInsights() {
  try {
    const insight = await fetchJournalInsights()
    insightsCard.value = insight
  } catch (err) {
    if (!insightsCard.value) {
      insightsCard.value = {
        stats: { streakDays: 0, entriesThisWeek: 0, topCategory: null },
        suggestion: {
          title: 'Start with a breath',
          text: 'Voice a quick reflection and we’ll take care of tagging + saving.',
          cta: 'Begin journaling',
        },
        keywords: [],
      }
    }
  }
}

async function startRecording() {
  try {
    transcript.value = ''
    polishedText.value = ''
    analysis.value = null
    audioBlob.value = null
    hasSaved.value = false
    clearAutoSave()
    saveToastVisible.value = false
    recordingStartedAt.value = Date.now()
    recorderRef.value = await recordAndSendToBackend(handleTranscript, {
      detectSilence: true,
      silenceDurationMs: 2800,
      silenceThreshold: 0.012,
      onAutoStop: () => {
        recordingState.value = 'processing'
      },
    })
    recordingState.value = 'listening'
  } catch (err) {
    console.error('Unable to start recording', err)
    recordingState.value = 'idle'
    ElMessage({ type: 'error', message: 'Microphone access failed. Check permissions and try again.' })
  }
}

async function stopRecording() {
  if (!recorderRef.value) return
  recordingState.value = 'processing'
  try {
    if (recorderRef.value._stop) {
      await recorderRef.value._stop()
    } else {
      recorderRef.value.stopRecording?.()
    }
    if (recorderRef.value.getBlob) {
      const blob = recorderRef.value.getBlob()
      if (blob?.size) audioBlob.value = blob
    }
  } catch (err) {
    console.warn('Failed to stop recorder', err)
  } finally {
    recorderRef.value = null
  }
}

function toggleRecording() {
  if (recordingState.value === 'listening') {
    stopRecording()
  } else if (!saving.value) {
    startRecording()
  }
}

async function handleTranscript(text, isFinal) {
  transcript.value = text || ''
  if (isFinal) {
    await processTranscript(text)
  }
}

async function processTranscript(rawText) {
  if (!rawText || !rawText.trim()) {
    recordingState.value = 'idle'
    ElMessage({ type: 'warning', message: 'No speech detected. Try again.' })
    return
  }
  recordingState.value = 'analyzing'
  try {
    const result = await analyzeJournalEntry(rawText)
    const hydrated = {
      ...buildFallbackAnalysis(rawText),
      ...(result || {}),
    }
    analysis.value = hydrated
    polishedText.value = hydrated.cleanedText || rawText.trim()
    recordingState.value = 'ready'
    scheduleAutoSave()
  } catch (err) {
    console.error('Analysis failed', err)
    recordingState.value = 'idle'
    ElMessage({ type: 'error', message: 'Unable to analyze entry. Please retry.' })
  }
}

function scheduleAutoSave() {
  clearAutoSave()
  autoSaveScheduled.value = true
  autoSaveTimer.value = setTimeout(() => {
    autoSaveTimer.value = null
    autoSaveScheduled.value = false
    if (!hasSaved.value) {
      saveReflection('auto')
    }
  }, 1800)
}

function clearAutoSave() {
  if (autoSaveTimer.value) {
    clearTimeout(autoSaveTimer.value)
    autoSaveTimer.value = null
  }
  autoSaveScheduled.value = false
}

function handleManualSave() {
  clearAutoSave()
  saveReflection('manual')
}

async function saveReflection(trigger = 'manual') {
  if (!analysis.value || saving.value || hasSaved.value) return
  saving.value = true
  recordingState.value = 'saving'
  try {
    const durationMs = recordingStartedAt.value ? Date.now() - recordingStartedAt.value : null
    const entry = await saveJournalEntry({
      text: polishedText.value,
      rawText: transcript.value,
      category: analysis.value.category,
      categoryEmoji: analysis.value.categoryEmoji,
      sentiment: analysis.value.sentiment,
      mood: analysis.value.mood,
      tone: analysis.value.tone,
      keywords: analysis.value.keywords,
      summary: analysis.value.summary,
      takeaway: analysis.value.takeaway,
      action: analysis.value.action,
      audioBlob: audioBlob.value,
      audioFilename: `journal-${Date.now()}.webm`,
      audioDurationMs: durationMs,
      wordCount: polishedText.value ? polishedText.value.split(/\s+/).filter(Boolean).length : null,
    })
    hasSaved.value = true
    recordingState.value = 'idle'
    saveToastVisible.value = true
    setTimeout(() => {
      saveToastVisible.value = false
    }, 4200)
    if (entry) {
      logs.value = [serializeEntry(entry), ...logs.value].filter(Boolean).slice(0, 8)
    }
    refreshInsights()
  } catch (err) {
    console.error('Save failed', err)
    recordingState.value = 'ready'
    ElMessage({ type: 'error', message: 'Unable to save entry. Please try again.' })
  } finally {
    saving.value = false
  }
}

function redirectToLogin() {
  router.push('/login')
}

onMounted(async () => {
  await Promise.all([loadHistory(), refreshInsights()])
})

onBeforeUnmount(() => {
  clearAutoSave()
  if (recorderRef.value) {
    try {
      recorderRef.value.stopRecording?.()
    } catch {
      /* noop */
    }
  }
})
</script>

<style scoped>
.journal-page {
  min-height: 100vh;
  padding: 2.5rem 1.5rem 3rem;
  background: radial-gradient(circle at top, rgba(15, 23, 42, 0.85), rgba(2, 6, 23, 0.95)),
    linear-gradient(135deg, #050816, #101935 60%, #1d1b38 100%);
  color: #f8fafc;
}

@media (min-width: 768px) {
  .journal-page {
    padding: 3rem 3.5rem 4rem;
  }
}

.journal-hero {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  margin-bottom: 2.5rem;
}

.hero-copy h1 {
  font-size: clamp(2rem, 4vw, 2.9rem);
  margin-bottom: 0.75rem;
}

.hero-eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.2em;
  font-size: 0.75rem;
  color: #93c5fd;
  margin-bottom: 0.5rem;
}

.hero-subtitle {
  color: #cbd5f5;
  margin-bottom: 1rem;
  max-width: 36rem;
}

.hero-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  color: #cbd5f5;
}

.hero-card {
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(120, 136, 255, 0.25);
  border-radius: 1.5rem;
  padding: 1.5rem;
  box-shadow: 0 20px 45px rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(18px);
}

.hero-card__label {
  font-size: 0.85rem;
  color: #a5b4fc;
  margin-bottom: 0.4rem;
}

.hero-card__title {
  font-weight: 600;
  font-size: 1.3rem;
  margin-bottom: 0.4rem;
}

.hero-card__text {
  color: #dbeafe;
  font-size: 0.95rem;
  margin-bottom: 1rem;
}

.hero-card__stats {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.hero-card__stat {
  flex: 1;
  background: rgba(148, 163, 184, 0.12);
  padding: 0.75rem;
  border-radius: 1rem;
}

.hero-card__stat-label {
  font-size: 0.78rem;
  color: #cbd5f5;
}

.hero-card__keywords {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 1rem;
}

.hero-card__keywords span {
  padding: 0.2rem 0.6rem;
  background: rgba(99, 102, 241, 0.2);
  border-radius: 999px;
  font-size: 0.75rem;
}

.hero-card__cta {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: #c7d2fe;
  font-weight: 600;
  text-decoration: none;
}

.voice-panel__body {
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: 2rem;
  padding: clamp(1.5rem, 4vw, 2.5rem);
  box-shadow: 0 30px 60px rgba(2, 6, 23, 0.45);
  backdrop-filter: blur(20px);
}

.voice-panel {
  max-width: 960px;
  margin: 0 auto 2.5rem;
}

.voice-panel__mic {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.mic-button {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.85rem 1.4rem;
  border-radius: 1.2rem;
  border: 1px solid rgba(248, 250, 252, 0.15);
  background: linear-gradient(120deg, rgba(236, 72, 153, 0.6), rgba(79, 70, 229, 0.7));
  color: white;
  cursor: pointer;
  flex: 1;
  transition: transform 0.2s ease, box-shadow 0.3s ease;
}

.mic-button.active {
  box-shadow: 0 0 25px rgba(99, 102, 241, 0.5);
}

.mic-button__icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: rgba(15, 23, 42, 0.25);
}

.mic-button__copy span {
  font-weight: 600;
  display: block;
}

.mic-button__copy small {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.75);
}

.voice-visual {
  width: 120px;
  height: 120px;
  position: relative;
  border-radius: 50%;
  border: 1px solid rgba(148, 163, 184, 0.25);
  display: grid;
  place-items: center;
  overflow: hidden;
}

.voice-visual .wave {
  position: absolute;
  width: 70%;
  height: 70%;
  border-radius: 50%;
  border: 1px solid rgba(199, 210, 254, 0.8);
  animation: pulse 3s ease-in-out infinite;
  opacity: 0;
}

.voice-visual.listening .wave {
  opacity: 1;
}

.voice-visual .wave-2 {
  animation-delay: 0.3s;
}

.voice-visual .wave-3 {
  animation-delay: 0.6s;
}

@keyframes pulse {
  0% {
    transform: scale(0.4);
    opacity: 0.45;
  }
  70% {
    transform: scale(1);
    opacity: 0;
  }
  100% {
    opacity: 0;
  }
}

.status-line {
  margin-top: 1rem;
  color: #cbd5f5;
}

.transcript-card {
  margin-top: 1.5rem;
  padding: 1.5rem;
  background: rgba(15, 23, 42, 0.55);
  border: 1px solid rgba(79, 70, 229, 0.35);
  border-radius: 1.5rem;
}

.transcript-card__header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
  margin-bottom: 0.8rem;
}

.transcript-card__label {
  margin: 0;
  font-weight: 600;
}

.transcript-card__hint {
  color: #a5b4fc;
}

.transcript-card__body {
  font-size: 1.05rem;
  line-height: 1.6;
  color: #f8fafc;
  margin-bottom: 1rem;
}

.auto-chip {
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.4);
}

.analysis-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.8rem;
}

.analysis-chip {
  padding: 0.35rem 0.8rem;
  background: rgba(99, 102, 241, 0.15);
  border-radius: 999px;
  font-size: 0.85rem;
}

.keyword-row {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}

.keyword-chip {
  padding: 0.25rem 0.65rem;
  border-radius: 999px;
  background: rgba(59, 130, 246, 0.2);
  font-size: 0.78rem;
}

.takeaway-card {
  background: rgba(15, 118, 110, 0.18);
  border: 1px solid rgba(20, 184, 166, 0.3);
  padding: 0.9rem 1rem;
  border-radius: 1rem;
  margin-bottom: 1rem;
}

.takeaway-card__label {
  font-size: 0.78rem;
  text-transform: uppercase;
  color: #99f6e4;
  margin-bottom: 0.25rem;
}

.save-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.save-btn {
  border: none;
  outline: none;
  padding: 0.75rem 1.5rem;
  border-radius: 1rem;
  font-weight: 600;
  background: linear-gradient(120deg, #22d3ee, #0ea5e9);
  color: #05243d;
  cursor: pointer;
}

.save-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.auto-hint {
  color: #cbd5f5;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.dots {
  display: inline-flex;
  gap: 0.2rem;
}

.dots span {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #a5b4fc;
  animation: dots 1.2s infinite ease-in-out;
}

.dots span:nth-child(2) {
  animation-delay: 0.2s;
}

.dots span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes dots {
  0%,
  80%,
  100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}

.save-toast {
  margin-top: 1rem;
  padding: 0.75rem 1.25rem;
  border-radius: 999px;
  background: rgba(34, 197, 94, 0.2);
  border: 1px solid rgba(34, 197, 94, 0.4);
  color: #bbf7d0;
  text-align: center;
}

.history-panel {
  margin-top: 2.5rem;
}

.history-card {
  background: rgba(15, 23, 42, 0.65);
  border-radius: 1.5rem;
  border: 1px solid rgba(51, 65, 85, 0.6);
  padding: 1.5rem;
}

.history-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.history-card__eyebrow {
  text-transform: uppercase;
  font-size: 0.75rem;
  color: #94a3b8;
  margin: 0;
}

.history-card__link {
  color: #cbd5f5;
  text-decoration: none;
  font-weight: 600;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.history-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.8rem;
  align-items: flex-start;
  padding: 0.85rem 1rem;
  background: rgba(15, 23, 42, 0.6);
  border-radius: 1rem;
  border: 1px solid rgba(148, 163, 184, 0.2);
}

.history-item__emoji {
  font-size: 1.4rem;
}

.history-item__date {
  margin: 0;
  color: #94a3b8;
  font-size: 0.85rem;
}

.history-item__text {
  margin: 0.25rem 0 0;
  color: #e2e8f0;
  font-size: 0.95rem;
}

.history-item__tag {
  padding: 0.3rem 0.7rem;
  border-radius: 999px;
  border: 1px solid rgba(99, 102, 241, 0.3);
  font-size: 0.78rem;
  color: #cbd5f5;
}

.history-empty {
  color: #94a3b8;
  margin: 0;
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s ease;
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
