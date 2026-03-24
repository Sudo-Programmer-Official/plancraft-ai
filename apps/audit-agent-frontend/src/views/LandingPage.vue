<template>
  <div
    class="landing-shell relative min-h-screen flex flex-col text-gray-800 dark:text-slate-100 overflow-hidden"
  >
    <!-- Animated Star Background -->
    <div
      class="absolute inset-0 -z-10 bg-gradient-to-b from-indigo-900 via-purple-900 to-slate-950"
    >
      <div class="absolute inset-0" ref="stars"></div>
    </div>

    <!-- Hero -->
    <section
      class="landing-hero relative py-32 md:py-40 bg-gradient-to-b from-indigo-900 via-purple-900 to-slate-950 overflow-hidden"
    >
      <div class="landing-brand absolute top-6 left-6 z-20 flex items-center gap-2">
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

      <div
        class="relative z-10 max-w-5xl mx-auto px-6 text-center flex flex-col items-center gap-7 md:gap-9"
      >
        <div class="flex flex-col gap-4 md:gap-5">
          <h1
            id="hero-title"
            class="text-5xl md:text-7xl font-extrabold tracking-tight text-white drop-shadow-lg leading-[1.05]"
            data-aos="fade-up"
          >
            Peaceful Productivity
          </h1>
          <p
            class="text-lg md:text-2xl text-indigo-100 max-w-3xl mx-auto leading-relaxed md:leading-[1.7]"
            data-aos="fade-up"
            data-aos-delay="150"
          >
            PlanCraft AI is a peaceful AI workspace for individuals and teams — plan together, speak
            your tasks, sync calendars, and let Voice AI keep everyone on track.
          </p>
        </div>
        <div
          class="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center w-full max-w-2xl"
          data-aos="zoom-in"
          data-aos-delay="250"
        >
          <el-button
            type="primary"
            size="large"
            class="primary-team-cta hero-cta w-full sm:w-auto !px-8 !py-3.5 !rounded-2xl font-semibold"
            @click="startTeamsFlow"
            >
            <span class="cta-icon" aria-hidden="true">↗</span>
            <span>Try for Teams</span>
            </el-button
          >
          <el-button
            size="large"
            plain
            class="solo-cta hero-cta w-full sm:w-auto !px-6 !py-3 !rounded-xl font-semibold"
            @click="startSoloFlow"
            >
            <span>Try Solo</span>
            </el-button
          >
        </div>
        <div class="flex flex-col gap-2 text-indigo-100/90 leading-relaxed max-w-2xl mx-auto">
          <p
            class="text-sm md:text-base"
            data-aos="fade-up"
            data-aos-delay="300"
          >
            Use it solo, or create a workspace for your team.
          </p>
          <p
            class="text-base md:text-lg text-indigo-100"
            data-aos="fade-up"
            data-aos-delay="320"
          >
            Built for workspaces with seats, billing, and roles — with Voice AI reminders that keep
            everyone calmly aligned.
          </p>
        </div>
      </div>
    </section>

    <!-- Workspaces for Teams -->
    <section
      id="teams"
      class="relative py-16 md:py-20 bg-gradient-to-b from-slate-950 via-indigo-950/80 to-slate-950 text-white overflow-hidden"
    >
      <div class="absolute inset-0 opacity-20">
        <div class="absolute -top-24 -left-24 w-72 h-72 bg-indigo-500/30 rounded-full blur-3xl"></div>
        <div class="absolute -bottom-24 -right-32 w-80 h-80 bg-purple-500/25 rounded-full blur-3xl"></div>
      </div>
      <div class="relative max-w-6xl mx-auto px-6">
        <div class="text-center max-w-3xl mx-auto mb-10">
          <p class="uppercase text-xs tracking-[0.35em] text-indigo-300">Workspaces</p>
          <h2 class="mt-3 text-3xl md:text-4xl font-bold">Workspaces for Teams</h2>
          <p class="mt-4 text-indigo-200 text-lg">
            Built for startups and small teams to plan together, stay aligned, and let Voice AI
            handle the nudges.
          </p>
        </div>
        <div class="grid gap-6 md:grid-cols-3">
          <div
            v-for="point in teamHighlights"
            :key="point.title"
            class="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl shadow-lg"
          >
            <div class="text-3xl mb-3">{{ point.emoji }}</div>
            <h3 class="text-xl font-semibold mb-2">{{ point.title }}</h3>
            <p class="text-indigo-100/90 text-sm leading-relaxed">{{ point.desc }}</p>
          </div>
        </div>
        <div class="mt-10 flex flex-col sm:flex-row justify-center items-center gap-4 text-center">
          <el-button type="primary" size="large" class="!px-6 !py-3 !rounded-xl" @click="startTeamWorkspace">
            Create a Workspace
          </el-button>
          <button
            type="button"
            class="text-indigo-200 hover:text-white underline decoration-indigo-300/70"
            @click="scrollToTeamPricing"
          >
            {{ teamFeaturesCtaLabel }}
          </button>
        </div>
        <p class="mt-3 text-sm text-indigo-200/80 text-center">
          No credit card required · Set up in under 2 minutes
        </p>
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

    <TestimonialsSection :testimonials="testimonialCards" />

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
        <h2 class="text-4xl md:text-5xl font-bold text-white mb-4">
          {{ isAppleBillingSafeMode ? '✨ Premium Access' : '✨ Choose Your Flow' }}
        </h2>
        <p class="text-indigo-200 mb-12 text-lg">
          {{ isAppleBillingSafeMode ? `Premium features are available via your account. Visit ${billingWebHost} to manage upgrades on the web.` : 'Simple plans designed to help you stay mindful and productive.' }}
        </p>

        <template v-if="isAppleBillingSafeMode">
          <div class="max-w-5xl mx-auto rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 md:p-10 text-left shadow-2xl">
            <div class="grid gap-6 md:grid-cols-2">
              <div class="space-y-4">
                <p class="text-sm uppercase tracking-[0.35em] text-indigo-300">Premium features</p>
                <ul class="space-y-3 text-sm text-indigo-100/90">
                  <li>Unlimited reminders and AI summaries</li>
                  <li>Voice journaling and richer insights</li>
                  <li>Calendar, WhatsApp, and shared workspace features</li>
                </ul>
              </div>
              <div class="space-y-4">
                <p class="text-sm uppercase tracking-[0.35em] text-indigo-300">Upgrade on web</p>
                <p class="text-indigo-100/85">
                  Use the website to manage upgrades or billing changes. The app will reflect those changes after sign-in.
                </p>
                <div class="flex flex-wrap gap-3">
                  <RouterLink
                    :to="billingRoutePath"
                    class="inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 font-semibold text-indigo-700 hover:bg-slate-100 transition shadow-md"
                  >
                    Learn how to upgrade
                  </RouterLink>
                  <button
                    type="button"
                    class="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-5 py-3 font-semibold text-white hover:border-indigo-300/40 transition"
                    @click="startSoloFlow"
                  >
                    Continue with your account
                  </button>
                </div>
              </div>
            </div>
          </div>
        </template>

        <div v-else class="space-y-6 max-w-5xl mx-auto">
          <p class="text-sm uppercase tracking-[0.35em] text-indigo-300">Solo plans</p>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-8 justify-center items-stretch">
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
                <h3 class="text-2xl font-semibold text-white mb-3">🌿 Solo Free</h3>
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
                <h3 class="text-2xl font-semibold text-white mb-3">🚀 Solo Premium</h3>
                <p class="text-indigo-100 text-sm mb-6">
                  Unlock the full mindful productivity experience.
                </p>
                <ul class="space-y-3 text-left text-sm mb-6 text-white/95">
                  <li>💎 Unlimited reminders & AI summaries</li>
                  <li>💎 Voice journaling & insights</li>
                  <li>💎 Calendar & WhatsApp integration</li>
                  <li>💎 Priority support & early access</li>
                </ul>
              </div>
              <div class="mt-auto">
                <div class="text-3xl font-bold mb-4">
                  $2<span class="text-sm text-indigo-100">/month</span>
                </div>
                <RouterLink
                  :to="billingRoutePath"
                  class="inline-block w-full px-6 py-3 rounded-xl bg-white text-indigo-700 font-semibold hover:bg-slate-100 transition shadow-md"
                >
                  💎 Explore Premium
                </RouterLink>
              </div>
            </div>
          </div>
        </div>

        <section id="team-pricing" class="mt-14 max-w-6xl mx-auto space-y-4 text-left">
          <template v-if="isAppleBillingSafeMode">
            <div class="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 shadow-xl">
              <p class="text-sm uppercase tracking-[0.35em] text-indigo-300">Team workspace features</p>
              <h3 class="mt-3 text-3xl font-semibold text-white">Workspaces for Teams</h3>
              <p class="mt-3 text-indigo-200 max-w-2xl">
                Shared workspaces, teammate roles, and Voice AI follow-ups are available from your account on the web.
              </p>
              <ul class="mt-6 grid gap-3 md:grid-cols-2 text-sm text-indigo-100/90">
                <li>Shared tasks and workspace context</li>
                <li>Role-based access for owners, admins, editors, and viewers</li>
                <li>Voice AI reminders and follow-ups</li>
                <li>Workspace creation and team setup</li>
              </ul>
              <div class="mt-6 flex flex-wrap gap-3">
                <button
                  class="px-5 py-3 rounded-xl bg-white text-indigo-700 font-semibold hover:bg-slate-100 transition shadow-md"
                  @click="startTeamWorkspace"
                >
                  Create Workspace
                </button>
                <RouterLink
                  :to="billingRoutePath"
                  class="px-5 py-3 rounded-xl border border-white/15 bg-white/5 text-white font-semibold hover:border-indigo-300/40 transition"
                >
                  Learn how upgrades work
                </RouterLink>
              </div>
            </div>
          </template>
          <template v-else>
            <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <p class="text-sm uppercase tracking-[0.35em] text-indigo-300">Teams pricing</p>
                <h3 class="text-3xl font-semibold text-white">Workspaces for Teams</h3>
                <p class="text-indigo-200 max-w-2xl">
                  Seat-based plans built for small teams that need shared tasks, team roles, and Voice
                  AI reminders that keep projects moving.
                </p>
              </div>
              <button
                class="px-5 py-3 rounded-xl bg-white text-indigo-700 font-semibold hover:bg-slate-100 transition shadow-md"
                @click="startTeamWorkspace"
              >
                Create Workspace
              </button>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <article
                v-for="plan in teamPlans"
                :key="plan.name"
                class="rounded-2xl border border-indigo-500/25 bg-slate-900/70 backdrop-blur-xl p-6 shadow-lg hover:-translate-y-1 transition"
                :class="plan.featured ? 'ring-2 ring-indigo-400/50 bg-gradient-to-br from-indigo-900/80 via-slate-900 to-indigo-950' : ''"
              >
                <div class="flex items-center justify-between mb-3">
                  <h4 class="text-2xl font-semibold text-white">{{ plan.name }}</h4>
                  <span
                    class="text-[11px] px-2 py-1 rounded-full bg-indigo-500/20 text-indigo-100 border border-indigo-400/40"
                  >
                    Team
                  </span>
                </div>
                <div class="flex items-baseline gap-2">
                  <span class="text-3xl font-bold text-white">{{ plan.price }}</span>
                  <span class="text-sm text-indigo-200">/seat/month</span>
                </div>
                <p class="text-sm text-indigo-200 mt-1">{{ plan.minSeats }}</p>
                <ul class="mt-4 space-y-2 text-sm text-indigo-100/90">
                  <li v-for="item in plan.features" :key="item">✅ {{ item }}</li>
                </ul>
                <div v-if="plan.note" class="mt-3 text-xs text-amber-200 flex items-center gap-1">
                  <span>⚠️</span>
                  <span>{{ plan.note }}</span>
                </div>
                <button
                  class="mt-6 w-full px-4 py-3 rounded-xl font-semibold shadow-lg transition"
                  :class="plan.featured ? 'bg-white text-indigo-800 hover:bg-slate-100' : 'bg-indigo-600 text-white hover:bg-indigo-500'"
                  @click="startTeamWorkspace"
                >
                  Create Workspace
                </button>
              </article>
            </div>
            <p class="text-sm text-indigo-200">
              Seats = people you invite to collaborate in a workspace. You only pay for active teammates, not viewers or guests.
            </p>
            <p class="text-sm text-indigo-200">Change seats anytime. Billing adjusts automatically.</p>
          </template>
        </section>

        <div
          class="mt-10 rounded-2xl border border-indigo-400/25 bg-indigo-500/10 p-6 max-w-3xl mx-auto text-left shadow-lg"
        >
          <div class="flex items-start gap-3">
            <div class="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-lg">🛡️</div>
            <div>
              <p class="text-lg font-semibold text-white">Billing you can trust</p>
              <p class="text-sm text-indigo-100 mt-1">
                No hidden fees. Cancel anytime. Change seats anytime. Billing adjusts automatically. No long-term contracts.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section id="cta" class="py-20 bg-gradient-to-b from-slate-900/60 to-slate-950/80 text-center">
      <div class="max-w-3xl mx-auto px-6" data-aos="zoom-in">
        <h2 class="text-3xl md:text-4xl font-bold text-white">Ready to build together — calmly?</h2>
        <p class="mt-3 text-indigo-200 leading-relaxed">
          Create a workspace for your team, or start solo and invite teammates anytime.
          No setup friction. No pressure.
        </p>
        <div class="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <el-button type="primary" size="large" class="!px-7 !py-3 !rounded-xl" @click="startTeamWorkspace">
            🤝 Create a Workspace
          </el-button>
          <el-button size="large" plain class="!rounded-xl" @click="continueAsGuest">🌿 Start Solo</el-button>
        </div>
        <p class="mt-4 text-sm text-indigo-200/90">
          No credit card required. Invite your team when ready.
        </p>
      </div>
    </section>

    <!-- Footer -->
    <footer
      class="landing-footer py-8 text-center text-sm text-indigo-300 bg-slate-950 border-t border-indigo-500/10"
    >
      <div class="max-w-7xl mx-auto px-6">
        <p class="text-indigo-200 mb-2">Built for calm execution — solo or with a team.</p>
        <p class="flex flex-col sm:flex-row justify-center items-center gap-2">
          <span
            >© {{ new Date().getFullYear() }} <strong>Sudo Programmer Inc.</strong> — Crafted with
            care 💜</span
          >
          <span>• <strong>PlanCraftAI</strong></span>
        </p>
        <div class="mt-3 space-x-4">
          <RouterLink to="/blog" class="hover:underline">Blog</RouterLink>
          <RouterLink to="/privacy" class="hover:underline">Privacy</RouterLink>
          <RouterLink to="/terms" class="hover:underline">Terms</RouterLink>
          <RouterLink to="/contact" class="hover:underline">Contact</RouterLink>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import SeoLongForm from '@/components/SeoLongForm.vue'
