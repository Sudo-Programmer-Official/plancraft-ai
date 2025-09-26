<template>
  <main class="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-900">
    <!-- Hero Header -->
    <header class="text-center py-12">
      <h1 class="text-4xl sm:text-5xl font-bold text-white mb-3">Stories & Guides</h1>
      <p class="text-indigo-200 max-w-xl mx-auto text-lg">
        Gentle insights on planning, journaling, and calm productivity.
      </p>
    </header>

    <!-- Blog List -->
    <section class="max-w-4xl mx-auto px-6 pb-16">
      <ul class="space-y-6">
        <li
          v-for="post in posts"
          :key="post.slug"
          class="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 
                 hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-500/30 
                 transition transform hover:-translate-y-1"
        >
          <RouterLink :to="`/blog/${post.slug}`" class="block">
            <h2 class="text-2xl font-semibold text-white">{{ post.title }}</h2>
            <p class="text-slate-400 text-sm mt-2 leading-relaxed">{{ post.excerpt }}</p>
          </RouterLink>
        </li>
      </ul>
    </section>

    <!-- Footer -->
    <footer class="border-t border-slate-800 py-8 text-center text-slate-400 text-sm">
      <RouterLink
        to="/"
        class="inline-block px-5 py-2 rounded-lg bg-gradient-to-r from-pink-500 to-indigo-600 
               text-white font-medium shadow-md hover:from-pink-600 hover:to-indigo-700 transition"
      >
        ← Back to App
      </RouterLink>
      <p class="mt-4">© 2025 PlanCraftAI. All rights reserved.</p>
    </footer>
  </main>
</template>

<script setup>
import { useHead } from '@vueuse/head'

const SITE_URL = import.meta.env.VITE_SITE_URL || 'https://plancraftai.com'
const routePath = '/blog'

useHead({
  title: 'Planner Blog – AI Planning, Journaling, Productivity',
  meta: [
    { name: 'description', content: 'Guides and stories about AI planning, journaling workflows, and peaceful productivity.' },
    { name: 'keywords', content: 'planner blog, journaling insights app, voice task planner, habit tracking with AI' },
    { property: 'og:title', content: 'PlanCraftAI Blog' },
    { property: 'og:description', content: 'Learn how to plan, reflect, and focus with gentle AI support.' },
    { property: 'og:type', content: 'website' }
  ],
  link: [{ rel: 'canonical', href: `${SITE_URL}${routePath}` }]
})

const posts = [
  {
    slug: 'voice-task-planner-benefits',
    title: 'Reduce Overwhelm with a Voice Task Planner (Backed by AI)',
    excerpt: 'Capture tasks by speaking, get smart suggestions, and stay focused with gentle guidance.'
  },
  {
    slug: 'mvp-cost-guide-2025',
    title: 'MVP Cost Guide 2025 – Build Smarter, Spend Less',
    excerpt: 'A transparent breakdown of what it takes to ship your MVP in 2025.'
  }
]
</script>