<template>
  <div class="flex min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-gray-900 text-white">
    <!-- Sidebar (desktop only) -->
    <aside
      class="hidden md:flex flex-col transition-all duration-300 bg-gray-950/70 backdrop-blur-xl"
      :class="sidebarOpen ? 'w-64' : 'w-20'"
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

    <!-- Mobile drawer -->
   <!-- Mobile drawer -->
<transition name="slide">
  <aside
    v-if="mobileMenu"
    class="fixed inset-0 bg-black/50 z-40 md:hidden"
    @click.self="mobileMenu = false"
  >
    <div class="absolute left-0 top-0 bottom-0 w-64 bg-gray-900 p-4 flex flex-col">
      <!-- Header -->
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-lg font-bold">🌙 AuditAgent</h1>
        <button @click="mobileMenu = false" class="p-2 rounded hover:bg-gray-800">
          ✖️
        </button>
      </div>

      <!-- Navigation -->
      <nav class="space-y-2 flex-1">
        <RouterLink
          v-for="tab in tabs"
          :key="tab.name"
          :to="tab.path"
          class="block px-3 py-2 rounded hover:bg-indigo-600"
          @click="mobileMenu = false"
        >
          {{ tab.icon }} {{ tab.name }}
        </RouterLink>
      </nav>

      <!-- Logout -->
      <button
        v-if="authStore.isLoggedIn"
        @click="handleLogout"
        class="mt-6 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg w-full"
      >
        Logout
      </button>
    </div>
  </aside>
</transition>

    <!-- Main Content -->
    <div class="flex-1 flex flex-col w-full">
      <!-- Header -->
      <header
        class="sticky top-0 z-10 bg-gray-950/60 backdrop-blur-xl border-b border-gray-800 p-4 flex justify-between items-center"
      >
        <div class="flex items-center gap-3">
          <!-- Hamburger (mobile only) -->
          <button class="md:hidden p-2 hover:bg-gray-800 rounded" @click="mobileMenu = !mobileMenu">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          </button>
          <h2 class="text-2xl font-semibold capitalize">{{ $route.name }}</h2>
          <span class="text-gray-400 text-sm">
    {{ new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }) }}
  </span>
        </div>

        <!-- Right Section -->
        <div class="flex items-center gap-4">
          <span v-if="authStore.isLoggedIn" class="text-sm text-gray-300">
            {{ authStore.user?.displayName || "Guest" }}
          </span>
          <button
            v-if="authStore.isLoggedIn"
            @click="handleLogout"
            class="hidden md:inline bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg text-sm"
          >
            Logout
          </button>
          <img
            v-if="authStore.isLoggedIn"
            :src="authStore.user?.photoURL || 'https://i.pravatar.cc/40'"
            alt="avatar"
            class="rounded-full w-10 h-10"
          />
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
import { ref } from "vue"
import { useRouter } from "vue-router"
import { useAuthStore } from "@/stores/authStore"

const sidebarOpen = ref(true)   // desktop toggle
const mobileMenu = ref(false)   // mobile drawer toggle

const router = useRouter()
const authStore = useAuthStore()

const tabs = [
  { name: "Dashboard", icon: "🏠", path: "/dashboard" },
  { name: "Daily", icon: "📅", path: "/daily" },
  { name: "Weekly", icon: "📆", path: "/weekly" },
  { name: "Monthly", icon: "🌙", path: "/monthly" },
  { name: "Journal", icon: "📝", path: "/journal" },
]

async function handleLogout() {
  await authStore.logout()
  router.push("/login")
}
</script>

<style>
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease;
}
.slide-enter-from,
.slide-leave-to {
  transform: translateX(-100%);
}
</style>