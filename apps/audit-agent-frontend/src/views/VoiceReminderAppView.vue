<template>
  <div class="min-h-screen bg-gradient-to-b from-slate-950 via-indigo-950/80 to-slate-950 text-white">
    <section class="px-6 py-20 md:py-28 text-center">
      <p class="uppercase text-xs tracking-[0.35em] text-indigo-300 mb-3">Voice Reminder App</p>
      <h1 class="text-4xl md:text-5xl font-extrabold leading-tight max-w-4xl mx-auto">
        Voice reminder app for spoken tasks, follow-ups, and hands-free reminders
      </h1>
      <p class="mt-5 text-lg md:text-xl text-indigo-100 max-w-3xl mx-auto leading-relaxed">
        PlanCraftAI lets you say the reminder the moment you think of it. Turn spoken tasks into
        scheduled reminders, pair them with real work, and stop trusting memory to hold everything together.
      </p>
      <div class="mt-8 flex flex-col md:flex-row gap-4 justify-center">
        <RouterLink
          to="/login"
          class="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition font-semibold"
        >
          Start planning free
        </RouterLink>
        <RouterLink
          to="/recurring-reminder-app"
          class="px-6 py-3 rounded-xl border border-white/30 font-semibold hover:border-white transition"
        >
          Explore recurring reminders ->
        </RouterLink>
      </div>
    </section>

    <section class="px-6 py-16 bg-white/5">
      <div class="max-w-6xl mx-auto grid gap-6 md:grid-cols-3">
        <article
          v-for="card in reminderCards"
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
          <p class="uppercase text-xs tracking-[0.35em] text-indigo-300">Why this ranks</p>
          <h2 class="mt-4 text-3xl md:text-4xl font-bold">Voice reminders work because capture happens instantly</h2>
          <p class="mt-4 text-indigo-100 text-lg leading-relaxed">
            People searching for a voice reminder app usually want speed first. PlanCraftAI handles
            the reminder, the task behind it, and the timing logic in one place.
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
      eyebrow="Voice Workflow"
      title="How PlanCraftAI turns spoken reminders into follow-through"
      :intro="longformIntro"
      :sections="longformSections"
    >
      <template #cta>
        <div class="flex flex-col md:flex-row gap-4">
          <RouterLink
            to="/ai-task-planner"
            class="flex-1 text-center px-6 py-3 rounded-xl bg-white text-indigo-700 font-semibold hover:bg-slate-100 transition"
          >
            Pair with the AI task planner
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
          <h2 class="mt-4 text-3xl md:text-4xl font-bold">Voice reminder app questions</h2>
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

const reminderCards = [
  {
    tag: 'Speak once',
    title: 'Capture reminders the moment you think of them',
    description:
      'Instead of typing everything into a task field, speak the reminder in natural language and let PlanCraftAI structure the task, time, and follow-up.',
    points: ['Natural voice input', 'Date parsing from speech', 'Fast task creation from reminders'],
  },
  {
    tag: 'Schedule it',
    title: 'Turn speech into useful timing',
    description:
      'A voice reminder app only matters if the timing lands correctly. PlanCraftAI turns spoken dates and times into reminder behavior you can trust.',
    points: ['Tomorrow-at-5 style parsing', 'Recurring reminders', 'Calendar-aware reminder timing'],
  },
  {
    tag: 'Follow through',
    title: 'Keep the reminder connected to real work',
    description:
      'The reminder is tied to a task, not left as a disconnected alarm. That keeps context visible when it is time to act.',
    points: ['Task-linked reminders', 'Push or recap delivery', 'Shared visibility in workspaces'],
  },
]

