<template>
  <div class="min-h-screen bg-gradient-to-b from-slate-950 via-indigo-950/80 to-slate-950 text-white">
    <section class="px-6 py-20 md:py-28 text-center">
      <p class="uppercase text-xs tracking-[0.35em] text-indigo-300 mb-3">Recurring Reminder App</p>
      <h1 class="text-4xl md:text-5xl font-extrabold leading-tight max-w-4xl mx-auto">
        Recurring reminder app for daily habits, follow-ups, and recurring commitments
      </h1>
      <p class="mt-5 text-lg md:text-xl text-indigo-100 max-w-3xl mx-auto leading-relaxed">
        PlanCraft AI handles repeating reminders without making them feel robotic. Create daily,
        weekly, or custom reminder flows, then deliver them through push, WhatsApp, or recap-style nudges.
      </p>
      <div class="mt-8 flex flex-col md:flex-row gap-4 justify-center">
        <RouterLink
          to="/login"
          class="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition font-semibold"
        >
          Start recurring reminders
        </RouterLink>
        <RouterLink
          to="/ai-reminders"
          class="px-6 py-3 rounded-xl border border-white/30 font-semibold hover:border-white transition"
        >
          See reminder engine →
        </RouterLink>
      </div>
    </section>

    <section class="px-6 py-16 bg-white/5">
      <div class="max-w-6xl mx-auto grid gap-6 md:grid-cols-3">
        <article
          v-for="pattern in reminderPatterns"
          :key="pattern.title"
          class="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl"
        >
          <p class="text-indigo-300 uppercase text-xs font-semibold">{{ pattern.tag }}</p>
          <h2 class="text-2xl font-bold mt-2">{{ pattern.title }}</h2>
          <p class="text-indigo-100 mt-3 leading-relaxed">{{ pattern.description }}</p>
          <ul class="mt-4 space-y-2 text-sm text-indigo-200">
            <li v-for="point in pattern.points" :key="point">• {{ point }}</li>
          </ul>
        </article>
      </div>
    </section>

    <section class="px-6 py-16">
      <div class="max-w-5xl mx-auto">
        <div class="text-center max-w-3xl mx-auto">
          <p class="uppercase text-xs tracking-[0.35em] text-indigo-300">Why it ranks better than a basic reminder list</p>
          <h2 class="mt-4 text-3xl md:text-4xl font-bold">Recurring reminders need context, not just repetition</h2>
          <p class="mt-4 text-indigo-100 text-lg leading-relaxed">
            A recurring reminder app only works when it understands the task behind the reminder. PlanCraft AI keeps the schedule flexible, the message useful, and the recap loop intact.
          </p>
        </div>
        <div class="mt-10 grid gap-6 md:grid-cols-2">
          <div
            v-for="benefit in reminderBenefits"
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
      eyebrow="Reminder Design"
      title="How PlanCraft AI handles recurring reminders without feeling spammy"
      :intro="longformIntro"
      :sections="longformSections"
    >
      <template #cta>
        <div class="flex flex-col md:flex-row gap-4">
          <RouterLink
            to="/voice-reminder-app"
            class="flex-1 text-center px-6 py-3 rounded-xl bg-white text-indigo-700 font-semibold hover:bg-slate-100 transition"
          >
            See the voice reminder app
          </RouterLink>
          <RouterLink
            to="/ai-daily-planner"
            class="flex-1 text-center px-6 py-3 rounded-xl border border-white/20 text-indigo-100 font-semibold hover:border-white transition"
          >
            Build the daily plan
          </RouterLink>
        </div>
      </template>
    </SeoLongForm>

    <section class="px-6 py-16 bg-indigo-950/60">
      <div class="max-w-5xl mx-auto">
        <div class="text-center mb-10">
          <p class="uppercase text-xs tracking-[0.35em] text-indigo-300">FAQ</p>
          <h2 class="mt-4 text-3xl md:text-4xl font-bold">Recurring reminder app questions</h2>
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

const reminderPatterns = [
  {
    tag: 'Daily',
    title: 'Habit reminders that stay gentle',
    description:
      'Set repeating reminders for workouts, journaling, medication, admin tasks, or shutdown rituals without turning the app into a notification firehose.',
    points: ['Daily or weekday schedules', 'Quiet hours', 'On-due-day prompts with optional lead time'],
  },
  {
    tag: 'Weekly',
    title: 'Follow-up reminders for work that repeats',
    description:
      'Use recurring reminder flows for reviews, team follow-ups, invoices, or weekly planning rituals that always seem to slip.',
    points: ['Weekly and monthly cadence', 'Workspace-friendly reminders', 'Shared accountability moments'],
  },
  {
    tag: 'Custom',
    title: 'Flexible reminders when the pattern is not obvious',
    description:
      'Custom schedules work well when reminders need to adapt to meetings, moving deadlines, or natural-language dates instead of a rigid repeat rule.',
    points: ['Custom intervals', 'Partial-date normalization', 'Calendar-aware timing'],
  },
]

