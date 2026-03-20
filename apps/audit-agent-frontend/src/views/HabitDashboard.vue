<template>
  <div class="habit-dashboard px-4 py-6 md:px-8 max-w-6xl mx-auto text-slate-50">
    <header class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
      <div>
        <h2 class="text-3xl font-semibold flex items-center gap-3">
          <span>🏆</span>
          <span>Habit Insights</span>
        </h2>
        <p class="text-slate-300 mt-1">
          Track your streaks, consistency, and get daily encouragement from your AI coach.
        </p>
      </div>
      <div class="flex items-center gap-3">
        <button
          type="button"
          class="flex items-center gap-2 rounded-lg bg-indigo-600/80 hover:bg-indigo-500 px-4 py-2 text-sm font-medium transition"
          @click="refresh"
          :disabled="loading"
        >
          <span v-if="loading" class="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-white/70 border-t-transparent"></span>
          <span v-else>🔄</span>
          <span>{{ loading ? 'Refreshing...' : 'Refresh' }}</span>
        </button>
        <button
          type="button"
          class="flex items-center gap-2 rounded-lg border border-indigo-400/60 px-4 py-2 text-sm font-medium hover:bg-indigo-500/20 transition"
          @click="goToPlanner"
        >
          🗓️ Plan Tomorrow
        </button>
      </div>
    </header>

    <section v-if="loading" class="rounded-2xl bg-slate-900/60 border border-slate-700/60 p-8 text-center">
      <p class="text-slate-300 text-sm uppercase tracking-widest">Loading habit analytics…</p>
    </section>

    <section v-else-if="error" class="rounded-2xl bg-rose-900/40 border border-rose-500/40 p-8">
      <h3 class="text-xl font-semibold text-rose-100 mb-3">Unable to load habits</h3>
      <p class="text-rose-200 text-sm">{{ error }}</p>
    </section>

    <section v-else-if="!summary" class="rounded-2xl bg-slate-900/60 border border-slate-700/60 p-8">
      <h3 class="text-xl font-semibold text-slate-100 mb-3">Keep completing tasks ✨</h3>
      <p class="text-slate-300 text-sm leading-relaxed">
        Start marking tasks as done and your AI coach will build streaks, consistency scores, and personalized voice insights for you.
      </p>
    </section>

    <template v-else>
      <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mb-8">
        <div class="stat-card">
          <header>
            <span class="icon">🔥</span>
            <span class="label">Current Streak</span>
          </header>
          <p class="value">{{ summary.current_streak }} day<span v-if="summary.current_streak !== 1">s</span></p>
          <p class="hint">Best streak: {{ summary.best_streak }} days</p>
        </div>

        <div class="stat-card">
          <header>
            <span class="icon">📈</span>
            <span class="label">Consistency</span>
          </header>
          <p class="value">{{ consistencyPercent }}%</p>
          <p class="hint">Window: {{ windowDays }} days</p>
        </div>

        <div class="stat-card">
          <header>
            <span class="icon">💪</span>
            <span class="label">Habit Strength</span>
          </header>
          <div class="value flex items-center gap-3">
            <span>{{ strengthPercent }}%</span>
            <div class="flex-1 h-2 rounded-full bg-slate-700/60">
              <div
                class="h-full rounded-full bg-gradient-to-r from-green-400 via-yellow-300 to-pink-400 transition-all"
                :style="{ width: strengthPercent + '%' }"
              ></div>
            </div>
          </div>
          <p class="hint">Momentum score based on streak + consistency</p>
        </div>

        <div class="stat-card">
          <header>
            <span class="icon">🕘</span>
            <span class="label">Typical Completion Time</span>
          </header>
          <p class="value">{{ summary.avg_completion_time || '—' }}</p>
          <p class="hint">When you usually wrap tasks</p>
        </div>
      </section>

      <section class="rounded-3xl bg-gradient-to-br from-indigo-900/70 via-purple-900/70 to-slate-900/70 border border-indigo-500/30 p-6 md:p-8 shadow-xl space-y-6">
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 class="text-2xl font-semibold flex items-center gap-3">
              <span>🎧</span>
              <span>Daily Coach</span>
              <span
                v-if="coachToneLabel"
                class="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-500/30 border border-indigo-400/40 uppercase tracking-widest"
              >
                {{ coachToneLabel }}
              </span>
            </h3>
            <p v-if="summary.last_coach_at" class="text-slate-300 text-sm mt-1">
              Last sent {{ relativeCoachTime }}
            </p>
          </div>
          <div class="flex items-center gap-3">
            <button
              type="button"
              class="voice-toggle"
              :class="{ active: isVoiceOn }"
              @click="toggleVoice"
            >
              <span v-if="isVoiceOn">🔊 Voice On</span>
              <span v-else>🔇 Voice Muted</span>
            </button>
            <button
              type="button"
              class="play-button"
              :disabled="!canPlayAudio || voiceLoading"
              @click="playCoachAudio"
            >
              <span v-if="voiceLoading" class="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-white/70 border-t-transparent"></span>
              <span v-else-if="playing">⏸️ Pause</span>
              <span v-else>▶️ Play</span>
            </button>
          </div>
        </div>

        <div v-if="coachMessage" class="bg-slate-900/60 border border-indigo-400/20 rounded-2xl p-5">
          <p class="text-lg leading-relaxed text-slate-100">
            {{ coachMessage }}
          </p>
        </div>
        <div v-else class="bg-slate-900/40 border border-slate-700/50 rounded-2xl p-5 text-slate-300">
          Your coach is standing by. Complete a task today to hear from them tomorrow.
        </div>

        <p v-if="voiceError" class="text-sm text-rose-300">
          {{ voiceError }}
        </p>
      </section>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { fetchHabitSummary, fetchCoachMessage } from '@/services/habitService'

