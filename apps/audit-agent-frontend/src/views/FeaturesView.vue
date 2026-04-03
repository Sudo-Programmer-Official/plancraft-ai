<template>
  <div class="min-h-screen bg-gradient-to-b from-slate-950 via-indigo-950/80 to-slate-950 text-white">
    <section class="px-6 py-20 md:py-28 text-center">
      <p class="uppercase text-xs tracking-[0.35em] text-indigo-300 mb-4">Product Tour</p>
      <h1 class="text-4xl md:text-5xl font-extrabold leading-tight max-w-4xl mx-auto">
        AI task planner with voice reminders, daily planning, and calendar-aware execution
      </h1>
      <p class="mt-5 text-lg md:text-xl text-indigo-100 max-w-3xl mx-auto leading-relaxed">
        PlanCraftAI helps you speak tasks, sort priorities, and keep work moving with smart
        reminders. It is built for people who want less remembering and more follow-through.
      </p>
      <div class="mt-8 flex flex-col md:flex-row gap-4 justify-center">
        <RouterLink
          to="/voice-planning"
          class="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition font-semibold"
        >
          Explore voice planning
        </RouterLink>
        <RouterLink
          to="/ai-reminders"
          class="px-6 py-3 rounded-xl border border-white/20 hover:border-white/70 transition font-semibold"
        >
          See reminder engine →
        </RouterLink>
      </div>
    </section>

    <section class="px-6 py-16 bg-black/20">
      <div class="max-w-6xl mx-auto grid gap-8 md:grid-cols-2">
        <article
          v-for="card in useCaseCards"
          :key="card.title"
          class="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl shadow-xl"
        >
          <div class="text-4xl mb-4">{{ card.emoji }}</div>
          <h2 class="text-2xl font-bold">{{ card.title }}</h2>
          <p class="text-indigo-100 mt-3 leading-relaxed">
            {{ card.description }}
          </p>
          <RouterLink
            :to="card.href"
            class="inline-flex items-center gap-2 text-indigo-200 hover:text-white font-semibold mt-6"
          >
            {{ card.ctaLabel }}
            <span aria-hidden="true">↗</span>
          </RouterLink>
        </article>
      </div>
    </section>

    <section class="px-6 py-16">
      <div class="max-w-5xl mx-auto text-center">
        <p class="uppercase text-xs tracking-[0.35em] text-indigo-300">Feature Stack</p>
        <h2 class="text-3xl md:text-4xl font-bold mt-4">Everything you expect from an AI planner</h2>
      </div>
      <div class="mt-10 grid gap-6 md:grid-cols-2 max-w-5xl mx-auto">
        <div
          v-for="feature in featureBullets"
          :key="feature.title"
          class="rounded-2xl border border-white/10 bg-white/5 p-6 text-left"
        >
          <p class="text-indigo-300 text-sm font-semibold">{{ feature.tag }}</p>
          <h3 class="text-xl font-semibold mt-2">{{ feature.title }}</h3>
          <p class="mt-2 text-indigo-100 leading-relaxed">
            {{ feature.description }}
          </p>
        </div>
      </div>
    </section>

    <SeoLongForm
      eyebrow="Deep dive"
      title="Why teams and solo builders choose PlanCraft AI"
      :intro="longformIntro"
      :sections="longformSections"
    />

    <section class="px-6 py-16 bg-indigo-950/70">
      <div class="max-w-4xl mx-auto text-center">
        <h2 class="text-3xl font-bold mb-4">Ready to stop losing tasks and start planning with confidence?</h2>
        <p class="text-indigo-100 mb-8">
          Sign in to sync Google Calendar, capture tasks by voice, and keep follow-through moving
          with reminders that stay tied to real work.
        </p>
        <div class="flex flex-col md:flex-row gap-4 justify-center">
          <RouterLink
            to="/login"
            class="px-6 py-3 rounded-xl bg-white text-indigo-700 font-semibold hover:bg-slate-100 transition"
          >
            Log in / Sign up
          </RouterLink>
          <RouterLink
            :to="secondaryCtaRoute"
            class="px-6 py-3 rounded-xl border border-white/30 font-semibold hover:border-white transition"
          >
            {{ secondaryCtaLabel }}
          </RouterLink>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import SeoLongForm from '@/components/SeoLongForm.vue'
import { useSeoMeta } from '@/composables/useSeoMeta'
import { isAppleBillingSafeMode as detectAppleBillingSafeMode } from '@/utils/billingAccess'

