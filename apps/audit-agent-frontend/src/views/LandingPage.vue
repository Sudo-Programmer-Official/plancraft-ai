<template>
  <div class="lp">
    <!-- Nav -->
    <header class="lp-nav">
      <div class="lp-container lp-nav__inner">
        <RouterLink to="/" class="lp-brand" aria-label="PlanCraftAI home">
          <img
            src="/icons/icon-96x96.png"
            srcset="/icons/icon-96x96.png 1x, /icons/icon-192x192.png 2x"
            alt=""
            width="36"
            height="36"
            class="lp-brand__icon"
          />
          <span class="lp-brand__name">PlanCraftAI</span>
        </RouterLink>

        <nav class="lp-nav__links" aria-label="Primary">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <a href="#focus">Focus</a>
          <a href="#pricing">Pricing</a>
          <a href="#faq">FAQ</a>
        </nav>

        <div class="lp-nav__actions">
          <RouterLink to="/login" class="lp-nav__signin">Sign in</RouterLink>
          <button type="button" class="lp-btn lp-btn--primary lp-btn--sm" @click="startGuestPlanner('nav')">
            Start free
          </button>
        </div>
      </div>
    </header>

    <main>
      <!-- Hero -->
      <section class="lp-hero">
        <div class="lp-container lp-hero__grid">
          <div class="lp-hero__copy">
            <p class="lp-chip">
              <span>Your thoughts</span>
              <ArrowRight :size="14" aria-hidden="true" />
              <span>A clear plan</span>
              <Sparkles :size="14" aria-hidden="true" class="lp-chip__spark" />
            </p>
            <h1 id="hero-title" class="lp-hero__title">
              Say what you need to do.
              <span class="lp-gradient-text">PlanCraft</span> turns it into a plan.
            </h1>
            <p class="lp-hero__lede">
              Speak naturally. PlanCraft creates the tasks, understands when they need to happen, and
              reminds you when it's time. So you can focus on what matters.
            </p>

            <div class="lp-hero__ctas">
              <button type="button" class="lp-btn lp-btn--primary lp-btn--lg" @click="startGuestPlanner('hero')">
                Start planning free
                <ArrowRight :size="18" aria-hidden="true" />
              </button>
              <StoreBadges v-if="showStoreBadges" location="hero" />
            </div>

            <ul class="lp-trust" aria-label="Highlights">
              <li v-for="item in trustPoints" :key="item">
                <CircleCheck :size="16" aria-hidden="true" class="lp-i" />
                {{ item }}
              </li>
            </ul>
          </div>

          <div class="lp-hero__device">
            <div class="lp-hero__glow" aria-hidden="true"></div>
            <ScreenshotSlot
              name="today"
              label="Today"
              alt="PlanCraftAI live task creation flow from voice capture to a planned task"
              :sequence="['today', 'voice-capture', 'task-created']"
              :sequence-interval="4200"
              sizes="(min-width: 1024px) 320px, 70vw"
              eager
              class="lp-hero__phone"
            />
          </div>
        </div>
      </section>

      <!-- How it works -->
      <section id="how-it-works" class="lp-section">
        <div class="lp-container">
          <header class="lp-heading">
            <p class="lp-eyebrow">How it works</p>
            <h2>From a thought to real progress.</h2>
            <p>Turn your ideas into a plan in seconds.</p>
          </header>

          <ol class="lp-steps">
            <li v-for="(step, index) in howItWorks" :key="step.shot" class="lp-step">
              <ScreenshotSlot
                :name="step.shot"
                :label="step.label"
                :alt="step.alt"
                frame="phone"
                sizes="(min-width: 1024px) 240px, 68vw"
              />
              <div class="lp-step__body">
                <span class="lp-step__num" aria-hidden="true">{{ index + 1 }}</span>
                <div>
                  <h3>{{ step.title }}</h3>
                  <p>{{ step.desc }}</p>
                </div>
              </div>
            </li>
          </ol>
        </div>
      </section>

      <!-- Features -->
      <section id="features" class="lp-section lp-section--tint">
        <div class="lp-container">
          <header class="lp-heading">
            <p class="lp-eyebrow">Everything you need</p>
            <h2>A complete system to get things done.</h2>
            <p>Capture, plan, focus, and follow through, with AI by your side.</p>
          </header>

          <ul class="lp-features">
            <li v-for="feature in featureGrid" :key="feature.title" class="lp-feature">
              <span class="lp-feature__icon" :class="`lp-feature__icon--${feature.tone}`" aria-hidden="true">
                <component :is="feature.icon" :size="24" :stroke-width="2" />
              </span>
              <h3>
                {{ feature.title }}
                <span v-if="feature.soon" class="lp-pill">Soon</span>
              </h3>
              <p>{{ feature.desc }}</p>
            </li>
          </ul>
        </div>
      </section>

      <!-- Focus -->
      <section id="focus" class="lp-section lp-section--flush">
        <div class="lp-container">
          <div class="lp-focus">
            <div class="lp-focus__copy">
              <p class="lp-eyebrow lp-eyebrow--dark">Focus mode</p>
              <h2>Lock in and make progress.</h2>
              <p>
                Start a focus session on any task. PlanCraft clears everything else off the screen so
                it's just you and the one thing that matters.
              </p>
              <ul class="lp-focus__durations" aria-label="Session lengths">
                <li v-for="mins in focusDurations" :key="mins" :class="{ 'is-default': mins === 25 }">{{ mins }} min</li>
                <li>Open-ended</li>
              </ul>
            </div>

            <div class="lp-focus__device">
              <ScreenshotSlot
                name="focus"
                label="Focus"
                alt="PlanCraftAI focus session with a countdown timer for one task"
                sizes="(min-width: 1024px) 260px, 60vw"
              />
            </div>

            <ul class="lp-focus__list">
              <li v-for="point in focusPoints" :key="point">
                <CircleCheck :size="18" aria-hidden="true" class="lp-i" />
                {{ point }}
              </li>
            </ul>
          </div>
        </div>
      </section>

      <!-- AI help (coming soon) -->
      <section class="lp-section">
        <div class="lp-container lp-ai">
          <div class="lp-ai__device">
            <ScreenshotSlot
              name="today"
              label="AI help preview"
              alt="PlanCraftAI app preview showing planned tasks"
              sizes="(min-width: 1024px) 280px, 60vw"
            />
          </div>

          <div class="lp-ai__copy">
            <p class="lp-eyebrow">
              <Sparkles :size="13" aria-hidden="true" />
              AI assistance · Coming soon
            </p>
            <h2>Get help the moment you're stuck.</h2>
            <p>
              Tap Help on any task and PlanCraft works from what it already knows about it: breaking it
              down, suggesting where to start, or setting up a focus session.
            </p>
            <div class="lp-ai__prompt" aria-hidden="true">
              <span>“Prepare for my system design interview”</span>
              <span class="lp-ai__prompt-go"><ArrowRight :size="16" /></span>
            </div>
          </div>

          <ul class="lp-ai__actions" aria-label="Example AI actions">
            <li v-for="action in aiActions" :key="action.label">
              <span class="lp-ai__action-icon" :class="`lp-feature__icon--${action.tone}`" aria-hidden="true">
                <component :is="action.icon" :size="16" />
              </span>
              {{ action.label }}
            </li>
          </ul>
        </div>
      </section>

      <!-- Privacy -->
      <section class="lp-section lp-section--tight">
        <div class="lp-container">
          <div class="lp-privacy">
            <div class="lp-privacy__lead">
              <span class="lp-privacy__icon" aria-hidden="true"><Lock :size="22" /></span>
              <div>
                <h2>Your data, your control.</h2>
                <p>You decide what PlanCraft can access and connect.</p>
              </div>
            </div>
            <ul class="lp-privacy__items">
              <li v-for="item in privacyPoints" :key="item.label">
                <component :is="item.icon" :size="20" aria-hidden="true" class="lp-i" />
                <span>{{ item.label }}</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <!-- Pricing -->
      <section id="pricing" class="lp-section">
        <div class="lp-container">
          <header class="lp-heading">
            <p class="lp-eyebrow">Simple pricing</p>
            <h2>Start free. Upgrade when you need more.</h2>
          </header>

          <div class="lp-pricing">
            <article class="lp-plan">
              <div class="lp-plan__head">
                <div>
                  <h3>Free</h3>
                  <p>Everything you need to get started.</p>
                </div>
                <p class="lp-plan__price"><span>$0</span></p>
              </div>
              <ul class="lp-plan__list">
                <li v-for="item in freePlan" :key="item">
                  <span class="lp-plan__check" aria-hidden="true"><Check :size="12" :stroke-width="3" /></span>{{ item }}
                </li>
              </ul>
              <button type="button" class="lp-btn lp-btn--outline" @click="startGuestPlanner('pricing_free')">
                Get started
              </button>
            </article>

            <article class="lp-plan lp-plan--featured">
              <div class="lp-plan__head">
                <div>
                  <h3>Solo Premium</h3>
                  <p>More AI, reminders and integrations.</p>
                </div>
                <p class="lp-plan__price">
                  <span>{{ premiumPrice }}</span><small>/ month</small>
                </p>
              </div>
              <ul class="lp-plan__list">
                <li v-for="item in premiumPlan" :key="item">
                  <span class="lp-plan__check" aria-hidden="true"><Check :size="12" :stroke-width="3" /></span>{{ item }}
                </li>
              </ul>
              <RouterLink :to="billingRoutePath" class="lp-btn lp-btn--primary">Upgrade to Premium</RouterLink>
            </article>
          </div>

          <p class="lp-pricing__note">
            <template v-if="isAppleBillingSafeMode">Solo Premium is billed through the App Store.</template>
            <template v-else>
              $2.99/month when purchased in the iPhone app. Planning with a team?
              <RouterLink to="/pricing#teams">See workspace plans</RouterLink>.
            </template>
          </p>
        </div>
      </section>

      <!-- FAQ -->
      <section id="faq" class="lp-section lp-section--tint">
        <div class="lp-container lp-container--narrow">
          <header class="lp-heading">
            <p class="lp-eyebrow">FAQ</p>
            <h2>Questions, answered.</h2>
          </header>
          <div class="lp-faq">
            <details v-for="faq in faqs" :key="faq.question">
              <summary>{{ faq.question }}</summary>
              <p>{{ faq.answer }}</p>
            </details>
          </div>

          <nav class="lp-explore" aria-label="Explore PlanCraftAI">
            <h2>Explore PlanCraftAI</h2>
            <ul>
              <li v-for="link in exploreLinks" :key="link.to">
                <RouterLink :to="link.to">{{ link.label }}</RouterLink>
              </li>
            </ul>
          </nav>
        </div>
      </section>

      <!-- Final CTA -->
      <section id="install" class="lp-section lp-section--flush">
        <div class="lp-container">
          <div class="lp-cta">
            <div class="lp-cta__brand">
              <img src="/icons/icon-96x96.png" srcset="/icons/icon-96x96.png 1x, /icons/icon-192x192.png 2x" alt="" width="56" height="56" loading="lazy" />
              <div>
                <p class="lp-cta__name">PlanCraftAI</p>
                <p class="lp-cta__tag">Capture. Plan. Focus. Get it done.</p>
              </div>
            </div>
            <div class="lp-cta__copy">
              <h2>Stop carrying your entire day in your head.</h2>
              <p>Start free today and turn your thoughts into real progress.</p>
            </div>
            <div class="lp-cta__actions">
              <StoreBadges v-if="showStoreBadges" location="footer_cta" lazy />
              <button v-else type="button" class="lp-btn lp-btn--light" @click="startGuestPlanner('footer_cta')">
                Start planning free
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>

    <footer class="lp-footer">
      <div class="lp-container lp-footer__inner">
        <p>© {{ currentYear }} Sudo Programmer Inc. · PlanCraftAI</p>
        <nav aria-label="Footer">
          <RouterLink to="/blog">Blog</RouterLink>
          <RouterLink to="/features">Features</RouterLink>
          <RouterLink to="/privacy">Privacy</RouterLink>
          <RouterLink to="/terms">Terms</RouterLink>
          <RouterLink to="/contact">Contact</RouterLink>
        </nav>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { computed, markRaw, onMounted, ref } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import {
  ArrowRight,
  Bell,
  CalendarDays,
  Check,
  CircleCheck,
  KeyRound,
  ListChecks,
  Lock,
  Mic,
  PenLine,
  Plug,
  ScanFace,
  Search,
  Sparkles,
  Timer,
  Trash2,
} from 'lucide-vue-next'
import ScreenshotSlot from '@/components/marketing/ScreenshotSlot.vue'
import StoreBadges from '@/components/marketing/StoreBadges.vue'
import { useSeoMeta } from '@/composables/useSeoMeta'
import { EVENTS, trackEvent, trackGuestStartFromLanding } from '@/services/analytics'
import { useAuthStore } from '@/stores/authStore'
import { isAppleBillingSafeMode as detectAppleBillingSafeMode } from '@/utils/billingAccess'
import { isNativePackagedApp } from '@/utils/nativeAuthSupport'
import { ANDROID_APP_URL, IOS_APP_URL } from '@/constants/appStores'

