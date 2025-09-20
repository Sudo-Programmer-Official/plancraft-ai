<template>
  <section class="bg-slate-800/60 p-6 rounded-xl shadow-md">
    <h2 class="text-lg font-semibold text-white">🌙 Evening Reflection</h2>
    <p class="text-gray-400 text-sm mb-3">Wind down, reflect, and note your progress.</p>

    <textarea
      v-model="reflectionText"
      placeholder="What went well? What could be better?"
      rows="3"
      class="w-full p-3 rounded-md bg-slate-900/40 border border-slate-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
    ></textarea>

    <div class="flex gap-3 mt-3">
      <button
        @click="toggleRecording"
        :class="isRecording ? 'bg-red-500' : 'bg-indigo-600'"
        class="px-4 py-2 rounded-md text-white"
      >
        {{ isRecording ? '🎙️ Recording… Tap to Stop' : '🎤 Start Recording' }}
      </button>

      <button
        @click="saveReflection"
        class="bg-green-600 px-4 py-2 rounded-md text-white"
      >
        Save Reflection
      </button>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue'
import { useVoiceRecorder } from '@/composables/useVoiceRecorder'
import { saveEntryToFirebase } from '@/services/firebaseService'

const reflectionText = ref('')
const isRecording = ref(false)

const { startRecording, stopRecording } = useVoiceRecorder(async (raw) => {
  reflectionText.value = raw
})

function toggleRecording() {
  if (isRecording.value) stopRecording()
  else startRecording()
  isRecording.value = !isRecording.value
}

async function saveReflection() {
  if (!reflectionText.value.trim()) return
  const entry = {
    id: crypto.randomUUID(),
    text: reflectionText.value,
    type: 'evening',
    date: new Date().toLocaleString(),
    timestamp: Date.now()
  }
  await saveEntryToFirebase(entry)
  reflectionText.value = ''
}
</script>