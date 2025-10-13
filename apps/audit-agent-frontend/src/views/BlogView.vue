<template>
  <div
    class="min-h-screen bg-gradient-to-br from-[#1e1b4b] via-[#312e81] to-[#4c1d95] text-slate-100 flex flex-col font-inter"
  >
    <!-- Header -->
    <header
      class="border-b border-white/10 px-6 md:px-12 py-8 backdrop-blur-sm sticky top-0 z-20"
    >
      <div class="flex items-center justify-between">
        <router-link
          to="/blog"
          class="flex items-center gap-2 text-slate-300 hover:text-indigo-300 transition"
        >
          ← Back to Blog
        </router-link>
        <div class="flex items-center gap-2 text-slate-400 text-sm">
          <img
            src="/logo.png"
            alt="PlanCraftAI"
            class="h-6 w-6 rounded-full"
          />
          <span>PlanCraftAI Journal</span>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-1 px-6 md:px-12 py-10">
      <!-- ⏳ Loading shimmer -->
      <div v-if="loading" class="max-w-3xl mx-auto py-20 animate-pulse space-y-4">
        <div class="h-6 bg-white/10 rounded w-1/3"></div>
        <div class="h-4 bg-white/10 rounded w-2/3"></div>
        <div class="h-4 bg-white/10 rounded"></div>
        <div class="h-4 bg-white/10 rounded w-5/6"></div>
      </div>

      <!-- ❌ Not found -->
      <div
        v-else-if="!post"
        class="text-slate-400 text-center py-20"
      >
        Post not found.
      </div>

      <!-- 📰 Blog Content -->
      <article
        v-else
        class="max-w-3xl mx-auto bg-white/5 border border-white/10 rounded-2xl p-6 md:p-10 shadow-lg backdrop-blur-md animate-fadeUp"
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
        <h1
          class="text-3xl md:text-4xl font-bold leading-tight mb-3 text-white"
        >
          {{ post.title }}
        </h1>
        <p class="text-slate-300 mb-4 text-base leading-relaxed">
          {{ post.summary }}
        </p>

        <!-- Meta Info -->
        <div
          class="flex flex-wrap gap-3 items-center mb-8 text-xs text-slate-400"
        >
          <span
            v-for="t in displayTags"
            :key="t"
            class="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300"
          >
            #{{ t }}
          </span>
          <span class="ml-auto">
            {{ formatDate(post.updated_at || post.created_at) }}
          </span>
        </div>

        <!-- Blog Body -->
        <div
          ref="contentBox"
          tabindex="-1"
          class="prose prose-invert max-w-none leading-relaxed tracking-wide"
          v-html="limitedContent"
          @click="onContentClick"
        ></div>

        <div v-if="hasMore && !showFull" class="text-center mt-6">
          <button
            class="text-indigo-300 hover:text-indigo-200 transition text-sm underline"
            @click="showFull = true"
          >
            Show full article ↓
          </button>
        </div>
      </article>
    </main>

    <!-- Footer -->
    <footer
      class="border-t border-white/10 py-8 px-6 md:px-12 text-center text-slate-400 text-sm backdrop-blur-sm"
    >
      <div
        class="flex flex-col sm:flex-row justify-between items-center gap-2"
      >
        <span
          >© {{ new Date().getFullYear() }} PlanCraftAI — Crafted with purpose
          💡</span
        >
        <router-link
          to="/"
          class="hover:text-indigo-300 transition"
          >Back to App</router-link
        >
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted, watchEffect, computed, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { getBlogBySlug } from '@/services/blogService'
import { useHead } from '@vueuse/head'

