<template>
  <div class="flex flex-wrap gap-2 p-3 bg-slate-900/80 border border-slate-800 rounded-xl">
    <button v-for="action in actions" :key="action.label" class="px-3 py-1.5 rounded-lg text-sm bg-slate-800 hover:bg-slate-700 transition" @click="$emit('action', action.type)">
      {{ action.label }}
    </button>
    <div class="ml-auto flex items-center gap-2">
      <slot name="status" />
    </div>
  </div>
</template>

<script setup>
defineProps({
  actions: {
    type: Array,
    default: () => [
      { label: 'Bold', type: 'bold' },
      { label: 'Italic', type: 'italic' },
      { label: 'Link', type: 'link' },
    ],
  },
})

defineEmits(['action'])
</script>
