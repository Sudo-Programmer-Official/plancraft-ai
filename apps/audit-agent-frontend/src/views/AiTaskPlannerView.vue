<template>
  <div class="min-h-screen bg-gradient-to-b from-slate-950 via-indigo-950/80 to-slate-950 text-white">
    <section class="px-6 py-20 md:py-28 text-center">
      <p class="uppercase text-xs tracking-[0.35em] text-indigo-300 mb-3">AI Task Planner</p>
      <h1 class="text-4xl md:text-5xl font-extrabold leading-tight max-w-4xl mx-auto">
        AI task planner for voice capture, daily scheduling, and calm follow-through
      </h1>
      <p class="mt-5 text-lg md:text-xl text-indigo-100 max-w-3xl mx-auto leading-relaxed">
        PlanCraft AI turns messy notes into a real daily plan. Speak tasks out loud, prioritize what
        matters, sync your calendar, and let smart reminders keep the day moving without the usual chaos.
      </p>
      <div class="mt-8 flex flex-col md:flex-row gap-4 justify-center">
        <RouterLink
          to="/login"
          class="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition font-semibold"
        >
          Try the AI task planner
        </RouterLink>
        <RouterLink
          to="/ai-daily-planner"
          class="px-6 py-3 rounded-xl border border-white/30 font-semibold hover:border-white transition"
        >
          Explore AI daily planning ->
        </RouterLink>
      </div>
    </section>

    <section class="px-6 py-16 bg-white/5">
      <div class="max-w-6xl mx-auto grid gap-6 md:grid-cols-3">
        <article
          v-for="card in workflowCards"
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
          <p class="uppercase text-xs tracking-[0.35em] text-indigo-300">What the planner handles</p>
          <h2 class="mt-4 text-3xl md:text-4xl font-bold">Designed for the real inputs people actually use</h2>
          <p class="mt-4 text-indigo-100 text-lg leading-relaxed">
            Searchers looking for an AI task planner usually want more than a to-do list. They need a
            system that can capture fuzzy input, interpret time, and help them decide what to do next.
          </p>
        </div>
        <div class="mt-10 grid gap-6 md:grid-cols-2">
          <div
            v-for="signal in plannerSignals"
            :key="signal.title"
            class="rounded-2xl border border-white/10 bg-white/5 p-6"
          >
            <h3 class="text-xl font-semibold">{{ signal.title }}</h3>
            <p class="mt-3 text-indigo-100 leading-relaxed">{{ signal.description }}</p>
          </div>
        </div>
      </div>
    </section>

    <SeoLongForm
      eyebrow="Workflow"
      title="How PlanCraft AI turns raw intent into a real task plan"
      :intro="longformIntro"
      :sections="longformSections"
    >
      <template #cta>
        <div class="flex flex-col md:flex-row gap-4">
          <RouterLink
            to="/google-calendar-integration"
            class="flex-1 text-center px-6 py-3 rounded-xl bg-white text-indigo-700 font-semibold hover:bg-slate-100 transition"
          >
            Connect Google Calendar
          </RouterLink>
          <RouterLink
            to="/voice-reminder-app"
            class="flex-1 text-center px-6 py-3 rounded-xl border border-white/20 text-indigo-100 font-semibold hover:border-white transition"
          >
            Add voice reminders
          </RouterLink>
        </div>
      </template>
    </SeoLongForm>

    <section class="px-6 py-16 bg-indigo-950/60">
      <div class="max-w-5xl mx-auto">
        <div class="text-center mb-10">
          <p class="uppercase text-xs tracking-[0.35em] text-indigo-300">FAQ</p>
          <h2 class="mt-4 text-3xl md:text-4xl font-bold">AI task planner questions people actually ask</h2>
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

const workflowCards = [
  {
    tag: 'Capture',
    title: 'Speak or type tasks naturally',
    description:
      'Drop a voice note, a rough plan, or a stream-of-consciousness list. PlanCraft AI turns it into structured tasks instead of forcing rigid input.',
    points: ['Voice-to-task parsing', 'Natural language due dates', 'Fast cleanup of messy task titles'],
  },
  {
    tag: 'Prioritize',
    title: 'Build a realistic daily plan',
    description:
      'The planner looks at your day, your meetings, and your current load to suggest what should happen now, later, or not at all.',
    points: ['Calendar-aware prioritization', 'Daily focus blocks', 'Gentle handling of overdue work'],
  },
  {
    tag: 'Follow through',
    title: 'Move from planning to completion',
    description:
      'Once tasks are set, reminders and recaps keep the plan alive so you do not lose momentum by lunchtime.',
    points: ['Recurring reminders', 'Evening recaps', 'Shared visibility for teams'],
  },
]

