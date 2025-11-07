<template>
  <div class="min-h-screen bg-gradient-to-b from-slate-950 via-indigo-950/70 to-black text-white">
    <section class="px-6 py-20 md:py-28 text-center">
      <p class="uppercase text-xs tracking-[0.35em] text-indigo-300 mb-3">Google Calendar Sync</p>
      <h1 class="text-4xl md:text-5xl font-extrabold leading-tight max-w-4xl mx-auto">
        Connect PlanCraft AI to Google Calendar for meetings, prep, and recap automation
      </h1>
      <p class="mt-5 text-lg md:text-xl text-indigo-100 max-w-3xl mx-auto leading-relaxed">
        Turn every event into a plan: pre-meeting checklists, voice notes turned into follow-ups, and
        nightly summaries tied to your calendar.
      </p>
      <div class="mt-8 flex flex-col md:flex-row gap-4 justify-center">
        <RouterLink
          to="/login"
          class="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition font-semibold"
        >
          Connect Google Calendar
        </RouterLink>
        <RouterLink
          to="/voice-planning"
          class="px-6 py-3 rounded-xl border border-white/30 font-semibold hover:border-white transition"
        >
          Pair with voice planning →
        </RouterLink>
      </div>
    </section>

    <section class="px-6 py-16 bg-white/5">
      <div class="max-w-5xl mx-auto grid gap-8 md:grid-cols-3">
        <article
          v-for="block in blocks"
          :key="block.title"
          class="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl"
        >
          <p class="text-indigo-300 uppercase text-xs font-semibold">{{ block.tag }}</p>
          <h2 class="text-2xl font-bold mt-2">{{ block.title }}</h2>
          <p class="text-indigo-100 mt-3 leading-relaxed">
            {{ block.description }}
          </p>
          <ul class="mt-4 text-sm text-indigo-200 space-y-2">
            <li v-for="item in block.points" :key="item">• {{ item }}</li>
          </ul>
        </article>
      </div>
    </section>

    <SeoLongForm
      eyebrow="Workflow"
      title="Make every meeting actionable with AI"
      :intro="longformIntro"
      :sections="longformSections"
    />
  </div>
</template>

<script setup>
import { RouterLink } from 'vue-router'
import SeoLongForm from '@/components/SeoLongForm.vue'
import { useSeoMeta } from '@/composables/useSeoMeta'

const blocks = [
  {
    tag: 'Connect',
    title: 'One-click OAuth connection',
    description: 'Securely link Google Calendar and choose which calendars to sync.',
    points: ['Works with personal or Workspace', 'Respect read-only calendars', 'Auto refresh tokens'],
  },
  {
    tag: 'Prep',
    title: 'Pre-meeting reminders',
    description: 'Receive AI checklists and talking points before every event.',
    points: ['Attach notes from previous meetings', 'Add voice-planned talking points'],
  },
  {
    tag: 'Recap',
    title: 'Post-meeting journaling',
    description: 'Dictate action items and instantly sync them back to your task board.',
    points: ['Generate follow-up emails', 'Schedule next steps instantly'],
  },
]

const longformIntro =
  'When Google Calendar meets PlanCraft AI, you stop copying information between tools. Here is the weekly rhythm most users follow.'

const longformSections = [
  {
    eyebrow: 'Sunday setup',
    heading: 'Import the week and assign focus blocks',
    description:
      'AI suggests when to focus, when to rest, and which meetings may need prep time or delegation.',
    bullets: ['Detects overbooked days', 'Creates breathing room automatically'],
  },
  {
    eyebrow: 'Daily prep',
    heading: 'Receive context briefs before meetings',
    description:
      'PlanCraft AI assembles bios, past notes, and tasks into one card so you walk in prepared.',
    bullets: ['Works great with voice journaling', 'Links to documents and recordings'],
  },
  {
    eyebrow: 'Weekly retro',
    heading: 'Roll up meetings into goal progress',
    description:
      'AI recaps highlight which events moved goals forward and where to adjust commitments.',
    bullets: ['Automatic PDF or email exports', 'Share with clients or teammates'],
  },
]

const structuredData = [
  {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'How to connect PlanCraft AI to Google Calendar',
    step: [
      {
        '@type': 'HowToStep',
        position: 1,
        name: 'Authorize PlanCraft AI',
        text: 'Log in, open Integrations, and click “Connect Google Calendar”.',
      },
      {
        '@type': 'HowToStep',
        position: 2,
        name: 'Choose calendars',
        text: 'Select personal, work, or shared calendars and pick sync direction.',
      },
      {
        '@type': 'HowToStep',
        position: 3,
        name: 'Enable smart reminders',
        text: 'Decide when prep checklists or recaps should be sent for each meeting type.',
      },
    ],
  },
]

useSeoMeta({
  title: 'Google Calendar Integration | PlanCraft AI Planner for Goals',
  description:
    'Link Google Calendar to PlanCraft AI to receive AI meeting prep, reminders, and follow-up recaps tied to your goals.',
  keywords: [
    'Google Calendar integration',
    'AI planner for goals',
    'calendar sync AI planner',
    'AI meeting prep',
  ],
  structuredData,
  pageLabel: 'Calendar Integration',
})
</script>
