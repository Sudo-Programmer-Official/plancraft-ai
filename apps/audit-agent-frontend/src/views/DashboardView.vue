<!-- src/views/DashboardView.vue -->
<template>
  <div v-if="checkingAuth" class="px-4 py-8 text-center text-gray-400">
    Checking session…
  </div>
  <SetupPrompt v-else-if="showSetup" @done="showSetup = false" @close="showSetup = false" />
  <main
    v-else
    class="min-h-screen px-2 py-6 sm:px-4 md:px-6 space-y-6 lg:space-y-8 pb-12 transition-colors max-w-7xl mx-auto"
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
            <div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
              <div class="greeting-headline-wrapper flex-1 min-w-0">
                <transition name="greeting-fade" mode="out-in">
                  <h1
                    class="text-2xl sm:text-3xl font-semibold text-slate-100 w-full leading-tight"
                    :key="greetingHeadline"
                  >
                    {{ greetingHeadline }}
                  </h1>
                </transition>
              </div>
              <span
                v-if="dailyTasks.length"
                class="text-indigo-200/90 text-sm sm:text-base sm:whitespace-nowrap"
              >
                Let’s craft an intentional day.
              </span>
            </div>
          </div>

          <div class="insight-wrapper">
            <transition-group name="slide" tag="div">
              <div
                v-if="currentInsight"
                :key="currentInsight"
                class="text-indigo-200/90 text-sm sm:text-base max-w-2xl leading-relaxed"
              >
                {{ currentInsight }}
              </div>
            </transition-group>
          </div>

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
        v-if="showCarryoverBanner || (usage.plan === 'free' && !isPremium.value) || reactivateEligible || reminderNudge"
        class="dashboard-section w-full overflow-hidden max-w-full px-2 sm:px-4"
      >
        <div class="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          <div
            v-if="showCarryoverBanner"
            class="move-card flex flex-col justify-between p-4 rounded-2xl bg-gradient-to-b from-[#431f64] to-[#291642] shadow-lg text-white space-y-3"
          >
            <div class="text-content">
              <p class="text-xl font-semibold">
                {{ carryoverCount }} unfinished task{{ carryoverCount === 1 ? '' : 's' }} from yesterday.
              </p>
              <p class="text-sm text-gray-300 mt-1">
                Move a few forward so today starts lighter.
              </p>
            </div>

            <div class="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                class="flex-1 py-2 rounded-lg bg-gradient-to-r from-amber-400 to-yellow-500 font-semibold text-black hover:opacity-90 transition"
                @click="applyCarryover(Math.min(3, carryoverCount))"
              >
                Move {{ Math.min(3, carryoverCount) }}
              </button>
              <button
                type="button"
                class="flex-1 py-2 rounded-lg bg-gradient-to-r from-purple-900 to-purple-700 font-semibold text-white hover:opacity-90 transition"
                @click="applyCarryover('all')"
              >
                Move All
              </button>
              <button
                type="button"
                class="px-4 py-2 rounded-lg border border-gray-500 font-semibold text-gray-300 hover:bg-gray-800 transition"
                @click="ignoreCarryover()"
              >
                Ignore
              </button>
            </div>
          </div>

          <div
            v-if="reminderNudge"
            class="dashboard-banner bg-slate-900/70 border-indigo-500/40 text-indigo-100 flex flex-col gap-3"
          >
            <div class="flex items-start gap-3">
              <span class="text-xl">{{ reminderNudge.icon }}</span>
              <div class="space-y-1">
                <p class="font-medium text-sm sm:text-base">{{ reminderNudge.title }}</p>
                <p class="text-xs sm:text-sm text-indigo-200/80">{{ reminderNudge.body }}</p>
              </div>
            </div>
            <div class="flex flex-wrap gap-2">
              <button
                @click="goToNotifications"
                class="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
              >
                {{ reminderNudge.cta }}
              </button>
              <button
                @click="dismissReminderNudge(reminderNudge.type)"
                class="px-3 py-1.5 rounded-lg border border-slate-600/70 text-slate-200 text-xs font-semibold hover:bg-slate-800/60 transition"
              >
                {{ reminderNudge.dismissLabel }}
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

    <section class="dashboard-section w-full overflow-hidden max-w-full px-2 sm:px-4">
      <div class="dashboard-card flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="space-y-1">
          <p class="text-[11px] uppercase tracking-[0.3em] text-indigo-200/80">Layout</p>
          <h3 class="text-base sm:text-lg font-semibold text-slate-100">Pick the cards you want to see</h3>
          <p class="text-xs text-indigo-200/80">Defaults to all cards; choices are saved for this workspace.</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <label
            v-for="card in dashboardCardOptions"
            :key="card.key"
            class="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/15 bg-white/5 text-xs text-indigo-50 cursor-pointer transition hover:border-indigo-400/60"
          >
            <input
              type="checkbox"
              class="accent-indigo-500 rounded"
              :checked="isCardEnabled(card.key)"
              @change="onCardToggle(card.key, $event.target.checked)"
            />
            <span class="font-semibold">{{ card.label }}</span>
          </label>
          <button
            type="button"
            class="px-3 py-1.5 rounded-lg border border-white/20 bg-transparent text-xs text-indigo-100 hover:border-indigo-300/70 transition"
            @click="resetCardVisibility"
          >
            Show all
          </button>
        </div>
      </div>
    </section>

    <!-- Tier 2 · Workspaces -->
    <section class="space-y-4 lg:space-y-5">
      <div v-if="showDaily" class="dashboard-section w-full overflow-hidden max-w-full px-2 sm:px-4">
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
                  :class="[
                    'flex items-center justify-between gap-3 p-3 rounded-xl transition border',
                    activeTaskId === task.id
                      ? 'bg-indigo-900/60 border-indigo-400/70 shadow-[0_0_12px_rgba(99,102,241,0.35)]'
                      : 'bg-slate-900/70 border-slate-800/80 hover:border-indigo-500/40',
                  ]"
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
                      <div class="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                        <small>{{ task.date }}</small>
                        <a
                          v-if="taskMeetingLink(task)"
                          :href="taskMeetingLink(task).url"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-700/80 text-white hover:bg-emerald-800 transition text-[11px]"
                          :title="taskMeetingLink(task).label"
                        >
                          🔗 {{ taskMeetingLink(task).label }}
                        </a>
                      </div>
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <button
                      v-if="!task.completed"
                      @click.stop="markTaskActive(task)"
                      class="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold border transition"
                      :class="activeTaskId === task.id ? 'border-indigo-400 bg-indigo-900/60 text-indigo-100' : 'border-slate-600 bg-slate-800/70 text-slate-200 hover:border-indigo-400 hover:text-white'"
                    >
                      <span class="text-xs">{{ activeTaskId === task.id ? '▶ Active' : 'Start' }}</span>
                    </button>
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
              {{ dashboardCategory === 'All' ? 'Nothing planned for today.' : 'No tasks in this category yet.' }}
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

      <div v-if="showAllTasks" class="dashboard-section w-full overflow-hidden max-w-full px-2 sm:px-4">
        <div class="dashboard-card all-tasks-card space-y-5">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 class="text-lg sm:text-xl font-semibold text-slate-100">
                🗂 All Tasks
              </h3>
              <p class="text-xs sm:text-sm text-indigo-200/80">
                Sweep across weeks or set a custom window to review every task in one calm view.
              </p>
            </div>
            <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/70 border border-indigo-700/50 text-xs text-indigo-100">
              <span class="uppercase tracking-[0.25em] text-[10px] text-indigo-300/80">Range</span>
              <span class="font-semibold">{{ allTasksRangeLabel }}</span>
            </div>
          </div>

          <div class="space-y-3">
            <div class="flex flex-wrap gap-2">
              <button
                v-for="preset in allTasksPresets"
                :key="preset.key"
                type="button"
                @click="applyAllTasksPreset(preset.key)"
                :class="[
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition',
                  allTasksPreset === preset.key
                    ? 'bg-indigo-600 text-white shadow-[0_10px_30px_rgba(79,70,229,0.35)] border border-indigo-400/70'
                    : 'bg-slate-900/70 border border-slate-700/60 text-slate-200 hover:border-indigo-400/40',
                ]"
              >
                <span>{{ preset.label }}</span>
                <span v-if="preset.hint" class="text-[11px] text-indigo-100/80">{{ preset.hint }}</span>
              </button>
            </div>

            <div class="flex flex-wrap items-center gap-3 p-3 rounded-2xl bg-slate-900/70 border border-slate-800/70">
              <label class="flex items-center gap-2 text-xs text-slate-300">
                <span class="text-slate-400">From</span>
                <input
                  v-model="allTasksStartDate"
                  type="date"
                  class="rounded-lg bg-slate-800/80 border border-slate-700 text-slate-100 text-xs px-3 py-2 focus:border-indigo-400 focus:outline-none"
                />
              </label>
              <span class="text-slate-600 text-sm">→</span>
              <label class="flex items-center gap-2 text-xs text-slate-300">
                <span class="text-slate-400">To</span>
                <input
                  v-model="allTasksEndDate"
                  type="date"
                  class="rounded-lg bg-slate-800/80 border border-slate-700 text-slate-100 text-xs px-3 py-2 focus:border-indigo-400 focus:outline-none"
                />
              </label>

              <div class="flex items-center gap-2 ml-auto flex-wrap sm:flex-nowrap">
                <div class="flex gap-1 bg-slate-800/60 border border-slate-700 rounded-full p-1">
                  <button
                    v-for="status in allTasksStatusOptions"
                    :key="status.key"
                    type="button"
                    @click="allTasksStatus = status.key"
                    :class="[
                      'px-2.5 py-1 rounded-full text-[11px] font-semibold transition',
                      allTasksStatus === status.key
                        ? 'bg-indigo-600 text-white shadow-[0_10px_30px_rgba(79,70,229,0.35)]'
                        : 'text-slate-200 hover:text-white',
                    ]"
                  >
                    {{ status.label }}
                  </button>
                </div>
                <select
                  v-model="allTasksCategory"
                  class="text-xs bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:border-indigo-400 focus:outline-none"
                >
                  <option v-for="cat in categoryFilters" :key="cat" :value="cat">
                    {{ categoryIcon(cat) }} {{ cat }}
                  </option>
                </select>
                <div class="relative">
                  <span class="absolute left-2 top-2.5 text-slate-500">🔍</span>
                  <input
                    v-model="allTasksSearch"
                    type="text"
                    placeholder="Search title or notes"
                    class="pl-7 pr-3 py-2 rounded-lg bg-slate-800/80 border border-slate-700 text-xs text-slate-100 focus:border-indigo-400 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 text-sm">
            <div class="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80">
              <p class="text-[11px] uppercase tracking-[0.25em] text-indigo-200/70">Total</p>
              <p class="text-lg font-semibold text-slate-50">{{ allTasksRangeStats.total }}</p>
            </div>
            <div class="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80">
              <p class="text-[11px] uppercase tracking-[0.25em] text-emerald-200/70">Done</p>
              <p class="text-lg font-semibold text-emerald-200">{{ allTasksRangeStats.completed }}</p>
            </div>
            <div class="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80">
              <p class="text-[11px] uppercase tracking-[0.25em] text-amber-200/70">Open</p>
              <p class="text-lg font-semibold text-amber-200">{{ allTasksRangeStats.pending }}</p>
            </div>
            <div class="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80">
              <p class="text-[11px] uppercase tracking-[0.25em] text-rose-200/70">Overdue</p>
              <p class="text-lg font-semibold text-rose-200">{{ allTasksRangeStats.overdue }}</p>
            </div>
          </div>

          <div
            v-if="filteredAllTasks.length"
            class="overflow-y-auto max-h-[60vh] md:max-h-72 scrollbar-plan rounded-2xl pr-1"
          >
            <ul class="space-y-2 text-sm">
              <li
                v-for="task in filteredAllTasks"
                :key="task.id"
                :class="[
                  'p-3 rounded-xl border transition flex justify-between gap-3',
                  activeTaskId === task.id
                    ? 'bg-indigo-900/60 border-indigo-500/60 shadow-[0_0_12px_rgba(99,102,241,0.35)]'
                    : 'bg-slate-900/70 border-slate-800/80 hover:border-indigo-500/40',
                ]"
              >
                <div class="flex items-start gap-3 flex-1">
                  <input
                    type="checkbox"
                    :checked="task.completed"
                    @change="() => toggleComplete(task)"
                    class="mt-1 w-4 h-4 cursor-pointer accent-indigo-500"
                  />
                  <div class="space-y-1">
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
                    <div class="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                      <span class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-800/70 border border-slate-700">
                        <span class="text-indigo-300">📅</span>
                        <span>{{ task.date }}</span>
                      </span>
                      <span
                        v-if="task.completed"
                        class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-800/60 border border-emerald-600/60 text-emerald-100"
                      >
                        ✅ Done
                      </span>
                      <span
                        v-else-if="task.date < todayKeyRef"
                        class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-rose-900/50 border border-rose-700/70 text-rose-100"
                      >
                        ⚠️ Overdue
                      </span>
                      <span
                        v-else
                        class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-800/70 border border-slate-700 text-slate-200"
                      >
                        ◻️ Open
                      </span>
                      <span
                        v-if="activeTaskId === task.id"
                        class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-indigo-900/60 border border-indigo-600/70 text-indigo-100"
                      >
                        <span class="w-2 h-2 rounded-full bg-indigo-300 animate-pulse"></span>
                        Active
                      </span>
                    </div>
                  </div>
                </div>
              </li>
            </ul>
          </div>
          <p v-else class="text-slate-400 text-sm">
            No tasks match this range yet. Try widening the dates or clearing filters.
          </p>
        </div>
      </div>

      <div class="space-y-4 lg:space-y-5">
        <div
          v-if="showWeekly"
          class="dashboard-section w-full overflow-hidden max-w-full px-2 sm:px-4"
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
                  <div class="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    <small>{{ task.date }}</small>
                    <a
                      v-if="taskMeetingLink(task)"
                      :href="taskMeetingLink(task).url"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-700/80 text-white hover:bg-emerald-800 transition text-[11px]"
                      :title="taskMeetingLink(task).label"
                    >
                      🔗 {{ taskMeetingLink(task).label }}
                    </a>
                  </div>
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
        class="dashboard-section w-full overflow-hidden max-w-full px-2 sm:px-4"
      >
        <div class="dashboard-card quick-links-card">
          <QuickLinksCard />
        </div>
      </div>

      <div
        v-if="showMonthly"
        class="dashboard-section w-full overflow-hidden max-w-full px-2 sm:px-4"
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

      <div class="dashboard-section w-full overflow-hidden max-w-full px-2 sm:px-4">
        <div
          class="dashboard-card calendar-sync-card space-y-4 bg-gradient-to-br from-indigo-900/70 via-purple-900/60 to-slate-900/70 border border-indigo-600/40 shadow-lg"
        >
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div class="space-y-2">
              <p class="text-[11px] uppercase tracking-[0.4em] text-indigo-300/80">Calendar Sync</p>
              <h3 class="text-lg sm:text-xl font-semibold text-white">
                Smart scheduling with Google Calendar
              </h3>
              <p class="text-sm text-indigo-100/80">
                {{ googleConnected ? 'Pull meetings and prep without re-connecting.' : 'Connect once to auto-pull meetings, prep agendas, and hold buffer space.' }}
              </p>
              <div v-if="googleConnected" class="flex flex-wrap items-center gap-2 text-xs text-indigo-100/90">
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-700/50 text-emerald-100">
                  <span class="w-2 h-2 rounded-full bg-emerald-300"></span>
                  Connected
                </span>
                <span v-if="googleLastSync" class="text-slate-200/90">Last sync: {{ googleLastSync }}</span>
              </div>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <button
                v-if="!googleConnected"
                type="button"
                class="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-semibold text-indigo-50 border border-white/10 transition"
                @click="goToIntegrations"
              >
                Connect calendar →
              </button>
              <template v-else>
                <button
                  type="button"
                  class="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-semibold text-indigo-50 border border-white/10 transition"
                  @click="goToMeetings"
                >
                  View meetings
                </button>
                <button
                  type="button"
                  class="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-indigo-500/80 hover:bg-indigo-500 text-sm font-semibold text-white border border-indigo-400/60 transition disabled:opacity-60"
                  :disabled="googleSyncing"
                  @click="syncGoogleNow"
                >
                  <span v-if="googleSyncing" class="h-4 w-4 mr-2 border-2 border-white/40 border-t-white rounded-full animate-spin" aria-hidden="true"></span>
                  {{ googleSyncing ? 'Syncing…' : 'Sync now' }}
                </button>
              </template>
            </div>
          </div>
          <ul class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-indigo-100/90">
            <li class="px-3 py-2 rounded-2xl bg-slate-900/40 border border-white/5">🗓️ Auto-sync meetings</li>
            <li class="px-3 py-2 rounded-2xl bg-slate-900/40 border border-white/5">✍️ Draft prep tasks</li>
            <li class="px-3 py-2 rounded-2xl bg-slate-900/40 border border-white/5">🎯 Recommend focus blocks</li>
          </ul>
        </div>
      </div>

      <div class="dashboard-section w-full overflow-hidden max-w-full px-2 sm:px-4 xl:col-span-3">
        <div
          class="dashboard-card reminders-card space-y-4 bg-gradient-to-br from-amber-900/60 via-orange-900/50 to-slate-900/70 border border-amber-500/30 shadow-lg"
        >
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p class="text-[11px] uppercase tracking-[0.3em] text-amber-200/80">Reminders & Notifications</p>
              <h3 class="text-lg sm:text-xl font-semibold text-white">Stay on track effortlessly</h3>
              <p class="text-sm text-amber-100/80">
                Choose WhatsApp, SMS, voice, or push nudges for every mission-critical task.
              </p>
            </div>
            <RouterLink
              to="/settings?tab=notifications"
              class="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-semibold text-amber-50 border border-white/10 transition"
            >
              Notification center →
            </RouterLink>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-amber-100/90">
            <div class="p-3 rounded-2xl bg-slate-900/40 border border-white/5">
              🔔 Multi-channel reminders
            </div>
            <div class="p-3 rounded-2xl bg-slate-900/40 border border-white/5">
              🕑 Gentle follow-ups if you snooze
            </div>
            <div class="p-3 rounded-2xl bg-slate-900/40 border border-white/5">
              🎙️ Voice prompts + AI suggestions
            </div>
          </div>
        </div>
      </div>
    </div>
    </section>

