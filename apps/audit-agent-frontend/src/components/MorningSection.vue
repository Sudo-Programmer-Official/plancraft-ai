<template>
  <section class="bg-white/10 backdrop-blur-md p-6 rounded-2xl shadow-md border border-white/10">
    <h2 class="text-lg sm:text-xl font-semibold mb-3">🌅 Morning Planning</h2>

    <textarea
      v-model="planningInput"
      placeholder="Speak or type your plan for today..."
      rows="3"
      class="w-full p-3 rounded-lg bg-slate-900/40 border border-slate-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-4 resize-none"
    ></textarea>

    <div class="flex flex-wrap gap-3">
      <VoiceRecorder @transcribed="handleTranscript" class="flex-1" />
      <button
        @click="generateTasks"
        class="flex-1 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg text-white transition"
      >
        ➕ Generate Tasks
      </button>
    </div>
  </section>
</template>

<script setup>
import { ref } from "vue"
import VoiceRecorder from "@/components/VoiceRecorder.vue"
import { generateTasksFromText } from "@/services/aiService"
import { addTaskToFirebase } from "@/services/firebaseService"
import { useTasks } from "@/composables/useTasks"

const { tasks, loadTasks } = useTasks()

const planningInput = ref("")
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
        details: "",
        completed: false,
        date: new Date().toISOString().split("T")[0],
        order: tasks.value.length + i,
        logs: [],
      }
      const saved = await addTaskToFirebase(newTask)
      tasks.value.push(saved)
    }
  } catch (err) {
    console.error("Task generation failed:", err)
  } finally {
    await loadTasks()
  }
}
</script>
