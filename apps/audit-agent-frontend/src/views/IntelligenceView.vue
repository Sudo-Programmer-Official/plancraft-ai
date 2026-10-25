<template>
  <div class="intelligence-page min-h-full overflow-y-auto bg-pc-bg text-pc-text">
    <div class="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <section class="overflow-hidden rounded-3xl border border-pc-border bg-pc-surface shadow-pc-card">
        <div class="relative p-5 sm:p-8">
          <div class="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-indigo-400/10 blur-3xl" />
          <div class="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div class="max-w-3xl">
              <div class="flex flex-wrap items-center gap-2">
                <span class="inline-flex items-center gap-1.5 rounded-full border border-pc-accent-border bg-pc-accent-soft px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-pc-accent-text">
                  <span class="h-2 w-2 animate-pulse rounded-full bg-emerald-500" aria-hidden="true" />
                  Live desk
                </span>
                <span class="rounded-full border border-pc-border bg-pc-surface-2 px-3 py-1.5 text-xs text-pc-text-muted">Read-only research</span>
              </div>
              <h1 class="mt-4 text-3xl font-semibold tracking-tight text-pc-text sm:text-4xl">Your intelligence desk</h1>
              <p class="mt-3 max-w-2xl text-sm leading-6 text-pc-text-muted sm:text-base">
                Turn live external signals into a clearer next move for the goals already on your planner.
              </p>
            </div>
            <button
              type="button"
              :disabled="loading"
              class="inline-flex items-center justify-center gap-2 rounded-xl bg-[image:var(--pc-accent-fill)] px-4 py-2.5 text-sm font-semibold text-white shadow-pc-button transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
              @click="refreshBrief"
            >
              <RefreshCw :size="16" :class="{ 'animate-spin': loading }" aria-hidden="true" />
              {{ loading ? 'Researching…' : 'Refresh brief' }}
            </button>
          </div>
        </div>

        <div class="border-t border-pc-border bg-pc-surface-2/60 p-5 sm:p-6">
          <div v-if="goals.length" class="mb-5 rounded-2xl border border-pc-accent-border bg-pc-accent-soft/50 p-4">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div class="min-w-0">
                <span class="eyebrow">Watch a goal</span>
                <p class="mt-1 text-sm text-pc-text-muted">Research is filtered through the outcome you are trying to move forward.</p>
              </div>
              <label class="sm:w-80">
                <span class="sr-only">Choose a goal to watch</span>
                <select
                  v-model="selectedGoalId"
                  class="w-full rounded-xl border border-pc-border-strong bg-pc-surface px-3 py-2.5 text-sm font-medium text-pc-text outline-none focus:border-pc-accent"
                >
                  <option v-for="goal in goals" :key="goal.goalId || goal.id" :value="goal.goalId || goal.id">
                    {{ goal.title || 'Untitled goal' }}
                  </option>
                </select>
              </label>
            </div>
            <div v-if="selectedGoal" class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-pc-accent-text">
              <span class="font-semibold">{{ selectedGoal.title }}</span>
              <span v-if="selectedGoal.targetDate">Target {{ selectedGoal.targetDate }}</span>
              <span v-if="selectedGoal.category">{{ selectedGoal.category }}</span>
            </div>
          </div>
          <div v-else class="mb-5 rounded-2xl border border-dashed border-pc-border-strong bg-pc-surface px-4 py-3 text-sm text-pc-text-muted">
            Create a goal to turn this desk into a personalized watchlist. You can still explore the wider tech landscape below.
          </div>

          <div class="flex flex-col gap-4 lg:flex-row lg:items-end">
            <label class="min-w-0 flex-1">
              <span class="eyebrow">Ask the desk</span>
              <div class="mt-2 flex items-center gap-2 rounded-xl border border-pc-border-strong bg-pc-surface px-3 py-2.5 focus-within:border-pc-accent">
                <Search :size="17" class="shrink-0 text-pc-text-subtle" aria-hidden="true" />
                <input
                  v-model="question"
                  type="text"
                  maxlength="500"
                  class="min-w-0 flex-1 bg-transparent text-sm text-pc-text outline-none placeholder:text-pc-text-subtle"
                  :placeholder="selectedGoal ? 'What changed that could affect this goal?' : 'What is the best tech news today, and where is the money flowing?'"
                  @keyup.enter="refreshBrief"
                />
              </div>
            </label>
            <label class="lg:w-72">
              <span class="eyebrow">Your angle</span>
              <input
                v-model="interests"
                type="text"
                maxlength="300"
                class="mt-2 w-full rounded-xl border border-pc-border-strong bg-pc-surface px-3 py-2.5 text-sm text-pc-text outline-none placeholder:text-pc-text-subtle focus:border-pc-accent"
                placeholder="e.g. AI infra, dev tools, fintech"
                @keyup.enter="refreshBrief"
              />
            </label>
          </div>

          <div class="mt-5">
            <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div class="flex items-center gap-2">
                <SlidersHorizontal :size="16" class="text-pc-text-subtle" aria-hidden="true" />
                <span class="eyebrow">Desks in this brief</span>
                <span class="text-xs text-pc-text-subtle">{{ selectedAgentIds.length }}/4 selected</span>
              </div>
              <button
                type="button"
                class="inline-flex items-center gap-1.5 self-start rounded-lg border border-pc-accent-border px-3 py-1.5 text-xs font-semibold text-pc-accent-text transition hover:bg-pc-accent-soft"
                @click="openAgentBuilder()"
              >
                <Plus :size="14" aria-hidden="true" />
                Create a desk
              </button>
            </div>
            <div class="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <div
                v-for="agent in availableAgents"
                :key="agent.id"
                class="rounded-xl border px-3 py-3 transition"
                :class="selectedAgentIds.includes(agent.id)
                  ? 'border-pc-accent bg-pc-accent-soft text-pc-accent-text'
                  : 'border-pc-border bg-pc-surface text-pc-text-muted hover:border-pc-border-strong hover:text-pc-text'"
              >
                <button type="button" class="w-full text-left" @click="toggleAgent(agent.id)">
                  <span class="flex items-center justify-between gap-2">
                    <span class="flex min-w-0 items-center gap-2">
                      <span class="truncate text-sm font-semibold">{{ agent.label }}</span>
                      <span v-if="agent.custom" class="rounded-full border border-current/20 px-1.5 py-0.5 text-[10px] uppercase tracking-wide opacity-70">Mine</span>
                    </span>
                    <span
                      class="h-2.5 w-2.5 shrink-0 rounded-full"
                      :class="selectedAgentIds.includes(agent.id) ? 'bg-pc-accent' : 'bg-pc-border-strong'"
                      aria-hidden="true"
                    />
                  </span>
                  <span class="mt-1 block text-xs opacity-80">{{ agent.description }}</span>
                </button>
                <div v-if="agent.custom" class="mt-2 flex items-center gap-3 border-t border-current/10 pt-2">
                  <span v-if="agent.schedule?.enabled" class="rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">Morning email</span>
                  <button type="button" class="inline-flex items-center gap-1 text-[11px] font-semibold opacity-75 hover:opacity-100" @click.stop="openAgentBuilder(agent)">
                    <Pencil :size="12" aria-hidden="true" /> Edit
                  </button>
                  <button type="button" class="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 opacity-75 hover:opacity-100" @click.stop="removeAgent(agent)">
                    <Trash2 :size="12" aria-hidden="true" /> Delete
                  </button>
                </div>
              </div>
            </div>
            <p class="mt-2 text-xs text-pc-text-subtle">Built-in desks are ready to use. Your desks let you define exactly what the research should watch.</p>
          </div>
        </div>
      </section>

      <div v-if="error" class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
        {{ error }}
      </div>

      <section v-if="loading && !brief" class="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div v-for="i in 3" :key="i" class="h-64 animate-pulse rounded-3xl bg-pc-surface-2" />
      </section>

      <template v-if="brief">
        <section class="rounded-3xl border border-pc-border bg-pc-surface p-5 shadow-pc-card sm:p-7">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p class="eyebrow">Editor’s brief</p>
              <h2 class="mt-2 text-2xl font-semibold tracking-tight text-pc-text">What deserves your attention</h2>
            </div>
            <span class="inline-flex items-center gap-1.5 self-start rounded-full border border-pc-border bg-pc-surface-2 px-3 py-1.5 text-xs text-pc-text-muted">
              <span class="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
              {{ formatTime(brief.generatedAt) }}
            </span>
          </div>
          <div
            class="mt-5 overflow-hidden text-sm leading-7 text-pc-text transition-[max-height] sm:text-base [&_a]:text-pc-accent-text [&_a]:underline [&_h1]:mb-3 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:mt-5 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-base [&_h3]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_p]:mb-3 [&_strong]:font-semibold"
            :class="expandedSynthesis ? 'max-h-none' : 'max-h-80'"
            v-html="renderMarkdown(brief.synthesis)"
          />
          <button
            v-if="brief.synthesis?.length > 1200"
            type="button"
            class="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-pc-accent-text hover:underline"
            @click="expandedSynthesis = !expandedSynthesis"
          >
            {{ expandedSynthesis ? 'Show less' : 'Read full brief' }}
            <ChevronDown :size="14" :class="{ 'rotate-180': expandedSynthesis }" aria-hidden="true" />
          </button>
        </section>

        <section v-if="brief.suggestedTasks?.length" class="rounded-3xl border border-pc-accent-border bg-pc-accent-soft/40 p-5 shadow-pc-card sm:p-6">
          <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p class="eyebrow text-pc-accent-text">Signal → action</p>
              <h2 class="mt-2 text-xl font-semibold text-pc-text">Suggested next moves</h2>
              <p class="mt-1 text-sm text-pc-text-muted">Nothing is added automatically. Approve the moves that belong on your planner.</p>
            </div>
            <span class="rounded-full border border-pc-accent-border bg-pc-surface px-3 py-1.5 text-xs text-pc-accent-text">{{ brief.suggestedTasks.length }} suggestions</span>
          </div>
          <div class="mt-5 grid gap-3 lg:grid-cols-2">
            <article v-for="task in brief.suggestedTasks" :key="`${task.title}-${task.date || 'open'}`" class="rounded-2xl border border-pc-border bg-pc-surface p-4">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <h3 class="text-sm font-semibold text-pc-text">{{ task.title }}</h3>
                  <p v-if="task.details" class="mt-2 text-sm leading-6 text-pc-text-muted">{{ task.details }}</p>
                  <p v-if="task.reason" class="mt-2 text-xs leading-5 text-pc-accent-text">Why it matters: {{ task.reason }}</p>
                </div>
                <button
                  type="button"
                  class="shrink-0 rounded-lg border border-pc-accent-border px-3 py-2 text-xs font-semibold text-pc-accent-text transition hover:bg-pc-accent-soft disabled:cursor-not-allowed disabled:opacity-60"
                  :disabled="addingTaskTitle === task.title || addedTaskTitles.includes(task.title)"
                  @click="addSuggestedTask(task)"
                >
                  {{ addedTaskTitles.includes(task.title) ? 'Added' : addingTaskTitle === task.title ? 'Adding…' : 'Add task' }}
                </button>
              </div>
              <p v-if="task.date" class="mt-3 text-xs text-pc-text-subtle">Suggested date: {{ task.date }}</p>
            </article>
          </div>
        </section>

        <section class="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <article
            v-for="agent in brief.agents || []"
            :key="agent.id"
            class="rounded-3xl border border-pc-border bg-pc-surface p-5 shadow-pc-card sm:p-6"
          >
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="eyebrow">Specialist</p>
                <h3 class="mt-2 text-xl font-semibold text-pc-text">{{ agent.label }}</h3>
                <p class="mt-1 text-sm text-pc-text-muted">{{ agent.description }}</p>
              </div>
              <Sparkles :size="20" class="shrink-0 text-pc-accent" aria-hidden="true" />
            </div>
            <div
              class="mt-5 overflow-hidden text-sm leading-6 text-pc-text-muted transition-[max-height] [&_a]:text-pc-accent-text [&_a]:underline [&_h1]:mb-2 [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-base [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:mt-3 [&_h3]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_p]:mb-2 [&_strong]:font-semibold"
              :class="expandedAgents[agent.id] ? 'max-h-none' : 'max-h-72'"
              v-html="renderMarkdown(agent.text)"
            />
            <button
              v-if="agent.text?.length > 900"
              type="button"
              class="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-pc-accent-text hover:underline"
              @click="toggleAgentDetails(agent.id)"
            >
              {{ expandedAgents[agent.id] ? 'Collapse desk' : 'Read full desk' }}
              <ChevronDown :size="14" :class="{ 'rotate-180': expandedAgents[agent.id] }" aria-hidden="true" />
            </button>
            <details v-if="agent.sources?.length" class="mt-5 border-t border-pc-border pt-4">
              <summary class="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-semibold text-pc-text-muted">
                <span>Sources · {{ agent.sources.length }}</span>
                <ChevronDown :size="14" aria-hidden="true" />
              </summary>
              <div class="mt-2 grid gap-2">
                <a
                  v-for="source in agent.sources.slice(0, 5)"
                  :key="source.url"
                  :href="source.url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex min-w-0 items-center gap-1.5 text-xs text-pc-accent-text hover:underline"
                >
                  <span class="truncate">{{ source.title }}</span>
                  <ArrowUpRight :size="13" class="shrink-0" aria-hidden="true" />
                </a>
              </div>
            </details>
          </article>
        </section>

        <details v-if="brief.sources?.length" :open="expandedSources" class="rounded-3xl border border-pc-border bg-pc-surface p-5 shadow-pc-card sm:p-6" @toggle="expandedSources = $event.target.open">
          <summary class="flex cursor-pointer list-none items-center justify-between gap-3">
            <div>
              <p class="eyebrow">Traceability</p>
              <h2 class="mt-2 text-xl font-semibold text-pc-text">All sources consulted</h2>
            </div>
            <span class="inline-flex items-center gap-2 rounded-full border border-pc-border bg-pc-surface-2 px-3 py-1.5 text-xs text-pc-text-muted">
              {{ brief.sources.length }} links
              <ChevronDown :size="14" aria-hidden="true" />
            </span>
          </summary>
          <div class="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <a
              v-for="source in brief.sources"
              :key="source.url"
              :href="source.url"
              target="_blank"
              rel="noopener noreferrer"
              class="group flex min-w-0 items-center justify-between gap-2 rounded-xl border border-pc-border bg-pc-surface-2 px-3 py-2.5 text-xs text-pc-text-muted transition hover:border-pc-accent-border hover:text-pc-accent-text"
            >
              <span class="truncate">{{ source.title }}</span>
              <ArrowUpRight :size="14" class="shrink-0 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
            </a>
          </div>
        </details>
      </template>

      <section v-else-if="!loading" class="rounded-3xl border border-dashed border-pc-border-strong bg-pc-surface p-10 text-center shadow-pc-card">
        <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-pc-accent-soft text-2xl">🛰️</div>
        <h2 class="mt-5 text-xl font-semibold text-pc-text">Your live desk is ready</h2>
        <p class="mx-auto mt-2 max-w-lg text-sm leading-6 text-pc-text-muted">Choose the specialists you want, add your angle, and run a source-backed brief.</p>
        <button type="button" class="mt-5 rounded-xl bg-[image:var(--pc-accent-fill)] px-4 py-2.5 text-sm font-semibold text-white shadow-pc-button" @click="refreshBrief">Run first brief</button>
      </section>
    </div>

    <div
      v-if="showAgentBuilder"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="agent-builder-title"
      @click.self="closeAgentBuilder"
    >
      <form class="max-h-full w-full max-w-xl overflow-y-auto rounded-3xl border border-pc-border bg-pc-surface p-5 shadow-2xl sm:p-7" @submit.prevent="saveAgent">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="eyebrow text-pc-accent-text">Personal desk</p>
            <h2 id="agent-builder-title" class="mt-2 text-2xl font-semibold tracking-tight text-pc-text">
              {{ editingAgentId ? 'Edit your desk' : 'Create a research desk' }}
            </h2>
            <p class="mt-2 text-sm leading-6 text-pc-text-muted">Give it a clear point of view. PlanCraft will use live web search and return source-backed findings.</p>
          </div>
          <button type="button" class="rounded-xl p-2 text-pc-text-muted transition hover:bg-pc-surface-2 hover:text-pc-text" aria-label="Close" @click="closeAgentBuilder">
            <X :size="18" aria-hidden="true" />
          </button>
        </div>

        <div v-if="agentError" class="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{{ agentError }}</div>

        <div class="mt-6 space-y-4">
          <div class="rounded-2xl border border-pc-accent-border bg-pc-accent-soft/50 p-4">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <label class="min-w-0 flex-1">
                <span class="eyebrow text-pc-accent-text">Describe the job in your words</span>
                <textarea v-model="agentGoal" rows="2" maxlength="900" class="mt-2 w-full resize-y rounded-xl border border-pc-border-strong bg-pc-surface px-3 py-2.5 text-sm leading-6 text-pc-text outline-none focus:border-pc-accent" placeholder="e.g. Help me understand the important catalysts affecting NIFTY and BANK NIFTY before the market opens." />
              </label>
              <button type="button" class="inline-flex shrink-0 items-center justify-center rounded-xl bg-[image:var(--pc-accent-fill)] px-4 py-2.5 text-sm font-semibold text-white shadow-pc-button disabled:cursor-not-allowed disabled:opacity-60" :disabled="draftingAgent" @click="generateAgentDraft">
                {{ draftingAgent ? 'Drafting…' : 'Generate setup' }}
              </button>
            </div>
            <p class="mt-2 text-xs text-pc-text-subtle">This creates an editable setup locally from your use case. It does not run web search or spend research quota.</p>
          </div>
          <div>
            <span class="eyebrow">Start from a template</span>
            <div class="mt-2 grid gap-2 sm:grid-cols-3">
              <button
                v-for="template in INTELLIGENCE_AGENT_TEMPLATES"
                :key="template.id"
                type="button"
                class="rounded-xl border border-pc-border bg-pc-surface-2 px-3 py-2.5 text-left transition hover:border-pc-accent-border hover:bg-pc-accent-soft"
                @click="applyAgentTemplate(template)"
              >
                <span class="block text-xs font-semibold text-pc-text">{{ template.label }}</span>
                <span class="mt-1 block text-[11px] leading-4 text-pc-text-muted">{{ template.description }}</span>
              </button>
            </div>
          </div>
          <label class="block">
            <span class="eyebrow">Desk name</span>
            <input v-model="agentForm.name" maxlength="80" required type="text" class="mt-2 w-full rounded-xl border border-pc-border-strong bg-pc-surface-2 px-3 py-2.5 text-sm text-pc-text outline-none focus:border-pc-accent" placeholder="e.g. Developer tools radar" />
          </label>
          <label class="block">
            <span class="eyebrow">Short description</span>
            <input v-model="agentForm.description" maxlength="240" type="text" class="mt-2 w-full rounded-xl border border-pc-border-strong bg-pc-surface-2 px-3 py-2.5 text-sm text-pc-text outline-none focus:border-pc-accent" placeholder="What should this desk help you notice?" />
          </label>
          <label class="block">
            <span class="eyebrow">Search focus</span>
            <input v-model="agentForm.searchFocus" maxlength="360" type="text" class="mt-2 w-full rounded-xl border border-pc-border-strong bg-pc-surface-2 px-3 py-2.5 text-sm text-pc-text outline-none focus:border-pc-accent" placeholder="e.g. releases, pricing, funding, hiring, customer traction" />
          </label>
          <label class="block">
            <span class="eyebrow">Research prompt</span>
            <textarea v-model="agentForm.prompt" maxlength="1800" required rows="6" class="mt-2 w-full resize-y rounded-xl border border-pc-border-strong bg-pc-surface-2 px-3 py-2.5 text-sm leading-6 text-pc-text outline-none focus:border-pc-accent" placeholder="Act as my developer tools analyst. Track meaningful product launches, pricing changes, adoption signals, and competitive moves. Explain what changed, cite the source, and tell me why it matters for a small SaaS team." />
            <span class="mt-1 block text-xs text-pc-text-subtle">The prompt controls the desk’s point of view—not access to arbitrary tools or private data.</span>
          </label>
          <label class="block">
            <span class="eyebrow">Presentation style</span>
            <select v-model="agentForm.outputStyle" class="mt-2 w-full rounded-xl border border-pc-border-strong bg-pc-surface-2 px-3 py-2.5 text-sm text-pc-text outline-none focus:border-pc-accent">
              <option value="brief">Editorial brief</option>
              <option value="table">Decision table</option>
              <option value="timeline">Timeline</option>
              <option value="checklist">Action checklist</option>
            </select>
          </label>
          <div class="rounded-2xl border border-pc-border bg-pc-surface-2 p-4">
            <label class="flex cursor-pointer items-start gap-3">
              <input v-model="agentForm.scheduleEnabled" type="checkbox" class="mt-1 h-4 w-4 rounded border-pc-border-strong text-pc-accent focus:ring-pc-accent" />
              <span>
                <span class="block text-sm font-semibold text-pc-text">Send a morning email</span>
                <span class="mt-1 block text-xs leading-5 text-pc-text-muted">Email this desk’s title, summary, and reference links every day. Research remains read-only.</span>
              </span>
            </label>
            <div v-if="agentForm.scheduleEnabled" class="mt-4 grid gap-3 sm:grid-cols-2">
              <label>
                <span class="eyebrow">Delivery time</span>
                <input v-model="agentForm.scheduleTime" type="time" class="mt-2 w-full rounded-xl border border-pc-border-strong bg-pc-surface px-3 py-2.5 text-sm text-pc-text outline-none focus:border-pc-accent" />
              </label>
              <label>
                <span class="eyebrow">Timezone</span>
                <input v-model="agentForm.scheduleTimezone" type="text" readonly class="mt-2 w-full rounded-xl border border-pc-border bg-pc-surface px-3 py-2.5 text-sm text-pc-text-muted outline-none" />
              </label>
            </div>
            <p v-if="agentForm.scheduleEnabled" class="mt-3 text-[11px] leading-5 text-pc-text-subtle">Your browser timezone is used so the email arrives at the selected local time. The server must have morning email delivery enabled.</p>
          </div>
        </div>

        <div class="mt-6 flex items-center justify-between gap-3 border-t border-pc-border pt-5">
          <span class="text-xs text-pc-text-subtle">{{ customAgents.length }}/{{ customAgentLimit }} custom desks</span>
          <div class="flex gap-2">
            <button type="button" class="rounded-xl border border-pc-border-strong px-4 py-2.5 text-sm font-semibold text-pc-text-muted hover:bg-pc-surface-2" @click="closeAgentBuilder">Cancel</button>
            <button type="submit" class="rounded-xl bg-[image:var(--pc-accent-fill)] px-4 py-2.5 text-sm font-semibold text-white shadow-pc-button disabled:cursor-not-allowed disabled:opacity-60" :disabled="agentSaving">
              {{ agentSaving ? 'Saving…' : editingAgentId ? 'Save changes' : 'Create desk' }}
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import MarkdownIt from 'markdown-it'
import { ArrowUpRight, ChevronDown, Pencil, Plus, RefreshCw, Search, SlidersHorizontal, Sparkles, Trash2, X } from 'lucide-vue-next'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/authStore'
import { addTaskToFirebase } from '@/services/firebaseService'
import {
  createIntelligenceAgent,
  deleteIntelligenceAgent,
  fetchIntelligenceBrief,
  fetchIntelligenceAgents,
  fetchIntelligenceGoals,
  generateIntelligenceAgentDraft,
  INTELLIGENCE_AGENTS,
  INTELLIGENCE_AGENT_TEMPLATES,
  linkIntelligenceTask,
  updateIntelligenceAgent,
} from '@/services/intelligenceService'

