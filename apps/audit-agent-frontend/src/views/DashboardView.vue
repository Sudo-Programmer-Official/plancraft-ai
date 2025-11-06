<!-- src/views/DashboardView.vue -->
<template>
  <div v-if="checkingAuth" class="px-4 py-8 text-center text-gray-400">
    Checking session…
  </div>
  <SetupPrompt v-else-if="showSetup" @done="showSetup = false" @close="showSetup = false" />
  <main
    v-else
    class="min-h-screen px-2 py-6 sm:px-4 md:px-6 space-y-6 lg:space-y-8 pb-12 transition-colors"
  >
    <GuestBanner :isGuest="authStore.guest" @login="redirectToLogin" />

    <!-- Tier 1 · Overview -->
    <section class="space-y-4">
      <div class="dashboard-section w-full overflow-hidden max-w-full px-2 sm:px-4">
        <div class="dashboard-card greeting-card space-y-4">
          <div>
            <p class="text-xs sm:text-sm uppercase tracking-widest text-indigo-300/80">
              Your companion workspace
            </p>
            <div class="flex flex-wrap items-end gap-2">
              <h1 class="text-2xl sm:text-3xl font-semibold text-slate-100">
                {{ greetingHeadline }}
              </h1>
              <span v-if="dailyTasks.length" class="text-indigo-200/90 text-sm sm:text-base">
                Let’s craft an intentional day.
              </span>
            </div>
          </div>

          <transition-group name="slide" tag="div">
            <div
              v-if="currentInsight"
              :key="currentInsight"
              class="text-indigo-200/90 text-sm sm:text-base max-w-2xl leading-relaxed"
            >
              {{ currentInsight }}
            </div>
          </transition-group>

          <div
            class="now-bar rounded-xl bg-indigo-900/40 border border-indigo-700/40 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
          >
            <div class="flex items-center gap-2 text-slate-200">
              <span class="text-xl">🕐</span>
              <span class="font-medium text-sm sm:text-base">Current Focus</span>
            </div>
            <div class="text-indigo-200 text-sm sm:text-base font-medium">
              {{ currentFocusTask?.title || "All caught up — take a mindful pause." }}
            </div>
          </div>
        </div>
      </div>

      <div
        v-if="carryoverCount > 0 || (usage.plan === 'free' && !isPremium.value) || reactivateEligible"
        class="dashboard-section w-full overflow-hidden max-w-full px-2 sm:px-4"
      >
        <div class="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          <div
            v-if="carryoverCount > 0"
            class="dashboard-banner bg-amber-500/10 border-amber-400/30 text-amber-100 flex items-start justify-between gap-3"
          >
            <div class="flex items-center gap-3">
              <span class="text-xl">🔄</span>
              <div>
                <p class="text-sm sm:text-base font-medium">
                  {{ carryoverCount }} unfinished task{{ carryoverCount === 1 ? '' : 's' }} from today.
                </p>
                <p class="text-xs sm:text-sm opacity-80">
                  Move a few forward so tomorrow starts lighter.
                </p>
              </div>
            </div>
            <div class="flex flex-shrink-0 items-center gap-2">
              <button
                @click="applyCarryover(3)"
                class="px-3 py-1.5 rounded-lg bg-amber-500/90 hover:bg-amber-500 text-slate-900 text-xs font-semibold shadow-sm"
              >
                Move {{ Math.min(3, carryoverCount) }}
              </button>
              <button
                @click="ignoreCarryover()"
                class="px-3 py-1.5 rounded-lg bg-black/40 hover:bg-black/50 text-amber-50 text-xs font-medium"
              >
                Ignore
              </button>
            </div>
          </div>

          <div
            v-if="usage.plan === 'free' && !isPremium.value"
            class="dashboard-banner bg-indigo-600/10 border-indigo-500/40 text-indigo-100 flex items-center justify-between gap-3"
          >
            <div class="flex items-center gap-2">
              <span class="text-xl">🚀</span>
              <p class="text-sm sm:text-base">
                You’ve used {{ usage.used }}/{{ usage.limit }} reminders today.
              </p>
            </div>
            <button
              v-if="!isGuest.value"
              @click="goToUpgrade"
              class="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
            >
              Upgrade
            </button>
            <RouterLink
              v-else
              to="/login"
              class="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
            >
              🔑 Sign in
            </RouterLink>
          </div>

          <div
            v-if="reactivateEligible"
            class="dashboard-banner bg-yellow-500/10 border-yellow-400/30 text-yellow-50 flex items-start gap-3"
          >
            <span class="text-xl">🔁</span>
            <div class="flex-1 space-y-1">
              <p class="font-medium text-sm sm:text-base">
                Premium until {{ cancelAtFmt }}
                <span v-if="daysLeft > 0">
                  ({{ daysLeft }} day{{ daysLeft === 1 ? '' : 's' }} left)
                </span>
              </p>
              <p class="text-xs sm:text-sm opacity-80">
                Reactivate instantly to keep all pro automations and reminders.
              </p>
            </div>
            <button
              @click="onReactivate"
              class="px-3 py-1.5 rounded-lg bg-black/30 hover:bg-black/45 text-yellow-50 text-xs font-semibold"
            >
              Reactivate
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Tier 2 · Workspaces -->
    <section class="grid grid-cols-1 gap-4 lg:gap-6 md:grid-cols-2 xl:grid-cols-5">
      <div
        v-if="showDaily"
        class="dashboard-section w-full overflow-hidden max-w-full px-2 sm:px-4 xl:col-span-3"
      >
        <div class="dashboard-card daily-card space-y-5">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 class="text-lg sm:text-xl font-semibold text-slate-100">
                📅 Today’s Focus
              </h3>
              <p class="text-xs sm:text-sm text-indigo-200/80">
                Prioritise, drag, and complete your most important work.
              </p>
            </div>
            <button
              @click="openPlanner"
              class="inline-flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg text-white bg-gradient-to-r from-pink-500 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 shadow-md transition"
            >
              <span class="text-base">＋</span>
              Plan New Task
            </button>
          </div>

          <div class="flex gap-2 sm:gap-3 overflow-x-auto pb-2 scrollbar-plan">
            <button
              v-for="category in categoryFilters"
              :key="category"
              type="button"
              @click="dashboardCategory = category"
              :class="[
                'flex-shrink-0 px-3 py-1.5 rounded-lg font-medium text-xs transition-all duration-300 ease-in-out',
                dashboardCategory === category
                  ? 'bg-indigo-700 text-white shadow-[0_0_14px_rgba(99,102,241,0.5)]'
                  : 'bg-slate-800/70 text-slate-300 hover:bg-slate-700/80',
              ]"
            >
              <span class="mr-1 text-base leading-none">{{ categoryIcon(category) }}</span>
              {{ category }}
            </button>
          </div>

          <div class="space-y-3">
            <div class="progress-card bg-slate-900/50 border border-slate-700/40 rounded-xl px-4 py-3">
              <div class="flex items-center justify-between text-xs sm:text-sm text-slate-300 mb-2">
                <span>Completion</span>
                <span>{{ dailyProgress }}%</span>
              </div>
              <div class="h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  class="h-full rounded-full bg-gradient-to-r from-indigo-400 via-indigo-500 to-emerald-400 transition-all"
                  :style="{ width: `${dailyProgress}%` }"
                ></div>
              </div>
            </div>

            <div
              v-if="filteredDaily.length"
              ref="dailyList"
              class="overflow-y-auto max-h-[60vh] md:max-h-64 scrollbar-plan rounded-2xl pr-1"
            >
              <ul class="space-y-2 text-sm">
                <li
                  v-for="task in filteredDaily"
                  :key="task.id"
                  class="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/70 border border-slate-800/80 hover:border-indigo-500/40 transition"
                >
                  <div class="flex flex-1 items-start gap-3">
                    <input
                      type="checkbox"
                      :checked="task.completed"
                      @change="() => toggleComplete(task)"
                      class="mt-0.5 w-4 h-4 cursor-pointer accent-indigo-500"
                    />
                    <div class="flex-1 space-y-1">
                      <div class="flex flex-wrap items-center gap-2">
                        <span
                          class="font-medium"
                          :class="{ 'line-through text-slate-500': task.completed, 'text-slate-100': !task.completed }"
                        >
                          {{ task.title }}
                        </span>
                        <div
                          class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800/80 text-[11px] font-medium shadow-sm"
                          :class="categoryColor(task.category)"
                        >
                          <span class="leading-none">{{ categoryIcon(task.category) }}</span>
                          <span>{{ categoryLabel(task.category) }}</span>
                        </div>
                      </div>
                      <small class="text-slate-400 text-xs">{{ task.date }}</small>
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <button
                      v-if="reminderActiveByTask[task.id]"
                      @click.stop="onReminderClick(task)"
                      class="text-yellow-400 hover:opacity-80 text-lg"
                      title="Reminder active — click to manage"
                    >
                      🔔
                    </button>
                    <button
                      @click.stop="openDialog(task)"
                      class="text-slate-300 hover:text-indigo-300 text-sm"
                      title="Edit Task"
                    >
                      ✏️
                    </button>
                  </div>
                </li>
              </ul>
            </div>

            <p v-else class="text-slate-400 text-sm">
              {{ dashboardCategory === 'All' ? 'No tasks today.' : 'No tasks in this category yet.' }}
            </p>
          </div>

          <TaskPlannerDialog
            v-if="showPlanner"
            :open="showPlanner"
            :date="selectedDate"
            :task="selectedTask"
            :edit-mode="!!selectedTask"
            @close="closePlanner"
            @saved="handleSaveAndSchedule"
          />
        </div>
      </div>

      <div
        v-if="showWeekly"
        class="dashboard-section w-full overflow-hidden max-w-full px-2 sm:px-4 xl:col-span-2"
      >
        <div class="dashboard-card weekly-card space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 class="text-lg sm:text-xl font-semibold text-slate-100">📆 This Week’s Horizon</h3>
              <p class="text-xs sm:text-sm text-indigo-200/80">
                Track steady progress toward your broader goals.
              </p>
            </div>
            <router-link
              to="/weekly"
              class="text-xs px-3 py-1.5 rounded-lg font-semibold bg-gradient-to-r from-pink-500 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 text-white shadow-sm transition"
            >
              Weekly view →
            </router-link>
          </div>

          <div class="progress-card bg-slate-900/50 border border-slate-700/40 rounded-xl px-4 py-3">
            <div class="flex items-center justify-between text-xs sm:text-sm text-slate-300 mb-2">
              <span>Completion</span>
              <span>{{ weeklyProgress }}%</span>
            </div>
            <div class="h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                class="h-full rounded-full bg-gradient-to-r from-emerald-300 via-emerald-400 to-indigo-500 transition-all"
                :style="{ width: `${weeklyProgress}%` }"
              ></div>
            </div>
          </div>
          <p class="text-xs text-slate-300">
            {{ doneWeekly }}/{{ weeklyTasks.length }} completed this week
          </p>

          <div
            v-if="filteredWeeklyPreview.length"
            class="overflow-y-auto max-h-[60vh] md:max-h-56 scrollbar-plan rounded-2xl pr-1"
          >
            <ul class="space-y-2 text-sm">
              <li
                v-for="task in filteredWeeklyPreview"
                :key="task.id"
                class="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80 hover:border-indigo-500/40 transition flex justify-between items-start gap-3"
              >
                <div class="space-y-1">
                  <div class="flex flex-wrap items-center gap-2">
                    <span :class="{ 'line-through text-slate-500': task.completed, 'text-white': !task.completed }">
                      {{ task.title }}
                    </span>
                    <div
                      class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800/80 text-[11px] font-medium shadow-sm"
                      :class="categoryColor(task.category)"
                    >
                      <span class="leading-none">{{ categoryIcon(task.category) }}</span>
                      <span>{{ categoryLabel(task.category) }}</span>
                    </div>
                  </div>
                  <small class="text-slate-400 text-xs">{{ task.date }}</small>
                </div>
              </li>
            </ul>
          </div>
          <p v-else class="text-slate-400 text-sm">
            {{ dashboardCategory === 'All' ? 'No weekly tasks yet.' : 'No weekly tasks in this category.' }}
          </p>
        </div>
      </div>

      <div
        v-if="showQuickLinks"
        class="dashboard-section w-full overflow-hidden max-w-full px-2 sm:px-4 xl:col-span-2"
      >
        <div class="dashboard-card quick-links-card">
          <QuickLinksCard />
        </div>
      </div>

      <div
        v-if="showMonthly"
        class="dashboard-section w-full overflow-hidden max-w-full px-2 sm:px-4 xl:col-span-3"
      >
        <div class="dashboard-card monthly-card space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 class="text-lg sm:text-xl font-semibold text-slate-100">🌙 Monthly Momentum</h3>
              <p class="text-xs sm:text-sm text-indigo-200/80">
                Keep an eye on long-run commitments and rituals.
              </p>
            </div>
            <router-link
              to="/monthly"
              class="text-xs px-3 py-1.5 rounded-lg font-semibold bg-gradient-to-r from-pink-500 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 text-white shadow-sm transition"
            >
              Monthly view →
            </router-link>
          </div>
          <div class="space-y-2">
            <p class="text-sm text-slate-300">
              {{ doneMonthly }}/{{ monthlyTasks.length }} completed this month
            </p>
            <div class="h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                class="h-full rounded-full bg-gradient-to-r from-indigo-500 via-blue-500 to-purple-500 transition-all"
                :style="{ width: progressBarWidth }"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Tier 3 · Analytics & Insights -->
    <section class="grid grid-cols-1 gap-4 lg:gap-6 lg:grid-cols-2">
      <div
        v-if="showJournal"
        class="dashboard-section w-full overflow-hidden max-w-full px-2 sm:px-4"
      >
        <div class="dashboard-card journal-card space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <h3 class="text-lg sm:text-xl font-semibold text-slate-100">📖 Journal Snapshot</h3>
            <div class="flex items-center gap-2">
              <router-link
                to="/reports"
                class="text-indigo-300 hover:text-indigo-100 text-xs font-semibold"
              >
                Reports →
              </router-link>
              <router-link
                to="/journal"
                class="inline-flex items-center text-xs px-3 py-1.5 rounded-lg font-semibold bg-gradient-to-r from-pink-500 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 text-white shadow-sm transition"
              >
                Open Journal
              </router-link>
            </div>
          </div>
          <div v-if="journalLogs.length" class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm sm:text-base">
            <div class="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80 text-center space-y-1">
              <p class="text-2xl">🔥</p>
              <p class="font-medium" :class="{ 'animate-pulse': displayStreak >= 1 }">
                {{ displayStreak }}-day streak
              </p>
            </div>
            <div class="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80 text-center space-y-1">
              <p class="text-2xl">{{ journalLogs[0].mood?.emoji || "📝" }}</p>
              <p class="font-medium">Last Mood</p>
            </div>
            <div class="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80 text-center space-y-1">
              <p class="text-2xl">📒</p>
              <p class="font-medium">{{ journalLogs.length }} reflections</p>
            </div>
          </div>
          <p v-else class="text-slate-400 text-sm">No reflections yet. Start journaling today!</p>
        </div>
      </div>

      <div
        v-if="showAIInsights"
        class="dashboard-section w-full overflow-hidden max-w-full px-2 sm:px-4"
      >
        <div class="dashboard-card ai-card space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-lg sm:text-xl font-semibold text-slate-100 flex items-center gap-2">
              🤖 AI Insights
            </h3>
            <router-link to="/reports" class="text-indigo-300 hover:text-indigo-100 text-xs font-semibold">
              View all →
            </router-link>
          </div>
          <div v-if="aiSummary" class="space-y-4">
            <div class="flex justify-between items-center text-xs sm:text-sm text-slate-300">
              <span>✅ Completed {{ aiSummary.completedPct }}%</span>
              <span>📌 Pending {{ aiSummary.pending }}</span>
            </div>

            <div
              v-if="aiSummary.focus"
              class="rounded-xl border border-indigo-600/50 bg-gradient-to-br from-indigo-900/60 via-indigo-900/40 to-slate-900/50 px-4 py-3 text-sm text-slate-200"
            >
              <strong class="text-indigo-200">🎯 Focus:</strong> {{ aiSummary.focus }}
            </div>

            <div class="grid gap-3 sm:grid-cols-2">
              <div
                class="insight-card bg-gradient-to-br from-emerald-700/50 via-emerald-800/40 to-slate-900/70 border border-emerald-400/40 rounded-2xl px-4 py-3 text-sm text-emerald-100 space-y-2"
              >
                <div class="flex items-center justify-between">
                  <span class="font-semibold">⚡ Quick Wins</span>
                  <span class="text-xs opacity-80">{{ aiSummary.quickWins.length }}</span>
                </div>
                <ul v-if="aiSummary.quickWins.length" class="space-y-1 text-emerald-50/90 text-sm leading-relaxed">
                  <li v-for="(item, index) in aiSummary.quickWins" :key="`quick-${index}`">• {{ item }}</li>
                </ul>
                <p v-else class="text-xs text-emerald-100/70">Add a couple of five‑minute tasks.</p>
              </div>

              <div
                class="insight-card bg-gradient-to-br from-amber-700/50 via-orange-800/40 to-slate-900/70 border border-amber-400/40 rounded-2xl px-4 py-3 text-sm text-amber-100 space-y-2"
              >
                <div class="flex items-center justify-between">
                  <span class="font-semibold">🏋 Heavy Lifts</span>
                  <span class="text-xs opacity-80">{{ aiSummary.heavyLifts.length }}</span>
                </div>
                <ul v-if="aiSummary.heavyLifts.length" class="space-y-1 text-amber-50/90 text-sm leading-relaxed">
                  <li v-for="(item, index) in aiSummary.heavyLifts" :key="`heavy-${index}`">• {{ item }}</li>
                </ul>
                <p v-else class="text-xs text-amber-100/70">No heavy lifts queued — plan one big next step.</p>
              </div>

              <div
                class="insight-card sm:col-span-2 bg-gradient-to-br from-rose-700/40 via-red-800/40 to-slate-900/70 border border-rose-400/40 rounded-2xl px-4 py-3 text-sm text-rose-100 space-y-2"
              >
                <div class="flex items-center gap-2">
                  <span class="text-lg">🚨</span>
                  <span class="font-semibold">Weekly Watch</span>
                </div>
                <p v-if="aiSummary.weeklyWarning" class="text-rose-50/80 leading-relaxed">
                  {{ aiSummary.weeklyWarning }}
                </p>
                <p v-else class="text-xs text-rose-100/70">
                  Looking balanced. Keep checking in with your planner.
                </p>
              </div>
            </div>
          </div>
          <p v-else class="text-slate-400 text-sm">Fetching AI insights…</p>
        </div>
      </div>

      <div class="dashboard-section w-full overflow-hidden max-w-full px-2 sm:px-4 lg:col-span-2">
        <div class="dashboard-card report-card space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center gap-2">
              <span class="text-xl">📊</span>
              <div>
                <h3 class="text-lg sm:text-xl font-semibold text-slate-100">
                  Reports Snapshot
                </h3>
                <p class="text-xs sm:text-sm text-indigo-200/80">
                  Keep tabs on performance, pacing, and focus trends.
                </p>
              </div>
            </div>
            <div class="flex flex-wrap gap-2">
              <button
                @click="onGenerateWeekly"
                :disabled="generatingWeekly || generatingMonthly"
                class="px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition"
              >
                Generate Weekly
              </button>
              <button
                @click="onGenerateMonthly"
                :disabled="generatingWeekly || generatingMonthly"
                class="px-3 py-1.5 rounded-lg bg-gradient-to-r from-fuchsia-600 to-purple-700 hover:from-fuchsia-500 hover:to-purple-600 disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition"
              >
                Generate Monthly
              </button>
              <router-link
                to="/reports"
                class="text-xs px-3 py-1.5 rounded-lg bg-transparent border border-indigo-600/60 text-indigo-200 hover:bg-indigo-600/20 font-semibold transition"
              >
                Open →
              </router-link>
            </div>
          </div>

          <div v-if="latestReport" class="space-y-4">
            <div class="text-sm sm:text-base text-indigo-200/80 flex flex-wrap gap-2">
              <span class="font-medium uppercase tracking-wide text-indigo-300">
                {{ latestReport.period?.toUpperCase?.() || latestReport.period }}
              </span>
              <span>•</span>
              <span>{{ latestReport.start }} → {{ latestReport.end }}</span>
            </div>

            <div class="flex flex-wrap items-center gap-4">
              <div class="flex items-center gap-1">
                <span class="text-emerald-400 font-semibold text-lg">
                  {{ latestReport.metrics?.totalCompleted || 0 }}
                </span>
                <span class="text-sm text-slate-300">completed</span>
              </div>
              <div class="flex items-center gap-1">
                <span class="hidden sm:block text-slate-500">•</span>
              </div>
              <div class="flex items-center gap-1">
                <span class="text-slate-100 font-semibold text-lg">
                  {{ latestReport.metrics?.totalTasks || 0 }}
                </span>
                <span class="text-sm text-slate-300">total</span>
              </div>
            </div>

            <canvas
              ref="sparklineCanvas"
              width="220"
              height="48"
              class="w-full h-14 opacity-90"
            ></canvas>

            <div class="flex flex-wrap gap-3">
              <a
                v-if="latestReport.urls?.html"
                :href="latestReport.urls.html"
                target="_blank"
                class="px-4 py-2 rounded-lg bg-indigo-700 hover:bg-indigo-600 text-white text-xs sm:text-sm font-medium shadow-sm transition"
              >
                View HTML
              </a>
              <a
                v-if="latestReport.urls?.pdf"
                :href="latestReport.urls.pdf"
                target="_blank"
                class="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs sm:text-sm font-medium shadow-sm transition"
              >
                Download PDF
              </a>
            </div>
          </div>

          <div v-else class="text-center text-sm text-indigo-200/70 space-y-2">
            <p>No reports yet.</p>
            <router-link
              to="/reports"
              class="text-indigo-300 hover:text-indigo-100 font-semibold"
            >
              Generate one to see your progress ✨
            </router-link>
          </div>
        </div>
      </div>
    </section>

    <!-- Tier 4 · AI Quick Actions -->
    <section class="dashboard-section w-full overflow-hidden max-w-full px-2 sm:px-4">
      <div class="dashboard-card flex flex-col items-center gap-4 text-center">
        <h3 class="text-base sm:text-lg font-semibold text-slate-100">✨ AI Quick Actions</h3>
        <p class="text-xs sm:text-sm text-indigo-200/80 max-w-2xl">
          Give your assistant a gentle nudge — reflect, plan, or dive deeper into insights.
        </p>
        <div class="flex flex-wrap justify-center gap-3">
          <button
            @click="triggerSummary"
            :disabled="isRefreshingSummary"
            class="action-chip bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-400 hover:via-purple-400 hover:to-pink-400 text-white disabled:opacity-60"
          >
            <span class="text-lg">🧠</span>
            <span>{{ isRefreshingSummary ? 'Refreshing summary…' : 'Generate Summary' }}</span>
          </button>
          <RouterLink
            to="/talk-to-planner"
            class="action-chip bg-transparent border border-indigo-400/60 text-indigo-200 hover:bg-indigo-500/10"
          >
            <span class="text-lg">💬</span>
            <span>Talk to Planner</span>
          </RouterLink>
          <button
            @click="goToProgress"
            class="action-chip bg-transparent border border-slate-500/60 text-slate-200 hover:bg-slate-500/10"
          >
            <span class="text-lg">📊</span>
            <span>View Progress</span>
          </button>
        </div>
      </div>
    </section>
  </main>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watchEffect, watch } from 'vue'
