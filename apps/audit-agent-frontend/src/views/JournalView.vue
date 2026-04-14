<template>
  <div class="min-h-screen bg-gradient-to-br from-[#0b1220] via-[#0f172a] to-[#0b1020] text-slate-100">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <header class="text-center space-y-3 animate-fade-in">
        <p class="text-xs uppercase tracking-[0.35em] text-indigo-300/80">Journal</p>
        <h1 class="text-3xl sm:text-4xl font-semibold">How are you feeling today, {{ userName }}?</h1>
        <p class="text-sm text-slate-300">A gentle place to breathe, reflect, and grow.</p>
      </header>

      <!-- AI insights -->
      <section
        class="rounded-2xl border border-indigo-500/30 bg-indigo-900/20 backdrop-blur-md shadow-lg p-4 sm:p-5 flex flex-wrap gap-3 items-center justify-between animate-slide-up"
      >
        <div class="flex items-center gap-2">
          <span class="text-lg">✨</span>
          <div>
            <p class="text-sm text-indigo-200">AI summary of your recent journaling</p>
            <p class="text-base font-semibold text-indigo-100">{{ insights[0] }}</p>
          </div>
        </div>
        <div class="flex flex-wrap gap-2 text-sm text-indigo-200">
          <span v-for="(insight, idx) in insights.slice(1, 3)" :key="idx" class="px-3 py-1 rounded-full bg-white/10 border border-white/10">
            {{ insight }}
          </span>
        </div>
      </section>

      <!-- Mood selector -->
      <section class="rounded-2xl bg-white/5 border border-white/10 p-5 shadow-lg animate-slide-up">
        <div class="flex items-center justify-between mb-4">
          <div>
            <p class="text-xs uppercase tracking-[0.25em] text-indigo-300/80">Mood</p>
            <h2 class="text-xl font-semibold">How's your energy?</h2>
          </div>
          <span v-if="selectedMood" class="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-100 text-sm flex items-center gap-2">
            <span class="text-lg">{{ selectedMood.emoji }}</span>
            {{ selectedMood.label }}
          </span>
        </div>
        <div class="flex flex-wrap gap-3">
          <button
            v-for="mood in moodOptions"
            :key="mood.label"
            type="button"
            class="mood-pill"
            :class="[
              mood.class,
              selectedMood?.label === mood.label ? 'ring-2 ring-indigo-300 scale-105' : 'opacity-90 hover:opacity-100'
            ]"
            @click="selectMood(mood)"
          >
            <span class="text-xl">{{ mood.emoji }}</span>
            <span class="text-sm font-semibold">{{ mood.label }}</span>
          </button>
        </div>
      </section>

      <!-- Write + Voice split -->
      <section class="grid gap-5 md:grid-cols-2 animate-slide-up">
        <div class="rounded-2xl bg-white/8 border border-white/10 p-5 shadow-lg space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs uppercase tracking-[0.25em] text-indigo-300/80">Write</p>
              <h3 class="text-lg font-semibold">Write your reflection</h3>
            </div>
            <div class="flex gap-2 text-xs text-indigo-200">
              <span class="px-2 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30">Tags</span>
              <span class="px-2 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30">Private</span>
            </div>
          </div>

          <textarea
            v-model="entryText"
            placeholder="Write freely… no rules here."
            rows="6"
            class="w-full rounded-2xl bg-slate-900/60 border border-white/10 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none shadow-inner"
          ></textarea>

          <div class="flex flex-wrap gap-2 text-xs">
            <button
              v-for="tag in tagSuggestions"
              :key="tag"
              type="button"
              class="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-indigo-100 hover:border-indigo-300/60 transition"
              @click="appendTag(tag)"
            >
              #{{ tag }}
            </button>
          </div>

          <div class="flex flex-wrap gap-3 items-center">
            <button
              class="px-5 py-2 rounded-lg bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-sm font-semibold hover:from-indigo-600 hover:to-pink-600 transition disabled:opacity-60"
              :disabled="!entryText.trim()"
              @click="saveEntry"
            >
              Save entry
            </button>
            <button
              class="px-4 py-2 rounded-lg bg-white/10 border border-white/15 text-sm font-semibold hover:border-indigo-300/60 hover:bg-white/15 transition disabled:opacity-60"
              :disabled="!actionDetectionInput || !hasWorkspace || actionDetectionLoading"
              @click="detectDraftActions"
            >
              {{ actionDetectionLoading ? 'Detecting…' : 'Detect actions' }}
            </button>
            <p v-if="enhancedText" class="text-xs text-indigo-200">✨ Polished: {{ enhancedText }}</p>
          </div>
          <p class="text-xs text-indigo-200/80">
            Saving or scanning can surface deadlines, promises, and follow-ups in your action inbox.
          </p>
        </div>

        <div class="rounded-2xl bg-white/6 border border-white/10 p-5 shadow-lg space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs uppercase tracking-[0.25em] text-indigo-300/80">Voice</p>
              <h3 class="text-lg font-semibold">Voice journal</h3>
            </div>
            <span class="px-2 py-1 rounded-full bg-cyan-500/15 border border-cyan-400/40 text-xs text-cyan-100">Live</span>
          </div>
          <VoiceRecorder @transcribed="handleTranscript" />
          <div v-if="voiceTranscript" class="rounded-xl bg-slate-900/60 border border-white/10 p-3 text-sm">
            <p class="text-xs text-indigo-200 mb-1">Transcript</p>
            <p class="text-slate-100">{{ voiceTranscript }}</p>
            <div class="mt-2 flex gap-2">
              <button
                class="px-3 py-1 rounded-full text-xs bg-indigo-500/20 border border-indigo-400/40"
                @click="entryText = voiceTranscript"
              >
                Use as entry
              </button>
              <button class="px-3 py-1 rounded-full text-xs bg-white/10 border border-white/10" @click="voiceTranscript = ''">
                Clear
              </button>
            </div>
          </div>

          <div
            v-if="imageTasksEnabled"
            class="mt-4 rounded-xl bg-slate-900/50 border border-indigo-400/20 p-4 space-y-3"
          >
            <div class="flex items-center justify-between">
              <div>
                <p class="text-xs uppercase tracking-[0.25em] text-indigo-300/80">Scan</p>
                <h3 class="text-base font-semibold">Scan a page or scribble</h3>
              </div>
              <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onFileChange" />
              <button
                class="px-3 py-2 rounded-lg bg-indigo-500 text-sm font-semibold hover:bg-indigo-600 disabled:opacity-60"
                :disabled="captureLoading"
                @click="() => fileInput?.click()"
              >
                {{ captureLoading ? 'Processing…' : 'Scan page' }}
              </button>
            </div>
            <p v-if="captureImageName" class="text-xs text-indigo-200">Image: {{ captureImageName }}</p>
            <p v-if="captureError" class="text-xs text-rose-300">{{ captureError }}</p>

            <div v-if="captureItems.length" class="space-y-2">
              <p class="text-xs text-indigo-200">Detected items (edit before creating tasks):</p>
              <div
                v-for="(item, idx) in captureItems"
                :key="idx"
                class="rounded-lg border border-white/10 bg-slate-900/60 p-3 space-y-2"
              >
                <div class="flex items-center gap-2">
                  <input type="checkbox" v-model="item.include" class="rounded text-indigo-500" />
                  <input
                    v-model="item.title"
                    class="flex-1 rounded bg-slate-800 border border-white/10 px-2 py-1 text-sm"
                    :placeholder="item.type === 'event' ? 'Event title' : 'Task title'"
                  />
                  <span
                    class="text-[11px] px-2 py-1 rounded-full border"
                    :class="item.type === 'event' ? 'border-emerald-300/40 text-emerald-200' : 'border-indigo-300/40 text-indigo-200'"
                  >
                    {{ item.type }}
                  </span>
                </div>
                <textarea
                  v-model="item.description"
                  rows="2"
                  class="w-full rounded bg-slate-800 border border-white/10 px-2 py-1 text-sm"
                  placeholder="Details or context"
                ></textarea>
              </div>
              <div class="flex justify-end">
                <button
                  class="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-emerald-500 text-sm font-semibold hover:from-indigo-600 hover:to-emerald-600 disabled:opacity-60"
                  :disabled="captureLoading || !captureItems.some((i) => i.include && i.title)"
                  @click="commitCapture"
                >
                  Create {{ captureItems.filter((i) => i.include).length }} items
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="rounded-2xl bg-white/6 border border-white/10 p-5 shadow-lg space-y-4 animate-slide-up">
        <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p class="text-xs uppercase tracking-[0.25em] text-indigo-300/80">Action inbox</p>
            <h3 class="text-lg font-semibold">Nothing slips through your notes</h3>
            <p class="text-sm text-slate-300">
              Review suggested actions before they become real tasks. You stay in control.
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2 text-xs">
            <span class="px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-400/30 text-indigo-100">
              {{ pendingSuggestionsLabel }}
            </span>
            <button
              class="px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-slate-100 hover:border-indigo-300/60 transition disabled:opacity-60"
              :disabled="!hasWorkspace || actionInboxLoading"
              @click="() => refreshActionInbox({ sync: true, trigger: 'manual_refresh' })"
            >
              {{ actionInboxLoading ? 'Refreshing…' : 'Refresh inbox' }}
            </button>
          </div>
        </div>

        <div
          v-if="!hasWorkspace"
          class="rounded-xl border border-dashed border-white/15 bg-slate-900/35 px-4 py-6 text-sm text-indigo-100/75"
        >
          Select a workspace to route confirmed suggestions into tasks.
        </div>

        <div
          v-else-if="actionInboxDailyIntentLoading && !actionInboxDailyIntent"
          class="rounded-2xl border border-fuchsia-400/20 bg-fuchsia-500/10 px-4 py-5 text-sm text-fuchsia-50"
        >
          Shaping today’s focus from your action inbox…
        </div>

        <section
          v-else-if="actionInboxDailyIntent?.focus"
          class="rounded-2xl border border-fuchsia-400/20 bg-gradient-to-br from-fuchsia-500/12 via-indigo-500/12 to-cyan-500/10 p-5 shadow-lg"
        >
          <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div class="space-y-3 min-w-0">
              <div>
                <p class="text-xs uppercase tracking-[0.28em] text-fuchsia-200/80">Today’s Focus</p>
                <h4 class="mt-2 text-2xl font-semibold text-white">
                  {{ actionInboxDailyIntent.focus.displayTitle || actionInboxDailyIntent.focus.title }}
                </h4>
                <p class="mt-2 text-sm text-fuchsia-50/90">{{ actionInboxDailyIntent.summary }}</p>
                <p class="mt-1 text-sm text-indigo-100/85">{{ actionInboxDailyIntent.secondarySummary }}</p>
              </div>

              <div class="flex flex-wrap gap-2 text-xs">
                <span class="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white/90">
                  {{ formatSuggestionTiming(actionInboxDailyIntent.focus) }}
                </span>
                <span class="rounded-full border border-fuchsia-300/30 bg-fuchsia-500/10 px-3 py-1 text-fuchsia-100">
                  {{ confidencePercent(actionInboxDailyIntent.focus) }}% confidence
                </span>
                <span class="rounded-full border border-cyan-300/30 bg-cyan-500/10 px-3 py-1 text-cyan-100">
                  {{ actionInboxDailyIntent.focus.category || 'Other' }}
                </span>
                <span
                  v-if="actionInboxDailyIntent.pendingCount > 1"
                  class="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white/80"
                >
                  {{ actionInboxDailyIntent.pendingCount }} pending suggestions
                </span>
              </div>

              <div class="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                <p class="text-[11px] uppercase tracking-[0.2em] text-fuchsia-100/70">Why this matters today</p>
                <p class="mt-1 text-sm text-slate-100">
                  {{ actionInboxDailyIntent.focus.reason || actionInboxDailyIntent.focus.rationale || suggestionSummary(actionInboxDailyIntent.focus) }}
                </p>
              </div>
            </div>

            <div class="min-w-[220px] rounded-xl border border-white/10 bg-slate-950/35 px-4 py-4">
              <p class="text-[11px] uppercase tracking-[0.2em] text-indigo-200/80">Prompt</p>
              <p class="mt-2 text-sm font-medium text-white">{{ actionInboxDailyIntent.prompt }}</p>
              <div v-if="actionInboxDailyIntent.supporting?.length" class="mt-4 space-y-2">
                <p class="text-[11px] uppercase tracking-[0.2em] text-slate-400">Also waiting</p>
                <div
                  v-for="support in actionInboxDailyIntent.supporting"
                  :key="support.id"
                  class="rounded-lg border border-white/10 bg-white/5 px-3 py-2"
                >
                  <p class="text-sm text-slate-100">{{ support.displayTitle || support.title }}</p>
                  <p class="mt-1 text-xs text-slate-400">{{ formatSuggestionTiming(support) }}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div
          v-if="hasWorkspace && actionInboxInsightsLoading && !actionInboxInsights"
          class="rounded-xl border border-white/10 bg-slate-900/35 px-4 py-5 text-sm text-slate-300"
        >
          Learning what tends to stick from your inbox…
        </div>

        <div v-if="hasWorkspace && actionInboxInsights" class="space-y-3">
          <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div
              v-for="card in actionInboxInsightCards"
              :key="card.label"
              class="rounded-xl border border-white/10 bg-slate-950/45 px-4 py-3"
            >
              <p class="text-[11px] uppercase tracking-[0.22em] text-slate-400">{{ card.label }}</p>
              <p class="mt-2 text-2xl font-semibold text-white">{{ card.value }}</p>
              <p class="mt-1 text-xs text-slate-300">{{ card.hint }}</p>
            </div>
          </div>

          <div class="rounded-xl border border-indigo-400/20 bg-indigo-500/10 px-4 py-4">
            <p class="text-[11px] uppercase tracking-[0.22em] text-indigo-200/80">Learning loop</p>
            <p class="mt-2 text-sm text-indigo-50">{{ actionInboxInsights.behaviorSummary }}</p>
            <div class="mt-3 flex flex-wrap gap-2 text-xs text-indigo-100/85">
              <span
                v-if="actionInboxInsights.topConfirmedCategory"
                class="rounded-full border border-emerald-300/25 bg-emerald-500/10 px-3 py-1"
              >
                Most confirmed: {{ actionInboxInsights.topConfirmedCategory }}
              </span>
              <span
                v-if="actionInboxInsights.topIgnoredCategory"
                class="rounded-full border border-amber-300/25 bg-amber-500/10 px-3 py-1"
              >
                Most ignored: {{ actionInboxInsights.topIgnoredCategory }}
              </span>
              <span class="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                Window: last {{ actionInboxInsights.timeframeDays }} days
              </span>
            </div>
          </div>
        </div>

        <div
          v-else-if="actionInboxLoading && !actionSuggestions.length"
          class="rounded-xl border border-white/10 bg-slate-900/45 px-4 py-6 text-sm text-slate-300"
        >
          Loading your suggested actions…
        </div>

        <div
          v-else-if="!actionSuggestions.length"
          class="rounded-xl border border-dashed border-white/15 bg-slate-900/35 px-4 py-8 text-center text-sm text-indigo-100/75"
        >
          No suggestions waiting. Save a reflection or scan your draft to surface commitments.
        </div>

        <div v-else class="grid gap-3 lg:grid-cols-2">
          <article
            v-for="item in actionSuggestions"
            :key="item.id"
            class="rounded-2xl border border-white/10 bg-slate-900/55 p-4 space-y-4 shadow-sm"
          >
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="space-y-2 min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="text-[11px] px-2 py-1 rounded-full border" :class="confidenceBadgeClass(item.confidence)">
                    {{ confidenceLabel(item.confidence) }}
                  </span>
                  <span class="text-[11px] text-slate-400">
                    {{ confidencePercent(item) }}% confidence
                  </span>
                  <span class="text-[11px] px-2 py-1 rounded-full border border-white/10 bg-white/5 text-slate-200">
                    {{ item.category || 'Other' }}
                  </span>
                  <span
                    v-if="item.urgency"
                    class="text-[11px] px-2 py-1 rounded-full border border-amber-300/30 bg-amber-500/10 text-amber-100 capitalize"
                  >
                    {{ item.urgency }} urgency
                  </span>
                </div>
                <div>
                  <h4 class="text-base font-semibold text-white">{{ item.displayTitle || item.title }}</h4>
                  <p class="text-sm text-slate-300">
                    {{ suggestionSummary(item) }}
                  </p>
                </div>
                <div class="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                  <p class="text-[11px] uppercase tracking-[0.2em] text-slate-400">Why this showed up</p>
                  <p class="mt-1 text-sm text-slate-200">{{ item.reason || item.rationale || suggestionSummary(item) }}</p>
                </div>
              </div>
              <span class="text-[11px] text-indigo-200/80 shrink-0">
                Detected from your {{ item.sourceLabel || 'note' }}
              </span>
            </div>

            <div class="flex flex-wrap gap-2 text-xs">
              <span
                class="px-2.5 py-1 rounded-full border"
                :class="item.dueDate || item.scheduledTime ? 'border-emerald-300/30 bg-emerald-500/10 text-emerald-100' : 'border-white/10 bg-white/5 text-slate-300'"
              >
                {{ formatSuggestionTiming(item) }}
              </span>
              <span
                v-for="reason in item.reasons || []"
                :key="`${item.id}-${reason}`"
                class="px-2.5 py-1 rounded-full border border-indigo-300/20 bg-indigo-500/10 text-indigo-100"
              >
                {{ formatReason(reason) }}
              </span>
              <span
                v-for="field in item.missingFields || []"
                :key="`${item.id}-missing-${field}`"
                class="px-2.5 py-1 rounded-full border border-amber-300/20 bg-amber-500/10 text-amber-100"
              >
                Needs {{ formatMissingField(field) }}
              </span>
              <span
                v-if="item.lastSurfacedReason"
                class="px-2.5 py-1 rounded-full border border-sky-300/20 bg-sky-500/10 text-sky-100"
              >
                Resurfaced: {{ formatSurfacedReason(item.lastSurfacedReason) }}
              </span>
              <span
                v-if="item.lastNudgedAt"
                class="px-2.5 py-1 rounded-full border border-fuchsia-300/20 bg-fuchsia-500/10 text-fuchsia-100"
              >
                Nudged {{ formatRelativeAction(item.lastNudgedAt) }}
              </span>
            </div>

            <blockquote
              v-if="item.rawPhrase"
              class="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200"
            >
              “{{ item.rawPhrase }}”
            </blockquote>

            <div
              v-if="item.followUpPrompt"
              class="rounded-xl border border-amber-300/20 bg-amber-500/10 px-3 py-3 text-sm text-amber-50"
            >
              <p class="text-[11px] uppercase tracking-[0.2em] text-amber-100/80">Missing info</p>
              <p class="mt-1">{{ item.followUpPrompt }}</p>
            </div>

            <div v-if="item.needsDate || needsTimeInput(item)" class="grid gap-3 md:grid-cols-2">
              <div v-if="item.needsDate" class="space-y-1">
                <label class="text-xs uppercase tracking-[0.2em] text-slate-400">Optional due date</label>
                <input
                  v-model="item.draftDate"
                  type="date"
                  class="w-full rounded-xl bg-slate-950/60 border border-slate-800 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
                />
              </div>
              <div v-if="needsTimeInput(item)" class="space-y-1">
                <label class="text-xs uppercase tracking-[0.2em] text-slate-400">Optional time</label>
                <input
                  v-model="item.draftTime"
                  type="time"
                  class="w-full rounded-xl bg-slate-950/60 border border-slate-800 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
                />
              </div>
            </div>

            <div v-if="needsDetailsInput(item)" class="space-y-1">
              <label class="text-xs uppercase tracking-[0.2em] text-slate-400">Add detail</label>
              <textarea
                v-model="item.draftDetails"
                rows="2"
                class="w-full rounded-xl bg-slate-950/60 border border-slate-800 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none resize-none"
                placeholder="Add context that will make the task easier to complete."
              ></textarea>
            </div>

            <div class="flex flex-wrap gap-2">
              <button
                class="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-sm font-semibold text-white hover:from-indigo-400 hover:to-fuchsia-400 transition disabled:opacity-60"
                :disabled="suggestionBusyId === item.id"
                @click="confirmSuggestion(item)"
              >
                {{ suggestionBusyId === item.id ? 'Confirming…' : confirmLabel(item) }}
              </button>
              <button
                class="px-4 py-2 rounded-lg bg-white/10 border border-white/10 text-sm font-semibold text-slate-200 hover:border-rose-300/60 hover:text-white transition disabled:opacity-60"
                :disabled="suggestionBusyId === item.id"
                @click="ignoreSuggestion(item)"
              >
                Ignore
              </button>
            </div>
          </article>
        </div>
      </section>

      <!-- Timeline & Trends -->
      <section class="grid gap-5 lg:grid-cols-[2fr_1fr] animate-slide-up">
        <div class="rounded-2xl bg-white/6 border border-white/10 p-5 shadow-lg">
          <div class="flex items-center justify-between mb-3">
            <div>
              <p class="text-xs uppercase tracking-[0.25em] text-indigo-300/80">Timeline</p>
              <h3 class="text-lg font-semibold">Your reflection timeline</h3>
            </div>
            <span class="text-xs text-indigo-200">({{ filteredLogs.length }})</span>
          </div>
          <div
            v-if="filteredLogs.length"
            class="space-y-3 max-h-[480px] overflow-y-auto pr-1 scrollbar-plan"
          >
            <div
              v-for="log in filteredLogs"
              :key="log.id"
              class="rounded-xl border border-white/10 bg-slate-900/50 p-4 hover:border-indigo-400/60 transition shadow-sm relative"
            >
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2">
                  <span class="text-lg">{{ log.mood?.emoji || '🌿' }}</span>
                  <div>
                    <p class="text-sm font-semibold text-slate-100">{{ log.summary }}</p>
                    <p class="text-[11px] text-indigo-200">{{ log.mood?.label || 'Mood' }}</p>
                  </div>
                </div>
                <span class="text-xs text-indigo-200">
                  {{ formatDate(log.timestamp) }}
                </span>
              </div>
              <p class="text-sm text-slate-200 line-clamp-3">{{ log.text }}</p>
              <div class="mt-3 flex gap-2 text-[11px] text-indigo-200 flex-wrap">
                <span class="px-2 py-1 rounded-full bg-white/5 border border-white/10" v-for="tag in log.tags || []" :key="tag">
                  #{{ tag }}
                </span>
                <button class="ml-auto text-indigo-300 hover:text-white text-xs" @click="openEntry(log)">View full</button>
              </div>
            </div>
          </div>
          <div
            v-else
            class="rounded-xl border border-dashed border-white/15 bg-slate-900/35 px-4 py-8 text-center text-sm text-indigo-100/75"
          >
            No journal entries yet. Save your first reflection to start your timeline.
          </div>
        </div>

        <div class="space-y-4">
          <div class="rounded-2xl bg-white/6 border border-white/10 p-4 shadow-lg">
            <p class="text-xs uppercase tracking-[0.25em] text-indigo-300/80">Streak</p>
            <div class="flex items-center justify-between mt-2">
              <div>
                <h4 class="text-xl font-semibold">{{ streak }}-day streak</h4>
                <p class="text-sm text-indigo-200">Longest: {{ longestStreak }} days</p>
              </div>
              <span class="text-3xl">🔥</span>
            </div>
            <div class="mt-3 h-2 rounded-full bg-slate-800 overflow-hidden">
              <div class="h-full bg-gradient-to-r from-emerald-400 via-indigo-400 to-pink-400" :style="{ width: streakBarWidth }"></div>
            </div>
          </div>

          <div class="rounded-2xl bg-white/6 border border-white/10 p-4 shadow-lg">
            <p class="text-xs uppercase tracking-[0.25em] text-indigo-300/80">Emotion trend</p>
            <div v-if="trendValues.length" class="mt-2">
              <svg viewBox="0 0 240 80" class="w-full h-24">
                <polyline
                  :points="sparkPoints"
                  fill="none"
                  stroke="url(#grad)"
                  stroke-width="3"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <defs>
                  <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stop-color="#a5b4fc" />
                    <stop offset="100%" stop-color="#34d399" />
                  </linearGradient>
                </defs>
              </svg>
              <p class="text-xs text-indigo-200 mt-1">Higher means lighter moods. Based on your last {{ Math.min(trendValues.length, 10) }} entries.</p>
            </div>
            <div
              v-else
              class="mt-3 rounded-xl border border-dashed border-white/10 bg-slate-900/35 px-4 py-6 text-sm text-indigo-100/70"
            >
              No mood trend yet. Add a few reflections and we’ll chart the pattern here.
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- Entry drawer -->
    <el-drawer v-model="drawerOpen" size="420px" title="Journal entry" class="journal-drawer">
      <div v-if="activeEntry" class="space-y-3 text-slate-100">
        <div class="flex items-center gap-2 text-sm text-indigo-200">
          <span class="text-xl">{{ activeEntry.mood?.emoji || '🌿' }}</span>
          <span>{{ activeEntry.mood?.label || 'Mood' }}</span>
          <span class="text-xs text-slate-400 ml-auto">{{ formatDate(activeEntry.timestamp) }}</span>
        </div>
        <p class="text-sm text-slate-300 whitespace-pre-line">{{ activeEntry.text }}</p>
        <div class="flex gap-2 text-[11px] text-indigo-200 flex-wrap">
          <span v-for="tag in activeEntry.tags || []" :key="tag" class="px-2 py-1 rounded-full bg-white/5 border border-white/10">
            #{{ tag }}
          </span>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { fetchEntries, saveEntryToFirebase } from '@/services/firebaseService'
