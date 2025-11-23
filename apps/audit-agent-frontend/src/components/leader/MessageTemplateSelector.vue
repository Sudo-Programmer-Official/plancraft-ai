<template>
  <div class="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
    <div class="flex items-center justify-between">
      <h3 class="text-sm font-semibold text-slate-200">Message Template</h3>
      <span class="text-xs text-slate-500">Pick or edit</span>
    </div>
    <div class="grid sm:grid-cols-2 gap-2">
      <button
        v-for="tpl in templates"
        :key="tpl"
        class="text-left px-3 py-2 rounded-lg bg-slate-800/70 border border-slate-700 hover:border-indigo-500 text-sm"
        @click="select(tpl)"
      >
        {{ tpl }}
      </button>
    </div>
    <textarea
      v-model="text"
      rows="3"
      class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-indigo-500"
      placeholder="Custom message..."
    />
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue'])

const templates = [
  'Hope your day is calm and productive. You’ve got this.',
  'Quick reminder: your focus time starts soon. You’ll finish strong.',
  'Small steps add up. Celebrate a win today.',
  'Happy birthday! Wishing you a joyful year ahead.',
  'Happy anniversary! Cheers to many more years together.',
]

const text = ref(props.modelValue || templates[0])

watch(
  () => props.modelValue,
  (v) => {
    if (v !== undefined && v !== text.value) text.value = v
  },
)

watch(text, (v) => emit('update:modelValue', v))

function select(tpl) {
  text.value = tpl
}
</script>
