<template>
  <div class="prose mx-auto max-w-3xl p-4">
    <div v-if="htmlContent" v-html="htmlContent"></div>
    <div v-else class="text-gray-500">Loading...</div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import MarkdownIt from 'markdown-it'

const props = defineProps({
  slug: {
    type: String,
    required: true,
  },
})

const htmlContent = ref('')
const md = new MarkdownIt()

onMounted(async () => {
  const markdown = await import(`../content/blogs/${props.slug}.md?raw`)
  htmlContent.value = md.render(markdown.default)
})
</script>

<style scoped>
.prose h1 {
  font-size: 1.875rem;
}
</style>
