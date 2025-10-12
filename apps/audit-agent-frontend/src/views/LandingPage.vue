<template>
  <!-- Brand logo at top-left of hero (landing only) -->
 <!-- <header class="fixed top-0 left-0 w-full z-30 flex items-center bg-transparent px-4 py-3">
    <RouterLink to="/" class="flex items-center">
      <img
        src="/logo-bg-remove.png"
        alt="PlanCraftAI Logo"
        class="h-10 w-auto sm:h-12 md:h-14 drop-shadow-lg select-none"
      />
      <span class="ml-2 text-lg font-bold text-white hidden sm:inline">PlanCraftAI</span>
    </RouterLink>
  </header> -->
  
  <!-- AI-friendly content: About + Features (visible, semantic) -->
  <!-- <section aria-label="About PlanCraftAI" class="max-w-4xl mx-auto mt-24 px-6">
    <h2 class="text-2xl font-semibold text-slate-100">About PlanCraftAI</h2>
    <p class="mt-2 text-slate-300">
      PlanCraftAI helps you plan, journal, and reflect with voice journaling, AI-powered task planning, and mindful insights. Your private productivity companion for peaceful focus.
    </p>
  </section>
  <section aria-label="Key Features" class="max-w-4xl mx-auto mt-8 px-6">
    <h2 class="text-2xl font-semibold text-slate-100">Key Features</h2>
    <ul class="mt-2 list-disc pl-6 space-y-1 text-slate-200">
      <li>Voice Journaling for quick, hands-free capture</li>
      <li>Smart Planner that generates tasks with AI</li>
      <li>Mood Reflection and sentiment trends</li>
      <li>Daily Flow to review, plan, and focus</li>
    </ul>
  </section> -->
  <!-- Brand logo at top of hero -->
  <!-- <div class="flex flex-col items-center justify-center">
    <img
      src="/logo.png"
      alt="PlanCraftAI Logo"
      class="mx-auto mb-6 w-24 h-24 drop-shadow-lg"
    />
  </div> -->
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
    <!-- Hero -->
    <section
      class="relative py-24 md:py-32 bg-gradient-to-br from-indigo-900 via-purple-900 to-gray-900 overflow-hidden"
    >
<!-- Inside your hero <section> -->
<div class="absolute top-6 left-6 z-20 flex items-center gap-2">
  <img
    src="/logo-bg-remove.png"
    alt="PlanCraftAI Logo"
    class="h-10 w-auto sm:h-12 md:h-14 drop-shadow-lg select-none"
  />
  <span class="text-lg sm:text-xl md:text-2xl font-bold text-white tracking-tight">
    PlanCraftAI
  </span>
