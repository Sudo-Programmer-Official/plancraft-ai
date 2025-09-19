// journal_features.vue
<template>
  <div class="min-h-screen p-6 md:p-10" :class="darkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-3xl font-bold">📝 Journal View</h1>
      <button @click="toggleDarkMode" class="text-sm bg-gray-200 dark:bg-gray-700 px-3 py-1 rounded">
        {{ darkMode ? 'Light Mode' : 'Dark Mode' }}
      </button>
    </div>

    <div class="grid md:grid-cols-3 gap-6">
      <!-- Left column: Journal Entry Form -->
      <div class="md:col-span-2 bg-gray-50 dark:bg-gray-800 p-6 rounded-xl shadow">
        <div class="mb-4">
          <label class="block font-semibold mb-1">Mood</label>
          <div class="flex gap-3 text-2xl">
            <span v-for="emoji in emojis" :key="emoji" @click="entry.mood = emoji" :class="entry.mood === emoji ? 'scale-125' : 'opacity-50'" class="cursor-pointer">
              {{ emoji }}
            </span>
          </div>
        </div>

        <div class="mb-4">
          <label class="block font-semibold mb-1">What’s on your mind?</label>
          <textarea v-model="entry.text" rows="6" class="w-full p-3 rounded bg-white dark:bg-gray-700 dark:text-white resize-none"></textarea>
        </div>

        <div class="flex items-center justify-between">
          <button @click="toggleVoice" class="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
            🎤 {{ isRecording ? 'Stop' : 'Record' }}
          </button>

          <button @click="saveEntry" class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
            Save Entry
          </button>
        </div>

        <p v-if="analysis" class="mt-4 text-sm italic text-indigo-400">💡 Sentiment: {{ analysis }}</p>
      </div>

      <!-- Right column: Calendar & Entries -->
      <div class="space-y-4">
        <div class="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl shadow">
          <h2 class="font-semibold text-lg mb-2">📅 Calendar (Coming Soon)</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400">You’ll be able to view past journals by date here.</p>
        </div>

        <div class="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl shadow">
          <h2 class="font-semibold text-lg mb-2">🗂 Past Entries</h2>
          <ul class="space-y-2 text-sm max-h-[300px] overflow-y-auto">
            <li v-for="(item, index) in entries" :key="index" class="border-b pb-1">
              <div class="font-medium">{{ item.date }} - {{ item.mood }}</div>
              <div class="text-gray-500 dark:text-gray-400 truncate">{{ item.text }}</div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { saveToFirebase } from '@/services/firebaseService' // pseudo-path, define this later

const darkMode = ref(false)
const toggleDarkMode = () => (darkMode.value = !darkMode.value)

const emojis = ['😀', '😌', '😢', '😡', '🥱']
const isRecording = ref(false)

const entry = ref({
  text: '',
  mood: '',
  date: new Date().toLocaleDateString()
})

const entries = ref([])
const analysis = ref('')

const toggleVoice = () => {
  isRecording.value = !isRecording.value
  // Placeholder for voice handling
  if (isRecording.value) {
    entry.value.text = 'Transcribing voice...' // simulate
  } else {
    entry.value.text += ' (voice input complete)' // simulate
  }
}

const analyzeSentiment = async (text) => {
  // Simulated analysis
  if (!text) return ''
  if (text.includes('happy') || text.includes('grateful')) return 'Positive 😊'
  if (text.includes('sad') || text.includes('tired')) return 'Low energy 😞'
  return 'Neutral 😐'
}

const saveEntry = async () => {
  if (!entry.value.text) return alert('Please write something.')
  analysis.value = await analyzeSentiment(entry.value.text)
  entries.value.unshift({ ...entry.value })
  saveToFirebase(entry.value) // hook: you define this in firebaseService.js
  entry.value = { text: '', mood: '', date: new Date().toLocaleDateString() }
}
</script>