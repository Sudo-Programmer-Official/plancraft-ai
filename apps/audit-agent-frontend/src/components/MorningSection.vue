<template>
  <section class="bg-white/10 backdrop-blur-md p-6 rounded-2xl shadow-md border border-white/10">
    <h2 class="text-lg sm:text-xl font-semibold mb-3">🌅 Morning Planning</h2>

    <textarea
      v-model="planningInput"
      id="planningInput"
      name="planningInput"
      placeholder="Speak or type your plan for today..."
      rows="3"
      class="w-full p-3 rounded-lg bg-slate-900/40 border border-slate-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-4 resize-none"
    ></textarea>

    <div class="action-row flex flex-col sm:flex-row sm:justify-end sm:items-center gap-3 sm:gap-4">
      <!-- Voice Recorder: full width on mobile, shrink to content on desktop -->
      <div class="w-full sm:w-auto sm:flex-none">
        <VoiceRecorder @transcribed="handleTranscript" class="w-full sm:w-auto" />
      </div>

      <!-- Generate button: full width on mobile, auto on desktop, right-aligned -->
      <div class="w-full sm:w-auto sm:flex-none">
        <button
          @click="generateTasks"
          class="w-full sm:w-auto px-4 py-2 rounded-lg text-white font-medium shadow-md
         bg-gradient-to-r from-emerald-700 via-teal-800 to-cyan-700
         hover:from-emerald-800 hover:via-teal-900 hover:to-cyan-800
         transition-all duration-300
         [text-shadow:_0_1px_2px_rgba(0,0,0,0.6)]"
        >
          Generate Tasks
        </button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue'
import VoiceRecorder from '@/components/VoiceRecorder.vue'
import { generateTasksFromText } from '@/services/aiService'
import { addTaskToFirebase } from '@/services/firebaseService'
import { useTasks } from '@/composables/useTasks'
import { toLocalDateKey } from '@/utils/dateHelper'

const { tasks, loadTasks } = useTasks()

const planningInput = ref('')
// No enhanced text shown in Morning Planning by design

function handleTranscript(text) {
  planningInput.value = text
  // Morning view does not show enhanced text; just capture raw
}

async function generateTasks() {
  if (!planningInput.value.trim()) return

  try {
    const items = await generateTasksFromText(planningInput.value)
    for (const [i, t] of items.entries()) {
      const newTask = {
        title: t,
        details: '',
        completed: false,
        date: toLocalDateKey(new Date()),
        order: tasks.value.length + i,
        logs: [],
      }
      const saved = await addTaskToFirebase(newTask)
      tasks.value.push(saved)
    }
  } catch (err) {
    console.error('Task generation failed:', err)
  } finally {
    await loadTasks()
  }
}
</script>