<!-- Tier 3 · Analytics & Insights -->
<section class="space-y-4 lg:space-y-5">
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

  <div
    v-if="showNapkin"
    class="dashboard-section w-full overflow-hidden max-w-full px-2 sm:px-4"
  >
        <div
          class="dashboard-card napkin-card space-y-4 bg-gradient-to-br from-slate-900/70 via-indigo-900/60 to-purple-900/60 border border-indigo-700/40"
        >
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p class="text-[11px] uppercase tracking-[0.35em] text-indigo-200/80">Napkin logs</p>
              <h3 class="text-lg sm:text-xl font-semibold text-white">Recent captures</h3>
              <p class="text-xs sm:text-sm text-indigo-100/80">
                Voice drops, quick adds, and ideas routed from this workspace.
              </p>
            </div>
            <div class="flex flex-wrap gap-2">
              <RouterLink
                to="/napkin"
                class="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition"
              >
                Open Napkin →
              </RouterLink>
              <RouterLink
                to="/quick-add"
                class="px-3 py-1.5 rounded-lg border border-white/20 text-indigo-50 hover:border-indigo-300/70 hover:bg-white/5 text-xs font-semibold transition"
              >
                Drop a note
              </RouterLink>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div class="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <p class="text-slate-400 text-xs">Captured</p>
              <p class="text-lg font-semibold text-slate-50">{{ napkinCapturedCount }}</p>
            </div>
            <div class="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <p class="text-slate-400 text-xs">Converted</p>
              <p class="text-lg font-semibold text-emerald-200">{{ napkinConvertedCount }}</p>
            </div>
            <div class="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <p class="text-slate-400 text-xs">Voice notes</p>
              <p class="text-lg font-semibold text-indigo-200">{{ napkinVoiceCount }}</p>
            </div>
          </div>

          <div v-if="napkinError" class="text-rose-200 text-sm bg-rose-900/40 border border-rose-600/40 rounded-xl px-3 py-2">
            {{ napkinError }}
          </div>
          <div v-else-if="napkinLoading" class="space-y-2">
            <div v-for="n in 3" :key="n" class="h-16 bg-slate-900/40 border border-slate-800 rounded-xl animate-pulse" />
          </div>
          <div v-else-if="napkinPreview.length" class="space-y-3">
            <article
              v-for="item in napkinPreview"
              :key="item.id"
              class="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80 hover:border-indigo-500/60 transition space-y-2"
            >
              <div class="flex flex-wrap items-center gap-2 text-[11px]">
                <span class="px-2 py-1 rounded-full bg-indigo-900/60 border border-indigo-700/60 text-indigo-100 uppercase tracking-wide">
                  {{ item.type }}
                </span>
                <span class="px-2 py-1 rounded-full bg-slate-900/70 border border-slate-700 text-slate-100">
                  {{ item.category }}
                </span>
                <span
                  v-if="item.status !== 'unsorted'"
                  class="px-2 py-1 rounded-full bg-emerald-900/60 border border-emerald-700/60 text-emerald-100 uppercase tracking-wide"
                >
                  {{ item.status }}
                </span>
                <span class="text-slate-400">{{ formatNapkinDate(item.createdAt) }}</span>
              </div>
              <p class="text-sm text-slate-50 whitespace-pre-line leading-relaxed">
                {{ item.text }}
              </p>
              <p v-if="item.tags?.length" class="text-[11px] text-slate-400">
                #{{ item.tags.slice(0, 4).join(' #') }}
              </p>
            </article>
          </div>
          <div v-else class="text-sm text-slate-300 bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2">
            No napkin captures yet. Drop a quick note or voice memo to see it here.
          </div>
        </div>
      </div>

  <div class="dashboard-section w-full overflow-hidden max-w-full px-2 sm:px-4">
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
            class="action-chip talk-to-planner-entry bg-transparent border border-indigo-400/60 text-indigo-200 hover:bg-indigo-500/10"
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

    <!-- Onboarding tour temporarily disabled -->
  </main>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watchEffect, watch } from 'vue'
