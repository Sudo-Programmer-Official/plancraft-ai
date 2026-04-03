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
        <div class="flex flex-wrap justify-center gap-2 md:gap-3">
          <span
            v-for="chip in heroSearchChips"
            :key="chip"
            class="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs md:text-sm font-semibold uppercase tracking-[0.18em] text-indigo-100 backdrop-blur-xl"
          >
            {{ chip }}
          </span>
        </div>
        <div class="flex flex-col gap-4 md:gap-5">
          <h1
            id="hero-title"
            class="text-5xl md:text-7xl font-extrabold tracking-tight text-white drop-shadow-lg leading-[1.05]"
            data-aos="fade-up"
          >
            AI Task Planner with Voice Reminders
          </h1>
          <p
            class="text-xl md:text-3xl font-semibold text-white/90 max-w-4xl mx-auto leading-snug"
            data-aos="fade-up"
            data-aos-delay="120"
          >
            Plan your day, speak tasks, and never forget anything again.
          </p>
          <p
            class="text-lg md:text-2xl text-indigo-100 max-w-3xl mx-auto leading-relaxed md:leading-[1.7]"
            data-aos="fade-up"
            data-aos-delay="150"
          >
            Turn voice notes into tasks, sync your calendar, and get smart reminders powered by AI.
            PlanCraftAI works as an AI daily planner for solo users and a shared planning workspace
            for teams.
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
            @click="startSoloFlow"
            >
            <span>Start Planning Free</span>
            </el-button
          >
          <el-button
            size="large"
            plain
            class="solo-cta hero-cta w-full sm:w-auto !px-6 !py-3 !rounded-xl font-semibold"
            @click="startTeamWorkspace"
            >
            <span>Create Team Workspace</span>
            </el-button
          >
        </div>
        <div class="flex flex-col gap-2 text-indigo-100/90 leading-relaxed max-w-2xl mx-auto">
          <p
            class="text-sm md:text-base font-semibold uppercase tracking-[0.24em] text-indigo-200"
            data-aos="fade-up"
            data-aos-delay="300"
          >
            No credit card needed
          </p>
          <p
            class="text-base md:text-lg text-indigo-100"
            data-aos="fade-up"
            data-aos-delay="320"
          >
            Built for founders, operators, creators, and small teams who are tired of losing tasks
            after meetings, voice notes, and busy days.
          </p>
        </div>
      </div>
    </section>

    <section class="py-16 md:py-20 bg-slate-950 text-white">
      <div class="max-w-6xl mx-auto px-6 grid gap-6 lg:grid-cols-2">
        <article class="rounded-3xl border border-rose-300/20 bg-rose-500/10 p-8 backdrop-blur-xl shadow-xl">
          <p class="uppercase text-xs tracking-[0.35em] text-rose-200">The problem</p>
          <h2 class="mt-3 text-3xl md:text-4xl font-bold">Stop juggling tasks in your head</h2>
          <ul class="mt-6 space-y-4 text-base text-rose-50/90 leading-relaxed">
            <li v-for="problem in problemBullets" :key="problem">• {{ problem }}</li>
          </ul>
        </article>
        <article class="rounded-3xl border border-emerald-300/20 bg-emerald-500/10 p-8 backdrop-blur-xl shadow-xl">
          <p class="uppercase text-xs tracking-[0.35em] text-emerald-200">The fix</p>
          <h2 class="mt-3 text-3xl md:text-4xl font-bold">PlanCraftAI fixes this</h2>
          <ul class="mt-6 space-y-4 text-base text-emerald-50/90 leading-relaxed">
            <li v-for="solution in solutionBullets" :key="solution">• {{ solution }}</li>
          </ul>
        </article>
      </div>
    </section>

    <section class="py-16 md:py-20 bg-gradient-to-b from-slate-950 to-indigo-950/70 text-white">
      <div class="max-w-6xl mx-auto px-6">
        <div class="text-center max-w-3xl mx-auto">
          <p class="uppercase text-xs tracking-[0.35em] text-indigo-300">How it feels</p>
          <h2 class="mt-3 text-3xl md:text-4xl font-bold">A voice command becomes a real plan</h2>
          <p class="mt-4 text-indigo-100 text-lg leading-relaxed">
            People do not switch because a planner looks calm. They switch when it stops things
            from slipping through the cracks.
          </p>
        </div>
        <div class="mt-10 grid gap-6 lg:grid-cols-[1.2fr_1fr] items-start">
          <div class="rounded-3xl border border-white/10 bg-white/5 p-7 md:p-8 shadow-2xl backdrop-blur-xl">
            <p class="uppercase text-xs tracking-[0.35em] text-indigo-300">Example input</p>
            <div class="mt-5 rounded-2xl border border-indigo-300/20 bg-slate-950/70 p-6">
              <p class="text-sm text-indigo-200 mb-3">Voice note</p>
              <p class="text-2xl md:text-3xl font-semibold text-white leading-snug">
                “Remind me to call John tomorrow at 5.”
              </p>
            </div>
            <div class="mt-6 grid gap-4 md:grid-cols-3">
              <div
                v-for="demo in voiceDemoSteps"
                :key="demo.title"
                class="rounded-2xl border border-white/10 bg-white/5 p-5 text-left"
              >
                <p class="text-2xl">{{ demo.emoji }}</p>
                <h3 class="mt-3 font-semibold text-lg">{{ demo.title }}</h3>
                <p class="mt-2 text-sm text-indigo-100/90 leading-relaxed">{{ demo.desc }}</p>
              </div>
            </div>
          </div>
          <div class="rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-600/20 via-purple-600/10 to-slate-950 p-7 shadow-xl">
            <p class="uppercase text-xs tracking-[0.35em] text-indigo-300">Why people convert</p>
            <div class="mt-5 space-y-4">
              <div
                v-for="hook in conversionHooks"
                :key="hook.title"
                class="rounded-2xl border border-white/10 bg-white/5 p-5"
              >
                <h3 class="font-semibold text-lg text-white">{{ hook.title }}</h3>
                <p class="mt-2 text-sm text-indigo-100/90 leading-relaxed">{{ hook.desc }}</p>
              </div>
            </div>
            <p class="mt-6 text-sm text-indigo-200">
              Join early users building calmer productivity systems without relying on memory alone.
            </p>
          </div>
        </div>
      </div>
    </section>

    <TestimonialsSection :testimonials="testimonialCards" />

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
      title="How PlanCraftAI helps you capture tasks, plan the day, and follow through"
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
          Why people switch to PlanCraftAI
        </h2>
        <p class="text-indigo-200 mb-16 text-lg">
          Forget less, capture faster, and follow through more often.
        </p>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div
            v-for="f in features"
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
            Search-intent pages for the workflows people actually want
          </h2>
          <p class="mt-4 text-indigo-200">
            Target the workflows people search for most: AI daily planning, voice task creation,
            Google Calendar integration, and reminders that stay connected to real tasks.
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
        <h2 class="text-3xl md:text-4xl font-bold text-white mb-4">From capture to follow-through</h2>
        <p class="text-indigo-200 mb-12">A simple sequence that keeps work moving instead of slipping.</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div
            v-for="s in steps"
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
          Modern work breaks down when people keep tasks in their head and reminders across too many
          tools. We built PlanCraftAI to capture work quickly, make daily priorities obvious, and
          keep follow-ups from getting lost.
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
          {{ isAppleBillingSafeMode ? 'Solo Premium is available via Apple In-App Purchase at $2.99/month. Team plans are managed by workspace owners on web.' : 'Simple plans for people who want to stop forgetting tasks and keep work moving.' }}
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
                <p class="text-sm uppercase tracking-[0.35em] text-indigo-300">Solo Premium</p>
                <p class="text-indigo-100/85">
                  Sign in with the account you want to upgrade to Solo Premium, or restore and
                  refresh access if this account already belongs to a paid workspace.
                </p>
                <div class="flex flex-wrap gap-3">
                  <RouterLink
                    :to="billingRoutePath"
                    class="inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 font-semibold text-indigo-700 hover:bg-slate-100 transition shadow-md"
                  >
                    Upgrade to Solo Premium
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
                  Start capturing tasks, planning the day, and building follow-through for free.
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
                  Unlock smarter reminders, richer planning, and faster follow-through.
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
                Team plans are managed by workspace owners on web. Paid workspace access still syncs
                into the iPhone app after sign-in.
              </p>
              <ul class="mt-6 grid gap-3 md:grid-cols-2 text-sm text-indigo-100/90">
                <li>Shared tasks and workspace context</li>
                <li>Role-based access for owners, admins, editors, and viewers</li>
                <li>Voice AI reminders and follow-ups</li>
                <li>Workspace creation and team setup</li>
              </ul>
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
        <h2 class="text-3xl md:text-4xl font-bold text-white">Ready to stop losing tasks?</h2>
        <p class="mt-3 text-indigo-200 leading-relaxed">
          Start free as an AI daily planner for yourself, or create a workspace and bring your team
          into the same reminder and planning flow.
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
        <p class="text-indigo-200 mb-2">Built to help solo users and teams capture work and follow through.</p>
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
import { isAppleBillingSafeMode as detectAppleBillingSafeMode } from '@/utils/billingAccess'