import TestimonialsSection from '@/components/TestimonialsSection.vue'
import { useSeoMeta } from '@/composables/useSeoMeta'
import { trackGuestStartFromLanding } from '@/services/analytics'
import { useAuthStore } from '@/stores/authStore'
import { BILLING_WEB_HOST, isAppleBillingSafeMode as detectAppleBillingSafeMode } from '@/utils/billingAccess'

const router = useRouter()
const authStore = useAuthStore()
const isAppleBillingSafeMode = computed(() => detectAppleBillingSafeMode())
const billingWebHost = BILLING_WEB_HOST
const billingRoutePath = computed(() => (isAppleBillingSafeMode.value ? '/billing/upgrade' : '/subscription'))
const teamFeaturesCtaLabel = computed(() => (isAppleBillingSafeMode.value ? 'See team workspace features' : 'See team pricing & features'))

const teamHighlights = [
  {
    emoji: '🧠',
    title: 'Shared AI-powered workspace',
    desc: 'Keep tasks, drafts, and AI context in one shared hub so your team can pick up right where you left off.',
  },
  {
    emoji: '🛡️',
    title: 'Role-based collaboration',
    desc: 'Owner, Admin, Editor, or Viewer — invite teammates with just the right access for calm, controlled execution.',
  },
  {
    emoji: '🎙️',
    title: 'Voice AI reminders + follow-ups',
    desc: 'Speak, and it’s done. Voice AI nudges the team, summarizes progress, and keeps projects moving.',
  },
]

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

