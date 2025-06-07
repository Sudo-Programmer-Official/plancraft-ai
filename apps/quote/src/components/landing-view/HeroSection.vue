<!-- <template>
  <section class="text-center py-12 bg-gradient-to-r from-purple-100 via-white to-indigo-100">
    <h1 class="text-4xl font-bold text-purple-800">Turn Your Idea into a Quote, Instantly</h1>
    <p class="text-lg text-gray-700 mt-2">
      Enter a product idea. We’ll show you cost, timeline, and stack.
    </p>
  </section>
</template>

<script setup>
// Presentation only
</script> -->

<!-- <template>
  <section class="text-center py-16 bg-gradient-to-r from-indigo-50 via-white to-purple-50">
    <h1 class="text-5xl font-bold text-indigo-800 mb-4">Turn Your Idea into a Quote, Instantly</h1>
    <p class="text-lg text-gray-700 max-w-xl mx-auto">
      Enter a product idea. We’ll show you cost, timeline, and stack.
    </p>
    <el-button class="mt-8" type="primary" size="large">Get Started</el-button>
  </section>
</template>

<script setup></script> -->
<template>
  <section
    class="relative py-24 px-6 text-center bg-gradient-to-br from-white via-indigo-50 to-purple-100"
  >
    <!-- Optional Video BG -->
    <!-- 
      <video autoplay loop muted playsinline class="absolute inset-0 w-full h-full object-cover opacity-20 -z-10">
        <source src="/videos/quote-hero.mp4" type="video/mp4" />
      </video>
      -->

    <h1 class="text-5xl font-bold text-gray-900 mb-4">Turn Your Idea into a Quote, Instantly</h1>
    <p class="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
      Enter a product idea. We’ll show you cost, timeline, and stack — in seconds.
    </p>

    <el-button type="primary" size="large" class="px-10" @click="$router.push('/#quote')">
      Get Started
    </el-button>
  </section>
</template>

<script setup></script>