const reminderBenefits = [
  {
    title: 'More useful than a repeating alarm',
    description:
      'PlanCraft AI reminders include context from the task itself, which makes each nudge actionable instead of generic.',
  },
  {
    title: 'Works across push, WhatsApp, and recap flows',
    description:
      'Different reminders belong in different channels. Some should be instant. Others should be grouped into a nightly recap.',
  },
  {
    title: 'Built to handle recurring tasks and recurring people workflows',
    description:
      'Use it for habits, admin routines, client follow-ups, prep reminders, and lightweight accountability across a team workspace.',
  },
  {
    title: 'Prevents silent date mistakes from eroding trust',
    description:
      'Date normalization keeps partial dates and future occurrences moving forward so reminders do not land in the past or disappear into invalid schedules.',
  },
]

const longformIntro =
  'The best recurring reminder app keeps the right level of repetition while still respecting context. PlanCraft AI combines schedules, channel logic, and recap behavior in one reminder system.'

const longformSections = [
  {
    eyebrow: 'Set the cadence',
    heading: 'Define when the reminder should repeat',
    description:
      'Some reminders repeat every day. Others belong on weekdays, monthly checkpoints, or custom intervals. PlanCraft AI supports all three without forcing one rigid model.',
    bullets: [
      'Daily, weekly, monthly, or custom repeat patterns',
      'Lead-time offsets like “2 days before”',
      'Due-day-only reminders when that is all you need',
    ],
    ctaText: 'See the reminder engine',
    ctaHref: '/ai-reminders',
  },
  {
    eyebrow: 'Choose the right channel',
    heading: 'Match the reminder to the moment',
    description:
      'An urgent prep reminder may belong in push. A softer reflection may belong in an evening recap. Channel choice matters as much as timing.',
    bullets: [
      'Push reminders for direct action',
      'WhatsApp or email for conversational follow-ups',
      'Digest-style recaps to reduce interruption',
    ],
    ctaText: 'See the voice reminder app',
    ctaHref: '/voice-reminder-app',
  },
  {
    eyebrow: 'Close the loop',
    heading: 'Use recurring reminders as part of a full planning system',
    description:
      'Reminders work best when they connect back to a planner, a calendar, and a reflection layer. That is why PlanCraft AI treats reminders as one part of a daily operating system.',
    bullets: [
      'Capture repeating tasks by voice',
      'Sync schedules with calendar context',
      'Review unfinished reminders in the nightly recap',
    ],
    ctaText: 'Build the daily plan',
    ctaHref: '/ai-daily-planner',
  },
]

const faqItems = [
  {
    question: 'What is the best recurring reminder app for daily routines?',
    answer:
      'PlanCraft AI is strong for daily routines because it combines repeating schedules with reminders, recaps, and calendar-aware timing instead of acting like a simple alarm list.',
  },
  {
    question: 'Can I create weekly or custom repeating reminders?',
    answer:
      'Yes. PlanCraft AI supports daily, weekly, monthly, and custom reminder intervals, plus lead-time reminders such as sending a nudge a few days before the due date.',
  },
  {
    question: 'Does the recurring reminder app work with tasks and calendars?',
    answer:
      'Yes. Recurring reminders connect directly to tasks, voice-planned input, and Google Calendar workflows so reminders match the work they are supposed to support.',
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
    name: 'PlanCraft AI Recurring Reminder App',
    serviceType: 'Recurring reminder app',
    provider: {
      '@type': 'Organization',
      name: 'PlanCraft AI',
      url: 'https://plancraftai.com',
    },
    areaServed: 'Global',
    description:
      'Recurring reminder app for daily habits, weekly follow-ups, calendar-aware nudges, and recap-style reminder flows.',
  },
]

useSeoMeta({
  title: 'Recurring Reminder App | PlanCraft AI for Daily, Weekly, and Smart Nudges',
  description:
    'Use PlanCraft AI as a recurring reminder app for daily routines, weekly follow-ups, custom reminder intervals, and recurring task automation.',
  keywords: [
    'recurring reminder app',
    'repeating reminders app',
    'daily reminder app',
    'weekly reminder app',
    'smart recurring reminders',
  ],
  structuredData,
  pageLabel: 'Recurring Reminder App',
})
</script>
