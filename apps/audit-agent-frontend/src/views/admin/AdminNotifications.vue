<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-2xl font-bold">Announcements</h2>
      <button @click="open = true" class="bg-purple-600 hover:bg-purple-700 px-3 py-2 rounded">+ New</button>
    </div>
    <div class="grid grid-cols-1 gap-3">
      <div v-for="n in notes" :key="n.id" class="p-4 rounded-lg bg-white/10 border border-white/10">
        <div class="font-semibold">{{ n.title }}</div>
        <div class="text-sm text-indigo-200">{{ n.message }}</div>
        <div class="text-xs text-gray-400 mt-1">{{ formatDate(n.date) }}</div>
      </div>
    </div>

    <!-- Modal -->
    <div v-if="open" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click.self="open=false">
      <div class="bg-gray-900 border border-gray-700 rounded-lg p-5 w-full max-w-md">
        <h3 class="text-lg font-semibold mb-3">Create Notification</h3>
        <input v-model="form.title" class="w-full mb-2 px-3 py-2 rounded bg-gray-800 border border-gray-700" placeholder="Title" />
        <textarea v-model="form.message" class="w-full mb-3 px-3 py-2 rounded bg-gray-800 border border-gray-700" rows="4" placeholder="Message"></textarea>
        <div class="flex justify-end gap-2">
          <button @click="open=false" class="px-3 py-2 bg-gray-800 rounded">Cancel</button>
          <button @click="createNote" class="px-3 py-2 bg-purple-600 rounded">Save</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { watchNotificationsPublic, createNotification } from '@/services/firebaseService'

const notes = ref([])
const open = ref(false)
const form = ref({ title: '', message: '' })

function formatDate(d) { try { return new Date(d).toLocaleString() } catch { return '' } }

let unsubscribe = null
async function load() {
  try {
    if (unsubscribe) unsubscribe()
    unsubscribe = watchNotificationsPublic((list) => {
      notes.value = list
    })
  } catch (e) {
    ElMessage.error('Failed to load notifications')
  }
}

async function createNote() {
  if (!form.value.title || !form.value.message) return
  try {
    await createNotification({ ...form.value })
    ElMessage.success('Notification created')
    open.value = false
    form.value = { title: '', message: '' }
    // live listener updates automatically
  } catch (e) {
    ElMessage.error('Failed to create notification')
  }
}

onMounted(load)
onUnmounted(() => { if (unsubscribe) unsubscribe() })
</script>
