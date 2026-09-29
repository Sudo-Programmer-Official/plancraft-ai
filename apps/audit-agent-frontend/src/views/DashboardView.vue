<!-- src/views/DashboardView.vue -->
<template>
  <div v-if="checkingAuth" class="px-4 py-8 text-center text-gray-400">
    Checking session…
  </div>
  <main
    v-else
    class="today-dashboard min-h-screen w-full min-w-0 max-w-5xl mx-auto overflow-x-hidden px-4 py-4 pb-8 transition-colors sm:px-5 md:px-6 flex flex-col gap-5 lg:gap-7"
  >
    <OnboardingTour
      v-model="onboardingTourVisible"
      :steps="onboardingSteps"
      :first-name="displayName"
      @finished="finishOnboarding"
      @skipped="skipOnboarding"
      @later="postponeOnboarding"
    />

    <section
      v-if="false && showQuickSetupBanner"
      class="dashboard-section w-full overflow-hidden max-w-full px-2 sm:px-4 order-2"
    >
      <div class="dashboard-card quick-setup-banner flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="space-y-2">
          <p class="text-[11px] uppercase tracking-[0.3em] text-indigo-200/80">Quick setup</p>
          <h2 class="text-lg sm:text-xl font-semibold text-slate-100">
            {{ quickSetupState?.completedSteps || 0 }}/{{ quickSetupState?.totalSteps || 0 }} setup items complete
          </h2>
          <p class="text-sm text-indigo-100/85">
            {{ quickSetupMissingLabels.length ? `Still needed: ${quickSetupMissingLabels.join(', ')}.` : 'You can finish the remaining optional setup any time.' }}
          </p>
        </div>
        <div class="flex items-center gap-3">
          <div class="quick-setup-banner__progress">
            <div class="quick-setup-banner__bar" :style="{ width: `${quickSetupState?.completionPercent || 0}%` }" />
          </div>
          <el-button type="primary" class="!rounded-lg font-semibold" @click="openQuickSetup">
            Continue setup
          </el-button>
        </div>
      </div>
    </section>

    <!-- Tier 1 · Today context -->
    <section class="today-intro-section dashboard-section order-1">
      <div class="today-intro">
        <div class="min-w-0">
          <p class="today-eyebrow">Today</p>
          <div class="greeting-headline-wrapper">
            <transition name="greeting-fade" mode="out-in">
              <h1 class="today-intro__title" :key="greetingHeadline">
                {{ greetingHeadline }}
              </h1>
            </transition>
          </div>
          <p class="today-intro__summary">
            {{ dailyTasks.length }} task{{ dailyTasks.length === 1 ? '' : 's' }} today
            <span aria-hidden="true">·</span>
            Pick one and make progress.
          </p>
        </div>

        <div v-if="activeFocusTask" class="today-active-focus">
          <span class="today-active-focus__label">
            Focusing now<span v-if="focus.phase === 'running' && focus.remainingMs != null"> · {{ formatFocusRemaining(focus.remainingMs) }} remaining</span>
          </span>
          <span class="today-active-focus__task">{{ activeFocusTask.title }}</span>
        </div>
        <div v-else-if="nextUpTask" class="today-next-up">
          <span class="today-next-up__label">Next up</span>
          <span class="today-next-up__task">{{ nextUpTask.title }}</span>
          <span class="today-next-up__meta">{{ taskPreviewMeta(nextUpTask) }}</span>
        </div>
      </div>
    </section>

    <section v-if="showCarryoverBanner" class="backlog-review dashboard-section order-4">
      <div class="backlog-review__copy">
        <p class="backlog-review__eyebrow">PlanCraft noticed</p>
        <h2>
          {{ carryoverCount }} older task{{ carryoverCount === 1 ? '' : 's' }} need attention.
        </h2>
        <p>I can help clean them up.</p>
      </div>
      <div class="backlog-review__actions">
        <RouterLink to="/inbox" class="backlog-review__primary">Review backlog</RouterLink>
        <details class="backlog-review__menu">
          <summary aria-label="More backlog actions">···</summary>
          <div class="backlog-review__menu-popover">
            <RouterLink to="/tasks">Open all tasks</RouterLink>
            <button type="button" @click="ignoreCarryover">Hide for today</button>
          </div>
        </details>
      </div>
    </section>

    <section v-if="false && !isMobileDashboard" class="dashboard-section w-full overflow-hidden max-w-full px-2 sm:px-4 order-6">
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

    <section v-if="false && isMobileDashboard" class="dashboard-section w-full overflow-hidden max-w-full px-2 sm:px-4 order-6">
      <div class="dashboard-card flex items-center justify-between gap-3">
        <div class="space-y-1">
          <p class="text-[11px] uppercase tracking-[0.3em] text-indigo-200/80">Workspace Modules</p>
          <p class="text-xs text-indigo-200/80">
            {{ mobileModulesExpanded ? 'Showing full dashboard' : 'Showing focused daily view' }}
          </p>
        </div>
        <button
          type="button"
          class="px-3 py-1.5 rounded-lg border border-white/20 bg-transparent text-xs text-indigo-100 hover:border-indigo-300/70 transition"
          @click="mobileModulesExpanded = !mobileModulesExpanded"
        >
          {{ mobileModulesExpanded ? 'Show less' : 'Show more' }}
        </button>
      </div>
    </section>

    <!-- Tier 2 · Workspaces -->
    <div
      v-if="showDaily"
      id="focus"
      class="dashboard-section w-full overflow-hidden max-w-full px-2 sm:px-4 order-3"
    >
        <div
          class="dashboard-card daily-card today-workspace max-w-full min-w-0 space-y-5"
          data-onboarding="today-focus"
          :class="{ 'daily-card--fullscreen': isTodayFullscreen }"
        >
          <div class="daily-card__header">
            <div class="daily-card__heading">
              <div class="focus-date-row flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap w-full">
                <button
                  type="button"
                  class="focus-date-calendar-btn hidden sm:flex items-center justify-center w-8 h-8 rounded-lg text-slate-300 hover:bg-slate-700/60 hover:text-slate-100 transition shrink-0"
                  aria-label="Choose date"
                  @click="openFocusDatePicker"
                >
                    <span class="text-xs font-medium" aria-hidden="true">Date</span>
                </button>
                <div class="focus-date-main">
                  <div class="focus-date-pill flex w-full sm:w-auto flex-1 sm:flex-none items-center gap-1 rounded-xl bg-slate-800/60 border border-slate-700/50 px-1 py-0.5 min-w-0">
                    <button
                      type="button"
                      class="p-1.5 rounded-md text-slate-300 hover:bg-slate-700/60 hover:text-slate-100 transition"
                      aria-label="Previous day"
                      @click="prevFocusDay"
                    >
                      <span class="text-sm font-medium">&lt;</span>
                    </button>
                    <span class="px-2 py-1 text-sm font-medium text-slate-100 min-w-0 flex-1 text-center truncate max-w-[180px] sm:max-w-none">
                      {{ focusDateLabel }}
                    </span>
                    <button
                      type="button"
                      class="p-1.5 rounded-md text-slate-300 hover:bg-slate-700/60 hover:text-slate-100 transition"
                      aria-label="Next day"
                      @click="nextFocusDay"
                    >
                      <span class="text-sm font-medium">&gt;</span>
                    </button>
                  </div>
                  <button
                    type="button"
                    class="today-fullscreen-btn today-fullscreen-btn--inline"
                    :aria-pressed="isTodayFullscreen"
                    :title="isTodayFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'"
                    @click="toggleTodayFullscreen"
                  >
                    <span v-if="!isTodayFullscreen">⤢</span>
                    <span v-else>⤡</span>
                  </button>
                </div>
                <button
                  v-if="!isFocusToday"
                  type="button"
                  class="jump-today-btn text-xs font-medium text-indigo-300 hover:text-indigo-200 px-2 py-1 rounded-md hover:bg-indigo-900/40 transition shrink-0 order-last sm:order-none"
                  @click="jumpFocusToToday"
                >
                  Jump to Today
                </button>
              </div>
            </div>
            <div class="daily-card__actions">
              <button
                type="button"
                class="today-fullscreen-btn today-fullscreen-btn--desktop"
                :aria-pressed="isTodayFullscreen"
                :title="isTodayFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'"
                @click="toggleTodayFullscreen"
              >
                <span v-if="!isTodayFullscreen">⤢</span>
                <span v-else>⤡</span>
              </button>
              <button
                @click="openPlanner"
                data-onboarding="plan-task"
                class="daily-card__plan-btn inline-flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg text-white bg-gradient-to-r from-pink-500 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 shadow-md transition"
              >
                <span class="text-base">＋</span>
                <span class="whitespace-nowrap">Add task</span>
              </button>
            </div>
          </div>

          <el-dialog
            v-model="showFocusDatePicker"
            title="Choose date"
            width="auto"
            class="focus-date-picker-dialog"
            @close="showFocusDatePicker = false"
          >
            <el-date-picker
              :model-value="focusSelectedDate ? parseLocalDateKey(focusSelectedDate) : null"
              type="date"
              :placeholder="'Pick a date'"
              format="MMM D, YYYY"
              value-format="YYYY-MM-DD"
              @update:model-value="onFocusDatePicked"
            />
          </el-dialog>

          <div class="category-filter-strip flex gap-2 sm:gap-3 overflow-x-auto pb-2 scrollbar-plan">
            <button
              v-for="category in categoryFilters"
              :key="category"
              type="button"
              @click="dashboardCategory = category"
              :class="[
                'category-filter-chip flex-shrink-0 px-3 py-1.5 rounded-lg font-medium text-xs transition-all duration-300 ease-in-out',
                dashboardCategory === category
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-800',
              ]"
            >
              {{ category }}
            </button>
          </div>

          <div>
            <div
              ref="dailyList"
              class="today-list overflow-y-auto max-h-[60vh] md:max-h-64 scrollbar-plan rounded-2xl pr-1"
              :class="{ 'today-list--fullscreen': isTodayFullscreen }"
            >
              <transition name="focus-list-fade" mode="out-in">
                <div
                  v-if="dashboardTasksLoading"
                  :key="`daily-loading-${focusSelectedDate}`"
                  class="dashboard-task-skeleton-list min-w-0"
                  aria-label="Loading tasks"
                >
                  <div v-for="index in 3" :key="`daily-skeleton-${index}`" class="dashboard-task-skeleton-card">
                    <span class="dashboard-task-skeleton-check" aria-hidden="true" />
                    <div class="dashboard-task-skeleton-content">
                      <span class="dashboard-task-skeleton-line dashboard-task-skeleton-line--title" />
                      <div class="dashboard-task-skeleton-meta">
                        <span class="dashboard-task-skeleton-pill" />
                        <span class="dashboard-task-skeleton-line dashboard-task-skeleton-line--meta" />
                      </div>
                    </div>
                    <span class="dashboard-task-skeleton-action" aria-hidden="true" />
                  </div>
                </div>
                <transition-group
                  v-else-if="visibleDaily.length"
                  :key="focusSelectedDate"
                  name="today-task"
                  tag="ul"
                  class="today-task-list space-y-2 text-sm"
                >
                  <li
                    v-for="task in visibleDaily"
                    :key="task.id"
                    class="today-task-row"
                    :class="{
                      'today-task-row--active': activeTaskId === task.id,
                      'today-task-row--completed': task.completed,
                    }"
                  >
                  <div class="today-task-row__main">
                    <button
                      type="button"
                      class="today-completion-ring"
                      :class="{ 'today-completion-ring--completed': task.completed }"
                      :aria-label="`${task.completed ? 'Mark' : 'Complete'} ${task.title}`"
                      @click.stop="toggleComplete(task)"
                    >
                      <span aria-hidden="true">{{ task.completed ? '✓' : '' }}</span>
                    </button>
                    <div class="today-task-row__content">
                      <div class="today-task-row__title-line">
                        <button
                          type="button"
                          class="today-task-title"
                          :class="{ 'today-task-title--completed': task.completed }"
                          @click.stop="openDialog(task)"
                        >
                          {{ task.title }}
                        </button>
                        <div
                          class="task-category-pill today-task-category"
                          :class="categoryColor(task.category)"
                        >
                          <span>{{ categoryLabel(task.category) }}</span>
                        </div>
                      </div>
                      <div class="today-task-meta">
                        <span>{{ task.date === todayKeyRef ? 'Today' : task.date }}</span>
                        <span v-if="focusRecommendation(task)" class="today-task-duration">
                          ~{{ focusRecommendation(task).minutes }} min
                        </span>
                        <span v-if="activeTaskId === task.id && focus.phase === 'running'" class="today-task-focus-status">
                          Focusing · {{ focus.remainingMs == null ? 'Open-ended' : formatFocusRemaining(focus.remainingMs) }} remaining
                        </span>
                        <a
                          v-if="taskMeetingLink(task)"
                          :href="taskMeetingLink(task).url"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="today-task-link"
                          :title="taskMeetingLink(task).label"
                        >
                          {{ taskMeetingLink(task).label }}
                        </a>
                      </div>
                    </div>
                  </div>
                  <div class="today-task-row__actions">
                    <FocusButton
                      v-if="!task.completed && focusRecommendation(task)"
                      :task="task"
                      :recommended-minutes="focusRecommendation(task).minutes"
                      :auto-start="true"
                      @started="handleFocusStarted"
                    />
                    <button
                      v-if="reminderActiveByTask[task.id]"
                      @click.stop="onReminderClick(task)"
                      class="today-task-reminder"
                      title="Reminder active — click to manage"
                    >
                      <span aria-hidden="true">•</span>
                      <span class="sr-only">Reminder active</span>
                    </button>
                    <TaskOptionsMenu
                      :task="task"
                      class="today-task-options"
                      :show-focus="!task.completed"
                      @edit="openDialog"
                      @toggle="toggleComplete"
                      @start-focus="startFocusFromMenu"
                    />
                  </div>
                </li>
                </transition-group>
              <ul v-else :key="`empty-${focusSelectedDate}`" class="space-y-2 text-sm text-slate-400 text-center py-6">
                <li>{{ emptyDailyMessage }}</li>
              </ul>
              </transition>
            </div>
          </div>

          <TaskPlannerDialog
            v-if="showPlanner"
            :open="showPlanner"
            :date="selectedTask ? (selectedTask.date || focusSelectedDate) : focusSelectedDate"
            :task="selectedTask"
            :edit-mode="!!selectedTask"
            @close="closePlanner"
            @saved="handleSaveAndSchedule"
          />
        </div>
      </div>

    <section v-if="isFocusToday && tomorrowTaskCount" class="tomorrow-preview dashboard-section order-5">
      <div class="tomorrow-preview__header">
        <div>
          <p class="tomorrow-preview__eyebrow">Tomorrow</p>
          <p class="tomorrow-preview__summary">
            {{ tomorrowTaskCount }} task{{ tomorrowTaskCount === 1 ? '' : 's' }} planned
          </p>
        </div>
        <RouterLink to="/tasks" class="tomorrow-preview__link">View →</RouterLink>
      </div>
      <ul class="tomorrow-preview__list" aria-label="Tomorrow's tasks">
        <li v-for="task in tomorrowTasks" :key="task.id">
          <span class="tomorrow-preview__task">{{ task.title }}</span>
          <span class="tomorrow-preview__meta">{{ taskPreviewMeta(task) }}</span>
        </li>
      </ul>
    </section>

    <div
      v-if="showAllTasks && showOptionalModules"
      class="dashboard-section w-full overflow-hidden max-w-full px-2 sm:px-4 order-5"
    >
        <div class="dashboard-card all-tasks-card max-w-full min-w-0 space-y-5">
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

            <div class="flex max-w-full min-w-0 flex-wrap items-center gap-3 p-3 rounded-2xl bg-slate-900/70 border border-slate-800/70">
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

              <div class="ml-auto flex max-w-full min-w-0 flex-wrap items-center gap-2 sm:flex-nowrap">
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
                <div class="relative min-w-0 w-full sm:w-auto">
                  <span class="absolute left-2 top-2.5 text-slate-500">🔍</span>
                  <input
                    v-model="allTasksSearch"
                    type="text"
                    placeholder="Search title or notes"
                    class="w-full min-w-0 pl-7 pr-3 py-2 rounded-lg bg-slate-800/80 border border-slate-700 text-xs text-slate-100 focus:border-indigo-400 focus:outline-none"
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
            v-if="dashboardTasksLoading"
            class="dashboard-task-skeleton-list"
            aria-label="Loading all tasks"
          >
            <div v-for="index in 4" :key="`all-skeleton-${index}`" class="dashboard-task-skeleton-card">
              <span class="dashboard-task-skeleton-check" aria-hidden="true" />
              <div class="dashboard-task-skeleton-content">
                <span class="dashboard-task-skeleton-line dashboard-task-skeleton-line--title" />
                <div class="dashboard-task-skeleton-meta">
                  <span class="dashboard-task-skeleton-pill" />
                  <span class="dashboard-task-skeleton-line dashboard-task-skeleton-line--meta" />
                </div>
              </div>
              <span class="dashboard-task-skeleton-action" aria-hidden="true" />
            </div>
          </div>
          <div
            v-else-if="filteredAllTasks.length"
            class="overflow-y-auto max-h-[60vh] md:max-h-72 scrollbar-plan rounded-2xl pr-1"
          >
            <ul class="space-y-2 text-sm">
              <li
                v-for="task in filteredAllTasks"
                :key="task.id"
                :class="[
                  'flex max-w-full min-w-0 justify-between gap-3 rounded-xl border p-3 transition',
                  activeTaskId === task.id
                    ? 'bg-indigo-900/60 border-indigo-500/60 shadow-[0_0_12px_rgba(99,102,241,0.35)]'
                    : 'bg-slate-900/70 border-slate-800/80 hover:border-indigo-500/40',
                ]"
              >
                <div class="flex min-w-0 flex-1 items-start gap-3">
                  <input
                    type="checkbox"
                    :checked="task.completed"
                    @change="() => toggleComplete(task)"
                    class="mt-1 w-4 h-4 cursor-pointer accent-indigo-500"
                  />
                  <div class="min-w-0 space-y-1">
                    <div class="flex flex-wrap items-center gap-2">
                      <span
                        class="min-w-0 break-words font-medium"
                        :class="{ 'line-through text-slate-500': task.completed, 'text-slate-100': !task.completed }"
                      >
                        {{ task.title }}
                      </span>
                      <div
                        class="task-category-pill inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800/80 text-[11px] font-medium shadow-sm"
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

    <section v-if="showOptionalModules" class="space-y-4 lg:space-y-5 order-7">
        <div
          v-if="showWeekly && showOptionalModules"
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
            v-if="dashboardTasksLoading"
            class="dashboard-task-skeleton-list"
            aria-label="Loading weekly tasks"
          >
            <div v-for="index in 3" :key="`weekly-skeleton-${index}`" class="dashboard-task-skeleton-card">
              <span class="dashboard-task-skeleton-check" aria-hidden="true" />
              <div class="dashboard-task-skeleton-content">
                <span class="dashboard-task-skeleton-line dashboard-task-skeleton-line--title" />
                <div class="dashboard-task-skeleton-meta">
                  <span class="dashboard-task-skeleton-pill" />
                  <span class="dashboard-task-skeleton-line dashboard-task-skeleton-line--meta" />
                </div>
              </div>
            </div>
          </div>
          <div
            v-else-if="filteredWeeklyPreview.length"
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
                      class="task-category-pill inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800/80 text-[11px] font-medium shadow-sm"
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
        v-if="showQuickLinks && showOptionalModules"
        class="dashboard-section w-full overflow-hidden max-w-full px-2 sm:px-4"
      >
        <div class="dashboard-card quick-links-card">
          <QuickLinksCard />
        </div>
      </div>

      <div
        v-if="showMonthly && showOptionalModules"
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

      <div v-if="showOptionalModules" class="dashboard-section w-full overflow-hidden max-w-full px-2 sm:px-4">
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
    </section>