const STORAGE_KEY = 'plancraft-intelligence-preferences'
const defaultAgentIds = ['tech-news', 'capital-flows']
const markdown = new MarkdownIt({ html: false, linkify: true, breaks: true })

function loadPreferences() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    return {
      agentIds: Array.isArray(saved.agentIds) && saved.agentIds.length ? saved.agentIds : defaultAgentIds,
      interests: typeof saved.interests === 'string' ? saved.interests : '',
      goalId: typeof saved.goalId === 'string' ? saved.goalId : '',
    }
  } catch {
    return { agentIds: defaultAgentIds, interests: '', goalId: '' }
  }
}

const savedPreferences = loadPreferences()
const authStore = useAuthStore()
const selectedAgentIds = ref(savedPreferences.agentIds)
const interests = ref(savedPreferences.interests)
const goals = ref([])
const customAgents = ref([])
const customAgentLimit = ref(10)
const selectedGoalId = ref(savedPreferences.goalId)
const question = ref('')
const brief = ref(null)
const loading = ref(false)
const error = ref('')
const addingTaskTitle = ref('')
const addedTaskTitles = ref([])
const showAgentBuilder = ref(false)
const editingAgentId = ref('')
const agentSaving = ref(false)
const draftingAgent = ref(false)
const agentError = ref('')
const agentGoal = ref('')
const expandedSynthesis = ref(false)
const expandedAgents = ref({})
const expandedSources = ref(false)
const agentForm = reactive({
  name: '',
  description: '',
  searchFocus: '',
  prompt: '',
  outputStyle: 'brief',
})
const selectedGoal = computed(() => goals.value.find((goal) => (goal.goalId || goal.id) === selectedGoalId.value) || null)
const availableAgents = computed(() => [...INTELLIGENCE_AGENTS, ...customAgents.value])
const selectedBuiltInAgentIds = computed(() => selectedAgentIds.value.filter((id) => INTELLIGENCE_AGENTS.some((agent) => agent.id === id)))
const selectedCustomAgentIds = computed(() => selectedAgentIds.value.filter((id) => customAgents.value.some((agent) => agent.id === id)))