import { useRouter } from 'vue-router'
import { collection, onSnapshot, updateDoc, doc, query, where, serverTimestamp } from 'firebase/firestore'
import { db, auth } from '@/firebase/init'
import { onAuthStateChanged } from 'firebase/auth'
import { toLocalDateKey } from '@/utils/dateHelper'
import { summarizeTasks } from '@/services/aiService'
import GuestBanner from '@/components/GuestBanner.vue'
import { useAuthStore } from '@/stores/authStore'
import TaskPlannerDialog from '@/components/TaskPlannerDialog.vue'
import { useTasks } from '@/composables/useTasks'
import { addTaskToFirebase, updateTaskInFirebase, fetchEntries } from '@/services/firebaseService'
import QuickLinksCard from '@/components/QuickLinksCard.vue'
import SetupPrompt from '@/components/SetupPrompt.vue'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import { useSubscriptionStore } from '@/stores/subscriptionStore'
import { reactivateSubscription } from '@/services/stripeService'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { useAuthFlags } from '@/composables/useAuthFlags'
import { trackLinkedInConversion } from '@/utils/ads'
import { getReminderStatus, scheduleReminder } from '@/services/reminderService'
import { listReports, generateReport } from '@/services/reportsService'
import api from '@/services/api'
import { getPreferences as getUserPreferences } from '@/services/settingsService'
import { ElMessage, ElNotification } from 'element-plus'
import { TASK_CATEGORY_FILTERS, getCategoryIcon, getCategoryColor, resolveCategory } from '@/constants/taskCategories'
import { ensureDailyStreakState, getUserStreak } from '@/services/streakService'

