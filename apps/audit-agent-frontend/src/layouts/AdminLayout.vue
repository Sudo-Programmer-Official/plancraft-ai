// ✅ This is the updated AdminLayout.vue that includes all the blog routes from the devtoolkit version
// ✅ Replaces previous layout, keeping PlanCraftAI's sidebar, logout, and structure

<template>
  <div class="flex min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-gray-900 text-white">
    <!-- Sidebar -->
    <aside class="hidden md:flex flex-col w-64 h-screen bg-gray-950/70 border-r border-gray-800">
      <div class="p-4 border-b border-gray-800 font-bold text-lg">🛠 Admin Panel</div>
      <nav class="flex-1 p-3 space-y-1">
        <RouterLink class="flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-800" to="/admin">🧭 <span>Dashboard</span></RouterLink>
        <RouterLink class="flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-800" to="/admin/features">🚀 <span>Features</span></RouterLink>
        <RouterLink class="flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-800" to="/admin/notifications">🔔 <span>Notifications</span></RouterLink>
        <RouterLink class="flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-800" to="/admin/feedback">💬 <span>Feedback</span></RouterLink>
        <RouterLink class="flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-800" to="/admin/users">👤 <span>Users</span></RouterLink>
        <RouterLink class="flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-800" to="/admin/payments">💳 <span>Payments</span></RouterLink>
        <RouterLink class="flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-800" to="/admin/blogs">📝 <span>Blogs</span></RouterLink>
        <RouterLink class="flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-800" to="/admin/settings">⚙️ <span>Settings</span></RouterLink>
      </nav>
      <div class="p-3 border-t border-gray-800 text-xs text-gray-400">PlanCraftAI</div>
    </aside>

    <!-- Mobile drawer trigger -->
    <div class="md:hidden fixed top-3 left-3 z-50">
      <button @click="mobileOpen = true" class="p-2 rounded bg-gray-900/80 border border-gray-800">☰</button>
    </div>

    <transition name="slide">
      <aside v-if="mobileOpen" class="fixed inset-0 z-40 md:hidden" @click.self="mobileOpen = false">
        <div class="absolute left-0 top-0 bottom-0 w-64 bg-gray-900 p-4 flex flex-col">
          <div class="flex justify-between items-center mb-4">
            <strong>Admin</strong>
            <button @click="mobileOpen = false">✖️</button>
          </div>
          <RouterLink class="block px-3 py-2 rounded hover:bg-gray-800" to="/admin" @click="mobileOpen=false">Dashboard</RouterLink>
          <RouterLink class="block px-3 py-2 rounded hover:bg-gray-800" to="/admin/features" @click="mobileOpen=false">Features</RouterLink>
          <RouterLink class="block px-3 py-2 rounded hover:bg-gray-800" to="/admin/notifications" @click="mobileOpen=false">Notifications</RouterLink>
          <RouterLink class="block px-3 py-2 rounded hover:bg-gray-800" to="/admin/feedback" @click="mobileOpen=false">Feedback</RouterLink>
          <RouterLink class="block px-3 py-2 rounded hover:bg-gray-800" to="/admin/users" @click="mobileOpen=false">Users</RouterLink>
          <RouterLink class="block px-3 py-2 rounded hover:bg-gray-800" to="/admin/payments" @click="mobileOpen=false">Payments</RouterLink>
          <RouterLink class="block px-3 py-2 rounded hover:bg-gray-800" to="/admin/blogs" @click="mobileOpen=false">Blogs</RouterLink>
          <RouterLink class="block px-3 py-2 rounded hover:bg-gray-800" to="/admin/settings" @click="mobileOpen=false">Settings</RouterLink>
        </div>
      </aside>
    </transition>

    <!-- Main -->
    <div class="flex-1 flex flex-col">
      <header class="sticky top-0 z-10 bg-gray-950/60 backdrop-blur-lg border-b border-gray-800 p-4 flex items-center justify-between">
        <h1 class="text-xl font-semibold">{{ $route.name || 'Admin' }}</h1>
        <div class="flex items-center gap-3">
          <span class="text-sm text-gray-300">{{ authStore.user?.displayName || 'Admin' }}</span>
          <img :src="authStore.user?.photoURL || 'https://i.pravatar.cc/40'" class="w-9 h-9 rounded-full" />
          <button @click="logout" class="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm">Logout</button>
        </div>
      </header>
      <main class="p-6 flex-1 overflow-y-auto scrollbar-plan">
        <RouterView />
      </main>
      <footer class="py-3 text-center text-xs text-indigo-300 bg-slate-950/95 border-t border-gray-800">
        <div class="max-w-6xl mx-auto px-4">
          <span>© {{ new Date().getFullYear() }} PlanCraftAI • Admin</span>
        </div>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()
const mobileOpen = ref(false)

async function logout() {
  await authStore.logout()
  router.push('/login')
}
</script>

<style>
.slide-enter-active,.slide-leave-active{ transition: transform .25s ease }
.slide-enter-from,.slide-leave-to{ transform: translateX(-100%) }
</style>
