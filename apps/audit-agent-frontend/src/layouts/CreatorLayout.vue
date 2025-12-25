<template>
  <div class="min-h-screen flex bg-slate-950 text-slate-100">
    <aside class="w-16 sm:w-20 lg:w-64 bg-slate-900/80 backdrop-blur-xl border-r border-slate-800 flex flex-col">
      <div class="flex items-center justify-between px-3 py-4 border-b border-slate-800">
        <RouterLink to="/dashboard" class="flex items-center gap-2 text-sm font-semibold text-indigo-100 hover:text-white">
          <span class="hidden lg:inline">← Exit</span>
          <span class="lg:hidden">←</span>
        </RouterLink>
        <span class="text-xs uppercase tracking-[0.2em] text-slate-400 hidden lg:inline">Creator</span>
      </div>
      <nav class="flex-1 py-4 space-y-2 overflow-y-auto scrollbar-plan">
        <CreatorNavButton to="/creator" icon="🏠" label="Home" />
        <CreatorNavButton to="/creator/calendar" icon="📆" label="Calendar" />
        <CreatorNavButton to="/creator/repurpose" icon="♻️" label="Repurpose" />
        <CreatorNavButton to="/creator/editor/new" icon="✍️" label="Editor" />
        <CreatorNavButton to="/creator/profile" icon="🧠" label="Profile" />
      </nav>
      <div class="p-3 border-t border-slate-800">
        <button
          class="w-full text-sm px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 transition"
          @click="$router.push('/creator/publish/new')"
        >
          Publish
        </button>
      </div>
    </aside>

    <main class="flex-1 min-h-screen">
      <RouterView />
    </main>
  </div>
</template>

<script setup>
import { RouterView, RouterLink } from 'vue-router'
import CreatorNavButton from '@/components/creator/CreatorNavButton.vue'
</script>