import { enhanceJournal } from '@/services/aiService'
import {
  confirmActionInboxSuggestion,
  fetchActionInboxDailyIntent,
  detectActionInboxSuggestions,
  fetchActionInbox,
  fetchActionInboxInsights,
  ignoreActionInboxSuggestion,
  syncActionInbox,
} from '@/services/actionInboxService'
import VoiceRecorder from '@/components/VoiceRecorder.vue'
import { ElNotification } from 'element-plus'
import { nlpClient } from '@/services/leader/http'
import { addTaskToFirebase } from '@/services/firebaseService'
import { areImageTasksEnabled } from '@/utils/imageTasksAccess'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { useTasks } from '@/composables/useTasks'

const authStore = useAuthStore()
const workspaceStore = useWorkspaceStore()
const { refreshAllTasks } = useTasks()
const userName = computed(() => authStore?.user?.displayName || 'friend')

const moodOptions = [
  { emoji: '🌸', label: 'Calm', score: 4, class: 'bg-gradient-to-r from-pink-400/40 to-indigo-400/30 border border-pink-200/40' },
  { emoji: '🌧', label: 'Overwhelmed', score: 1, class: 'bg-gradient-to-r from-slate-600/40 to-blue-500/40 border border-blue-200/40' },
  { emoji: '⚡', label: 'Motivated', score: 5, class: 'bg-gradient-to-r from-amber-300/50 to-orange-400/40 border border-amber-200/50' },
  { emoji: '🌿', label: 'Reflective', score: 3, class: 'bg-gradient-to-r from-emerald-300/40 to-teal-400/40 border border-emerald-200/50' },
  { emoji: '☀', label: 'Hopeful', score: 4, class: 'bg-gradient-to-r from-yellow-200/60 to-amber-300/50 border border-amber-100/60' },
]