const router = useRouter()
const authStore = useAuthStore()
const isAppleBillingSafeMode = computed(() => detectAppleBillingSafeMode())
const billingRoutePath = computed(() => (isAppleBillingSafeMode.value ? '/billing/upgrade' : '/pricing'))
const premiumPrice = computed(() => (isAppleBillingSafeMode.value ? '$2.99' : '$2'))
// Store badges make no sense inside the installed app itself.
const showStoreBadges = ref(true)
const currentYear = new Date().getFullYear()

const trustPoints = ['No credit card needed', 'Web, iPhone and Android', 'Cancel anytime']

const howItWorks = [
  {
    shot: 'voice-capture',
    label: 'Voice capture',
    alt: 'PlanCraftAI capture sheet asking “What do you need to do?” with a microphone button',
    title: 'Speak naturally',
    desc: '“Remind me tomorrow at 8 AM to finish the design system.”',
  },
  {
    shot: 'task-created',
    label: 'Task created',
    alt: 'A PlanCraftAI task with its time, category, reminder and Focus and Help me actions',
    title: 'PlanCraft understands',
    desc: 'AI turns your words into a task with the right time, context and reminder.',
  },
  {
    shot: 'reminder',
    label: 'Reminder',
    alt: 'A PlanCraftAI reminder for “Finish design system” at 2:00 PM with Focus and Snooze buttons',
    title: 'Get reminded',
    desc: 'Push notifications, WhatsApp or a call, right when it’s time.',
  },
]