import { useRouter } from 'vue-router'
import { collection, onSnapshot, updateDoc, doc, query, where, serverTimestamp, getDocs } from 'firebase/firestore'
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
import { useSubscriptionStore } from '@/stores/subscriptionStore'
import { reactivateSubscription } from '@/services/stripeService'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { useAuthFlags } from '@/composables/useAuthFlags'
import { trackLinkedInConversion } from '@/utils/ads'
import { trackGuestDashboardLoaded } from '@/services/analytics'
import { getReminderStatus, scheduleReminder } from '@/services/reminderService'
import { listReports, generateReport } from '@/services/reportsService'
import api from '@/services/api'
import { getPreferences as getUserPreferences, getIntegrations, updateOnboardingStatus } from '@/services/settingsService'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { ElMessage, ElNotification } from 'element-plus'
import { TASK_CATEGORY_FILTERS, getCategoryIcon, getCategoryColor, resolveCategory } from '@/constants/taskCategories'
import { ensureDailyStreakState, getUserStreak } from '@/services/streakService'
import { resolveReminderIso } from '@/utils/timeHelper.js'
import { resolveTaskMeetingLink } from '@/utils/taskLinks'
import { seedGuestStarterTasks } from '@/utils/guestTasks'
import { subscribeToNapkinItems } from '@/services/napkinService'
import { fetchDashboardPreferences, saveDashboardPreferences } from '@/services/dashboardPreferencesService'
import { getGoogleStatus, triggerGoogleSyncNow } from '@/stores/integrationsStore'

dayjs.extend(utc)
dayjs.extend(timezone)

