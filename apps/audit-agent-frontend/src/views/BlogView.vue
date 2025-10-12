  <template>
  <div class="min-h-screen bg-gradient-to-br from-[#1e1b4b] via-[#312e81] to-[#4c1d95] text-slate-100 flex flex-col font-inter">
    <!-- Header -->
    <header class="border-b border-white/10 px-6 md:px-12 py-8 backdrop-blur-sm">
      <div class="flex items-center justify-between">
        <router-link to="/blog" class="flex items-center gap-2 text-slate-300 hover:text-indigo-300 transition">
          ← Back to Blog
        </router-link>
        <div class="flex items-center gap-2 text-slate-400 text-sm">
          <img src="/logo.png" alt="PlanCraftAI" class="h-6 w-6 rounded-full" />
          <span>PlanCraftAI Journal</span>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-1 px-6 md:px-12 py-10">
      <div v-if="loading" class="text-slate-400 text-center py-20">Loading article...</div>
      <div v-else-if="!post" class="text-slate-400 text-center py-20">Post not found.</div>

      <article
        v-else
        class="max-w-3xl mx-auto bg-white/5 border border-white/10 rounded-2xl p-6 md:p-10 shadow-lg backdrop-blur-md"
      >
        <!-- Cover Image -->
        <div v-if="post.coverImage" class="overflow-hidden rounded-xl mb-6">
          <img
            :src="post.coverImage"
            alt="Cover image"
            class="w-full h-64 object-cover transition-transform duration-700 hover:scale-105"
          />
        </div>

        <!-- Title -->
        <h1 class="text-3xl md:text-4xl font-bold leading-tight mb-3 text-white">
          {{ post.title }}
        </h1>
        <p class="text-slate-300 mb-4">{{ post.summary }}</p>

        <!-- Meta Info -->
        <div class="flex flex-wrap gap-3 items-center mb-8 text-xs text-slate-400">
          <span
            v-for="t in (post.tags || [])"
            :key="t"
            class="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300"
          >
            #{{ t }}
          </span>
          <span class="ml-auto">
            {{ formatDate(post.updated_at || post.created_at) }}
          </span>
        </div>

        <!-- Blog Content -->
        <div
          class="prose prose-invert max-w-none leading-relaxed tracking-wide"
          v-html="post.content"
        ></div>
      </article>
    </main>

    <!-- Footer -->
    <footer class="border-t border-white/10 py-8 px-6 md:px-12 text-center text-slate-400 text-sm backdrop-blur-sm">
      <div class="flex flex-col sm:flex-row justify-between items-center gap-2">
        <span>© {{ new Date().getFullYear() }} PlanCraftAI — Crafted with purpose 💡</span>
        <router-link to="/" class="hover:text-indigo-300 transition">Back to App</router-link>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { getBlogBySlug } from '@/services/blogService'

const route = useRoute()
const post = ref(null)
const loading = ref(true)

onMounted(async () => {
  try {
    loading.value = true
    post.value = await getBlogBySlug(route.params.slug)
  } finally {
    loading.value = false
  }
})

function formatDate(val) {
  try {
    if (val?.toDate) return val.toDate().toLocaleDateString()
    return new Date(val).toLocaleDateString()
  } catch {
    return ''
  }
}
</script>

<style scoped>
.prose :where(img) {
  margin: 1rem 0;
  border-radius: 0.5rem;
}
.prose :where(h1, h2, h3, h4) {
  color: #fff;
  scroll-margin-top: 6rem;
}
.prose a {
  color: #a5b4fc;
  text-decoration: underline;
}
.prose p {
  margin-top: 1rem;
  margin-bottom: 1rem;
}
.prose strong {
  color: #e0e7ff;
}
.prose code {
  background: rgba(255, 255, 255, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
  color: #93c5fd;
}
.prose pre {
  background: rgba(255, 255, 255, 0.05);
  padding: 1rem;
  border-radius: 0.5rem;
  overflow-x: auto;
}
</style>