const teamPlans = [
  {
    name: 'Team Starter',
    price: '$6',
    minSeats: 'Minimum 3 seats',
    features: [
      'Workspaces with shared tasks',
      'Invite teammates to collaborate',
      'Role-based access (Owner/Admin/Editor/Viewer)',
      'Shared tasks, notes, and context',
      'Voice AI reminders & follow-ups',
    ],
  },
  {
    name: 'Team Pro',
    price: '$10',
    minSeats: 'Minimum 3 seats',
    features: [
      'Everything in Team Starter',
      'Advanced permissions & admin controls (Coming Soon)',
      'Priority support for teams',
    ],
    featured: true,
    note: 'Advanced permissions and admin controls ship next — add teammates now and upgrade automatically.',
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

const testimonialCards = [
  {
    name: 'Ananya M.',
    role: 'Founder, health tech',
    quote: 'PlanCraftAI helped me stay grounded during my startup chaos.',
    avatar: 'https://i.pravatar.cc/150?img=47',
    status: 'approved',
  },
  {
    name: 'Michael L.',
    role: 'Ops lead, 12-person team',
    quote: 'The calm design makes planning feel like meditation.',
    avatar: 'https://i.pravatar.cc/150?img=48',
    status: 'approved',
  },
  {
    name: 'Ravi K.',
    role: 'Product, creator tools',
    quote: 'I love the voice journaling — it feels personal and effortless.',
    avatar: 'https://i.pravatar.cc/150?img=49',
    status: 'approved',
    audio: null,
  },
]

const SITE_URL = (import.meta.env.VITE_SITE_URL && String(import.meta.env.VITE_SITE_URL)) || 'https://plancraftai.com'
const BASE_URL = SITE_URL.endsWith('/') ? SITE_URL.slice(0, -1) : SITE_URL
const featureList = Array.from(
  new Set([
    ...features.map((f) => f.title),
    ...useCases.map((c) => c.title),
    'Workspaces for Teams',
    'Voice AI reminders for teams',
    'Role-based collaboration',
  ]),
)

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
      'PlanCraft AI is the peaceful AI task manager with Workspaces for teams, role-based access, and Voice AI reminders for calm productivity.',
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
  title: 'PlanCraft AI – Workspaces for Teams with Voice AI reminders',
  description:
    'PlanCraft AI now includes Workspaces for teams — invite teammates, assign roles, share tasks, and let Voice AI reminders keep everyone aligned while staying solo-friendly.',
  keywords: [
    'PlanCraft AI',
    'AI task manager',
    'AI daily planner',
    'AI productivity app',
    'AI journaling assistant',
    'AI planner for goals',
    'voice planning for teams',
    'AI reminders',
    'Workspaces for teams',
    'voice AI reminders for teams',
    'team workspace roles',
    'Google Calendar integration',
  ],
  structuredData,
  pageLabel: 'Landing',
})