const router = useRouter()
const authStore = useAuthStore()
const isAppleBillingSafeMode = computed(() => detectAppleBillingSafeMode())
const billingRoutePath = computed(() => (isAppleBillingSafeMode.value ? '/billing/upgrade' : '/pricing'))
const teamFeaturesCtaLabel = computed(() => (isAppleBillingSafeMode.value ? 'See team workspace features' : 'See team pricing & features'))

const heroSearchChips = ['AI daily planner', 'Voice task manager', 'Smart reminders']

const problemBullets = [
  'Forgetting tasks after meetings, walks, and voice notes?',
  'Too many tools, but no clear picture of what matters today?',
  'Typing and organizing tasks feels like another job?',
]

const solutionBullets = [
  'Speak once and get clean tasks created instantly.',
  'Let AI prioritize your day around meetings, deadlines, and real energy.',
  'Use smart reminders and recaps so important work does not disappear.',
]

const voiceDemoSteps = [
  {
    emoji: '✅',
    title: 'Task created',
    desc: 'PlanCraftAI turns the request into a clean task instead of leaving it as a loose note.',
  },
  {
    emoji: '⏰',
    title: 'Reminder scheduled',
    desc: 'The reminder is placed for tomorrow at 5 so you do not need a second app or follow-up step.',
  },
  {
    emoji: '📅',
    title: 'Calendar-aware',
    desc: 'The planner can fit the task into your day and keep the timing visible alongside meetings.',
  },
]

