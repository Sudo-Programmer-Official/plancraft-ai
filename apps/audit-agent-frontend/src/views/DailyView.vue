<template>
  <div
    class="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-950 px-4 sm:px-6 py-8 text-white overflow-y-auto scrollbar-plan"
  >
    <GuestBanner :isGuest="authStore.guest" @login="redirectToLogin" />

    <!-- Header -->
    <header class="text-center mb-12">
      <h1 class="text-3xl sm:text-4xl font-bold">Today's Tasks</h1>
      <p class="text-indigo-300">Plan, act, and reflect — one day at a time.</p>
    </header>

    <!-- Main Content -->
    <main class="max-w-4xl mx-auto space-y-10">
      <!-- <section class="bg-white/10 backdrop-blur-md p-6 rounded-2xl shadow-md border border-white/10">
        <h2 class="text-lg sm:text-xl font-semibold mb-3">🌅 Morning Planning</h2>
        <textarea
          v-model="planningInput"
          placeholder="Speak or type your plan for today..."
          rows="3"
          class="w-full p-3 rounded-lg bg-slate-900/40 border border-slate-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-4 resize-none"
        ></textarea>
        <div class="action-row flex flex-col sm:flex-row sm:justify-end sm:items-center gap-3 sm:gap-4">
          <VoiceRecorder @transcribed="handleMorningTranscript" />
          <button @click="generateTasks" class="px-4 py-2 rounded-lg text-white font-medium shadow-md bg-gradient-to-r from-emerald-700 via-teal-800 to-cyan-700 hover:from-emerald-800 hover:via-teal-900 hover:to-cyan-800 transition-all duration-300">
            Generate Tasks
          </button>
        </div>
      </section> -->

      <TaskBoard />

      <!-- <section class="bg-white/10 backdrop-blur-md p-6 rounded-2xl shadow-md border border-white/10">
        <h2 class="text-lg sm:text-xl font-semibold">🌙 Evening Reflection</h2>
        <p class="text-gray-400 text-sm mb-4">Wind down, reflect, and note your progress.</p>
        <textarea
          v-model="reflectionText"
          placeholder="What went well? What could be better?"
          rows="3"
          class="w-full p-3 rounded-lg bg-slate-900/40 border border-slate-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
        ></textarea>
        <p v-if="enhancedText" class="text-indigo-400 text-sm italic mt-2">✨ Enhanced: {{ enhancedText }}</p>
        <div class="action-row flex flex-col sm:flex-row sm:justify-end sm:items-center gap-3 sm:gap-4 mt-4">
          <VoiceRecorder @transcribed="handleEveningTranscript" />
          <button @click="saveReflection" class="px-4 py-2 rounded-lg text-white font-medium shadow-md bg-gradient-to-r from-emerald-700 via-teal-800 to-cyan-700 hover:from-emerald-800 hover:via-teal-900 hover:to-cyan-800 transition-all duration-300">
            💾 Save Reflection
          </button>
        </div>
      </section> -->
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { useHead } from '@vueuse/head'
import { useRoute } from 'vue-router'
import TaskBoard from '@/components/TaskBoard.vue'
import VoiceRecorder from '@/components/VoiceRecorder.vue'
import GuestBanner from '@/components/GuestBanner.vue'
import { generateTasksFromText, enhanceJournal } from '@/services/aiService'
import { saveEntryToFirebase } from '@/services/firebaseService'
import { toLocalDateKey } from '@/utils/dateHelper'
import { useTasks } from '@/composables/useTasks'

const authStore = useAuthStore()
const planningInput = ref('')
const reflectionText = ref('')
const enhancedText = ref('')
const { addTask, loadTasks } = useTasks()

const route = useRoute()
const SITE_URL = import.meta.env.VITE_SITE_URL || 'https://plancraftai.com'

useHead({
  title: 'Daily Tasks – Plan Your Day with AI | PlanCraftAI',
  meta: [
    { name: 'description', content: 'Plan, prioritize, and complete your daily tasks with AI assistance.' },
    { name: 'keywords', content: 'daily planner, voice task planner, AI task planning' },
    { property: 'og:title', content: 'Daily Tasks – PlanCraftAI' },
    { property: 'og:description', content: 'Organize your day with smart insights and journaling.' },
    { property: 'og:type', content: 'website' }
  ],
  link: [{ rel: 'canonical', href: `${SITE_URL}${route.path}` }]
})

onMounted(async () => {
  await loadTasks().catch(() => {})
})

function redirectToLogin() {
  window.location.href = "/login"
}

function handleMorningTranscript(text) {
  planningInput.value = text
}

async function generateTasks() {
  if (!planningInput.value.trim()) return
  try {
    const planDate = toLocalDateKey(new Date())
    const { tasks: generated } = await generateTasksFromText(planningInput.value, {
      planDate,
      debugLabel: 'DailyView',
    })
    for (const [i, t] of generated.entries()) {
      const newTask = {
        title: t,
        details: '',
        completed: false,
        date: toLocalDateKey(new Date()),
        logs: [],
      }
      await addTask(newTask)
    }
    planningInput.value = ''
  } catch (err) {
    console.error('Daily task generation failed:', err)
  }
}

function handleEveningTranscript(raw) {
  reflectionText.value = raw
  enhanceReflection(raw)
}

async function enhanceReflection(raw) {
  try {
    const enhanced = await enhanceJournal(raw)
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
    date: toLocalDateKey(new Date()),
    timestamp: Date.now(),
  }
  await saveEntryToFirebase(entry)
  reflectionText.value = ''
  enhancedText.value = ''
}
</script>

<style scoped>
.action-row {
  flex-direction: column;
}
@media (min-width: 640px) {
  .action-row {
    flex-direction: row;
    align-items: baseline !important;
  }
}
</style>