const featureGrid = [
  { icon: markRaw(Mic), tone: 'violet', title: 'Voice capture', desc: 'Turn speech into tasks instantly.' },
  { icon: markRaw(Sparkles), tone: 'blue', title: 'AI planning', desc: 'Break work down and plan a realistic day.' },
  { icon: markRaw(Bell), tone: 'amber', title: 'Smart reminders', desc: 'Get nudged at the right time, on the right channel.' },
  { icon: markRaw(CalendarDays), tone: 'sky', title: 'Calendar sync', desc: 'Fit tasks around your real schedule.' },
  { icon: markRaw(Timer), tone: 'green', title: 'Focus mode', desc: 'Stay on one task and build real progress.' },
  { icon: markRaw(Search), tone: 'pink', title: 'AI actions', desc: 'Research and next steps for any task.', soon: true },
]

const focusDurations = [15, 25, 45, 60]
const focusPoints = [
  'One task, full screen',
  'Navigation and badges out of the way',
  'Keeps time even if you switch apps',
  'Finish, take a break, or keep going',
]

const aiActions = [
  { icon: markRaw(ListChecks), tone: 'violet', label: 'Break it into steps' },
  { icon: markRaw(Search), tone: 'green', label: 'Find useful resources' },
  { icon: markRaw(PenLine), tone: 'blue', label: 'Create practice questions' },
  { icon: markRaw(Timer), tone: 'amber', label: 'Schedule a focus session' },
]

