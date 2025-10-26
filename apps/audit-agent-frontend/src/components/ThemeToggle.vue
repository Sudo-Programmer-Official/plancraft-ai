<template>
  <button type="button" class="theme-toggle" @click="toggle" :aria-label="ariaLabel">
    <span class="icon" v-if="current === 'dark'">🌙</span>
    <span class="icon" v-else>☀️</span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useUiStore } from '@/stores/uiStore'

const uiStore = useUiStore()

const current = computed(() => uiStore.currentTheme)
const ariaLabel = computed(() => (current.value === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'))

function toggle() {
  uiStore.toggleTheme()
}
</script>

<style scoped>
.theme-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 999px;
  border: 1px solid var(--border-subtle);
  background: var(--bg-surface-alt);
  color: var(--text-primary);
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.theme-toggle:hover {
  transform: translateY(-1px);
  border-color: var(--border-strong);
  box-shadow: 0 10px 24px rgba(99, 102, 241, 0.18);
}

.theme-toggle:active {
  transform: scale(0.96);
}

.icon {
  font-size: 1rem;
  line-height: 1;
}
</style>
