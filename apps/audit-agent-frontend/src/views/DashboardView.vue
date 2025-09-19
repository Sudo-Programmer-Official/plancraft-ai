<!-- src/views/DashboardView.vue -->
<template>
  <main class="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    <!-- Daily Card -->
    <div class="bg-gray-900/80 rounded-xl p-6 shadow-lg hover:shadow-indigo-500/40 transition">
      <h3 class="font-semibold mb-3">📅 Daily Tasks</h3>
      <ul v-if="dailyTasks.length" class="space-y-2 text-sm">
        <li v-for="task in dailyTasks" :key="task.id" class="flex justify-between items-center p-2 rounded bg-gray-800">
          <div class="flex flex-col">
            <span>{{ task.text }}</span>
            <small class="text-gray-400">{{ task.date }}</small>
          </div>
          <button @click="toggleComplete(task)" class="text-xs px-2 py-1 rounded"
            :class="task.completed ? 'bg-green-600' : 'bg-red-600'">
            {{ task.completed ? 'Done' : 'Pending' }}
          </button>
        </li>
      </ul>
      <p v-else class="text-gray-400 text-sm">No tasks today.</p>
    </div>

    <!-- Weekly Card -->
    <div class="bg-gray-900/80 rounded-xl p-6 shadow-lg hover:shadow-purple-500/40 transition">
      <h3 class="font-semibold mb-3">📆 Weekly Overview</h3>
      <p class="text-sm text-gray-400">{{ weeklyTasks.length }} tasks this week</p>
      <ul class="mt-3 space-y-2">
        <li v-for="task in weeklyTasks" :key="task.id" class="p-2 rounded bg-gray-800 flex justify-between">
          {{ task.text }}
        </li>
      </ul>
    </div>

    <!-- Monthly Card -->
    <div class="bg-gray-900/80 rounded-xl p-6 shadow-lg hover:shadow-pink-500/40 transition">
      <h3 class="font-semibold mb-3">🌙 Monthly Goals</h3>
      <p class="text-sm text-gray-400">{{ monthlyTasks.length }} tasks this month</p>
      <div class="h-2 bg-gray-700 rounded mt-2">
        <div
          class="h-2 bg-indigo-500 rounded transition-all duration-500"
          :style="{ width: progressBarWidth }"
        ></div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { collection, onSnapshot, updateDoc, doc } from 'firebase/firestore'
import { db } from '@/firebase/init'

const dailyTasks = ref([])
const weeklyTasks = ref([])
const monthlyTasks = ref([])

const today = new Date()
const startOfWeek = new Date(today)
startOfWeek.setDate(today.getDate() - today.getDay())
const endOfWeek = new Date(startOfWeek)
endOfWeek.setDate(startOfWeek.getDate() + 6)
const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)

const unsubscribe = ref(null)

onMounted(() => {
  const tasksCol = collection(db, 'tasks')
  unsubscribe.value = onSnapshot(tasksCol, (snapshot) => {
    const allTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    dailyTasks.value = allTasks.filter(t => t.date === today.toISOString().split('T')[0])
    weeklyTasks.value = allTasks.filter(t => {
      const d = new Date(t.date)
      return d >= startOfWeek && d <= endOfWeek
    })
    monthlyTasks.value = allTasks.filter(t => {
      const d = new Date(t.date)
      return d >= startOfMonth && d <= endOfMonth
    })
  })
})

onUnmounted(() => {
  if (unsubscribe.value) unsubscribe.value()
})

const progressBarWidth = computed(() => {
  const done = monthlyTasks.value.filter(t => t.completed).length
  const total = monthlyTasks.value.length || 1
  return `${Math.round((done / total) * 100)}%`
})

async function toggleComplete(task) {
  await updateDoc(doc(db, 'tasks', task.id), { completed: !task.completed })
}
</script>