<!-- Tier 3 · Analytics & Insights -->
<section class="space-y-4 lg:space-y-5 order-8">
  <div
    v-if="showJournal && showOptionalModules"
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
        v-if="showAIInsights && showOptionalModules"
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
    v-if="showNapkin && showOptionalModules"
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
          <div
            v-else-if="napkinPreview.length"
            class="space-y-3 max-h-[32rem] overflow-y-auto pr-1 sm:max-h-[34rem]"
          >
            <article
              v-for="item in napkinPreview"
              :key="item.id"
              class="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80 hover:border-indigo-500/60 transition space-y-2 overflow-hidden"
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
              <div class="max-h-64 overflow-y-auto pr-1 space-y-2">
                <p class="text-sm text-slate-50 whitespace-pre-line leading-relaxed">
                  {{ item.text }}
                </p>
                <p v-if="item.tags?.length" class="text-[11px] text-slate-400">
                  #{{ item.tags.slice(0, 4).join(' #') }}
                </p>
              </div>
            </article>
          </div>
          <div v-else class="text-sm text-slate-300 bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2">
            No napkin captures yet. Drop a quick note or voice memo to see it here.
          </div>
        </div>
      </div>

  <div v-if="false" class="dashboard-section w-full overflow-hidden max-w-full px-2 sm:px-4">
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
    <section v-if="false" class="dashboard-section w-full overflow-hidden max-w-full px-2 sm:px-4 order-9">
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
            data-onboarding="talk-to-planner"
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

    <transition name="completion-toast">
      <div v-if="completionToast" class="completion-toast" role="status" aria-live="polite">
        <span class="completion-toast__message">
          <span class="completion-toast__check" aria-hidden="true">✓</span>
          {{ completionToast.title }} completed
        </span>
        <button type="button" class="completion-toast__undo" @click="undoCompletion">Undo</button>
      </div>
    </transition>

  </main>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { auth } from '@/firebase/init'
