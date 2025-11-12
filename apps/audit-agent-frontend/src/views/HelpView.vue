<template>
  <div class="max-w-2xl mx-auto py-12 px-6 text-white">
    <h1 class="text-2xl font-bold mb-4">💬 Help & Support</h1>
    <p class="text-indigo-200 mb-6">How can we help you today?</p>

    <div class="space-y-4">
      <a
        href="mailto:support@plancraftai.com"
        class="block rounded-lg border border-gray-800 bg-gray-900/70 p-4 transition hover:bg-gray-900"
      >
        📧 Email: support@plancraftai.com
      </a>
      <button
        class="block w-full rounded-lg border border-fuchsia-500/40 bg-fuchsia-500/20 p-4 text-left text-fuchsia-50 transition hover:bg-fuchsia-500/30"
        @click="openFeedback"
      >
        💡 Share feedback directly
        <p class="mt-1 text-xs text-fuchsia-200/80">Tell us what to build next or report any issues.</p>
      </button>
      <a
        href="https://discord.gg/"
        target="_blank"
        class="block rounded-lg border border-gray-800 bg-gray-900/70 p-4 transition hover:bg-gray-900"
      >
        🎮 Discord Community
      </a>
      <a
        href="https://plancraftai.com"
        target="_blank"
        class="block rounded-lg border border-gray-800 bg-gray-900/70 p-4 transition hover:bg-gray-900"
      >
        🌐 Website
      </a>
    </div>
  </div>
</template>

<script setup>
import { useRoute } from 'vue-router'
import { useFeedbackStore } from '@/stores/feedbackStore'

const feedbackStore = useFeedbackStore()
const route = useRoute()

function openFeedback() {
  feedbackStore.openDrawer({ route: route.name || route.path, source: 'help-view' })
}
</script>