function startTeamsFlow() {
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem('postLoginRedirect', '/workspaces/new')
    } catch {}
  }

  const isGuest = authStore?.isGuest === true || authStore?.guest === true || authStore?.user?.mode === 'guest'
  if (authStore?.user?.uid && !isGuest) {
    return router.push('/workspaces/new')
  }
  router.push({ path: '/signup', query: { mode: 'team', next: '/workspaces/new' } })
}

function startSoloFlow() {
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem('postLoginRedirect', '/dashboard')
    } catch {}
  }

  const isGuest = authStore?.isGuest === true || authStore?.guest === true || authStore?.user?.mode === 'guest'
  if (authStore?.user?.uid && !isGuest) {
    return router.push('/dashboard')
  }
  router.push({ path: '/login', query: { redirect: '/dashboard' } })
}

function scrollToTeamPricing() {
  if (typeof document !== 'undefined') {
    const el = document.getElementById('team-pricing')
    if (el?.scrollIntoView) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }
  }
  router.push(billingRoutePath.value)
}

function startTeamWorkspace(plan = 'starter') {
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem('postLoginRedirect', `/workspaces/new?plan=${plan}`)
    } catch {}
  }

  const isGuest = authStore?.isGuest === true || authStore?.guest === true || authStore?.user?.mode === 'guest'
  if (authStore?.user?.uid && !isGuest) {
    return router.push({ path: '/workspaces/new', query: { plan } })
  }
  router.push({ path: '/signup', query: { mode: 'team', plan, next: '/workspaces/new' } })
}

