<template>
  <div class="min-h-screen flex bg-slate-950 text-slate-100">
    <aside class="w-16 sm:w-20 lg:w-64 bg-slate-900/80 border-r border-slate-800 flex flex-col">
      <div class="px-4 py-4 border-b border-slate-800 flex items-center justify-between">
        <RouterLink to="/dashboard" class="text-sm text-indigo-100 hover:text-white">← Home</RouterLink>
        <span class="text-xs uppercase tracking-[0.2em] text-slate-400 hidden lg:inline">Leader</span>
      </div>
      <nav class="flex-1 py-4 space-y-2 overflow-y-auto scrollbar-plan">
        <RouterLink to="/leader" class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-slate-800/80" active-class="bg-indigo-600/80 text-white">
          🏠 <span class="hidden lg:inline">Dashboard</span>
        </RouterLink>
        <RouterLink to="/leader/events" class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-slate-800/80" active-class="bg-indigo-600/80 text-white">
          📅 <span class="hidden lg:inline">Events</span>
        </RouterLink>
        <RouterLink to="/leader/occasions" class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-slate-800/80" active-class="bg-indigo-600/80 text-white">
          🎉 <span class="hidden lg:inline">Occasions</span>
        </RouterLink>
        <RouterLink to="/leader/messages" class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-slate-800/80" active-class="bg-indigo-600/80 text-white">
          💬 <span class="hidden lg:inline">Messages</span>
        </RouterLink>
        <RouterLink to="/leader/issues" class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-slate-800/80" active-class="bg-indigo-600/80 text-white">
          ⚠️ <span class="hidden lg:inline">Issues</span>
        </RouterLink>
        <RouterLink to="/leader/contacts" class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-slate-800/80" active-class="bg-indigo-600/80 text-white">
          👥 <span class="hidden lg:inline">Contacts</span>
        </RouterLink>
        <RouterLink to="/leader/maps" class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-slate-800/80" active-class="bg-indigo-600/80 text-white">
          🗺️ <span class="hidden lg:inline">Maps</span>
        </RouterLink>
      </nav>
    </aside>
    <main class="flex-1 min-h-screen">
      <RouterView />
    </main>
  </div>
</template>

<script setup>
import { RouterLink, RouterView } from 'vue-router'
</script>
