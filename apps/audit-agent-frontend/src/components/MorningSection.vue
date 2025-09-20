<template>
  <section class="bg-slate-800/60 p-6 rounded-xl shadow-md mb-8">
    <h2 class="text-lg font-semibold text-white">🌅 Morning Planning</h2>
    <p class="text-gray-400 text-sm mb-3">Speak or type your plan for today, we'll split it into tasks.</p>

    <textarea
      v-model="planText"
      placeholder="E.g., Finish feature A, attend class, go for a run..."
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
        @click="generateTasks"
        class="bg-green-600 px-4 py-2 rounded-md text-white"
      >
        + Generate Tasks
      </button>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue'
import { useVoiceRecorder } from '@/composables/useVoiceRecorder'
import { generateTasksFromText } from '@/services/aiService'
import { addTaskToFirebase, fetchTasksForToday } from '@/services/firebaseService'
import { useTasks } from '@/composables/useTasks'

const planText = ref('')
const isRecording = ref(false)

const { tasks, loadTasks } = useTasks() // ✅ shared state

const { startRecording, stopRecording } = useVoiceRecorder(async (raw) => {
  planText.value = raw // speech-to-text result
})

function toggleRecording() {
  if (isRecording.value) stopRecording()
  else startRecording()
  isRecording.value = !isRecording.value
}

async function generateTasks() {
  if (!planText.value.trim()) return

  const titles = await generateTasksFromText(planText.value)

  for (const title of titles) {
    await addTaskToFirebase({
      title,
      details: '',
      date: new Date().toISOString().split('T')[0],
      completed: false,
      logs: [],
    })
  }

  // ✅ Refresh tasks immediately
  tasks.value = await fetchTasksForToday()

  planText.value = ''
}
</script>