const privacyPoints = [
  { icon: markRaw(Plug), label: 'Connect only what you choose' },
  { icon: markRaw(ScanFace), label: 'Face ID and fingerprint app lock' },
  { icon: markRaw(KeyRound), label: 'Encrypted in transit' },
  { icon: markRaw(Trash2), label: 'Delete your account anytime' },
]

// Mirrors the plan comparison on /pricing.
const freePlan = ['Unlimited journaling', 'Basic AI (10 insights a month)', 'Focus sessions', 'Web, iPhone and Android apps']
const premiumPlan = ['Unlimited AI insights', 'Smart reminders', 'Calendar and WhatsApp integration', 'Priority support']

const useCases = [
  {
    title: 'AI Daily Planning',
    desc: 'Start with a clear schedule built around priorities, meetings, and realistic time blocks.',
    href: '/ai-daily-planner',
  },
  {
    title: 'Voice Task Creation',
    desc: 'Speak naturally, then let PlanCraftAI turn the input into structured tasks, due dates, and reminders.',
    href: '/ai-task-planner',
  },
  {
    title: 'Google Calendar Integration',
    desc: 'Sync meetings, block focus time, and get AI-prepared recaps linked to your calendar.',
    href: '/google-calendar-integration',
  },
  {
    title: 'Voice Reminder App',
    desc: 'Create reminders from spoken input and follow up across push, WhatsApp, or recap-style nudges.',
    href: '/voice-reminder-app',
  },
]

const exploreLinks = [
  { label: 'All PlanCraft AI features', to: '/features' },
  { label: 'AI task planner for voice capture', to: '/ai-task-planner' },
  { label: 'AI daily planner for realistic schedules', to: '/ai-daily-planner' },
  { label: 'Voice planning and journaling', to: '/voice-planning' },
  { label: 'Voice reminder app for spoken follow-ups', to: '/voice-reminder-app' },
  { label: 'Recurring reminder app for habits and routines', to: '/recurring-reminder-app' },
  { label: 'AI reminders that feel human', to: '/ai-reminders' },
  { label: 'Google Calendar sync walkthrough', to: '/google-calendar-integration' },
  { label: 'Guides on AI productivity and goals', to: '/blog' },
]

const faqs = [
  {
    question: 'What is the best AI task manager for people who think out loud?',
    answer:
      'PlanCraftAI is built for people who capture work in fragments. It combines voice task capture, AI daily planning, calendar sync, and smart reminders so spoken thoughts become real follow-through.',
  },
  {
    question: 'How does an AI daily planner work?',
    answer:
      'An AI daily planner takes your tasks, timing, and calendar context, then helps you decide what deserves attention first. PlanCraftAI adds voice input, due-date parsing, and reminders so the plan stays useful after the morning.',
  },
  {
    question: 'Is there an AI app for reminders and follow-ups?',
    answer:
      'Yes. PlanCraftAI works as a voice reminder app and recurring reminder system, sending smart nudges, follow-ups, and recap-style reminders tied to real tasks.',
  },
  {
    question: 'Does PlanCraftAI integrate with Google Calendar?',
    answer:
      'Yes. You can sync Google Calendar, place tasks around meetings, and keep prep reminders tied to the schedule you already work from.',
  },
  {
    question: 'Can I try PlanCraftAI without creating an account?',
    answer:
      'Yes. Start planning right away and create tasks before making an account. When you want your plan saved and synced across devices, sign in and everything you created comes with you.',
  },
]

const SITE_URL = (import.meta.env.VITE_SITE_URL && String(import.meta.env.VITE_SITE_URL)) || 'https://plancraftai.com'
const BASE_URL = SITE_URL.endsWith('/') ? SITE_URL.slice(0, -1) : SITE_URL

