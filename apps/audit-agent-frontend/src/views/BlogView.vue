<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useHead } from '@vueuse/head'

// Static blog imports (can be auto-registered later)
import mvpCostGuide from '@/blogs/mvp-cost-guide-2025.vue'
import voiceTaskPlanner from '@/blogs/voice-task-planner-benefits.vue'

const route = useRoute()

// Map slug → component
const componentMap = {
  'mvp-cost-guide-2025': mvpCostGuide,
  'voice-task-planner-benefits': voiceTaskPlanner,
}

// Resolve component based on slug param
const matchedComponent = computed(() => {
  return componentMap[route.params.slug]
})

// SEO for fallback
useHead({
  title: matchedComponent.value
    ? `Blog | PlanCraftAI`
    : '404 Blog Not Found | PlanCraftAI',
  meta: [
    {
      name: 'description',
      content: matchedComponent.value
        ? 'Explore insights on AI productivity, journaling, and planning.'
        : 'This blog post could not be found on PlanCraftAI.'
    }
  ]
})
</script>

<template>
  <component :is="matchedComponent" v-if="matchedComponent" />

  <!-- Fallback 404 -->
  <div v-else class="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
    <h1 class="text-4xl font-bold text-gray-200 mb-3">404 – Blog Not Found</h1>
    <p class="text-gray-400 mb-6 max-w-md">
      Sorry, the blog post you’re looking for doesn’t exist. It may have been
      moved or deleted.
    </p>
    <router-link
      to="/blog"
      class="px-6 py-2 rounded-lg bg-gradient-to-r from-pink-500 to-indigo-600 text-white shadow-md hover:from-pink-600 hover:to-indigo-700 transition"
    >
      ← Back to Blog Index
    </router-link>
  </div>
</template>