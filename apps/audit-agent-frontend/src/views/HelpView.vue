<template>
  <div class="min-h-full bg-pc-bg text-pc-text">
    <div class="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header class="space-y-2">
        <p class="text-xs font-semibold uppercase tracking-[0.28em] text-pc-accent-text">Support</p>
        <h1 class="text-3xl font-semibold tracking-tight sm:text-4xl">How can we help?</h1>
        <p class="max-w-2xl text-sm leading-6 text-pc-text-muted sm:text-base">
          Find a quick way forward or send the PlanCraft team a support ticket with the context they need.
        </p>
      </header>

      <section class="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <article class="rounded-3xl border border-pc-border bg-pc-surface p-6 shadow-sm sm:p-7">
          <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-pc-accent-soft text-pc-accent-text">
            <MessageCircleQuestion :size="22" :stroke-width="1.8" aria-hidden="true" />
          </div>
          <p class="mt-5 text-xs font-semibold uppercase tracking-[0.24em] text-pc-text-subtle">Support ticket</p>
          <h2 class="mt-2 text-2xl font-semibold tracking-tight">Tell us what’s stuck</h2>
          <p class="mt-2 max-w-xl text-sm leading-6 text-pc-text-muted">
            Describe the issue, what you expected to happen, and where it happened. Your note goes directly to the admin feedback queue.
          </p>
          <button
            type="button"
            class="mt-6 inline-flex items-center gap-2 rounded-xl bg-[image:var(--pc-accent-fill)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[image:var(--pc-accent-fill-hover)] focus:outline-none focus:ring-2 focus:ring-pc-accent focus:ring-offset-2"
            @click="openSupportTicket"
          >
            Raise a ticket
            <ArrowUpRight :size="17" :stroke-width="2" aria-hidden="true" />
          </button>
        </article>

        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <a
            href="mailto:support@plancraftai.com"
            class="group rounded-3xl border border-pc-border bg-pc-surface p-5 shadow-sm transition hover:border-pc-border-strong hover:shadow-md"
          >
            <div class="flex items-center justify-between gap-3">
              <span class="flex h-10 w-10 items-center justify-center rounded-2xl bg-pc-surface-2 text-pc-accent-text">
                <Mail :size="19" :stroke-width="1.8" aria-hidden="true" />
              </span>
              <ArrowUpRight :size="16" class="text-pc-text-subtle transition group-hover:text-pc-accent-text" aria-hidden="true" />
            </div>
            <h2 class="mt-4 text-base font-semibold">Email support</h2>
            <p class="mt-1 text-sm text-pc-text-muted">support@plancraftai.com</p>
          </a>

          <button
            type="button"
            class="group rounded-3xl border border-pc-border bg-pc-surface p-5 text-left shadow-sm transition hover:border-pc-border-strong hover:shadow-md"
            @click="openFeedback"
          >
            <div class="flex items-center justify-between gap-3">
              <span class="flex h-10 w-10 items-center justify-center rounded-2xl bg-pc-surface-2 text-pc-accent-text">
                <Lightbulb :size="19" :stroke-width="1.8" aria-hidden="true" />
              </span>
              <ArrowUpRight :size="16" class="text-pc-text-subtle transition group-hover:text-pc-accent-text" aria-hidden="true" />
            </div>
            <h2 class="mt-4 text-base font-semibold">Share feedback</h2>
            <p class="mt-1 text-sm text-pc-text-muted">Suggest an idea or tell us what is working.</p>
          </button>
        </div>
      </section>

      <section class="rounded-3xl border border-pc-border bg-pc-surface p-6 shadow-sm sm:p-7">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.24em] text-pc-text-subtle">Quick links</p>
          <h2 class="mt-2 text-xl font-semibold tracking-tight">Keep moving in PlanCraft</h2>
        </div>
        <div class="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <RouterLink v-for="link in quickLinks" :key="link.label" :to="link.to" class="help-link-card">
            <component :is="link.icon" :size="18" :stroke-width="1.8" aria-hidden="true" />
            <span>{{ link.label }}</span>
            <ChevronRight :size="16" class="ml-auto text-pc-text-subtle" aria-hidden="true" />
          </RouterLink>
        </div>
      </section>

      <section class="rounded-3xl border border-pc-border bg-pc-surface-2 p-6 sm:p-7">
        <p class="text-xs font-semibold uppercase tracking-[0.24em] text-pc-text-subtle">Legal & account</p>
        <div class="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <RouterLink v-for="link in legalLinks" :key="link.label" :to="link.to" class="help-link-card bg-pc-surface">
            <span>{{ link.label }}</span>
            <ArrowUpRight :size="16" class="ml-auto text-pc-text-subtle" aria-hidden="true" />
          </RouterLink>
          <a href="mailto:support@plancraftai.com" class="help-link-card bg-pc-surface">
            <span>Email support</span>
            <ArrowUpRight :size="16" class="ml-auto text-pc-text-subtle" aria-hidden="true" />
          </a>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ArrowUpRight, BookOpen, Boxes, CalendarDays, ChevronRight, Lightbulb, Mail, MessageCircleQuestion, Settings2 } from 'lucide-vue-next'
import { RouterLink, useRoute } from 'vue-router'
import { useFeedbackStore } from '@/stores/feedbackStore'
import { useSeoMeta } from '@/composables/useSeoMeta'

const feedbackStore = useFeedbackStore()
const route = useRoute()

const quickLinks = [
  { label: 'Today', to: '/today', icon: CalendarDays },
  { label: 'Workspaces', to: '/workspaces', icon: Boxes },
  { label: 'Journal', to: '/journal', icon: BookOpen },
  { label: 'Settings', to: '/settings', icon: Settings2 },
]

const legalLinks = [
  { label: 'Privacy Policy', to: '/privacy' },
  { label: 'Terms of Service', to: '/terms' },
  { label: 'Contact', to: '/contact' },
]

useSeoMeta({
  title: 'Help Center | PlanCraft AI Support',
  description: 'Get help with PlanCraft AI, report an issue, or send a support ticket to the PlanCraft team.',
  keywords: ['PlanCraft help', 'PlanCraft support', 'PlanCraft AI assistance'],
  canonicalPath: '/help',
})

function openSupportTicket() {
  feedbackStore.openSupportTicket({ route: route.name || route.path, source: 'help-view' })
}

function openFeedback() {
  feedbackStore.openDrawer({ route: route.name || route.path, source: 'help-feedback' })
}
</script>

<style scoped>
.help-link-card {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  min-height: 3rem;
  border: 1px solid var(--pc-border);
  border-radius: 0.9rem;
  padding: 0.75rem 0.9rem;
  color: var(--pc-text);
  font-size: 0.875rem;
  font-weight: 600;
  transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
}

.help-link-card:hover {
  border-color: var(--pc-border-strong);
  box-shadow: var(--pc-shadow-sm);
  transform: translateY(-1px);
}
</style>