import { onAuthStateChanged } from 'firebase/auth'
import { toLocalDateKey, parseLocalDateKey } from '@/utils/dateHelper'
import { summarizeTasks } from '@/services/aiService'
import OnboardingTour from '@/components/OnboardingTour.vue'
import { useAuthStore } from '@/stores/authStore'
import { useAccessStore } from '@/stores/accessStore'
import TaskPlannerDialog from '@/components/TaskPlannerDialog.vue'
import FocusButton from '@/components/focus/FocusButton.vue'
import TaskOptionsMenu from '@/components/TaskOptionsMenu.vue'
import { useFocusStore } from '@/stores/focusStore'
import { useTasks } from '@/composables/useTasks'
import { addTaskToFirebase, updateTaskInFirebase, fetchEntries } from '@/services/firebaseService'
import QuickLinksCard from '@/components/QuickLinksCard.vue'
import { useQuickSetupStore } from '@/stores/quickSetupStore'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { useAuthFlags } from '@/composables/useAuthFlags'
import { useDayClock } from '@/composables/useDayClock'
import { trackGuestDashboardLoaded } from '@/services/analytics'
import { getReminderStatus, scheduleReminder } from '@/services/reminderService'
import { listReports, generateReport } from '@/services/reportsService'
import api from '@/services/api'
import { getPreferences as getUserPreferences, updateOnboardingStatus } from '@/services/settingsService'
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
import { isNativePackagedApp } from '@/utils/nativeAuthSupport'
import { getEffectiveUserTimezone } from '@/utils/userTimezone'
import {
  getIncompleteQuickSetupLabels,
  isQuickSetupSnoozed,
  readQuickSetupState,
} from '@/utils/quickSetup'

dayjs.extend(utc)
dayjs.extend(timezone)

const { now: dayClockNow, todayKey: todayKeyRef } = useDayClock()
const authStore = useAuthStore()
const accessStore = useAccessStore()
const { isPremium, isGuest } = useAuthFlags()
const workspaceStore = useWorkspaceStore()
const activeWorkspaceId = computed(() => {
  try {
    return workspaceStore.activeWorkspaceId || localStorage.getItem('activeWorkspaceId') || null
  } catch {
    return workspaceStore.activeWorkspaceId || null
  }
})
const activeWorkspace = computed(() => {
  try {
    return (
      workspaceStore.activeWorkspace ||
      workspaceStore.workspaces?.find?.((workspace) => workspace?.id === activeWorkspaceId.value) ||
      null
    )
  } catch {
    return null
  }
})
const isPersonalActiveWorkspace = computed(() => {
  const workspace = activeWorkspace.value
  if (!workspace) return false
  if (String(workspace?.workspaceType || '').trim().toLowerCase() === 'personal') return true
  return String(workspace?.name || '').trim().toLowerCase() === 'personal'
})
const routerNav = useRouter()
const isFirstVisit = computed(() => isGuest.value && authStore?.user?.firstVisitInitialized !== true)
const guestDashboardTracked = ref(false)
const firstVisitSeeding = ref(false)

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
const dashboardViewportWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1280)
const isMobileDashboard = computed(() => dashboardViewportWidth.value < 768)
const mobileModulesExpanded = ref(false)
// Today is intentionally an execution surface. Reporting, inventory, journal,
// reminders, and workspace modules keep their own routes instead of competing
// with the next task here.
const showOptionalModules = computed(() => false)
let savePrefsTimer = null
let lastPrefsRequestId = 0

function syncDashboardViewport() {
  if (typeof window === 'undefined') return
  dashboardViewportWidth.value = window.innerWidth
  mobileModulesExpanded.value = dashboardViewportWidth.value >= 768
}

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

