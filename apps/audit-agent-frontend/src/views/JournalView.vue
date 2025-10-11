<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-900 px-4 sm:px-6 py-8 text-white">
    <guest-banner :isGuest="authStore.guest" @login="redirectToLogin" />

    <!-- Header -->
    <header class="text-center mb-12">
      <h1 class="text-4xl font-bold mb-2 animate-fade-in">Today's Reflections</h1>
      <p class="text-indigo-200">Write, breathe, and let go — your personal sanctuary awaits.</p>
    </header>

    <!-- 🔹 Mood Filter Chips -->
    <div class="flex justify-center gap-3 mb-8 flex-wrap">
      <button
        v-for="f in filters"
        :key="f.key"
        @click="selectedFilter = f.key"
        class="px-4 py-2 rounded-full border border-indigo-600 text-sm transition"
        :class="selectedFilter === f.key
          ? 'bg-indigo-700 text-white'
          : 'bg-indigo-900/40 text-indigo-300 hover:bg-indigo-800'"
      >
        {{ f.label }}
      </button>
    </div>

    <main class="max-w-4xl mx-auto grid gap-8 animate-slide-up">
      <!-- 🔸 Mood Tracker -->
      <section class="bg-white/10 backdrop-blur-md p-6 rounded-2xl shadow-md border border-white/10">
        <h2 class="text-xl font-semibold mb-4">How are you feeling?</h2>
        <!-- <div class="grid grid-cols-5 gap-3">
          <button
            v-for="mood in moods"
            :key="mood.emoji"
            @click="selectMood(mood)"
            class="p-4 rounded-xl border border-white/20 hover:bg-indigo-600/30 transition flex flex-col items-center"
            :class="{ 'bg-indigo-700/40': selectedMood?.emoji === mood.emoji }"
          >
            <span class="text-3xl">{{ mood.emoji }}</span>
            <p class="text-sm text-indigo-200 mt-1">{{ mood.label }}</p>
          </button>
        </div> -->
      </section>

      <!-- 🔹 Voice Journal -->
      <section class="bg-white/10 backdrop-blur-md p-6 rounded-2xl shadow-md border border-white/10">
        <h2 class="text-xl font-semibold mb-4">Voice Journal</h2>
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
              class="w-full sm:w-auto px-6 py-2 rounded-lg font-medium bg-gradient-to-r from-emerald-600 via-teal-700 to-cyan-700 hover:from-emerald-700 hover:to-cyan-800 transition-all duration-300"
            >
              Save Entry
            </el-button>
          </div>

          <p v-if="enhancedText" class="text-sm text-indigo-300 italic mt-2">
            ✨ Enhanced: {{ enhancedText }}
          </p>
        </div>
      </section>

      <!-- 🔹 Previous Logs with Smooth Scrolling -->
      <section
        v-if="filteredLogs.length"
        class="bg-white/10 backdrop-blur-md p-6 rounded-2xl shadow-md border border-white/10"
      >
        <h2 class="text-xl font-semibold mb-4 flex justify-between items-center">
          <span>Previous Entries</span>
          <span class="text-sm text-indigo-400">({{ filteredLogs.length }})</span>
        </h2>

        <ul class="space-y-4 max-h-[500px] overflow-y-auto pr-1">
          <li
            v-for="log in filteredLogs"
            :key="log.id"
            class="border border-white/10 p-4 rounded-xl text-indigo-200 bg-slate-900/40 hover:bg-indigo-700/30 transition relative"
          >
            <div class="absolute -top-2 -right-2 text-xl opacity-70">
              <span v-if="log.mood?.label === 'Happy'">🌸</span>
              <span v-else-if="log.mood?.label === 'Calm'">🌿</span>
              <span v-else-if="log.mood?.label === 'Sad'">🌧</span>
              <span v-else-if="log.mood?.label === 'Frustrated'">⚡</span>
              <span v-else>🌟</span>
            </div>

            <div class="flex items-center justify-between mb-2">
              <span class="text-xs text-indigo-300">
                {{ new Date(log.timestamp).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) }}
              </span>
              <span class="text-xl">{{ log.mood?.emoji }}</span>
            </div>
            <p class="leading-relaxed">{{ log.text }}</p>

            <!-- Buttons -->
            <div class="flex gap-2 mt-3">
              <button
                @click="copyToClipboard(log.text)"
                class="text-xs px-3 py-1 rounded-lg border border-indigo-500 bg-indigo-900/40 hover:bg-indigo-700 text-indigo-200 transition"
              >
                📋 Copy
              </button>
              <button
                @click="shareEntry(log.text)"
                class="text-xs px-3 py-1 rounded-lg border border-green-500 bg-green-900/40 hover:bg-green-700 text-green-200 transition"
              >
                🔗 Share
              </button>
            </div>
          </li>
        </ul>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { fetchEntries, saveEntryToFirebase } from '@/services/firebaseService'
import { enhanceJournal } from '@/services/aiService'
import VoiceRecorder from '@/components/VoiceRecorder.vue'
import { ElNotification } from 'element-plus'

const authStore = useAuthStore()
const moods = [
  { emoji: '😊', label: 'Happy' },
  { emoji: '😌', label: 'Calm' },
  { emoji: '😢', label: 'Sad' },
  { emoji: '😠', label: 'Frustrated' },
  { emoji: '😐', label: 'Neutral' },
]

const entryText = ref('')
const enhancedText = ref('')
const logs = ref([])
const selectedMood = ref(null)
const selectedFilter = ref('today')

const filters = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'all', label: 'All Time' },
]

onMounted(async () => {
  logs.value = await fetchEntries()
})

// Filtered logs by timeframe
const filteredLogs = computed(() => {
  const now = new Date()
  const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()))
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  return logs.value.filter((l) => {
    const t = new Date(l.timestamp)
    if (selectedFilter.value === 'today') return t.toDateString() === new Date().toDateString()
    if (selectedFilter.value === 'week') return t >= startOfWeek
    if (selectedFilter.value === 'month') return t >= startOfMonth
    return true
  })
})

function selectMood(mood) {
  selectedMood.value = mood
}

function handleTranscript(t) {
  entryText.value = t
}

async function saveEntry() {
  if (!entryText.value.trim()) return
  const enhanced = await enhanceJournal(entryText.value)
  const entry = {
    id: crypto.randomUUID?.() || Date.now(),
    text: enhanced,
    mood: selectedMood.value,
    timestamp: Date.now(),
  }
  await saveEntryToFirebase(entry)
  logs.value.unshift(entry)
  entryText.value = ''
  selectedMood.value = null
  enhancedText.value = ''
  ElNotification({ title: 'Saved', message: 'Your reflection was saved 💫', type: 'success' })
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text)
  ElNotification({ title: 'Copied', message: 'Copied to clipboard!', type: 'info' })
}

function shareEntry(text) {
  if (navigator.share) navigator.share({ title: 'My Reflection', text })
  else copyToClipboard(text)
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>