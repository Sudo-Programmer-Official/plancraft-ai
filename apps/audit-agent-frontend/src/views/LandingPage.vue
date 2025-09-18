<template>
  <div class="min-h-screen bg-gradient-to-b from-indigo-50 via-violet-50 to-white dark:from-slate-900 dark:via-slate-950 dark:to-slate-950 text-gray-800 dark:text-slate-100">
    <!-- Hero -->
    <section
      class="relative isolate overflow-hidden"
      aria-labelledby="hero-title"
    >
      <!-- Decorative SVG background (light mode) -->
      <svg
        aria-hidden="true"
        class="absolute inset-0 -z-10 block dark:hidden w-full h-full"
        viewBox="0 0 1200 600"
        preserveAspectRatio="none"
      >
        <defs>
          <radialGradient id="rg-light-1" cx="0.2" cy="0.1" r="0.6">
            <stop offset="0%" stop-color="#e9d5ff" stop-opacity="0.9" />
            <stop offset="100%" stop-color="#e9d5ff" stop-opacity="0" />
          </radialGradient>
          <radialGradient id="rg-light-2" cx="0.8" cy="0.9" r="0.7">
            <stop offset="0%" stop-color="#c7d2fe" stop-opacity="0.8" />
            <stop offset="100%" stop-color="#c7d2fe" stop-opacity="0" />
          </radialGradient>
          <linearGradient id="lg-light-wave" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#a78bfa" stop-opacity="0.35" />
            <stop offset="100%" stop-color="#60a5fa" stop-opacity="0.35" />
          </linearGradient>
        </defs>
        <rect width="1200" height="600" fill="url(#rg-light-1)" />
        <rect width="1200" height="600" fill="url(#rg-light-2)" />
        <g class="wave group animate-drift-slow">
          <path d="M0 420 C 300 360, 900 480, 1200 420 L 1200 600 L 0 600 Z" fill="url(#lg-light-wave)" />
        </g>
        <g class="wave group animate-drift" style="opacity: .6">
          <path d="M0 450 C 280 390, 920 510, 1200 450 L 1200 600 L 0 600 Z" fill="url(#lg-light-wave)" />
        </g>
      </svg>

      <!-- Decorative SVG background (dark mode) -->
      <svg
        aria-hidden="true"
        class="absolute inset-0 -z-10 hidden dark:block w-full h-full"
        viewBox="0 0 1200 600"
        preserveAspectRatio="none"
      >
        <defs>
          <radialGradient id="rg-dark-1" cx="0.2" cy="0.15" r="0.6">
            <stop offset="0%" stop-color="#0ea5e9" stop-opacity="0.35" />
            <stop offset="100%" stop-color="#0ea5e9" stop-opacity="0" />
          </radialGradient>
          <radialGradient id="rg-dark-2" cx="0.85" cy="0.85" r="0.7">
            <stop offset="0%" stop-color="#14b8a6" stop-opacity="0.25" />
            <stop offset="100%" stop-color="#14b8a6" stop-opacity="0" />
          </radialGradient>
          <linearGradient id="lg-dark-wave" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.28" />
            <stop offset="100%" stop-color="#60a5fa" stop-opacity="0.28" />
          </linearGradient>
        </defs>
        <rect width="1200" height="600" fill="url(#rg-dark-1)" />
        <rect width="1200" height="600" fill="url(#rg-dark-2)" />
        <g class="wave group animate-drift-slow">
          <path d="M0 420 C 300 360, 900 480, 1200 420 L 1200 600 L 0 600 Z" fill="url(#lg-dark-wave)" />
        </g>
        <g class="wave group animate-drift" style="opacity: .6">
          <path d="M0 450 C 280 390, 920 510, 1200 450 L 1200 600 L 0 600 Z" fill="url(#lg-dark-wave)" />
        </g>
      </svg>
      <div class="absolute inset-0 bg-gradient-to-b from-white/80 to-white/60 dark:from-slate-900/70 dark:to-slate-900/40"></div>

      <div class="relative z-10 max-w-7xl mx-auto px-6 py-20 md:py-28 lg:py-36 grid grid-cols-1 gap-10">
        <div class="text-center" data-aos="fade-up">
          <h1 id="hero-title" class="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Peaceful Productivity
          </h1>
          <p class="mt-4 md:mt-6 text-lg md:text-xl text-slate-700 dark:text-slate-200 max-w-3xl mx-auto">
            Pause, plan, and reflect — voice journaling and gentle insights to support your daily growth.
          </p>
          <div class="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4" data-aos="zoom-in" data-aos-delay="150">
            <el-button
              type="primary"
              size="large"
              aria-label="Log in to AuditAgent"
              @click="goToLogin"
            >
              🚀 Get Started
            </el-button>
            <el-button
              size="large"
              plain
              aria-label="Continue as guest"
              @click="continueAsGuest"
            >
              🌿 Continue as Guest
            </el-button>
          </div>
        </div>

        <!-- Simple illustrative figure (laptop + cloud checklist) -->
        <div class="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
          <svg class="absolute right-6 top-10 w-[240px] md:w-[320px] lg:w-[360px] text-indigo-400/30 dark:text-indigo-300/20" viewBox="0 0 200 200">
            <g fill="currentColor">
              <circle cx="28" cy="34" r="10" />
              <rect x="45" y="26" rx="6" ry="6" width="64" height="12" />
              <rect x="45" y="42" rx="6" ry="6" width="76" height="12" />
              <circle cx="130" cy="38" r="16" />
            </g>
            <g fill="currentColor" opacity=".7">
              <rect x="24" y="120" width="120" height="12" rx="4" />
              <rect x="32" y="96" width="104" height="26" rx="6" />
              <rect x="28" y="108" width="112" height="3" rx="1.5" />
            </g>
            <g fill="currentColor" opacity=".55">
              <circle cx="156" cy="84" r="14" />
              <rect x="138" y="72" width="40" height="10" rx="5" />
              <rect x="130" y="84" width="56" height="10" rx="5" />
              <path d="M142 86 l6 6 l12 -12" stroke="currentColor" stroke-width="4" fill="none" />
            </g>
          </svg>
        </div>
      </div>

      <span class="sr-only">Decorative background illustration with soft gradients and waves.</span>
    </section>

    <!-- Why Use AuditAgent -->
    <section id="features" class="py-16 md:py-20 bg-gradient-to-b from-violet-50/80 to-purple-50/40 dark:from-slate-900/40 dark:to-slate-900/30" aria-labelledby="why-title">
      <div class="max-w-7xl mx-auto px-6">
        <div class="text-center mb-12" data-aos="fade-up">
          <h2 id="why-title" class="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">
            Why Use AuditAgent?
          </h2>
          <p class="mt-3 text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            Designed to be mindful and supportive — not overwhelming.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          <el-card
            v-for="(f, idx) in features"
            :key="f.title"
            class="rounded-2xl bg-white/80 dark:bg-slate-800/60 backdrop-blur shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1 border-0"
            data-aos="zoom-in"
            :data-aos-delay="100 * idx"
          >
            <div class="flex flex-col items-center text-center p-2">
              <div class="text-5xl" aria-hidden="true">{{ f.emoji }}</div>
              <h3 class="mt-4 text-xl font-semibold text-slate-900 dark:text-white">{{ f.title }}</h3>
              <p class="mt-2 text-slate-600 dark:text-slate-300">{{ f.desc }}</p>
            </div>
          </el-card>
        </div>
      </div>
    </section>

    <!-- Daily Flow -->
    <section class="py-16 md:py-20 bg-sky-50/60 dark:bg-slate-900/40" aria-labelledby="flow-title">
      <div class="max-w-7xl mx-auto px-6">
        <div class="text-center mb-12" data-aos="fade-up">
          <h2 id="flow-title" class="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">
            A Gentle Daily Flow
          </h2>
          <p class="mt-3 text-slate-600 dark:text-slate-300">Small, steady steps toward a calmer you.</p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          <div
            v-for="(s, idx) in steps"
            :key="s.title"
            class="relative rounded-xl bg-white/80 dark:bg-slate-800/60 shadow-sm p-6 text-center border-0"
            data-aos="fade-up"
            :data-aos-delay="100 * idx"
          >
            <div class="text-4xl" aria-hidden="true">{{ s.emoji }}</div>
            <h3 class="mt-4 font-semibold text-lg text-slate-900 dark:text-white">{{ s.title }}</h3>
            <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">{{ s.desc }}</p>

            <!-- Connector (desktop only) -->
            <span
              v-if="idx < steps.length - 1"
              class="hidden lg:block absolute top-1/2 right-[-18px] w-9 h-px border-t border-dashed border-slate-300 dark:border-slate-600"
              aria-hidden="true"
            ></span>
            <span
              v-if="idx < steps.length - 1"
              class="hidden lg:block absolute top-[calc(50%-6px)] right-[-18px] w-0 h-0 border-l-8 border-l-slate-300 dark:border-l-slate-600 border-y-6 border-y-transparent"
              aria-hidden="true"
            ></span>
          </div>
        </div>
      </div>
    </section>

    <!-- Testimonials -->
    <section class="py-16 md:py-20 bg-indigo-50/70 dark:bg-slate-900/40" aria-labelledby="testimonials-title">
      <div class="max-w-7xl mx-auto px-6">
        <div class="text-center mb-12" data-aos="fade-up">
          <h2 id="testimonials-title" class="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">
            What People Say
          </h2>
          <p class="mt-3 text-slate-600 dark:text-slate-300">Gentle, practical, and surprisingly insightful — every day.</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          <el-card
            v-for="(t, idx) in testimonials"
            :key="idx"
            class="bg-white/90 dark:bg-slate-800/60 rounded-2xl border-0 shadow-sm hover:shadow-md transition-all"
            data-aos="fade-up"
            :data-aos-delay="100 * idx"
          >
            <div class="flex items-start gap-4">
              <div
                class="flex items-center justify-center rounded-full w-12 h-12 shrink-0 text-white font-semibold"
                :style="{ backgroundColor: t.bg }"
                aria-hidden="true"
              >
                {{ t.author.charAt(0) }}
              </div>
              <div>
                <blockquote class="text-slate-700 dark:text-slate-200">“{{ t.quote }}”</blockquote>
                <div class="mt-2 text-sm text-slate-500 dark:text-slate-400">— {{ t.author }}</div>
              </div>
            </div>
          </el-card>
        </div>
      </div>
    </section>

    <!-- Get Started -->
    <section class="py-16 md:py-20 bg-gradient-to-b from-indigo-50/70 to-violet-50/60 dark:from-slate-900/50 dark:to-slate-900/40" aria-labelledby="cta-title">
      <div class="max-w-3xl mx-auto px-6 text-center" data-aos="zoom-in">
        <h2 id="cta-title" class="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">
          Ready to Begin?
        </h2>
        <p class="mt-3 text-slate-700 dark:text-slate-200">
          Log in to track progress, or explore as a guest to get a feel for it.
        </p>
        <div class="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <el-button type="primary" size="large" aria-label="Get started by logging in" @click="goToLogin">
            🚀 Get Started
          </el-button>
          <el-button size="large" plain aria-label="Explore features as guest" @click="continueAsGuest">
            🌿 Explore as Guest
          </el-button>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="py-8 text-center text-sm text-slate-500 dark:text-slate-400" data-aos="fade-in">
      <div class="max-w-7xl mx-auto px-6">
        <p>
          Built with <span aria-hidden="true">❤</span> by
          <a href="https://github.com/abhishekkumarjha" target="_blank" rel="noopener" class="underline hover:text-slate-700 dark:hover:text-slate-300">Abhishek</a>
          • AuditAgent
        </p>
        <div class="mt-2 space-x-4">
          <RouterLink to="/privacy-policy" class="hover:underline">Privacy</RouterLink>
          <RouterLink to="/terms" class="hover:underline">Terms</RouterLink>
          <RouterLink to="/contact" class="hover:underline">Contact</RouterLink>
        </div>
      </div>
    </footer>
  </div>
  
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter, RouterLink } from 'vue-router'

