<template>
  <section class="seo-long-form py-16 md:py-24 bg-gradient-to-b from-slate-950 via-indigo-950/70 to-slate-950">
    <div class="max-w-5xl mx-auto px-6">
      <p v-if="eyebrow" class="uppercase tracking-[0.35em] text-xs text-indigo-300 mb-3">
        {{ eyebrow }}
      </p>
      <h2 class="text-3xl md:text-4xl font-extrabold text-white leading-tight">
        {{ title }}
      </h2>
      <p v-if="intro" class="mt-4 text-lg text-indigo-100/90 leading-relaxed">
        {{ intro }}
      </p>

      <div class="mt-12 space-y-10">
        <article
          v-for="(section, idx) in sections"
          :key="section.heading || idx"
          class="rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl p-6 sm:p-8 shadow-lg hover:border-indigo-300/40 transition-all"
        >
          <div class="flex flex-col gap-3">
            <p v-if="section.eyebrow" class="text-xs font-semibold tracking-[0.35em] text-indigo-300/90">
              {{ section.eyebrow }}
            </p>
            <h3 class="text-2xl font-semibold text-white leading-snug">
              {{ section.heading }}
            </h3>
            <p v-if="section.description" class="text-base text-indigo-100/95 leading-relaxed">
              {{ section.description }}
            </p>
            <ul
              v-if="section.bullets?.length"
              class="space-y-3 mt-4 text-indigo-100/90 text-sm sm:text-base"
            >
              <li
                v-for="point in section.bullets"
                :key="point"
                class="flex items-start gap-2"
              >
                <span class="text-indigo-300 mt-1">•</span>
                <span>{{ point }}</span>
              </li>
            </ul>
            <div
              v-if="section.ctaText && section.ctaHref"
              class="mt-6"
            >
              <RouterLink
                :to="section.ctaHref"
                class="inline-flex items-center gap-2 text-sm font-semibold text-indigo-200 hover:text-white transition"
              >
                {{ section.ctaText }}
                <span aria-hidden="true">↗</span>
              </RouterLink>
            </div>
          </div>
        </article>
      </div>

      <div v-if="$slots.cta" class="mt-12">
        <slot name="cta" />
      </div>
    </div>
  </section>
</template>

<script setup>
import { RouterLink } from 'vue-router'

defineProps({
  eyebrow: {
    type: String,
    default: '',
  },
  title: {
    type: String,
    required: true,
  },
  intro: {
    type: String,
    default: '',
  },
  sections: {
    type: Array,
    default: () => [],
  },
})
</script>

<style scoped>
.seo-long-form {
  position: relative;
}
.seo-long-form::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at top, rgba(99, 102, 241, 0.25), transparent 60%);
  opacity: 0.6;
  pointer-events: none;
}
.seo-long-form > div {
  position: relative;
  z-index: 1;
}
</style>
