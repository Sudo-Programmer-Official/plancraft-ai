<template>
  <div class="marketing-light min-h-screen bg-gradient-to-b from-indigo-950 via-slate-950 to-black text-white">
    <section class="px-6 py-20 md:py-28 text-center">
      <p class="uppercase text-xs tracking-[0.35em] text-indigo-300 mb-3">Voice Planning</p>
      <h1 class="text-4xl md:text-5xl font-extrabold leading-tight max-w-4xl mx-auto">
        Speak your day into existence with the PlanCraft AI voice planner
      </h1>
      <p class="mt-5 text-lg md:text-xl text-indigo-100 max-w-3xl mx-auto leading-relaxed">
        Capture tasks, journal entries, and reminders hands-free. PlanCraft AI transcribes, tags, and
        schedules everything for you—perfect for creators, founders, and neurodiverse planners.
      </p>
      <div class="mt-8 flex flex-col md:flex-row gap-4 justify-center">
        <RouterLink
          to="/login"
          class="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition font-semibold"
        >
          Try voice planning
        </RouterLink>
        <RouterLink
          to="/ai-reminders"
          class="px-6 py-3 rounded-xl border border-white/30 font-semibold hover:border-white transition"
        >
          Automate AI reminders →
        </RouterLink>
      </div>
    </section>

    <section class="px-6 py-16 bg-white/5">
      <div class="max-w-5xl mx-auto">
        <h2 class="text-3xl font-bold mb-8 text-center">How it works</h2>
        <div class="grid gap-8 md:grid-cols-3">
          <article
            v-for="(step, index) in steps"
            :key="step.title"
            class="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl"
          >
            <p class="text-indigo-300 uppercase text-xs font-semibold">Step {{ index + 1 }}</p>
            <h3 class="text-xl font-semibold mt-3">{{ step.title }}</h3>
            <p class="text-indigo-100 mt-2 leading-relaxed">{{ step.description }}</p>
          </article>
        </div>
      </div>
    </section>

    <SeoLongForm
      eyebrow="Playbook"
      title="Turn every voice note into an AI daily plan"
      :intro="longformIntro"
      :sections="longformSections"
    >
      <template #cta>
        <RouterLink
          to="/features"
          class="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-indigo-700 font-semibold hover:bg-slate-100 transition"
        >
          See all features
          <span aria-hidden="true">↗</span>
        </RouterLink>
      </template>
    </SeoLongForm>
  </div>
</template>

<script setup>
import { RouterLink } from 'vue-router'
import SeoLongForm from '@/components/SeoLongForm.vue'
import { useSeoMeta } from '@/composables/useSeoMeta'

const steps = [
  {
    title: 'Capture with your voice',
    description: 'Tap record, speak freely, and PlanCraft AI captures every detail automatically.',
  },
  {
    title: 'Clarify with AI',
    description:
      'Tasks are organized with due dates, tags, and context so nothing gets lost between meetings.',
  },
  {
    title: 'Commit and follow through',
    description: 'Send tasks to Google Calendar, trigger reminders, and receive nightly recaps.',
  },
]

const longformIntro =
  'Voice planning is the fastest way to keep commitments while staying gentle with yourself. PlanCraft AI guides you through three key loops.'

const longformSections = [
  {
    eyebrow: 'Capture',
    heading: 'Speak naturally, no command list needed',
    description:
      'PlanCraft AI understands fillers, tangents, and context. It distills every note into structured action items or journal entries.',
    bullets: [
      'Detects intent such as tasks, reminders, or gratitude logs',
      'Understands time hints like “next Friday” or “before lunch”',
      'Supports multi-lingual note taking with English summaries',
    ],
    ctaText: 'Record a sample day',
    ctaHref: '/voice-planning#voice-capture',
  },
  {
    eyebrow: 'Clarify',
    heading: 'AI journaling assistant keeps memories searchable',
    description:
      'Each entry includes mood tags and themes so you can notice patterns in focus, energy, or blockers.',
    bullets: [
      'Converts long notes into highlight bullets',
      'Links relevant habits, projects, or goals',
      'Shares a digestible summary with your future self',
    ],
    ctaText: 'See journaling layout',
    ctaHref: '/features',
  },
  {
    eyebrow: 'Commit',
    heading: 'Sync tasks to calendars & reminders automatically',
    description:
      'Send tasks directly to Google Calendar, WhatsApp, or push notifications so the right nudge arrives at the right time.',
    bullets: [
      'One-tap scheduling from transcription view',
      'Batched reminders for fewer pings',
      'Complete voice-to-calendar automation in under 30 seconds',
    ],
    ctaText: 'Link Google Calendar',
    ctaHref: '/google-calendar-integration',
  },
]

const structuredData = [
  {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'How to plan your day with PlanCraft AI voice planning',
    description:
      'Simple three-step guide to capture, clarify, and commit tasks using the PlanCraft AI voice planner.',
    step: steps.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: step.title,
      text: step.description,
    })),
  },
]

useSeoMeta({
  title: 'Voice Planning with PlanCraft AI | AI Daily Planner & Journaling Assistant',
  description:
    'Use PlanCraft AI as your voice-first daily planner. Capture notes, create tasks, and journal hands-free with AI reminders.',
  keywords: [
    'voice planning app',
    'AI daily planner',
    'voice journaling assistant',
    'speech to task planner',
  ],
  structuredData,
  pageLabel: 'Voice Planning',
})
</script>