dayjs.extend(utc)
dayjs.extend(timezone)

const authStore = useAuthStore()
const { isPremium, isGuest } = useAuthFlags()
const routerNav = useRouter()
const subStore = useSubscriptionStore()

const daysLeft = computed(() => {
  const d = subStore.subscription?.cancelAt
  return d ? Math.max(0, dayjs(d).diff(dayjs(), 'day')) : 0
})
const reactivateEligible = computed(() => {
  const status = String(subStore.subscription?.status || '').toLowerCase()
  const hasCancelAt = !!subStore.subscription?.cancelAt
  if (!hasCancelAt) return false
  const remaining = daysLeft.value
  if (remaining > 7) return false
  return status === 'canceled' || status === 'active'
})
const cancelAtFmt = computed(() =>
  subStore.subscription?.cancelAt ? dayjs(subStore.subscription.cancelAt).format('MMM D, YYYY') : ''
)

// UI toggles
const showDaily = ref(true)
const showQuickLinks = ref(true)
const showWeekly = ref(true)
const showMonthly = ref(true)
const showJournal = ref(true)
const showAIInsights = ref(true)

// Usage meter (free plan)
const usage = ref({ used: 0, limit: 0, plan: '' })
async function fetchUsage() {
  try {
    const uid = auth?.currentUser?.uid || localStorage.getItem('uid')
    if (!uid) return
    const { data } = await api.get('/reminders/usage', { params: { userId: uid } })
    if (data?.success) usage.value = { used: data.used || 0, limit: data.limit || 0, plan: data.plan || '' }
  } catch {
    /* noop */
  }
}