watch([selectedAgentIds, interests, selectedGoalId], () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      agentIds: selectedAgentIds.value,
      interests: interests.value,
      goalId: selectedGoalId.value,
    }))
  } catch {
    // Preference persistence is optional; the brief still works in private mode.
  }
}, { deep: true })

async function loadGoals() {
  if (!authStore.user?.uid) return
  try {
    goals.value = await fetchIntelligenceGoals()
    const goalIds = goals.value.map((goal) => goal.goalId || goal.id).filter(Boolean)
    if (!goalIds.includes(selectedGoalId.value)) selectedGoalId.value = goalIds[0] || ''
  } catch (err) {
    // The desk remains useful as an exploration surface if goals are unavailable.
    console.warn('[Intelligence] goals unavailable', err?.message || err)
  }
}

async function loadAgents() {
  if (!authStore.user?.uid) return
  try {
    const result = await fetchIntelligenceAgents()
    customAgents.value = result.agents.filter((agent) => agent.custom)
    customAgentLimit.value = result.customLimit || 10
    const availableIds = new Set(result.agents.map((agent) => agent.id))
    const retained = selectedAgentIds.value.filter((id) => availableIds.has(id)).slice(0, 4)
    selectedAgentIds.value = retained.length ? retained : [...defaultAgentIds]
  } catch (err) {
    console.warn('[Intelligence] desks unavailable', err?.message || err)
  }
}