const entryText = ref('')
const enhancedText = ref('')
const logs = ref([])
const selectedMood = ref(null)
const voiceTranscript = ref('')
const tagSuggestions = ['gratitude', 'focus', 'relationships', 'health', 'learning']
const drawerOpen = ref(false)
const activeEntry = ref(null)
const captureItems = ref([])
const capturePreview = ref('')
const captureLoading = ref(false)
const captureError = ref('')
const captureImageName = ref('')
const fileInput = ref(null)
const actionSuggestions = ref([])
const actionInboxLoading = ref(false)
const actionInboxInsights = ref(null)
const actionInboxInsightsLoading = ref(false)
const actionInboxDailyIntent = ref(null)
const actionInboxDailyIntentLoading = ref(false)
const actionDetectionLoading = ref(false)
const suggestionBusyId = ref('')
const imageTasksEnabled = areImageTasksEnabled()
let visionUploadLoader = null
async function getVisionUploader() {
  if (!imageTasksEnabled) throw new Error('Image capture is disabled')
  if (!visionUploadLoader) {
    visionUploadLoader = import('@/services/visionUploadService')
      .then((mod) => mod.uploadImageForVision)
      .catch((err) => {
        visionUploadLoader = null
        throw err
      })
  }
  return visionUploadLoader
}

