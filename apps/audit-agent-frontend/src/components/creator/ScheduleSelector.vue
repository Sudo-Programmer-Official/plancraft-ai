<template>
  <div class="space-y-2">
    <label class="text-sm text-slate-200">Schedule</label>
    <div class="flex flex-col sm:flex-row gap-2">
      <input
        type="datetime-local"
        :value="modelValue"
        @input="$emit('update:modelValue', $event.target.value)"
        class="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50"
      />
      <button
        type="button"
        class="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm hover:border-indigo-500"
        @click="$emit('update:modelValue', '')"
      >
        Post now
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  modelValue: { type: String, default: '' },
})

defineEmits(['update:modelValue'])
</script>
