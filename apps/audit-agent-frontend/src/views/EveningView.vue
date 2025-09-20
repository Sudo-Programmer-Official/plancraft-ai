<template>
  <section class="mt-12 p-6 bg-slate-800/60 rounded-xl shadow-md">
    <h2 class="text-xl font-bold mb-2">🌙 Evening Reflection</h2>
    <p class="text-slate-400 mb-4">Wind down, reflect, and note your progress.</p>

    <textarea
      v-model="reflection"
      placeholder="What went well? What could be better?"
      rows="3"
      class="w-full p-3 rounded bg-slate-900/70 border border-slate-700 focus:outline-none focus:border-indigo-400"
    ></textarea>

    <div class="flex gap-4 mt-4">
      <button
        @click="saveReflection"
        class="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded text-white"
      >
        Save Reflection
      </button>
    </div>
  </section>
</template>

<script setup>
import { ref } from "vue"
import { saveEntryToFirebase } from "@/services/firebaseService"

const reflection = ref("")

async function saveReflection() {
  await saveEntryToFirebase({
    type: "reflection",
    text: reflection.value,
    createdAt: new Date(),
  })
  reflection.value = ""
}
</script>