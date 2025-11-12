<template>
  <transition name="fade">
    <div
      v-if="store.promptVisible"
      class="fixed bottom-6 right-6 z-40 w-72 rounded-2xl border border-white/10 bg-slate-900/95 p-4 text-white shadow-xl backdrop-blur-xl"
    >
      <div class="flex items-center justify-between text-sm text-slate-300">
        <span>Enjoying PlanCraft?</span>
        <button
          class="text-xs text-slate-400 hover:text-white"
          @click="store.dismissPrompt"
        >
          ✕
        </button>
      </div>
      <p class="mt-2 text-sm text-slate-200">
        Your feedback keeps the AI sharp. How was this session?
      </p>
      <div class="mt-3 flex items-center justify-between text-xl">
        <button
          v-for="score in scores"
          :key="score.value"
          class="flex h-10 w-10 items-center justify-center rounded-full text-lg hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-fuchsia-400"
          @click="handleRating(score.value)"
        >
          {{ score.emoji }}
        </button>
      </div>
      <button
        class="mt-3 w-full rounded-xl border border-white/20 px-3 py-2 text-xs uppercase tracking-widest text-slate-200 hover:bg-white/10"
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
</style>
