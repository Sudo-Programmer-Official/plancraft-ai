<!-- src/views/JournalView.vue -->
<template>
  <div
    class="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-900 px-4 sm:px-6 py-8 text-white"
  >
    <guest-banner :isGuest="authStore.guest" @login="redirectToLogin" />

    <!-- Header -->
    <header class="text-center mb-12">
      <h1 class="text-3xl sm:text-4xl font-bold mb-2 animate-fade-in">
        Today's Reflections
      </h1>
      <p class="text-base sm:text-lg text-indigo-200 animate-fade-in-delay">
        Write, breathe, and let go — your personal sanctuary awaits.
      </p>
      <!-- Daily Quote -->
      <blockquote
        class="mt-4 text-indigo-300 italic text-sm sm:text-base max-w-2xl mx-auto"
      >
        “Every reflection you record is a mirror — showing who you are today,
        guiding who you can become tomorrow.”
      </blockquote>
    </header>

    <main class="max-w-4xl mx-auto grid gap-8 animate-slide-up">
      <!-- Mood Tracker -->
      <section
        class="bg-white/10 backdrop-blur-md p-5 sm:p-6 rounded-2xl shadow-md border border-white/10"
      >
        <h2 class="text-lg sm:text-xl font-semibold mb-4">How are you feeling?</h2>
        <div class="grid grid-cols-5 gap-3">
          <button
            v-for="mood in moods"
            :key="mood.emoji"
            @click="selectMood(mood)"
            class="p-3 sm:p-4 rounded-xl border border-white/20 hover:bg-indigo-600/30 transition flex flex-col items-center"
            :class="{ 'bg-indigo-700/40': selectedMood?.emoji === mood.emoji }"
          >
            <span class="text-2xl sm:text-3xl">{{ mood.emoji }}</span>
            <p class="text-xs sm:text-sm text-indigo-200 mt-1">{{ mood.label }}</p>
          </button>
        </div>
      </section>
        <!-- Journal Snapshot (Bottom) -->
      <section
        v-if="logs.length"
        class="bg-white/10 backdrop-blur-md p-5 sm:p-6 rounded-2xl shadow-md border border-white/10"
      >
        <h2 class="text-lg sm:text-xl font-semibold mb-4">📊 Your Progress</h2>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm sm:text-base mb-4">
          <div class="p-3 rounded-xl bg-slate-900/40 text-center">
            <p class="text-2xl">🔥</p>
            <p class="font-medium">{{ streak }}-day streak</p>
          </div>
          <div class="p-3 rounded-xl bg-slate-900/40 text-center">
            <p class="text-2xl">{{ logs[0].mood?.emoji || "📝" }}</p>
            <p class="font-medium">Last Mood</p>
          </div>
          <div class="p-3 rounded-xl bg-slate-900/40 text-center">
            <p class="text-2xl">📖</p>
            <p class="font-medium">{{ logs.length }} reflections</p>
          </div>
        </div>
        <!-- Friendly Focus -->
        <div class="bg-indigo-900/30 p-3 rounded border border-indigo-600 text-sm text-indigo-200">
          <p><strong>🧭 Focus:</strong> {{ journalFocus }}</p>
        </div>
      </section>

      <!-- Voice Journal -->
      <section
        class="bg-white/10 backdrop-blur-md p-5 sm:p-6 rounded-2xl shadow-md border border-white/10"
      >
        <h2 class="text-lg sm:text-xl font-semibold mb-4">Voice Journal</h2>
        <div class="flex flex-col gap-4">
          <textarea
            v-model="entryText"
            placeholder="What’s on your mind today..."
            rows="4"
            class="w-full p-4 rounded-xl border border-white/20 bg-slate-900/40 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none text-white placeholder-indigo-300"
          ></textarea>

          <div class="flex flex-wrap gap-3">
            <VoiceRecorder @transcribed="handleTranscript" class="flex-1" />
            <el-button
              type="primary"
              @click="saveEntry"
              class="w-full sm:w-auto px-4 py-2 rounded-lg text-white font-medium shadow-md
                     bg-gradient-to-r from-emerald-700 via-teal-800 to-cyan-700
                     hover:from-emerald-800 hover:via-teal-900 hover:to-cyan-800
                     transition-all duration-300
                     [text-shadow:_0_1px_2px_rgba(0,0,0,0.6)]"
            >
              Save Entry
            </el-button>
          </div>

          <p v-if="enhancedText" class="text-sm text-indigo-300 italic mt-2">
            ✨ Enhanced: {{ enhancedText }}
          </p>
        </div>
      </section>

      <!-- Previous Logs -->
      <section
        v-if="logs.length"
        class="bg-white/10 backdrop-blur-md p-5 sm:p-6 rounded-2xl shadow-md border border-white/10"
        ref="logsSection"
      >
        <h2 class="text-lg sm:text-xl font-semibold mb-4">Previous Entries</h2>
        <ul class="space-y-4 max-h-80 overflow-y-auto pr-1">
          <li
            v-for="log in logs"
            :key="log.id"
            class="border border-white/10 p-4 rounded-xl text-sm sm:text-base text-indigo-200 bg-slate-900/40 hover:bg-indigo-700/30 transition relative"
          >
            <!-- Mood flower decoration -->
            <div class="absolute -top-2 -right-2 text-xl opacity-70">
              <span v-if="log.mood?.label === 'Happy'">🌸</span>
              <span v-else-if="log.mood?.label === 'Calm'">🌿</span>
              <span v-else-if="log.mood?.label === 'Sad'">🌧</span>
              <span v-else-if="log.mood?.label === 'Frustrated'">⚡</span>
              <span v-else>🌟</span>
            </div>

            <div class="flex items-center justify-between mb-2">
              <span class="font-medium text-indigo-100 text-xs sm:text-sm">
                {{
                  new Date(log.timestamp).toLocaleDateString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })
                }}
              </span>
              <span class="text-xl">{{ log.mood?.emoji }}</span>
            </div>
            <p class="text-indigo-200 leading-relaxed">{{ log.text }}</p>
             <!-- Copy button -->
      <button
        @click="copyToClipboard(log.text)"
        class="mt-2 text-xs px-3 py-1 rounded-lg border border-indigo-500 bg-indigo-900/40 hover:bg-indigo-700 text-indigo-200 transition"
      >
        📋 Copy
      </button>
      <button
  @click="shareEntry(log.text)"
  class="mt-2 ml-2 text-xs px-3 py-1 rounded-lg border border-green-500 bg-green-900/40 hover:bg-green-700 text-green-200 transition"
