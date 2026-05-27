<template>
  <div class="app-page-shell">
    <div class="app-page-frame">
      <div v-if="guardError" class="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-6 space-y-3">
        <h1 class="text-2xl font-semibold">No access to this workspace</h1>
        <p class="text-rose-100/80 text-sm">
          {{ guardError }}
        </p>
        <button
          class="px-4 py-2 rounded-lg bg-white text-indigo-800 font-semibold hover:bg-slate-100 transition"
          @click="router.push('/workspaces')"
        >
          Back to Workspaces
        </button>
      </div>

      <template v-else>
        <section class="app-page-hero space-y-3">
          <div v-if="bootingWorkspace" class="animate-pulse space-y-3">
            <div class="h-5 w-48 rounded bg-white/10"></div>
            <div class="h-8 w-64 rounded bg-white/10"></div>
            <div class="h-4 w-80 rounded bg-white/10"></div>
          </div>
          <div v-else class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div class="space-y-1">
              <p class="app-page-eyebrow">Active workspace</p>
              <h1 class="app-page-title !text-[clamp(2rem,3vw,2.75rem)]">{{ activeWorkspace?.name }}</h1>
              <p class="text-sm text-indigo-100/80">
                {{ activeWorkspace?.description || 'Shared tasks, roles, and Voice AI reminders in one place.' }}
              </p>
              <div class="flex flex-wrap items-center gap-2 text-[12px] text-indigo-200/90">
                <span class="px-2 py-1 rounded-full bg-indigo-500/15 border border-indigo-400/40">
                  {{ activeWorkspace?.workspaceType || 'team' }}
                </span>
                <span class="px-2 py-1 rounded-full bg-white/10 border border-white/15">
                  Role: {{ activeRole }}
                </span>
                <span
                  v-if="activeWorkspace?.seats"
                  class="px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-400/30"
                >
                  Seats: {{ activeWorkspace?.seatsUsed ?? '—' }} / {{ activeWorkspace?.seats }}
                </span>
              </div>
            </div>
            <div class="flex flex-wrap gap-2">
              <button
                class="px-4 py-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-indigo-500 hover:from-fuchsia-400 hover:to-indigo-400 font-semibold shadow-lg shadow-indigo-950/35"
                @click="router.push('/workspaces')"
              >
                Manage workspace
              </button>
              <button
                class="px-4 py-2 rounded-xl border border-white/10 hover:border-indigo-300/50 text-sm transition"
                @click="router.push('/workspaces')"
              >
                Invite teammates
              </button>
            </div>
          </div>
        </section>

        <section class="space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-semibold">Tasks</h2>
            <div class="flex items-center gap-2">
              <button
                class="px-4 py-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-indigo-500 text-white font-semibold hover:from-fuchsia-400 hover:to-indigo-400 transition"
                :disabled="tasksLoading"
                @click="createQuickTask"
              >
                Create task
              </button>
              <button
                class="px-4 py-2 rounded-xl border border-white/10 hover:border-indigo-300/50 text-sm transition"
                @click="showTemplates = true"
              >
                Use a template
              </button>
            </div>
          </div>

          <div v-if="tasksLoading" class="grid gap-3 md:grid-cols-2">
            <div v-for="n in 4" :key="n" class="app-page-skeleton p-4 animate-pulse space-y-3">
              <div class="h-4 w-2/3 bg-white/10 rounded"></div>
              <div class="h-3 w-full bg-white/10 rounded"></div>
              <div class="h-3 w-1/2 bg-white/10 rounded"></div>
            </div>
          </div>

          <div v-else-if="!tasks?.length" class="app-page-section space-y-3 text-indigo-100">
            <h3 class="text-xl font-semibold">Your workspace is ready ✅</h3>
            <p class="text-sm text-indigo-200/90">
              Add tasks, invite teammates, or drop in a template. No spinners, no blank screens.
            </p>
            <div class="flex flex-wrap gap-3">
              <button
                class="px-4 py-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-indigo-500 text-white font-semibold hover:from-fuchsia-400 hover:to-indigo-400 transition"
                @click="createQuickTask"
              >
                Create task
              </button>
              <button
                class="px-4 py-2 rounded-xl border border-white/10 hover:border-indigo-300/50 transition"
                @click="router.push('/workspaces')"
              >
                Invite teammate
              </button>
              <button
                class="px-4 py-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-indigo-500 hover:from-fuchsia-400 hover:to-indigo-400 font-semibold shadow-lg shadow-indigo-950/35 text-white"
                @click="showTemplates = true"
              >
                Use a template
              </button>
            </div>
          </div>

          <div v-else class="grid gap-3 md:grid-cols-2">
            <article
              v-for="task in tasks"
              :key="task.id"
              class="task-card rounded-3xl border border-white/10 bg-slate-950/30 p-4 shadow-lg shadow-slate-950/10"
            >
              <div class="flex items-start gap-3">
                <input
                  type="checkbox"
                  :checked="task.completed"
                  :disabled="activeRole === 'viewer'"
                  class="mt-0.5 w-4 h-4 cursor-pointer accent-indigo-500 disabled:opacity-60"
                  @change="() => toggleComplete(task)"
                />
                <div class="flex-1 min-w-0 space-y-1">
                  <div class="flex items-start justify-between gap-2">
                    <p
                      class="task-title font-semibold text-white leading-snug"
                      :class="{ 'line-through text-slate-400': task.completed }"
                    >
                      {{ task.title }}
                    </p>
                    <span class="text-[11px] px-2 py-1 rounded-full border border-white/15 text-indigo-100">
                      {{ task.category || 'Task' }}
                    </span>
                  </div>
                  <p
                    v-if="task.details"
                    class="task-description text-sm text-indigo-200/90"
                    :title="task.details"
                  >
                    {{ task.details }}
                  </p>
                  <div class="task-meta text-xs text-indigo-200/80 flex items-center gap-2">
                    <span>📅 {{ task.date }}</span>
                    <span>·</span>
                    <span>{{ task.completed ? 'Completed' : 'In progress' }}</span>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section
          v-if="showTemplates"
          class="app-page-section space-y-4 shadow-2xl shadow-indigo-900/20"
        >
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="text-xs uppercase tracking-[0.3em] text-indigo-300">Templates</p>
              <h3 class="text-xl font-semibold">Jumpstart tasks</h3>
            </div>
            <button
              class="text-sm text-indigo-200 hover:text-white underline decoration-indigo-300/70"
              @click="showTemplates = false"
            >
              Close
            </button>
          </div>
          <div class="grid gap-4 md:grid-cols-3">
            <article
              v-for="tpl in templateOptions"
              :key="tpl.key"
              class="rounded-3xl border border-white/10 bg-slate-950/30 p-4 space-y-2 hover:border-indigo-300/60 transition"
              :class="tpl.recommended ? 'ring-2 ring-indigo-400/50' : ''"
            >
              <div class="flex items-center justify-between gap-2">
                <h4 class="text-lg font-semibold">{{ tpl.title }}</h4>
                <span
                  v-if="tpl.recommended"
                  class="text-[11px] px-2 py-1 rounded-full bg-indigo-500/20 border border-indigo-300/50 text-indigo-100"
                  >Recommended</span
                >
              </div>
              <p class="text-sm text-indigo-200/90">{{ tpl.description }}</p>
              <ul v-if="tpl.tasks?.length" class="text-xs text-indigo-200/80 space-y-1">
                <li v-for="task in tpl.tasks.slice(0, 3)" :key="task.title">✅ {{ task.title }}</li>
              </ul>
              <button
                class="px-3 py-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-indigo-500 text-white font-semibold hover:from-fuchsia-400 hover:to-indigo-400"
                @click="applyTemplate(tpl)"
                :disabled="templateApplying === tpl.key"
              >
                {{ templateApplying === tpl.key ? 'Adding…' : 'Use template' }}
              </button>
            </article>
          </div>
        </section>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { useTasks } from '@/composables/useTasks'