</div>
      <!-- 🌠 Falling stars background -->
      <canvas ref="starsCanvas" class="absolute inset-0 w-full h-full z-0"></canvas>

      <!-- Hero Content -->
      <div class="relative z-10 max-w-4xl mx-auto text-center">
        <h1
          id="hero-title"
          class="text-5xl md:text-7xl font-extrabold tracking-tight text-white drop-shadow-lg"
          data-aos="fade-up"
        >
          Peaceful Productivity
        </h1>
        <p
          class="mt-6 text-lg md:text-2xl text-indigo-100 max-w-2xl mx-auto leading-relaxed"
          data-aos="fade-up"
          data-aos-delay="150"
        >
          Pause, plan, and reflect — with gentle voice journaling, smart tasks, and mindful insights
          guiding your daily flow.
        </p>
        <div
          class="mt-10 flex flex-col sm:flex-row gap-4 justify-center"
          data-aos="zoom-in"
          data-aos-delay="250"
        >
          <el-button
            class="!ml-0"
            type="primary"
            size="large"
            aria-label="Log in to PlanCraftAI"
            @click="goToLogin"
          >
            🚀 Get Started
          </el-button>
          <el-button
            class="!ml-0"
            size="large"
            plain
            aria-label="Continue as guest"
            @click="continueAsGuest"
          >
            🌿 Continue as Guest
          </el-button>
          <RouterLink
            to="/subscription"
            class="inline-flex items-center justify-center px-5 py-3 rounded-xl bg-black/20 text-white font-semibold hover:bg-black/30 transition"
            aria-label="See premium plans"
          >
            ⭐ See Premium
          </RouterLink>
        
        </div>
          <el-button id="installBtn" size="large" type="success" style="display: none">
            📲 Install App
          </el-button>
      </div>
    </section>

    <!-- Why Use PlanCraftAI -->
    <!-- Why Use PlanCraftAI -->
    <section
      id="features"
      class="py-20 relative bg-gradient-to-b from-violet-900/30 to-indigo-950/50"
      aria-labelledby="why-title"
    >
      <!-- floating stars background -->
      <div class="absolute inset-0 -z-10" ref="stars"></div>

      <div class="max-w-7xl mx-auto px-6">
        <div class="text-center mb-16" data-aos="fade-up">
          <h2 id="why-title" class="text-4xl md:text-5xl font-extrabold text-white drop-shadow">
            Why Use PlanCraftAI?
          </h2>
          <p class="mt-4 text-indigo-200 max-w-2xl mx-auto text-lg">
            Designed to be mindful and supportive — not overwhelming.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div
            v-for="(f, idx) in features"
            :key="f.title"
            class="group relative rounded-2xl bg-white/5 backdrop-blur-xl p-8 border border-white/10 shadow-lg transition-all hover:shadow-indigo-500/40 hover:-translate-y-2"
            data-aos="zoom-in"
            :data-aos-delay="100 * idx"
          >
            <!-- gradient border glow -->
            <div
              class="absolute inset-0 rounded-2xl bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 opacity-0 group-hover:opacity-100 blur-xl transition"
            ></div>

            <!-- Icon -->
            <div
              class="relative w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-3xl shadow-md"
            >
              {{ f.emoji }}
            </div>

            <!-- Title -->
            <h3 class="relative mt-6 text-xl font-semibold text-white tracking-wide">
              {{ f.title }}
            </h3>

            <!-- Description -->
            <p class="relative mt-3 text-indigo-200 text-sm leading-relaxed">
              {{ f.desc }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Daily Flow -->
    <section id="flow" class="py-16 md:py-20 bg-slate-900/60" aria-labelledby="flow-title">
      <div class="max-w-7xl mx-auto px-6">
        <div class="text-center mb-12" data-aos="fade-up">
          <h2 id="flow-title" class="text-3xl md:text-4xl font-bold text-white">
            A Gentle Daily Flow
          </h2>
          <p class="mt-3 text-indigo-200">Small, steady steps toward a calmer you.</p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          <div
            v-for="(s, idx) in steps"
            :key="s.title"
            class="relative rounded-xl bg-white/10 backdrop-blur-md shadow p-6 text-center border border-white/10 hover:scale-105 transform transition"
            data-aos="fade-up"
            :data-aos-delay="100 * idx"
          >
            <div class="text-4xl">{{ s.emoji }}</div>
            <h3 class="mt-4 font-semibold text-lg text-white">
              {{ s.title }}
            </h3>
            <p class="mt-1 text-sm text-indigo-200">{{ s.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Testimonials -->
    <section
      id="testimonials"
      class="py-16 md:py-20 bg-slate-950/80"
      aria-labelledby="testimonials-title"
    >
      <div class="max-w-7xl mx-auto px-6">
        <div class="text-center mb-12" data-aos="fade-up">
          <h2 id="testimonials-title" class="text-3xl md:text-4xl font-bold text-white">
            What People Say
          </h2>
          <p class="mt-3 text-indigo-200">
            Gentle, practical, and surprisingly insightful — every day.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <el-card
            v-for="(t, idx) in testimonials"
            :key="idx"
            class="rounded-2xl border shadow-lg hover:shadow-xl transition-all"
            :body-style="{ padding: '24px' }"
            :data-aos-delay="100 * idx"
            data-aos="fade-up"
            style="
              --el-card-bg-color: rgba(2, 6, 23, 0.9); /* slate-950/90 */
              --el-card-border-color: rgb(51, 65, 85); /* slate-700 */
              color: #e5e7eb; /* text-slate-200 */
            "
          >
            <div class="flex items-start gap-4">
              <div
                class="flex items-center justify-center rounded-full w-12 h-12 shrink-0 text-white font-semibold"
                :style="{ backgroundColor: t.bg }"
              >
                {{ t.author.charAt(0) }}
              </div>

              <div>
                <blockquote class="text-slate-100 leading-relaxed text-base md:text-lg">
                  “{{ t.quote }}”
                </blockquote>
                <div class="mt-2 text-sm text-slate-400">— {{ t.author }}</div>
              </div>
            </div>
          </el-card>
        </div>
      </div>
    </section>

    <!-- Get Started -->
    <section
      id="cta"
      class="py-16 md:py-20 bg-gradient-to-b from-slate-900/60 to-slate-950/80"
      aria-labelledby="cta-title"
    >
      <div class="max-w-3xl mx-auto px-6 text-center" data-aos="zoom-in">
        <h2 id="cta-title" class="text-3xl md:text-4xl font-bold text-white">Ready to Begin?</h2>
        <p class="mt-3 text-indigo-200">
          Log in to track progress, or explore as a guest to get a feel for it.
        </p>
        <div class="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <el-button
            type="primary"
            size="large"
            aria-label="Get started by logging in"
            @click="goToLogin"
          >
            🚀 Get Started
          </el-button>
          <el-button
            size="large"
            plain
            aria-label="Explore features as guest"
            @click="continueAsGuest"
          >
            🌿 Explore as Guest
          </el-button>
        </div>
      </div>
    </section>

    <!-- Footer -->
   <footer class="py-8 text-center text-sm text-indigo-300 bg-slate-950" data-aos="fade-in">
  <div class="max-w-7xl mx-auto px-6">
    <p class="flex flex-col sm:flex-row justify-center items-center gap-2">
      <span>
        Built with <span aria-hidden="true">❤</span> by
        <a
          href="https://www.linkedin.com/in/fullstuffdeveloper/"
          target="_blank"
          rel="noopener"
          class="underline hover:text-indigo-400"
        >
          Abhishek
        </a>
      </span>
      <span>• <strong>PlanCraftAI</strong></span>
    </p>
    <div class="mt-3 space-x-4">
      <!-- Blog Links  -->
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
import { useHead } from '@vueuse/head'

function continueAsGuest() {
  const authStore = useAuthStore()
  authStore.loginAsGuest().then(() => {
    router.push({ name: 'dashboard' }) // or 'journal' if that’s your main entry
  })
}

const router = useRouter()

// SEO + JSON-LD
const SITE_URL = import.meta.env.VITE_SITE_URL || 'https://plancraftai.com'
useHead({
  title: 'PlanCraftAI – Peaceful Productivity with Voice Journaling and AI',
  meta: [
    { name: 'description', content: 'Plan your day, journal with your voice, and get AI insights for calm, focused productivity.' },
    { name: 'keywords', content: 'voice task planner, journaling insights app, habit tracking with AI, daily planner' },
    { property: 'og:title', content: 'PlanCraftAI – Peaceful Productivity' },
    { property: 'og:description', content: 'Pause, plan, and reflect with a gentle, AI-assisted planner.' },
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: SITE_URL }
  ],
  link: [{ rel: 'canonical', href: SITE_URL }],
  script: [
    {
      type: 'application/ld+json',
      children: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: 'PlanCraftAI',
        url: SITE_URL,
        applicationCategory: 'ProductivityApplication',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        operatingSystem: 'Web',
        description: 'Plan, journal, and reflect with a gentle, AI-assisted daily flow.'
      })
    }
  ]
})

