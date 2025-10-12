<template>
  <div class="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white p-6">
    <div v-if="!post && loading" class="text-gray-400">Loading…</div>
    <div v-else-if="!post" class="text-gray-400">Post not found.</div>
    <article v-else class="max-w-3xl mx-auto">
      <img v-if="post.coverImage" :src="post.coverImage" alt="cover" class="w-full h-64 object-cover rounded-lg mb-6" />
      <h1 class="text-3xl font-bold mb-3">{{ post.title }}</h1>
      <p class="text-gray-300 mb-4">{{ post.summary }}</p>
      <div class="text-xs text-gray-400 mb-6">
        <span v-for="t in (post.tags || [])" :key="t" class="mr-2">#{{ t }}</span>
      </div>
      <div class="prose prose-invert max-w-none" v-html="post.content"></div>
    </article>
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
</script>

<style>
.prose :where(img){ margin: 1rem 0; border-radius: 0.5rem; }
</style>

