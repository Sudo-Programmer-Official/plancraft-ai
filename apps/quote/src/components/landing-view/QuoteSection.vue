<template>
  <div>
    <h3 class="font-semibold text-gray-700 mb-1">{{ title }}</h3>
    <p class="text-gray-800 whitespace-pre-wrap text-sm">{{ content }}</p>
  </div>
</template>

<script setup>
defineProps({ title: String, content: String })
</script>
