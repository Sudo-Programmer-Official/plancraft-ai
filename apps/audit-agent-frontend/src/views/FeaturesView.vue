<template>
  <div class="min-h-screen bg-gradient-to-b from-slate-950 via-indigo-950/80 to-slate-950 text-white">
    <section class="px-6 py-20 md:py-28 text-center">
      <p class="uppercase text-xs tracking-[0.35em] text-indigo-300 mb-4">Product Tour</p>
      <h1 class="text-4xl md:text-5xl font-extrabold leading-tight max-w-4xl mx-auto">
        AI-powered task manager with voice journaling, calendar sync, and mindful reminders
      </h1>
      <p class="mt-5 text-lg md:text-xl text-indigo-100 max-w-3xl mx-auto leading-relaxed">
        PlanCraft AI is a focused productivity app that pairs AI coaching with peaceful design.
        Speak tasks, sync Google Calendar, and let smart reminders keep every promise on track.
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
        <h2 class="text-3xl font-bold mb-4">Ready to make peaceful productivity your default?</h2>
        <p class="text-indigo-100 mb-8">
          Sign in to sync with Google Calendar, set smart reminders, and use the voice journaling
          assistant every day.
        </p>
        <div class="flex flex-col md:flex-row gap-4 justify-center">
          <RouterLink
            to="/login"
            class="px-6 py-3 rounded-xl bg-white text-indigo-700 font-semibold hover:bg-slate-100 transition"
          >
            Log in / Sign up
          </RouterLink>
          <RouterLink
            to="/pricing"
            class="px-6 py-3 rounded-xl border border-white/30 font-semibold hover:border-white transition"
          >
            Review pricing
          </RouterLink>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { RouterLink } from 'vue-router'
import SeoLongForm from '@/components/SeoLongForm.vue'
import { useSeoMeta } from '@/composables/useSeoMeta'

const useCaseCards = [
  {
    emoji: '🧠',
    title: 'AI Daily Planning',
    description:
      'Answer a few mindful prompts and receive a suggested agenda balanced across goals, meetings, and personal care.',
    href: '/voice-planning',
    ctaLabel: 'Plan your morning',
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
    title: 'Smart Reminders & Recaps',
    description:
      'Send reminders over push, WhatsApp, or email. Evening recaps highlight what to celebrate next.',
    href: '/ai-reminders',
    ctaLabel: 'See reminder flows',
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
  'PlanCraft AI replaces scattered tools with a calm surface that still feels powerful. Here is how teams and solo builders use it end to end.'

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
  title: 'AI-Powered Task Manager | Smart Planning, Voice Reminders, and Calendar Sync',
  description:
    'Review every PlanCraft AI feature: AI daily planning, voice task creation, Google Calendar sync, and compassionate reminders.',
  keywords: [
    'AI task manager features',
    'AI productivity app',
    'voice planning features',
    'Google Calendar sync planner',
  ],
  structuredData,
  pageLabel: 'Features',
})
</script>
