<template>
  <el-dialog v-model="localOpen" :title="modalTitle" width="520px" destroy-on-close>
    <div class="space-y-4">
      <div>
        <label class="block text-sm text-slate-400 mb-1">Title</label>
        <el-input v-model="title" placeholder="Task title" clearable />
      </div>

      <div>
        <label class="block text-sm text-slate-400 mb-1">Notes</label>
        <el-input v-model="details" type="textarea" :rows="4" placeholder="Add notes or context" />
      </div>

      <div class="flex items-center gap-3">
        <el-checkbox v-model="done">Mark as Done</el-checkbox>
        <span v-if="isPast" class="text-xs text-yellow-400">Past task — reminders/date changes disabled</span>
      </div>

      <div class="text-xs text-slate-400">
        <div>Task date: <strong>{{ safeDate }}</strong></div>
        <div v-if="isPast">Reminders cannot be edited here. Use Daily view to reschedule.</div>
      </div>
    </div>

    <template #footer>
      <div class="flex gap-2 justify-end">
        <el-button @click="close">Cancel</el-button>
        <el-button type="primary" @click="save">Save</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch, computed } from 'vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  task: { type: Object, default: () => ({}) }
})
const emit = defineEmits(['close', 'saved'])

const localOpen = ref(props.open)
watch(() => props.open, v => { localOpen.value = v })
watch(localOpen, v => { if (!v) emit('close') })

const title = ref('')
const details = ref('')
const done = ref(false)

watch(() => props.task, (t) => {
  title.value = t?.title || ''
  details.value = t?.details || ''
  done.value = !!t?.completed
}, { immediate: true })

const safeDate = computed(() => props?.task?.date || '')
const isPast = computed(() => {
  try {
    if (!props?.task?.date) return false
    const [y,m,d] = String(props.task.date).split('-').map(n=>parseInt(n,10))
    const dt = new Date(y, (m-1), d, 0, 0, 0, 0)
    const today = new Date(); today.setHours(0,0,0,0)
    return dt < today
  } catch { return false }
})

const modalTitle = computed(() => isPast.value ? 'Edit Past Task' : 'Edit Task')

function close() { localOpen.value = false; emit('close') }
function save() {
  const payload = {
    ...props.task,
    title: title.value,
    details: details.value,
    completed: !!done.value,
    // Do not change date/reminders here
  }
  // Add late flag hint for parents to persist if needed
  if (isPast.value && done.value) payload.__wasLate = true
  emit('saved', payload)
  close()
}
</script>

<style scoped>
</style>