>
  🔗 Share
</button>
          </li>
        </ul>
      </section>

      <!-- Journal Snapshot (Bottom) -->
      <!-- <section
        v-if="logs.length"
        class="bg-white/10 backdrop-blur-md p-5 sm:p-6 rounded-2xl shadow-md border border-white/10"
      >
        <h2 class="text-lg sm:text-xl font-semibold mb-4">📊 Your Progress</h2>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm sm:text-base mb-4">
          <div class="p-3 rounded-xl bg-slate-900/40 text-center">
            <p class="text-2xl">🔥</p>
            <p class="font-medium">{{ streak }}-day streak</p>
          </div>
          <div class="p-3 rounded-xl bg-slate-900/40 text-center">
            <p class="text-2xl">{{ logs[0].mood?.emoji || "📝" }}</p>
            <p class="font-medium">Last Mood</p>
          </div>
          <div class="p-3 rounded-xl bg-slate-900/40 text-center">
            <p class="text-2xl">📖</p>
            <p class="font-medium">{{ logs.length }} reflections</p>
          </div>
        </div>
        <div class="bg-indigo-900/30 p-3 rounded border border-indigo-600 text-sm text-indigo-200">
          <p><strong>🧭 Focus:</strong> {{ journalFocus }}</p>
        </div>
      </section> -->
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useHead } from '@vueuse/head'
import { useRoute } from 'vue-router'
import { saveEntryToFirebase, fetchEntries } from '@/services/firebaseService'
import { useVoiceRecorder } from '@/composables/useVoiceRecorder'
import { enhanceJournal } from '@/services/aiService'
import GuestBanner from '@/components/GuestBanner.vue'
import { useAuthStore } from '@/stores/authStore'
import { toLocalDateKey } from '@/utils/dateHelper'
import { ElNotification } from 'element-plus'

const authStore = useAuthStore()