const stars = ref(null)
onMounted(() => {
  if (!stars.value) return
  const count = 80
  for (let i = 0; i < count; i++) {
    const star = document.createElement('div')
    star.className = 'star'
    star.style.top = `${Math.random() * 100}%`
    star.style.left = `${Math.random() * 100}%`
    star.style.animationDuration = `${2 + Math.random() * 3}s`
    stars.value.appendChild(star)
  }
})

const starsCanvas = ref(null)

onMounted(() => {
  const canvas = starsCanvas.value
  const ctx = canvas.getContext('2d')
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight

  const stars = Array.from({ length: 100 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    radius: Math.random() * 1.5,
    speed: Math.random() * 1 + 0.5,
  }))

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = 'white'
    stars.forEach((star) => {
      ctx.beginPath()
      ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2)
      ctx.fill()
      star.y += star.speed
      if (star.y > canvas.height) {
        star.y = 0
        star.x = Math.random() * canvas.width
      }
    })
    requestAnimationFrame(animate)
  }

  animate()
})

const features = [
  {
    emoji: '🎙️',
    title: 'Voice Journaling',
    desc: 'Speak your thoughts; let AI transcribe and summarize with compassion.',
  },
  {
    emoji: '📅',
    title: 'Smart Planner',
    desc: 'Carry forward tasks, set intentions, and stay gently accountable.',
  },
  {
    emoji: '💓',
    title: 'Mood Reflection',
    desc: 'Notice trends over time and build emotional awareness.',
  },
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
  { quote: 'I feel calmer and more intentional each day.', author: 'A.M.', bg: '#8b5cf6' },
  { quote: 'The voice journaling fits perfectly into my routine.', author: 'J.K.', bg: '#6366f1' },
  { quote: 'Small prompts, big impact. Love the daily flow.', author: 'S.R.', bg: '#06b6d4' },
]

function goToLogin() {
  router.push('/login')
}
// function continueAsGuest() {
//   router.push({ name: 'journal', query: { guest: '1' } })
// }

onMounted(() => {
  if (!stars.value) return
  const count = 80
  for (let i = 0; i < count; i++) {
    const star = document.createElement('div')
    star.className = 'star'
    star.style.top = `${Math.random() * 100}%`
    star.style.left = `${Math.random() * 100}%`
    star.style.animationDuration = `${2 + Math.random() * 3}s`
    stars.value.appendChild(star)
  }
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

@keyframes twinkle {
  from {
    opacity: 0.2;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1.2);
  }
}
</style>
