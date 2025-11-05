<template>
  <div :class="wrapperClass">
    <div :class="bubbleClass">
      <slot>{{ text }}</slot>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  sender: {
    type: String,
    default: 'assistant',
  },
  text: {
    type: String,
    default: '',
  },
})

const isUser = computed(() => props.sender === 'user')

const wrapperClass = computed(() => [
  'flex',
  isUser.value ? 'justify-end' : 'justify-start',
])

const bubbleClass = computed(() => [
  'max-w-[85%] sm:max-w-[70%] px-4 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-md transition-colors duration-200',
  isUser.value
    ? 'bg-gradient-to-br from-indigo-500 via-purple-500 to-indigo-600 text-white rounded-br-md'
    : 'bg-slate-900/80 text-slate-100 border border-slate-700/70 rounded-bl-md',
])
</script>
