<template>
  <div
    class="absolute top-full mt-2 z-50 
           w-[90vw] sm:w-80
           left-1/2 sm:left-auto sm:right-0
           -translate-x-1/2 sm:translate-x-0
           rounded-2xl border border-pc-border bg-pc-surface shadow-lg"
  >
    <!-- Header -->
    <div class="flex items-center justify-between border-b border-pc-border px-4 py-3">
      <span class="text-sm font-semibold text-pc-text">Notifications</span>
      <button class="text-xs font-semibold text-pc-accent-text hover:text-pc-accent" @click="$emit('markAllRead')">
        Mark all read
      </button>
    </div>

    <!-- States -->
    <ul v-if="error" class="p-4 text-center text-sm text-pc-text-muted">
      Unable to load updates. Try again.
    </ul>

    <ul v-else-if="!items.length" class="p-4 text-center text-sm text-pc-text-muted">
      No new updates
    </ul>

    <!-- Notification List -->
    <ul
      v-else
      class="max-h-72 divide-y divide-pc-border overflow-y-auto text-sm text-pc-text-muted scrollbar-plan"
    >
      <li
        v-for="note in items"
        :key="note.id"
        class="p-3 transition-colors duration-150 hover:bg-pc-surface-2"
      >
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <strong class="block break-words text-pc-text">{{ note.title }}</strong>
            <p class="break-words leading-snug text-pc-text-muted">{{ note.message || note.description }}</p>
          </div>
          <span
            v-if="note.date"
            class="shrink-0 whitespace-nowrap text-xs text-pc-text-subtle"
          >
            {{ formatDate(note.date) }}
          </span>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup>
defineProps({
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
