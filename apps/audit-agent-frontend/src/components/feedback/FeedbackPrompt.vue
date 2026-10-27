<template>
  <transition name="fade">
    <div
      v-if="store.promptVisible"
      class="feedback-prompt fixed bottom-6 right-6 z-[45] w-72 rounded-2xl border border-pc-border bg-pc-surface p-4 text-pc-text shadow-pc-card"
    >
      <div class="flex items-center justify-between text-sm text-pc-text-muted">
        <span>Enjoying PlanCraft?</span>
        <button
          type="button"
          class="rounded-lg px-1.5 py-1 text-xs text-pc-text-subtle transition hover:bg-pc-surface-2 hover:text-pc-text focus:outline-none focus:ring-2 focus:ring-pc-accent"
          aria-label="Dismiss feedback prompt"
          @click="store.dismissPrompt"
        >
          ✕
        </button>
      </div>
      <p class="mt-2 text-sm text-pc-text-muted">
        Your feedback keeps the AI sharp. How was this session?
      </p>
      <div class="mt-3 flex items-center justify-between text-xl">
        <button
          v-for="score in scores"
          :key="score.value"
          type="button"
          class="flex h-10 w-10 items-center justify-center rounded-full text-lg transition hover:bg-pc-accent-soft focus:outline-none focus:ring-2 focus:ring-pc-accent"
          :aria-label="`Rate PlanCraft ${score.value} out of 5`"
          @click="handleRating(score.value)"
        >
          {{ score.emoji }}
        </button>
      </div>
      <button
        type="button"
        class="mt-3 w-full rounded-xl border border-pc-border-strong px-3 py-2 text-xs font-semibold uppercase tracking-widest text-pc-text-muted transition hover:bg-pc-surface-2 hover:text-pc-text focus:outline-none focus:ring-2 focus:ring-pc-accent"
        @click="openDrawer"
      >
        Leave feedback
      </button>
    </div>
  </transition>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useFeedbackStore } from '@/stores/feedbackStore'

const store = useFeedbackStore()
const route = useRoute()

const scores = computed(() => [
  { emoji: '😔', value: 1 },
  { emoji: '😐', value: 3 },
  { emoji: '😊', value: 5 },
])

function handleRating(value) {
  store.captureQuickRating(value, { route: route.name || route.path, source: 'prompt' })
}

function openDrawer() {
  store.dismissPrompt()
  store.openDrawer({ route: route.name || route.path, source: 'prompt-button' })
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* The app tab bar is fixed on phones. Keep the prompt fully above it so the
   dismiss and rating controls never become untappable. */
@media (max-width: 767px) {
  .feedback-prompt {
    right: 0.75rem;
    bottom: calc(5.75rem + env(safe-area-inset-bottom, 0px));
    width: min(calc(100vw - 1.5rem), 22rem);
  }
}
</style>