const authStore = useAuthStore()
const { isPremium, isGuest } = useAuthFlags()
const workspaceStore = useWorkspaceStore()
const activeWorkspaceId = computed(() => workspaceStore.activeWorkspaceId)
const routerNav = useRouter()
const subStore = useSubscriptionStore()
const isFirstVisit = computed(() => isGuest.value && authStore?.user?.firstVisitInitialized !== true)
const guestDashboardTracked = ref(false)
const firstVisitSeeding = ref(false)

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
const dashboardCardOptions = [
  { key: 'daily', label: 'Daily focus' },
  { key: 'allTasks', label: 'All tasks timeline' },
  { key: 'weekly', label: 'Weekly horizon' },
  { key: 'monthly', label: 'Monthly momentum' },
  { key: 'quickLinks', label: 'Quick links' },
  { key: 'journal', label: 'Journal snapshot' },
  { key: 'ai', label: 'AI insights' },
  { key: 'napkin', label: 'Napkin logs' },
]
const DASHBOARD_CARD_STORAGE_KEY = 'dashboard:cards:v2'
const allCardKeys = dashboardCardOptions.map((c) => c.key)

const cardVisibility = ref(new Set(allCardKeys))
let savePrefsTimer = null
let lastPrefsRequestId = 0

function storageKey() {
  const wsId = activeWorkspaceId.value || 'default'
  const uid = authStore?.user?.uid || 'anon'
  return `${DASHBOARD_CARD_STORAGE_KEY}:${uid}:${wsId}`
}

function sanitizeCardList(list) {
  const seen = new Set()
  ;(Array.isArray(list) ? list : []).forEach((key) => {
    if (typeof key === 'string' && allCardKeys.includes(key)) seen.add(key)
  })
  return Array.from(seen)
}

function cacheVisibility(nextSet) {
  if (typeof window === 'undefined') return
  try {
    const payload = {
      visibleCards: Array.from(nextSet),
      knownCards: [...allCardKeys],
      updatedAt: Date.now(),
    }
    localStorage.setItem(storageKey(), JSON.stringify(payload))
  } catch {
    /* noop */
  }
}

function readCachedVisibility() {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(storageKey())
    if (!raw) return null
    const parsed = JSON.parse(raw)
    const visibleCards = sanitizeCardList(parsed.visibleCards)
    const knownCards = sanitizeCardList(parsed.knownCards || parsed.allCards)
    if (!visibleCards.length && !knownCards.length) return null
    return { visibleCards, knownCards }
  } catch {
    return null
  }
}

function applyVisibility(payload = {}, options = {}) {
  const visible = sanitizeCardList(payload.visibleCards)
  const known = sanitizeCardList(payload.knownCards && payload.knownCards.length ? payload.knownCards : allCardKeys)
  const newKeys = allCardKeys.filter((key) => !known.includes(key))
  let next = visible.length ? [...visible, ...newKeys] : []
  if (!next.length && options.fallbackToAll !== false) next = [...allCardKeys]
  cardVisibility.value = new Set(next)
  if (options.persistLocal !== false) cacheVisibility(cardVisibility.value)
}

async function hydrateCardVisibility() {
  const wsId = activeWorkspaceId.value
  const uid = authStore?.user?.uid
  if (!wsId) {
    applyVisibility({ visibleCards: allCardKeys, knownCards: allCardKeys })
    return
  }

  const cached = readCachedVisibility()
  if (cached) applyVisibility(cached, { persistLocal: false, fallbackToAll: false })

  if (!uid || isGuest.value) {
    if (!cached) applyVisibility({ visibleCards: allCardKeys, knownCards: allCardKeys })
    return
  }

  const requestId = ++lastPrefsRequestId
  try {
    const prefs = await fetchDashboardPreferences(uid, wsId)
    if (requestId !== lastPrefsRequestId) return
    if (prefs?.visibleCards?.length) {
      applyVisibility(
        {
          visibleCards: prefs.visibleCards,
          knownCards: prefs.knownCards?.length ? prefs.knownCards : allCardKeys,
        },
        { fallbackToAll: true },
      )
    } else {
      applyVisibility({ visibleCards: allCardKeys, knownCards: allCardKeys }, { fallbackToAll: true })
    }
  } catch (error) {
    console.warn('Dashboard layout prefs load failed', error?.message || error)
    if (!cached && requestId === lastPrefsRequestId) {
      applyVisibility({ visibleCards: allCardKeys, knownCards: allCardKeys }, { fallbackToAll: true })
    }
  }
}

function schedulePersistVisibility(nextSet) {
  cacheVisibility(nextSet)
  const uid = authStore?.user?.uid
  const wsId = activeWorkspaceId.value
  if (!uid || !wsId || isGuest.value) return
  if (savePrefsTimer) clearTimeout(savePrefsTimer)
  savePrefsTimer = setTimeout(async () => {
    savePrefsTimer = null
    try {
      await saveDashboardPreferences(uid, wsId, {
        visibleCards: Array.from(nextSet),
        knownCards: [...allCardKeys],
      })
    } catch (error) {
      console.warn('Dashboard layout prefs save failed', error?.message || error)
    }
  }, 400)
}

function setCardVisibility(key, enabled) {
  const next = new Set(cardVisibility.value)
  if (enabled) next.add(key)
  else next.delete(key)
  cardVisibility.value = next
  schedulePersistVisibility(next)
}
function resetCardVisibility() {
  const next = new Set(allCardKeys)
  cardVisibility.value = next
  schedulePersistVisibility(next)
}
const isCardEnabled = (key) => cardVisibility.value.has(key)
function onCardToggle(key, checked) {
  setCardVisibility(key, checked)
}

watch(
  () => ({
    uid: authStore.user?.uid,
    workspace: activeWorkspaceId.value,
  }),
  () => {
    hydrateCardVisibility()
  },
  { immediate: true }
)

const showDaily = computed(() => cardVisibility.value.has('daily'))
const showQuickLinks = computed(() => cardVisibility.value.has('quickLinks'))
const showWeekly = computed(() => cardVisibility.value.has('weekly'))
const showMonthly = computed(() => cardVisibility.value.has('monthly'))
const showAllTasks = computed(() => cardVisibility.value.has('allTasks'))
const showJournal = computed(() => cardVisibility.value.has('journal'))
const showAIInsights = computed(() => cardVisibility.value.has('ai'))
const showNapkin = computed(() => cardVisibility.value.has('napkin'))

// Usage meter (free plan)
const usage = ref({ used: 0, limit: 0, plan: '' })
const googleStatus = ref({ connected: false, accounts: [] })
const googleLoading = ref(false)
const googleSyncing = ref(false)
const primaryGoogleAccount = computed(() => googleStatus.value?.accounts?.[0] || null)
const googleConnected = computed(() => !!googleStatus.value?.connected && (googleStatus.value?.accounts?.length || googleStatus.value?.accountId))
const googleLastSync = computed(() => {
  const lastRun = primaryGoogleAccount.value?.lastRun || googleStatus.value?.lastRun
  if (!lastRun) return ''
  const ts = dayjs(lastRun)
  return ts.isValid() ? ts.format('MMM D · h:mm A') : ''
})
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

async function loadGoogleStatus() {
  if (!authStore?.user?.uid) return
  googleLoading.value = true
  try {
    const status = await getGoogleStatus(authStore.user.uid)
    googleStatus.value = status || { connected: false, accounts: [] }
  } catch (e) {
    console.warn('google status load failed', e?.message || e)
  } finally {
    googleLoading.value = false
  }
}

async function syncGoogleNow() {
  if (!authStore?.user?.uid || !googleConnected.value) return
  googleSyncing.value = true
  try {
    await triggerGoogleSyncNow(authStore.user.uid, primaryGoogleAccount.value?.accountId || null)
    await loadGoogleStatus()
    ElMessage.success('Sync started')
  } catch (e) {
    console.warn('google sync failed', e?.message || e)
    ElMessage.error('Unable to sync right now')
  } finally {
    googleSyncing.value = false
  }
}

function goToIntegrations() {
  try {
    routerNav.push('/settings?tab=integrations')
  } catch (e) {
    console.warn(e)
  }
}
function goToMeetings() {
  try {
    routerNav.push('/meetings')
  } catch (e) {
    console.warn(e)
  }
}