const conversionHooks = [
  {
    title: 'Capture before you forget',
    desc: 'Voice-first input is faster than opening three apps and hoping you remember later.',
  },
  {
    title: 'See what today actually needs',
    desc: 'The AI daily planner helps you focus on the next few important tasks, not an endless list.',
  },
  {
    title: 'Follow-through without nagging',
    desc: 'Reminders, recaps, and gentle nudges keep work moving without creating more noise.',
  },
]

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
    title: 'Speak tasks naturally',
    desc: 'Use PlanCraftAI as a voice task manager that turns spoken notes into clean tasks, dates, and follow-ups.',
  },
  {
    emoji: '📅',
    title: 'Let AI plan your day',
    desc: 'Build a realistic agenda with calendar-aware priorities instead of sorting through a flat backlog.',
  },
  {
    emoji: '⏰',
    title: 'Get reminders that follow through',
    desc: 'Smart reminders, recaps, and recurring nudges keep promises visible without turning into notification spam.',
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
    desc: 'Start with a clear schedule built around priorities, meetings, and realistic time blocks.',
    href: '/ai-daily-planner',
    ctaLabel: 'See the AI daily planner',
  },
  {
    emoji: '🎤',
    title: 'Voice Task Creation',
    desc: 'Speak naturally, then let PlanCraftAI turn the input into structured tasks, due dates, and reminders.',
    href: '/ai-task-planner',
    ctaLabel: 'See voice task capture',
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
    title: 'Voice Reminder App',
    desc: 'Create reminders from spoken input and follow up across push, WhatsApp, or recap-style nudges.',
    href: '/voice-reminder-app',
    ctaLabel: 'Explore voice reminders',
  },
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
]