const plannerSignals = [
  {
    title: 'Useful when your brain is moving faster than your keyboard',
    description:
      'Founders, operators, and neurodiverse planners often think in fragments. The AI task planner is built to absorb that input and still produce a clean plan.',
  },
  {
    title: 'Stronger than a plain to-do list because it understands time',
    description:
      'Tasks are more useful when the planner understands due dates, recurring reminders, and calendar pressure instead of storing everything in one flat backlog.',
  },
  {
    title: 'Built for daily planning, not just long-term task storage',
    description:
      'PlanCraft AI helps you decide what today should look like, then closes the loop with reminders and reflective recaps so tomorrow is easier.',
  },
  {
    title: 'Works for solo planning and shared workspaces',
    description:
      'You can use the AI task planner privately or bring the same structure into a team workspace with roles, shared tasks, and synced accountability.',
  },
]

const longformIntro =
      'A strong AI task planner does not stop at capture. It needs to clarify intent, place work inside time, and make follow-through easy when the day gets noisy.'

const longformSections = [
  {
    eyebrow: 'Clarify intent',
    heading: 'Turn vague input into specific next actions',
    description:
      'Instead of storing “figure out launch” as one impossible task, PlanCraft AI breaks large ideas into concrete actions you can schedule and finish.',
    bullets: [
      'Promotes next-step thinking rather than backlog hoarding',
      'Pulls due dates and reminders from natural phrases',
      'Keeps task names short, usable, and scan-friendly',
    ],
    ctaText: 'See voice-first capture',
    ctaHref: '/voice-planning',
  },
  {
    eyebrow: 'Place work in time',
    heading: 'Build around meetings, context switches, and energy',
    description:
      'The planner is more than storage because it understands when work is likely to happen. That makes the daily plan feel realistic instead of aspirational.',
    bullets: [
      'Supports calendar-aware planning for meeting-heavy days',
      'Pairs with recurring reminders when timing matters',
      'Keeps overdue or partial-date tasks from silently drifting backward',
    ],
    ctaText: 'Explore AI daily planning',
    ctaHref: '/ai-daily-planner',
  },
  {
    eyebrow: 'Protect momentum',
    heading: 'Use reminders and recaps to finish the day cleanly',
    description:
      'Once a plan exists, the real job is protecting it. PlanCraft AI adds the reminder layer that helps tasks stay visible without turning into notification spam.',
    bullets: [
      'Recurring nudges for routines and repeating commitments',
      'Evening recaps for unfinished work and quick reflection',
      'Shared reminders when a team needs to stay aligned',
    ],
    ctaText: 'Explore voice reminders',
    ctaHref: '/voice-reminder-app',
  },
]

const faqItems = [
  {
    question: 'What is the best AI task planner for voice input?',
    answer:
      'PlanCraft AI is built around voice capture, natural date parsing, reminders, and daily planning. It is strongest when you want to speak tasks out loud instead of typing every detail manually.',
  },
  {
    question: 'Can an AI task planner schedule work around meetings?',
    answer:
      'Yes. PlanCraft AI pairs with Google Calendar so the planner can place tasks around meetings, send prep reminders, and help you protect deep-work time.',
  },
  {
    question: 'Does PlanCraft AI support recurring tasks and reminders?',
    answer:
      'Yes. Repeating reminders, daily recaps, and flexible scheduling are part of the planning workflow, so recurring commitments do not disappear after the first setup.',
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
    '@type': 'HowTo',
    name: 'How to create a daily plan with PlanCraft AI',
    step: workflowCards.map((card, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: card.title,
      text: card.description,
    })),
  },
]

useSeoMeta({
  title: 'AI Task Planner | PlanCraft AI for Voice Planning and Daily Scheduling',
  description:
    'Use PlanCraft AI as an AI task planner for voice capture, daily scheduling, recurring reminders, and calendar-aware planning that actually feels realistic.',
  keywords: [
    'AI task planner',
    'AI daily planner',
    'voice task planner',
    'task planning app with reminders',
    'calendar aware task planner',
  ],
  structuredData,
  pageLabel: 'AI Task Planner',
})
</script>
