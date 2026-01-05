<template>
  <div>
    <div v-if="!tasks.length" class="text-sm text-muted py-2">{{ emptyCopy }}</div>
    <ul v-else class="space-y-2">
      <li
        v-for="task in tasks"
        :key="task.id"
        :class="[
          'flex items-center justify-between gap-3 p-3 rounded-lg border bg-surface',
          highlightDanger && !task.completed ? 'border-danger/40' : 'border-border',
        ]"
      >
        <div class="flex items-start gap-3 flex-1">
          <input
            type="checkbox"
            :checked="task.completed"
            class="mt-1 w-4 h-4 accent-primary cursor-pointer"
            @change="$emit('toggle', task)"
          />
          <div class="space-y-1">
            <p :class="['font-medium', task.completed ? 'line-through text-muted' : 'text-text']">
              {{ task.title }}
            </p>
            <p class="text-xs text-muted">{{ task.date }}</p>
          </div>
        </div>
        <button
          type="button"
          class="text-xs font-semibold text-primary hover:underline"
          @click="$emit('edit', task)"
        >
          Edit
        </button>
      </li>
    </ul>
  </div>
</template>

<script setup>
defineProps({
  tasks: {
    type: Array,
    default: () => [],
  },
  emptyCopy: {
    type: String,
    default: 'No tasks here yet.',
  },
  highlightDanger: {
    type: Boolean,
    default: false,
  },
})

defineEmits(['edit', 'toggle'])
</script>
