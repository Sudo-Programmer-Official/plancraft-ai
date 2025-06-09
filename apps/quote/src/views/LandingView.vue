<template>
  <main class="flex flex-col items-center justify-center overflow-x-hidden">
    <HeroSection />
    <!-- <PromptInput /> -->
    <QuoteCard />
    <FeatureHighlight />
    <EmailCapture />
    <FooterComp />
  </main>
</template>

<script setup>
import { useHead } from '@vueuse/head'
useHead({
  title: 'Prompt2Quote – AI-Powered Quote Generator',
  meta: [
    {
      name: 'description',
      content: 'Instant quote for app development – tech stack, cost, timeline.',
    },
    { name: 'keywords', content: 'AI quote, software pricing, startup MVP tool' },
    { property: 'og:title', content: 'Prompt2Quote – Instant Quotes' },
    {
      property: 'og:description',
      content: 'Instant quote generator for app dev – stack, timeline, pricing.',
    },
    { property: 'og:image', content: 'https://prompt2quote.com/assets/social-card.png' },
    { property: 'og:image:width', content: '1200' },
    { property: 'og:image:height', content: '630' },
    { property: 'og:url', content: 'https://prompt2quote.com' },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: 'Prompt2Quote – MVP Cost Generator' },
    { name: 'twitter:description', content: 'Estimate your app’s cost & timeline in seconds.' },
  ],
})
import HeroSection from '@/components/landing-view/HeroSection.vue'
// import PromptInput from '@/components/landing-view/PromptInput.vue'
import QuoteCard from '@/components/landing-view/QuoteCard.vue'
import FeatureHighlight from '@/components/landing-view/FeatureHighlight.vue'
import EmailCapture from '@/components/landing-view/EmailCapture.vue'
import FooterComp from '@/components/landing-view/FooterComp.vue'
</script>