function toggleAgent(id) {
  if (selectedAgentIds.value.includes(id)) {
    if (selectedAgentIds.value.length === 1) return
    selectedAgentIds.value = selectedAgentIds.value.filter((candidate) => candidate !== id)
    return
  }
  selectedAgentIds.value = [...selectedAgentIds.value, id].slice(0, 4)
}

function renderMarkdown(value) {
  return markdown.render(String(value || ''))
}

function browserTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

function resetAgentForm() {
  editingAgentId.value = ''
  agentError.value = ''
  agentGoal.value = ''
  Object.assign(agentForm, {
    name: '',
    description: '',
    searchFocus: '',
    prompt: '',
    outputStyle: 'brief',
    scheduleEnabled: false,
    scheduleTime: '08:00',
    scheduleTimezone: browserTimezone(),
  })
}

function openAgentBuilder(agent = null) {
  agentError.value = ''
  if (agent?.custom) {
    editingAgentId.value = agent.id
    Object.assign(agentForm, {
      name: agent.name || agent.label || '',
      description: agent.description || '',
      searchFocus: agent.searchFocus || '',
      prompt: agent.prompt || '',
      outputStyle: agent.outputStyle || 'brief',
      scheduleEnabled: Boolean(agent.schedule?.enabled),
      scheduleTime: agent.schedule?.time || '08:00',
      scheduleTimezone: agent.schedule?.timezone || browserTimezone(),
    })
  } else {
    resetAgentForm()
  }
  showAgentBuilder.value = true
}