async function loadJournalEntries() {
  try {
    logs.value = await fetchEntries()
  } catch (err) {
    console.warn('[JournalView] entry load failed', err?.message || err)
    logs.value = []
  }
}

function mergeActionSuggestions(items = []) {
  const existingById = new Map((actionSuggestions.value || []).map((item) => [item.id, item]))
  return (Array.isArray(items) ? items : []).map((item) => ({
    ...item,
    draftDate: existingById.get(item.id)?.draftDate ?? item.dueDate ?? '',
    draftTime: existingById.get(item.id)?.draftTime ?? extractDraftTime(item.scheduledTime),
    draftDetails: existingById.get(item.id)?.draftDetails ?? item.details ?? '',
  }))
}

async function loadActionSuggestions({ sync = false, trigger = 'manual_refresh' } = {}) {
  if (!authStore.user?.uid || !workspaceStore.activeWorkspaceId) {
    actionSuggestions.value = []
    return []
  }
  actionInboxLoading.value = true
  try {
    const suggestions = sync
      ? (
          await syncActionInbox({
            workspaceId: workspaceStore.activeWorkspaceId,
            trigger,
            limit: 24,
          })
        ).suggestions
      : await fetchActionInbox({
          workspaceId: workspaceStore.activeWorkspaceId,
          status: 'pending',
          limit: 24,
        })
    actionSuggestions.value = mergeActionSuggestions(suggestions)
    return actionSuggestions.value
  } catch (err) {
    console.warn('[JournalView] action inbox load failed', err?.message || err)
    actionSuggestions.value = []
    return []
  } finally {
    actionInboxLoading.value = false
  }
}