const structuredData = [
  {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'PlanCraft AI',
    applicationCategory: 'ProductivityApplication',
    applicationSubCategory: 'TaskManagementApplication',
    operatingSystem: 'Web, iOS, Android',
    featureList: [...featureGrid.filter((f) => !f.soon).map((f) => f.title), ...useCases.map((c) => c.title)],
    url: BASE_URL,
    installUrl: `${BASE_URL}/#install`,
    sameAs: [IOS_APP_URL, ANDROID_APP_URL],
    screenshot: `${BASE_URL}/plancraftai-post-one.png`,
    description:
      'PlanCraftAI is an AI task planner and voice reminder app with AI daily planning, calendar sync, focus sessions, and smart reminders.',
    offers: {
      '@type': 'Offer',
      price: '0.00',
      priceCurrency: 'USD',
      availability: 'https://schema.org/OnlineOnly',
    },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  },
  {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'PlanCraft AI Use Cases',
    itemListElement: useCases.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.title,
      description: item.desc,
      url: `${BASE_URL}${item.href}`,
    })),
  },
]

useSeoMeta({
  title: 'PlanCraftAI | AI Task Planner, AI Daily Planner, and Voice Reminder App',
  description:
    'Say what you need to do and PlanCraftAI turns it into a plan. Speak tasks, plan your day, focus on one thing, and get smart reminders that keep work from slipping.',
  keywords: [
    'PlanCraft AI',
    'AI task planner',
    'AI daily planner',
    'voice reminder app',
    'voice task manager',
    'focus timer',
    'recurring reminder app',
    'AI productivity app',
    'AI reminders',
    'Google Calendar integration',
  ],
  structuredData,
  pageLabel: 'Landing',
})

function startGuestPlanner(entry = 'landing') {
  if (authStore?.user?.uid) {
    router.push('/today')
    return
  }
  try {
    trackGuestStartFromLanding({ entry })
  } catch {
    /* analytics optional */
  }
  // Start free is an authenticated product entry point. Sending anonymous
  // visitors through the guest bootstrap first made a failed guest request
  // surface a second, confusing sign-in step on mobile.
  router.push({ path: '/login', query: { next: '/today', source: 'landing' } })
}

onMounted(() => {
  showStoreBadges.value = !isNativePackagedApp()
  trackEvent(EVENTS.LANDING_VIEW)
})
</script>

<style scoped>
.lp {
  --ink: #0f172a;
  --muted: #475569;
  --subtle: #64748b;
  --line: #e2e8f0;
  --surface: #ffffff;
  --tint: #f6f7fc;
  --brand: #4f46e5;
  --brand-strong: #4338ca;
  --brand-soft: #eef2ff;
  --violet: #7c3aed;
  --dark: #13112b;

  min-height: 100vh;
  background: var(--surface);
  color: var(--ink);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
  overflow-x: hidden;
}

.lp-container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 max(16px, env(safe-area-inset-left)) 0 max(16px, env(safe-area-inset-right));
}

@media (min-width: 768px) {
  .lp-container {
    padding: 0 32px;
  }
}

.lp-container--narrow {
  max-width: 820px;
}

/* ---------- Buttons ---------- */
.lp-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 20px;
  border-radius: 12px;
  font-weight: 600;
  font-size: 0.95rem;
  text-decoration: none;
  cursor: pointer;
  border: 1px solid transparent;
  transition: background 0.15s ease, border-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
}

.lp-btn:focus-visible {
  outline: 2px solid var(--brand);
  outline-offset: 3px;
}

.lp-btn--primary {
  background: linear-gradient(135deg, var(--brand) 0%, var(--violet) 100%);
  color: #fff;
  box-shadow: 0 10px 24px -10px rgba(79, 70, 229, 0.7);
}

.lp-btn--primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 28px -12px rgba(79, 70, 229, 0.8);
}

.lp-btn--outline {
  background: transparent;
  color: var(--brand-strong);
  border-color: #c7d2fe;
}

.lp-btn--outline:hover {
  border-color: var(--brand);
  background: var(--brand-soft);
}

.lp-btn--light {
  background: #fff;
  color: var(--brand-strong);
}

.lp-btn--sm {
  min-height: 40px;
  padding: 0 16px;
  border-radius: 999px;
  font-size: 0.875rem;
}

.lp-btn--lg {
  min-height: 52px;
  padding: 0 24px;
  font-size: 1rem;
}

/* ---------- Nav ---------- */
.lp-nav {
  position: sticky;
  top: 0;
  z-index: 40;
  padding-top: env(safe-area-inset-top);
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: saturate(180%) blur(14px);
  -webkit-backdrop-filter: saturate(180%) blur(14px);
  border-bottom: 1px solid rgba(226, 232, 240, 0.7);
}

.lp-nav__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  height: 64px;
}

.lp-brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--ink);
  text-decoration: none;
}

.lp-brand__icon {
  border-radius: 9px;
}

.lp-brand__name {
  font-weight: 700;
  font-size: 1.1rem;
  letter-spacing: -0.01em;
}

.lp-nav__links {
  display: none;
  gap: 28px;
}