function goToNotifications() {
  clearTaskCreatedNudge()
  try {
    routerNav.push('/settings?tab=notifications')
  } catch (e) {
    console.warn(e)
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

/* -------------- Napkin preview -------------- */
const napkinItems = ref([])
const napkinLoading = ref(false)
const napkinError = ref('')

const napkinPreview = computed(() =>
  napkinItems.value
    .filter((item) => item.status !== 'archived')
    .slice(0, 4)
)
const napkinCapturedCount = computed(() => napkinItems.value.length)
const napkinConvertedCount = computed(
  () => napkinItems.value.filter((i) => i.status === 'converted').length
)
const napkinVoiceCount = computed(() => napkinItems.value.filter((i) => i.audioUrl || i.source === 'voice').length)

let napkinUnsub = null
function detachNapkinListener() {
  if (!napkinUnsub) return
  try {
    napkinUnsub()
  } catch {
    /* noop */
  }
  napkinUnsub = null
}

function attachNapkinListener() {
  detachNapkinListener()
  if (!authStore?.user?.uid) {
    napkinItems.value = []
    napkinLoading.value = false
    return
  }
  napkinLoading.value = true
  napkinError.value = ''
  try {
    napkinUnsub = subscribeToNapkinItems(
      (list) => {
        napkinItems.value = list
        napkinLoading.value = false
        napkinError.value = ''
      },
      {
        onError: (error) => {
          // If we already have data, keep showing it instead of a scary banner.
          if (!napkinItems.value.length) {
            napkinError.value = 'Napkin feed is unavailable right now. Please refresh to try again.'
          }
          napkinLoading.value = false
        },
      },
    )
  } catch (error) {
    napkinError.value = 'Unable to load napkin stream.'
    napkinLoading.value = false
  }
}

watch(
  () => ({
    uid: authStore.user?.uid,
    workspace: activeWorkspaceId.value,
    visible: showNapkin.value,
  }),
  ({ uid, visible }) => {
    if (!uid || !visible) {
      napkinItems.value = []
      napkinLoading.value = false
      detachNapkinListener()
      return
    }
    attachNapkinListener()
  },
  { immediate: true }
)

/* -------------- Tasks + Journal state -------------- */
const { loadTasks, allTasks, moveTasks, refreshAllTasks } = useTasks()
const aiSummary = ref(null)
const dailyTasks = ref([])
const weeklyTasks = ref([])
const monthlyTasks = ref([])
const activeTaskId = ref(null)
const showPlanner = ref(false)
const selectedTask = ref(null)
const dailyList = ref(null)
const journalLogs = ref([])
const carryoverDismissedToday = ref(false)
const latestReport = ref(null)
const generatingWeekly = ref(false)
const generatingMonthly = ref(false)
const sparklineCanvas = ref(null)
const categoryFilters = TASK_CATEGORY_FILTERS
const dashboardCategory = ref('All')

const showSetup = ref(false)
const reminderActiveByTask = ref({})
const taskMeetingLink = (task) => resolveTaskMeetingLink(task)
const checkingAuth = ref(true)
const userPrefs = ref({ notifications: {}, integrations: {} })
const integrationEndpoints = ref({ whatsapp: { phone: '' }, email: '' })
const onboardingTourVisible = ref(false)
const onboardingStatus = ref({
  completed: false,
  lastStep: 0,
  showLaterUntil: null,
  completedAt: null,
})
const onboardingSessionPlayed = ref(false)
const NUDGE_DISMISS_PREFIX = 'dismiss-until:'
const TASK_CREATED_TTL_MS = 7 * 24 * 60 * 60 * 1000
const NUDGE_COOLDOWN_MS = 20 * 1000
const taskCreatedAt = ref(0)
const nudgeCooldownUntil = ref(0)

function readNudgeTimestamp(key) {
  if (typeof window === 'undefined') return 0
  try {
    const value = Number(localStorage.getItem(key) || 0)
    return Number.isFinite(value) ? value : 0
  } catch {
    return 0
  }
}

function writeNudgeTimestamp(key, value) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, String(value))
  } catch {}
}

function nudgeScopeKey(suffix) {
  const uid = authStore?.user?.uid || 'anon'
  const wsId = activeWorkspaceId.value || 'default'
  return `pcai:nudge:${uid}:${wsId}:${suffix}`
}

function taskCreatedKey() {
  return nudgeScopeKey('task-created-at')
}

function nudgeCooldownKey() {
  return nudgeScopeKey('cooldown-until')
}

function clearTaskCreatedNudge() {
  taskCreatedAt.value = 0
  nudgeCooldownUntil.value = 0
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(taskCreatedKey())
    localStorage.removeItem(nudgeCooldownKey())
  } catch {}
}

function markTaskCreatedNudge(ts = Date.now()) {
  taskCreatedAt.value = ts
  writeNudgeTimestamp(taskCreatedKey(), ts)
}

function dismissKey(type) {
  return nudgeScopeKey(`${NUDGE_DISMISS_PREFIX}${type}`)
}

function isNudgeDismissed(type) {
  const until = readNudgeTimestamp(dismissKey(type))
  return until > Date.now()
}

function dismissReminderNudge(type, hours) {
  const defaultHours = {
    overdue: 24,
    dueSoon: 24,
    taskCreated: 24 * 7,
  }
  const duration = typeof hours === 'number' ? hours : (defaultHours[type] || 24)
  const workspaceId = activeWorkspaceId.value || null
  const until = Date.now() + duration * 60 * 60 * 1000
  writeNudgeTimestamp(dismissKey(type), until)
  try {
    const meta = { type, dismissedAt: new Date().toISOString(), workspaceId }
    localStorage.setItem(nudgeScopeKey('last-dismiss'), JSON.stringify(meta))
  } catch {}
  if (type === 'taskCreated') clearTaskCreatedNudge()
}

function handleTaskCreatedEvent(evt) {
  const now = Date.now()
  const detail = evt?.detail || {}
  const uid = authStore?.user?.uid
  if (!uid) return
  if (detail.createdBy && detail.createdBy !== uid) return
  const wsId = detail.workspaceId
  if (wsId && activeWorkspaceId.value && wsId !== activeWorkspaceId.value) return
  if (reminderNudge.value && reminderNudge.value.type !== 'taskCreated') return
  if (now < nudgeCooldownUntil.value) return
  markTaskCreatedNudge(detail.createdAt || now)
  nudgeCooldownUntil.value = now + NUDGE_COOLDOWN_MS
  writeNudgeTimestamp(nudgeCooldownKey(), nudgeCooldownUntil.value)
}

const onboardingSteps = computed(() => [
  {
    id: 'daily',
    title: 'Daily Focus',
    description: 'Your home for today’s priorities, streaks, and AI-assisted ordering 🧭',
    selector: '.daily-card',
    placement: 'right',
    icon: '🧭',
    aiTip: 'Say “Plan my day” — I’ll reorder with your energy, streaks, and memory-aware context.',
  },
  {
    id: 'calendar',
    title: 'Calendar Guardrails',
    description: 'Connect Google Calendar to auto-protect deep work and prep 🗓️',
    selector: '.calendar-sync-card',
    placement: 'left',
    icon: '🗓️',
    aiTip: 'I’ll pull meetings, prep agendas, and block white space before it disappears.',
  },
  {
    id: 'talk',
    title: 'Talk to Planner',
    description: 'Hands-free planning; speak tasks or ideas and I route them 🎙️',
    selector: '.talk-to-planner-entry',
    placement: 'bottom',
    icon: '🎙️',
    aiTip: 'Ask “Plan my next sprint” and I’ll capture, tag, and set reminders automatically.',
  },
  {
    id: 'weekly',
    title: 'Weekly / Monthly Pulse',
    description: 'Zoom out for insights, wins, and carryovers 📊',
    selector: '.weekly-card',
    placement: 'left',
    icon: '📊',
    aiTip: 'Ask for a recap — I’ll use your tasks, journal, and captures to build a highlight reel.',
  },
  {
    id: 'journal',
    title: 'Journal 2.0',
    description: 'Voice + text + scan-to-plan — all in one reflective space 🪶',
    selector: '.journal-card',
    placement: 'top',
    icon: '🪶',
    aiTip: 'Speak or scan scribbles; I’ll transcribe, summarize, and track your streaks.',
  },
  {
    id: 'reminders',
    title: 'Reminders & Nudges',
    description: 'WhatsApp, SMS, email, or voice reminders with smart timing 🔔',
    selector: '.reminders-card',
    placement: 'top',
    icon: '🔔',
    aiTip: 'Turn on nudges for critical tasks; I’ll avoid meeting conflicts automatically.',
  },
])

