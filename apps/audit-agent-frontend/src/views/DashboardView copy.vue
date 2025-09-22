<template>
  <div class="flex min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-gray-900 text-white">
    <!-- Sidebar -->
    <aside
      :class="[
        'transition-all duration-300 bg-gray-950/70 backdrop-blur-xl',
        sidebarOpen ? 'w-64' : 'w-20'
      ]"
      class="flex flex-col"
    >
      <div class="flex items-center justify-between p-4 border-b border-gray-700">
        <h1 v-if="sidebarOpen" class="text-lg font-bold">🌙 AuditAgent</h1>
        <button @click="sidebarOpen = !sidebarOpen" class="p-2 hover:bg-gray-800 rounded">
          <span v-if="sidebarOpen">⬅️</span>
          <span v-else>➡️</span>
        </button>
      </div>
      <nav class="flex-1 mt-4 space-y-2">
        <button
          v-for="tab in tabs"
          :key="tab.name"
          @click="activeTab = tab.name"
          class="flex items-center gap-3 w-full p-3 rounded transition"
          :class="activeTab === tab.name ? 'bg-indigo-600' : 'hover:bg-gray-800'"
        >
          <span>{{ tab.icon }}</span>
          <span v-if="sidebarOpen">{{ tab.name }}</span>
        </button>
      </nav>
    </aside>

    <!-- Main Content -->
    <div class="flex-1 flex flex-col">
      <!-- Header -->
      <header class="sticky top-0 z-10 bg-gray-950/60 backdrop-blur-xl border-b border-gray-800 p-4 flex justify-between items-center">
        <h2 class="text-2xl font-semibold">{{ activeTab }}</h2>
        <div class="flex items-center gap-4">
          <button @click="openAddModal" class="bg-gray-800 px-4 py-2 rounded hover:bg-indigo-600">➕ Add Task</button>
          <img src="https://i.pravatar.cc/40" alt="avatar" class="rounded-full w-10 h-10" />
        </div>
      </header>

      <!-- Dashboard Cards -->
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
              <div class="flex gap-2">
                <button @click="toggleComplete(task)" class="text-xs px-2 py-1 rounded"
                  :class="task.completed ? 'bg-green-600' : 'bg-red-600'">
                  {{ task.completed ? 'Done' : 'Pending' }}
                </button>
                <button @click="openEditModal(task)" class="text-xs bg-blue-600 px-2 py-1 rounded">✏️</button>
                <button @click="deleteTask(task)" class="text-xs bg-pink-600 px-2 py-1 rounded">🗑️</button>
              </div>
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
              <button @click="openEditModal(task)" class="text-xs bg-blue-600 px-2 py-1 rounded">✏️</button>
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
    </div>

    <!-- Task Modal -->
    <div
      v-if="showModal"
      class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
    >
      <div class="bg-white text-gray-900 p-6 rounded-xl w-full max-w-md">
        <h3 class="text-lg font-bold mb-4">
          {{ editMode ? '✏️ Edit Task' : '➕ New Task' }}
        </h3>
        <div class="space-y-4">
          <input
            v-model="taskForm.text"
            placeholder="Task description"
            class="w-full p-3 border rounded"
          />
          <input
            v-model="taskForm.date"
            type="date"
            class="w-full p-3 border rounded"
          />
        </div>
        <div class="flex justify-end gap-3 mt-6">
          <button @click="closeModal" class="px-4 py-2 rounded bg-gray-300">Cancel</button>
          <button @click="saveTask" class="px-4 py-2 rounded bg-indigo-600 text-white">Save</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore'
import { db, auth } from '@/firebase/init'
import { toLocalDateKey } from '@/utils/dateHelper'
import { useAuthStore } from '@/stores/authStore'

// Pinia auth store instance
const authStore = useAuthStore()

const sidebarOpen = ref(true)
const activeTab = ref('Dashboard')

const showModal = ref(false)
const editMode = ref(false)
const editingTaskId = ref(null)

const tabs = [
  { name: 'Dashboard', icon: '🏠' },
  { name: 'Daily', icon: '📅' },
  { name: 'Weekly', icon: '📆' },
  { name: 'Monthly', icon: '🌙' },
]

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
      const allTasks = snapshot.docs.map(doc => {
        const data = doc.data()
        return { id: doc.id, ...data, date: typeof data.date === 'string' ? data.date : (data.date?.toDate ? toLocalDateKey(data.date.toDate()) : toLocalDateKey(new Date(data.date))) }
      })
      dailyTasks.value = allTasks.filter(t => t.date === toLocalDateKey(today))
      weeklyTasks.value = allTasks.filter(t => {
        // Compare by string key to avoid timezone parsing issues
        const key = t.date
        const days = []
        const d = new Date(startOfWeek)
        while (d <= endOfWeek) { days.push(toLocalDateKey(d)); d.setDate(d.getDate()+1) }
        return days.includes(key)
      })
      monthlyTasks.value = allTasks.filter(t => {
        const key = t.date
        const days = []
        const d = new Date(startOfMonth)
        while (d <= endOfMonth) { days.push(toLocalDateKey(d)); d.setDate(d.getDate()+1) }
        return days.includes(key)
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

  const taskForm = ref({
    text: '',
    date: toLocalDateKey(today),
    completed: false,
  })

function openAddModal() {
  editMode.value = false
  editingTaskId.value = null
    taskForm.value = { text: '', date: toLocalDateKey(today), completed: false }
  showModal.value = true
}

function openEditModal(task) {
  editMode.value = true
  editingTaskId.value = task.id
  taskForm.value = { text: task.text, date: task.date, completed: task.completed }
  showModal.value = true
}

function closeModal() {
  showModal.value = false
}

// async function saveTask() {
//   if (!taskForm.value.text.trim()) return

//   if (editMode.value && editingTaskId.value) {
//     await updateDoc(doc(db, 'tasks', editingTaskId.value), { ...taskForm.value })
//   } else {
//     await addDoc(collection(db, 'tasks'), { ...taskForm.value })
//   }

//   showModal.value = false
// }
async function saveTask() {
  if (!taskForm.value.text.trim()) return

    const payload = {
      text: taskForm.value.text,
      date: taskForm.value.date, // store as YYYY-MM-DD
      completed: taskForm.value.completed,
    }

  if (editMode.value && editingTaskId.value) {
    await updateDoc(doc(db, 'tasks', editingTaskId.value), payload)
  } else {
    await addDoc(collection(db, 'tasks'), {
      ...payload,
      createdAt: new Date(),
      userId: auth.currentUser?.uid || null,
    })
  }

  showModal.value = false
}

async function toggleComplete(task) {
  await updateDoc(doc(db, 'tasks', task.id), { completed: !task.completed })
}

async function deleteTask(task) {
  await deleteDoc(doc(db, 'tasks', task.id))
}
</script>