const showDaily = computed(() => true)
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
    const access = await accessStore.fetchAccess(uid, { minIntervalMs: 0 })
    usage.value = {
      used: Number(access?.today?.reminders || 0),
      limit: access?.limits?.remindersPerDay == null ? 0 : Number(access.limits.remindersPerDay || 0),
      plan: access?.effectivePlan || '',
    }
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
        onError: () => {
          // If we already have data, keep showing it instead of a scary banner.
          if (!napkinItems.value.length) {
            napkinError.value = 'Napkin feed is unavailable right now. Please refresh to try again.'
          }
          napkinLoading.value = false
        },
      },
    )
  } catch {
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
const { allTasks, refreshAllTasks, mergeTasksLocally, toggleComplete: toggleTaskComplete } = useTasks()
const aiSummary = ref(null)
const dailyTasks = ref([])
const weeklyTasks = ref([])
const monthlyTasks = ref([])
const activeTaskId = ref(null)
const focus = useFocusStore()
const recentlyCompletedTaskIds = ref(new Set())
const completionToast = ref(null)
let completionToastTimer = null
const completionRemovalTimers = new Map()
const showPlanner = ref(false)
const isTodayFullscreen = ref(false)
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

const quickSetupStore = useQuickSetupStore()
const reminderActiveByTask = ref({})
const taskMeetingLink = (task) => resolveTaskMeetingLink(task)
const checkingAuth = ref(true)
const dashboardTasksLoading = ref(true)
const userPrefs = ref({ notifications: {}, integrations: {} })
const onboardingTourVisible = ref(false)
const onboardingStatus = ref({
  completed: false,
  lastStep: 0,
  showLaterUntil: null,
  completedAt: null,
})
const onboardingSessionPlayed = ref(false)
const onboardingSteps = [
  {
    id: 'today-focus',
    title: 'Start with Today',
    description: 'This is your calm home base for the next useful thing. Keep the day visible and manageable.',
    element: '[data-onboarding="today-focus"]',
    placement: 'bottom',
  },
  {
    id: 'plan-task',
    title: 'Plan a task in seconds',
    description: 'Use the planner to turn a thought into a clear task with timing and reminders.',
    element: '[data-onboarding="plan-task"]',
    placement: 'bottom',
  },
  {
    id: 'talk-to-planner',
    title: 'Talk to your planner',
    description: 'When typing feels like work, describe what you need and let the assistant shape the next steps.',
    element: '[data-onboarding="talk-to-planner"]',
    placement: 'top',
  },
]
const AI_SUMMARY_DEBOUNCE_MS = 220
let aiSummaryDebounceTimer = null
let aiSummaryRequestId = 0
let aiSummaryPendingKey = ''
let aiSummaryResolvedKey = ''

const summaryTasksPayload = computed(() => {
  const merged = [...dailyTasks.value, ...weeklyTasks.value, ...monthlyTasks.value]
  const uniqueTasks = new Map()
  merged.forEach((task, index) => {
    const normalized = {
      id: task?.id || '',
      title: String(task?.title || '').trim(),
      completed: !!task?.completed,
      date: typeof task?.date === 'string' ? task.date : (task?.date ? toYMD(task.date?.toDate?.() || task.date) : ''),
    }
    if (!normalized.title) return
    const fallbackKey = `${normalized.title}:${normalized.date}:${normalized.completed ? 1 : 0}:${index}`
    const key = normalized.id || fallbackKey
    if (!uniqueTasks.has(key)) uniqueTasks.set(key, normalized)
  })

  return Array.from(uniqueTasks.values()).sort((a, b) => {
    const dateDelta = String(a.date || '').localeCompare(String(b.date || ''))
    if (dateDelta !== 0) return dateDelta
    const titleDelta = a.title.localeCompare(b.title)
    if (titleDelta !== 0) return titleDelta
    if (a.completed !== b.completed) return Number(a.completed) - Number(b.completed)
    return String(a.id || '').localeCompare(String(b.id || ''))
  })
})

const summarySignature = computed(() =>
  summaryTasksPayload.value
    .map((task) => `${task.id || 'task'}:${task.date || ''}:${task.completed ? 1 : 0}:${task.title}`)
    .join('|'),
)

const carryoverCandidates = computed(() => {
  const todayKey = todayKeyRef.value
  const currentWorkspaceId = activeWorkspaceId.value ? String(activeWorkspaceId.value) : null
  if (!currentWorkspaceId) return []
  const allowLegacyPersonalTasks = isPersonalActiveWorkspace.value
  return (allTasks.value || [])
    .filter((t) => {
      if (!t || t.completed) return false
      const taskWorkspaceId = t?.workspaceId ? String(t.workspaceId) : null
      if (!taskWorkspaceId) return allowLegacyPersonalTasks
      if (taskWorkspaceId !== currentWorkspaceId) return false
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
  const tz = getEffectiveUserTimezone()
  const hour = dayjs(dayClockNow.value).tz(tz).hour()
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
let onboardingTimer = null
const quickSetupState = computed(() => quickSetupStore.setupState)
const quickSetupMissingLabels = computed(() => getIncompleteQuickSetupLabels(quickSetupState.value))
const showQuickSetupBanner = computed(
  () =>
    !isGuest.value &&
    !quickSetupStore.quickSetupOpen &&
    !!quickSetupState.value &&
    !quickSetupState.value.completed
)

function refreshQuickSetupState(nextState = null) {
  quickSetupStore.refreshQuickSetupState(nextState)
}

function openQuickSetup() {
  quickSetupStore.refreshQuickSetupState()
  quickSetupStore.openQuickSetup({ source: 'manual' })
}

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

function maybeLaunchOnboarding() {
  if (isGuest.value || !authStore.user?.uid || onboardingStatus.value.completed || onboardingSessionPlayed.value) return
  const laterUntil = onboardingStatus.value.showLaterUntil
  if (laterUntil && new Date(laterUntil).getTime() > Date.now()) return
  window.setTimeout(() => {
    if (!onboardingStatus.value.completed && !onboardingSessionPlayed.value) {
      onboardingTourVisible.value = true
    }
  }, 450)
}

async function saveOnboardingStatus(next = {}) {
  const uid = authStore.user?.uid
  if (!uid) return
  const updated = await updateOnboardingStatus(uid, next)
  syncOnboardingFromPreferences({ onboarding: updated })
  try {
    authStore.user.preferences = {
      ...(authStore.user.preferences || {}),
      onboarding: updated,
    }
  } catch {
    /* The server remains the source of truth when the local snapshot is immutable. */
  }
}

async function finishOnboarding() {
  onboardingTourVisible.value = false
  try {
    await saveOnboardingStatus({
      completed: true,
      completedAt: new Date().toISOString(),
      lastStep: onboardingSteps.length,
    })
    if (!quickSetupStore.setupState?.completed) {
      quickSetupStore.openQuickSetup({ clearSnooze: false, source: 'auto' })
    }
  } catch (error) {
    console.warn('Failed to persist onboarding completion:', error?.message || error)
  }
}

async function skipOnboarding() {
  onboardingTourVisible.value = false
  await routerNav.push('/today/dashboard').catch(() => {})
  try {
    await saveOnboardingStatus({
      completed: true,
      completedAt: new Date().toISOString(),
      skippedAt: new Date().toISOString(),
      lastStep: 0,
    })
  } catch (error) {
    console.warn('Failed to persist skipped onboarding:', error?.message || error)
  }
}

async function postponeOnboarding() {
  onboardingTourVisible.value = false
  const showLaterUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  try {
    await saveOnboardingStatus({
      completed: false,
      showLaterUntil,
      lastStep: onboardingStatus.value.lastStep,
    })
  } catch (error) {
    console.warn('Failed to persist onboarding snooze:', error?.message || error)
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
}

const sortedDaily = computed(() =>
  [...dailyTasks.value].sort((a, b) =>
    a.completed !== b.completed ? a.completed - b.completed : (b.createdAt || 0) - (a.createdAt || 0)
  )
)

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

const activeFocusTask = computed(() => {
  if (!activeTaskId.value) return null
  const pool = [...dailyTasks.value, ...weeklyTasks.value, ...monthlyTasks.value]
  return pool.find((task) => task?.id === activeTaskId.value && !task.completed) || null
})

const nextUpTask = computed(() => sortedDaily.value.find((task) => !task.completed) || null)

const filteredDaily = computed(() => {
  if (dashboardCategory.value === 'All') return sortedDaily.value
  return sortedDaily.value.filter((task) => resolveCategory(task?.category) === dashboardCategory.value)
})

const visibleDaily = computed(() =>
  filteredDaily.value.filter((task) => !task.completed || recentlyCompletedTaskIds.value.has(task.id)),
)

const emptyDailyMessage = computed(() => {
  if (dashboardCategory.value !== 'All') return 'No tasks in this category.'
  if (dailyTasks.value.length && dailyTasks.value.every((task) => task.completed)) return 'All done for today.'
  return 'No tasks for this day.'
})

const activeTaskExists = computed(() => {
  const id = activeTaskId.value
  if (!id) return false
  const pool = [...dailyTasks.value, ...weeklyTasks.value, ...monthlyTasks.value]
  return pool.some((t) => t?.id === id)
})

watch(
  () => [focus.phase, focus.session?.taskId],
  ([phase, taskId]) => {
    if (phase === 'running' && taskId) {
      activeTaskId.value = taskId
    } else if (activeTaskId.value && activeTaskId.value === taskId) {
      activeTaskId.value = null
    }
  },
  { immediate: true },
)

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

const FOCUS_MINUTES = [15, 25, 45, 60]
const FOCUS_POSITIVE_PATTERN = /\b(write|design|study|prepare|code|research|review|build|read|analy[sz]e|draft|plan|implement|debug|learn|practice|work on|finish|complete)\b/i
const FOCUS_NEGATIVE_PATTERN = /\b(call|buy|pick up|pickup|take medication|attend|meeting|send|text|message|wake up|leave home|drop off|appointment)\b/i

function readTaskDurationMinutes(task) {
  const candidates = [
    task?.estimatedDuration,
    task?.estimated_duration,
    task?.durationMinutes,
    task?.duration_minutes,
    task?.plannedMinutes,
    task?.focusMinutes,
  ]

  for (const candidate of candidates) {
    if (typeof candidate === 'number' && Number.isFinite(candidate) && candidate > 0 && candidate <= 240) {
      return candidate
    }
    const value = String(candidate || '').trim().toLowerCase()
    if (!value) continue
    const match = value.match(/(\d+(?:\.\d+)?)\s*(hours?|hrs?|h|minutes?|mins?|m)?/i)
    if (!match) continue
    const amount = Number(match[1])
    if (!Number.isFinite(amount) || amount <= 0) continue
    const unit = match[2] || 'm'
    const minutes = /h/i.test(unit) && !/m/i.test(unit) ? amount * 60 : amount
    if (minutes > 0 && minutes <= 240) return minutes
  }

  return null
}

function normalizeFocusMinutes(value) {
  const minutes = Number(value)
  if (!Number.isFinite(minutes) || minutes <= 0) return 25
  return FOCUS_MINUTES.reduce((closest, option) =>
    Math.abs(option - minutes) < Math.abs(closest - minutes) ? option : closest,
  FOCUS_MINUTES[0])
}

function focusRecommendation(task) {
  if (!task || task.completed) return null

  const explicit = task.requires_deep_work ?? task.requiresDeepWork ?? task.focusable ?? task.focusRecommended
  if (explicit === false) return null

  const text = [task.title, task.details, task.notes, task.task_type, task.actionability, task.category]
    .filter(Boolean)
    .join(' ')
  const hasPositiveCue = FOCUS_POSITIVE_PATTERN.test(text)
  const hasNegativeCue = FOCUS_NEGATIVE_PATTERN.test(text)
  const duration = readTaskDurationMinutes(task)
  const hasDeepWorkSignal = explicit === true || task.actionability === 'deep_work' || task.actionability === 'sustained'
  const category = resolveCategory(task.category)
  const workCategory = ['Work', 'Learning', 'Project', 'Career'].includes(category)

  if (hasNegativeCue && !hasDeepWorkSignal && !hasPositiveCue) return null
  if (!hasPositiveCue && !duration && !hasDeepWorkSignal && !workCategory) return null

  return {
    minutes: normalizeFocusMinutes(duration || (hasDeepWorkSignal ? 45 : 25)),
  }
}

function taskPreviewMeta(task) {
  const parts = []
  const category = categoryLabel(task?.category)
  if (category && category !== 'Uncategorized') parts.push(category)
  const recommendation = focusRecommendation(task)
  if (recommendation) parts.push(`~${recommendation.minutes} min`)
  return parts.join(' · ') || 'Open task'
}

function startFocusFromMenu(task) {
  if (!task || task.completed) return
  focus.open(task, authStore.user?.uid)
}

function handleFocusStarted(task) {
  if (focus.phase === 'running' && task?.id) activeTaskId.value = task.id
}

function formatFocusRemaining(ms) {
  const totalSeconds = Math.max(0, Math.ceil(Number(ms || 0) / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function formatNapkinDate(ms) {
  try {
    return dayjs(ms).format('MMM D, h:mm A')
  } catch {
    return new Date(ms).toLocaleString()
  }
}

function scheduleCompletedRowRemoval(task) {
  const taskId = task?.id
  if (!taskId) return
  const previousTimer = completionRemovalTimers.get(taskId)
  if (previousTimer) clearTimeout(previousTimer)
  const timer = setTimeout(() => {
    const next = new Set(recentlyCompletedTaskIds.value)
    next.delete(taskId)
    recentlyCompletedTaskIds.value = next
    completionRemovalTimers.delete(taskId)
  }, 700)
  completionRemovalTimers.set(taskId, timer)
}

function showCompletionToast(task) {
  if (completionToastTimer) clearTimeout(completionToastTimer)
  completionToast.value = {
    id: task.id,
    title: String(task.title || 'Task').trim(),
  }
  completionToastTimer = setTimeout(() => {
    completionToast.value = null
    completionToastTimer = null
  }, 5000)
}

async function undoCompletion() {
  const toast = completionToast.value
  if (!toast) return
  if (completionToastTimer) clearTimeout(completionToastTimer)
  completionToast.value = null
  completionToastTimer = null

  const task = allTasks.value.find((entry) => entry?.id === toast.id)
  if (!task?.completed) return
  await toggleTaskComplete(task)
  const next = new Set(recentlyCompletedTaskIds.value)
  next.delete(task.id)
  recentlyCompletedTaskIds.value = next
}

async function toggleComplete(task) {
  const wasCompleted = !!task?.completed
  if (!wasCompleted && task?.id) {
    const next = new Set(recentlyCompletedTaskIds.value)
    next.add(task.id)
    recentlyCompletedTaskIds.value = next
  }
  await toggleTaskComplete(task)
  if (!task) return

  if (!wasCompleted && task.completed) {
    if (activeTaskId.value === task.id) activeTaskId.value = null
    scheduleCompletedRowRemoval(task)
    showCompletionToast(task)
  } else if (!wasCompleted && !task.completed) {
    const next = new Set(recentlyCompletedTaskIds.value)
    next.delete(task.id)
    recentlyCompletedTaskIds.value = next
  } else if (wasCompleted && !task.completed) {
    const next = new Set(recentlyCompletedTaskIds.value)
    next.delete(task.id)
    recentlyCompletedTaskIds.value = next
    if (completionToast.value?.id === task.id) {
      completionToast.value = null
      if (completionToastTimer) clearTimeout(completionToastTimer)
      completionToastTimer = null
    }
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

// Focus section date navigation (Today's Focus can show any day)
const allWorkspaceTasksRef = ref([])
const focusSelectedDate = ref(todayKeyRef.value)
const showFocusDatePicker = ref(false)

const tomorrowKey = computed(() => {
  const date = parseLocalDateKey(todayKeyRef.value)
  date.setDate(date.getDate() + 1)
  return toLocalDateKey(date)
})

const tomorrowTasks = computed(() =>
  allWorkspaceTasksRef.value
    .filter((task) => task.date === tomorrowKey.value && !task.completed)
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, 3),
)

const tomorrowTaskCount = computed(() =>
  allWorkspaceTasksRef.value.filter((task) => task.date === tomorrowKey.value && !task.completed).length,
)

watch(
  focusSelectedDate,
  (ymd) => {
    dailyTasks.value = allWorkspaceTasksRef.value.filter((t) => t.date === ymd)
  },
  { immediate: false }
)

const isFocusToday = computed(() => focusSelectedDate.value === todayKeyRef.value)

const focusDateLabel = computed(() => {
  const ymd = focusSelectedDate.value
  if (!ymd) return 'Today'
  const d = parseLocalDateKey(ymd)
  const monDay = dayjs(d).format('MMM D')
  if (isFocusToday.value) return `Today (${monDay})`
  return dayjs(d).format('ddd, MMM D')
})

function prevFocusDay() {
  const d = parseLocalDateKey(focusSelectedDate.value)
  d.setDate(d.getDate() - 1)
  focusSelectedDate.value = toLocalDateKey(d)
}

function nextFocusDay() {
  const d = parseLocalDateKey(focusSelectedDate.value)
  d.setDate(d.getDate() + 1)
  focusSelectedDate.value = toLocalDateKey(d)
}

function jumpFocusToToday() {
  focusSelectedDate.value = todayKeyRef.value
}

function openFocusDatePicker() {
  showFocusDatePicker.value = true
}

function onFocusDatePicked(date) {
  if (date) focusSelectedDate.value = typeof date === 'string' ? date : toLocalDateKey(date)
  showFocusDatePicker.value = false
}

function toYMD(date) {
  if (typeof date === 'string') return date
  return toLocalDateKey(date)
}

function buildCurrentWeekRange(anchor = dayClockNow.value) {
  const start = new Date(anchor)
  start.setDate(start.getDate() - (start.getDay() === 0 ? 6 : start.getDay() - 1))
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return {
    start,
    end,
    startKey: toLocalDateKey(start),
    endKey: toLocalDateKey(end),
  }
}

function buildCurrentMonthRange(anchor = dayClockNow.value) {
  const current = new Date(anchor)
  const start = new Date(current.getFullYear(), current.getMonth(), 1)
  const end = new Date(current.getFullYear(), current.getMonth() + 1, 0)
  return {
    start,
    end,
    startKey: toLocalDateKey(start),
    endKey: toLocalDateKey(end),
  }
}

const currentWeekRange = computed(() => buildCurrentWeekRange(dayClockNow.value))
const currentMonthRange = computed(() => buildCurrentMonthRange(dayClockNow.value))

async function triggerSummary() {
  if (isRefreshingSummary.value) return
  try {
    isRefreshingSummary.value = true
    const summary = await fetchAISummary({ force: true })
    if (!summary) {
      ElMessage({ type: 'info', message: 'No tasks to summarize yet', duration: 1500 })
      return
    }
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

watch(
  () => [dailyTasks.value, weeklyTasks.value, monthlyTasks.value].map((list) => list.map((t) => t.id).join(',')).join(';'),
  () => {
    if (!activeTaskId.value) return
    if (!activeTaskExists.value) activeTaskId.value = null
  },
)

watch(
  () => (allTasks.value || []).map((task) => `${task?.id || ''}:${task?.date || ''}:${task?.completed ? 1 : 0}`).join('|'),
  () => {
    syncDashboardTaskBuckets(allTasks.value)
    dashboardTasksLoading.value = false
  },
)

onMounted(async () => {
  syncDashboardViewport()
  try {
    window.addEventListener('resize', syncDashboardViewport, { passive: true })
  } catch {
    /* noop */
  }
  if (allTasks.value.length) {
    syncDashboardTaskBuckets(allTasks.value)
    dashboardTasksLoading.value = false
  }
  try {
    carryoverDismissedToday.value =
      localStorage.getItem(`carryover:dismiss:${todayKeyRef.value}`) === '1'
  } catch {
    carryoverDismissedToday.value = false
  }
  try {
    const storedSetup = readQuickSetupState()
    refreshQuickSetupState(storedSetup)
    const seen = storedSetup?.completed || localStorage.getItem('pcai_setup_done') === '1'
    const onboardingReadyForQuickSetup = onboardingStatus.value.completed || onboardingStatus.value.showLaterUntil
    if (!isGuest.value && onboardingReadyForQuickSetup && !seen && !isQuickSetupSnoozed()) {
      quickSetupStore.openQuickSetup({ clearSnooze: false, source: 'auto' })
    }
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
        title: 'Keep the streak alive',
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
  const d = new Date(dayClockNow.value)
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

function toggleTodayFullscreen() {
  isTodayFullscreen.value = !isTodayFullscreen.value
  try {
    const root = document?.documentElement
    if (!root) return
    root.classList.toggle('today-fullscreen-mode', isTodayFullscreen.value)
  } catch (err) {
    console.warn('toggleTodayFullscreen failed', err)
  }
}

function applySavedTasksToDashboard(taskEntries = []) {
  const applied = mergeTasksLocally(taskEntries)
  syncDashboardTaskBuckets(allTasks.value)
  dashboardTasksLoading.value = false
  return applied
}

async function handleSave(payload) {
  if (Array.isArray(payload)) {
    console.info('[TaskCreate] dashboard received generated tasks', { count: payload.length })
    applySavedTasksToDashboard(payload)
    closePlanner()
    await nextTick()
    if (dailyList.value) dailyList.value.scrollTop = 0
    return
  }
  let savedPayload = payload
  if (payload.id) {
    await updateTaskInFirebase(payload)
  } else {
    const saved = await addTaskToFirebase(payload)
    payload.id = saved.id
    if (saved?.__notifyMeta) payload.__notifyMeta = saved.__notifyMeta
    savedPayload = saved
  }
  applySavedTasksToDashboard([savedPayload])
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

function normalizeDashboardTask(task = {}) {
  return {
    ...task,
    category: resolveCategory(task?.category),
    date: typeof task?.date === 'string' ? task.date : toYMD(task?.date?.toDate?.() || task?.date || new Date()),
    createdAt: task?.createdAt?.toMillis?.() || task?.createdAt || 0,
  }
}

function syncDashboardTaskBuckets(sourceTasks = []) {
  const userTasks = Array.from(
    new Map(
      (Array.isArray(sourceTasks) ? sourceTasks : [])
        .map((task) => normalizeDashboardTask(task))
        .filter((task) => task?.id)
        .map((task) => [task.id, task]),
    ).values(),
  )

  allWorkspaceTasksRef.value = userTasks
  dailyTasks.value = userTasks.filter((t) => t.date === focusSelectedDate.value)
  const weekDays = ymdRange(currentWeekRange.value.start, currentWeekRange.value.end)
  weeklyTasks.value = userTasks.filter((t) => weekDays.includes(t.date))
  const monthDays = ymdRange(currentMonthRange.value.start, currentMonthRange.value.end)
  monthlyTasks.value = userTasks.filter((t) => monthDays.includes(t.date))
  buildRotatingInsights()
}

const allTasksPreset = ref('thisWeek')
const allTasksStartDate = ref(currentWeekRange.value.startKey)
const allTasksEndDate = ref(currentWeekRange.value.endKey)
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
  { key: 'thisMonth', label: 'This month', hint: dayjs(dayClockNow.value).format('MMM') },
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
  const now = dayjs(dayClockNow.value)
  if (key === 'thisWeek') return { start: currentWeekRange.value.startKey, end: currentWeekRange.value.endKey }
  if (key === 'last7')
    return { start: toLocalDateKey(now.subtract(6, 'day').toDate()), end: toLocalDateKey(now.toDate()) }
  if (key === 'next7')
    return { start: toLocalDateKey(now.toDate()), end: toLocalDateKey(now.add(6, 'day').toDate()) }
  if (key === 'thisMonth') return { start: currentMonthRange.value.startKey, end: currentMonthRange.value.endKey }
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

watch(todayKeyRef, (next, prev) => {
  if (!prev || next === prev) return

  if (focusSelectedDate.value === prev) {
    focusSelectedDate.value = next
  }

  if (allTasksPreset.value !== 'custom') {
    applyAllTasksPreset(allTasksPreset.value)
  }

  try {
    carryoverDismissedToday.value = localStorage.getItem(`carryover:dismiss:${next}`) === '1'
  } catch {
    carryoverDismissedToday.value = false
  }

  syncDashboardTaskBuckets(allTasks.value)
})

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

let activeTaskListenerKey = null
let dashboardTaskSeedPromise = null
let authStateStop = null

async function attachTaskListener(user) {
  const effectiveUser = user || auth.currentUser || authStore?.user || null
  if (!effectiveUser?.uid) {
    activeTaskListenerKey = null
    dashboardTaskSeedPromise = null
    syncDashboardTaskBuckets([])
    dashboardTasksLoading.value = false
    return
  }
  let wsId = activeWorkspaceId.value
  if (!wsId) {
    dashboardTasksLoading.value = true
    try {
      await workspaceStore.init()
    } catch {
      /* noop */
    }
    wsId = activeWorkspaceId.value
    if (!wsId) {
      syncDashboardTaskBuckets([])
      dashboardTasksLoading.value = false
      return
    }
  }
  const packagedNative = isNativePackagedApp()
  const nextKey = `${effectiveUser.uid}:${wsId}:${packagedNative ? 'native' : 'web'}`

  if (activeTaskListenerKey === nextKey) {
    if (dashboardTaskSeedPromise || !dashboardTasksLoading.value) return
  }

  activeTaskListenerKey = nextKey
  dashboardTasksLoading.value = true
  dashboardTaskSeedPromise = refreshAllTasks()
  const seeded = await dashboardTaskSeedPromise.then(() => true).catch((error) => {
    console.warn('Dashboard task refresh failed', error?.message || error)
    return false
  })
  dashboardTaskSeedPromise = null
  if (seeded) syncDashboardTaskBuckets(allTasks.value)
  dashboardTasksLoading.value = false
}

watch(activeWorkspaceId, () => {
  attachTaskListener(auth.currentUser || authStore.user || null)
})

onUnmounted(() => {
  try {
    window.removeEventListener('resize', syncDashboardViewport)
  } catch {
    /* noop */
  }
  if (authStateStop) {
    try {
      authStateStop()
    } catch {
      /* noop */
    }
    authStateStop = null
  }
  detachNapkinListener()
  if (insightIntervalId.value) clearInterval(insightIntervalId.value)
  if (aiSummaryDebounceTimer) clearTimeout(aiSummaryDebounceTimer)
  if (completionToastTimer) clearTimeout(completionToastTimer)
  completionRemovalTimers.forEach((timer) => clearTimeout(timer))
  completionRemovalTimers.clear()
  if (onboardingTimer) {
    clearTimeout(onboardingTimer)
    onboardingTimer = null
  }
  if (savePrefsTimer) {
    clearTimeout(savePrefsTimer)
    savePrefsTimer = null
  }
})

onBeforeUnmount(() => {
  try {
    document?.documentElement?.classList?.remove('today-fullscreen-mode')
  } catch {
    /* noop */
  }
})

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

function clearAISummaryTracking() {
  if (aiSummaryDebounceTimer) {
    clearTimeout(aiSummaryDebounceTimer)
    aiSummaryDebounceTimer = null
  }
  aiSummaryRequestId += 1
  aiSummaryPendingKey = ''
  aiSummaryResolvedKey = ''
}

async function fetchAISummary(options = {}) {
  const { force = false, signature = summarySignature.value } = options
  try {
    const compacted = summaryTasksPayload.value
    if (!compacted.length || !signature) {
      clearAISummaryTracking()
      aiSummary.value = null
      return null
    }
    if (!force && (signature === aiSummaryPendingKey || signature === aiSummaryResolvedKey)) {
      return aiSummary.value
    }

    const requestId = ++aiSummaryRequestId
    aiSummaryPendingKey = signature
    const summary = await summarizeTasks(compacted)
    if (requestId !== aiSummaryRequestId) return aiSummary.value
    aiSummary.value = summary
    aiSummaryResolvedKey = signature
    return summary
  } catch (error) {
    console.error('❌ Task summary failed:', error.message || error)
    return null
  } finally {
    if (signature === aiSummaryPendingKey) aiSummaryPendingKey = ''
  }
}

watch(
  summarySignature,
  (signature) => {
    if (aiSummaryDebounceTimer) clearTimeout(aiSummaryDebounceTimer)
    if (!signature) {
      clearAISummaryTracking()
      aiSummary.value = null
      return
    }
    aiSummaryDebounceTimer = setTimeout(() => {
      aiSummaryDebounceTimer = null
      fetchAISummary({ signature })
    }, AI_SUMMARY_DEBOUNCE_MS)
  }
)

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
      const tz = getEffectiveUserTimezone()
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
    const restoredUser = auth.currentUser || authStore?.user || null
    if (restoredUser?.uid) {
      checkingAuth.value = false
      attachTaskListener(restoredUser)
    }
    authStateStop = onAuthStateChanged(auth, (user) => {
      checkingAuth.value = false
      attachTaskListener(user || authStore?.user || null)
    })
  } catch {
    checkingAuth.value = false
  }
})

watch(
  () => authStore?.user?.uid,
  async (uid) => {
    if (uid) {
      checkingAuth.value = false
      attachTaskListener(auth.currentUser || authStore?.user || null)
    }
    try {
      if (!uid) {
        userStreak.value = 0
        usage.value = { used: 0, limit: 0, plan: '' }
        googleStatus.value = { connected: false, accounts: [] }
        return
      }
      await ensureDailyStreakState(uid)
      userStreak.value = await getUserStreak(uid)
      await fetchUsage()
      await loadGoogleStatus()
    } catch {
      /* noop */
    }
  },
  { immediate: true }
)

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
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.dashboard-banner {
  border-radius: 1.15rem;
  padding: 1rem 1.25rem;
  box-shadow: inset 0 1px 12px rgba(255, 255, 255, 0.06);
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.quick-setup-banner {
  border-radius: 1.15rem;
  border: 1px solid rgba(129, 140, 248, 0.28);
  background:
    radial-gradient(circle at top right, rgba(236, 72, 153, 0.18), transparent 35%),
    linear-gradient(135deg, rgba(15, 23, 42, 0.92), rgba(49, 46, 129, 0.8));
}

.quick-setup-banner__progress {
  position: relative;
  width: 140px;
  height: 10px;
  border-radius: 999px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.12);
}

.quick-setup-banner__bar {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #6366f1 0%, #8b5cf6 55%, #ec4899 100%);
}

.dashboard-section {
  width: 100%;
  max-width: 100%;
  min-width: 0;
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
  width: 100%;
  max-width: 100%;
  min-width: 0;
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

.daily-card__header {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.daily-card__heading {
  width: 100%;
  min-width: 0;
}

.daily-card__actions {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0.75rem;
  width: 100%;
  min-width: 0;
  max-width: 100%;
}

.daily-card__plan-btn {
  min-height: 44px;
  white-space: nowrap;
  flex: 1 1 auto;
  width: 100%;
}

.focus-date-row {
  width: 100%;
  align-items: center;
  min-width: 0;
}

.focus-date-main {
  display: flex;
  align-items: stretch;
  gap: 0.5rem;
  flex: 1 1 auto;
  width: 100%;
  min-width: 0;
}

.focus-date-pill {
  flex: 1 1 auto;
  width: auto;
  min-width: 0;
  justify-content: space-between;
}

.category-filter-strip {
  align-items: stretch;
  min-height: 3rem;
  overflow-y: visible;
  padding-top: 0.35rem;
  padding-bottom: 0.6rem;
  -webkit-overflow-scrolling: touch;
}

.category-filter-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  min-height: 2.5rem;
  line-height: 1.1;
  white-space: nowrap;
  flex-shrink: 0;
}

.task-category-pill {
  display: inline-flex;
  align-items: center;
  min-height: 1.7rem;
  max-width: 100%;
  line-height: 1;
  white-space: nowrap;
  flex-shrink: 0;
}

.dashboard-task-skeleton-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding-top: 0.2rem;
}

.dashboard-task-skeleton-card {
  display: flex;
  align-items: flex-start;
  gap: 0.85rem;
  padding: 0.95rem 1rem;
  border-radius: 1rem;
  border: 1px solid rgba(99, 102, 241, 0.12);
  background: rgba(15, 23, 42, 0.62);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
  max-width: 100%;
  min-width: 0;
}

.dashboard-task-skeleton-check,
.dashboard-task-skeleton-line,
.dashboard-task-skeleton-pill,
.dashboard-task-skeleton-action {
  position: relative;
  overflow: hidden;
  background: rgba(99, 102, 241, 0.16);
}

.dashboard-task-skeleton-check::after,
.dashboard-task-skeleton-line::after,
.dashboard-task-skeleton-pill::after,
.dashboard-task-skeleton-action::after {
  content: '';
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  animation: dashboardSkeletonPulse 1.25s ease-in-out infinite;
}

.dashboard-task-skeleton-check {
  width: 1rem;
  height: 1rem;
  flex: 0 0 1rem;
  margin-top: 0.2rem;
  border-radius: 0.3rem;
}

.dashboard-task-skeleton-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.dashboard-task-skeleton-line {
  display: block;
  border-radius: 999px;
}

.dashboard-task-skeleton-line--title {
  width: min(72%, 18rem);
  height: 0.95rem;
}

.dashboard-task-skeleton-line--meta {
  width: 6rem;
  height: 0.72rem;
}

.dashboard-task-skeleton-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.55rem;
}

.dashboard-task-skeleton-pill {
  width: 5.6rem;
  height: 1.6rem;
  border-radius: 999px;
}

.dashboard-task-skeleton-action {
  width: 3.9rem;
  height: 2.15rem;
  border-radius: 0.8rem;
  flex: 0 0 auto;
}

.today-fullscreen-btn {
  width: 44px;
  height: 44px;
  min-height: 44px;
  flex: 0 0 44px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(79, 70, 229, 0.15);
  color: #e0e7ff;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.today-fullscreen-btn--inline {
  display: inline-flex;
}

.today-fullscreen-btn--desktop {
  display: none;
}

.jump-today-btn {
  display: inline-flex;
  align-items: center;
}

.today-fullscreen-btn:hover {
  background: rgba(99, 102, 241, 0.25);
  transform: translateY(-1px);
  box-shadow: 0 10px 24px rgba(79, 70, 229, 0.25);
}

@keyframes dashboardSkeletonPulse {
  100% {
    transform: translateX(100%);
  }
}

@media (min-width: 641px) {
  .daily-card__header {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .daily-card__heading {
    flex: 1 1 18rem;
  }

  .daily-card__actions {
    justify-content: flex-end;
    width: auto;
    margin-left: auto;
    flex-shrink: 0;
  }

  .daily-card__plan-btn {
    flex: 0 0 auto;
    width: auto;
  }

  .focus-date-row {
    width: auto;
  }

  .focus-date-main {
    width: auto;
    flex: 0 0 auto;
  }

  .today-fullscreen-btn--inline {
    display: none;
  }

  .today-fullscreen-btn--desktop {
    display: inline-flex;
  }

  .focus-date-pill {
    flex: 0 0 auto;
    justify-content: flex-start;
  }
}

.daily-card--fullscreen {
  position: fixed;
  inset: 0;
  z-index: 80;
  margin: 0 !important;
  width: 100vw;
  min-height: 100vh;
  min-height: 100dvh;
  height: 100vh;
  height: 100dvh;
  max-height: 100dvh;
  background: radial-gradient(circle at 20% 20%, rgba(79, 70, 229, 0.35), transparent 35%), radial-gradient(circle at 80% 0%, rgba(236, 72, 153, 0.25), transparent 32%), #0f172a;
  border-radius: 0;
  padding-top: calc(var(--safe-area-top, env(safe-area-inset-top, 0px)) + 1.25rem);
  padding-right: calc(var(--safe-area-right, env(safe-area-inset-right, 0px)) + 1.25rem);
  padding-bottom: calc(var(--safe-area-bottom, env(safe-area-inset-bottom, 0px)) + 1rem);
  padding-left: calc(var(--safe-area-left, env(safe-area-inset-left, 0px)) + 1.25rem);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.65);
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.daily-card--fullscreen > .space-y-3 {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.today-list {
  transition: max-height 0.25s ease;
}

.focus-list-fade-enter-active,
.focus-list-fade-leave-active {
  transition: opacity 0.2s ease;
}
.focus-list-fade-enter-from,
.focus-list-fade-leave-to {
  opacity: 0;
}

.today-list--fullscreen {
  flex: 1 1 auto;
  min-height: 0;
  max-height: none;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-y;
  padding-bottom: calc(var(--safe-area-bottom, env(safe-area-inset-bottom, 0px)) + 0.5rem);
}

@media (max-width: 768px) {
  .daily-card--fullscreen {
    padding-top: max(calc(var(--safe-area-top, env(safe-area-inset-top, 0px)) + 0.85rem), 3.75rem);
    padding-right: calc(var(--safe-area-right, env(safe-area-inset-right, 0px)) + 0.85rem);
    padding-bottom: calc(var(--safe-area-bottom, env(safe-area-inset-bottom, 0px)) + 0.85rem);
    padding-left: calc(var(--safe-area-left, env(safe-area-inset-left, 0px)) + 0.85rem);
  }

  .today-list--fullscreen {
    max-height: none;
  }

  .focus-date-pill {
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 12px;
    padding: 6px 14px;
    background: rgba(255, 255, 255, 0.06);
  }
}

@media (max-width: 640px) {
  .dashboard-card {
    padding: 1rem;
  }

  .dashboard-banner {
    padding: 0.9rem 1rem;
  }

  .daily-card__actions {
    width: 100%;
    flex-wrap: wrap;
  }

  .focus-date-row {
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  .focus-date-main {
    width: 100%;
  }

  .focus-date-pill {
    flex: 1 1 auto;
    width: auto;
  }

  .daily-card__plan-btn {
    white-space: normal;
  }

  .jump-today-btn {
    order: 3;
    width: 100%;
    justify-content: flex-start;
    padding-left: 0;
  }

  .category-filter-strip {
    min-height: 2.85rem;
    padding-top: 0.25rem;
    padding-bottom: 0.5rem;
  }

  .category-filter-chip {
    min-height: 2.35rem;
  }

  .action-chip {
    width: 100%;
    max-width: 100%;
    justify-content: center;
  }

  .task-category-pill {
    white-space: normal;
  }
}

:global(.today-fullscreen-mode aside) {
  display: none !important;
}
:global(.today-fullscreen-mode header.sticky) {
  display: none !important;
}
:global(.today-fullscreen-mode footer) {
  display: none !important;
}
:global(.today-fullscreen-mode body) {
  overflow: hidden;
}

.move-card--full {
  grid-column: 1 / -1;
  width: 100%;
  padding: 1.2rem;
}

.move-card--full button {
  min-height: 44px;
}

.move-primary-btn {
  background: linear-gradient(135deg, #4f46e5, #6366f1);
  box-shadow: 0 14px 30px rgba(99, 102, 241, 0.35);
}
.move-primary-btn:hover {
  filter: brightness(1.05);
}
.move-secondary-btn {
  background: linear-gradient(135deg, #312e81, #4338ca);
  border: 1px solid rgba(255, 255, 255, 0.12);
}
.move-secondary-btn:hover {
  filter: brightness(1.05);
}

.today-dashboard {
  --pc-page: var(--pc-bg, #f7f8fc);
  --pc-muted: var(--pc-text-muted, #64748b);
  --pc-primary: var(--pc-accent, #4f46e5);
  --pc-primary-strong: var(--pc-accent-hover, #4338ca);
  --pc-primary-soft: var(--pc-accent-soft, #eef2ff);
  --pc-surface-muted: var(--pc-surface-2, #f8fafc);
  background: var(--pc-page, #f7f8fc);
  color: var(--pc-text, #111827);
}

.today-dashboard .dashboard-section {
  padding-left: 0;
  padding-right: 0;
}

.today-dashboard .dashboard-card {
  background: var(--pc-surface, #ffffff);
  border: 1px solid var(--pc-border, #e5e7eb);
  border-radius: 1.125rem;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.06);
  color: var(--pc-text, #111827);
}

.today-intro {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1.25rem;
  min-width: 0;
  padding: 0.25rem 0 0.5rem;
}

.today-eyebrow {
  margin: 0 0 0.35rem;
  color: var(--pc-muted, #64748b);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.today-intro__title {
  margin: 0;
  color: var(--pc-text, #111827);
  font-size: clamp(1.55rem, 4vw, 2.15rem);
  font-weight: 700;
  letter-spacing: -0.035em;
  line-height: 1.1;
}

.today-intro__summary {
  margin: 0.55rem 0 0;
  color: var(--pc-muted, #64748b);
  font-size: 0.95rem;
}

.today-next-up,
.backlog-review,
.tomorrow-preview {
  border: 1px solid var(--pc-border, #e5e7eb);
  border-radius: 0.9rem;
  background: var(--pc-surface, #ffffff);
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.04);
}

.today-next-up {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  max-width: 28rem;
  padding: 0.65rem 0.8rem;
}

.today-next-up__label,
.backlog-review__eyebrow,
.tomorrow-preview__eyebrow {
  color: var(--pc-primary, #4f46e5);
  font-size: 0.68rem;
  font-weight: 750;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}

.today-next-up__task {
  min-width: 0;
  overflow: hidden;
  color: var(--pc-text, #111827);
  font-size: 0.84rem;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.today-next-up__meta {
  flex: 0 0 auto;
  color: var(--pc-muted, #64748b);
  font-size: 0.72rem;
}

.backlog-review {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.95rem 1rem;
}

.backlog-review__copy {
  min-width: 0;
}

.backlog-review__copy h2 {
  margin: 0.15rem 0 0;
  color: var(--pc-text, #111827);
  font-size: 0.95rem;
  font-weight: 700;
}

.backlog-review__copy p:last-child {
  margin: 0.18rem 0 0;
  color: var(--pc-muted, #64748b);
  font-size: 0.78rem;
}

.backlog-review__actions {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  flex: 0 0 auto;
}

.backlog-review__primary,
.tomorrow-preview__link {
  color: var(--pc-primary, #4f46e5);
  font-size: 0.78rem;
  font-weight: 700;
  text-decoration: none;
  white-space: nowrap;
}

.backlog-review__primary:hover,
.tomorrow-preview__link:hover {
  color: var(--pc-primary-strong, #4338ca);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.backlog-review__menu {
  position: relative;
}

.backlog-review__menu summary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 0.55rem;
  color: var(--pc-muted, #64748b);
  cursor: pointer;
  list-style: none;
}

.backlog-review__menu summary::-webkit-details-marker {
  display: none;
}

.backlog-review__menu summary:hover,
.backlog-review__menu[open] summary {
  background: var(--pc-surface-muted, #f1f5f9);
  color: var(--pc-primary, #4f46e5);
}

.backlog-review__menu-popover {
  position: absolute;
  right: 0;
  z-index: 5;
  display: grid;
  min-width: 9.5rem;
  margin-top: 0.35rem;
  overflow: hidden;
  border: 1px solid var(--pc-border, #e5e7eb);
  border-radius: 0.7rem;
  background: var(--pc-surface, #ffffff);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.14);
}

.backlog-review__menu-popover a,
.backlog-review__menu-popover button {
  padding: 0.6rem 0.75rem;
  border: 0;
  background: transparent;
  color: var(--pc-text, #334155);
  font-size: 0.76rem;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
}

.backlog-review__menu-popover a:hover,
.backlog-review__menu-popover button:hover {
  background: var(--pc-surface-muted, #f8fafc);
  color: var(--pc-primary, #4f46e5);
}

.tomorrow-preview {
  padding: 0.95rem 1rem;
}

.tomorrow-preview__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.tomorrow-preview__summary {
  margin: 0.18rem 0 0;
  color: var(--pc-muted, #64748b);
  font-size: 0.78rem;
}

.tomorrow-preview__list {
  display: grid;
  gap: 0.55rem;
  margin: 0.8rem 0 0;
  padding: 0.7rem 0 0;
  border-top: 1px solid var(--pc-border, #e5e7eb);
  list-style: none;
}

.tomorrow-preview__list li {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
  min-width: 0;
}

.tomorrow-preview__task {
  min-width: 0;
  overflow: hidden;
  color: var(--pc-text, #334155);
  font-size: 0.78rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tomorrow-preview__meta {
  flex: 0 0 auto;
  color: var(--pc-muted, #64748b);
  font-size: 0.7rem;
}

.today-active-focus {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
  max-width: 17rem;
  padding: 0.7rem 0.9rem;
  border-left: 3px solid var(--pc-primary, #4f46e5);
  background: var(--pc-primary-soft, #eef2ff);
  border-radius: 0.25rem 0.75rem 0.75rem 0.25rem;
}

.today-active-focus__label {
  color: var(--pc-primary, #4f46e5);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.today-active-focus__task {
  overflow: hidden;
  color: var(--pc-text, #111827);
  font-size: 0.85rem;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.today-workspace {
  padding: 0;
  background: transparent !important;
  border: 0 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
}

.today-workspace .daily-card__header {
  padding-bottom: 0.15rem;
}

.today-workspace .focus-date-pill {
  border-color: var(--pc-border, #e5e7eb);
  background: var(--pc-surface, #ffffff);
  color: var(--pc-text, #111827);
}

.today-workspace .focus-date-pill button,
.today-workspace .focus-date-pill span {
  color: var(--pc-text, #111827);
}

.today-workspace .focus-date-pill button:hover {
  background: var(--pc-surface-muted, #f1f5f9);
}

.today-workspace .jump-today-btn {
  color: var(--pc-primary, #4f46e5);
}

.today-workspace .daily-card__plan-btn {
  min-height: 2.5rem;
  flex: 0 0 auto;
  width: auto;
  border-radius: 0.75rem;
  background: var(--pc-primary, #4f46e5);
  box-shadow: 0 8px 18px rgba(79, 70, 229, 0.18);
}

.today-workspace .daily-card__plan-btn:hover {
  background: var(--pc-primary-strong, #4338ca);
}

.today-workspace .category-filter-strip {
  min-height: auto;
  padding: 0.25rem 0 0.15rem;
  border-bottom: 1px solid var(--pc-border, #e5e7eb);
}

.today-workspace .category-filter-chip {
  min-height: 2.1rem;
  border-radius: 999px;
}

.today-workspace .progress-card {
  border-color: var(--pc-border, #e5e7eb);
  background: var(--pc-surface-muted, #f8fafc);
}

.today-workspace .progress-card,
.today-workspace .progress-card span {
  color: var(--pc-muted, #64748b);
}

.today-workspace .progress-card .bg-slate-800 {
  background: #e2e8f0;
}

.today-task-list {
  margin: 0;
}

.today-task-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.9rem;
  min-width: 0;
  padding: 0.8rem 0;
  border-bottom: 1px solid var(--pc-border, #e5e7eb);
  transition: background-color 0.2s ease, border-color 0.2s ease;
}

.today-task-row:last-child {
  border-bottom: 0;
}

.today-task-row--active {
  margin-inline: -0.65rem;
  padding-inline: 0.65rem;
  border-radius: 0.75rem;
  background: var(--pc-primary-soft, #eef2ff);
  border-bottom-color: transparent;
}

.today-task-row__main {
  display: flex;
  align-items: flex-start;
  gap: 0.7rem;
  min-width: 0;
  flex: 1 1 auto;
}

.today-task-row__content {
  min-width: 0;
  flex: 1 1 auto;
}

.today-task-row__title-line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.45rem;
  min-width: 0;
}

.today-task-title {
  min-width: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--pc-text, #111827);
  font-size: 0.95rem;
  font-weight: 650;
  line-height: 1.35;
  text-align: left;
  overflow-wrap: anywhere;
  cursor: pointer;
}

.today-task-title:hover {
  color: var(--pc-primary, #4f46e5);
}

.today-task-title--completed {
  color: var(--pc-muted, #64748b);
  text-decoration: line-through;
}

.today-task-check {
  width: 1.05rem;
  height: 1.05rem;
  flex: 0 0 auto;
  margin-top: 0.15rem;
  accent-color: var(--pc-primary, #4f46e5);
  cursor: pointer;
}

.today-task-category {
  min-height: 1.45rem;
  padding: 0.2rem 0.55rem;
  border: 1px solid var(--pc-border, #e5e7eb) !important;
  border-radius: 999px;
  background: var(--pc-surface-muted, #f8fafc) !important;
  color: var(--pc-muted, #64748b) !important;
  font-size: 0.68rem;
  box-shadow: none !important;
}

.today-task-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.55rem;
  margin-top: 0.25rem;
  color: var(--pc-muted, #64748b);
  font-size: 0.75rem;
}

.today-task-link {
  color: var(--pc-primary, #4f46e5);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.today-task-row__actions {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex: 0 0 auto;
}

.today-task-row__actions > button:first-child {
  border-color: rgba(79, 70, 229, 0.24);
  background: var(--pc-primary-soft, #eef2ff);
  color: var(--pc-primary, #4f46e5);
}

.today-task-row__actions > button:first-child:hover {
  border-color: rgba(79, 70, 229, 0.46);
  background: #e0e7ff;
}

.today-task-overflow,
.today-task-reminder {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  padding: 0;
  border: 0;
  border-radius: 0.55rem;
  background: transparent;
  color: var(--pc-muted, #64748b);
  font-size: 0.85rem;
  cursor: pointer;
}

.today-task-overflow:hover,
.today-task-reminder:hover {
  background: var(--pc-surface-muted, #f1f5f9);
  color: var(--pc-primary, #4f46e5);
}

.today-dashboard .today-list:not(.today-list--fullscreen) {
  max-height: none;
  overflow: visible;
  padding-right: 0;
}

.today-dashboard .dashboard-task-skeleton-card {
  border-color: var(--pc-border, #e5e7eb);
  background: var(--pc-surface, #ffffff);
}

.today-dashboard .daily-card--fullscreen {
  background: var(--pc-page, #f7f8fc);
  color: var(--pc-text, #111827);
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.16);
}

@media (max-width: 640px) {
  .today-intro {
    align-items: flex-start;
    flex-direction: column;
    gap: 0.8rem;
    padding-top: 0;
  }

  .today-active-focus {
    width: 100%;
    max-width: none;
  }

  .today-next-up {
    width: 100%;
    max-width: none;
  }

  .backlog-review {
    align-items: flex-start;
    flex-direction: column;
  }

  .backlog-review__actions {
    width: 100%;
    justify-content: space-between;
  }

  .today-workspace .daily-card__actions {
    width: auto;
    flex-wrap: nowrap;
  }

  .today-workspace .daily-card__plan-btn {
    width: auto;
  }

  .today-workspace .today-fullscreen-btn--inline {
    display: inline-flex;
  }

  .today-workspace .progress-card {
    display: none;
  }

  .today-task-row {
    align-items: flex-start;
  }

  .today-task-row__actions {
    gap: 0.15rem;
  }

  .today-task-row__actions > button:first-child {
    min-height: 2rem;
    padding-inline: 0.55rem;
  }
}

.today-completion-ring {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.45rem;
  height: 1.45rem;
  flex: 0 0 1.45rem;
  margin-top: 0.05rem;
  padding: 0;
  border: 2px solid #cbd5e1;
  border-radius: 999px;
  background: transparent;
  color: #ffffff;
  font-size: 0.75rem;
  font-weight: 800;
  line-height: 1;
  cursor: pointer;
  transition: border-color 0.2s ease, background-color 0.25s ease, box-shadow 0.2s ease, transform 0.15s ease;
}

.today-completion-ring:hover,
.today-completion-ring:focus-visible {
  border-color: var(--pc-primary, #4f46e5);
  box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.12);
  outline: none;
}

.today-completion-ring:active {
  transform: scale(0.9);
}

.today-completion-ring--completed {
  border-color: var(--pc-primary, #4f46e5);
  background: var(--pc-primary, #4f46e5);
  animation: completion-ring-fill 0.35s ease-out;
}

.today-task-row--completed {
  opacity: 0.68;
}

.today-task-duration {
  color: var(--pc-primary, #4f46e5);
  font-weight: 600;
}

.today-task-focus-status {
  color: var(--pc-primary, #4f46e5);
  font-weight: 700;
}

.today-task-enter-active,
.today-task-leave-active {
  overflow: hidden;
  transition: opacity 0.3s ease, transform 0.3s ease, max-height 0.3s ease, padding 0.3s ease;
}

.today-task-enter-from,
.today-task-leave-to {
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
  opacity: 0;
  transform: translateY(-5px) scale(0.98);
}

.today-task-move {
  transition: transform 0.3s ease;
}

.completion-toast {
  position: fixed;
  right: max(1rem, env(safe-area-inset-right));
  bottom: max(1rem, env(safe-area-inset-bottom));
  left: max(1rem, env(safe-area-inset-left));
  z-index: 120;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  width: min(24rem, calc(100vw - 2rem));
  margin-inline: auto;
  padding: 0.8rem 0.9rem 0.8rem 1rem;
  border: 1px solid rgba(79, 70, 229, 0.18);
  border-radius: 0.85rem;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 16px 38px rgba(15, 23, 42, 0.16);
  color: var(--pc-text, #111827);
  backdrop-filter: blur(12px);
}

.completion-toast__message {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 0.5rem;
  overflow: hidden;
  font-size: 0.84rem;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.completion-toast__check {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.2rem;
  height: 1.2rem;
  flex: 0 0 1.2rem;
  border-radius: 999px;
  background: var(--pc-primary, #4f46e5);
  color: #ffffff;
  font-size: 0.72rem;
}

.completion-toast__undo {
  flex: 0 0 auto;
  padding: 0.35rem 0.45rem;
  border: 0;
  background: transparent;
  color: var(--pc-primary, #4f46e5);
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
}

.completion-toast__undo:hover {
  color: var(--pc-primary-strong, #4338ca);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.completion-toast-enter-active,
.completion-toast-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.completion-toast-enter-from,
.completion-toast-leave-to {
  opacity: 0;
  transform: translateY(0.5rem);
}

@keyframes completion-ring-fill {
  0% {
    transform: scale(0.84);
    box-shadow: 0 0 0 0 rgba(79, 70, 229, 0.3);
  }
  65% {
    transform: scale(1.08);
    box-shadow: 0 0 0 5px rgba(79, 70, 229, 0.08);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(79, 70, 229, 0);
  }
}


</style>
