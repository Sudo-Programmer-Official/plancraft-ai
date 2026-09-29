<template>
  <div class="marketing-light min-h-screen bg-gradient-to-b from-slate-950 via-indigo-950/80 to-slate-950 text-white">
    <section class="px-6 py-20 md:py-28 text-center">
      <p class="uppercase text-xs tracking-[0.35em] text-indigo-300 mb-3">AI Daily Planner</p>
      <h1 class="text-4xl md:text-5xl font-extrabold leading-tight max-w-4xl mx-auto">
        AI daily planner for realistic schedules, priorities, and calmer follow-through
      </h1>
      <p class="mt-5 text-lg md:text-xl text-indigo-100 max-w-3xl mx-auto leading-relaxed">
        PlanCraftAI helps you decide what today should actually look like. Capture loose tasks,
        sort priorities around meetings, and keep the plan alive with reminders that do more than
        sit in a backlog.
      </p>
      <div class="mt-8 flex flex-col md:flex-row gap-4 justify-center">
        <RouterLink
          to="/login"
          class="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition font-semibold"
        >
          Start planning free
        </RouterLink>
        <RouterLink
          to="/ai-task-planner"
          class="px-6 py-3 rounded-xl border border-white/30 font-semibold hover:border-white transition"
        >
          See task capture ->
        </RouterLink>
      </div>
    </section>

    <section class="px-6 py-16 bg-white/5">
      <div class="max-w-6xl mx-auto grid gap-6 md:grid-cols-3">
        <article
          v-for="card in plannerCards"
          :key="card.title"
          class="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl"
        >
          <p class="text-indigo-300 uppercase text-xs font-semibold">{{ card.tag }}</p>
          <h2 class="text-2xl font-bold mt-2">{{ card.title }}</h2>
          <p class="text-indigo-100 mt-3 leading-relaxed">{{ card.description }}</p>
          <ul class="mt-4 space-y-2 text-sm text-indigo-200">
            <li v-for="point in card.points" :key="point">• {{ point }}</li>
          </ul>
        </article>
      </div>
    </section>

    <section class="px-6 py-16">
      <div class="max-w-5xl mx-auto">
        <div class="text-center max-w-3xl mx-auto">
          <p class="uppercase text-xs tracking-[0.35em] text-indigo-300">Why this converts</p>
          <h2 class="mt-4 text-3xl md:text-4xl font-bold">People want relief from forgetting, not another list</h2>
          <p class="mt-4 text-indigo-100 text-lg leading-relaxed">
            Most people searching for an AI daily planner want a fast way to stop carrying tasks in
            their head. PlanCraftAI turns incoming work into a daily sequence you can trust.
          </p>
        </div>
        <div class="mt-10 grid gap-6 md:grid-cols-2">
          <div
            v-for="benefit in plannerBenefits"
            :key="benefit.title"
            class="rounded-2xl border border-white/10 bg-white/5 p-6"
          >
            <h3 class="text-xl font-semibold">{{ benefit.title }}</h3>
            <p class="mt-3 text-indigo-100 leading-relaxed">{{ benefit.description }}</p>
          </div>
        </div>
      </div>
    </section>

    <SeoLongForm
      eyebrow="Daily Workflow"
      title="How PlanCraftAI builds a day you can actually finish"
      :intro="longformIntro"
      :sections="longformSections"
    >
      <template #cta>
        <div class="flex flex-col md:flex-row gap-4">
          <RouterLink
            to="/voice-reminder-app"
            class="flex-1 text-center px-6 py-3 rounded-xl bg-white text-indigo-700 font-semibold hover:bg-slate-100 transition"
          >
            Add voice reminders
          </RouterLink>
          <RouterLink
            to="/google-calendar-integration"
            class="flex-1 text-center px-6 py-3 rounded-xl border border-white/20 text-indigo-100 font-semibold hover:border-white transition"
          >
            Connect Google Calendar
          </RouterLink>
        </div>
      </template>
    </SeoLongForm>

    <section class="px-6 py-16 bg-indigo-950/60">
      <div class="max-w-5xl mx-auto">
        <div class="text-center mb-10">
          <p class="uppercase text-xs tracking-[0.35em] text-indigo-300">FAQ</p>
          <h2 class="mt-4 text-3xl md:text-4xl font-bold">AI daily planner questions people actually ask</h2>
        </div>
        <div class="grid gap-6">
          <article
            v-for="faq in faqItems"
            :key="faq.question"
            class="rounded-2xl border border-white/10 bg-white/5 p-6"
          >
            <h3 class="text-xl font-semibold">{{ faq.question }}</h3>
            <p class="mt-3 text-indigo-100 leading-relaxed">{{ faq.answer }}</p>
          </article>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { RouterLink } from 'vue-router'
import SeoLongForm from '@/components/SeoLongForm.vue'
import { useSeoMeta } from '@/composables/useSeoMeta'