function goToUpgrade() {
  try {
    trackLinkedInConversion(import.meta.env.VITE_LI_CONV_UPGRADE_CLICK)
  } catch {
    /* noop */
  }
  try {
    if (isGuest.value) return routerNav.push('/login')
    routerNav.push('/pricing')
  } catch {
    /* noop */
  }
}

/* -------------- Tasks + Journal state -------------- */
const { loadTasks } = useTasks()
const aiSummary = ref(null)
const dailyTasks = ref([])
const weeklyTasks = ref([])
const monthlyTasks = ref([])
const showPlanner = ref(false)
const selectedTask = ref(null)
const dailyList = ref(null)
const journalLogs = ref([])
const carryoverCount = ref(0)
const latestReport = ref(null)
const generatingWeekly = ref(false)
const generatingMonthly = ref(false)
const sparklineCanvas = ref(null)
const categoryFilters = TASK_CATEGORY_FILTERS
const dashboardCategory = ref('All')

const showSetup = ref(false)
const reminderActiveByTask = ref({})
const checkingAuth = ref(true)
const userPrefs = ref({ notifications: {}, integrations: {} })

// Animated insights
const defaultInsights = [
  '✨ Add a quick win to kickstart your momentum.',
  '🧘 Take a mindful breather between meetings.',
  '📅 Ask me to plan tomorrow before 10 PM.',
  '💡 Pin your favourite sites with Quick Links for instant access.',
]
const rotatingInsights = ref([...defaultInsights])
const currentInsight = ref(defaultInsights[0])
const insightIndex = ref(0)
const insightIntervalId = ref(null)
const isRefreshingSummary = ref(false)