const isAppleBillingSafeMode = computed(() => detectAppleBillingSafeMode())
const secondaryCtaRoute = computed(() => (isAppleBillingSafeMode.value ? '/billing/upgrade' : '/pricing'))
const secondaryCtaLabel = computed(() => (isAppleBillingSafeMode.value ? 'Upgrade to Solo Premium' : 'Review pricing'))

const useCaseCards = [
  {
    emoji: '🧠',
    title: 'AI Daily Planning',
    description:
      'Start with a realistic agenda that balances priorities, meetings, and the work that actually needs to happen today.',
    href: '/ai-daily-planner',
    ctaLabel: 'See daily planning',
  },
  {
    emoji: '🎤',
    title: 'Voice Task Creation',
    description:
      'Speak a stream-of-consciousness note and let PlanCraft AI file it into tasks, reminders, and journal entries.',
    href: '/voice-planning#voice-capture',
    ctaLabel: 'Record a sample',
  },
  {
    emoji: '📆',
    title: 'Google Calendar Integration',
    description:
      'Sync multiple calendars, assign focus blocks, and get AI summaries when a meeting ends.',
    href: '/google-calendar-integration',
    ctaLabel: 'Connect calendar',
  },
  {
    emoji: '⏰',
    title: 'Voice Reminders & Follow-ups',
    description:
      'Turn spoken tasks into reminders over push, WhatsApp, or recap-style nudges that stay tied to real work.',
    href: '/voice-reminder-app',
    ctaLabel: 'See voice reminders',
  },
]

const featureBullets = [
  {
    tag: 'Voice-first',
    title: 'Dictate once, get AI structure',
    description: 'Automatic transcription, summarization, and tagging for every spoken note.',
  },
  {
    tag: 'Calendar aware',
    title: 'Pull meetings & push prep tasks',
    description: 'Sync with Google Calendar and auto-create reminders based on your daily load.',
  },
  {
    tag: 'Goal tracking',
    title: 'Weekly and monthly AI recaps',
    description: 'Understand completion rates, mood trends, and recurring blockers.',
  },
  {
    tag: 'Compassionate reminders',
    title: 'Stay accountable without stress',
    description: 'Friendly nudges, evening recaps, and reflective prompts keep burnout away.',
  },
]

const longformIntro =
  'PlanCraftAI replaces scattered notes, reminder apps, and overloaded calendars with one workflow for capture, planning, and follow-through.'

const longformSections = [
  {
    eyebrow: 'Capture',
    heading: 'Record voice notes that become tasks',
    description:
      'Voice-to-task pipelines automatically add due dates, labels, and people so you can trust the capture process.',
    bullets: [
      'One-tap voice capture from desktop or mobile PWA',
      'Automatic AI summaries for quick scanning',
      'Keyword-aware tagging for faster filtering',
    ],
  },
  {
    eyebrow: 'Plan',
    heading: 'Design focus blocks your calendar respects',
    description:
      'AI understands your calendar load and suggests when to work deeply, rest, or prepare for meetings.',
    bullets: [
      'Priority scoring that looks at energy levels',
      'Shared planning rituals for teams or households',
      'Calendar sync with conflict detection',
    ],
  },
  {
    eyebrow: 'Review',
    heading: 'Let AI recap progress & proactive reminders',
    description:
      'Receive daily or weekly recaps that spotlight wins, risks, and goals needing attention.',
    bullets: [
      'Automatic reminder batching for fewer pings',
      'Exportable insights for accountability partners',
      'Rich-text journal entries paired with data',
    ],
  },
]

const SITE_URL = (import.meta.env.VITE_SITE_URL && String(import.meta.env.VITE_SITE_URL)) || 'https://plancraftai.com'
const BASE_URL = SITE_URL.endsWith('/') ? SITE_URL.slice(0, -1) : SITE_URL

const structuredData = [
  {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'PlanCraft AI Feature List',
    itemListElement: useCaseCards.map((card, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: card.title,
      description: card.description,
      url: `${BASE_URL}${card.href}`,
    })),
  },
]

useSeoMeta({
  title: 'AI Task Planner Features | Voice Reminders, AI Daily Planning, and Calendar Sync',
  description:
    'Review PlanCraftAI features for AI daily planning, voice task creation, voice reminders, recurring reminders, and Google Calendar sync.',
  keywords: [
    'AI task planner features',
    'AI daily planner features',
    'voice reminder app features',
    'Google Calendar sync planner',
  ],
  structuredData,
  pageLabel: 'Features',
})
</script>
