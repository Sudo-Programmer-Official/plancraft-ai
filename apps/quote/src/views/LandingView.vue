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
import HeroSection from '@/components/landing-view/HeroSection.vue'
// import PromptInput from '@/components/landing-view/PromptInput.vue'
import QuoteCard from '@/components/landing-view/QuoteCard.vue'
import FeatureHighlight from '@/components/landing-view/FeatureHighlight.vue'
import EmailCapture from '@/components/landing-view/EmailCapture.vue'
import FooterComp from '@/components/landing-view/FooterComp.vue'
</script>