// Greeting headline
const displayName = computed(() => {
  const full = authStore?.user?.displayName?.trim()
  if (full) return full.split(' ')[0]
  const email = authStore?.user?.email
  if (email && email.includes('@')) return email.split('@')[0]
  return 'friend'
})

const greetingHeadline = computed(() => {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  const hour = dayjs().tz(tz).hour()
  let prefix = 'Good evening'
  if (hour < 4) prefix = 'Rest well'
  else if (hour < 12) prefix = 'Good morning'
  else if (hour < 17) prefix = 'Good afternoon'
  return `${prefix}, ${displayName.value}`
})

const journalStreak = computed(() => {
  if (!journalLogs.value.length) return 0
  const dates = journalLogs.value
    .map((l) => l.date)
    .filter(Boolean)
    .sort((a, b) => new Date(b) - new Date(a))

  let count = 1
  for (let i = 1; i < dates.length; i += 1) {
    const prev = new Date(dates[i - 1])
    const curr = new Date(dates[i])
    const diff = (prev - curr) / (1000 * 60 * 60 * 24)
    if (diff === 1) count += 1
    else break
  }
  return count
})

const userStreak = ref(0)
const displayStreak = computed(() => userStreak.value || journalStreak.value || 0)

const sortedDaily = computed(() =>
  [...dailyTasks.value].sort((a, b) =>
    a.completed !== b.completed ? a.completed - b.completed : (b.createdAt || 0) - (a.createdAt || 0)
  )
)

const dailyProgress = computed(() => {
  const total = dailyTasks.value.length
  if (!total) return 0
  const completed = dailyTasks.value.filter((t) => t.completed).length
  return Math.round((completed / total) * 100)
})

const weeklyProgress = computed(() => {
  const total = weeklyTasks.value.length
  if (!total) return 0
  const completed = weeklyTasks.value.filter((t) => t.completed).length
  return Math.round((completed / total) * 100)
})

const currentFocusTask = computed(() => {
  const dailyCandidate = sortedDaily.value.find((t) => !t.completed)
  if (dailyCandidate) return dailyCandidate
  const weeklyCandidate = weeklyTasks.value.find((t) => !t.completed)
  if (weeklyCandidate) return weeklyCandidate
  return monthlyTasks.value.find((t) => !t.completed) || null
})

const filteredDaily = computed(() => {
  if (dashboardCategory.value === 'All') return sortedDaily.value
  return sortedDaily.value.filter((task) => resolveCategory(task?.category) === dashboardCategory.value)
})

const filteredWeeklyPreview = computed(() => {
  const base =
    dashboardCategory.value === 'All'
      ? weeklyTasks.value
      : weeklyTasks.value.filter((task) => resolveCategory(task?.category) === dashboardCategory.value)
  return base.slice(0, 5)
})

const doneWeekly = computed(() => weeklyTasks.value.filter((t) => t.completed).length)
const doneMonthly = computed(() => monthlyTasks.value.filter((t) => t.completed).length)

const progressBarWidth = computed(() => {
  const total = monthlyTasks.value.length || 1
  const done = monthlyTasks.value.filter((t) => t.completed).length
  return `${Math.round((done / total) * 100)}%`
})

function categoryIcon(value) {
  return getCategoryIcon(value)
}
function categoryColor(value) {
  return getCategoryColor(value)
}
function categoryLabel(value) {
  return resolveCategory(value)
}

async function toggleComplete(task) {
  task.completed = !task.completed
  const patch = { completed: task.completed }
  if (task.completed) patch.completedAt = serverTimestamp()
  else patch.completedAt = null
  try {
    await updateDoc(doc(db, 'tasks', task.id), patch)
  } catch (error) {
    console.warn('Failed to toggle complete:', error)
  }
}

function rotateInsightsOnce() {
  if (!rotatingInsights.value.length) return
  insightIndex.value = (insightIndex.value + 1) % rotatingInsights.value.length
  currentInsight.value = rotatingInsights.value[insightIndex.value]
}

function restartInsightRotation() {
  if (insightIntervalId.value) {
    clearInterval(insightIntervalId.value)
    insightIntervalId.value = null
  }
  if (typeof window === 'undefined' || rotatingInsights.value.length <= 1) return
  insightIntervalId.value = window.setInterval(rotateInsightsOnce, 6000)
}