const longformIntro =
  'People searching for an AI task planner or AI daily planner are not looking for vague calm. They want a system that captures tasks fast, helps prioritize the day, and makes sure nothing important gets missed.'
const longformSections = [
  {
    eyebrow: 'Capture',
    heading: 'Speak tasks before they disappear',
    description:
      'PlanCraftAI is strongest when work starts as a thought, a meeting note, or a fast voice memo. Spoken input becomes structured tasks without a cleanup session afterward.',
    bullets: [
      'Turn rough speech into clear task names',
      'Pull dates and reminders out of natural language',
      'Keep capture friction low when the day is moving fast',
    ],
    ctaText: 'See the AI task planner',
    ctaHref: '/ai-task-planner',
  },
  {
    eyebrow: 'Prioritize',
    heading: 'Use AI to build a day you can actually finish',
    description:
      'A planner is only useful when it helps you choose. PlanCraftAI looks at your tasks and schedule so today feels realistic instead of overloaded.',
    bullets: [
      'Balance priorities against meetings and time blocks',
      'Highlight the next few actions that matter most',
      'Create a calmer daily plan without losing urgency',
    ],
    ctaText: 'Explore AI daily planning',
    ctaHref: '/ai-daily-planner',
  },
  {
    eyebrow: 'Follow through',
    heading: 'Let smart reminders keep promises visible',
    description:
      'The missing piece in most planners is follow-through. PlanCraftAI pairs tasks with reminders, recaps, and repeat schedules so work does not vanish after capture.',
    bullets: [
      'Voice reminders for tasks you capture on the go',
      'Recurring reminders for routines and repeat commitments',
      'Recaps that help you reset instead of re-open every app',
    ],
    ctaText: 'See the voice reminder app',
    ctaHref: '/voice-reminder-app',
  },
]

const seoLinks = [
  { label: 'All PlanCraft AI features', to: '/features' },
  { label: 'AI task planner for voice capture', to: '/ai-task-planner' },
  { label: 'AI daily planner for realistic schedules', to: '/ai-daily-planner' },
  { label: 'Voice planning and journaling', to: '/voice-planning' },
  { label: 'Voice reminder app for spoken follow-ups', to: '/voice-reminder-app' },
  { label: 'Recurring reminder app for habits and routines', to: '/recurring-reminder-app' },
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
    quote: 'I stopped losing follow-ups after calls because I can just speak them and move on.',
    avatar: 'https://i.pravatar.cc/150?img=47',
    status: 'approved',
  },
  {
    name: 'Michael L.',
    role: 'Ops lead, 12-person team',
    quote: 'The team workspace finally gives us one place for tasks, reminders, and who owns what.',
    avatar: 'https://i.pravatar.cc/150?img=48',
    status: 'approved',
  },
  {
    name: 'Ravi K.',
    role: 'Product, creator tools',
    quote: 'It feels like an AI daily planner that understands real life instead of demanding perfect input.',
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
    'AI daily planner',
    'Voice reminder app',
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
      'PlanCraftAI is an AI task planner and voice reminder app with AI daily planning, calendar sync, recurring reminders, and shared workspaces for teams.',
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
  title: 'PlanCraftAI | AI Task Planner, AI Daily Planner, and Voice Reminder App',
  description:
    'Use PlanCraftAI as an AI task planner and voice reminder app. Speak tasks, plan your day, sync your calendar, and get smart reminders that keep work from slipping.',
  keywords: [
    'PlanCraft AI',
    'AI task planner',
    'AI daily planner',
    'voice reminder app',
    'voice task manager',
    'recurring reminder app',
    'AI productivity app',
    'AI reminders',
    'Workspaces for teams',
    'voice AI reminders for teams',
    'team workspace roles',
    'Google Calendar integration',
  ],
  structuredData,
  pageLabel: 'Landing',
})

function startSoloFlow() {
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem('postLoginRedirect', '/dashboard')
    } catch {
      /* noop */
    }
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
    } catch {
      /* noop */
    }
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