import { EMPTY_TEMPLATE, TEAM_TEMPLATES } from '@/utils/teamTemplates'
import { trackEvent } from '@/services/analytics'

const router = useRouter()
const route = useRoute()
const workspaceStore = useWorkspaceStore()
const { tasks, loadTasks, addTask, toggleComplete } = useTasks()

const bootingWorkspace = ref(true)
const tasksLoading = ref(true)
const guardError = ref('')
const showTemplates = ref(false)
const templateApplying = ref('')

const templateOptions = computed(() => [...TEAM_TEMPLATES, EMPTY_TEMPLATE])
const activeWorkspace = computed(() => workspaceStore.activeWorkspace || {})
const activeRole = computed(() => workspaceStore.activeWorkspaceRole || 'viewer')
const requestedWorkspaceId = computed(() =>
  typeof route.query.workspaceId === 'string' ? route.query.workspaceId : null,
)

async function bootstrap() {
  guardError.value = ''
  bootingWorkspace.value = true
  tasksLoading.value = true
  try {
    await workspaceStore.init()
    let list = workspaceStore.workspaces || []
    if (requestedWorkspaceId.value && !list.find((w) => w.id === requestedWorkspaceId.value)) {
      await workspaceStore.refresh()
      list = workspaceStore.workspaces || []
    }
    const targetId =
      requestedWorkspaceId.value || workspaceStore.activeWorkspaceId || list[0]?.id || null
    if (!targetId) {
      guardError.value = 'No workspace found. Create one to continue.'
      bootingWorkspace.value = false
      tasksLoading.value = false
      return
    }
    const hasAccess = (list || []).some((w) => w.id === targetId)
    if (!hasAccess) {
      guardError.value = 'You might not have access to this workspace.'
      bootingWorkspace.value = false
      tasksLoading.value = false
      return
    }
    await workspaceStore.setActive(targetId)
  } catch (err) {
    guardError.value = err?.message || 'Failed to load workspace'
  } finally {
    bootingWorkspace.value = false
  }

  try {
    await loadTasks()
  } catch (err) {
    guardError.value = err?.message || 'Failed to load tasks'
  } finally {
    tasksLoading.value = false
  }
}

