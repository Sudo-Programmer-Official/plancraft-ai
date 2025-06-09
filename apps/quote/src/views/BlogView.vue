<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import mvpCostGuide from '@/blogs/mvp-cost-guide-2025.vue'

const route = useRoute()

const componentMap = {
  'mvp-cost-guide-2025': mvpCostGuide,
}

const matchedComponent = computed(() => {
  return componentMap[route.params.slug]
})
</script>

<template>
  <component :is="matchedComponent" v-if="matchedComponent" />
  <div v-else class="text-center mt-20 text-gray-500">404 – Blog Not Found</div>
</template>
