<template>
  <section
    class="w-full h-screen bg-cover bg-center flex items-center justify-center text-white px-4"
    :style="`background-image: url(${heroImage})`"
  >
    <!-- Inside Hero Section -->
    <div class="absolute top-8 left-12 z-10 h-24">
      <img :src="logo" alt="Prompt2Quote Logo" class="h-24 md:h-16 drop-shadow-md" height="44" />
    </div>

    <div class="text-center max-w-2xl mx-auto">
      <h1 class="text-5xl sm:text-6xl font-bold leading-tight mb-4 text-white drop-shadow-lg">
        Turn Your Idea into a <br class="hidden sm:inline" />
        Quote, Instantly
      </h1>
      <p class="text-lg sm:text-xl text-white/90 mb-8">
        Enter a product idea. We’ll show you cost, timeline, <br class="hidden sm:inline" />
        and stack — in seconds.
      </p>

      <div class="bg-white/90 backdrop-blur-sm rounded-xl p-6 max-w-xl mx-auto shadow-lg">
        <el-input
          v-model="quoteStore.idea"
          placeholder="⚙️ ai app"
          size="large"
          class="mb-4"
          :disabled="quoteStore.loading"
          clearable
        />
        <el-button
          type="primary"
          size="large"
          class="w-full"
          :loading="quoteStore.loading"
          @click="quoteStore.generateQuote"
        >
          {{ quoteStore.loading ? 'Generating...' : 'Generate Quote' }}
        </el-button>
      </div>
    </div>
  </section>
</template>

<script setup>
import heroImage from '@/assets/images/hero-bg-image.png'
import logo from '@/assets/images/logo.svg'
import { useQuoteStore } from '@/stores/quoteStore'
const quoteStore = useQuoteStore()
</script>

<style lang="scss" scoped></style>