const notificationPrefs = computed(() => {
  const prefs = userPrefs.value?.notifications
  if (!prefs || typeof prefs !== 'object') return null
  return Object.keys(prefs).length ? prefs : null
})
function resolveNotificationChannels(prefs) {
  if (!prefs || typeof prefs !== 'object') return []
  if (Array.isArray(prefs.channels)) {
    return prefs.channels.map((c) => String(c).toLowerCase())
  }
  const channels = []
  if (prefs.email) channels.push('email')
  if (prefs.whatsapp) channels.push('whatsapp')
  if (prefs.sms) channels.push('sms')
  if (prefs.voice_call) channels.push('voice_call')
  if (prefs.pwa || prefs.push) channels.push('pwa')
  return channels
}
function isValidE164(value) {
  const raw = String(value || '').trim()
  return /^\+[1-9]\d{6,14}$/.test(raw)
}

function isValidEmailAddress(value) {
  const raw = String(value || '').trim()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)
}

const notificationChannels = computed(() => resolveNotificationChannels(notificationPrefs.value))
const whatsappNumber = computed(() => String(integrationEndpoints.value?.whatsapp?.phone || '').trim())
const emailAddress = computed(() => {
  const integrationsEmail = integrationEndpoints.value?.email
  const fallback = authStore?.user?.email
  return String(integrationsEmail || fallback || '').trim()
})
const pushPermission = computed(() => {
  try {
    return typeof Notification !== 'undefined' ? Notification.permission : 'default'
  } catch {
    return 'default'
  }
})
const reminderChannelState = computed(() => {
  const channels = notificationChannels.value
  const wantsWhatsApp = channels.includes('whatsapp')
  const wantsPush = channels.includes('pwa')
  const wantsEmail = channels.includes('email')
  const whatsappReady = wantsWhatsApp && isValidE164(whatsappNumber.value)
  const pushReady = wantsPush && pushPermission.value === 'granted'
  const emailReady = wantsEmail && isValidEmailAddress(emailAddress.value)
  const enabled = whatsappReady || pushReady || emailReady
  const pushBlocked = wantsPush && pushPermission.value === 'denied'
  return {
    channels,
    wantsWhatsApp,
    whatsappReady,
    wantsPush,
    pushPermission: pushPermission.value,
    pushBlocked,
    wantsEmail,
    emailReady,
    enabled,
  }
})
const notificationsEnabled = computed(() => reminderChannelState.value.enabled)
const reminderNudgeReason = computed(() => {
  const state = reminderChannelState.value
  if (state.enabled) return 'enabled'
  if (state.wantsWhatsApp && !state.whatsappReady) return 'whatsappMissing'
  if (state.pushBlocked) return 'pushBlocked'
  return 'allOff'
})

function resolveReminderCta(reason) {
  if (reason === 'pushBlocked') return 'Enable WhatsApp reminders instead'
  if (reason === 'whatsappMissing') return 'Add WhatsApp number to get reminders'
  return 'Enable reminders'
}

function resolveReminderDismissLabel(type) {
  return type === 'taskCreated' ? 'Hide' : 'Snooze 24h'
}

const todayKeyRef = computed(() => toLocalDateKey(new Date()))
const tomorrowKeyRef = computed(() => {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return toLocalDateKey(d)
})
const carryoverCandidates = computed(() => {
  const todayKey = todayKeyRef.value
  return (allTasks.value || [])
    .filter((t) => {
      if (!t || t.completed) return false
      const fromPreviousDay = t.date < todayKey
      const flagged = t.is_carryover === true && t.date < todayKey
      return fromPreviousDay || flagged
    })
    .sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1
      return (a.createdAt || 0) - (b.createdAt || 0)
    })
})
const carryoverCount = computed(() => carryoverCandidates.value.length)
const showCarryoverBanner = computed(() => carryoverCount.value > 0 && !carryoverDismissedToday.value)
const overdueCount = computed(() =>
  (allTasks.value || []).filter((t) => {
    if (!t || t.completed) return false
    const date = t.date
    if (!date) return false
    return date < todayKeyRef.value
  }).length
)
const dueSoonCount = computed(() =>
  (allTasks.value || []).filter((t) => {
    if (t?.completed) return false
    const date = t?.date || ''
    return date === todayKeyRef.value || date === tomorrowKeyRef.value
  }).length
)
const taskCreatedFresh = computed(() => {
  if (!taskCreatedAt.value) return false
  return Date.now() - taskCreatedAt.value < TASK_CREATED_TTL_MS
})
const reminderNudge = computed(() => {
  if (notificationsEnabled.value) return null
  const reason = reminderNudgeReason.value
  const cta = resolveReminderCta(reason)
  if (overdueCount.value > 0 && !isNudgeDismissed('overdue')) {
    return {
      type: 'overdue',
      icon: '⚠️',
      title: 'You have overdue tasks',
      body: 'Reminders could help you stay on track this week.',
      cta,
      dismissLabel: resolveReminderDismissLabel('overdue'),
    }
  }
  if (dueSoonCount.value > 0 && !isNudgeDismissed('dueSoon')) {
    return {
      type: 'dueSoon',
      icon: '⏰',
      title: 'Tasks are due soon',
      body: 'Turn on reminders so you do not miss them.',
      cta,
      dismissLabel: resolveReminderDismissLabel('dueSoon'),
    }
  }
  if (taskCreatedFresh.value && !isNudgeDismissed('taskCreated')) {
    return {
      type: 'taskCreated',
      icon: '🔔',
      title: 'Want reminders for this task?',
      body: 'Set up reminders in a few seconds so nothing slips.',
      cta,
      dismissLabel: resolveReminderDismissLabel('taskCreated'),
    }
  }
  return null
})

watch(notificationsEnabled, (enabled) => {
  if (enabled) clearTaskCreatedNudge()
})

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
const ONBOARDING_SNOOZE_HOURS = 24
let onboardingTimer = null

function normalizeTimestamp(value) {
  if (!value) return null
  if (typeof value === 'string') return value
  if (value instanceof Date) return value.toISOString()
  if (typeof value?.toDate === 'function') {
    try {
      return value.toDate().toISOString()
    } catch {
      return null
    }
  }
  if (typeof value?.seconds === 'number') {
    try {
      return dayjs.unix(value.seconds).toISOString()
    } catch {
      return null
    }
  }
  return null
}

function syncOnboardingFromPreferences(pref = {}) {
  let raw = {}
  if (pref && Object.prototype.hasOwnProperty.call(pref, 'onboarding')) {
    raw = pref.onboarding || {}
  } else if (
    Object.prototype.hasOwnProperty.call(pref || {}, 'completed') ||
    Object.prototype.hasOwnProperty.call(pref || {}, 'showLaterUntil') ||
    Object.prototype.hasOwnProperty.call(pref || {}, 'lastStep')
  ) {
    raw = pref || {}
  }
  onboardingStatus.value = {
    completed: !!raw?.completed,
    lastStep: Number(raw?.lastStep || 0),
    showLaterUntil: normalizeTimestamp(raw?.showLaterUntil),
    completedAt: normalizeTimestamp(raw?.completedAt),
  }
}

function shouldLaunchOnboarding() {
  if (!authStore.user?.uid) return false
  if (onboardingStatus.value.completed) return false
  if (onboardingStatus.value.showLaterUntil) {
    try {
      if (dayjs().isBefore(dayjs(onboardingStatus.value.showLaterUntil))) return false
    } catch {
      /* noop */
    }
  }
  return true
}

function maybeLaunchOnboarding(reason = 'auto') {
  // Tour temporarily disabled; keep function as no-op for now
  return
}

async function persistOnboardingStatus(patch = {}) {
  if (!authStore.user?.uid) return
  const payload = { ...patch }
  if (payload.lastStep === undefined) payload.lastStep = onboardingStatus.value.lastStep || 0
  const cleanPayload = {}
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined) cleanPayload[key] = value
  })
  if (!Object.keys(cleanPayload).length) return
  try {
    await updateOnboardingStatus(authStore.user.uid, cleanPayload)
    onboardingStatus.value = {
      ...onboardingStatus.value,
      ...cleanPayload,
    }
  } catch (error) {
    console.warn('Failed to update onboarding status', error?.response?.data || error?.message || error)
  }
}

function handleOnboardingStarted() {
  persistOnboardingStatus({ startedAt: new Date().toISOString(), completed: false })
}