function continueAsGuest() {
  try {
    trackGuestStartFromLanding()
  } catch {
    /* analytics optional */
  }
  router.push({ path: '/login', query: { guestFromLanding: '1' } })
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
.landing-shell {
  --safe-area-top: env(safe-area-inset-top, 0px);
  --safe-area-right: env(safe-area-inset-right, 0px);
  --safe-area-bottom: env(safe-area-inset-bottom, 0px);
  --safe-area-left: env(safe-area-inset-left, 0px);
  min-height: 100vh;
  min-height: 100dvh;
  padding-left: var(--safe-area-left);
  padding-right: var(--safe-area-right);
}

.landing-hero {
  padding-top: calc(var(--safe-area-top) + 8rem);
}

.landing-brand {
  top: calc(var(--safe-area-top) + 1.5rem);
  left: calc(var(--safe-area-left) + 1.5rem);
}

.landing-footer {
  padding-bottom: calc(2rem + var(--safe-area-bottom));
}

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

.primary-team-cta {
  background: #4f46e5 !important; /* indigo-600 to match create workspace */
  color: #ffffff !important;
  border: 1px solid #4338ca !important;
  box-shadow: 0 12px 32px rgba(67, 56, 202, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.06);
  letter-spacing: 0.02em;
  transition: transform 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease;
}

.primary-team-cta:hover {
  background: #6366f1 !important; /* indigo-500 */
  box-shadow: 0 16px 38px rgba(99, 102, 241, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.08);
  transform: translateY(-1px);
}

.primary-team-cta:active {
  transform: translateY(0);
  background: #4338ca !important;
  box-shadow: 0 6px 16px rgba(67, 56, 202, 0.3);
}

.primary-team-cta:focus-visible {
  outline: 2px solid #c7d2fe;
  outline-offset: 3px;
}

.solo-cta {
  background: transparent !important;
  color: #e2e8f0 !important;
  border: 1px solid rgba(226, 232, 240, 0.65) !important;
  box-shadow: none;
  letter-spacing: 0.02em;
  transition: transform 0.18s ease, background-color 0.18s ease, border-color 0.18s ease;
}

.solo-cta:hover {
  background: rgba(226, 232, 240, 0.08) !important;
  border-color: rgba(226, 232, 240, 0.9) !important;
  transform: translateY(-1px);
}

.hero-cta {
  display: inline-flex !important;
  align-items: center;
  justify-content: center;
  gap: 0.85rem;
}

.cta-icon {
  font-size: 1.05rem;
  opacity: 0.92;
  line-height: 1;
  transform: translateY(-0.5px);
  margin-right: 2px;
}

.primary-team-cta .cta-icon {
  color: #e0e7ff;
}

.solo-cta .cta-icon {
  color: #e2e8f0;
}

#team-pricing {
  scroll-margin-top: 96px;
}
</style>
