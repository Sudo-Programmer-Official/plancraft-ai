<template>
  <div class="p-6 space-y-6">
    <header class="text-center">
      <h1 class="text-3xl font-bold">🌞 Good Morning</h1>
      <p class="text-gray-400">Here’s your focus for today, {{ todayDate }}</p>
    </header>

    <!-- Focus Tasks -->
    <section class="bg-indigo-600/20 p-6 rounded-xl shadow">
      <h2 class="text-xl font-semibold mb-3">🎯 Top 3 Focus Tasks</h2>
      <ul class="space-y-2">
        <li
          v-for="task in focusTasks"
          :key="task.id"
          class="bg-gray-900/60 p-3 rounded flex justify-between items-center"
        >
          <span>{{ task.text }}</span>
          <button @click="toggleComplete(task)" class="text-xs px-2 py-1 rounded bg-green-500">
            {{ task.completed ? 'Done' : 'Mark Done' }}
          </button>
        </li>
      </ul>
    </section>

    <!-- Other Tasks -->
    <section class="bg-gray-800/40 p-6 rounded-xl shadow">
      <h2 class="text-lg font-semibold mb-3">📋 Other Tasks Today</h2>
      <ul v-if="otherTasks.length" class="space-y-2">
        <li v-for="task in otherTasks" :key="task.id" class="bg-gray-700 p-3 rounded">
          {{ task.text }}
        </li>
      </ul>
      <p v-else class="text-gray-400 text-sm">No other tasks 🎉</p>
    </section>

    <!-- Progress -->
    <section class="bg-gray-900/60 p-6 rounded-xl shadow">
      <h2 class="text-lg font-semibold mb-3">📊 Progress</h2>
      <div class="w-full bg-gray-700 h-3 rounded">
        <div class="h-3 bg-indigo-500 rounded" :style="{ width: progressBarWidth }"></div>
      </div>
      <p class="mt-2 text-sm text-indigo-300">{{ completedCount }}/{{ totalCount }} tasks done</p>
      <p class="mt-1 text-xs italic text-gray-400">💡 Tip: Start with the smallest task to build momentum!</p>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { collection, onSnapshot, updateDoc, doc } from 'firebase/firestore'
import { db } from '@/firebase/init'

const todayDate = new Date().toLocaleDateString()
const today = new Date().toISOString().split('T')[0]
const tasks = ref([])

onMounted(() => {
  const tasksCol = collection(db, 'tasks')
  onSnapshot(tasksCol, (snapshot) => {
    const all = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    tasks.value = all.filter(t => t.date === today)
  })
})

const focusTasks = computed(() => tasks.value.slice(0, 3))
const otherTasks = computed(() => tasks.value.slice(3))
const totalCount = computed(() => tasks.value.length)
const completedCount = computed(() => tasks.value.filter(t => t.completed).length)
const progressBarWidth = computed(() =>
  totalCount.value ? `${(completedCount.value / totalCount.value) * 100}%` : '0%'
)

async function toggleComplete(task) {
  await updateDoc(doc(db, 'tasks', task.id), { completed: !task.completed })
}
</script>