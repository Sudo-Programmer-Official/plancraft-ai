<!-- QuoteSection.vue -->
<template>
  <div>
    <h3 class="font-semibold text-gray-700 mb-1">{{ title }}</h3>
    <ul v-if="Array.isArray(content)" class="list-disc list-inside text-sm space-y-1">
      <li v-for="(item, idx) in content" :key="idx">{{ item }}</li>
    </ul>
    <p v-else class="text-gray-800 whitespace-pre-wrap text-sm">{{ content }}</p>
  </div>
</template>

<script setup>
defineProps({ title: String, content: String })
</script>
