<template>
  <button
    type="button"
    class="inline-flex items-center gap-3 rounded-full border border-border/70 bg-surface/90 px-3 py-2 text-sm font-medium text-ink shadow-soft hover:bg-surface transition duration-200 hover:-translate-y-[1px] focus:outline-none focus:ring-2 focus:ring-brand/40"
    :aria-label="iconLabel"
    @click="handleToggle"
  >
    <span class="grid h-9 w-9 place-items-center rounded-full bg-brand/15 text-brand shadow-inner">
      <svg
        v-if="theme === 'dark'"
        xmlns="http://www.w3.org/2000/svg"
        class="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364 6.364-1.414-1.414M7.05 7.05 5.636 5.636m12.728 0-1.414 1.414M7.05 16.95l-1.414 1.414M16 12a4 4 0 11-8 0 4 4 0 018 0z"
        />
      </svg>
      <svg
        v-else
        xmlns="http://www.w3.org/2000/svg"
        class="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"
        />
      </svg>
    </span>
    <span class="hidden sm:flex flex-col leading-tight text-left">
      <span class="text-xs text-muted">Theme</span>
      <span class="text-sm font-semibold text-ink">{{ theme === 'dark' ? 'Power (Dark)' : 'Calm (Light)' }}</span>
    </span>
  </button>
</template>

<script setup>
import { computed } from 'vue'
import { useTheme } from '@/composables/useTheme'

const { theme, toggleTheme } = useTheme()

const iconLabel = computed(() =>
  theme.value === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'
)

const handleToggle = () => {
  toggleTheme()
}
</script>
