<template>
  <div
    class="absolute top-full mt-2 z-50 
           w-[90vw] sm:w-80
           left-1/2 sm:left-auto sm:right-0
           -translate-x-1/2 sm:translate-x-0
           bg-gray-900/95 backdrop-blur-lg border border-gray-700 rounded-xl shadow-2xl"
  >
    <!-- Header -->
    <div class="p-3 border-b border-gray-800 flex items-center justify-between">
      <span class="text-sm font-semibold text-white/90">Notifications</span>
      <button
        class="text-xs text-indigo-300 hover:text-indigo-200"
        @click="$emit('markAllRead')"
      >
        Mark all read
      </button>
    </div>

    <!-- States -->
    <ul v-if="error" class="p-3 text-sm text-amber-300 text-center">
      ⚠ Unable to load notifications. Please refresh.
    </ul>

    <ul v-else-if="!items.length" class="p-3 text-sm text-gray-400 text-center">
      📭 No new updates
    </ul>

    <!-- Notification List -->
    <ul
      v-else
      class="divide-y divide-gray-800 max-h-72 overflow-y-auto text-sm text-gray-300 scrollbar-plan"
    >
      <li
        v-for="note in items"
        :key="note.id"
        class="p-3 hover:bg-gray-800/70 transition-colors duration-150"
      >
        <div class="flex items-start justify-between gap-2">
          <div>
            <strong class="block text-white">{{ note.title }}</strong>
            <p class="text-gray-400 leading-snug">{{ note.message || note.description }}</p>
          </div>
          <span
            v-if="note.date"
            class="text-xs text-gray-500 whitespace-nowrap"
          >
            {{ formatDate(note.date) }}
          </span>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup>
const props = defineProps({
  items: { type: Array, default: () => [] },
  error: { type: Boolean, default: false },
})

function formatDate(d) {
  try {
    const dt = typeof d === 'string' || typeof d === 'number' ? new Date(d) : d
    return dt?.toLocaleDateString?.('en-US', { month: 'short', day: 'numeric' }) || ''
  } catch {
    return ''
  }
}
</script>

<style scoped>
/* Optional: smooth dropdown animation */
@keyframes dropdown-fade {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
div {
  animation: dropdown-fade 0.25s ease-out;
}
</style>
