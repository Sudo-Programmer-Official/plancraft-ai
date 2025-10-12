<template>
  <div class="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white p-6">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-3xl font-bold">PlanCraftAI Blog</h1>
      <el-button v-if="isAdmin" size="small" @click="genIdea">Generate Idea</el-button>
    </div>
    <div v-if="loading" class="text-gray-400">Loading…</div>
    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <router-link
        v-for="b in blogs"
        :key="b.id"
        :to="{ name: 'blog-post', params: { slug: b.slug } }"
        class="block rounded-xl bg-slate-800/60 border border-slate-700 p-4 hover:border-indigo-500 transition"
      >
        <img v-if="b.coverImage" :src="b.coverImage" alt="cover" class="w-full h-40 object-cover rounded mb-3" />
        <h2 class="text-xl font-semibold mb-1">{{ b.title }}</h2>
        <p class="text-sm text-gray-300 line-clamp-3">{{ b.summary }}</p>
        <div class="mt-2 text-xs text-gray-400">
          <span v-for="t in (b.tags || [])" :key="t" class="mr-2">#{{ t }}</span>
        </div>
      </router-link>
    </div>
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
const isAdmin = computed(() => String(authStore?.user?.role || '').toLowerCase() === 'admin')

async function genIdea() {
  try {
    const resp = await api.post('/blogs/idea')
    if (resp?.data?.success) {
      ElMessage.success('Idea created')
      try { await fetchBlogs() } catch {}
      router.push('/admin/blogs')
    } else {
      throw new Error(resp?.data?.error || 'Failed to generate idea')
    }
  } catch (e) {
    ElMessage.error(e?.message || 'Idea generation failed')
  }
}
</script>

<style scoped>
.line-clamp-3 { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; overflow: hidden; }
</style>