dayjs.extend(relativeTime)

const authStore = useAuthStore()
const router = useRouter()

const summary = ref(null)
const coach = ref(null)
const windowDays = ref(7)
const loading = ref(true)
const error = ref(null)

const COACH_VOICE_RATE =
  Number(import.meta.env.VITE_COACH_VOICE_RATE || import.meta.env.VITE_ASSISTANT_VOICE_RATE || 0.9)

const isVoiceOn = ref(true)
const voiceLoading = ref(false)
const voiceError = ref(null)
const playing = ref(false)
const audioRef = ref(null)
const autoPlayed = ref(false)

const VOICE_PREF_KEY = 'habit_voice_enabled'
const VOICE_PLAY_KEY = 'habit_voice_last_played'

function readVoicePreference() {
  if (typeof window === 'undefined') return true
  try {
    const stored = localStorage.getItem(VOICE_PREF_KEY)
    if (stored == null) return true
    return stored === '1' || stored === 'true'
  } catch {
    return true
  }
}

isVoiceOn.value = readVoicePreference()

function storeVoicePreference(value) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(VOICE_PREF_KEY, value ? '1' : '0')
  } catch {}
}

function lastPlayedValue() {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem(VOICE_PLAY_KEY)
  } catch {
    return null
  }
}

function setLastPlayed(value) {
  if (typeof window === 'undefined') return
  try {
    if (value) localStorage.setItem(VOICE_PLAY_KEY, value)
  } catch {}
}

const consistencyPercent = computed(() =>
  summary.value ? Math.round(Math.max(0, Math.min(1, summary.value.consistency_score || 0)) * 100) : 0,
)
const strengthPercent = computed(() =>
  summary.value ? Math.round(Math.max(0, Math.min(1, summary.value.habit_strength || 0)) * 100) : 0,
)
const coachMessage = computed(() => coach.value?.message || summary.value?.last_coach_message || null)
const coachToneLabel = computed(() => {
  const tone = coach.value?.tone || summary.value?.last_coach_tone
  if (!tone) return null
  if (tone === 'high') return 'High energy'
  if (tone === 'medium') return 'Steady'
  return 'Reflective'
})

const relativeCoachTime = computed(() => {
  const iso = summary.value?.last_coach_at
  if (!iso) return 'recently'
  const parsed = dayjs(iso)
  return parsed.isValid() ? parsed.fromNow() : 'recently'
})

const canPlayAudio = computed(() => Boolean(coach.value?.audioUrl || summary.value?.last_coach_audio_url))

function ensureAudio() {
  const src = coach.value?.audioUrl || summary.value?.last_coach_audio_url
  if (!src) return null
  if (!audioRef.value || audioRef.value.src !== src) {
    if (audioRef.value) {
      audioRef.value.pause()
      audioRef.value.removeAttribute('src')
      try {
        audioRef.value.load()
      } catch {}
    }
    const audio = new Audio(src)
    audio.playbackRate = COACH_VOICE_RATE
    audio.addEventListener('ended', () => {
      playing.value = false
    })
    audio.addEventListener('pause', () => {
      playing.value = false
    })
    audio.addEventListener('error', () => {
      voiceError.value = 'Audio playback failed. Tap play again or check your output device.'
      playing.value = false
    })
    audioRef.value = audio
  }
  return audioRef.value
}

