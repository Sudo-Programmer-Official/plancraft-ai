<template>
  <div class="border p-4 rounded shadow-md bg-white">
    <h2 class="text-xl font-bold text-purple-700 mb-2">{{ title }}</h2>
    <p class="text-gray-700">{{ description }}</p>
  </div>
</template>

<script>
export default {
  props: {
    title: String,
    description: String,
  },
};
</script>
