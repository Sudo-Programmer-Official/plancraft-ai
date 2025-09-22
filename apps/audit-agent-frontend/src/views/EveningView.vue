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
      <el-button
        @click="saveReflection"
        class="w-full sm:w-auto px-4 py-2 rounded-lg text-white font-medium shadow-md
         bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500
         hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600
         transition-all duration-200"
      >
        Save Reflection
      </el-button>
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