async function loadActionInboxInsights({ days = 30 } = {}) {
  if (!authStore.user?.uid || !workspaceStore.activeWorkspaceId) {
    actionInboxInsights.value = null
    return null
  }
  actionInboxInsightsLoading.value = true
  try {
    actionInboxInsights.value = await fetchActionInboxInsights({
      workspaceId: workspaceStore.activeWorkspaceId,
      days,
    })
    return actionInboxInsights.value
  } catch (err) {
    console.warn('[JournalView] action inbox insights failed', err?.message || err)
    actionInboxInsights.value = null
    return null
  } finally {
    actionInboxInsightsLoading.value = false
  }
}

async function loadActionInboxDailyIntent({ limit = 3 } = {}) {
  if (!authStore.user?.uid || !workspaceStore.activeWorkspaceId) {
    actionInboxDailyIntent.value = null
    return null
  }
  actionInboxDailyIntentLoading.value = true
  try {
    actionInboxDailyIntent.value = await fetchActionInboxDailyIntent({
      workspaceId: workspaceStore.activeWorkspaceId,
      limit,
    })
    return actionInboxDailyIntent.value
  } catch (err) {
    console.warn('[JournalView] daily intent failed', err?.message || err)
    actionInboxDailyIntent.value = null
    return null
  } finally {
    actionInboxDailyIntentLoading.value = false
  }
}

