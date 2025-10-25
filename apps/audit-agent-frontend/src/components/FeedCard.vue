<template>
  <article class="feed-card">
    <header class="feed-card__header">
      <span class="feed-card__type">{{ item.type }}</span>
      <span class="feed-card__timestamp">{{ formattedTime }}</span>
    </header>
    <h3 v-if="item.title" class="feed-card__title">{{ item.title }}</h3>
    <p v-if="item.summary" class="feed-card__summary">{{ item.summary }}</p>
    <p v-else-if="item.content" class="feed-card__summary">{{ item.content }}</p>
    <footer v-if="metadataChips.length" class="feed-card__meta">
      <span v-for="chip in metadataChips" :key="chip" class="feed-card__chip">{{ chip }}</span>
    </footer>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface FeedCardItem {
  id: string
  type: string
  title?: string | null
  content?: string | null
  summary?: string | null
  createdAt?: any
  metadata?: Record<string, any>
}

const props = defineProps<{ item: FeedCardItem }>()

function toDate(value: any): Date | null {
  if (!value) return null
  if (typeof value.toDate === 'function') return value.toDate()
  if (value.seconds) return new Date(value.seconds * 1000)
  if (value instanceof Date) return value
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const formattedTime = computed(() => {
  const date = toDate(props.item.createdAt)
  return date ? date.toLocaleString() : 'Unknown time'
})

const metadataChips = computed(() => {
  const metadata = props.item.metadata || {}
  const chips: string[] = []
  if (metadata.projectId) chips.push(`Project ${metadata.projectId}`)
  if (metadata.roomName) chips.push(`Room ${metadata.roomName}`)
  if (metadata.status) chips.push(`Status ${metadata.status}`)
  if (Array.isArray(metadata.attendees) && metadata.attendees.length) {
    chips.push(`${metadata.attendees.length} attendees`)
  }
  return chips
})
</script>

<style scoped>
.feed-card {
  background: rgba(15, 23, 42, 0.9);
  border: 1px solid rgba(99, 102, 241, 0.1);
  border-radius: 16px;
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: border 0.18s ease, background 0.18s ease;
}
.feed-card:hover {
  background: rgba(30, 41, 59, 0.92);
  border-color: rgba(129, 140, 248, 0.3);
}
.feed-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(129, 140, 248, 0.9);
}
.feed-card__type {
  font-weight: 600;
}
.feed-card__timestamp {
  color: rgba(148, 163, 184, 0.8);
  font-size: 0.74rem;
}
.feed-card__title {
  margin: 0;
  font-size: 1.05rem;
  color: #ffffff;
}
.feed-card__summary {
  margin: 0;
  font-size: 0.95rem;
  color: rgba(226, 232, 240, 0.86);
  line-height: 1.5;
}
.feed-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.feed-card__chip {
  background: rgba(79, 70, 229, 0.18);
  color: rgba(196, 181, 253, 0.92);
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 0.75rem;
  letter-spacing: 0.03em;
}
</style>