const route = useRoute()
const post = ref(null)
const loading = ref(true)
const showFull = ref(false)
const contentBox = ref(null)
const displayTags = computed(() => {
  const raw = post.value?.tags
  if (Array.isArray(raw)) return raw
  return String(raw || '')
    .split(/[,#]+/)
    .map((t) => t.trim())
    .filter(Boolean)
})

const limitedContent = computed(() => {
  if (!post.value?.content) return ''
  if (showFull.value) return post.value.content
  const parts = String(post.value.content).split(/<\/p>/i)
  const first = parts.slice(0, 4).join('</p>')
  if (parts.length <= 4) return post.value.content
  // Inline "Read more" anchor directly after the 4th paragraph
  return (
    first +
    '</p>' +
    '<p><em>…</em> <a id="read-more-inline" href="#full-article" class="inline-readmore text-indigo-300 hover:text-indigo-200 underline">Read more</a></p>'
  )
})

const hasMore = computed(() => {
  try {
    const count = (post.value?.content?.match(/<\/p>/gi) || []).length
    return count > 4
  } catch { return false }
})

function onContentClick(e) {
  try {
    const t = e?.target
    if (t && t.id === 'read-more-inline') {
      e.preventDefault()
      showFull.value = true
      nextTick(() => {
        try {
          contentBox.value?.focus()
          contentBox.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        } catch {}
      })
    }
  } catch {}
}

onMounted(async () => {
  try {
    loading.value = true
    post.value = await getBlogBySlug(route.params.slug)
  } finally {
    loading.value = false
  }
})

// 🪶 Auto paragraph formatting if old text lacks <p> tags
watchEffect(() => {
  if (post.value?.content && !post.value.content.includes('<p>')) {
    const chunks = post.value.content
      .split(/(?<=[.!?])\s+/)
      .reduce((acc, s) => {
        const last = acc[acc.length - 1] || ''
        if (last.length > 400) acc.push(s)
        else acc[acc.length - 1] = last ? last + ' ' + s : s
        return acc
      }, [''])
      .map(p => `<p>${p.trim()}</p>`)
      .join('')
    post.value.content = chunks
  }
})

// 🧠 SEO & OG metadata
watchEffect(() => {
  if (post.value) {
    useHead({
      title: `${post.value.title} | PlanCraftAI Blog`,
      meta: [
        {
          name: 'description',
          content:
            post.value.summary ||
            'Explore AI productivity insights and planning stories with PlanCraftAI.',
        },
        { name: 'keywords', content: (post.value.tags || []).join(', ') },
        { property: 'og:type', content: 'article' },
        { property: 'og:title', content: post.value.title },
        { property: 'og:description', content: post.value.summary },
        {
          property: 'og:image',
          content: post.value.coverImage || '/default-blog-cover.png',
        },
        {
          property: 'og:url',
          content: `https://plancraftai.com/blog/${post.value.slug}`,
        },
        { name: 'twitter:card', content: 'summary_large_image' },
        { rel: 'canonical', href: `https://plancraftai.com/blog/${post.value.slug}` },
      ],
    })
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
/* 🌸 Smooth fade-up animation */
@keyframes fadeUp {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.animate-fadeUp {
  animation: fadeUp 0.6s ease both;
}

/* 🪶 Typography polish */
.prose {
  font-size: 1.08rem;
  line-height: 1.85;
  letter-spacing: 0.01em;
  font-weight: 400;
  max-width: 65ch;
  margin: 0 auto;
}
.prose :where(img) {
  margin: 1rem 0;
  border-radius: 0.75rem;
}
.prose :where(h1, h2, h3, h4) {
  color: #fff;
  scroll-margin-top: 6rem;
  font-weight: 600;
}
.prose a {
  color: #a5b4fc;
  text-decoration: underline;
  text-underline-offset: 3px;
}
.prose p {
  margin-top: 1.6rem !important;
  margin-bottom: 1.6rem !important;
  line-height: 1.9 !important;
  word-spacing: 0.02em;
  color: #e5e7eb;
}
.prose > p:first-of-type {
  margin-top: 1rem !important;
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
.prose blockquote {
  border-left: 3px solid rgba(165, 180, 252, 0.4);
  padding-left: 1rem;
  font-style: italic;
  color: #c7d2fe;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 0.25rem;
}

/* 🌗 Scrollbar styling */
::-webkit-scrollbar {
  width: 6px;
}

/* Inline read-more link spacing */
.inline-readmore { margin-left: 4px; }
::-webkit-scrollbar-thumb {
  background: rgba(99, 102, 241, 0.4);
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(99, 102, 241, 0.6);
}
</style>
