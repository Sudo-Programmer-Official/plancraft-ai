<template>
  <div
    class="absolute right-0 mt-2 w-72 sm:w-80 max-w-[90vw] bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50"
  >
    <div class="p-3 border-b border-gray-800 flex items-center justify-between">
      <span class="text-sm font-semibold">Notifications</span>
      <button class="text-xs text-indigo-300 hover:text-indigo-200" @click="$emit('markAllRead')">
        Mark all read
      </button>
    </div>
    <ul v-if="error" class="p-3 text-sm text-amber-300">
      ⚠ Unable to load notifications. Please refresh.
    </ul>
    <ul v-else-if="!items.length" class="p-3 text-sm text-gray-300">
      📭 No new updates
    </ul>
    <ul v-else class="divide-y divide-gray-800 max-h-72 sm:max-h-80 overflow-y-auto">
      <li
        v-for="note in items"
        :key="note.id"
        class="p-3 hover:bg-gray-800/60 text-sm"
      >
        <div class="flex items-start justify-between gap-2">
          <div>
            <strong class="block">{{ note.title }}</strong>
            <p class="text-gray-400">{{ note.message || note.description }}</p>
          </div>
          <span v-if="note.date" class="text-xs text-gray-500 whitespace-nowrap">{{ formatDate(note.date) }}</span>
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
  } catch { return '' }
}
</script>

<style scoped>
/* no-op */
</style>