function applyAgentTemplate(template) {
  if (!template) return
  Object.assign(agentForm, {
    name: template.name,
    description: template.description,
    searchFocus: template.searchFocus,
    prompt: template.prompt,
    outputStyle: template.outputStyle || 'brief',
  })
  agentError.value = ''
}

async function generateAgentDraft() {
  const useCase = agentGoal.value.trim()
  if (useCase.length < 8) {
    agentError.value = 'Describe the job in a few words so the agent has enough direction.'
    return
  }
  draftingAgent.value = true
  agentError.value = ''
  try {
    const draft = await generateIntelligenceAgentDraft(useCase, agentForm.outputStyle)
    if (draft) Object.assign(agentForm, draft)
  } catch (err) {
    agentError.value = err?.response?.data?.error || err?.message || 'Could not generate the agent draft.'
  } finally {
    draftingAgent.value = false
  }
}

function closeAgentBuilder() {
  if (agentSaving.value) return
  showAgentBuilder.value = false
  resetAgentForm()
}

async function saveAgent() {
  const payload = {
    name: agentForm.name.trim(),
    description: agentForm.description.trim(),
    searchFocus: agentForm.searchFocus.trim(),
    prompt: agentForm.prompt.trim(),
    outputStyle: agentForm.outputStyle,
    schedule: {
      enabled: agentForm.scheduleEnabled,
      time: agentForm.scheduleTime,
      timezone: agentForm.scheduleTimezone,
    },
  }
  if (!payload.name || !payload.prompt) {
    agentError.value = 'Give this desk a name and a clear research prompt.'
    return
  }
  const wasEditing = Boolean(editingAgentId.value)
  agentSaving.value = true
  agentError.value = ''
  try {
    const agent = editingAgentId.value
      ? await updateIntelligenceAgent(editingAgentId.value, payload)
      : await createIntelligenceAgent(payload)
    if (agent) {
      customAgents.value = editingAgentId.value
        ? customAgents.value.map((item) => (item.id === agent.id ? agent : item))
        : [agent, ...customAgents.value]
      if (!selectedAgentIds.value.includes(agent.id)) {
        selectedAgentIds.value = [...selectedAgentIds.value, agent.id].slice(0, 4)
      }
    }
    showAgentBuilder.value = false
    resetAgentForm()
    ElMessage.success(wasEditing ? 'Desk updated' : 'Desk created')
  } catch (err) {
    agentError.value = err?.response?.data?.error || err?.message || 'Could not save this desk.'
  } finally {
    agentSaving.value = false
  }
}