function handleOnboardingStep(evt) {
  if (!evt?.step) return
  onboardingStatus.value = {
    ...onboardingStatus.value,
    lastStep: evt.step,
  }
}

async function handleOnboardingFinished() {
  onboardingTourVisible.value = false
  await persistOnboardingStatus({
    completed: true,
    completedAt: new Date().toISOString(),
    showLaterUntil: null,
  })
}

async function handleOnboardingSkipped() {
  onboardingTourVisible.value = false
  await persistOnboardingStatus({
    completed: true,
    skippedAt: new Date().toISOString(),
  })
}

async function handleOnboardingLater() {
  onboardingTourVisible.value = false
  onboardingSessionPlayed.value = false
  if (onboardingTimer) {
    clearTimeout(onboardingTimer)
    onboardingTimer = null
  }
  const snoozeUntil = dayjs().add(ONBOARDING_SNOOZE_HOURS, 'hour').toISOString()
  await persistOnboardingStatus({
    showLaterUntil: snoozeUntil,
    completed: false,
    lastDeferredAt: new Date().toISOString(),
  })
}

function handleOnboardingReplayEvent() {
  // Tour temporarily disabled
  return
}

function normalizeIntegrationEndpoints(integrations = {}) {
  const whatsappPhone = String(integrations?.whatsapp?.phone || '').trim()
  const email = String(integrations?.email || authStore?.user?.email || '').trim()
  return {
    whatsapp: { phone: whatsappPhone },
    email,
  }
}

async function bootstrapPreferences(uid) {
  try {
    const prefs = await getUserPreferences(uid)
    userPrefs.value = prefs || { notifications: {}, integrations: {} }
    syncOnboardingFromPreferences(prefs || {})
    maybeLaunchOnboarding()
  } catch (error) {
    console.warn('Failed to load user prefs:', error)
  }
  try {
    const integrations = await getIntegrations(uid)
    integrationEndpoints.value = normalizeIntegrationEndpoints(integrations || {})
  } catch (error) {
    integrationEndpoints.value = normalizeIntegrationEndpoints({})
    console.warn('Failed to load integrations:', error)
  }
}

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