function buildRotatingInsights() {
  const messages = []
  const pendingToday = dailyTasks.value.filter((t) => !t.completed).length
  if (pendingToday) {
    messages.push(
      `✨ ${pendingToday} task${pendingToday === 1 ? '' : 's'} ready for today — pick one to start strong.`
    )
  }
  const focus = currentFocusTask.value
  if (focus) {
    messages.push(`🕐 Next up: “${focus.title}”. Want me to set a reminder?`)
  }
  if (aiSummary.value?.quickWins?.length) {
    messages.push(`⚡ Quick win: ${aiSummary.value.quickWins[0]}`)
  }
  const dominantCategory = (() => {
    const counts = dailyTasks.value.reduce((acc, task) => {
      const key = resolveCategory(task?.category)
      if (!task.completed) acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})
    const sorted = Object.entries(counts)
      .filter(([key]) => key !== 'Uncategorized')
      .sort((a, b) => b[1] - a[1])
    return sorted.length ? sorted[0][0] : null
  })()
  if (dominantCategory) {
    messages.push(`💼 ${dominantCategory} is trending today. Need help breaking it down?`)
  }
  if (usage.value.plan === 'free' && !isPremium.value) {
    messages.push('🚀 Upgrade to unlock unlimited reminders and smart automations.')
  }
  rotatingInsights.value = messages.length ? messages : [...defaultInsights]
  insightIndex.value = 0
  currentInsight.value = rotatingInsights.value[0] || ''
  restartInsightRotation()
}

const today = new Date()
const selectedDate = toLocalDateKey(today)

function toYMD(date) {
  if (typeof date === 'string') return date
  return toLocalDateKey(date)
}

async function triggerSummary() {
  if (isRefreshingSummary.value) return
  try {
    isRefreshingSummary.value = true
    await fetchAISummary()
    ElMessage({ type: 'success', message: 'Summary refreshed', duration: 1500 })
  } catch (error) {
    console.warn('Summary refresh failed:', error)
    ElMessage({ type: 'error', message: 'Unable to refresh summary', duration: 1800 })
  } finally {
    isRefreshingSummary.value = false
  }
}

function goToProgress() {
  routerNav.push('/reports')
}

onMounted(async () => {
  try {
    const seen = localStorage.getItem('pcai_setup_done') === '1'
    const tz = localStorage.getItem('user_timezone')
    const needsTz = !tz || tz === 'UTC'
    const needsPerm = typeof Notification !== 'undefined' && Notification.permission !== 'granted'
    showSetup.value = !seen && (needsTz || needsPerm)
  } catch {
    /* noop */
  }

  journalLogs.value = await fetchEntries()
  try {
    const items = await listReports(1)
    latestReport.value = Array.isArray(items) ? items[0] : null
  } catch {
    latestReport.value = null
  }

  try {
    const now = new Date()
    const hours = now.getHours()
    const todayKey = toLocalDateKey(now)
    const hasToday = Array.isArray(journalLogs.value) && journalLogs.value.some((entry) => entry?.date === todayKey)
    const nudged = localStorage.getItem('streak_nudge_today') === todayKey
    if (hours >= 22 && !hasToday && !nudged) {
      ElNotification({
        title: 'Keep the streak alive ✨',
        message: 'Log a quick reflection before midnight to maintain your streak.',
        type: 'info',
        duration: 5000,
        offset: 80,
      })
      try {
        localStorage.setItem('streak_nudge_today', todayKey)
      } catch {
        /* noop */
      }
    }
  } catch {
    /* noop */
  }

  buildRotatingInsights()
})

async function onGenerateWeekly() {
  if (generatingWeekly.value) return
  generatingWeekly.value = true
  try {
    await generateReport('weekly', false)
    ElMessage({ type: 'success', message: 'Weekly report generated', duration: 1500 })
    try {
      const items = await listReports(1)
      latestReport.value = Array.isArray(items) ? items[0] : null
    } catch {
      /* noop */
    }
    drawSparkline()
  } catch (error) {
    console.warn('Weekly report generation failed:', error)
    ElMessage({ type: 'error', message: 'Failed to generate report', duration: 2000 })
  } finally {
    generatingWeekly.value = false
  }
}

async function onGenerateMonthly() {
  if (generatingMonthly.value) return
  generatingMonthly.value = true
  try {
    await generateReport('monthly', false)
    ElMessage({ type: 'success', message: 'Monthly report generated', duration: 1500 })
    try {
      const items = await listReports(1)
      latestReport.value = Array.isArray(items) ? items[0] : null
    } catch {
      /* noop */
    }
    drawSparkline()
  } catch (error) {
    console.warn('Monthly report generation failed:', error)
    ElMessage({ type: 'error', message: 'Failed to generate report', duration: 2000 })
  } finally {
    generatingMonthly.value = false
  }
}

function getLast7DaysYMD() {
  const out = []
  const d = new Date()
  for (let i = 6; i >= 0; i -= 1) {
    const dd = new Date(d)
    dd.setDate(d.getDate() - i)
    out.push(toLocalDateKey(dd))
  }
  return out
}

