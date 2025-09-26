<template>
  <div class="min-h-screen flex flex-col bg-gray-950 text-gray-100">
    <!-- Header -->
    <header class="border-b border-gray-800 bg-gray-900/80 backdrop-blur sticky top-0 z-20">
      <div class="max-w-6xl mx-auto flex items-center justify-between px-4 py-3">
        <!-- Logo + Brand -->
        <router-link to="/" class="flex items-center gap-2 hover:opacity-90 transition">
          <img src="/logo.png" alt="PlanCraftAI Logo" class="h-8 w-8" />
          <span class="font-bold text-lg">PlanCraftAI</span>
        </router-link>

        <!-- Back to App -->
        <router-link
          to="/dashboard"
          class="text-sm px-4 py-2 rounded-lg bg-gradient-to-r from-pink-500 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 text-white font-medium shadow-md transition"
        >
          ← Back to Dashboard
        </router-link>
      </div>
    </header>

    <!-- Main Article -->
    <main class="flex-1">
      <article class="prose prose-invert max-w-3xl mx-auto py-10 px-4">
        <h1>Reduce Overwhelm with a Voice Task Planner (Backed by AI)</h1>
        <p>
          Feeling scattered by to-dos and mental tabs? A voice-first, AI-assisted planner helps you
          capture tasks in seconds, organize them with clarity, and stay focused without the chaos.
        </p>

        <h2>Why Voice Works</h2>
        <ul>
          <li>Capture on the go — no typing required</li>
          <li>Lower friction means you actually log what matters</li>
          <li>Great for quick brain-dumps and mid-day check-ins</li>
        </ul>

        <h2>How AI Keeps You Calm</h2>
        <ul>
          <li>Suggests priorities and “quick wins” to unblock momentum</li>
          <li>Groups tasks by energy or context for smoother flow</li>
          <li>Surfaces a gentle daily focus — no guilt, no noise</li>
        </ul>

        <h2>Try a Gentle Daily Rhythm</h2>
        <ol>
          <li>Morning: speak your top 3 intentions</li>
          <li>Midday: voice a quick check-in</li>
          <li>Evening: reflect for two minutes — no overthinking</li>
        </ol>

        <p>
          With PlanCraftAI, you can plan, journal, and reflect — all in one place. The goal isn’t to
          do more; it’s to feel calmer while doing what matters.
        </p>
      </article>
    </main>

    <!-- Footer -->
    <footer class="border-t border-gray-800 bg-gray-900/80 py-6 mt-10">
      <div class="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-400">
        <p>© {{ new Date().getFullYear() }} PlanCraftAI. All rights reserved.</p>
        <nav class="flex gap-4">
          <router-link to="/privacy" class="hover:text-gray-200 transition">Privacy</router-link>
          <router-link to="/terms" class="hover:text-gray-200 transition">Terms</router-link>
          <router-link to="/contact" class="hover:text-gray-200 transition">Contact</router-link>
        </nav>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { useHead } from '@vueuse/head'

const SITE_URL = import.meta.env.VITE_SITE_URL || 'https://plancraftai.com'
const url = `${SITE_URL}/blog/voice-task-planner-benefits`

const title = 'Reduce Overwhelm with a Voice Task Planner (Backed by AI)'
const description = 'Capture tasks by speaking, get AI suggestions, and focus on calm productivity.'

useHead({
  title: `${title} | PlanCraftAI`,
  meta: [
    { name: 'description', content: description },
    { name: 'keywords', content: 'voice task planner, journaling insights app, habit tracking with AI, reduce overwhelm' },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:type', content: 'article' },
    { property: 'og:url', content: url }
  ],
  link: [{ rel: 'canonical', href: url }],
  script: [
    {
      type: 'application/ld+json',
      children: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: title,
        description,
        author: {
          '@type': 'Person',
          name: 'PlanCraftAI'
        },
        mainEntityOfPage: url,
        inLanguage: 'en',
        publisher: {
          '@type': 'Organization',
          name: 'PlanCraftAI'
        }
      })
    }
  ]
})
</script>

<style scoped>
.prose :where(h1, h2, h3) {
  color: #e5e7eb;
}
</style>