async function removeAgent(agent) {
  if (!agent?.custom || !agent.id || !window.confirm(`Delete “${agent.label || agent.name}”?`)) return
  try {
    await deleteIntelligenceAgent(agent.id)
    customAgents.value = customAgents.value.filter((item) => item.id !== agent.id)
    selectedAgentIds.value = selectedAgentIds.value.filter((id) => id !== agent.id)
    if (!selectedAgentIds.value.length) selectedAgentIds.value = [...defaultAgentIds]
    ElMessage.success('Desk deleted')
  } catch (err) {
    ElMessage.error(err?.response?.data?.error || err?.message || 'Could not delete this desk.')
  }
}

function toggleAgentDetails(id) {
  expandedAgents.value = { ...expandedAgents.value, [id]: !expandedAgents.value[id] }
}

function formatTime(value) {
  if (!value) return 'Just now'
  try {
    return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(value))
  } catch {
    return 'Just now'
  }
}

async function refreshBrief() {
  if (loading.value) return
  loading.value = true
  error.value = ''
  try {
    brief.value = await fetchIntelligenceBrief({
      agentIds: selectedBuiltInAgentIds.value,
      customAgentIds: selectedCustomAgentIds.value,
      question: question.value,
      interests: interests.value,
      goalContext: selectedGoal.value
        ? {
            title: selectedGoal.value.title,
            description: selectedGoal.value.description,
            category: selectedGoal.value.category,
            targetDate: selectedGoal.value.targetDate,
          }
        : null,
    })
    expandedSynthesis.value = false
    expandedAgents.value = {}
    expandedSources.value = false
  } catch (err) {
    error.value = err?.response?.data?.error || err?.message || 'The intelligence desk could not complete this brief.'
    ElMessage.error(error.value)
  } finally {
    loading.value = false
  }
}

