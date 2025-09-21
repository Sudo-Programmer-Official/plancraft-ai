<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-900 px-4 sm:px-6 py-8 text-white">
    <!-- Header -->
    <header class="text-center mb-12">
      <h1 class="text-3xl sm:text-4xl font-bold mb-2 animate-fade-in">
        Today's Reflections
      </h1>
      <p class="text-base sm:text-lg text-indigo-200 animate-fade-in-delay">
        Write, breathe, and let go — your personal sanctuary awaits.
      </p>
    </header>

    <main class="max-w-4xl mx-auto grid gap-8 animate-slide-up">
      <!-- Mood Tracker -->
      <section class="bg-white/10 backdrop-blur-md p-5 sm:p-6 rounded-2xl shadow-md border border-white/10">
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

      <!-- Voice Journal -->
      <section class="bg-white/10 backdrop-blur-md p-5 sm:p-6 rounded-2xl shadow-md border border-white/10">
        <h2 class="text-lg sm:text-xl font-semibold mb-4">Voice Journal</h2>
        <div class="flex flex-col gap-4">
          <textarea
            v-model="entryText"
            placeholder="What’s on your mind today..."
            rows="4"
            class="w-full p-4 rounded-xl border border-white/20 bg-slate-900/40 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none text-white placeholder-indigo-300"
          ></textarea>

          <!-- Buttons aligned -->
          <div class="flex flex-wrap gap-3">
            <VoiceRecorder @transcribed="handleTranscript" class="flex-1" />

            <button
              @click="saveEntry"
              :disabled="!entryText.trim() && !selectedMood"
              class="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium shadow transition"
            >
              Save Entry
            </button>
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
            class="border border-white/10 p-4 rounded-xl text-sm sm:text-base text-indigo-200 bg-slate-900/40 hover:bg-indigo-700/30 transition"
          >
            <div class="flex items-center justify-between mb-2">
              <span class="font-medium text-indigo-100 text-xs sm:text-sm">
                {{ log.date }}
              </span>
              <span class="text-xl">{{ log.mood?.emoji }}</span>
            </div>
            <p class="text-indigo-200 leading-relaxed">{{ log.text }}</p>
          </li>
        </ul>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { saveEntryToFirebase, fetchEntries } from '@/services/firebaseService'
import { useVoiceRecorder } from '@/composables/useVoiceRecorder'
import { enhanceJournal } from '@/services/aiService'

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
const logsSection = ref(null)

const { isRecording, startRecording, stopRecording } = useVoiceRecorder((raw) => {
  entryText.value = raw
})

function selectMood(mood) {
  selectedMood.value = mood
}

function handleTranscript(text) {
  entryText.value = text
}

async function saveEntry() {
  if (!entryText.value.trim() && !selectedMood.value) return

  try {
    const enhanced = await enhanceJournal(entryText.value)
    enhancedText.value = enhanced

    const entry = {
      id: crypto.randomUUID?.() || Date.now(),
      date: new Date().toLocaleString(),
      mood: selectedMood.value,
      text: enhanced,
      rawText: entryText.value,
      timestamp: Date.now(),
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

onMounted(async () => {
  logs.value = await fetchEntries()
})
</script>