const plannerCards = [
  {
    tag: 'Capture',
    title: 'Start with rough input',
    description:
      'Drop voice notes, meeting tasks, or half-formed priorities into one place instead of scattering them across inboxes and chat.',
    points: ['Voice-to-task capture', 'Natural language dates', 'Fast cleanup of messy task titles'],
  },
  {
    tag: 'Prioritize',
    title: 'Build a realistic order of work',
    description:
      'An AI daily planner should reduce decision fatigue. PlanCraftAI helps you choose what belongs now, later, or not today at all.',
    points: ['Calendar-aware planning', 'Priority sorting', 'Gentle handling of overdue work'],
  },
  {
    tag: 'Follow through',
    title: 'Keep the plan visible all day',
    description:
      'Once the plan exists, reminders and recaps make it easier to finish what matters without re-planning from scratch every few hours.',
    points: ['Voice reminders', 'Recurring nudges', 'End-of-day recaps'],
  },
]

const plannerBenefits = [
  {
    title: 'Useful when your day changes fast',
    description:
      'Founders, operators, and creators rarely have static days. PlanCraftAI helps you reshape priorities around meetings, interruptions, and urgent work.',
  },
  {
    title: 'Better than a plain checklist because it understands time',
    description:
      'Tasks become more useful when the planner can place them against today, tomorrow, recurring schedules, and real calendar pressure.',
  },
  {
    title: 'Built for execution, not just planning theater',
    description:
      'The goal is not to admire a pretty board. The goal is to know what to do next and make sure it still happens after lunch, meetings, and context switching.',
  },
  {
    title: 'Works for solo planning and shared team workflows',
    description:
      'Use the AI daily planner privately or bring the same structure into a workspace with shared tasks, teammate roles, and reminder visibility.',
  },
]

const longformIntro =
  'A strong AI daily planner is more than a place to store tasks. It needs to capture intent, sequence real work, and protect follow-through after the plan is made.'

const longformSections = [
  {
    eyebrow: 'Capture what matters',
    heading: 'Gather tasks without adding friction',
    description:
      'The planner needs fast intake first. PlanCraftAI works well when tasks arrive as speech, meeting notes, or quick fragments instead of polished project plans.',
    bullets: [
      'Capture work the moment it appears',
      'Turn loose phrasing into clean tasks and due dates',
      'Reduce the need for manual sorting and rewriting',
    ],
    ctaText: 'See the AI task planner',
    ctaHref: '/ai-task-planner',
  },
  {
    eyebrow: 'Choose today',
    heading: 'Make the plan match the day you actually have',
    description:
      'Daily planning fails when the schedule is aspirational. PlanCraftAI helps shape work around meetings, deadlines, focus windows, and recurring obligations.',
    bullets: [
      'Plan around calendar blocks and meeting pressure',
      'Choose the next tasks with the highest immediate value',
      'Keep the day clear enough to finish, not just start',
    ],
    ctaText: 'Connect your calendar',
    ctaHref: '/google-calendar-integration',
  },
  {
    eyebrow: 'Protect follow-through',
    heading: 'Pair the plan with reminders and recaps',
    description:
      'A daily plan only matters if it stays visible. PlanCraftAI ties tasks to reminders so important work does not quietly disappear once the morning focus fades.',
    bullets: [
      'Voice reminders for tasks captured on the go',
      'Recurring reminders for routines and weekly commitments',
      'Recaps that close the loop before tomorrow starts',
    ],
    ctaText: 'See the voice reminder app',
    ctaHref: '/voice-reminder-app',
  },
]

const faqItems = [
  {
    question: 'What is the best AI daily planner for busy schedules?',
    answer:
      'PlanCraftAI is designed for busy, changing days because it combines task capture, calendar-aware planning, and reminders in one workflow instead of splitting them across multiple tools.',
  },
  {
    question: 'Can an AI daily planner help me prioritize tasks?',
    answer:
      'Yes. PlanCraftAI helps sort tasks around urgency, due dates, and time pressure so you can decide what matters first instead of scanning an endless list.',
  },
  {
    question: 'Does PlanCraftAI work with reminders and recurring tasks?',
    answer:
      'Yes. You can pair the daily plan with voice reminders, recurring reminder flows, and follow-up nudges so work keeps moving after the plan is created.',
  },
]

const structuredData = [
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  },
  {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'PlanCraftAI AI Daily Planner',
    serviceType: 'AI daily planner',
    provider: {
      '@type': 'Organization',
      name: 'PlanCraftAI',
      url: 'https://plancraftai.com',
    },
    areaServed: 'Global',
    description:
      'AI daily planner for realistic scheduling, voice task capture, smart reminders, and calendar-aware daily execution.',
  },
]

useSeoMeta({
  title: 'AI Daily Planner | PlanCraftAI for Realistic Daily Scheduling',
  description:
    'Use PlanCraftAI as an AI daily planner to capture tasks fast, prioritize around meetings, and keep your day moving with reminders and recaps.',
  keywords: [
    'AI daily planner',
    'AI planner app',
    'AI planner for daily schedule',
    'daily planner AI',
    'AI task planner',
    'calendar-aware AI planner',
  ],
  canonicalPath: '/ai-daily-planner',
  structuredData,
  pageLabel: 'AI Daily Planner',
})
</script>