.lp-nav__links a {
  color: var(--muted);
  font-size: 0.9rem;
  font-weight: 500;
  text-decoration: none;
}

.lp-nav__links a:hover {
  color: var(--ink);
}

.lp-nav__actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.lp-nav__signin {
  display: none;
  color: var(--ink);
  font-size: 0.9rem;
  font-weight: 500;
  text-decoration: none;
}

@media (min-width: 900px) {
  .lp-nav__links {
    display: flex;
  }
}

@media (min-width: 480px) {
  .lp-nav__signin {
    display: inline;
  }
}

/* ---------- Hero ---------- */
.lp-hero {
  position: relative;
  padding: 48px 0 56px;
  background:
    radial-gradient(60% 60% at 85% 20%, rgba(167, 139, 250, 0.22), transparent 70%),
    radial-gradient(50% 50% at 0% 0%, rgba(199, 210, 254, 0.45), transparent 70%),
    linear-gradient(180deg, #f8f8ff 0%, #ffffff 100%);
}

.lp-hero__grid {
  display: grid;
  gap: 48px;
  align-items: center;
}

@media (min-width: 1024px) {
  .lp-hero {
    padding: 72px 0 88px;
  }

  .lp-hero__grid {
    grid-template-columns: 1.15fr 0.85fr;
  }
}

.lp-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 20px;
  padding: 6px 14px;
  border: 1px solid #ddd6fe;
  border-radius: 999px;
  background: #fff;
  color: var(--muted);
  font-size: 0.8rem;
  font-weight: 500;
}

.lp-chip__spark {
  color: var(--violet);
}

.lp-hero__title {
  margin: 0;
  font-size: clamp(2.3rem, 5.4vw, 3.7rem);
  line-height: 1.06;
  font-weight: 800;
  letter-spacing: -0.035em;
}

