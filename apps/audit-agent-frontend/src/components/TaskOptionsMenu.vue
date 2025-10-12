<template>
  <div class="relative inline-block text-left">
    <button @click="open = !open" class="px-2 py-1 rounded hover:bg-slate-800">⋮</button>
    <div v-if="open" class="absolute right-0 mt-1 w-36 bg-slate-900 border border-slate-700 rounded shadow-lg z-10">
      <button @click="edit" class="w-full text-left px-3 py-2 text-sm hover:bg-slate-800">Edit</button>
      <button @click="toggleDone" class="w-full text-left px-3 py-2 text-sm hover:bg-slate-800">{{ task?.completed ? 'Mark as Pending' : 'Mark as Done' }}</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
const props = defineProps({ task: { type: Object, required: true } })
const emit = defineEmits(['edit', 'toggle'])
const open = ref(false)
function edit(){ open.value=false; emit('edit', props.task) }
function toggleDone(){ open.value=false; emit('toggle', props.task) }
</script>

<style scoped>
</style>

