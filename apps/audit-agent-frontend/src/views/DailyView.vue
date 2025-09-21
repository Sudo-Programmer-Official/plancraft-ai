<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-950 p-6 text-white">
    <!-- Header -->
    <header class="text-center mb-8">
      <h1 class="text-3xl font-bold">Today's Tasks</h1>
      <p class="text-slate-400">Plan, act, and reflect — one day at a time.</p>
    </header>

    <!-- Guest Mode Banner -->
    <div
      v-if="!authStore.isLoggedIn"
      class="bg-yellow-500 text-black px-4 py-2 rounded-lg text-center mb-6 font-medium"
    >
      ⚠️ You're in <strong>Guest Mode</strong>. Tasks are temporary.
      <RouterLink to="/signup" class="underline font-semibold">Sign up</RouterLink> to save them.
    </div>

    <!-- Sections -->
    <MorningSection />
    <TaskBoard
      :tasks="tasks"
      @update="updateTask"
      @toggle="toggleComplete"
      @delete="deleteTask"
    />
    <EveningSection />
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue"
import { useAuthStore } from "@/stores/authStore"
import { fetchTasks, addTaskToFirebase, updateTaskInFirebase } from "@/services/firebaseService"
import { useRoute } from "vue-router"

import MorningSection from "@/components/MorningSection.vue"
import TaskBoard from "@/components/TaskBoard.vue"
import EveningSection from "@/components/EveningSection.vue"

const route = useRoute()
const tasks = ref([])
const authStore = useAuthStore()

onMounted(async () => {
  if (authStore.isLoggedIn) {
    // ✅ Logged-in user → Firestore
    tasks.value = await fetchTasks()
  } else if (route.query.tasks) {
    // ✅ Guest user with tasks from query string
    try {
      const raw = JSON.parse(route.query.tasks)
      tasks.value = raw.map((t, idx) => ({
        id: `guest-${Date.now()}-${idx}`,
        title: typeof t === "string" ? t : t.title || "Untitled Task",
        details: typeof t === "object" ? t.details || "" : "",
        completed: false,
        logs: [],
        date: new Date().toISOString().split("T")[0],
        order: idx,
      }))
      localStorage.setItem("guestTasks", JSON.stringify(tasks.value))
    } catch (err) {
      console.error("❌ Failed to parse guest tasks:", err)
    }
  } else {
    // ✅ Guest fallback → load from localStorage
    const cached = localStorage.getItem("guestTasks")
    tasks.value = cached ? JSON.parse(cached) : []
  }
})

async function updateTask(task) {
  if (authStore.isLoggedIn) {
    await updateTaskInFirebase(task)
  } else {
    localStorage.setItem("guestTasks", JSON.stringify(tasks.value))
  }
}

async function toggleComplete(task) {
  task.completed = !task.completed
  if (authStore.isLoggedIn) {
    await updateTaskInFirebase(task)
  } else {
    localStorage.setItem("guestTasks", JSON.stringify(tasks.value))
  }
}
</script>