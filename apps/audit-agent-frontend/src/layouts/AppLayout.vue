<!-- src/layouts/AppLayout.vue -->
<template>
  <div class="flex min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-gray-900 text-white">
    <!-- Sidebar -->
    <aside
      :class="[
        'transition-all duration-300 bg-gray-950/70 backdrop-blur-xl',
        sidebarOpen ? 'w-64' : 'w-20'
      ]"
      class="flex flex-col"
    >
      <div class="flex items-center justify-between p-4 border-b border-gray-700">
        <h1 v-if="sidebarOpen" class="text-lg font-bold">🌙 AuditAgent</h1>
        <button @click="sidebarOpen = !sidebarOpen" class="p-2 hover:bg-gray-800 rounded">
          <span v-if="sidebarOpen">⬅️</span>
          <span v-else>➡️</span>
        </button>
      </div>
      <nav class="flex-1 mt-4 space-y-2">
        <RouterLink
          v-for="tab in tabs"
          :key="tab.name"
          :to="tab.path"
          class="flex items-center gap-3 w-full p-3 rounded transition"
          active-class="bg-indigo-600"
        >
          <span>{{ tab.icon }}</span>
          <span v-if="sidebarOpen">{{ tab.name }}</span>
        </RouterLink>
      </nav>
    </aside>

    <!-- Main Content -->
    <div class="flex-1 flex flex-col">
      <!-- Header -->
      <header class="sticky top-0 z-10 bg-gray-950/60 backdrop-blur-xl border-b border-gray-800 p-4 flex justify-between items-center">
        <h2 class="text-2xl font-semibold capitalize">{{ $route.name }}</h2>
        <div class="flex items-center gap-4">
          <TaskDialog /> <!-- extracted Add Task -->
          <img src="https://i.pravatar.cc/40" alt="avatar" class="rounded-full w-10 h-10" />
        </div>
      </header>

      <!-- Dynamic content -->
      <main class="p-6 flex-1 overflow-y-auto">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import TaskDialog from '@/components/TaskDialog.vue'

const sidebarOpen = ref(true)

const tabs = [
  { name: 'Dashboard', icon: '🏠', path: '/dashboard' },
  { name: 'Daily', icon: '📅', path: '/daily' },
  { name: 'Weekly', icon: '📆', path: '/weekly' },
  { name: 'Monthly', icon: '🌙', path: '/monthly' },
  { name: 'Journal', icon: '📝', path: '/journal' },
]
</script>