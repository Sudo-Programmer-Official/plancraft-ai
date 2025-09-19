<template>
  <div>
    <!-- Open Button -->
    <button
      @click="openModal"
      class="bg-gray-800 px-4 py-2 rounded hover:bg-indigo-600 transition"
    >
      ➕ Add Task
    </button>

    <!-- Modal -->
    <div
      v-if="showModal"
      class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999]"
    >
      <div class="bg-white text-gray-900 p-6 rounded-xl w-full max-w-md relative z-[10000]">
        <h3 class="text-lg font-bold mb-4">
          {{ editMode ? '✏️ Edit Task' : '➕ New Task' }}
        </h3>

        <!-- Form -->
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

        <!-- Actions -->
        <div class="flex justify-end gap-3 mt-6">
          <button @click="closeModal" class="px-4 py-2 rounded bg-gray-300">Cancel</button>
          <button
            @click="saveTask"
            class="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore'
import { db, auth } from '@/firebase/init'

/**
 * Props (optional if you also want to reuse for editing tasks)
 */
const props = defineProps({
  task: { type: Object, default: null }
})
const emit = defineEmits(['saved'])

const showModal = ref(false)
const editMode = ref(false)
const editingTaskId = ref(null)

const today = new Date().toISOString().split('T')[0]

const taskForm = ref({
  text: '',
  date: today,
  completed: false,
})

/**
 * Open Modal (supports edit or new)
 */
function openModal(task = null) {
  showModal.value = true
  if (task) {
    editMode.value = true
    editingTaskId.value = task.id
    taskForm.value = {
      text: task.text,
      date: task.date,
      completed: task.completed ?? false,
    }
  } else {
    editMode.value = false
    editingTaskId.value = null
    taskForm.value = {
      text: '',
      date: today,
      completed: false,
    }
  }
}

/**
 * Close Modal
 */
function closeModal() {
  showModal.value = false
}

/**
 * Save Task (new or update)
 */
async function saveTask() {
  if (!taskForm.value.text.trim()) return

  const payload = {
    text: taskForm.value.text,
    date: taskForm.value.date,
    completed: taskForm.value.completed,
    userId: auth.currentUser?.uid || null,
    createdAt: new Date(),
  }

  if (editMode.value && editingTaskId.value) {
    await updateDoc(doc(db, 'tasks', editingTaskId.value), payload)
  } else {
    await addDoc(collection(db, 'tasks'), payload)
  }

  emit('saved') // ✅ notify parent to refresh
  closeModal()
}
</script>