async function createQuickTask() {
  try {
    await addTask({
      title: 'New team task',
      details: 'Add context and assign owners.',
      source: 'workspace_app',
    })
    ElMessage.success('Task created')
  } catch {
    /* error handled inside addTask */
  }
}

async function applyTemplate(tpl) {
  if (!workspaceStore.activeWorkspaceId) return ElMessage.error('Select a workspace first')
  templateApplying.value = tpl.key
  try {
    await workspaceStore.setActive(workspaceStore.activeWorkspaceId)
    if (tpl.tasks?.length) {
      for (const [idx, task] of tpl.tasks.entries()) {
        await addTask({
          title: task.title,
          details: task.details,
          category: task.category,
          order: -1 * (idx + 1),
          source: 'team_template',
          metadata: { templateKey: tpl.key, starter: true },
        })
      }
    }
    showTemplates.value = false
    ElMessage.success('Template added to your workspace')
  } catch (err) {
    ElMessage.error(err?.message || 'Could not add template')
  } finally {
    templateApplying.value = ''
  }
}

onMounted(() => {
  const upgradedPlan = route.query?.upgraded
  if (upgradedPlan) {
    try {
      ElMessage.success(`Workspace upgraded to ${String(upgradedPlan).toUpperCase()}`)
    } catch {
      /* noop */
    }
    trackEvent('subscription_funnel_success', {
      surface: 'billing_upgrade',
      source: 'workspace_upgraded_query',
      plan: String(upgradedPlan || '').toLowerCase() || null,
    })
    const cleanQuery = { ...route.query }
    delete cleanQuery.upgraded
    router.replace({ query: cleanQuery }).catch(() => {})
  }
  bootstrap()
})

watch(
  () => route.query.workspaceId,
  () => {
    bootstrap()
  },
)
</script>

<style scoped>
.task-card {
  word-break: break-word;
  overflow-wrap: anywhere;
}

.task-title,
.task-description {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.task-meta {
  flex-wrap: wrap;
}
</style>