function drawSparkline() {
  try {
    const el = sparklineCanvas.value
    if (!el) return
    const ctx = el.getContext('2d')
    const w = el.width
    const h = el.height
    ctx.clearRect(0, 0, w, h)
    const days = getLast7DaysYMD()
    const all = [...weeklyTasks.value, ...dailyTasks.value]
    const counts = days.map((ymd) => all.filter((t) => t.date === ymd && t.completed).length)
    const max = Math.max(1, ...counts)
    const stepX = w / (counts.length - 1)
    ctx.beginPath()
    ctx.strokeStyle = '#6366f1'
    ctx.lineWidth = 2
    counts.forEach((v, i) => {
      const x = i * stepX
      const y = h - (v / max) * (h - 6) - 3
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.stroke()
    const grad = ctx.createLinearGradient(0, 0, 0, h)
    grad.addColorStop(0, 'rgba(99,102,241,0.35)')
    grad.addColorStop(1, 'rgba(99,102,241,0.00)')
    ctx.lineTo(w, h)
    ctx.lineTo(0, h)
    ctx.closePath()
    ctx.fillStyle = grad
    ctx.fill()
  } catch {
    /* noop */
  }
}

watch(
  () => weeklyTasks.value.map((t) => `${t.date}:${t.completed}`).join(','),
  () => {
    drawSparkline()
  }
)

watch(
  () => dailyTasks.value.map((t) => `${t.date}:${t.completed}`).join(','),
  () => {
    drawSparkline()
  }
)

function startTour() {
  const tour = driver({
    animate: true,
    showProgress: true,
    steps: [
      {
        element: '.daily-card',
        popover: {
          title: '📅 Daily Tasks',
          description: 'Plan and track your tasks for today here.',
          position: 'bottom',
        },
      },
      {
        element: '.quick-links-card',
        popover: {
          title: '🔗 Quick Links',
          description: 'Save your frequently used websites or tools here.',
          position: 'bottom',
        },
      },
      {
        element: '.weekly-card',
        popover: {
          title: '📆 Weekly Overview',
          description: 'See what you’ve completed this week and upcoming tasks.',
          position: 'left',
        },
      },
      {
        element: '.monthly-card',
        popover: {
          title: '🌙 Monthly Goals',
          description: 'Track your long-term goals and progress here.',
          position: 'left',
        },
      },
      {
        element: '.journal-card',
        popover: {
          title: '📖 Journal Snapshot',
          description: 'Reflect daily and track your mood & streaks.',
          position: 'top',
        },
      },
      {
        element: '.ai-card',
        popover: {
          title: '🤖 AI Insights',
          description: 'AI analyzes your tasks and provides smart suggestions.',
          position: 'top',
        },
      },
    ],
  })
  tour.drive()
}

onMounted(() => {
  const hasSeenTour = localStorage.getItem('seenTour')
  if (!hasSeenTour) {
    setTimeout(() => {
      startTour()
      localStorage.setItem('seenTour', 'true')
    }, 800)
  }
})

function openPlanner() {
  selectedTask.value = null
  showPlanner.value = true
}

function openDialog(task) {
  selectedTask.value = task
  showPlanner.value = true
}

function closePlanner() {
  showPlanner.value = false
  selectedTask.value = null
}

function reloadDaily() {
  return loadTasks()
}

async function handleSave(payload) {
  if (Array.isArray(payload)) {
    await loadTasks()
    return reloadDaily()
  }
  if (payload.id) {
    await updateTaskInFirebase(payload)
  } else {
    const saved = await addTaskToFirebase(payload)
    payload.id = saved.id
    if (saved?.__notifyMeta) payload.__notifyMeta = saved.__notifyMeta
  }
  await reloadDaily()
  closePlanner()
  await nextTick()
  if (dailyList.value) dailyList.value.scrollTop = 0
}

function ymdRange(start, end) {
  const days = []
  const d = new Date(start)
  while (d <= end) {
    days.push(toYMD(d))
    d.setDate(d.getDate() + 1)
  }
  return days
}

const startOfWeek = new Date(today)
startOfWeek.setDate(today.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1))
startOfWeek.setHours(0, 0, 0, 0)
const endOfWeek = new Date(startOfWeek)
endOfWeek.setDate(startOfWeek.getDate() + 6)
const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)

const unsubscribe = ref(null)

onMounted(() => {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      dailyTasks.value = []
      weeklyTasks.value = []
      monthlyTasks.value = []
      if (unsubscribe.value) unsubscribe.value()
      return
    }
    const tasksQuery = query(collection(db, 'tasks'), where('userId', '==', user.uid))
    if (unsubscribe.value) unsubscribe.value()
    try {
      unsubscribe.value = onSnapshot(tasksQuery, (snapshot) => {
        const userTasks = snapshot.docs.map((docSnap) => {
          const data = docSnap.data()
          return {
            id: docSnap.id,
            ...data,
            category: resolveCategory(data?.category),
            date: typeof data.date === 'string' ? data.date : toYMD(data.date?.toDate?.() || data.date),
          }
        })
        dailyTasks.value = userTasks.filter((t) => t.date === toYMD(today))
        try {
          carryoverCount.value = dailyTasks.value.filter((t) => t.is_carryover === true && t.completed === false).length
        } catch {
          carryoverCount.value = 0
        }
        const weekDays = ymdRange(startOfWeek, endOfWeek)
        weeklyTasks.value = userTasks.filter((t) => weekDays.includes(t.date))
        const monthDays = ymdRange(startOfMonth, endOfMonth)
        monthlyTasks.value = userTasks.filter((t) => monthDays.includes(t.date))
        buildRotatingInsights()
      })
    } catch (error) {
      console.warn('Live tasks listener failed; falling back to one-time load', error?.message || error)
      loadTasks().catch(() => {})
    }
  })
})

onUnmounted(() => {
  if (unsubscribe.value) unsubscribe.value()
  if (insightIntervalId.value) clearInterval(insightIntervalId.value)
})

async function redirectToLogin() {
  window.location.href = '/login?redirect=/dashboard'
}

async function onReactivate() {
  try {
    const uid = authStore?.user?.uid
    if (!uid) return redirectToLogin()
    const url = await reactivateSubscription(uid)
    window.location.href = url
  } catch (error) {
    console.error('Reactivate failed', error)
  }
}

async function applyCarryover(limit = 3) {
  try {
    const uid = authStore?.user?.uid
    if (!uid) return
    await api.post('/carryover/apply', { userId: uid, limit })
    await loadTasks()
    ElMessage({ message: 'Moved to tomorrow ✅', type: 'success', duration: 1600 })
  } catch (error) {
    console.warn('applyCarryover failed', error?.response?.data || error?.message)
  }
}

async function ignoreCarryover() {
  try {
    const uid = authStore?.user?.uid
    if (!uid) return
    await api.post('/carryover/ignore', { userId: uid })
    await loadTasks()
    ElMessage({ message: 'Marked as overdue', type: 'info', duration: 1600 })
  } catch (error) {
    console.warn('ignoreCarryover failed', error?.response?.data || error?.message)
  }
}

async function fetchAISummary() {
  try {
    const all = [...dailyTasks.value, ...weeklyTasks.value, ...monthlyTasks.value]
    const unique = Array.from(new Map(all.map((t) => [t.id, t])).values())
    const compacted = unique.map((t) => ({
      id: t.id,
      title: t.title,
      completed: !!t.completed,
      date: t.date,
    }))
    aiSummary.value = await summarizeTasks(compacted)
  } catch (error) {
    console.error('❌ Task summary failed:', error.message || error)
  }
}

watchEffect(() => {
  if (dailyTasks.value.length || weeklyTasks.value.length || monthlyTasks.value.length) {
    fetchAISummary()
  }
})

watch(
  [dailyTasks, weeklyTasks, monthlyTasks, aiSummary, usage],
  () => {
    buildRotatingInsights()
  },
  { deep: true }
)

function buildLocalIso(ymd, hhmm) {
  try {
    const [y, m, d] = String(ymd || '').split('-').map((n) => parseInt(n, 10))
    const [hh, mm] = String(hhmm || '00:00').split(':').map((n) => parseInt(n, 10))
    if (!y || !m || !d) throw new Error('invalid date parts')

    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    const yStr = String(y).padStart(4, '0')
    const mStr = String(m).padStart(2, '0')
    const dStr = String(d).padStart(2, '0')
    const hhStr = String(hh || 0).padStart(2, '0')
    const mmStr = String(mm || 0).padStart(2, '0')
    const local = dayjs.tz(`${yStr}-${mStr}-${dStr} ${hhStr}:${mmStr}`, tz, true)
    return local.utc().toISOString()
  } catch (error) {
    console.warn('buildLocalIso failed:', error)
    return new Date().toISOString()
  }
}

