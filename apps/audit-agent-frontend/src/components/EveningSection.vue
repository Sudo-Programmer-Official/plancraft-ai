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
  
    <div class="action-row flex flex-col sm:flex-row sm:justify-end sm:items-center gap-3 sm:gap-4 mt-4">
      <!-- Voice Recorder: full width on mobile, compact on desktop -->
      <div class="w-full sm:w-auto sm:flex-none">
        <VoiceRecorder surface="evening" @transcribed="handleTranscript" class="w-full sm:w-auto" />
      </div>
  
      <!-- Save Reflection button: right-aligned on desktop -->
      <div class="w-full sm:w-auto sm:flex-none">
        <button
          @click="saveReflection"
          class="w-full sm:w-auto px-4 py-2 rounded-lg text-white font-medium shadow-md
             bg-gradient-to-r from-emerald-700 via-teal-800 to-cyan-700
             hover:from-emerald-800 hover:via-teal-900 hover:to-cyan-800
             transition-all duration-300
             [text-shadow:_0_1px_2px_rgba(0,0,0,0.6)]"
        >
          💾 Save Reflection
        </button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref } from "vue"
import VoiceRecorder from "@/components/VoiceRecorder.vue"
import { saveEntryToFirebase } from "@/services/firebaseService"
import { enhanceJournal } from "@/services/aiService"
import { useTasks } from "@/composables/useTasks"
import { toLocalDateKey } from "@/utils/dateHelper"
const {loadTasks } = useTasks()

const reflectionText = ref("")
const enhancedText = ref("")

function handleTranscript(raw) {
  const text = typeof raw === 'string' ? raw : raw?.text || ''
  reflectionText.value = text
  enhanceReflection(text)
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
      // Store normalized local date string; avoid timezone drift
      date: toLocalDateKey(new Date()),
      timestamp: Date.now(),
    }

  await saveEntryToFirebase(entry)
  await loadTasks() // refresh tasks in case of updates
  reflectionText.value = ""
  enhancedText.value = ""
}
</script>

<style scoped>
.action-row {
  /* Stack vertically on small screens, horizontal on larger */
  /* flex-direction: column; */
}
@media (min-width: 640px) {
  .action-row {
    flex-direction: row;
    align-items: baseline !important;
  }
}
</style>