async function refreshActionInbox({ sync = false, trigger = 'manual_refresh' } = {}) {
  const [suggestions] = await Promise.all([
    loadActionSuggestions({ sync, trigger }),
    loadActionInboxInsights(),
    loadActionInboxDailyIntent(),
  ])
  return suggestions
}

watch(
  () => authStore.user?.uid,
  (uid) => {
    if (!uid) {
      logs.value = []
      actionSuggestions.value = []
      actionInboxInsights.value = null
      actionInboxDailyIntent.value = null
      return
    }
    loadJournalEntries()
  },
  { immediate: true },
)

watch(
  () => workspaceStore.activeWorkspaceId,
  (workspaceId) => {
    if (!workspaceId || !authStore.user?.uid) {
      actionSuggestions.value = []
      actionInboxInsights.value = null
      actionInboxDailyIntent.value = null
      return
    }
    refreshActionInbox()
  },
  { immediate: true },
)

function handleInboxUpdated() {
  refreshActionInbox().catch(() => {})
}

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('action-inbox-updated', handleInboxUpdated)
  }
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('action-inbox-updated', handleInboxUpdated)
  }
})

const filteredLogs = computed(() =>
  [...logs.value].sort((a, b) => (b.timestamp || b.createdAt || 0) - (a.timestamp || a.createdAt || 0)),
)

const streak = computed(() => computeStreak(filteredLogs.value))
const longestStreak = computed(() => computeLongestStreak(filteredLogs.value))
const streakBarWidth = computed(() => `${Math.min(100, streak.value * 10)}%`)

const trendValues = computed(() => filteredLogs.value.slice(0, 10).map((l) => moodScore(l.mood?.label)))
const sparkPoints = computed(() => {
  if (!trendValues.value.length) return ''
  const max = Math.max(...trendValues.value, 1)
  const min = Math.min(...trendValues.value, 0)
  const width = 240
  const height = 80
  return trendValues.value
    .map((v, idx) => {
      const x = (idx / Math.max(trendValues.value.length - 1, 1)) * width
      const norm = max === min ? 0.5 : (v - min) / (max - min)
      const y = height - norm * (height - 10) - 5
      return `${x},${y}`
    })
    .join(' ')
})

const insights = computed(() => {
  if (!filteredLogs.value.length) return ['Start journaling to see insights.', 'No dominant mood yet.', 'Add a voice note to capture feelings.']
  const lastMood = filteredLogs.value[0]?.mood?.label || 'Reflective'
  const dominant = dominantMood(filteredLogs.value)
  const count = filteredLogs.value.length
  return [
    `You've logged ${count} reflections. Keep the flow going.`,
    `Lately you’ve felt more ${dominant}.`,
    `Last entry felt ${lastMood.toLowerCase()}.`,
  ]
})

const hasWorkspace = computed(() => !!workspaceStore.activeWorkspaceId)
const actionDetectionInput = computed(() => {
  const draft = String(entryText.value || '').trim()
  if (draft) return draft
  return String(voiceTranscript.value || '').trim()
})
const pendingSuggestionsLabel = computed(() => {
  const count = actionSuggestions.value.length
  if (!count) return 'Inbox empty'
  if (count === 1) return '1 suggestion'
  return `${count} suggestions`
})
const actionInboxInsightCards = computed(() => {
  const insights = actionInboxInsights.value
  if (!insights) return []
  return [
    {
      label: 'Confirm rate',
      value: formatPercent(insights.confirmationRate),
      hint: insights.decisionsCount ? `${insights.confirmedCount}/${insights.decisionsCount} decisions` : 'No decisions yet',
    },
    {
      label: 'Average confidence',
      value: formatPercent(insights.averageConfidence),
      hint: `${insights.totalSuggestions || 0} suggestions in view`,
    },
    {
      label: 'Resurfaced',
      value: String(insights.totalResurfaces || 0),
      hint: `${insights.resurfacedSuggestionCount || 0} suggestion${insights.resurfacedSuggestionCount === 1 ? '' : 's'} revisited`,
    },
    {
      label: 'Urgent pending',
      value: String(insights.urgentPendingCount || 0),
      hint: `${insights.pendingCount || 0} pending total`,
    },
    {
      label: 'External nudges',
      value: String(insights.totalNudges || 0),
      hint: `${insights.nudgedSuggestionCount || 0} suggestion${insights.nudgedSuggestionCount === 1 ? '' : 's'} escalated`,
    },
  ]
})

function selectMood(mood) {
  selectedMood.value = mood
}

function handleTranscript(raw) {
  const text = typeof raw === 'string' ? raw : raw?.text || ''
  voiceTranscript.value = text
}

function appendTag(tag) {
  const insert = entryText.value.trim() ? `${entryText.value.trim()} #${tag}` : `#${tag}`
  entryText.value = insert
}

function confidenceLabel(value) {
  const token = String(value || 'medium').toLowerCase()
  if (token === 'high') return 'High confidence'
  if (token === 'low') return 'Soft nudge'
  return 'Needs review'
}