async function handleSaveAndSchedule(payload) {
  await handleSave(payload)
  try {
    const uid = authStore?.user?.uid
    const taskId = payload?.id
    if (!uid || !taskId) return
    const notifyMeta = payload.__notifyMeta || null
    if (payload.__notifyMeta) delete payload.__notifyMeta
    const scheduledByBackend = !!notifyMeta?.scheduled
    if (payload?.reminderTime) {
      if (scheduledByBackend) {
        try {
          await fetchUsage()
        } catch {
          /* noop */
        }
        return
      }
      const iso = buildLocalIso(payload.date, payload.reminderTime)
      const explicitChannels = Array.isArray(payload?.reminderChannels)
        ? payload.reminderChannels
        : Array.isArray(payload?.channels)
        ? payload.channels
        : []
      const normalizedChannels = Array.from(
        new Set(
          explicitChannels
            .map((c) => String(c || '').toLowerCase())
            .filter((c) => ['pwa', 'whatsapp', 'email', 'sms', 'voice_call'].includes(c))
        )
      )
      const prefs = normalizedChannels.length
        ? {
            whatsapp: normalizedChannels.includes('whatsapp'),
            pwa: normalizedChannels.includes('pwa'),
            push: normalizedChannels.includes('pwa'),
            email: normalizedChannels.includes('email'),
            sms: normalizedChannels.includes('sms'),
            voice_call: normalizedChannels.includes('voice_call'),
          }
        : userPrefs.value?.notifications || {}
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      try {
        const resp = await api.post('/reminders/text', {
          userId: uid,
          text: payload.title,
          scheduledTime: iso,
          taskId,
          channels: normalizedChannels.length ? normalizedChannels : undefined,
          timezone: tz,
        })
        const warn = resp?.headers?.['x-plan-warning'] || resp?.headers?.['X-Plan-Warning']
        if (warn) ElMessage({ message: warn, type: 'warning', duration: 5000 })
        try {
          await fetchUsage()
        } catch {
          /* noop */
        }
      } catch (error) {
        await scheduleReminder(uid, taskId, payload.title, iso, prefs)
        if (error?.response?.status === 403) {
          const msg =
            error?.response?.data?.error ||
            'Daily reminder limit reached. Upgrade to Pro for unlimited reminders.'
          ElMessage({ message: msg, type: 'warning', duration: 6000 })
        }
      }
    } else {
      await api.post('/reminders/cancel', { userId: uid, taskId })
    }
  } catch (error) {
    console.warn('Reminder sync (dashboard) failed:', error?.response?.data || error?.message)
  }
}

async function refreshReminderBadges(list) {
  try {
    const uid = authStore?.user?.uid
    if (!uid) {
      reminderActiveByTask.value = {}
      return
    }
    const arr = Array.isArray(list) ? list : []
    const results = await Promise.all(
      arr.map(async (t) => {
        try {
          const r = await getReminderStatus(uid, t.id)
          return [t.id, !!r?.hasActive]
        } catch {
          return [t.id, false]
        }
      })
    )
    const map = {}
    for (const [id, flag] of results) map[id] = flag
    reminderActiveByTask.value = map
  } catch (error) {
    console.warn('refreshReminderBadges failed', error)
  }
}

watch(
  () => sortedDaily.value.map((t) => t.id).join(','),
  () => {
    refreshReminderBadges(sortedDaily.value)
  },
  { immediate: true }
)

async function onReminderClick(task) {
  try {
    const uid = authStore?.user?.uid
    if (!uid || !task?.id) return
    const choice = window.prompt('Reminder active. Type "cancel" to cancel, or leave empty to dismiss:')
    if (choice && choice.toLowerCase() === 'cancel') {
      await api.post('/reminders/cancel', { userId: uid, taskId: task.id })
      await refreshReminderBadges(sortedDaily.value)
    }
  } catch (error) {
    console.warn('Reminder manage failed', error?.response?.data || error?.message)
  }
}

onMounted(() => {
  try {
    onAuthStateChanged(auth, () => {
      checkingAuth.value = false
    })
  } catch {
    checkingAuth.value = false
  }
  try {
    const uid = authStore?.user?.uid
    if (uid) {
      getUserPreferences(uid)
        .then((res) => {
          userPrefs.value = res || { notifications: {}, integrations: {} }
        })
        .catch((error) => console.warn('Failed to load user prefs:', error))
    }
  } catch {
    /* noop */
  }
})

watch(
  () => authStore?.user?.uid,
  async (uid) => {
    try {
      if (!uid) {
        userStreak.value = 0
        return
      }
      await ensureDailyStreakState(uid)
      userStreak.value = await getUserStreak(uid)
    } catch {
      /* noop */
    }
  },
  { immediate: true }
)

onMounted(fetchUsage)

onMounted(() => {
  try {
    window.addEventListener('usage-refresh', fetchUsage)
  } catch {
    /* noop */
  }
})

onUnmounted(() => {
  try {
    window.removeEventListener('usage-refresh', fetchUsage)
  } catch {
    /* noop */
  }
})
</script>

<style scoped>
.dashboard-card {
  background: linear-gradient(145deg, rgba(30, 27, 75, 0.88), rgba(49, 46, 129, 0.85), rgba(76, 29, 149, 0.82));
  border-radius: 1.25rem;
  padding: 1.75rem;
  border: 1px solid rgba(148, 163, 184, 0.18);
  box-shadow: 0 18px 38px rgba(11, 13, 26, 0.45);
  backdrop-filter: blur(10px);
}

.dashboard-banner {
  border-radius: 1.15rem;
  padding: 1rem 1.25rem;
  box-shadow: inset 0 1px 12px rgba(255, 255, 255, 0.06);
}

.dashboard-section {
  width: 100%;
  max-width: 100%;
}

@media (max-width: 768px) {
  .dashboard-section {
    padding-left: 0.5rem;
    padding-right: 0.5rem;
    overflow-x: hidden;
  }
}

.now-bar {
  box-shadow: inset 0 1px 0 rgba(148, 163, 184, 0.08);
}

.action-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1.2rem;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 600;
  transition: all 0.25s ease;
}

.slide-enter-active,
.slide-leave-active {
  transition: all 0.5s ease;
}
.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(6px);
}

</style>
