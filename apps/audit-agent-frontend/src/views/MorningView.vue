<template>
  <section class="mb-8 p-6 bg-slate-800/60 rounded-xl shadow-md">
    <h2 class="text-xl font-bold mb-2">🌅 Morning Planning</h2>
    <p class="text-slate-400 mb-4">Write your plan for today, we’ll split it into tasks.</p>

    <textarea
      v-model="planText"
      placeholder="E.g., Finish feature A, attend class, go for a run..."
      rows="3"
      class="w-full p-3 rounded bg-slate-900/70 border border-slate-700 focus:outline-none focus:border-indigo-400"
    ></textarea>

    <div class="flex gap-4 mt-4">
      <button
        @click="generateTasks"
        class="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded text-white"
      >
        ➕ Generate Tasks
      </button>
    </div>

    <!-- Preview AI tasks -->
    <ul v-if="aiTasks.length" class="mt-4 space-y-2">
      <li
        v-for="(task, i) in aiTasks"
        :key="i"
        class="p-3 bg-slate-700/50 rounded flex justify-between"
      >
        <span>{{ task.title }}</span>
        <button
          @click="saveTask(task)"
          class="text-xs text-indigo-400 hover:underline"
        >
          Save
        </button>
      </li>
    </ul>
  </section>
</template>

<script setup>
import { ref } from "vue"
import { ElNotification } from 'element-plus'
import { addTaskToFirebase } from "@/services/firebaseService"
import { redirectToUpgradeIntent } from '@/services/upgradeIntent'
import { generateTasksFromText } from "@/services/aiService"

const planText = ref("")
const aiTasks = ref([])

async function generateTasks() {
  try {
    const { tasks } = await generateTasksFromText(planText.value)
    aiTasks.value = tasks.map(t => ({ title: t }))
  } catch (err) {
    const status = err?.response?.status
    if (status === 403) {
      const msg = err?.response?.data?.error || 'Daily AI limit reached. Upgrade to Pro to continue.'
      ElNotification({ title: 'Upgrade Required', message: msg, type: 'warning', duration: 3500 })
      try {
        redirectToUpgradeIntent('morning-view')
        if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('upgrade-required', { detail: { source: 'morning-view' } }))
      } catch {}
    } else {
      console.error('AI generation failed:', err)
      ElNotification({ title: 'Error', message: 'Failed to generate tasks. Please try again later.', type: 'error', duration: 3000 })
    }
  }
}

async function saveTask(task) {
  await addTaskToFirebase(task)
}
</script>