function confidencePercent(item) {
  const score = Number(item?.confidenceScore)
  if (!Number.isFinite(score)) return 65
  return Math.round(Math.max(0, Math.min(1, score)) * 100)
}

function formatPercent(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return '0%'
  return `${Math.round(Math.max(0, Math.min(1, numeric)) * 100)}%`
}

function confidenceBadgeClass(value) {
  const token = String(value || 'medium').toLowerCase()
  if (token === 'high') return 'border-emerald-300/40 bg-emerald-500/15 text-emerald-100'
  if (token === 'low') return 'border-amber-300/40 bg-amber-500/15 text-amber-100'
  return 'border-indigo-300/40 bg-indigo-500/15 text-indigo-100'
}

function formatReason(value) {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function formatMissingField(value) {
  const token = String(value || '').trim()
  if (token === 'dueDate') return 'date'
  return token || 'details'
}

function formatSurfacedReason(value) {
  const token = String(value || '').trim()
  if (token === 'deadline_today') return 'due today'
  if (token === 'deadline_2d') return 'deadline soon'
  if (token === 'deadline_7d') return 'upcoming deadline'
  if (token === 'scheduled_2h') return 'starts soon'
  if (token === 'scheduled_1d') return 'tomorrow'
  if (token === 'clarify_once') return 'needs timing'
  return formatReason(token)
}

function formatRelativeAction(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'recently'
  const diffMs = Date.now() - date.getTime()
  const diffHours = Math.round(diffMs / 3600000)
  if (diffHours <= 1) return 'recently'
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.round(diffMs / 86400000)
  if (diffDays <= 1) return 'yesterday'
  return `${diffDays}d ago`
}

function extractDraftTime(value) {
  const token = String(value || '').trim()
  const match = token.match(/T(\d{2}:\d{2})/)
  return match ? match[1] : ''
}

function needsTimeInput(item) {
  return !!item?.scheduledTime || Array.isArray(item?.missingFields) && item.missingFields.includes('time')
}

function needsDetailsInput(item) {
  return Array.isArray(item?.missingFields) && item.missingFields.includes('details')
}

function buildScheduledTimePayload(item) {
  const dateValue = String(item?.draftDate || item?.dueDate || '').trim()
  const timeValue = String(item?.draftTime || '').trim()
  if (dateValue && timeValue) return `${dateValue}T${timeValue}`
  return item?.scheduledTime || null
}

function formatSuggestionTiming(item) {
  if (item?.scheduledTime) {
    const date = new Date(item.scheduledTime)
    if (!Number.isNaN(date.getTime())) {
      return `Scheduled ${date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`
    }
  }
  if (item?.dueDate) {
    const date = new Date(`${item.dueDate}T00:00:00`)
    if (!Number.isNaN(date.getTime())) {
      return `Due ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
    }
    return `Due ${item.dueDate}`
  }
  return 'No date detected'
}

function suggestionSummary(item) {
  if (item?.followUpPrompt) return item.followUpPrompt
  if (item?.reason) return item.reason
  if (item?.rationale) return item.rationale
  if (needsDetailsInput(item)) return 'The action looks real, but it needs a bit more detail before it becomes a great task.'
  if (item?.needsDate || needsTimeInput(item)) return 'The action looks real, but timing is still missing.'
  if (item?.confidence === 'high') return 'This looked like a clear commitment with enough context to surface now.'
  if (item?.confidence === 'low') return 'This may matter, but the note is still a bit ambiguous.'
  return 'This looks actionable, but it should be reviewed before becoming a task.'
}

function confirmLabel(item) {
  if (item?.confidence === 'low') return 'Convert to task'
  if (item?.needsDate || needsTimeInput(item) || needsDetailsInput(item)) return 'Complete & confirm'
  return 'Confirm'
}

function timezoneGuess() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

async function detectActionsFromText(text, source = {}, { toastSuccess = true } = {}) {
  const rawText = String(text || '').trim()
  if (!rawText) return []
  if (!workspaceStore.activeWorkspaceId) {
    throw new Error('Select a workspace before detecting actions.')
  }

  actionDetectionLoading.value = true
  try {
    const suggestions = await detectActionInboxSuggestions({
      text: rawText,
      workspaceId: workspaceStore.activeWorkspaceId,
      sourceType: source.sourceType || 'note',
      sourceLabel: source.sourceLabel || 'note',
      sourceRefId: source.sourceRefId || null,
      timezone: timezoneGuess(),
      now: new Date().toISOString(),
      maxItems: 6,
    })
    await refreshActionInbox()
    if (toastSuccess) {
      ElNotification({
        title: suggestions.length ? 'Suggestions ready' : 'No actions found',
        message: suggestions.length
          ? `${suggestions.length} suggestion${suggestions.length === 1 ? '' : 's'} added to your inbox.`
          : 'Nothing concrete was detected in that note.',
        type: suggestions.length ? 'success' : 'info',
      })
    }
    return suggestions
  } finally {
    actionDetectionLoading.value = false
  }
}

async function detectDraftActions() {
  try {
    const rawText = actionDetectionInput.value
    const sourceType = entryText.value.trim() ? 'journal_draft' : 'voice_note'
    const sourceLabel = entryText.value.trim() ? 'draft note' : 'voice note'
    await detectActionsFromText(rawText, { sourceType, sourceLabel })
  } catch (err) {
    ElNotification({
      title: 'Detection failed',
      message: err?.response?.data?.error || err?.message || 'We could not scan that note right now.',
      type: 'error',
    })
  }
}

async function confirmSuggestion(item) {
  if (!item?.id || !workspaceStore.activeWorkspaceId) return
  suggestionBusyId.value = item.id
  try {
    const { task } = await confirmActionInboxSuggestion(item.id, {
      workspaceId: workspaceStore.activeWorkspaceId,
      title: item.displayTitle || item.title,
      details: item.draftDetails || item.details || '',
      category: item.category || 'Other',
      date: item.draftDate || item.dueDate || null,
      scheduledTime: buildScheduledTimePayload(item),
      timeHint: item.timeHint || null,
      timezone: timezoneGuess(),
    })
    await refreshActionInbox()
    await refreshAllTasks()
    ElNotification({
      title: 'Task created',
      message: task?.title || item.displayTitle || item.title || 'Your task was created.',
      type: 'success',
    })
  } catch (err) {
    ElNotification({
      title: 'Unable to confirm',
      message: err?.response?.data?.error || err?.message || 'We could not create that task.',
      type: 'error',
    })
  } finally {
    suggestionBusyId.value = ''
  }
}

async function ignoreSuggestion(item) {
  if (!item?.id || !workspaceStore.activeWorkspaceId) return
  suggestionBusyId.value = item.id
  try {
    await ignoreActionInboxSuggestion(item.id, {
      workspaceId: workspaceStore.activeWorkspaceId,
    })
    await refreshActionInbox()
    ElNotification({
      title: 'Suggestion ignored',
      message: 'We removed it for now and will only resurface it later if timing makes it important.',
      type: 'success',
    })
  } catch (err) {
    ElNotification({
      title: 'Unable to ignore',
      message: err?.response?.data?.error || err?.message || 'We could not update that suggestion.',
      type: 'error',
    })
  } finally {
    suggestionBusyId.value = ''
  }
}

async function saveEntry() {
  if (!entryText.value.trim()) return
  try {
    const rawText = entryText.value.trim()
    const enhanced = await enhanceJournal(rawText)
    enhancedText.value = enhanced
    const timestamp = Date.now()
    const entry = {
      id: crypto.randomUUID?.() || timestamp,
      text: enhanced || entryText.value,
      mood: selectedMood.value,
      timestamp,
      createdAt: timestamp,
      tags: tagSuggestions.slice(0, 2),
      summary: (enhanced || entryText.value).slice(0, 100) + '…',
    }
    const savedEntry = await saveEntryToFirebase(entry)
    logs.value = [entry, ...logs.value]
    let detected = []
    if (hasWorkspace.value) {
      try {
        detected = await detectActionsFromText(rawText, {
          sourceType: 'journal_entry',
          sourceLabel: 'journal entry',
          sourceRefId: savedEntry?.id || null,
        }, { toastSuccess: false })
      } catch (detectErr) {
        console.warn('[JournalView] action detection after save failed', detectErr?.message || detectErr)
      }
    }
    entryText.value = ''
    voiceTranscript.value = ''
    selectedMood.value = null
    ElNotification({
      title: 'Saved',
      message: detected.length
        ? `Your reflection was saved and ${detected.length} suggestion${detected.length === 1 ? '' : 's'} landed in the inbox.`
        : 'Your reflection was saved.',
      type: 'success',
    })
  } catch (err) {
    ElNotification({
      title: 'Unable to save',
      message: err?.message || 'We could not process that reflection right now.',
      type: 'error',
    })
  }
}

function formatDate(ms) {
  const d = new Date(ms)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', weekday: 'short' })
}

function openEntry(entry) {
  activeEntry.value = entry
  drawerOpen.value = true
}

function moodScore(label) {
  const match = moodOptions.find((m) => m.label === label)
  return match?.score ?? 2.5
}

function dominantMood(list = []) {
  const counts = {}
  list.forEach((l) => {
    const key = l.mood?.label || 'Reflective'
    counts[key] = (counts[key] || 0) + 1
  })
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Reflective'
}

function computeStreak(list = []) {
  if (!list.length) return 0
  const dates = new Set(list.map((l) => new Date(l.timestamp).toDateString()))
  let streakCount = 0
  let day = new Date()
  while (dates.has(day.toDateString())) {
    streakCount += 1
    day.setDate(day.getDate() - 1)
  }
  return streakCount
}

function computeLongestStreak(list = []) {
  if (!list.length) return 0
  const dates = [...new Set(list.map((l) => new Date(l.timestamp).toDateString()))].sort(
    (a, b) => new Date(a) - new Date(b),
  )
  let longest = 1
  let current = 1
  for (let i = 1; i < dates.length; i += 1) {
    const prev = new Date(dates[i - 1])
    const curr = new Date(dates[i])
    const diff = (curr - prev) / (1000 * 60 * 60 * 24)
    if (diff === 1) {
      current += 1
      longest = Math.max(longest, current)
    } else {
      current = 1
    }
  }
  return longest
}

function onFileChange(e) {
  const file = e.target.files?.[0]
  if (!file) return
  captureImageName.value = file.name
  processCapture(file)
}

async function processCapture(file) {
  captureLoading.value = true
  captureError.value = ''
  captureItems.value = []
  try {
    if (!imageTasksEnabled) {
      throw new Error('Image scanning is disabled.')
    }
    const uploadImageForVision = await getVisionUploader()
    const { imageUrl } = await uploadImageForVision(file)
    const { data } = await nlpClient.post('/workspace/ingest-image', { imageUrl })
    capturePreview.value = data?.rawText || data?.ocrText || ''
    captureItems.value = (data?.items || []).map((it) => ({
      title: it.title || 'Task',
      description: it.description || '',
      type: it.type || 'task',
      include: true,
    }))
    if (!captureItems.value.length) {
      captureError.value = 'No items detected. Try a clearer image.'
    }
  } catch (err) {
    captureError.value = err?.response?.data?.error || err?.message || 'Failed to process image.'
  } finally {
    captureLoading.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

async function commitCapture() {
  const selected = captureItems.value.filter((i) => i.include && i.title)
  if (!selected.length) return
  for (const item of selected) {
    await addTaskToFirebase({
      title: item.title,
      details: item.description,
      source: 'capture',
      createdBy: authStore.user?.uid || null,
      workspaceId: workspaceStore.activeWorkspaceId || null,
    })
  }
  ElNotification({ title: 'Created', message: `Added ${selected.length} tasks from scan.`, type: 'success' })
  captureItems.value = []
  capturePreview.value = ''
  captureImageName.value = ''
}
</script>

<style scoped>
.mood-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-radius: 999px;
  transition: transform 0.15s ease, box-shadow 0.2s ease, opacity 0.2s ease;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
}

.animate-fade-in {
  animation: fadeIn 0.5s ease;
}

.animate-slide-up {
  animation: slideUp 0.5s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.journal-drawer :deep(.el-drawer__body) {
  background: #0b1220;
}

.journal-drawer :deep(.el-drawer__header) {
  background: #0b1220;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
</style>