// SEO
const SITE_URL = import.meta.env.VITE_SITE_URL || 'https://plancraftai.com'
const route = useRoute()
useHead({
  title: 'Journal – Reflect with Voice and AI | PlanCraftAI',
  meta: [
    { name: 'description', content: 'Voice journaling with gentle AI enhancements, mood tracking, and insights.' },
    { name: 'keywords', content: 'journaling insights app, voice journal, mood tracker' },
    { property: 'og:title', content: 'Journal – PlanCraftAI' },
    { property: 'og:description', content: 'Write, breathe, and reflect with supportive AI.' },
    { property: 'og:type', content: 'website' }
  ],
  link: [{ rel: 'canonical', href: `${SITE_URL}${route.path}` }]
})

const moods = [
  { emoji: '😊', label: 'Happy' },
  { emoji: '😌', label: 'Calm' },
  { emoji: '😢', label: 'Sad' },
  { emoji: '😠', label: 'Frustrated' },
  { emoji: '😐', label: 'Neutral' },
]

const selectedMood = ref(null)
const entryText = ref('')
const enhancedText = ref('')
const logs = ref([])

const { startRecording, stopRecording } = useVoiceRecorder((raw) => {
  entryText.value = raw
})

function selectMood(mood) {
  selectedMood.value = mood
}
function handleTranscript(text) {
  entryText.value = text
}
function copyToClipboard(text) {
  if (!text) return
  ElNotification({
    title: 'Copied to Clipboard',
    message: 'Your reflection has been copied! ✨',
    type: 'success',
    duration: 2000,
  })
  navigator.clipboard.writeText(text)
  // Alternative with alert fallback
  navigator.clipboard.writeText(text).catch(() => {
    alert('Failed to copy. Please copy manually.')
  });
}

async function saveEntry() {
  if (!entryText.value.trim() && !selectedMood.value) return

  try {
    const enhanced = await enhanceJournal(entryText.value)
    enhancedText.value = enhanced

    const now = new Date()
    const entry = {
      id: crypto.randomUUID?.() || Date.now(),
      date: toLocalDateKey(now),
      mood: selectedMood.value,
      text: enhanced,
      rawText: entryText.value,
      timestamp: now.getTime(),
    }

    await saveEntryToFirebase(entry)
    logs.value.unshift(entry)

    entryText.value = ''
    selectedMood.value = null
    enhancedText.value = ''
  } catch (err) {
    console.error('Enhance failed:', err)
  }
}
function shareEntry(text) {
  if (navigator.share) {
    navigator.share({
      title: "My Reflection 🌱",
      text,
    }).catch(err => console.log("Share canceled", err))
  } else {
    copyToClipboard(text)
  }
}

onMounted(async () => {
  logs.value = await fetchEntries()
})

/* 🔥 Streak Calculation */
const streak = computed(() => {
  if (!logs.value.length) return 0
  const dates = logs.value
    .map((l) => l.date)
    .filter(Boolean)
    .sort((a, b) => new Date(b) - new Date(a))

  let count = 1
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1])
    const curr = new Date(dates[i])
    const diff = (prev - curr) / (1000 * 60 * 60 * 24)
    if (diff === 1) count++
    else break
  }
  return count
})

/* 🧭 Friendly Focus (rule-based) */
const journalFocus = computed(() => {
  if (!logs.value.length) return "Start journaling today — even one line makes a difference 🌱."

  const moods = logs.value.slice(0, 5).map(l => l.mood?.label)
  const moodCounts = moods.reduce((acc, m) => {
    if (m) acc[m] = (acc[m] || 0) + 1
    return acc
  }, {})

  if ((moodCounts["Sad"] || 0) + (moodCounts["Frustrated"] || 0) > 2) {
    return "You've had some heavy days 💜. Try to note one small positive thing today."
  }
  if ((moodCounts["Happy"] || 0) + (moodCounts["Calm"] || 0) > 2) {
    return "Your energy is great 🌸. Keep nurturing what’s working for you."
  }
  if (streak.value >= 3) {
    return "Amazing streak 🔥! Your reflections are shaping a stronger, calmer you."
  }
  return "Take a moment today 🧘 — even a short reflection keeps the habit alive."
})
</script>
