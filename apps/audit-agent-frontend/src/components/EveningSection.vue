<template>
  <section class="bg-white/10 backdrop-blur-md p-6 rounded-2xl shadow-md border border-white/10">
    <h2 class="text-lg sm:text-xl font-semibold">🌙 Evening Reflection</h2>
    <p class="text-gray-400 text-sm mb-4">Wind down, reflect, and note your progress.</p>

    <textarea
      v-model="reflectionText"
      placeholder="What went well? What could be better?"
      rows="3"
      class="w-full p-3 rounded-lg bg-slate-900/40 border border-slate-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
    ></textarea>

    <p v-if="enhancedText" class="text-indigo-400 text-sm italic mt-2">
      ✨ Enhanced: {{ enhancedText }}
    </p>

    <div class="flex flex-wrap gap-3 mt-4">
      <VoiceRecorder @transcribed="handleTranscript" class="flex-1" />
      <button
        @click="saveReflection"
        class="flex-1 bg-green-600 px-4 py-2 rounded-lg text-white hover:bg-green-700"
      >
        Save Reflection
      </button>
    </div>
  </section>
</template>

<script setup>
import { ref } from "vue"
import VoiceRecorder from "@/components/VoiceRecorder.vue"
import { saveEntryToFirebase } from "@/services/firebaseService"
import { enhanceJournal } from "@/services/aiService"
import { useTasks } from "@/composables/useTasks"
const {loadTasks } = useTasks()

const reflectionText = ref("")
const enhancedText = ref("")

function handleTranscript(raw) {
  reflectionText.value = raw
  enhanceReflection(raw)
}

async function enhanceReflection(raw) {
  try {
    const enhanced = await enhanceJournal(raw) // reuse AI enhancer
    enhancedText.value = enhanced
  } catch (err) {
    console.error("Evening enhance failed:", err)
  }
}

async function saveReflection() {
  if (!reflectionText.value.trim()) return

  const entry = {
    id: crypto.randomUUID?.() || Date.now(),
    text: reflectionText.value.trim(),
    enhanced: enhancedText.value || null,
    type: "evening",
    date: new Date().toLocaleString(),
    timestamp: Date.now(),
  }

  await saveEntryToFirebase(entry)
  await loadTasks() // refresh tasks in case of updates
  reflectionText.value = ""
  enhancedText.value = ""
}
</script>