.lp-gradient-text {
  background: linear-gradient(135deg, var(--brand) 0%, var(--violet) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.lp-hero__lede {
  max-width: 34rem;
  margin: 20px 0 0;
  color: var(--muted);
  font-size: clamp(1rem, 1.6vw, 1.15rem);
  line-height: 1.65;
}

.lp-hero__ctas {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px 16px;
  margin-top: 32px;
}

.lp-trust {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 24px;
  margin: 28px 0 0;
  padding: 0;
  list-style: none;
  color: var(--subtle);
  font-size: 0.85rem;
}

.lp-trust li {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.lp-trust .lp-i {
  flex: none;
  color: var(--brand);
}

.lp-hero__device {
  position: relative;
  display: flex;
  justify-content: center;
}

.lp-hero__glow {
  position: absolute;
  inset: 8% 5%;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgba(124, 58, 237, 0.35), transparent);
  filter: blur(30px);
}

.lp-hero__phone {
  position: relative;
  width: min(300px, 72vw);
  transform: rotate(-3deg);
}

@media (prefers-reduced-motion: no-preference) {
  .lp-hero__phone {
    animation: lp-float 7s ease-in-out infinite;
  }
}

@keyframes lp-float {
  0%,
  100% {
    transform: rotate(-3deg) translateY(0);
  }
  50% {
    transform: rotate(-3deg) translateY(-8px);
  }
}

/* ---------- Sections ---------- */
.lp-section {
  padding: 72px 0;
}

.lp-section--tint {
  background: var(--tint);
}

.lp-section--tight {
  padding: 24px 0;
}

.lp-section--flush {
  padding: 24px 0;
}

.lp-heading {
  max-width: 40rem;
  margin: 0 auto 44px;
  text-align: center;
}

.lp-heading h2,
.lp-focus h2,
.lp-ai h2 {
  margin: 0;
  font-size: clamp(1.7rem, 3.4vw, 2.3rem);
  line-height: 1.15;
  font-weight: 800;
  letter-spacing: -0.025em;
}

.lp-heading > p:not(.lp-eyebrow) {
  margin: 12px 0 0;
  color: var(--muted);
  font-size: 1.05rem;
}

.lp-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 14px;
  padding: 4px 12px;
  border-radius: 999px;
  background: var(--brand-soft);
  color: var(--brand-strong);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.lp-eyebrow--dark {
  background: rgba(255, 255, 255, 0.1);
  color: #c7d2fe;
}

.lp-pill {
  display: inline-block;
  margin-left: 6px;
  padding: 2px 8px;
  border-radius: 999px;
  background: #fce7f3;
  color: #be185d;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  vertical-align: middle;
}

/* ---------- How it works ---------- */
.lp-steps {
  display: grid;
  gap: 32px;
  margin: 0;
  padding: 0;
  list-style: none;
}

@media (min-width: 900px) {
  .lp-steps {
    grid-template-columns: repeat(3, 1fr);
    gap: 28px;
  }
}

.lp-step__body {
  display: flex;
  gap: 14px;
  margin-top: 20px;
}

.lp-step > .shot {
  width: min(240px, 68vw);
  margin: 0 auto;
}

.lp-step__num {
  flex: none;
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: var(--brand);
  color: #fff;
  font-size: 0.85rem;
  font-weight: 700;
}

.lp-step h3 {
  margin: 2px 0 6px;
  font-size: 1.05rem;
  font-weight: 700;
}

.lp-step p {
  margin: 0;
  color: var(--muted);
  font-size: 0.93rem;
  line-height: 1.55;
}

/* ---------- Features ---------- */
.lp-features {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 28px 20px;
  margin: 0;
  padding: 0;
  list-style: none;
  text-align: center;
}

@media (min-width: 768px) {
  .lp-features {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 1100px) {
  .lp-features {
    grid-template-columns: repeat(6, 1fr);
  }
}

.lp-feature h3 {
  margin: 14px 0 6px;
  font-size: 0.98rem;
  font-weight: 700;
}

.lp-feature p {
  margin: 0;
  color: var(--muted);
  font-size: 0.88rem;
  line-height: 1.5;
}

.lp-feature__icon {
  display: inline-grid;
  place-items: center;
  width: 56px;
  height: 56px;
  border-radius: 18px;
}

.lp-feature__icon--violet { background: #ede9fe; color: #6d28d9; }
.lp-feature__icon--blue { background: #e0e7ff; color: #4338ca; }
.lp-feature__icon--amber { background: #ffedd5; color: #c2410c; }
.lp-feature__icon--sky { background: #e0f2fe; color: #0369a1; }
.lp-feature__icon--green { background: #dcfce7; color: #15803d; }
.lp-feature__icon--pink { background: #fce7f3; color: #be185d; }

/* ---------- Focus ---------- */
.lp-focus {
  display: grid;
  gap: 36px;
  align-items: center;
  padding: 40px 24px;
  border-radius: 28px;
  background:
    radial-gradient(70% 90% at 50% 100%, rgba(124, 58, 237, 0.45), transparent 70%),
    linear-gradient(135deg, #16143a 0%, #1e1b4b 50%, #13112b 100%);
  color: #fff;
}

@media (min-width: 1024px) {
  .lp-focus {
    grid-template-columns: 1.1fr 0.8fr 1fr;
    padding: 48px 56px;
  }
}

.lp-focus__copy p:not(.lp-eyebrow) {
  margin: 14px 0 0;
  color: #c7d2fe;
  line-height: 1.6;
}

.lp-focus__durations {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 24px 0 0;
  padding: 0;
  list-style: none;
}

.lp-focus__durations li {
  padding: 8px 16px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  font-size: 0.85rem;
  font-weight: 600;
  color: #e0e7ff;
}

.lp-focus__durations li.is-default {
  background: linear-gradient(135deg, var(--brand) 0%, var(--violet) 100%);
  border-color: transparent;
  color: #fff;
}

.lp-focus__device {
  display: flex;
  justify-content: center;
}

.lp-focus__device > * {
  width: min(250px, 64vw);
}

.lp-focus__list,
.lp-plan__list {
  display: grid;
  gap: 14px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.lp-focus__list li {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #e0e7ff;
  font-size: 0.95rem;
}

.lp-focus__list .lp-i {
  flex: none;
  color: #a78bfa;
}

/* ---------- AI ---------- */
.lp-ai {
  display: grid;
  gap: 36px;
  align-items: center;
}

@media (min-width: 1024px) {
  .lp-ai {
    grid-template-columns: 0.7fr 1.3fr 0.9fr;
    gap: 48px;
  }
}

.lp-ai__device {
  display: flex;
  justify-content: center;
}

.lp-ai__device > * {
  width: min(250px, 64vw);
}

.lp-ai__copy p:not(.lp-eyebrow) {
  margin: 14px 0 0;
  color: var(--muted);
  line-height: 1.6;
}

.lp-ai__prompt {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 24px;
  padding: 8px 8px 8px 18px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--tint);
  color: var(--muted);
  font-size: 0.9rem;
}

.lp-ai__prompt-go {
  display: grid;
  place-items: center;
  flex: none;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--brand);
  color: #fff;
}

.lp-ai__actions {
  display: grid;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.lp-ai__actions li {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 6px 16px -12px rgba(15, 23, 42, 0.3);
  font-size: 0.9rem;
  font-weight: 500;
}

.lp-ai__action-icon {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 10px;
}

/* ---------- Privacy ---------- */
.lp-privacy {
  display: grid;
  gap: 24px;
  padding: 24px;
  border: 1px solid var(--line);
  border-radius: 20px;
  background: var(--tint);
}

@media (min-width: 1024px) {
  .lp-privacy {
    grid-template-columns: 1fr 1.6fr;
    align-items: center;
    padding: 24px 32px;
  }
}

.lp-privacy__lead {
  display: flex;
  align-items: center;
  gap: 16px;
}

.lp-privacy__icon {
  display: grid;
  place-items: center;
  flex: none;
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: var(--brand);
  color: #fff;
}

.lp-privacy h2 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 800;
}

.lp-privacy__lead p {
  margin: 4px 0 0;
  color: var(--muted);
  font-size: 0.9rem;
}

.lp-privacy__items {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin: 0;
  padding: 0;
  list-style: none;
}

@media (min-width: 768px) {
  .lp-privacy__items {
    grid-template-columns: repeat(4, 1fr);
  }
}

.lp-privacy__items li {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-align: center;
  color: var(--muted);
  font-size: 0.8rem;
  font-weight: 500;
}

.lp-privacy__items .lp-i {
  color: var(--ink);
}

/* ---------- Pricing ---------- */
.lp-pricing {
  display: grid;
  gap: 20px;
  max-width: 920px;
  margin: 0 auto;
}

@media (min-width: 768px) {
  .lp-pricing {
    grid-template-columns: 1fr 1fr;
  }
}

.lp-plan {
  display: flex;
  flex-direction: column;
  gap: 22px;
  padding: 28px;
  border: 1px solid var(--line);
  border-radius: 20px;
  background: #fff;
}

.lp-plan--featured {
  border: 2px solid #a5b4fc;
  box-shadow: 0 24px 48px -28px rgba(79, 70, 229, 0.55);
}

.lp-plan__head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.lp-plan h3 {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 800;
}

.lp-plan__head p {
  margin: 4px 0 0;
  color: var(--subtle);
  font-size: 0.85rem;
}

.lp-plan__price {
  margin: 0;
  white-space: nowrap;
}

.lp-plan__price span {
  font-size: 2.3rem;
  font-weight: 800;
  letter-spacing: -0.03em;
}

.lp-plan__price small {
  margin-left: 4px;
  color: var(--subtle);
  font-size: 0.85rem;
}

.lp-plan__list {
  flex: 1;
  gap: 10px;
}

.lp-plan__list li {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.92rem;
  color: var(--ink);
}

.lp-plan__check {
  flex: none;
  display: grid;
  place-items: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #dcfce7;
  color: #15803d;
}

.lp-pricing__note {
  margin: 20px auto 0;
  max-width: 920px;
  text-align: center;
  color: var(--subtle);
  font-size: 0.85rem;
}

.lp-pricing__note a {
  color: var(--brand-strong);
  font-weight: 600;
}

/* ---------- FAQ ---------- */
.lp-faq {
  display: grid;
  gap: 12px;
}

.lp-faq details {
  padding: 18px 20px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: #fff;
}

.lp-faq summary {
  cursor: pointer;
  font-weight: 600;
  list-style: none;
}

.lp-faq summary::-webkit-details-marker {
  display: none;
}

.lp-faq summary::after {
  content: '+';
  float: right;
  color: var(--brand);
  font-weight: 700;
}

.lp-faq details[open] summary::after {
  content: '–';
}

.lp-faq p {
  margin: 12px 0 0;
  color: var(--muted);
  line-height: 1.6;
}

.lp-explore {
  margin-top: 48px;
}

.lp-explore h2 {
  margin: 0 0 16px;
  font-size: 1rem;
  font-weight: 700;
}

.lp-explore ul {
  display: grid;
  gap: 10px 24px;
  margin: 0;
  padding: 0;
  list-style: none;
}

@media (min-width: 640px) {
  .lp-explore ul {
    grid-template-columns: 1fr 1fr;
  }
}

.lp-explore a {
  color: var(--brand-strong);
  font-size: 0.9rem;
  text-decoration: none;
}

.lp-explore a:hover {
  text-decoration: underline;
}

/* ---------- Final CTA ---------- */
.lp-cta {
  display: grid;
  gap: 24px;
  align-items: center;
  margin: 24px 0 8px;
  padding: 32px 24px;
  border-radius: 24px;
  background:
    radial-gradient(60% 120% at 100% 0%, rgba(124, 58, 237, 0.5), transparent 70%),
    linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #4c1d95 100%);
  color: #fff;
}

@media (min-width: 1024px) {
  .lp-cta {
    grid-template-columns: auto 1fr auto;
    gap: 40px;
    padding: 28px 40px;
  }
}

.lp-cta__brand {
  display: flex;
  align-items: center;
  gap: 14px;
}

.lp-cta__brand img {
  border-radius: 14px;
}

.lp-cta__name {
  margin: 0;
  font-weight: 700;
  font-size: 1.1rem;
}

.lp-cta__tag {
  margin: 2px 0 0;
  color: #c7d2fe;
  font-size: 0.85rem;
}

.lp-cta__copy h2 {
  margin: 0;
  font-size: clamp(1.3rem, 2.4vw, 1.7rem);
  font-weight: 800;
  letter-spacing: -0.02em;
}

.lp-cta__copy p {
  margin: 6px 0 0;
  color: #c7d2fe;
}

/* ---------- Footer ---------- */
.lp-footer {
  padding: 28px 0 calc(28px + env(safe-area-inset-bottom));
  color: var(--subtle);
  font-size: 0.85rem;
}

.lp-footer__inner {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 12px 24px;
}

.lp-footer p {
  margin: 0;
}

.lp-footer nav {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 20px;
}

.lp-footer a {
  color: var(--subtle);
  text-decoration: none;
}

.lp-footer a:hover {
  color: var(--ink);
}
</style>