async function addSuggestedTask(task) {
  const title = String(task?.title || '').trim()
  if (!title || addingTaskTitle.value || addedTaskTitles.value.includes(title)) return
  addingTaskTitle.value = title
  try {
    const savedTask = await addTaskToFirebase({
      title,
      details: [task.details, task.reason ? `Why it matters: ${task.reason}` : ''].filter(Boolean).join('\n\n'),
      date: task.date || null,
      category: selectedGoal.value?.category || 'Work',
      source: 'intelligence',
      goalId: selectedGoalId.value || null,
      goalTitle: selectedGoal.value?.title || null,
      goalTargetDate: selectedGoal.value?.targetDate || null,
    })
    let goalLinked = true
    const goalId = selectedGoalId.value || null
    if (goalId && savedTask?.id && selectedGoal.value) {
      try {
        const linkedTasks = Array.isArray(selectedGoal.value.linkedTasks)
          ? selectedGoal.value.linkedTasks
          : []
        if (!linkedTasks.includes(savedTask.id)) {
          const updatedGoal = await linkIntelligenceTask(goalId, [...linkedTasks, savedTask.id])
          if (updatedGoal) {
            goals.value = goals.value.map((goal) => (
              (goal.goalId || goal.id) === goalId ? updatedGoal : goal
            ))
          }
        }
      } catch (linkError) {
        goalLinked = false
        console.warn('[Intelligence] task created but goal link failed', linkError?.message || linkError)
      }
    }
    addedTaskTitles.value = [...addedTaskTitles.value, title]
    ElMessage[goalLinked ? 'success' : 'warning'](
      goalLinked ? 'Task added to your planner' : 'Task added, but could not link it to the goal',
    )
  } catch (err) {
    ElMessage.error(err?.message || 'Could not add that task')
  } finally {
    addingTaskTitle.value = ''
  }
}

onMounted(async () => {
  await Promise.all([loadGoals(), loadAgents()])
  await refreshBrief()
})
</script>