const router = useRouter()

const features = [
  {
    emoji: '🎙️',
    title: 'Voice Journaling',
    desc: 'Speak your thoughts; let AI transcribe and summarize with compassion.',
  },
  { emoji: '📅', title: 'Smart Planner', desc: 'Carry forward tasks, set intentions, and stay gently accountable.' },
  { emoji: '💓', title: 'Mood Reflection', desc: 'Notice trends over time and build emotional awareness.' },
]

const steps = [
  { emoji: '🌤️', title: 'Morning Plan', desc: 'Set your focus with clarity and intention.' },
  { emoji: '🎧', title: 'Midday Log', desc: 'Drop a quick voice note to capture progress.' },
  { emoji: '🌙', title: 'Evening Reflection', desc: 'Wind down with a gentle, thoughtful summary.' },
  { emoji: '📈', title: 'Growth Stats', desc: 'See patterns emerge and celebrate small wins.' },
]

const testimonials = [
  { quote: 'I feel calmer and more intentional each day.', author: 'A.M.', bg: '#8b5cf6' },
  { quote: 'The voice journaling fits perfectly into my routine.', author: 'J.K.', bg: '#6366f1' },
  { quote: 'Small prompts, big impact. Love the daily flow.', author: 'S.R.', bg: '#06b6d4' },
]

function goToLogin() {
  router.push('/login')
}

function continueAsGuest() {
  // Note: /journal requires auth in router. This will redirect to /login if not authenticated.
  router.push({ name: 'journal', query: { guest: '1' } })
}

onMounted(async () => {
  // Lazy-load AOS to avoid bundling issues if not installed yet
  try {
    const AOS = await import(/* @vite-ignore */ 'aos')
    await import(/* @vite-ignore */ 'aos/dist/aos.css')
    AOS.init({ duration: 700, easing: 'ease-out-cubic', once: true, offset: 40 })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('AOS not installed; animations skipped.', err)
  }
})
</script>

<style scoped>
.animate-drift-slow { animation: drift 28s ease-in-out infinite alternate; }
.animate-drift { animation: drift 18s ease-in-out infinite alternate; }
@keyframes drift {
  from { transform: translateX(-10px); }
  to { transform: translateX(10px); }
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