const reminderBenefits = [
  {
    title: 'Faster than switching apps mid-thought',
    description:
      'Voice capture is useful when you are walking, between meetings, or trying not to lose context while working on something else.',
  },
  {
    title: 'More useful than a generic alarm',
    description:
      'A spoken reminder becomes a real task with context, due timing, and follow-up options instead of a bare notification you swipe away.',
  },
  {
    title: 'Works for one-off reminders and repeating routines',
    description:
      'Use it for a single follow-up, a weekly prep reminder, or recurring reminders that support habits and repeat commitments.',
  },
  {
    title: 'Fits into a broader planning system',
    description:
      'The voice reminder app connects with the AI task planner and AI daily planner so the reminder lives inside a full workflow, not a disconnected list.',
  },
]

const longformIntro =
  'A strong voice reminder app should not stop at transcription. It should turn speech into timing, connect the reminder to a task, and make follow-through easier when the day gets noisy.'

const longformSections = [
  {
    eyebrow: 'Capture',
    heading: 'Say the reminder the way you naturally think it',
    description:
      'People do not think in form fields. PlanCraftAI accepts messy spoken phrasing and turns it into structured reminders tied to real work.',
    bullets: [
      'Capture reminders from voice notes and quick thoughts',
      'Translate natural language into tasks and due times',
      'Reduce the friction that makes reminders never get entered',
    ],
    ctaText: 'See the AI task planner',
    ctaHref: '/ai-task-planner',
  },
  {
    eyebrow: 'Schedule',
    heading: 'Make spoken timing land in the future, not in the past',
    description:
      'Reminder trust depends on date handling. PlanCraftAI normalizes partial dates and schedule logic so reminder timing stays useful instead of silently failing.',
    bullets: [
      'Handle spoken dates like "tomorrow at 5"',
      'Support partial dates and next valid occurrences',
      'Use recurring schedules when a reminder should repeat',
    ],
    ctaText: 'Explore recurring reminders',
    ctaHref: '/recurring-reminder-app',
  },
  {
    eyebrow: 'Follow through',
    heading: 'Keep the reminder visible in the plan',
    description:
      'The reminder becomes much more useful when it can live inside a daily plan, not just as a notification. That is where PlanCraftAI closes the loop.',
    bullets: [
      'Connect reminders to tasks and calendar context',
      'Review unfinished reminders in recaps',
      'Use workspace visibility when the reminder involves a team',
    ],
    ctaText: 'Build the daily plan',
    ctaHref: '/ai-daily-planner',
  },
]

const faqItems = [
  {
    question: 'What is the best voice reminder app for tasks?',
    answer:
      'PlanCraftAI is built for task-based reminders because it turns speech into a reminder plus a real task, instead of leaving the reminder disconnected from the work it belongs to.',
  },
  {
    question: 'Can I create reminders by speaking naturally?',
    answer:
      'Yes. You can say phrases like "remind me to call John tomorrow at 5" and PlanCraftAI will parse the reminder details into a scheduled task flow.',
  },
  {
    question: 'Does the voice reminder app support recurring reminders too?',
    answer:
      'Yes. Voice-created reminders can also become recurring reminders when the work repeats daily, weekly, monthly, or on a custom schedule.',
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
    name: 'PlanCraftAI Voice Reminder App',
    serviceType: 'Voice reminder app',
    provider: {
      '@type': 'Organization',
      name: 'PlanCraftAI',
      url: 'https://plancraftai.com',
    },
    areaServed: 'Global',
    description:
      'Voice reminder app for spoken tasks, natural-language reminder scheduling, recurring reminders, and hands-free follow-up workflows.',
  },
]

useSeoMeta({
  title: 'Voice Reminder App | PlanCraftAI for Spoken Tasks and Smart Reminders',
  description:
    'Use PlanCraftAI as a voice reminder app to speak tasks, schedule reminders naturally, and keep follow-ups tied to a real planning workflow.',
  keywords: [
    'voice reminder app',
    'voice reminders app',
    'spoken reminder app',
    'voice reminder app for tasks',
    'AI reminder app',
    'recurring reminder app',
  ],
  canonicalPath: '/voice-reminder-app',
  structuredData,
  pageLabel: 'Voice Reminder App',
})
</script>
