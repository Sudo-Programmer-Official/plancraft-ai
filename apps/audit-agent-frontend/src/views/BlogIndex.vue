<template>
  <div
    class="min-h-screen flex flex-col bg-gradient-to-br from-[#1e1b4b] via-[#312e81] to-[#4c1d95] text-slate-100 font-inter"
  >
    <!-- 🌿 Header -->
    <header
      class="py-8 px-6 md:px-12 border-b border-white/10 backdrop-blur-sm flex flex-col md:flex-row items-center justify-between"
    >
      <!-- Logo + Title -->
      <router-link
        to="/"
        class="flex items-center gap-3 hover:opacity-90 transition"
      >
        <img
          src="/logo.png"
          alt="PlanCraftAI"
          class="h-10 w-10 rounded-full shadow-md"
        />
        <div>
          <h1 class="text-3xl font-semibold tracking-wide">PlanCraftAI Blog</h1>
          <p class="text-sm text-slate-400">
            Insights, productivity tips & AI planning stories
          </p>
        </div>
      </router-link>

      <!-- Admin Action -->
      <div class="mt-4 md:mt-0">
        <el-button
          v-if="isAdmin"
          size="small"
          type="primary"
          class="shadow-md"
          @click="genIdea"
        >
          💡 Generate New Idea
        </el-button>
      </div>
    </header>

    <!-- ✨ Main Content -->
    <main class="flex-1 px-6 md:px-12 py-10">
      <div v-if="loading" class="text-slate-400 text-center py-10">
        Loading articles...
      </div>

      <div
        v-else
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8"
      >
        <router-link
          v-for="b in blogs"
          :key="b.id"
          :to="{ name: 'blog-post', params: { slug: b.slug } }"
          class="group block rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-indigo-400 p-5 transition-all shadow-lg backdrop-blur-md"
        >
          <!-- Cover -->
          <div class="overflow-hidden rounded-xl mb-4 h-44">
            <img
              v-if="b.coverImage"
              :src="b.coverImage"
              alt="cover"
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div
              v-else
              class="h-full flex items-center justify-center text-slate-500 text-sm bg-slate-900/40"
            >
              No Image
            </div>
          </div>

          <!-- Title + Summary -->
          <h2 class="text-xl font-semibold mb-1 text-white leading-snug">
            {{ b.title }}
          </h2>
          <p class="text-sm text-slate-300 line-clamp-3 mb-3">
            {{ b.summary }}
          </p>

          <!-- Tags -->
          <div class="flex flex-wrap gap-2">
            <span
              v-for="t in (b.tags || [])"
              :key="t"
              class="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full"
            >
              #{{ t }}
            </span>
          </div>

          <!-- Meta -->
          <div
            class="mt-3 text-xs text-slate-400 flex justify-between items-center"
          >
            <span>By {{ b.author || 'PlanCraftAI' }}</span>
            <span>{{ formatDate(b.updated_at || b.created_at) }}</span>
          </div>
        </router-link>
      </div>
    </main>

    <!-- 🌙 Footer -->
    <footer
      class="mt-auto border-t border-white/10 py-6 px-6 md:px-12 text-center text-sm text-slate-400 backdrop-blur-sm"
    >
      <div
        class="flex flex-col sm:flex-row items-center justify-between gap-3"
      >
        <div class="flex items-center gap-2">
          <img src="/logo.png" alt="PlanCraftAI" class="h-6 w-6 rounded-full" />
          <span
            >© {{ new Date().getFullYear() }} PlanCraftAI. All rights
            reserved.</span
          >
        </div>
        <div class="space-x-4">
          <router-link to="/" class="hover:text-indigo-300 transition"
            >Home</router-link
          >
          <router-link
            to="/dashboard"
            class="hover:text-indigo-300 transition"
            >App</router-link
          >
          <a
            href="mailto:hello@plancraftai.com"
            class="hover:text-indigo-300 transition"
            >Contact</a
          >
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useBlogs } from '@/composables/useBlogs'
import { useAuthStore } from '@/stores/authStore'
import api from '@/services/api'
import { ElMessage } from 'element-plus'

const { blogs, loading, fetchBlogs } = useBlogs(true)
const authStore = useAuthStore()
const router = useRouter()

const isAdmin = computed(
  () => String(authStore?.user?.role || '').toLowerCase() === 'admin'
)

function formatDate(val) {
  try {
    if (val?.toDate) return val.toDate().toLocaleDateString()
    return new Date(val).toLocaleDateString()
  } catch {
    return ''
  }
}

async function genIdea() {
  try {
    const resp = await api.post('/blogs/idea')
    if (resp?.data?.success) {
      ElMessage.success('New idea created!')
      await fetchBlogs()
      router.push('/admin/blogs')
    } else throw new Error(resp?.data?.error || 'Failed to generate idea')
  } catch (e) {
    ElMessage.error(e?.message || 'Idea generation failed')
  }
}
</script>

<style scoped>
.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Fade-in animation for cards */
.group {
  animation: fadeIn 0.6s ease both;
}
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Scrollbar */
::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-thumb {
  background: rgba(99, 102, 241, 0.4);
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(99, 102, 241, 0.6);
}
</style>