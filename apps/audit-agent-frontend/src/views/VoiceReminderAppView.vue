<template>
  <div class="marketing-light voice-reminder-page min-h-screen bg-pc-bg text-pc-text">
    <section class="border-b border-pc-border bg-pc-bg">
      <div class="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 pb-14 pt-12 sm:px-6 md:pb-20 md:pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.3em] text-pc-accent-text">Voice reminders</p>
          <h1 class="mt-4 max-w-xl text-4xl font-semibold tracking-tight text-pc-text sm:text-5xl">
            Speak it once. Keep it on time.
          </h1>
          <p class="mt-5 max-w-xl text-base leading-7 text-pc-text-muted sm:text-lg">
            Turn a quick voice note into a task with the right time, context, and follow-through. No separate alarm list to maintain.
          </p>
          <div class="mt-7 flex flex-col gap-3 sm:flex-row">
            <RouterLink
              to="/login"
              class="inline-flex items-center justify-center rounded-xl bg-[image:var(--pc-accent-fill)] px-5 py-3 text-sm font-semibold text-white shadow-pc-button transition hover:bg-[image:var(--pc-accent-fill-hover)]"
            >
              Start planning free
              <ArrowUpRight :size="16" class="ml-2" aria-hidden="true" />
            </RouterLink>
            <RouterLink
              to="/recurring-reminder-app"
              class="inline-flex items-center justify-center rounded-xl border border-pc-border-strong bg-pc-surface px-5 py-3 text-sm font-semibold text-pc-text transition hover:border-pc-accent hover:text-pc-accent-text"
            >
              Explore recurring reminders
            </RouterLink>
          </div>
          <div class="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-pc-text-subtle">
            <span class="inline-flex items-center gap-1.5"><Check :size="14" class="text-pc-success" aria-hidden="true" /> Natural language capture</span>
            <span class="inline-flex items-center gap-1.5"><Check :size="14" class="text-pc-success" aria-hidden="true" /> One-time or recurring</span>
          </div>
        </div>

        <div class="voice-reminder-preview rounded-[28px] border border-pc-border bg-pc-surface p-4 shadow-xl sm:p-5">
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-2.5">
              <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-pc-accent-soft text-pc-accent-text">
                <Mic2 :size="18" :stroke-width="1.8" aria-hidden="true" />
              </span>
              <div>
                <p class="text-sm font-semibold text-pc-text">Quick capture</p>
                <p class="text-xs text-pc-text-subtle">Voice reminder</p>
              </div>
            </div>
            <span class="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              <span class="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true"></span>
              Ready
            </span>
          </div>

          <div class="mt-5 rounded-2xl border border-pc-border bg-pc-surface-2 p-4">
            <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-pc-text-subtle">Example reminder</p>
            <p class="mt-2 text-base font-medium leading-6 text-pc-text" aria-live="polite">“{{ sampleVoiceText }}”</p>
          </div>

          <div class="mt-3 flex flex-wrap gap-2">
            <span class="voice-reminder-chip"><Clock3 :size="14" aria-hidden="true" /> Tomorrow · 5:00 PM</span>
            <span class="voice-reminder-chip"><Repeat2 :size="14" aria-hidden="true" /> One-time</span>
          </div>

          <div class="mt-5 flex items-center gap-3 rounded-2xl border border-pc-border bg-pc-surface px-3 py-3">
            <VoiceRecorder
              icon-only
              surface="voice_reminder_preview"
              @transcribed="handleVoiceTranscript"
            />
            <div class="min-w-0">
              <p class="text-sm font-semibold text-pc-text">Tap to speak a reminder</p>
              <p class="mt-0.5 text-xs leading-5 text-pc-text-muted">PlanCraft will keep the words and the timing together.</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 md:py-16">
      <div class="max-w-2xl">
        <p class="text-xs font-semibold uppercase tracking-[0.3em] text-pc-accent-text">A calmer workflow</p>
        <h2 class="mt-3 text-3xl font-semibold tracking-tight text-pc-text">From thought to follow-through in three steps</h2>
        <p class="mt-3 text-base leading-7 text-pc-text-muted">Capture quickly, add structure automatically, and keep the reminder where the work already lives.</p>
      </div>
      <div class="mt-8 grid gap-4 md:grid-cols-3">
        <article v-for="(card, index) in reminderCards" :key="card.title" class="rounded-3xl border border-pc-border bg-pc-surface p-5 shadow-sm">
          <div class="flex items-center justify-between gap-3">
            <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-pc-accent-soft text-sm font-semibold text-pc-accent-text">0{{ index + 1 }}</span>
            <span class="text-xs font-semibold uppercase tracking-[0.2em] text-pc-text-subtle">{{ card.tag }}</span>
          </div>
          <h3 class="mt-5 text-lg font-semibold tracking-tight text-pc-text">{{ card.title }}</h3>
          <p class="mt-2 text-sm leading-6 text-pc-text-muted">{{ card.description }}</p>
          <ul class="mt-4 space-y-2 text-sm text-pc-text-muted">
            <li v-for="point in card.points.slice(0, 2)" :key="point" class="flex items-start gap-2">
              <Check :size="15" class="mt-0.5 shrink-0 text-pc-accent-text" aria-hidden="true" />
              <span>{{ point }}</span>
            </li>
          </ul>
        </article>
      </div>
    </section>

    <section class="border-y border-pc-border bg-pc-surface-2">
      <div class="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 md:py-16">
        <div class="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.3em] text-pc-accent-text">Why it works</p>
            <h2 class="mt-3 text-3xl font-semibold tracking-tight text-pc-text">More useful than a generic alarm</h2>
            <p class="mt-3 text-base leading-7 text-pc-text-muted">The reminder stays attached to the task, so the next action is clear when the nudge arrives.</p>
          </div>
          <div class="grid gap-3 sm:grid-cols-2">
            <article v-for="benefit in reminderBenefits" :key="benefit.title" class="rounded-2xl border border-pc-border bg-pc-surface p-4 shadow-sm">
              <h3 class="text-base font-semibold text-pc-text">{{ benefit.title }}</h3>
              <p class="mt-2 text-sm leading-6 text-pc-text-muted">{{ benefit.description }}</p>
            </article>
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
        <div class="flex flex-col gap-3 sm:flex-row">
          <RouterLink
            to="/ai-task-planner"
            class="inline-flex flex-1 items-center justify-center rounded-xl bg-[image:var(--pc-accent-fill)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[image:var(--pc-accent-fill-hover)]"
          >
            Pair with the AI task planner
          </RouterLink>
          <RouterLink
            to="/ai-daily-planner"
            class="inline-flex flex-1 items-center justify-center rounded-xl border border-pc-border-strong bg-pc-surface px-5 py-3 text-sm font-semibold text-pc-text transition hover:border-pc-accent hover:text-pc-accent-text"
          >
            Build the daily plan
          </RouterLink>
        </div>
      </template>
    </SeoLongForm>

    <section class="mx-auto w-full max-w-5xl px-4 py-14 sm:px-6 md:py-16">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.3em] text-pc-accent-text">FAQ</p>
        <h2 class="mt-3 text-3xl font-semibold tracking-tight text-pc-text">Voice reminder questions</h2>
      </div>
      <div class="mt-7 grid gap-3">
          <article
            v-for="faq in faqItems"
            :key="faq.question"
            class="rounded-2xl border border-pc-border bg-pc-surface p-5 shadow-sm"
          >
            <h3 class="text-base font-semibold text-pc-text">{{ faq.question }}</h3>
            <p class="mt-2 text-sm leading-6 text-pc-text-muted">{{ faq.answer }}</p>
          </article>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { ArrowUpRight, Check, Clock3, Mic2, Repeat2 } from 'lucide-vue-next'
import SeoLongForm from '@/components/SeoLongForm.vue'
import VoiceRecorder from '@/components/VoiceRecorder.vue'
import { useSeoMeta } from '@/composables/useSeoMeta'

const sampleVoiceText = ref('Remind me to call Sam tomorrow at 5')

function handleVoiceTranscript(text) {
  if (text?.trim()) sampleVoiceText.value = text.trim()
}

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

<style scoped>
.voice-reminder-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border: 1px solid var(--pc-border);
  border-radius: 999px;
  background: var(--pc-surface-2);
  padding: 0.4rem 0.65rem;
  color: var(--pc-text-muted);
  font-size: 0.75rem;
  font-weight: 600;
}

.voice-reminder-chip :deep(svg) {
  color: var(--pc-accent-text);
}
</style>
