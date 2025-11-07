<template>
  <div class="min-h-screen bg-gradient-to-b from-slate-950 via-indigo-950/80 to-slate-950 text-white">
    <section class="px-6 py-20 md:py-28 text-center">
      <p class="uppercase text-xs tracking-[0.35em] text-indigo-300 mb-3">AI Reminders</p>
      <h1 class="text-4xl md:text-5xl font-extrabold leading-tight max-w-4xl mx-auto">
        Smart reminders and gentle recaps that help you finish what matters
      </h1>
      <p class="mt-5 text-lg md:text-xl text-indigo-100 max-w-3xl mx-auto leading-relaxed">
        PlanCraft AI batches nudges, WhatsApp pings, and evening recaps so productivity never feels
        like pressure.
      </p>
      <div class="mt-8 flex flex-col md:flex-row gap-4 justify-center">
        <RouterLink
          to="/login"
          class="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition font-semibold"
        >
          Enable AI reminders
        </RouterLink>
        <RouterLink
          to="/voice-planning"
          class="px-6 py-3 rounded-xl border border-white/30 font-semibold hover:border-white transition"
        >
          Pair with voice planning →
        </RouterLink>
      </div>
    </section>

    <section class="px-6 py-16">
      <div class="max-w-6xl mx-auto grid gap-6 md:grid-cols-2">
        <article
          v-for="channel in channels"
          :key="channel.title"
          class="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl"
        >
          <p class="text-indigo-300 uppercase text-xs font-semibold">{{ channel.tag }}</p>
          <h2 class="text-2xl font-bold mt-2">{{ channel.title }}</h2>
          <p class="text-indigo-100 mt-3 leading-relaxed">
            {{ channel.description }}
          </p>
          <ul class="mt-4 space-y-2 text-sm text-indigo-200">
            <li v-for="bullet in channel.points" :key="bullet">• {{ bullet }}</li>
          </ul>
        </article>
      </div>
    </section>

    <SeoLongForm
      eyebrow="Automation"
      title="Design reminder rituals that feel human"
      :intro="longformIntro"
      :sections="longformSections"
    />

    <section class="px-6 py-16 bg-white/5">
      <div class="max-w-4xl mx-auto text-center">
        <h2 class="text-3xl font-bold mb-4">Launch the reminder engine</h2>
        <p class="text-indigo-100 mb-8">
          Log in to schedule AI nudges, send digest emails, or drop WhatsApp pings right when you
          need them.
        </p>
        <div class="flex flex-col md:flex-row gap-4 justify-center">
          <RouterLink
            to="/login"
            class="px-6 py-3 rounded-xl bg-white text-indigo-700 font-semibold hover:bg-slate-100 transition"
          >
            Sign in
          </RouterLink>
          <RouterLink
            to="/pricing"
            class="px-6 py-3 rounded-xl border border-white/30 font-semibold hover:border-white transition"
          >
            Pricing
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

const channels = [
  {
    tag: 'Push & PWA',
    title: 'In-app nudges that bundle context',
    description: 'Batch reminders into one calm card with tasks, moods, and suggested next steps.',
    points: ['Custom quiet hours', 'Priority-aware scheduling', 'Snooze or reschedule easily'],
  },
  {
    tag: 'WhatsApp & SMS',
    title: 'Conversational reminders',
    description: 'Receive a gentle ping when it is time to prep for a meeting or finish a habit.',
    points: ['Link deep work timers', 'Share updates with accountability partners'],
  },
  {
    tag: 'Email recaps',
    title: 'Daily or weekly digest',
    description: 'Get actionable summaries of tasks completed, moods logged, and goals due soon.',
    points: ['Perfect for “People also ask” queries on AI recaps', 'Exportable PDF reports'],
  },
  {
    tag: 'Calendar aware',
    title: 'Pre- and post-meeting messages',
    description: 'Automatically send prep checklists or capture notes once a meeting ends.',
    points: ['Works with Google Calendar sync', 'Links to meeting docs automatically'],
  },
]

const longformIntro =
  'Instead of noisy alerts, PlanCraft AI learns when to tap you on the shoulder. Here is how teams design their reminder rituals.'

const longformSections = [
  {
    eyebrow: 'Batch',
    heading: 'Bundle multiple reminders into one update',
    description:
      'AI groups similar tasks and habits into a single nudge so you see trends without panic.',
    bullets: ['Avoids notification fatigue', 'Creates micro-celebrations for streaks'],
  },
  {
    eyebrow: 'Personalize',
    heading: 'Let reminders speak your tone',
    description:
      'Choose friendly, professional, or coaching voice templates so every nudge feels personal.',
    bullets: ['Add emojis or quotes', 'Attach intentions logged earlier'],
  },
  {
    eyebrow: 'Recap',
    heading: 'End the day with clarity',
    description:
      'Nightly recaps summarize progress, moods, and suggested goals for tomorrow—ideal for journaling.',
    bullets: ['Pairs with AI journaling assistant', 'Surfaces overdue items gently'],
  },
]

const structuredData = [
  {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'PlanCraft AI Reminder Service',
    description: 'AI-powered reminder and recap automation across push, WhatsApp, and email.',
    areaServed: 'Global',
    provider: {
      '@type': 'Organization',
      name: 'PlanCraft AI',
      url: 'https://plancraftai.com',
    },
    serviceType: 'AI reminder automation',
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      itemListElement: [
        { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Push & in-app reminders' } },
        { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'WhatsApp nudges' } },
        { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Email recaps' } },
      ],
    },
  },
]

useSeoMeta({
  title: 'AI Reminders & Recaps | PlanCraft AI Productivity App',
  description:
    'Automate push, WhatsApp, and email reminders with PlanCraft AI. Batch nudges and nightly recaps keep goals gentle but consistent.',
  keywords: ['AI reminders', 'smart reminders app', 'AI productivity app', 'AI recaps'],
  structuredData,
  pageLabel: 'AI Reminders',
})
</script>
