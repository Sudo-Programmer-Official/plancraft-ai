<template>
  <main class="marketing-light min-h-screen bg-slate-950 text-slate-900 flex items-center justify-center px-6">
    <section class="max-w-xl w-full rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
      <p class="text-indigo-300 text-sm tracking-wide uppercase">404</p>
      <h1 class="mt-2 text-3xl font-semibold">Page not found</h1>
      <p class="mt-3 text-slate-300">
        The URL you requested does not exist anymore or may have moved.
      </p>
      <div class="mt-6 flex items-center justify-center gap-3">
        <RouterLink to="/" class="rounded-lg bg-indigo-500 px-4 py-2 text-white hover:bg-indigo-400">
          Go home
        </RouterLink>
        <RouterLink to="/blog" class="rounded-lg border border-white/20 px-4 py-2 hover:bg-white/10">
          Visit blog
        </RouterLink>
      </div>
    </section>
  </main>
</template>

<script setup>
import { RouterLink } from 'vue-router'
import { useSeoMeta } from '@/composables/useSeoMeta'

useSeoMeta({
  title: 'Page Not Found | PlanCraft AI',
  description: 'This page could not be found on PlanCraft AI.',
  canonicalPath: '/404',
  noindex: true,
  pageLabel: '404',
})
</script>