async function playCoachAudio() {
  const audio = ensureAudio()
  if (!audio) {
    voiceError.value = 'No audio available yet.'
    return
  }
  if (playing.value && audio && !audio.paused) {
    audio.pause()
    return
  }
  if (!isVoiceOn.value) {
    toggleVoice()
    if (!isVoiceOn.value) return
  }
  voiceLoading.value = true
  voiceError.value = null
  try {
    const playback = audio.play()
    if (playback && typeof playback.then === 'function') {
      await playback
    }
    playing.value = true
    setLastPlayed(audio.src)
  } catch (err) {
    voiceError.value = err?.message || 'Unable to start playback (browser blocked autoplay).'
  } finally {
    voiceLoading.value = false
  }
}

function toggleVoice() {
  isVoiceOn.value = !isVoiceOn.value
  storeVoicePreference(isVoiceOn.value)
  if (!isVoiceOn.value && audioRef.value) {
    audioRef.value.pause()
    playing.value = false
  }
}

async function loadData() {
  try {
    loading.value = true
    error.value = null
    const userId = authStore?.user?.uid || null
    const [summaryPayload, coachRes] = await Promise.all([
      fetchHabitSummary(userId),
      fetchCoachMessage(userId),
    ])
    summary.value = summaryPayload?.summary || null
    coach.value = coachRes
    if (summaryPayload?.windowDays) windowDays.value = summaryPayload.windowDays
    attemptAutoPlay()
  } catch (err) {
    console.error('[HabitDashboard] load failed', err)
    error.value = err?.message || 'Something went wrong'
  } finally {
    loading.value = false
  }
}

function attemptAutoPlay() {
  if (autoPlayed.value) return
  if (!isVoiceOn.value) return
  const audioSrc = coach.value?.audioUrl || summary.value?.last_coach_audio_url
  if (!audioSrc) return
  const lastCoachIso = summary.value?.last_coach_at
  if (!lastCoachIso) return
  const lastCoach = dayjs(lastCoachIso)
  if (!lastCoach.isValid()) return
  if (dayjs().diff(lastCoach, 'hour') > 24) return
  const alreadyPlayed = lastPlayedValue()
  if (alreadyPlayed === audioSrc) return
  autoPlayed.value = true
  playCoachAudio()
}

function refresh() {
  autoPlayed.value = false
  loadData()
}

function goToPlanner() {
  router.push('/talk-to-planner')
}

watch(
  () => authStore.user?.uid,
  (uid) => {
    if (!uid) return
    loadData()
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  if (audioRef.value) {
    try {
      audioRef.value.pause()
      audioRef.value.removeAttribute('src')
      audioRef.value.load?.()
    } catch {}
  }
})
</script>

<style scoped>
.habit-dashboard {
  min-height: calc(100vh - 120px);
}

.stat-card {
  border-radius: 1.25rem;
  padding: 1.5rem;
  background: linear-gradient(145deg, rgba(79, 70, 229, 0.25), rgba(14, 116, 144, 0.18));
  border: 1px solid rgba(148, 163, 184, 0.25);
  box-shadow: 0 20px 45px rgba(79, 70, 229, 0.18);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.stat-card header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: rgba(226, 232, 240, 0.9);
}

.stat-card .icon {
  font-size: 1.4rem;
}

.stat-card .label {
  font-size: 0.95rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 600;
  color: rgba(226, 232, 240, 0.7);
}

.stat-card .value {
  font-size: 1.85rem;
  font-weight: 700;
  color: #f8fafc;
}

.stat-card .hint {
  font-size: 0.85rem;
  color: rgba(226, 232, 240, 0.65);
}

.voice-toggle {
  border-radius: 999px;
  padding: 0.6rem 1.1rem;
  font-size: 0.85rem;
  border: 1px solid rgba(148, 163, 184, 0.3);
  background: rgba(15, 23, 42, 0.4);
  color: rgba(226, 232, 240, 0.85);
  transition: all 0.2s ease;
}

.voice-toggle:hover {
  background: rgba(99, 102, 241, 0.25);
  border-color: rgba(129, 140, 248, 0.45);
}

.voice-toggle.active {
  background: rgba(99, 102, 241, 0.35);
  border-color: rgba(129, 140, 248, 0.6);
  color: #f8fafc;
  box-shadow: 0 0 14px rgba(99, 102, 241, 0.35);
}

.play-button {
  border-radius: 999px;
  padding: 0.6rem 1.35rem;
  font-size: 0.9rem;
  font-weight: 600;
  background: linear-gradient(120deg, rgba(59, 130, 246, 0.75), rgba(129, 140, 248, 0.8));
  color: white;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.play-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 12px 24px rgba(59, 130, 246, 0.25);
}

.play-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
