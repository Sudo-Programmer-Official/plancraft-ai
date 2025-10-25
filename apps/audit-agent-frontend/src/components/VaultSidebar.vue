<template>
  <aside class="vault-sidebar">
    <section class="filter-section">
      <h2>Filter</h2>
      <button
        v-for="option in options"
        :key="option.type"
        class="filter-pill"
        :class="{ active: option.type === activeType }"
        type="button"
        @click="select(option.type)"
      >
        <span class="emoji">{{ option.icon }}</span>
        <span>{{ option.label }}</span>
        <span class="count">{{ option.count }}</span>
      </button>
    </section>

    <section class="status-section">
      <p v-if="refreshing" class="status refreshing">Refreshing vault…</p>
      <p v-else-if="lastFetchAt" class="status">
        Last synced
        <span>{{ formatTimestamp(lastFetchAt) }}</span>
      </p>
      <p v-else class="status muted">Vault not loaded yet.</p>
    </section>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  activeType: string
  counts: { all: number; task: number; meeting: number; chat: number }
  lastFetchAt?: string | null
  refreshing?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:type', type: string): void
}>()

const options = computed(() => [
  { type: 'all', label: 'All items', icon: '🗂️', count: props.counts?.all ?? 0 },
  { type: 'task', label: 'Tasks', icon: '✅', count: props.counts?.task ?? 0 },
  { type: 'chat', label: 'Chats', icon: '💬', count: props.counts?.chat ?? 0 },
  { type: 'meeting', label: 'Meetings', icon: '🗓️', count: props.counts?.meeting ?? 0 },
])

function select(type: string) {
  emit('update:type', type)
}

function formatTimestamp(value?: string | null) {
  if (!value) return 'never'
  try {
    const date = new Date(value)
    return date.toLocaleString()
  } catch {
    return value
  }
}
</script>

<style scoped>
.vault-sidebar {
  width: 220px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 20px;
  background: #ffffff;
  border-right: 1px solid rgba(15, 23, 42, 0.08);
  padding: 20px 16px;
  border-radius: 12px;
  min-height: 0;
}

.filter-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.filter-section h2 {
  margin: 0;
  font-size: 0.95rem;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: rgba(15, 23, 42, 0.55);
}

.filter-pill {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border: 1px solid rgba(99, 102, 241, 0.18);
  background: rgba(99, 102, 241, 0.06);
  color: #312e81;
  padding: 10px 14px;
  border-radius: 14px;
  font-size: 0.92rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.18s ease;
}

.filter-pill .emoji {
  font-size: 1.1rem;
}

.filter-pill .count {
  font-weight: 600;
  font-size: 0.85rem;
  color: rgba(15, 23, 42, 0.55);
}

.filter-pill:hover {
  border-color: rgba(99, 102, 241, 0.3);
  background: rgba(79, 70, 229, 0.12);
  color: #1e1b4b;
}

.filter-pill.active {
  border-color: rgba(79, 70, 229, 0.55);
  background: rgba(79, 70, 229, 0.18);
  color: #1e1b4b;
  box-shadow: 0 10px 24px rgba(79, 70, 229, 0.16);
}

.status-section {
  padding: 14px 12px;
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.04);
}

.status {
  margin: 0;
  font-size: 0.85rem;
  color: rgba(15, 23, 42, 0.7);
  line-height: 1.4;
}

.status span {
  display: block;
  font-weight: 600;
  color: rgba(31, 41, 55, 0.95);
}

.status.refreshing {
  color: #4338ca;
  font-weight: 600;
}

.status.muted {
  color: rgba(15, 23, 42, 0.5);
}

@media (max-width: 1100px) {
  .vault-sidebar {
    display: none;
  }
}
</style>
