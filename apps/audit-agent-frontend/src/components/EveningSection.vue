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

    <!-- Show AI enhanced reflection -->
    <p v-if="enhancedText" class="text-indigo-400 text-sm italic mt-2">
      ✨ Enhanced: {{ enhancedText }}
    </p>

    <div class="flex gap-3 mt-3 flex-wrap">
      <!-- VoiceRecorder (same as Journal page) -->
      <VoiceRecorder @transcribed="handleTranscript" />

      <button
        @click="saveReflection"
        class="bg-green-600 px-4 py-2 rounded-md text-white hover:bg-green-700"
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
  reflectionText.value = ""
  enhancedText.value = ""
}
</script>