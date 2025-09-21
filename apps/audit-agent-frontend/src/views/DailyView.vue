<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-950 px-4 sm:px-6 py-8 text-white">
    <GuestBanner :isGuest="authStore.guest" @login="redirectToLogin" />
    <!-- Header -->
    <header class="text-center mb-12">
      <h1 class="text-3xl sm:text-4xl font-bold">Today's Tasks</h1>
      <p class="text-indigo-300">Plan, act, and reflect — one day at a time.</p>
    </header>
    <!-- Main Content -->
    <main class="max-w-4xl mx-auto space-y-10">
      <MorningSection />
      <TaskBoard />
      <EveningSection />
    </main>
  </div>
</template>

<script setup>
import draggable from "vuedraggable"
import { ref, onMounted } from "vue"
import { fetchTasks, addTaskToFirebase, updateTaskInFirebase } from "@/services/firebaseService"
import MorningSection from "@/components/MorningSection.vue"
import TaskBoard from "@/components/TaskBoard.vue"
import EveningSection from "@/components/EveningSection.vue"
import GuestBanner from "@/components/GuestBanner.vue"

const tasks = ref([])
import { useAuthStore } from '@/stores/authStore'
const authStore = useAuthStore()

onMounted(async () => {
  tasks.value = await fetchTasks()
})

function redirectToLogin() {
  window.location.href = "/login"
}

async function addTask() {
  const newTask = {
    title: "New Task",
    details: "",
    completed: false,
    date: new Date().toISOString().split("T")[0],
    order: tasks.value.length,
    logs: []
  }
  const saved = await addTaskToFirebase(newTask)
  tasks.value.push(saved)
}

async function toggleComplete(task) {
  await updateTaskInFirebase(task)
}

async function updateTask(task) {
  await updateTaskInFirebase(task)
}

async function addLog(task) {
  if (!task.newLog) return
  task.logs = [...(task.logs || []), { text: task.newLog, createdAt: Date.now() }]
  task.newLog = ""
  await updateTaskInFirebase(task)
}

async function updateOrder() {
  tasks.value.forEach(async (task, index) => {
    task.order = index
    await updateTaskInFirebase(task)
  })
}
</script>