const activeTaskExists = computed(() => {
  const id = activeTaskId.value
  if (!id) return false
  const pool = [...dailyTasks.value, ...weeklyTasks.value, ...monthlyTasks.value]
  return pool.some((t) => t?.id === id)
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
function formatNapkinDate(ms) {
  try {
    return dayjs(ms).format('MMM D, h:mm A')
  } catch {
    return new Date(ms).toLocaleString()
  }
}

async function toggleComplete(task) {
  task.completed = !task.completed
  if (task.completed && activeTaskId.value === task.id) activeTaskId.value = null
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

function markTaskActive(task) {
  if (!task || task.completed) return
  activeTaskId.value = task.id === activeTaskId.value ? null : task.id
}

watch(
  () => [dailyTasks.value, weeklyTasks.value, monthlyTasks.value].map((list) => list.map((t) => t.id).join(',')).join(';'),
  () => {
    if (!activeTaskId.value) return
    if (!activeTaskExists.value) activeTaskId.value = null
  },
)

onMounted(async () => {
  await refreshAllTasks().catch(() => {})
  try {
    carryoverDismissedToday.value =
      localStorage.getItem(`carryover:dismiss:${todayKeyRef.value}`) === '1'
  } catch {
    carryoverDismissedToday.value = false
  }
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

const allTasksPreset = ref('thisWeek')
const allTasksStartDate = ref(toLocalDateKey(startOfWeek))
const allTasksEndDate = ref(toLocalDateKey(endOfWeek))
const allTasksStatus = ref('all')
const allTasksCategory = ref('All')
const allTasksSearch = ref('')
const allTasksStatusOptions = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'completed', label: 'Done' },
]
let applyingAllTasksPreset = false

const allTasksPresets = computed(() => [
  { key: 'thisWeek', label: 'This week', hint: 'Week view' },
  { key: 'last7', label: 'Last 7 days', hint: 'Retro' },
  { key: 'next7', label: 'Next 7 days', hint: 'Upcoming' },
  { key: 'thisMonth', label: 'This month', hint: dayjs(today).format('MMM') },
  { key: 'custom', label: 'Custom range', hint: 'Pick dates' },
])

const normalizedAllTaskRange = computed(() => {
  const start = allTasksStartDate.value || todayKeyRef.value
  const end = allTasksEndDate.value || start
  if (start > end) return { start: end, end: start }
  return { start, end }
})

const allTasksRangeLabel = computed(() => {
  const { start, end } = normalizedAllTaskRange.value
  const startFmt = start ? dayjs(start).format('MMM D') : '—'
  const endFmt = end ? dayjs(end).format('MMM D') : startFmt
  const days = start && end ? Math.max(1, dayjs(end).diff(dayjs(start), 'day') + 1) : 0
  return days ? `${startFmt} → ${endFmt} · ${days} day${days === 1 ? '' : 's'}` : `${startFmt} → ${endFmt}`
})

function resolveAllTasksPresetRange(key) {
  const now = dayjs()
  if (key === 'thisWeek') return { start: toLocalDateKey(startOfWeek), end: toLocalDateKey(endOfWeek) }
  if (key === 'last7')
    return { start: toLocalDateKey(now.subtract(6, 'day').toDate()), end: toLocalDateKey(now.toDate()) }
  if (key === 'next7')
    return { start: toLocalDateKey(now.toDate()), end: toLocalDateKey(now.add(6, 'day').toDate()) }
  if (key === 'thisMonth') return { start: toLocalDateKey(startOfMonth), end: toLocalDateKey(endOfMonth) }
  return {
    start: allTasksStartDate.value || todayKeyRef.value,
    end: allTasksEndDate.value || allTasksStartDate.value || todayKeyRef.value,
  }
}

function applyAllTasksPreset(key) {
  const { start, end } = resolveAllTasksPresetRange(key)
  applyingAllTasksPreset = true
  allTasksStartDate.value = start
  allTasksEndDate.value = end
  allTasksPreset.value = key
  setTimeout(() => {
    applyingAllTasksPreset = false
  }, 0)
}

const allTasksRangePool = computed(() => {
  const { start, end } = normalizedAllTaskRange.value
  const safeStart = start || todayKeyRef.value
  const safeEnd = end || safeStart
  const fallback = [...dailyTasks.value, ...weeklyTasks.value, ...monthlyTasks.value]
  const source = (allTasks.value && allTasks.value.length ? allTasks.value : fallback) || []
  const uniqueSource = Array.from(new Map(source.map((t) => [t.id, t])).values())
  return uniqueSource.filter((task) => {
    const plannedRaw =
      typeof task.date === 'string' ? task.date : task.date ? toYMD(task.date?.toDate?.() || task.date) : null
    const planned = plannedRaw || safeStart
    return planned >= safeStart && planned <= safeEnd
  })
})

const filteredAllTasks = computed(() => {
  const search = allTasksSearch.value.trim().toLowerCase()
  const status = allTasksStatus.value
  const targetCategory = allTasksCategory.value === 'All' ? null : resolveCategory(allTasksCategory.value)

  const list = allTasksRangePool.value.filter((task) => {
    const cat = resolveCategory(task?.category)
    if (targetCategory && cat !== targetCategory) return false
    if (status === 'pending' && task.completed) return false
    if (status === 'completed' && !task.completed) return false
    if (search) {
      const title = String(task.title || '').toLowerCase()
      const details = String(task.details || '').toLowerCase()
      if (!title.includes(search) && !details.includes(search)) return false
    }
    return true
  })

  return list.sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1
    if (a.date !== b.date) return a.date > b.date ? 1 : -1
    return (b.createdAt || 0) - (a.createdAt || 0)
  })
})

const allTasksRangeStats = computed(() => {
  const base = allTasksRangePool.value
  const total = base.length
  const completed = base.filter((t) => t.completed).length
  const pending = Math.max(0, total - completed)
  const overdue = base.filter((t) => !t.completed && (t.date || '') < todayKeyRef.value).length
  return { total, completed, pending, overdue }
})

watch(
  [allTasksStartDate, allTasksEndDate],
  ([start, end]) => {
    if (applyingAllTasksPreset) return
    if (start && end && start > end) {
      allTasksEndDate.value = start
    }
    allTasksPreset.value = 'custom'
  },
)

const unsubscribe = ref(null)

function tasksCollection() {
  return collection(db, 'tasks')
}

function handleTaskSnapshot(snapshot) {
  const userTasks = snapshot.docs.map((docSnap) => {
    const data = docSnap.data()
    return {
      id: docSnap.id,
      ...data,
      category: resolveCategory(data?.category),
      date: typeof data.date === 'string' ? data.date : toYMD(data.date?.toDate?.() || data.date),
      createdAt: data.createdAt?.toMillis?.() || data.createdAt || 0,
    }
  })
  dailyTasks.value = userTasks.filter((t) => t.date === toYMD(today))
  const weekDays = ymdRange(startOfWeek, endOfWeek)
  weeklyTasks.value = userTasks.filter((t) => weekDays.includes(t.date))
  const monthDays = ymdRange(startOfMonth, endOfMonth)
  monthlyTasks.value = userTasks.filter((t) => monthDays.includes(t.date))
  buildRotatingInsights()
}

async function attachTaskListener(user) {
  if (unsubscribe.value) unsubscribe.value()
  if (!user) {
    dailyTasks.value = []
    weeklyTasks.value = []
    monthlyTasks.value = []
    return
  }
  const wsId = activeWorkspaceId.value
  if (!wsId) {
    dailyTasks.value = []
    weeklyTasks.value = []
    monthlyTasks.value = []
    return
  }
  const tasksQuery = query(tasksCollection(), where('workspaceId', '==', wsId))
  try {
    unsubscribe.value = onSnapshot(tasksQuery, async (snapshot) => {
      handleTaskSnapshot(snapshot)
    })
  } catch (error) {
    console.warn('Live tasks listener failed; falling back to one-time load', error?.message || error)
    loadTasks().catch(() => {})
  }
}

onMounted(() => {
  onAuthStateChanged(auth, (user) => {
    checkingAuth.value = false
    attachTaskListener(user)
  })
})

watch(activeWorkspaceId, () => {
  const user = auth.currentUser
  if (user) attachTaskListener(user)
})

onUnmounted(() => {
  if (unsubscribe.value) unsubscribe.value()
  detachNapkinListener()
  if (insightIntervalId.value) clearInterval(insightIntervalId.value)
  if (typeof window !== 'undefined') {
    window.removeEventListener('pcai:onboarding:request', handleOnboardingReplayEvent)
  }
  if (onboardingTimer) {
    clearTimeout(onboardingTimer)
    onboardingTimer = null
  }
  if (savePrefsTimer) {
    clearTimeout(savePrefsTimer)
    savePrefsTimer = null
  }
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
  if (!authStore?.user?.uid) {
    return redirectToLogin()
  }
  if (isGuest.value) {
    ElMessage({ type: 'warning', message: 'Sign in to move tasks forward.', duration: 2000 })
    return
  }
  try {
    const candidates = carryoverCandidates.value
    if (!candidates.length) {
      ElMessage({ message: 'All unfinished tasks are already in Today.', type: 'info', duration: 1600 })
      return
    }
    const normalizedLimit =
      limit === 'all' ? candidates.length : Math.max(1, Number(limit) || 1)
    const selection = candidates.slice(0, normalizedLimit)
    const todayKey = toLocalDateKey(new Date())
    await moveTasks(
      selection.map((t) => ({ id: t.id, previousDate: t.previousDate || t.date })),
      todayKey,
      { rolledOver: true, status: 'pending', completed: false },
    )
    await refreshAllTasks(true)
    const movedAll = selection.length === candidates.length
    if (movedAll) carryoverDismissedToday.value = true
    ElMessage({
      message: movedAll
        ? 'All unfinished tasks moved to today ✅'
        : `${selection.length} task${selection.length === 1 ? '' : 's'} moved to today ✅`,
      type: 'success',
      duration: 1600,
    })
  } catch (error) {
    const msg = error?.response?.data || error?.message || ''
    const perm = typeof error?.code === 'string' && error.code.includes('permission')
    console.warn('applyCarryover failed', msg)
    ElMessage({
      type: perm ? 'warning' : 'error',
      message: perm ? 'You do not have permission to move tasks in this workspace.' : 'Could not move tasks right now.',
      duration: 2400,
    })
  }
}

async function ignoreCarryover() {
  try {
    const todayKey = toLocalDateKey(new Date())
    carryoverDismissedToday.value = true
    try {
      localStorage.setItem(`carryover:dismiss:${todayKey}`, '1')
    } catch {
      /* noop */
    }
    ElMessage({ message: 'Banner dismissed for today', type: 'info', duration: 1600 })
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
      const iso = resolveReminderIso(payload)
      if (!iso) return
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

watch(
  () => authStore?.user?.uid,
  (uid) => {
    if (!uid) {
      userPrefs.value = { notifications: {}, integrations: {} }
      integrationEndpoints.value = { whatsapp: { phone: '' }, email: '' }
      onboardingStatus.value = {
        completed: false,
        lastStep: 0,
        showLaterUntil: null,
        completedAt: null,
      }
      onboardingTourVisible.value = false
      onboardingSessionPlayed.value = false
      return
    }
    bootstrapPreferences(uid)
  },
  { immediate: true }
)

watch(
  () => authStore.user?.preferences?.onboarding,
  (value) => {
    if (!value) return
    syncOnboardingFromPreferences(value)
  },
  { immediate: true }
)

watch(onboardingTourVisible, (visible) => {
  if (visible) onboardingSessionPlayed.value = true
})

watch(
  () => ({
    uid: authStore.user?.uid,
    pending: isFirstVisit.value,
  }),
  async ({ uid, pending }) => {
    if (!uid || !pending || firstVisitSeeding.value) return
    firstVisitSeeding.value = true
    try {
      await seedGuestStarterTasks(uid, { source: 'dashboard_bootstrap', workspaceId: workspaceStore.activeWorkspaceId })
      authStore.user = {
        ...(authStore.user || {}),
        firstVisitInitialized: true,
      }
    } catch (error) {
      console.warn('Starter tasks bootstrap failed', error?.response?.data || error?.message || error)
    } finally {
      firstVisitSeeding.value = false
    }
  },
  { immediate: true }
)

watch(
  () => ({
    uid: authStore.user?.uid,
    guest: isGuest.value,
  }),
  ({ uid, guest }) => {
    if (!uid || !guest || guestDashboardTracked.value) return
    guestDashboardTracked.value = true
    try {
      trackGuestDashboardLoaded({
        starterTasksReady: authStore?.user?.firstVisitInitialized === true,
      })
    } catch (error) {
      console.warn('guest_dashboard_loaded track failed', error?.message || error)
    }
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
  if (typeof window !== 'undefined') {
    window.addEventListener('pcai:onboarding:request', handleOnboardingReplayEvent)
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
      await loadGoogleStatus()
    } catch {
      /* noop */
    }
  },
  { immediate: true }
)

onMounted(fetchUsage)
onMounted(loadGoogleStatus)

watch(
  () => [activeWorkspaceId.value, authStore?.user?.uid],
  () => {
    taskCreatedAt.value = readNudgeTimestamp(taskCreatedKey())
    nudgeCooldownUntil.value = readNudgeTimestamp(nudgeCooldownKey())
  },
  { immediate: true }
)

onMounted(() => {
  try {
    window.addEventListener('pcai:task-created', handleTaskCreatedEvent)
  } catch {
    /* noop */
  }
})

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
  try {
    window.removeEventListener('pcai:task-created', handleTaskCreatedEvent)
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

.greeting-headline-wrapper {
  min-height: 3.25rem;
  display: flex;
  align-items: center;
  overflow: hidden;
}

@media (max-width: 640px) {
  .greeting-headline-wrapper {
    min-height: 2.6rem;
  }
}

.greeting-fade-enter-active,
.greeting-fade-leave-active {
  transition: opacity 0.35s ease, transform 0.35s ease;
}
.greeting-fade-enter-from,
.greeting-fade-leave-to {
  opacity: 0;
  transform: translateY(6px);
}

.insight-wrapper {
  min-height: 3.5rem;
  display: flex;
  align-items: center;
}

@media (max-width: 640px) {
  .insight-wrapper {
    min-height: 3rem;
  }
}

</style>
