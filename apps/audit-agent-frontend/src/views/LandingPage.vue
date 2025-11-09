<template>
  <div
    class="relative min-h-screen flex flex-col text-gray-800 dark:text-slate-100 overflow-hidden"
  >
    <!-- Animated Star Background -->
    <div
      class="absolute inset-0 -z-10 bg-gradient-to-b from-indigo-900 via-purple-900 to-slate-950"
    >
      <div class="absolute inset-0" ref="stars"></div>
    </div>

    <!-- Hero -->
    <section
      class="relative py-28 md:py-36 bg-gradient-to-b from-indigo-900 via-purple-900 to-slate-950 overflow-hidden"
    >
      <div class="absolute top-6 left-6 z-20 flex items-center gap-2">
        <img
          src="/logo-bg-remove.png"
          alt="PlanCraftAI Logo"
          class="h-10 w-auto sm:h-12 md:h-14 drop-shadow-lg select-none"
        />
        <span class="text-lg sm:text-xl md:text-2xl font-bold text-white tracking-tight"
          >PlanCraftAI</span
        >
      </div>

      <canvas ref="starsCanvas" class="absolute inset-0 w-full h-full z-0"></canvas>

      <div class="relative z-10 max-w-4xl mx-auto text-center">
        <h1
          id="hero-title"
          class="text-5xl md:text-7xl font-extrabold tracking-tight text-white drop-shadow-lg"
          data-aos="fade-up"
        >
          Peaceful Productivity
        </h1>
        <p
          class="mt-6 text-lg md:text-2xl text-indigo-100 max-w-3xl mx-auto leading-relaxed"
          data-aos="fade-up"
          data-aos-delay="150"
        >
          PlanCraft AI is the peaceful AI task manager and daily planner that lets you speak your
          plans, journal with AI, sync Google Calendar, and stay on track with compassionate
          reminders.
        </p>
        <div
          class="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center w-full max-w-md mx-auto"
          data-aos="zoom-in"
          data-aos-delay="250"
        >
          <el-button
            type="primary"
            size="large"
            class="w-full sm:w-auto !px-6 !py-3 !rounded-xl font-semibold hover:shadow-indigo-600/40"
            @click="goToLogin"
            >🚀 Get Started</el-button
          >
          <el-button
            size="large"
            plain
            class="guest-cta w-full sm:w-auto !px-6 !py-3 !rounded-xl font-semibold"
            @click="continueAsGuest"
            >🌿 Continue as Guest</el-button
          >
        </div>
        <!-- <RouterLink
          to="/subscription"
          class="inline-block mt-6 px-5 py-3 rounded-xl bg-black/20 text-white font-semibold hover:bg-black/30 transition"
        >
          ⭐ Explore Premium
        </RouterLink> -->
      </div>
    </section>

    <SeoLongForm
      eyebrow="Guides"
      title="How AI Helps Plan Your Day"
      :intro="longformIntro"
      :sections="longformSections"
    >
      <template #cta>
        <div class="flex flex-col md:flex-row gap-4 mt-6">
          <RouterLink
            to="/blog"
            class="flex-1 text-center px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-500 transition"
          >
            Read more AI productivity guides
          </RouterLink>
          <RouterLink
            to="/voice-planning"
            class="flex-1 text-center px-6 py-3 rounded-xl border border-indigo-400/60 text-indigo-100 font-semibold hover:border-white/80 transition"
          >
            Try voice planning →
          </RouterLink>
        </div>
      </template>
    </SeoLongForm>

    <!-- FAQ -->
    <section id="faq" class="py-20 bg-slate-950/90 text-white">
      <div class="max-w-5xl mx-auto px-6">
        <div class="text-center mb-12">
          <p class="uppercase text-xs tracking-[0.35em] text-indigo-400">People also ask</p>
          <h2 class="mt-3 text-3xl md:text-4xl font-bold">PlanCraft AI FAQ</h2>
          <p class="mt-4 text-indigo-200">
            Clear answers for common searches around AI task managers, journaling assistants, and
            calendar-aware reminders.
          </p>
        </div>
        <div class="grid gap-6">
          <article
            v-for="faq in faqs"
            :key="faq.question"
            class="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 text-left shadow-lg"
          >
            <h3 class="text-xl font-semibold mb-3">{{ faq.question }}</h3>
            <p class="text-indigo-100/90 leading-relaxed">
              {{ faq.answer }}
            </p>
          </article>
        </div>
      </div>
    </section>

    <!-- Deep Links -->
    <section class="py-12 bg-gradient-to-r from-indigo-900/70 via-purple-900/60 to-slate-950/80">
      <div class="max-w-5xl mx-auto px-6">
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p class="uppercase text-xs tracking-[0.35em] text-indigo-300">Keep exploring</p>
            <h2 class="text-2xl font-semibold text-white mt-2">Popular PlanCraft AI paths</h2>
          </div>
          <p class="text-indigo-200 text-sm md:text-base">
            These internal links help Google crawl every niche use case.
          </p>
        </div>
        <div class="mt-6 grid gap-4 md:grid-cols-2">
          <RouterLink
            v-for="link in seoLinks"
            :key="link.to"
            :to="link.to"
            class="rounded-2xl border border-white/10 bg-white/5 text-white px-5 py-4 flex items-center justify-between hover:border-white/60 transition"
          >
            <span>{{ link.label }}</span>
            <span aria-hidden="true" class="text-indigo-200">↗</span>
          </RouterLink>
        </div>
      </div>
    </section>

    <!-- For Teams CTA -->
    <div class="mt-12 flex justify-center">
      <div
        class="px-6 py-4 rounded-2xl bg-indigo-500/10 border border-indigo-400/30 text-indigo-200 font-medium text-sm md:text-base shadow-lg backdrop-blur-md"
      >
        💼 <span class="font-semibold">PlanCraftAI for Teams</span> — Coming Soon 🚧
      </div>
    </div>

    <!-- Features -->
    <section
      id="features"
      class="py-20 bg-gradient-to-b from-violet-900/30 to-indigo-950/50 text-center"
    >
      <div class="max-w-7xl mx-auto px-6">
        <h2 class="text-4xl md:text-5xl font-extrabold text-white drop-shadow mb-4">
          Why Use PlanCraftAI?
        </h2>
        <p class="text-indigo-200 mb-16 text-lg">
          Designed to be mindful and supportive — not overwhelming.
        </p>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div
            v-for="(f, idx) in features"
            :key="f.title"
            class="group relative rounded-2xl bg-white/5 backdrop-blur-xl p-8 border border-white/10 shadow-lg hover:-translate-y-2 transition-all hover:shadow-indigo-500/40"
          >
            <div
              class="absolute inset-0 rounded-2xl bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 opacity-0 group-hover:opacity-100 blur-xl transition"
            ></div>
            <div
              class="relative w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-3xl shadow-md"
            >
              {{ f.emoji }}
            </div>
            <h3 class="relative mt-6 text-xl font-semibold text-white">{{ f.title }}</h3>
            <p class="relative mt-3 text-indigo-200 text-sm leading-relaxed">{{ f.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Use Cases -->
    <section id="use-cases" class="py-20 bg-slate-950 text-white">
      <div class="max-w-6xl mx-auto px-6">
        <div class="text-center max-w-3xl mx-auto mb-14">
          <p class="uppercase text-xs tracking-[0.35em] text-indigo-300">Use cases</p>
          <h2 class="mt-3 text-3xl md:text-4xl font-bold">
            AI planner for goals, journaling, and mindful momentum
          </h2>
          <p class="mt-4 text-indigo-200">
            Target the workflows people search for most: AI daily planning, voice task creation,
            Google Calendar integration, and gentle reminders powered by PlanCraft AI.
          </p>
        </div>
        <div class="grid gap-8 md:grid-cols-2">
          <article
            v-for="useCase in useCases"
            :key="useCase.title"
            class="rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 via-indigo-900/20 to-slate-900/60 p-8 backdrop-blur-xl shadow-xl hover:border-indigo-400/40 transition-all"
          >
            <div class="text-4xl mb-4">{{ useCase.emoji }}</div>
            <h3 class="text-2xl font-semibold">{{ useCase.title }}</h3>
            <p class="mt-3 text-indigo-100/90">{{ useCase.desc }}</p>
            <RouterLink
              :to="useCase.href"
              class="inline-flex items-center gap-2 mt-6 text-indigo-200 hover:text-white font-semibold"
            >
              {{ useCase.ctaLabel }}
              <span aria-hidden="true">↗</span>
            </RouterLink>
          </article>
        </div>
      </div>
    </section>

    <!-- Daily Flow -->
    <section id="flow" class="py-20 bg-slate-900/60 text-center">
      <div class="max-w-7xl mx-auto px-6">
        <h2 class="text-3xl md:text-4xl font-bold text-white mb-4">A Gentle Daily Flow</h2>
        <p class="text-indigo-200 mb-12">Small, steady steps toward a calmer you.</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div
            v-for="(s, idx) in steps"
            :key="s.title"
            class="rounded-xl bg-white/10 backdrop-blur-md shadow p-6 border border-white/10 hover:scale-105 transition"
          >
            <div class="text-4xl">{{ s.emoji }}</div>
            <h3 class="mt-4 font-semibold text-lg text-white">{{ s.title }}</h3>
            <p class="mt-1 text-sm text-indigo-200">{{ s.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Testimonials (premium white cards) -->
    <section
      id="testimonials"
      class="py-20 bg-gradient-to-b from-slate-950/90 via-indigo-950/80 to-purple-950/70 text-center"
    >
      <div class="max-w-7xl mx-auto px-6">
        <h2 class="text-3xl md:text-4xl font-bold text-white mb-4">What People Say</h2>
        <p class="text-indigo-200 mb-12">
          Gentle, practical, and surprisingly insightful — every day.
        </p>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div
            v-for="(t, idx) in testimonials"
            :key="idx"
            class="relative rounded-2xl bg-gradient-to-br from-white to-slate-50 text-slate-800 p-6 shadow-xl border border-indigo-100 hover:-translate-y-1 transition-all"
          >
            <div class="absolute top-3 right-4 text-yellow-400 text-lg">⭐</div>
            <div class="flex items-center gap-4 mb-4">
              <img
                :src="t.avatar || '/default-avatar.svg'"
                alt="User avatar"
                class="w-12 h-12 rounded-full object-cover border border-indigo-200"
              />
              <div class="font-semibold text-indigo-900">{{ t.author }}</div>
            </div>
            <blockquote class="italic text-slate-700 leading-relaxed">“{{ t.quote }}”</blockquote>
          </div>
        </div>
      </div>
    </section>

    <!-- Blog Preview -->
    <section
      id="latest-blogs"
      class="py-20 bg-gradient-to-b from-indigo-950/80 to-slate-950/90 text-center"
    >
      <div class="max-w-7xl mx-auto px-6">
        <div class="flex items-center justify-between mb-8">
          <h2 class="text-3xl md:text-4xl font-bold text-white">From the Journal</h2>
          <RouterLink to="/blog" class="text-indigo-300 hover:text-indigo-200 underline text-sm"
            >View all →</RouterLink
          >
        </div>
        <div
          class="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scroll-smooth scrollbar-hide justify-center"
        >
          <article
            v-for="b in latestBlogs"
            :key="b.slug || b.id"
            class="snap-start flex-shrink-0 w-80 rounded-2xl bg-gradient-to-br from-slate-900/80 via-indigo-950/80 to-purple-950/80 text-indigo-100 border border-indigo-700/30 shadow-[0_0_20px_rgba(79,70,229,0.2)] hover:shadow-[0_0_25px_rgba(139,92,246,0.4)] transition-transform hover:scale-[1.02] duration-300 overflow-hidden"
          >
            <img
              :src="b.coverImage || getFallbackImage(b.title)"
              :alt="b.title"
              class="w-full h-40 object-cover rounded-t-2xl border-b border-indigo-800/20"
              loading="lazy"
              decoding="async"
              fetchpriority="low"
            />

            <div class="p-5 text-left">
              <h3 class="text-lg font-semibold text-white leading-snug line-clamp-2">
                {{ b.title }}
              </h3>
              <p class="text-sm text-indigo-200 mt-2 line-clamp-3">
                {{ b.summary || b.excerpt }}
              </p>
              <div class="flex items-center justify-between mt-3 text-xs text-indigo-400">
                <span>{{ formatDate(b.created_at || b.createdAt) }}</span>
                <RouterLink
                  :to="`/blog/${b.slug || b.id}`"
                  class="text-indigo-400 hover:text-indigo-300 font-medium"
                >
                  Read →
                </RouterLink>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>

    <!-- Why We Built -->
    <section class="py-20 bg-slate-950/80 text-center">
      <div class="max-w-3xl mx-auto px-6">
        <h2 class="text-3xl md:text-4xl font-bold text-white mb-4">Why We Built PlanCraftAI</h2>
        <p class="text-indigo-200 leading-relaxed text-lg">
          Modern work is chaotic. Notifications never stop. Plans scatter. We built PlanCraftAI to
          bring mindfulness back to productivity — a planner that listens, adapts, and keeps you
          peacefully focused.
        </p>
      </div>
    </section>

    <section
      id="plans"
      class="py-24 bg-gradient-to-b from-indigo-950/70 via-purple-950/60 to-slate-950/80 text-center"
    >
      <div class="max-w-6xl mx-auto px-6">
        <h2 class="text-4xl md:text-5xl font-bold text-white mb-4">✨ Choose Your Flow</h2>
        <p class="text-indigo-200 mb-12 text-lg">
          Simple plans designed to help you stay mindful and productive.
        </p>

        <div
          class="grid grid-cols-1 md:grid-cols-2 gap-8 justify-center items-stretch max-w-4xl mx-auto"
        >
          <!-- Free Plan -->
          <div
            class="relative flex flex-col justify-between bg-white/10 backdrop-blur-xl rounded-2xl shadow-xl p-8 border border-indigo-400/20 hover:-translate-y-2 transition-all hover:shadow-indigo-500/30"
          >
            <div
              class="absolute top-0 right-0 bg-indigo-500 text-white text-xs font-semibold px-3 py-1 rounded-bl-lg"
            >
              Free
            </div>
            <div>
              <h3 class="text-2xl font-semibold text-white mb-3">🌿 Free Plan</h3>
              <p class="text-indigo-200 text-sm mb-6">
                Perfect for those starting their mindful journey.
              </p>
              <ul class="space-y-3 text-left text-sm text-indigo-100 mb-6">
                <li>✅ Create & manage tasks</li>
                <li>✅ Daily journaling prompts</li>
                <li>✅ Limited AI insights</li>
                <li>✅ Local reminders</li>
              </ul>
            </div>
            <div class="mt-auto">
              <div class="text-3xl font-bold text-white mb-4">Free</div>
              <RouterLink
                to="/login"
                class="inline-block w-full px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition shadow-lg shadow-indigo-800/40"
              >
                Get Started
              </RouterLink>
            </div>
          </div>

          <!-- Premium Plan -->
          <div
            class="relative flex flex-col justify-between bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-600 rounded-2xl shadow-xl p-8 border border-white/20 hover:-translate-y-2 transition-all hover:shadow-pink-600/40"
            style="background: linear-gradient(135deg, #4338ca 0%, #6d28d9 40%, #db2777 100%)"
          >
            <div
              class="absolute top-0 right-0 bg-yellow-400 text-black text-xs font-semibold px-3 py-1 rounded-bl-lg shadow-sm"
            >
              Most Popular
            </div>
            <div>
              <h3 class="text-2xl font-semibold text-white mb-3">🚀 Premium Plan</h3>
              <p class="text-indigo-100 text-sm mb-6">
                Unlock the full mindful productivity experience.
              </p>
              <ul class="space-y-3 text-left text-sm mb-6 text-white/95">
                <li>⭐ Unlimited reminders & AI summaries</li>
                <li>⭐ Voice journaling & insights</li>
                <li>⭐ Calendar & WhatsApp integration</li>
                <li>⭐ Priority support & early access</li>
              </ul>
            </div>
            <div class="mt-auto">
              <div class="text-3xl font-bold mb-4">
                $2<span class="text-sm text-indigo-100">/month</span>
              </div>
              <RouterLink
                to="/subscription"
                class="inline-block w-full px-6 py-3 rounded-xl bg-white text-indigo-700 font-semibold hover:bg-slate-100 transition shadow-md"
              >
                Go Premium ✨
              </RouterLink>
            </div>
          </div>
        </div>

        <!-- Reassurance note -->
        <p class="mt-10 text-sm text-indigo-300">
          No hidden fees. Cancel anytime from your account settings.
        </p>
      </div>
    </section>

    <!-- CTA -->
    <section id="cta" class="py-20 bg-gradient-to-b from-slate-900/60 to-slate-950/80 text-center">
      <div class="max-w-3xl mx-auto px-6" data-aos="zoom-in">
        <h2 class="text-3xl md:text-4xl font-bold text-white">Ready to Begin?</h2>
        <p class="mt-3 text-indigo-200">
          Log in to track progress, or explore as a guest to get a feel for it.
        </p>
        <div class="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <el-button type="primary" size="large" @click="goToLogin">🚀 Get Started</el-button>
          <el-button size="large" plain @click="continueAsGuest">🌿 Explore as Guest</el-button>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer
      class="py-8 text-center text-sm text-indigo-300 bg-slate-950 border-t border-indigo-500/10"
    >
      <div class="max-w-7xl mx-auto px-6">
        <p class="flex flex-col sm:flex-row justify-center items-center gap-2">
          <span
            >© {{ new Date().getFullYear() }} <strong>Sudo Programmer Inc.</strong> — Crafted with
            care 💜</span
          >
          <span>• <strong>PlanCraftAI</strong></span>
        </p>
        <div class="mt-3 space-x-4">
          <RouterLink to="/blog" class="hover:underline">Blog</RouterLink>
          <RouterLink to="/privacy-policy" class="hover:underline">Privacy</RouterLink>
          <RouterLink to="/terms" class="hover:underline">Terms</RouterLink>
          <RouterLink to="/contact" class="hover:underline">Contact</RouterLink>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import SeoLongForm from '@/components/SeoLongForm.vue'
import { useSeoMeta } from '@/composables/useSeoMeta'

const router = useRouter()
const authStore = useAuthStore()

const features = [
  {
    emoji: '🎙️',
    title: 'Voice Journaling',
    desc: 'Use the AI journaling assistant to turn spoken reflections into structured entries and action items.',
  },
  {
    emoji: '📅',
    title: 'Smart Planner',
    desc: 'Auto-carry tasks forward, schedule with intention blocks, and let AI highlight your next best step.',
  },
  {
    emoji: '💓',
    title: 'Mood Reflection',
    desc: 'Track energy and emotions so your planning rhythm stays compassionate and realistic.',
  },
]

const useCases = [
  {
    emoji: '🧠',
    title: 'AI Daily Planning',
    desc: 'Start each morning with AI prompts that align goals, energy, and calendar realities.',
    href: '/voice-planning',
    ctaLabel: 'Plan an AI-powered day',
  },
  {
    emoji: '🎤',
    title: 'Voice Task Creation',
    desc: 'Capture tasks by speaking naturally; PlanCraft AI structures them with due dates and tags.',
    href: '/voice-planning#voice-capture',
    ctaLabel: 'See voice planner flow',
  },
  {
    emoji: '📆',
    title: 'Google Calendar Integration',
    desc: 'Sync meetings, block focus time, and get AI-prepared recaps linked to your calendar.',
    href: '/google-calendar-integration',
    ctaLabel: 'Connect Google Calendar',
  },
  {
    emoji: '⏰',
    title: 'Smart Reminders & Recaps',
    desc: 'Let AI send reminders, nudges, and evening summaries over push, WhatsApp, or email.',
    href: '/ai-reminders',
    ctaLabel: 'Automate reminders',
  },
]

const faqs = [
  {
    question: 'What makes PlanCraft AI different from other AI task managers?',
    answer:
      'PlanCraft AI blends voice journaling, Google Calendar sync, habit insights, and compassionate reminders so planning feels calm—perfect for founders, creators, and neurodiverse minds.',
  },
  {
    question: 'Can I really plan my day using only my voice?',
    answer:
      'Yes. Speak your routine or brain-dump ideas, and the AI daily planner will generate actionable tasks, priorities, and follow-up reminders.',
  },
  {
    question: 'Does PlanCraft AI integrate with Google Calendar?',
    answer:
      'Absolutely. Import meetings, create prep tasks, and receive AI summaries that link right back to your Google Calendar events.',
  },
  {
    question: 'Is there an AI journaling assistant for evening reflections?',
    answer:
      'Every night you can dictate a short reflection; PlanCraft AI summarizes emotions, progress, and goals so you always know what to improve tomorrow.',
  },
]

const longformIntro =
  'Searchers often ask how an AI productivity app can guide an entire day. Here is the playbook PlanCraft AI follows to turn intention into steady progress.'
const longformSections = [
  {
    eyebrow: 'Morning focus',
    heading: 'Start with AI daily agenda suggestions',
    description:
      'Speak goals, appointments, or hurdles aloud. PlanCraft AI structures them into a purpose-built schedule that still leaves room for rest.',
    bullets: [
      'Map priorities to energy highs and lows',
      'Convert journaling prompts into ready-made tasks',
      'Publish a lightweight daily contract with yourself',
    ],
    ctaText: 'Plan your morning with AI',
    ctaHref: '/voice-planning',
  },
  {
    eyebrow: 'During the day',
    heading: 'Voice task creation keeps momentum high',
    description:
      'Skip typing. Drop quick voice notes and watch PlanCraft AI summarize, categorize, and remind you before deadlines slip.',
    bullets: [
      'Capture tasks straight from meetings or walks',
      'Automatically add context like tags, due dates, and urgency',
      'Trigger AI reminders via push or WhatsApp',
    ],
    ctaText: 'Capture tasks hands-free',
    ctaHref: '/ai-reminders',
  },
  {
    eyebrow: 'Evening reset',
    heading: 'Journaling assistant closes the loop',
    description:
      'A quick reflection trains PlanCraft AI on what energized you, what drained you, and which goals deserve attention tomorrow.',
    bullets: [
      'Summaries designed for “People also ask” queries on AI journaling',
      'Automatic recap emails or push cards',
      'Goal tracking that celebrates streaks and rest days',
    ],
    ctaText: 'See AI journaling assistant',
    ctaHref: '/voice-planning#evening',
  },
]

const seoLinks = [
  { label: 'All PlanCraft AI features', to: '/features' },
  { label: 'Voice planning and journaling', to: '/voice-planning' },
  { label: 'AI reminders that feel human', to: '/ai-reminders' },
  { label: 'Google Calendar sync walkthrough', to: '/google-calendar-integration' },
  { label: 'Guides on AI productivity & goals', to: '/blog' },
]

const steps = [
  { emoji: '🌤️', title: 'Morning Plan', desc: 'Set your focus with clarity and intention.' },
  { emoji: '🎧', title: 'Midday Log', desc: 'Drop a quick voice note to capture progress.' },
  {
    emoji: '🌙',
    title: 'Evening Reflection',
    desc: 'Wind down with a gentle, thoughtful summary.',
  },
  { emoji: '📈', title: 'Growth Stats', desc: 'See patterns emerge and celebrate small wins.' },
]

const testimonials = [
  {
    quote: 'PlanCraftAI helped me stay grounded during my startup chaos.',
    author: 'Ananya M.',
    avatar: 'https://i.pravatar.cc/150?img=47',
  },
  {
    quote: 'The calm design makes planning feel like meditation.',
    author: 'Michael L.',
    avatar: 'https://i.pravatar.cc/150?img=48',
  },
  {
    quote: 'I love the voice journaling — it feels personal and effortless.',
    author: 'Ravi K.',
    avatar: 'https://i.pravatar.cc/150?img=49',
  },
]

const SITE_URL = (import.meta.env.VITE_SITE_URL && String(import.meta.env.VITE_SITE_URL)) || 'https://plancraftai.com'
const BASE_URL = SITE_URL.endsWith('/') ? SITE_URL.slice(0, -1) : SITE_URL
const featureList = Array.from(new Set([...features.map((f) => f.title), ...useCases.map((c) => c.title)]))

const structuredData = [
  {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'PlanCraft AI',
    applicationCategory: 'ProductivityApplication',
    applicationSubCategory: 'TaskManagementApplication',
    operatingSystem: 'Web, iOS, Android',
    featureList,
    url: BASE_URL,
    installUrl: `${BASE_URL}/#install`,
    screenshot: `${BASE_URL}/plancraftai-post-one.png`,
    description:
      'PlanCraft AI is the peaceful AI task manager, daily planner, and journaling assistant trusted for calm productivity.',
    offers: {
      '@type': 'Offer',
      price: '0.00',
      priceCurrency: 'USD',
      availability: 'https://schema.org/OnlineOnly',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '5.0',
      ratingCount: '42',
    },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
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
  title: 'PlanCraft AI – Peaceful Productivity with Voice Journaling and AI Task Management',
  description:
    'PlanCraft AI is the gentle AI task manager and journaling assistant with voice planning, smart reminders, and Google Calendar integration.',
  keywords: [
    'PlanCraft AI',
    'AI task manager',
    'AI daily planner',
    'AI productivity app',
    'AI journaling assistant',
    'AI planner for goals',
    'voice planning',
    'AI reminders',
    'Google Calendar integration',
  ],
  structuredData,
  pageLabel: 'Landing',
})

function goToLogin() {
  router.push('/login')
}

function continueAsGuest() {
  authStore.loginAsGuest().then(() => router.push({ name: 'dashboard' }))
}

const stars = ref(null)
const starsCanvas = ref(null)
const latestBlogs = ref([])

async function loadLatestBlogs() {
  try {
    const blogService = await import('@/services/blogService')
    const svc = blogService.default || blogService
    const fn = svc.getAllBlogs || svc.listBlogs || svc.fetchBlogs
    const blogs = fn ? await fn(true) : []
    latestBlogs.value = (blogs || []).slice(0, 5)
  } catch (e) {
    console.error(e)
  }
}

function formatDate(date) {
  try {
    if (!date) return ''
    const d = date?.toDate ? date.toDate() : new Date(date)
    if (isNaN(d)) return ''
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return ''
  }
}

function getFallbackImage(title = '') {
  try {
    const initials = (title?.charAt(0) || 'P').toUpperCase()
    const colors = ['#6366F1', '#8B5CF6', '#EC4899']
    const bg = colors[Math.floor(Math.random() * colors.length)]
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=${bg.slice(1)}&color=fff&size=512`
  } catch {
    return '/default-blog-cover.svg'
  }
}

onMounted(() => {
  loadLatestBlogs()
  const canvas = starsCanvas.value
  const ctx = canvas.getContext('2d')
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  const s = Array.from({ length: 100 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    r: Math.random() * 1.5,
    sp: Math.random() * 1 + 0.5,
  }))
  ;(function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = 'white'
    s.forEach((st) => {
      ctx.beginPath()
      ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2)
      ctx.fill()
      st.y += st.sp
      if (st.y > canvas.height) st.y = 0
    })
    requestAnimationFrame(animate)
  })()
})
</script>

<style scoped>
.star {
  position: absolute;
  width: 2px;
  height: 2px;
  background: white;
  border-radius: 50%;
  opacity: 0.8;
  animation: twinkle infinite alternate;
}
@key frames twinkle {
  from {
    opacity: 0.3;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1.2);
  }
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.guest-cta {
  background: rgba(255, 255, 255, 0.9) !important;
  color: #0f172a !important;
  border: 1px solid rgba(15, 23, 42, 0.15) !important;
  transition: opacity 0.2s ease, background 0.2s ease;
}

.guest-cta:hover {
  background: rgba(255, 255, 255, 0.95) !important;
  opacity: 0.88;
}
</style>
