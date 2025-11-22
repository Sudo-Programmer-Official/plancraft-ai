<template>
  <RouterLink
    :to="to"
    class="group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition-colors"
    :class="isActive ? 'bg-indigo-600/90 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-200 hover:bg-slate-800/80'"
  >
    <span class="text-lg">{{ icon }}</span>
    <span class="hidden lg:inline">{{ label }}</span>
  </RouterLink>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, RouterLink } from 'vue-router'

const props = defineProps({
  to: { type: [String, Object], required: true },
  icon: { type: String, default: '•' },
  label: { type: String, required: true },
})

const route = useRoute()
const isActive = computed(() => {
  const target = typeof props.to === 'string' ? props.to : props.to?.path
  return target ? route.path.startsWith(target) : false
})
</script>
